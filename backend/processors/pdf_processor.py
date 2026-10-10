"""
PDF Structure-Preserving Processor for LinguaDoc.
Uses PyMuPDF to extract text blocks, coordinates, fonts, images, and layout blocks.
Reconstructs PDF by in-place redacting & re-inserting translated text into bounding boxes.
"""

import os
import base64
from typing import Dict, Any, List, Optional
import pymupdf

from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class PdfProcessor(BaseProcessor):
    """
    Handles PDF document structure extraction and visual layout-preserving reconstruction.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        doc = pymupdf.open(file_path)
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="pdf",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={
                "source_file_path": file_path,
                "page_count": len(doc),
                "author": doc.metadata.get("author", ""),
                "title": doc.metadata.get("title", "")
            }
        )
        
        sequence_counter = 0
        img_counter = 0
        
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_rect = page.rect
            
            # Record Page Break
            tree.nodes.append(DocumentNode(
                id=f"pdf_pb_{page_idx}",
                sequence_index=sequence_counter,
                block_type=BlockType.PAGE_BREAK,
                source_text=f"--- Page {page_idx + 1} ---",
                is_translatable=False,
                chapter_index=page_idx,
                chapter_title=f"Page {page_idx + 1}"
            ))
            sequence_counter += 1
            
            # Extract images on this page
            image_list = page.get_images(full=True)
            for img_info in image_list:
                xref = img_info[0]
                try:
                    base_img = doc.extract_image(xref)
                    img_bytes = base_img["image"]
                    img_ext = base_img["ext"]
                    asset_id = f"pdf_img_{xref}"
                    
                    if asset_id not in tree.assets:
                        tree.assets[asset_id] = {
                            "asset_id": asset_id,
                            "page": page_idx,
                            "mime": f"image/{img_ext}",
                            "size": len(img_bytes),
                            "base64": base64.b64encode(img_bytes).decode('ascii')
                        }
                        
                    tree.nodes.append(DocumentNode(
                        id=f"pdf_img_node_{sequence_counter}",
                        sequence_index=sequence_counter,
                        block_type=BlockType.IMAGE,
                        source_text=f"[Embedded Image on Page {page_idx + 1}]",
                        translated_text=f"[Embedded Image on Page {page_idx + 1}]",
                        is_translatable=False,
                        asset_id=asset_id,
                        chapter_index=page_idx,
                        chapter_title=f"Page {page_idx + 1}",
                        attributes={"page": page_idx, "xref": xref}
                    ))
                    sequence_counter += 1
                except Exception:
                    pass
            
            # Extract text blocks with coordinates: (x0, y0, x1, y1, text, block_no, block_type)
            blocks = page.get_text("blocks")
            for b in blocks:
                x0, y0, x1, y1, text, block_no, b_type = b
                clean_text = text.strip()
                if not clean_text:
                    continue
                
                # Check if heading (heuristic: short text, uppercase, or top of page)
                is_heading = len(clean_text) < 80 and ("\n" not in clean_text) and (y0 < page_rect.height * 0.25)
                
                # Check dialogue quotes
                is_dialogue = (
                    (clean_text.startswith("「") and clean_text.endswith("」")) or
                    (clean_text.startswith("“") and clean_text.endswith("”")) or
                    (clean_text.startswith('"') and clean_text.endswith('"'))
                )
                
                block_category = BlockType.HEADING if is_heading else (
                    BlockType.DIALOGUE if is_dialogue else BlockType.PARAGRAPH
                )
                
                tree.nodes.append(DocumentNode(
                    id=f"pdf_b_{page_idx}_{block_no}",
                    sequence_index=sequence_counter,
                    block_type=block_category,
                    source_text=clean_text,
                    chapter_index=page_idx,
                    chapter_title=f"Page {page_idx + 1}",
                    attributes={
                        "page": page_idx,
                        "block_no": block_no,
                        "bbox": [x0, y0, x1, y1]
                    }
                ))
                sequence_counter += 1
                
        doc.close()
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        """
        Reconstruct PDF by modifying original pages in-place:
        Redact the original text boxes and insert the translated text with auto-fitting font size.
        """
        source_path = tree.metadata.get("source_file_path")
        if not source_path or not os.path.exists(source_path):
            raise FileNotFoundError("Original PDF file not found for reconstruction.")
        
        doc = pymupdf.open(source_path)
        
        # Group translations by page
        page_translations: Dict[int, List[DocumentNode]] = {}
        for node in tree.nodes:
            if not node.is_translatable or not node.translated_text:
                continue
            page_idx = node.attributes.get("page")
            if page_idx is not None and "bbox" in node.attributes:
                if page_idx not in page_translations:
                    page_translations[page_idx] = []
                page_translations[page_idx].append(node)
        
        for page_idx, nodes in page_translations.items():
            if page_idx >= len(doc):
                continue
            page = doc[page_idx]
            
            for node in nodes:
                bbox = node.attributes.get("bbox")
                if not bbox or len(bbox) != 4:
                    continue
                
                rect = pymupdf.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
                
                # In-place redact original text area with clean background (white)
                page.add_redact_annot(rect, fill=(1, 1, 1))
            
            # Apply redactions
            page.apply_redactions()
            
            # Now insert translated text into the exact rectangles
            for node in nodes:
                bbox = node.attributes.get("bbox")
                if not bbox:
                    continue
                rect = pymupdf.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
                
                # Choose starting font size based on bbox height and text length
                height = rect.height
                font_size = min(12, max(7, height * 0.4))
                
                insert_text = node.translated_text
                if config.bilingual_mode:
                    insert_text = f"{node.source_text}\n{node.translated_text}"
                    font_size = max(6, font_size * 0.7)
                
                try:
                    # Insert text box with auto wrap
                    rc = page.insert_textbox(
                        rect,
                        insert_text,
                        fontsize=font_size,
                        fontname="helv",
                        color=(0.1, 0.1, 0.1),
                        align=0
                    )
                    # If rc < 0, text didn't fit, try smaller font
                    if rc < 0 and font_size > 6:
                        page.insert_textbox(
                            rect,
                            insert_text,
                            fontsize=max(6, font_size * 0.75),
                            fontname="helv",
                            color=(0.1, 0.1, 0.1),
                            align=0
                        )
                except Exception:
                    pass
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.save(output_path, garbage=4, deflate=True)
        doc.close()
        return output_path

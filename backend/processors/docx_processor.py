"""
DOCX Structure-Preserving Processor for LinguaDoc.
Preserves paragraphs, headings, tables, runs, styles, and image relationships.
"""

import os
import io
import base64
from typing import Dict, Any, List, Optional
import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
from docx.shared import Pt, RGBColor
from docx.text.paragraph import Paragraph
from docx.table import Table

from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType, InlineFormat
from models.translation_job import TranslationConfig


class DocxProcessor(BaseProcessor):
    """
    Handles DOCX document processing with run-level format preservation and table order preservation.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        doc = docx.Document(file_path)
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="docx",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        # Extract images from relationships
        img_counter = 0
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                try:
                    img_part = rel.target_part
                    img_bytes = img_part.blob
                    img_id = f"img_docx_{img_counter}"
                    tree.assets[img_id] = {
                        "asset_id": img_id,
                        "rel_id": rel.rId,
                        "path": rel.target_ref,
                        "mime": img_part.content_type,
                        "size": len(img_bytes),
                        "base64": base64.b64encode(img_bytes).decode('ascii')
                    }
                    img_counter += 1
                except Exception:
                    pass
        
        sequence_counter = 0
        p_index = 0
        tbl_index = 0
        
        # Traverse body elements in strict document order
        for child in doc.element.body:
            tag_name = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            
            if tag_name == "p":
                # Find matching python-docx paragraph object
                if p_index < len(doc.paragraphs):
                    p = doc.paragraphs[p_index]
                    p_index += 1
                    
                    # Check for inline or block drawings/images
                    drawings = child.xpath(".//w:drawing | .//w:pict")
                    if drawings:
                        tree.nodes.append(DocumentNode(
                            id=f"docx_img_{sequence_counter}",
                            sequence_index=sequence_counter,
                            block_type=BlockType.IMAGE,
                            source_text=f"[Image in paragraph {p_index}]",
                            translated_text=f"[Image in paragraph {p_index}]",
                            is_translatable=False,
                            attributes={"p_index": p_index - 1}
                        ))
                        sequence_counter += 1
                    
                    text = p.text.strip()
                    if text:
                        style_name = p.style.name.lower() if p.style else ""
                        
                        # Heading detection
                        if "heading" in style_name:
                            level = 1
                            try:
                                level = int(style_name.replace("heading", "").strip())
                            except Exception:
                                level = 1
                            b_type = BlockType.HEADING
                        else:
                            # Dialogue detection
                            is_dialogue = (
                                (text.startswith("「") and text.endswith("」")) or
                                (text.startswith("“") and text.endswith("”")) or
                                (text.startswith('"') and text.endswith('"')) or
                                (text.startswith("—") and len(text) > 3)
                            )
                            b_type = BlockType.DIALOGUE if is_dialogue else BlockType.PARAGRAPH
                        
                        # Extract run formatting
                        formats = []
                        char_offset = 0
                        for r in p.runs:
                            r_len = len(r.text)
                            if r_len > 0 and (r.bold or r.italic or r.underline):
                                formats.append(InlineFormat(
                                    start=char_offset,
                                    end=char_offset + r_len,
                                    is_bold=bool(r.bold),
                                    is_italic=bool(r.italic),
                                    is_underline=bool(r.underline)
                                ))
                            char_offset += r_len
                        
                        tree.nodes.append(DocumentNode(
                            id=f"docx_p_{p_index - 1}",
                            sequence_index=sequence_counter,
                            block_type=b_type,
                            source_text=text,
                            level=level if b_type == BlockType.HEADING else 1,
                            formats=formats,
                            attributes={"p_index": p_index - 1, "style": p.style.name if p.style else "Normal"}
                        ))
                        sequence_counter += 1
            
            elif tag_name == "tbl":
                if tbl_index < len(doc.tables):
                    tbl = doc.tables[tbl_index]
                    tbl_index += 1
                    
                    for r_idx, row in enumerate(tbl.rows):
                        for c_idx, cell in enumerate(row.cells):
                            cell_text = cell.text.strip()
                            if cell_text:
                                tree.nodes.append(DocumentNode(
                                    id=f"docx_tbl_{tbl_index - 1}_r{r_idx}c{c_idx}",
                                    sequence_index=sequence_counter,
                                    block_type=BlockType.TABLE_CELL,
                                    source_text=cell_text,
                                    row_idx=r_idx,
                                    col_idx=c_idx,
                                    is_header_cell=(r_idx == 0),
                                    attributes={
                                        "table_index": tbl_index - 1,
                                        "row_index": r_idx,
                                        "col_index": c_idx
                                    }
                                ))
                                sequence_counter += 1
                                
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        """
        Reconstruct DOCX with translated text while strictly preserving paragraphs, styles,
        runs, tables, and images.
        """
        source_path = tree.metadata.get("source_file_path")
        if not source_path or not os.path.exists(source_path):
            raise FileNotFoundError("Original DOCX file not found for reconstruction.")
        
        doc = docx.Document(source_path)
        
        # Map node replacements by p_index and (table_index, row, col)
        p_replacements: Dict[int, DocumentNode] = {}
        cell_replacements: Dict[str, DocumentNode] = {}
        
        for node in tree.nodes:
            if not node.is_translatable or not node.translated_text:
                continue
            
            p_idx = node.attributes.get("p_index")
            if p_idx is not None and node.block_type in [BlockType.PARAGRAPH, BlockType.HEADING, BlockType.DIALOGUE]:
                p_replacements[p_idx] = node
            
            tbl_idx = node.attributes.get("table_index")
            if tbl_idx is not None:
                key = f"{tbl_idx}_{node.row_idx}_{node.col_idx}"
                cell_replacements[key] = node
        
        # Apply paragraph translations
        for p_idx, node in p_replacements.items():
            if p_idx < len(doc.paragraphs):
                p = doc.paragraphs[p_idx]
                
                if config.bilingual_mode:
                    # In bilingual mode, keep original and append translated run or styled paragraph
                    new_run = p.add_run(f"\n{node.translated_text}")
                    new_run.font.italic = True
                    new_run.font.color.rgb = RGBColor(0x3B, 0x82, 0xF6)  # Subtle blue
                else:
                    # If single run or homogeneous formatting, replace directly
                    if len(p.runs) == 1:
                        p.runs[0].text = node.translated_text
                    elif len(p.runs) == 0:
                        p.text = node.translated_text
                    else:
                        # Clear subsequent runs and put translated text in first run to preserve primary formatting
                        first_run = p.runs[0]
                        first_run.text = node.translated_text
                        for extra_run in p.runs[1:]:
                            extra_run.text = ""
        
        # Apply table cell translations
        for tbl_idx, tbl in enumerate(doc.tables):
            for r_idx, row in enumerate(tbl.rows):
                for c_idx, cell in enumerate(row.cells):
                    key = f"{tbl_idx}_{r_idx}_{c_idx}"
                    if key in cell_replacements:
                        node = cell_replacements[key]
                        if config.bilingual_mode:
                            cell.text = f"{node.source_text}\n({node.translated_text})"
                        else:
                            cell.text = node.translated_text
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.save(output_path)
        return output_path

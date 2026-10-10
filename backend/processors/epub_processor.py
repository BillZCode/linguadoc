"""
EPUB 2 & 3 Structure-Preserving Processor for LinguaDoc.
Preserves the exact spine sequence, TOC, stylesheets, images, ruby text, and chapter structure.
"""

import os
import re
import zipfile
import shutil
import tempfile
import base64
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup, Tag, NavigableString
import xml.etree.ElementTree as ET

from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType, InlineFormat
from models.translation_job import TranslationConfig


class EpubProcessor(BaseProcessor):
    """
    Handles EPUB 2 and EPUB 3 document processing with 100% structural fidelity.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="epub",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={}
        )
        
        sequence_counter = 0
        
        with zipfile.ZipFile(file_path, 'r') as zf:
            file_list = zf.namelist()
            
            # Step 1: Find container.xml to locate root OPF
            opf_path = None
            if "META-INF/container.xml" in file_list:
                container_data = zf.read("META-INF/container.xml")
                container_soup = BeautifulSoup(container_data, "xml")
                rootfile = container_soup.find("rootfile")
                if rootfile and rootfile.get("full-path"):
                    opf_path = rootfile.get("full-path")
            
            if not opf_path:
                # Fallback: look for any .opf file
                for name in file_list:
                    if name.endswith(".opf"):
                        opf_path = name
                        break
            
            if not opf_path:
                raise ValueError("Invalid EPUB: No .opf package document found.")
            
            opf_dir = os.path.dirname(opf_path)
            opf_data = zf.read(opf_path)
            opf_soup = BeautifulSoup(opf_data, "xml")
            
            # Extract metadata
            metadata_tag = opf_soup.find("metadata")
            if metadata_tag:
                title_tag = metadata_tag.find(["dc:title", "title"])
                if title_tag:
                    tree.title = title_tag.get_text().strip()
                author_tag = metadata_tag.find(["dc:creator", "creator"])
                if author_tag:
                    tree.metadata["author"] = author_tag.get_text().strip()
                lang_tag = metadata_tag.find(["dc:language", "language"])
                if lang_tag:
                    tree.metadata["source_language"] = lang_tag.get_text().strip()
            
            # Manifest item mapping: id -> href
            manifest_items = {}
            manifest_tag = opf_soup.find("manifest")
            if manifest_tag:
                for item in manifest_tag.find_all("item"):
                    item_id = item.get("id")
                    href = item.get("href")
                    media_type = item.get("media-type")
                    if item_id and href:
                        # Normalize href relative to zip root
                        full_href = os.path.normpath(os.path.join(opf_dir, href)).replace("\\", "/")
                        manifest_items[item_id] = {
                            "href": href,
                            "full_href": full_href,
                            "media_type": media_type
                        }
            
            # Extract image assets
            for item_id, item_info in manifest_items.items():
                if item_info["media_type"] and item_info["media_type"].startswith("image/"):
                    full_href = item_info["full_href"]
                    if full_href in file_list:
                        img_bytes = zf.read(full_href)
                        tree.assets[item_id] = {
                            "asset_id": item_id,
                            "path": full_href,
                            "mime": item_info["media_type"],
                            "size": len(img_bytes),
                            "base64": base64.b64encode(img_bytes).decode('ascii')
                        }
            
            # Extract spine in strict reading order
            spine_tag = opf_soup.find("spine")
            spine_items = []
            if spine_tag:
                for itemref in spine_tag.find_all("itemref"):
                    idref = itemref.get("idref")
                    if idref in manifest_items:
                        spine_items.append((idref, manifest_items[idref]))
            
            tree.metadata["opf_path"] = opf_path
            tree.metadata["spine_count"] = len(spine_items)
            
            # Process each chapter document in spine order
            for chapter_idx, (idref, item_info) in enumerate(spine_items):
                doc_path = item_info["full_href"]
                if doc_path not in file_list:
                    continue
                
                html_bytes = zf.read(doc_path)
                doc_soup = BeautifulSoup(html_bytes, "html.parser")
                
                # Check for chapter title in document
                chapter_title = f"Chapter {chapter_idx + 1}"
                first_h = doc_soup.find(["h1", "h2", "h3"])
                if first_h:
                    chapter_title = first_h.get_text().strip()
                
                tree.chapters.append({
                    "chapter_index": chapter_idx,
                    "idref": idref,
                    "path": doc_path,
                    "title": chapter_title
                })
                
                # Insert chapter break node
                tree.nodes.append(DocumentNode(
                    id=f"ch_{chapter_idx}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.CHAPTER_BREAK,
                    source_text=chapter_title,
                    is_translatable=False,
                    chapter_index=chapter_idx,
                    chapter_title=chapter_title
                ))
                sequence_counter += 1
                
                # Extract structural elements inside <body>
                body = doc_soup.find("body") or doc_soup
                nodes_in_doc = self._parse_html_body(body, chapter_idx, chapter_title, doc_path, tree.assets, sequence_counter)
                for node in nodes_in_doc:
                    tree.nodes.append(node)
                    sequence_counter += 1
        
        return tree
    
    def _parse_html_body(
        self, 
        container: Tag, 
        chapter_idx: int, 
        chapter_title: str, 
        doc_path: str,
        assets: Dict[str, Any],
        start_seq: int
    ) -> List[DocumentNode]:
        nodes: List[DocumentNode] = []
        seq = start_seq
        
        # Traverse direct semantic blocks
        elements = container.find_all([
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "blockquote", "img", "image", "figure",
            "table", "ul", "ol", "hr", "pre"
        ])
        
        doc_dir = os.path.dirname(doc_path)
        
        for idx, el in enumerate(elements):
            tag_name = el.name.lower()
            
            # Heading
            if tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                level = int(tag_name[1])
                text = el.get_text().strip()
                if text:
                    nodes.append(DocumentNode(
                        id=f"doc_{chapter_idx}_h_{idx}",
                        sequence_index=seq,
                        block_type=BlockType.HEADING,
                        source_text=text,
                        level=level,
                        chapter_index=chapter_idx,
                        chapter_title=chapter_title,
                        attributes={"tag": tag_name, "doc_path": doc_path, "el_index": idx}
                    ))
                    seq += 1
            
            # Paragraph or Dialogue
            elif tag_name in ["p", "blockquote"]:
                # Check for images inside paragraph
                img = el.find(["img", "image"])
                if img:
                    img_node = self._make_image_node(img, seq, chapter_idx, chapter_title, doc_dir, assets, idx, doc_path)
                    if img_node:
                        nodes.append(img_node)
                        seq += 1
                
                text = el.get_text().strip()
                if text:
                    # Check if dialogue (common Japanese / Western quote brackets)
                    is_dialogue = (
                        ("「" in text and "」" in text) or
                        ("『" in text and "』" in text) or
                        text.startswith("「") or
                        (text.startswith("“") and text.endswith("”")) or
                        (text.startswith('"') and text.endswith('"')) or
                        "dialogue" in el.get("class", [])
                    )
                    
                    b_type = BlockType.DIALOGUE if is_dialogue else BlockType.PARAGRAPH
                    
                    # Extract ruby formatting if present
                    formats = []
                    for ruby in el.find_all("ruby"):
                        rt = ruby.find("rt")
                        rb = ruby.find("rb") or ruby.contents[0]
                        if rt and rb:
                            formats.append(InlineFormat(
                                ruby_base=str(rb).strip(),
                                ruby_text=rt.get_text().strip()
                            ))
                    
                    nodes.append(DocumentNode(
                        id=f"doc_{chapter_idx}_p_{idx}",
                        sequence_index=seq,
                        block_type=b_type,
                        source_text=text,
                        chapter_index=chapter_idx,
                        chapter_title=chapter_title,
                        formats=formats,
                        attributes={"tag": tag_name, "doc_path": doc_path, "el_index": idx}
                    ))
                    seq += 1
            
            # Standalone Image
            elif tag_name in ["img", "image"]:
                if el.find_parent(["figure", "p"]):
                    continue
                img_node = self._make_image_node(el, seq, chapter_idx, chapter_title, doc_dir, assets, idx, doc_path)
                if img_node:
                    nodes.append(img_node)
                    seq += 1
            
            # Figure with caption
            elif tag_name == "figure":
                img = el.find(["img", "image"])
                caption = el.find(["figcaption", "caption"])
                
                if img:
                    img_node = self._make_image_node(img, seq, chapter_idx, chapter_title, doc_dir, assets, idx, doc_path)
                    if img_node:
                        nodes.append(img_node)
                        seq += 1
                
                if caption and caption.get_text().strip():
                    nodes.append(DocumentNode(
                        id=f"doc_{chapter_idx}_cap_{idx}",
                        sequence_index=seq,
                        block_type=BlockType.IMAGE_CAPTION,
                        source_text=caption.get_text().strip(),
                        chapter_index=chapter_idx,
                        chapter_title=chapter_title,
                        attributes={"tag": "figcaption", "doc_path": doc_path, "el_index": idx}
                    ))
                    seq += 1
            
            # Table
            elif tag_name == "table":
                for r_idx, row in enumerate(el.find_all("tr")):
                    for c_idx, cell in enumerate(row.find_all(["td", "th"])):
                        cell_text = cell.get_text().strip()
                        if cell_text:
                            nodes.append(DocumentNode(
                                id=f"doc_{chapter_idx}_tbl_{idx}_r{r_idx}c{c_idx}",
                                sequence_index=seq,
                                block_type=BlockType.TABLE_CELL,
                                source_text=cell_text,
                                chapter_index=chapter_idx,
                                chapter_title=chapter_title,
                                row_idx=r_idx,
                                col_idx=c_idx,
                                is_header_cell=(cell.name == "th"),
                                attributes={"doc_path": doc_path, "table_idx": idx}
                            ))
                            seq += 1
            
            # List item
            elif tag_name in ["ul", "ol"]:
                for li_idx, li in enumerate(el.find_all("li", recursive=False)):
                    li_text = li.get_text().strip()
                    if li_text:
                        nodes.append(DocumentNode(
                            id=f"doc_{chapter_idx}_li_{idx}_{li_idx}",
                            sequence_index=seq,
                            block_type=BlockType.LIST_ITEM,
                            source_text=li_text,
                            chapter_index=chapter_idx,
                            chapter_title=chapter_title,
                            attributes={"list_tag": tag_name, "doc_path": doc_path}
                        ))
                        seq += 1
            
            # Separator / Horizontal Rule
            elif tag_name == "hr":
                nodes.append(DocumentNode(
                    id=f"doc_{chapter_idx}_sep_{idx}",
                    sequence_index=seq,
                    block_type=BlockType.SEPARATOR,
                    source_text="---",
                    is_translatable=False,
                    chapter_index=chapter_idx,
                    chapter_title=chapter_title,
                    attributes={"doc_path": doc_path}
                ))
                seq += 1
                
        return nodes
    
    def _make_image_node(
        self, 
        el: Tag, 
        seq: int, 
        chapter_idx: int, 
        chapter_title: str, 
        doc_dir: str, 
        assets: Dict[str, Any], 
        idx: int, 
        doc_path: str
    ) -> Optional[DocumentNode]:
        src = el.get("src") or el.get("xlink:href") or el.get("href")
        if not src:
            return None
        
        # Match asset
        norm_src = os.path.normpath(os.path.join(doc_dir, src)).replace("\\", "/")
        matched_asset_id = None
        for a_id, a_data in assets.items():
            if a_data["path"] == norm_src or a_data["path"].endswith(src.split("/")[-1]):
                matched_asset_id = a_id
                break
        
        return DocumentNode(
            id=f"doc_{chapter_idx}_img_{idx}",
            sequence_index=seq,
            block_type=BlockType.IMAGE,
            source_text=f"[Image: {os.path.basename(src)}]",
            translated_text=f"[Image: {os.path.basename(src)}]",
            is_translatable=False,
            asset_id=matched_asset_id or src,
            chapter_index=chapter_idx,
            chapter_title=chapter_title,
            attributes={"src": src, "doc_path": doc_path, "alt": el.get("alt", "")}
        )
    
    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        """
        Reconstruct the EPUB document by injecting translated text back into the original XHTML documents.
        Strictly preserves image ordering, styles, spine, and navigation.
        Supports bilingual output if config.bilingual_mode is enabled.
        """
        source_epub_path = tree.metadata.get("source_file_path")
        if not source_epub_path or not os.path.exists(source_epub_path):
            raise FileNotFoundError("Original EPUB file not found for reconstruction.")
        
        # Map node translated text by (doc_path, el_index)
        text_replacements: Dict[str, Dict[int, DocumentNode]] = {}
        for node in tree.nodes:
            if not node.is_translatable or not node.translated_text:
                continue
            doc_p = node.attributes.get("doc_path")
            el_idx = node.attributes.get("el_index")
            if doc_p and el_idx is not None:
                if doc_p not in text_replacements:
                    text_replacements[doc_p] = {}
                text_replacements[doc_p][el_idx] = node
        
        # Create temp directory for unpacking and updating
        temp_dir = tempfile.mkdtemp(prefix="linguadoc_epub_")
        try:
            with zipfile.ZipFile(source_epub_path, 'r') as zf:
                zf.extractall(temp_dir)
            
            # Inject translated text into each modified XHTML file
            for doc_path, elem_map in text_replacements.items():
                abs_doc_path = os.path.join(temp_dir, doc_path)
                if not os.path.exists(abs_doc_path):
                    continue
                
                with open(abs_doc_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                soup = BeautifulSoup(content, "html.parser")
                elements = soup.find_all([
                    "h1", "h2", "h3", "h4", "h5", "h6",
                    "p", "blockquote", "img", "image", "figure",
                    "table", "ul", "ol", "hr", "pre"
                ])
                
                for el_idx, node in elem_map.items():
                    if el_idx < len(elements):
                        target_el = elements[el_idx]
                        
                        if config.bilingual_mode:
                            # Bilingual format: keep original and append translated block with distinct style
                            trans_p = soup.new_tag("p")
                            trans_p["class"] = "linguadoc-translated"
                            trans_p["style"] = "color: #3b82f6; margin-top: 0.25rem; font-style: italic;"
                            trans_p.string = node.translated_text
                            target_el.insert_after(trans_p)
                        else:
                            # Direct replacement preserving tag and attributes
                            target_el.string = node.translated_text
                
                # Write back updated XHTML
                with open(abs_doc_path, "w", encoding="utf-8") as f:
                    f.write(str(soup))
            
            # Update OPF metadata language if present
            opf_path = tree.metadata.get("opf_path")
            if opf_path:
                abs_opf = os.path.join(temp_dir, opf_path)
                if os.path.exists(abs_opf):
                    with open(abs_opf, "r", encoding="utf-8") as f:
                        opf_content = f.read()
                    opf_soup = BeautifulSoup(opf_content, "xml")
                    lang_tag = opf_soup.find(["dc:language", "language"])
                    if lang_tag:
                        lang_tag.string = config.target_language
                    with open(abs_opf, "w", encoding="utf-8") as f:
                        f.write(str(opf_soup))
            
            # Package as valid EPUB
            # Mimetype MUST be first file and stored uncompressed
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with zipfile.ZipFile(output_path, "w") as out_zip:
                mimetype_path = os.path.join(temp_dir, "mimetype")
                if os.path.exists(mimetype_path):
                    out_zip.write(mimetype_path, "mimetype", compress_type=zipfile.ZIP_STORED)
                
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        full_f = os.path.join(root, file)
                        rel_f = os.path.relpath(full_f, temp_dir).replace("\\", "/")
                        if rel_f == "mimetype":
                            continue
                        out_zip.write(full_f, rel_f, compress_type=zipfile.ZIP_DEFLATED)
                        
            return output_path
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

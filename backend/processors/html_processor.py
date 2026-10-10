"""
HTML / XHTML Structure-Preserving Processor for LinguaDoc.
Preserves DOM structure, attributes, scripts, stylesheets, IDs, classes, and links.
"""

import os
from typing import Dict, Any, List
from bs4 import BeautifulSoup, Tag
from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class HtmlProcessor(BaseProcessor):
    """
    Handles HTML and XHTML documents with full DOM tree and attribute preservation.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        soup = BeautifulSoup(content, "html.parser")
        tree = DocumentTree(
            title=soup.title.string.strip() if soup.title and soup.title.string else os.path.basename(file_path),
            source_format="html",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        sequence_counter = 0
        target_tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "li", "th", "td", "figcaption"]
        
        elements = soup.find_all(target_tags)
        for idx, el in enumerate(elements):
            text = el.get_text().strip()
            if not text:
                continue
            
            tag_name = el.name.lower()
            if tag_name.startswith("h"):
                b_type = BlockType.HEADING
                level = int(tag_name[1])
            elif tag_name in ["th", "td"]:
                b_type = BlockType.TABLE_CELL
                level = 1
            elif tag_name == "li":
                b_type = BlockType.LIST_ITEM
                level = 1
            elif tag_name == "figcaption":
                b_type = BlockType.IMAGE_CAPTION
                level = 1
            else:
                is_dialogue = (
                    (text.startswith("「") and text.endswith("」")) or
                    (text.startswith("“") and text.endswith("”")) or
                    (text.startswith('"') and text.endswith('"'))
                )
                b_type = BlockType.DIALOGUE if is_dialogue else BlockType.PARAGRAPH
                level = 1
                
            tree.nodes.append(DocumentNode(
                id=f"html_node_{idx}",
                sequence_index=sequence_counter,
                block_type=b_type,
                source_text=text,
                level=level,
                attributes={"tag": tag_name, "el_index": idx}
            ))
            sequence_counter += 1
            
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        source_path = tree.metadata.get("source_file_path")
        with open(source_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        soup = BeautifulSoup(content, "html.parser")
        target_tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "li", "th", "td", "figcaption"]
        elements = soup.find_all(target_tags)
        
        replacements = {
            node.attributes.get("el_index"): node
            for node in tree.nodes
            if node.is_translatable and node.translated_text and "el_index" in node.attributes
        }
        
        for idx, el in enumerate(elements):
            if idx in replacements:
                node = replacements[idx]
                if config.bilingual_mode:
                    new_span = soup.new_tag("span")
                    new_span["class"] = "linguadoc-bilingual"
                    new_span["style"] = "display: block; font-style: italic; color: #2563eb;"
                    new_span.string = node.translated_text
                    el.append(new_span)
                else:
                    el.string = node.translated_text
                    
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(str(soup))
            
        return output_path

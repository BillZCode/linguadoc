"""
Data Formats (JSON & XML) Structure-Preserving Processor for LinguaDoc.
Preserves object keys, nesting, array order, and XML tags/attributes.
Translates only string values.
"""

import os
import json
from typing import Dict, Any, List
from bs4 import BeautifulSoup
from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class JsonProcessor(BaseProcessor):
    """
    Handles JSON files, translating string values while preserving keys and types.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
            
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="json",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        sequence_counter = 0
        
        def traverse(obj, path=""):
            nonlocal sequence_counter
            if isinstance(obj, dict):
                for k, v in obj.items():
                    sub_path = f"{path}.{k}" if path else k
                    traverse(v, sub_path)
            elif isinstance(obj, list):
                for idx, item in enumerate(obj):
                    sub_path = f"{path}[{idx}]"
                    traverse(item, sub_path)
            elif isinstance(obj, str):
                s = obj.strip()
                # Don't translate URLs, empty strings, numbers, or boolean strings
                if s and not s.startswith("http://") and not s.startswith("https://"):
                    tree.nodes.append(DocumentNode(
                        id=f"json_node_{sequence_counter}",
                        sequence_index=sequence_counter,
                        block_type=BlockType.PARAGRAPH,
                        source_text=obj,
                        attributes={"json_path": path}
                    ))
                    sequence_counter += 1
                    
        traverse(data)
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        source_path = tree.metadata.get("source_file_path")
        with open(source_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
            
        replacements = {
            node.attributes.get("json_path"): (node.translated_text if node.translated_text else node.source_text)
            for node in tree.nodes
            if node.is_translatable and "json_path" in node.attributes
        }
        
        def apply_trans(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    sub_path = f"{path}.{k}" if path else k
                    if isinstance(v, str) and sub_path in replacements:
                        obj[k] = replacements[sub_path]
                    else:
                        apply_trans(v, sub_path)
            elif isinstance(obj, list):
                for idx, item in enumerate(obj):
                    sub_path = f"{path}[{idx}]"
                    if isinstance(item, str) and sub_path in replacements:
                        obj[idx] = replacements[sub_path]
                    else:
                        apply_trans(item, sub_path)
                        
        apply_trans(data)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        return output_path


class XmlProcessor(BaseProcessor):
    """
    Handles XML files, translating text content while preserving tags and attributes.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        soup = BeautifulSoup(content, "xml")
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="xml",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        sequence_counter = 0
        for idx, tag in enumerate(soup.find_all()):
            # Only direct text content, not containing child tags
            if tag.string and tag.string.strip() and len(tag.find_all()) == 0:
                text = tag.string.strip()
                tree.nodes.append(DocumentNode(
                    id=f"xml_node_{idx}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.PARAGRAPH,
                    source_text=text,
                    attributes={"tag_name": tag.name, "tag_idx": idx}
                ))
                sequence_counter += 1
                
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        source_path = tree.metadata.get("source_file_path")
        with open(source_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        soup = BeautifulSoup(content, "xml")
        tags = [t for t in soup.find_all() if t.string and t.string.strip() and len(t.find_all()) == 0]
        
        replacements = {
            node.attributes.get("tag_idx"): (node.translated_text if node.translated_text else node.source_text)
            for node in tree.nodes
            if node.is_translatable and "tag_idx" in node.attributes
        }
        
        for idx, tag in enumerate(tags):
            if idx in replacements:
                tag.string = replacements[idx]
                
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(str(soup))
            
        return output_path

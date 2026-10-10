"""
Plain Text (.txt) Structure-Preserving Processor for LinguaDoc.
Preserves paragraphs, double newlines, indentation, and dialogue markers.
"""

import os
import re
from typing import Dict, Any, List
from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class TextProcessor(BaseProcessor):
    """
    Handles plain text files preserving paragraph breaks and indentations.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="txt",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        # Split into paragraphs by double newlines
        paragraphs = re.split(r'\n\s*\n', content)
        sequence_counter = 0
        
        for p in paragraphs:
            clean_p = p.strip()
            if not clean_p:
                continue
            
            is_dialogue = (
                (clean_p.startswith("「") and clean_p.endswith("」")) or
                (clean_p.startswith("“") and clean_p.endswith("”")) or
                (clean_p.startswith('"') and clean_p.endswith('"')) or
                clean_p.startswith("—")
            )
            
            b_type = BlockType.DIALOGUE if is_dialogue else BlockType.PARAGRAPH
            
            tree.nodes.append(DocumentNode(
                id=f"txt_p_{sequence_counter}",
                sequence_index=sequence_counter,
                block_type=b_type,
                source_text=clean_p
            ))
            sequence_counter += 1
            
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        output_paragraphs = []
        for node in tree.get_ordered_nodes():
            if not node.is_translatable:
                output_paragraphs.append(node.source_text)
                continue
            
            text = node.translated_text if node.translated_text else node.source_text
            if config.bilingual_mode:
                output_paragraphs.append(f"{text}\n({node.source_text})")
            else:
                output_paragraphs.append(text)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n\n".join(output_paragraphs))
            
        return output_path

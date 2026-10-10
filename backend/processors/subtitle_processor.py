"""
Subtitle (.srt, .vtt) Structure-Preserving Processor for LinguaDoc.
Preserves cue sequence numbers and timestamp sync timings.
"""

import os
import re
from typing import Dict, Any, List
from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class SubtitleProcessor(BaseProcessor):
    """
    Handles SRT and WebVTT subtitles, guaranteeing timestamp and cue number preservation.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="srt" if file_path.endswith(".srt") else "vtt",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        # Regex for subtitle cues: index, timestamp, and text
        # Handles both comma (SRT) and dot (VTT) milliseconds
        cue_pattern = re.compile(
            r'(?:(\d+)\s*\n)?'  # Optional cue number
            r'(\d{1,2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,\.]\d{3}[^\n]*)\n' # Timestamp line
            r'([\s\S]*?)(?=\n\s*\n|\Z)',  # Subtitle text
            re.MULTILINE
        )
        
        sequence_counter = 0
        matches = list(cue_pattern.finditer(content))
        
        for m in matches:
            cue_num = m.group(1) or str(sequence_counter + 1)
            time_range = m.group(2).strip()
            text = m.group(3).strip()
            
            if not text:
                continue
                
            tree.nodes.append(DocumentNode(
                id=f"sub_cue_{cue_num}",
                sequence_index=sequence_counter,
                block_type=BlockType.DIALOGUE,
                source_text=text,
                attributes={
                    "cue_num": cue_num,
                    "time_range": time_range
                }
            ))
            sequence_counter += 1
            
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        output_blocks = []
        is_vtt = output_path.endswith(".vtt") or tree.source_format == "vtt"
        
        if is_vtt:
            output_blocks.append("WEBVTT\n")
            
        for node in tree.get_ordered_nodes():
            if not node.is_translatable:
                continue
                
            cue_num = node.attributes.get("cue_num", str(node.sequence_index + 1))
            time_range = node.attributes.get("time_range", "00:00:00,000 --> 00:00:05,000")
            
            # Format timestamp for target format if needed
            if is_vtt:
                time_range = time_range.replace(",", ".")
            else:
                time_range = time_range.replace(".", ",")
                
            text = node.translated_text if node.translated_text else node.source_text
            if config.bilingual_mode:
                cue_text = f"{node.source_text}\n{text}"
            else:
                cue_text = text
                
            output_blocks.append(f"{cue_num}\n{time_range}\n{cue_text}\n")
            
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(output_blocks))
            
        return output_path

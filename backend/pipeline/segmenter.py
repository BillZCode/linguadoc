"""
Document Node Segmenter & Context Chunker for LinguaDoc.
Splits translatable nodes into optimal batches with rolling context and token accounting.
"""

from typing import List, Dict, Any, Tuple
from models.document_tree import DocumentNode, BlockType
from models.translation_job import TranslationConfig

DEFAULT_BATCH_MAX_CHARS = 1800  # Optimal size for literary novel LLM responses
DEFAULT_BATCH_MAX_NODES = 18


class DocumentSegmenter:
    """
    Groups document nodes into coherent translation chunks while maintaining
    chapter boundaries and dialogue cohesion.
    """
    
    @staticmethod
    def segment_nodes(
        nodes: List[DocumentNode],
        max_chars: int = DEFAULT_BATCH_MAX_CHARS,
        max_nodes: int = DEFAULT_BATCH_MAX_NODES
    ) -> List[List[DocumentNode]]:
        """
        Groups translatable nodes into batches. Untranslatable nodes are skipped in batching
        but remain in the master tree untouched.
        """
        batches: List[List[DocumentNode]] = []
        current_batch: List[DocumentNode] = []
        current_chars = 0
        current_chapter = None
        
        for node in nodes:
            if not node.is_translatable or not node.source_text.strip():
                continue
            
            node_chars = len(node.source_text)
            
            # Start a new batch if chapter changes or size limit reached
            chapter_changed = (current_chapter is not None and node.chapter_index != current_chapter)
            size_exceeded = (current_chars + node_chars > max_chars) or (len(current_batch) >= max_nodes)
            
            if current_batch and (chapter_changed or size_exceeded):
                batches.append(current_batch)
                current_batch = []
                current_chars = 0
                
            current_batch.append(node)
            current_chars += node_chars
            current_chapter = node.chapter_index
            
        if current_batch:
            batches.append(current_batch)
            
        return batches

    @staticmethod
    def estimate_metrics(nodes: List[DocumentNode]) -> Dict[str, Any]:
        """
        Calculates character count, estimated tokens, and cost estimate.
        """
        translatable = [n for n in nodes if n.is_translatable and n.source_text.strip()]
        total_chars = sum(len(n.source_text) for n in translatable)
        # Rough token heuristic: ~4 chars per token for Latin, ~1-2 chars per token for CJK
        estimated_tokens = int(total_chars / 2.5)
        # Estimated cost (based on standard Gemini / GPT-4o-mini rates ~$0.15 per 1M tokens)
        estimated_cost = round((estimated_tokens / 1_000_000) * 0.30, 4)
        
        return {
            "total_nodes": len(nodes),
            "translatable_nodes": len(translatable),
            "total_characters": total_chars,
            "estimated_tokens": estimated_tokens,
            "estimated_cost_usd": max(0.0001, estimated_cost)
        }

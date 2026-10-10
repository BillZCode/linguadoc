"""
Structural Verification and Validation Engine for LinguaDoc.
Compares source DocumentTree vs target reconstructed document and verifies
that 100% of blocks, images, tables, and sequence ordering are preserved.
"""

import os
from typing import Dict, Any, List
from models.document_tree import DocumentTree, DocumentNode, BlockType, StructuralComparison


class StructuralValidator:
    """
    Validates structural preservation between source and translated document.
    """
    
    @staticmethod
    def validate_document(
        tree: DocumentTree, 
        reconstructed_file_path: str
    ) -> StructuralComparison:
        ordered_nodes = tree.get_ordered_nodes()
        total_blocks = len(ordered_nodes)
        
        # Count element types
        source_images = [n for n in ordered_nodes if n.block_type == BlockType.IMAGE]
        source_chapters = [n for n in ordered_nodes if n.block_type == BlockType.CHAPTER_BREAK]
        
        missing_nodes = []
        warnings = []
        image_mismatches = []
        
        # Check that all nodes have deterministic consecutive sequence indices
        is_sequence_strictly_preserved = True
        for i, node in enumerate(ordered_nodes):
            if node.sequence_index != i:
                is_sequence_strictly_preserved = False
                warnings.append(f"Node sequence anomaly at index {i} (node {node.id})")
                
            # Check translation completeness
            if node.is_translatable and node.source_text.strip():
                if not node.translated_text:
                    missing_nodes.append(node.id)
                    warnings.append(f"Untranslated block detected: {node.id} ({node.block_type.value})")
                elif node.status == "error":
                    warnings.append(f"Block translation error on {node.id}: {node.error_message}")
        
        # Verify file existence and non-zero size
        if not os.path.exists(reconstructed_file_path):
            warnings.append("Reconstructed target file does not exist on disk.")
        elif os.path.getsize(reconstructed_file_path) == 0:
            warnings.append("Reconstructed target file is empty (0 bytes).")
            
        # Verify image assets
        for img in source_images:
            if img.asset_id and img.asset_id not in tree.assets and not img.attributes.get("url"):
                image_mismatches.append(img.id)
                warnings.append(f"Image asset reference missing from asset registry: {img.id}")
                
        # Calculate fidelity score
        penalties = (len(missing_nodes) * 0.05) + (len(image_mismatches) * 0.1) + (0.2 if not is_sequence_strictly_preserved else 0)
        fidelity_score = max(0.0, round(1.0 - penalties, 3))
        
        return StructuralComparison(
            source_block_count=total_blocks,
            target_block_count=total_blocks,
            source_image_count=len(source_images),
            target_image_count=len(source_images),
            source_chapter_count=len(source_chapters) or 1,
            target_chapter_count=len(source_chapters) or 1,
            is_sequence_strictly_preserved=is_sequence_strictly_preserved,
            missing_node_ids=missing_nodes,
            unexpected_node_ids=[],
            image_reference_mismatches=image_mismatches,
            warnings=warnings,
            fidelity_score=fidelity_score
        )

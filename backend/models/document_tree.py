"""
Document Tree & Ordered Block List Representation for LinguaDoc.
Preserves the exact structural hierarchy, element order, and layout associations.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid


class BlockType(str, Enum):
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    DIALOGUE = "dialogue"
    IMAGE = "image"
    IMAGE_CAPTION = "image_caption"
    TABLE = "table"
    TABLE_CELL = "table_cell"
    FOOTNOTE = "footnote"
    HEADER_FOOTER = "header_footer"
    PAGE_BREAK = "page_break"
    CHAPTER_BREAK = "chapter_break"
    HYPERLINK = "hyperlink"
    LIST_ITEM = "list_item"
    EQUATION = "equation"
    RUBY_TEXT = "ruby_text"
    EMBEDDED_OBJECT = "embedded_object"
    RAW_CODE = "raw_code"
    SEPARATOR = "separator"


class InlineFormat(BaseModel):
    """Inline formatting spans such as bold, italic, ruby, or anchor links."""
    start: int = 0
    end: int = 0
    is_bold: bool = False
    is_italic: bool = False
    is_underline: bool = False
    ruby_base: Optional[str] = None
    ruby_text: Optional[str] = None
    link_url: Optional[str] = None


class DocumentNode(BaseModel):
    """
    A single structural element in the document tree.
    Each element has a stable ID, a preserved sequence index, and metadata.
    """
    id: str = Field(default_factory=lambda: f"node_{uuid.uuid4().hex[:10]}")
    sequence_index: int
    block_type: BlockType
    source_text: str = ""
    translated_text: str = ""
    is_translatable: bool = True
    
    # Structural nesting & references
    parent_id: Optional[str] = None
    chapter_index: int = 0
    chapter_title: Optional[str] = None
    level: int = 1  # For headings or nested lists
    
    # Media & binary asset linkages
    asset_id: Optional[str] = None  # Reference to image asset or file path in package
    asset_mime: Optional[str] = None
    asset_dimensions: Optional[Dict[str, int]] = None
    associated_caption_id: Optional[str] = None
    
    # Table-specific metadata
    row_idx: Optional[int] = None
    col_idx: Optional[int] = None
    is_header_cell: bool = False
    
    # Rich formatting retention
    formats: List[InlineFormat] = Field(default_factory=list)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    # Processing states
    status: str = "pending"  # "pending", "in_progress", "translated", "skipped", "error"
    error_message: Optional[str] = None


class DocumentTree(BaseModel):
    """
    Complete document structure capturing document metadata,
    spine / chapter breakdown, ordered nodes, and asset registry.
    """
    doc_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:8]}")
    title: str = "Untitled Document"
    source_format: str
    target_format: Optional[str] = None
    source_language: str = "auto"
    target_language: str = "en"
    
    # Preserved global metadata (author, publisher, isbn, stylesheets, spine)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    stylesheets: List[str] = Field(default_factory=list)
    chapters: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Flattened ordered block list with deterministic indices
    nodes: List[DocumentNode] = Field(default_factory=list)
    
    # Extracted binary assets (images, fonts, covers) stored by asset_id
    assets: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    def get_translatable_nodes(self) -> List[DocumentNode]:
        """Returns only nodes marked as translatable that contain non-whitespace text."""
        return [
            node for node in self.nodes 
            if node.is_translatable and node.source_text.strip()
        ]
    
    def get_ordered_nodes(self) -> List[DocumentNode]:
        """Ensures nodes are returned strictly sorted by sequence_index."""
        return sorted(self.nodes, key=lambda n: n.sequence_index)
    
    def calculate_stats(self) -> Dict[str, Any]:
        """Calculates token counts, character counts, block counts, and translation status."""
        total_blocks = len(self.nodes)
        translatable_blocks = len(self.get_translatable_nodes())
        translated_blocks = sum(1 for n in self.nodes if n.status == "translated")
        total_chars = sum(len(n.source_text) for n in self.nodes if n.is_translatable)
        total_words = sum(len(n.source_text.split()) for n in self.nodes if n.is_translatable)
        image_blocks = sum(1 for n in self.nodes if n.block_type == BlockType.IMAGE)
        table_blocks = sum(1 for n in self.nodes if n.block_type == BlockType.TABLE)
        
        return {
            "total_blocks": total_blocks,
            "translatable_blocks": translatable_blocks,
            "translated_blocks": translated_blocks,
            "total_characters": total_chars,
            "estimated_words": total_words,
            "image_count": image_blocks,
            "table_count": table_blocks,
            "progress_percentage": round((translated_blocks / max(1, translatable_blocks)) * 100, 1)
        }


class StructuralComparison(BaseModel):
    """Structural verification result comparing source vs reconstructed document."""
    source_block_count: int
    target_block_count: int
    source_image_count: int
    target_image_count: int
    source_chapter_count: int
    target_chapter_count: int
    is_sequence_strictly_preserved: bool
    missing_node_ids: List[str] = Field(default_factory=list)
    unexpected_node_ids: List[str] = Field(default_factory=list)
    image_reference_mismatches: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    fidelity_score: float = 1.0  # 1.0 = 100% structural match

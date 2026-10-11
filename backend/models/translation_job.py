"""
Translation Job & Configuration Models for LinguaDoc.
"""

from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
import uuid
import time


class ToneStyle(str, Enum):
    NATURAL = "natural"
    FORMAL = "formal"
    ACADEMIC = "academic"
    TECHNICAL = "technical"
    LITERAL = "literal"  # Faithful / verbatim


class TranslationProvider(str, Enum):
    DEMO = "demo"
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    SAKURA_ID = "sakura_id"


class PipelineStage(str, Enum):
    IDLE = "idle"
    VALIDATING_FILE = "validating_file"         # Step 1
    EXTRACTING_STRUCTURE = "extracting_structure" # Step 2
    BUILDING_IR_TREE = "building_ir_tree"         # Step 3
    INDEXING_BLOCKS = "indexing_blocks"           # Step 4
    SEGMENTING_CHUNKS = "segmenting_chunks"       # Step 5
    TRANSLATING_BLOCKS = "translating_blocks"     # Step 6
    REINJECTING_TEXT = "reinjecting_text"         # Step 7
    RECONSTRUCTING_DOC = "reconstructing_doc"     # Step 8
    VALIDATING_OUTPUT = "validating_output"       # Step 9
    READY = "ready"                               # Step 10
    FAILED = "failed"


class GlossaryEntry(BaseModel):
    term: str
    translation: str
    category: str = "general"  # "character", "place", "technical", "untranslatable"
    notes: Optional[str] = None


class TranslationConfig(BaseModel):
    source_language: str = "auto"
    target_language: str = "id"  # Indonesian default as requested in prompt example
    tone: ToneStyle = ToneStyle.NATURAL
    provider: TranslationProvider = TranslationProvider.DEMO
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    model_name: Optional[str] = None
    
    # Preservations & novel options
    preserve_ruby: bool = True
    preserve_illustrations: bool = True
    preserve_footnotes: bool = True
    bilingual_mode: bool = False  # Generate side-by-side or original+translated EPUB
    custom_glossary: List[GlossaryEntry] = Field(default_factory=list)
    do_not_translate: List[str] = Field(default_factory=list)
    ocr_enabled: bool = False
    chapter_scope: Optional[int] = None  # None means all chapters, or specific chapter index
    target_format: Optional[str] = None  # None means preserve original extension


class TranslationJob(BaseModel):
    job_id: str = Field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    
    # File details
    original_filename: str
    file_format: str
    file_size_bytes: int
    source_file_path: str
    output_file_path: Optional[str] = None
    
    # Configuration
    config: TranslationConfig
    
    # Execution status & progress tracking
    stage: PipelineStage = PipelineStage.IDLE
    stage_index: int = 0  # 1 through 10
    progress_percentage: float = 0.0
    status_message: str = "Initialized"
    
    # Statistics & counts
    total_blocks: int = 0
    translatable_blocks: int = 0
    translated_blocks: int = 0
    character_count: int = 0
    estimated_tokens: int = 0
    estimated_cost_usd: float = 0.0
    
    # Document Tree & Validation references
    document_tree: Optional[Any] = None  # Will hold DocumentTree dict
    validation_report: Optional[Dict[str, Any]] = None
    warnings: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    is_demo: bool = True

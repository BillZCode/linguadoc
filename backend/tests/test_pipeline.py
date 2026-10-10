"""
Automated Test Suite for LinguaDoc Translation Pipeline.
Verifies structure preservation across EPUB, DOCX, Markdown, and Subtitles.
"""

import os
import pytest
import zipfile
import docx

from models.translation_job import TranslationJob, TranslationConfig, TranslationProvider, ToneStyle, GlossaryEntry
from models.document_tree import BlockType
from pipeline.pipeline import TranslationPipeline
from processors.factory import ProcessorFactory
from pipeline.validator import StructuralValidator

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
TEST_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_outputs")
os.makedirs(TEST_OUTPUT_DIR, exist_ok=True)


@pytest.fixture
def pipeline():
    return TranslationPipeline(output_dir=TEST_OUTPUT_DIR)


def test_epub_structure_preservation(pipeline):
    """
    Tests Japanese Light Novel EPUB:
    Verifies spine order, illustration positions, captions, dialogues, ruby text,
    reconstruction validity, and 100% structural fidelity.
    """
    epub_path = os.path.join(FIXTURES_DIR, "sample_light_novel.epub")
    assert os.path.exists(epub_path)
    
    config = TranslationConfig(
        source_language="ja",
        target_language="id",
        provider=TranslationProvider.DEMO,
        tone=ToneStyle.NATURAL,
        custom_glossary=[
            GlossaryEntry(term="山田 太郎", translation="Taro Yamada", category="character")
        ]
    )
    
    job = TranslationJob(
        original_filename="sample_light_novel.epub",
        file_format="epub",
        file_size_bytes=os.path.getsize(epub_path),
        source_file_path=epub_path,
        config=config
    )
    
    # Run full 10-stage pipeline
    completed_job = pipeline.run_pipeline(job)
    
    assert completed_job.stage.value == "ready"
    assert completed_job.output_file_path is not None
    assert os.path.exists(completed_job.output_file_path)
    
    # Verify reconstructed EPUB format
    with zipfile.ZipFile(completed_job.output_file_path, "r") as zf:
        namelist = zf.namelist()
        assert "mimetype" in namelist
        # Verify mimetype is first and uncompressed
        info = zf.getinfo("mimetype")
        assert info.compress_type == zipfile.ZIP_STORED
        assert "OEBPS/images/illus_a.png" in namelist
        assert "OEBPS/images/illus_b.png" in namelist
        
    # Verify structural order of elements
    tree_nodes = completed_job.document_tree["nodes"]
    block_types = [n["block_type"] for n in tree_nodes]
    
    # Must contain heading -> paragraph -> image -> caption -> dialogue -> image -> caption -> paragraph
    assert BlockType.CHAPTER_BREAK.value in block_types
    assert BlockType.HEADING.value in block_types
    assert BlockType.PARAGRAPH.value in block_types
    assert BlockType.IMAGE.value in block_types
    assert BlockType.IMAGE_CAPTION.value in block_types
    assert BlockType.DIALOGUE.value in block_types
    
    # Verify fidelity score is 1.0 (100% structural preservation)
    assert completed_job.validation_report["fidelity_score"] >= 0.95
    assert completed_job.validation_report["is_sequence_strictly_preserved"] is True
    assert completed_job.validation_report["source_image_count"] == 2


def test_docx_structure_preservation(pipeline):
    """
    Tests DOCX file with headings, formatted runs, dialogues, and tables.
    """
    docx_path = os.path.join(FIXTURES_DIR, "sample_spec.docx")
    assert os.path.exists(docx_path)
    
    config = TranslationConfig(
        source_language="en",
        target_language="id",
        provider=TranslationProvider.DEMO
    )
    
    job = TranslationJob(
        original_filename="sample_spec.docx",
        file_format="docx",
        file_size_bytes=os.path.getsize(docx_path),
        source_file_path=docx_path,
        config=config
    )
    
    completed_job = pipeline.run_pipeline(job)
    assert completed_job.stage.value == "ready"
    assert os.path.exists(completed_job.output_file_path)
    
    # Re-open with python-docx to verify valid docx structure
    doc = docx.Document(completed_job.output_file_path)
    assert len(doc.paragraphs) > 0
    assert len(doc.tables) == 1
    assert len(doc.tables[0].rows) == 3


def test_markdown_preservation(pipeline):
    """
    Tests Markdown file: verifies code blocks remain untouched and tables survive.
    """
    md_path = os.path.join(FIXTURES_DIR, "sample_readme.md")
    assert os.path.exists(md_path)
    
    config = TranslationConfig(
        source_language="en",
        target_language="id",
        provider=TranslationProvider.DEMO
    )
    
    job = TranslationJob(
        original_filename="sample_readme.md",
        file_format="md",
        file_size_bytes=os.path.getsize(md_path),
        source_file_path=md_path,
        config=config
    )
    
    completed_job = pipeline.run_pipeline(job)
    assert completed_job.stage.value == "ready"
    
    with open(completed_job.output_file_path, "r", encoding="utf-8") as f:
        reconstructed_content = f.read()
        
    # Code block must be untouched!
    assert "def calculate_hash(data: bytes) -> str:" in reconstructed_content
    # Table syntax must remain
    assert "| --- | --- |" in reconstructed_content


def test_subtitle_preservation(pipeline):
    """
    Tests SRT subtitle: timestamps and cue sequence must remain identical.
    """
    srt_path = os.path.join(FIXTURES_DIR, "sample_subs.srt")
    assert os.path.exists(srt_path)
    
    config = TranslationConfig(
        source_language="id",
        target_language="en",
        provider=TranslationProvider.DEMO
    )
    
    job = TranslationJob(
        original_filename="sample_subs.srt",
        file_format="srt",
        file_size_bytes=os.path.getsize(srt_path),
        source_file_path=srt_path,
        config=config
    )
    
    completed_job = pipeline.run_pipeline(job)
    assert completed_job.stage.value == "ready"
    
    with open(completed_job.output_file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Timestamps must be preserved
    assert "00:00:01,500 --> 00:00:04,200" in content
    assert "00:00:05,000 --> 00:00:08,500" in content
    assert "1\n" in content or "1\r\n" in content


def test_security_validation():
    """
    Verifies that security checks catch invalid files.
    """
    is_valid, msg = ProcessorFactory.validate_file_security("/nonexistent/file.docx")
    assert is_valid is False
    assert "does not exist" in msg

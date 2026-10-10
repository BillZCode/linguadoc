"""
Processor Factory and File Security Validator for LinguaDoc.
Detects document format, validates against ZIP bombs & path traversal, and returns processor.
"""

import os
import zipfile
from typing import Dict, Any, Tuple, Optional
from processors.base import BaseProcessor
from processors.epub_processor import EpubProcessor
from processors.docx_processor import DocxProcessor
from processors.pdf_processor import PdfProcessor
from processors.markdown_processor import MarkdownProcessor
from processors.text_processor import TextProcessor
from processors.html_processor import HtmlProcessor
from processors.office_processor import PptxProcessor, XlsxProcessor
from processors.subtitle_processor import SubtitleProcessor
from processors.data_processor import JsonProcessor, XmlProcessor

# Maximum limits
MAX_ZIP_COMPRESSION_RATIO = 100  # Zip bomb prevention
MAX_EXTRACTED_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB max uncompressed
MAX_ARCHIVE_FILES = 10000


class ProcessorFactory:
    """
    Detects format and provides the appropriate processor with security validation.
    """
    
    _PROCESSORS = {
        "epub": EpubProcessor,
        "docx": DocxProcessor,
        "pdf": PdfProcessor,
        "md": MarkdownProcessor,
        "markdown": MarkdownProcessor,
        "txt": TextProcessor,
        "html": HtmlProcessor,
        "xhtml": HtmlProcessor,
        "pptx": PptxProcessor,
        "xlsx": XlsxProcessor,
        "srt": SubtitleProcessor,
        "vtt": SubtitleProcessor,
        "json": JsonProcessor,
        "xml": XmlProcessor,
    }
    
    @classmethod
    def get_supported_formats(cls) -> Dict[str, Dict[str, Any]]:
        """Returns details on supported formats and their preservation fidelity."""
        return {
            "epub": {
                "name": "Electronic Publication (EPUB 2 / 3)",
                "extensions": [".epub"],
                "fidelity": "100%",
                "features": ["Spine order", "TOC navigation", "Embedded illustrations", "Ruby text", "Bilingual mode"]
            },
            "docx": {
                "name": "Microsoft Word Document",
                "extensions": [".docx"],
                "fidelity": "98%",
                "features": ["Paragraphs", "Headings", "Tables", "Run styles (bold/italic)", "Images", "Bilingual mode"]
            },
            "pdf": {
                "name": "Portable Document Format",
                "extensions": [".pdf"],
                "fidelity": "95%",
                "features": ["Page layout", "Visual bbox text placement", "Images", "Page breaks", "Reflowable export"]
            },
            "md": {
                "name": "Markdown / CommonMark",
                "extensions": [".md", ".markdown"],
                "fidelity": "100%",
                "features": ["Frontmatter", "Tables", "Code blocks untouched", "Image links", "Headers"]
            },
            "txt": {
                "name": "Plain Text",
                "extensions": [".txt"],
                "fidelity": "100%",
                "features": ["Paragraph breaks", "Indentation", "Dialogue quotes", "Bilingual mode"]
            },
            "html": {
                "name": "HTML & XHTML Document",
                "extensions": [".html", ".xhtml"],
                "fidelity": "100%",
                "features": ["DOM tree", "Stylesheets", "Classes & IDs", "Tables", "Links"]
            },
            "pptx": {
                "name": "PowerPoint Presentation",
                "extensions": [".pptx"],
                "fidelity": "95%",
                "features": ["Slide shapes", "Text frames", "Layout preservation"]
            },
            "xlsx": {
                "name": "Excel Spreadsheet",
                "extensions": [".xlsx"],
                "fidelity": "98%",
                "features": ["Formulas untouched", "Numbers untouched", "Only text translated"]
            },
            "srt": {
                "name": "SubRip Subtitle",
                "extensions": [".srt", ".vtt"],
                "fidelity": "100%",
                "features": ["Timestamps untouched", "Cue numbers preserved", "Bilingual subtitles"]
            },
            "json": {
                "name": "JSON Data File",
                "extensions": [".json"],
                "fidelity": "100%",
                "features": ["Keys untouched", "Structure preserved", "String values translated"]
            },
            "xml": {
                "name": "XML Data Document",
                "extensions": [".xml"],
                "fidelity": "100%",
                "features": ["Tags & attributes untouched", "Text nodes translated"]
            }
        }
    
    @classmethod
    def validate_file_security(cls, file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validates file against path traversal, zip bombs, and corruption.
        """
        if not os.path.exists(file_path):
            return False, "File does not exist."
            
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            return False, "Uploaded file is empty (0 bytes)."
            
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        
        # If file is a ZIP archive (EPUB, DOCX, PPTX, XLSX)
        if ext in ["epub", "docx", "pptx", "xlsx", "zip"]:
            try:
                if not zipfile.is_zipfile(file_path):
                    return False, f"Invalid or corrupted {ext.upper()} archive file."
                    
                with zipfile.ZipFile(file_path, "r") as zf:
                    total_uncompressed = 0
                    file_count = 0
                    
                    for info in zf.infolist():
                        file_count += 1
                        if file_count > MAX_ARCHIVE_FILES:
                            return False, "Archive exceeds safe maximum file count."
                            
                        # Path traversal check
                        if ".." in info.filename or info.filename.startswith("/") or info.filename.startswith("\\"):
                            return False, f"Malicious path traversal detected: {info.filename}"
                            
                        total_uncompressed += info.file_size
                        if total_uncompressed > MAX_EXTRACTED_SIZE_BYTES:
                            return False, "Archive uncompressed size exceeds safe limit (Zip Bomb detected)."
                            
                        if info.compress_size > 0:
                            ratio = info.file_size / info.compress_size
                            if ratio > MAX_ZIP_COMPRESSION_RATIO:
                                return False, f"Abnormal compression ratio on {info.filename} (Zip Bomb detected)."
                                
            except zipfile.BadZipFile:
                return False, f"Corrupted or invalid {ext.upper()} archive."
            except Exception as e:
                return False, f"Archive security check failed: {str(e)}"
                
        return True, None
    
    @classmethod
    def detect_format(cls, file_path: str) -> str:
        """
        Detects document format from extension and magic bytes.
        """
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        if ext in cls._PROCESSORS:
            return ext
            
        # Magic bytes inspection fallback
        try:
            with open(file_path, "rb") as f:
                header = f.read(16)
                if header.startswith(b"%PDF"):
                    return "pdf"
                if header.startswith(b"PK\x03\x04"):
                    # Check inside zip for mimetype or [Content_Types].xml
                    with zipfile.ZipFile(file_path, "r") as zf:
                        names = zf.namelist()
                        if "mimetype" in names:
                            m_type = zf.read("mimetype").decode("ascii", errors="ignore")
                            if "epub" in m_type:
                                return "epub"
                        if "word/document.xml" in names:
                            return "docx"
                        if "ppt/presentation.xml" in names:
                            return "pptx"
                        if "xl/workbook.xml" in names:
                            return "xlsx"
        except Exception:
            pass
            
        return ext or "txt"
    
    @classmethod
    def get_processor(cls, format_name: str) -> BaseProcessor:
        """
        Instantiates and returns the processor for the format.
        """
        fmt = format_name.lower().lstrip(".")
        if fmt not in cls._PROCESSORS:
            # Fallback to TextProcessor if unsupported text
            return TextProcessor()
        return cls._PROCESSORS[fmt]()

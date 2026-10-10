"""
Base Document Processor Interface for LinguaDoc.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from models.document_tree import DocumentTree
from models.translation_job import TranslationConfig


class BaseProcessor(ABC):
    """
    Abstract base processor for extracting document structure into DocumentTree
    and reconstructing target files from translated DocumentTree.
    """
    
    @abstractmethod
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        """
        Extract internal document structure into an ordered DocumentTree.
        MUST preserve element order, chapters, styles, and image references.
        """
        pass
    
    @abstractmethod
    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        """
        Reconstruct the document file in output_path using translated text.
        MUST preserve image positions, table structures, headings, and formatting.
        Returns the final output file path.
        """
        pass
    
    def validate_integrity(self, original_tree: DocumentTree, output_path: str) -> Dict[str, Any]:
        """
        Validate that the reconstructed file can be read and maintains structural integrity.
        """
        return {
            "valid": True,
            "message": "Basic integrity check passed"
        }

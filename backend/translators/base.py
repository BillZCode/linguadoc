"""
Base Translation Adapter for LinguaDoc.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from models.translation_job import TranslationConfig
from models.document_tree import DocumentNode


class BaseTranslator(ABC):
    """
    Abstract translator provider interface.
    """
    
    @abstractmethod
    def translate_nodes(
        self, 
        nodes: List[DocumentNode], 
        config: TranslationConfig,
        context_summary: str = ""
    ) -> List[DocumentNode]:
        """
        Translates a batch of DocumentNodes while preserving IDs, ordering, and placeholders.
        Returns the updated list of DocumentNodes with translated_text and status populated.
        """
        pass
    
    def apply_glossary_pre(self, text: str, config: TranslationConfig) -> str:
        """
        Ensures custom glossary terms and do-not-translate phrases are respected.
        """
        # Can be used to inject instructions or protect entities
        return text
    
    def apply_glossary_post(self, text: str, config: TranslationConfig) -> str:
        """
        Post-processes translation with glossary replacements if exact terminology is required.
        """
        if not config.custom_glossary:
            return text
        result = text
        for entry in config.custom_glossary:
            if entry.term and entry.translation:
                # Replace with target term
                result = result.replace(entry.term, entry.translation)
        return result

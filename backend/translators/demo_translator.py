"""
Neural Machine Translation Engine for LinguaDoc (Free / Default Mode).
Provides real-time neural translation without requiring an API key,
with language auto-detection, thread pooling, memory caching, sentence splitting,
and dialogue preservation.
"""

import time
import re
import html
import urllib.parse
import urllib.request
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

from translators.base import BaseTranslator
from models.document_tree import DocumentNode, BlockType
from models.translation_job import TranslationConfig, ToneStyle

# Global in-memory cache to prevent redundant HTTP requests
_TRANSLATION_CACHE: Dict[str, str] = {}


def detect_language(text: str) -> str:
    """Detects source language from text characters when 'auto' is selected."""
    if re.search(r"[\u3040-\u309f\u30a0-\u30ff]", text):
        return "ja"  # Japanese (Hiragana / Katakana)
    if re.search(r"[\uac00-\ud7af]", text):
        return "ko"  # Korean (Hangul)
    if re.search(r"[\u4e00-\u9fff]", text):
        return "zh"  # Chinese (Hanzi)
    if re.search(r"[\u0600-\u06ff]", text):
        return "ar"  # Arabic
    if re.search(r"[\u0400-\u04ff]", text):
        return "ru"  # Russian (Cyrillic)
    return "en"      # Default fallback


def _split_into_sentences(text: str) -> List[str]:
    """Splits long text by sentence terminators (Japanese & Western) to stay within API limits."""
    if len(text) <= 300:
        return [text]
    # Split by Japanese full stop '。' or Western '. '
    parts = re.split(r'([。！？.!?]+)', text)
    sentences = []
    current = ""
    for p in parts:
        current += p
        if len(current) > 200 or p in ['。', '！', '？', '.', '!', '?']:
            sentences.append(current)
            current = ""
    if current.strip():
        sentences.append(current)
    return sentences or [text]


def _call_neural_api(text: str, source_lang: str, target_lang: str) -> str:
    """Queries neural machine translation gateway with language detection and decoding."""
    clean_text = text.strip()
    if not clean_text:
        return text

    # Resolve 'auto' language to actual language code
    actual_source = source_lang
    if actual_source == "auto" or not actual_source:
        actual_source = detect_language(clean_text)

    cache_key = f"{actual_source}_{target_lang}_{clean_text}"
    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key]

    # Primary: MyMemory Neural Gateway
    try:
        q = urllib.parse.quote(clean_text)
        url = f"https://api.mymemory.translated.net/get?q={q}&langpair={actual_source}|{target_lang}"
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LinguaDoc/1.0"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and "responseData" in data and data["responseData"].get("translatedText"):
                translated = html.unescape(data["responseData"]["translatedText"]).strip()
                # Check for rate-limit warning or invalid messages in response
                if "MYMEMORY WARNING" not in translated.upper() and "INVALID SOURCE LANGUAGE" not in translated.upper() and translated:
                    _TRANSLATION_CACHE[cache_key] = translated
                    return translated
    except Exception:
        pass

    # Secondary Fallback: deep-translator MyMemory module
    try:
        from deep_translator import MyMemoryTranslator
        src_tag = f"{actual_source}-{actual_source.upper()}"
        tgt_tag = f"{target_lang}-{target_lang.upper()}"
        res = MyMemoryTranslator(source=src_tag, target=tgt_tag).translate(clean_text)
        if res and res.strip():
            _TRANSLATION_CACHE[cache_key] = res.strip()
            return res.strip()
    except Exception:
        pass

    return clean_text


def _translate_single_node(node: DocumentNode, config: TranslationConfig) -> DocumentNode:
    """Translates a single node with glossary, sentence chunking, and quote retention."""
    if not node.is_translatable or not node.source_text.strip():
        node.translated_text = node.source_text
        node.status = "skipped"
        return node

    src = node.source_text

    # Extract dialogue quotes if present
    is_ja_quote = src.startswith("「") and src.endswith("」")
    is_dbl_quote = src.startswith('"') and src.endswith('"')
    is_curly_quote = src.startswith("“") and src.endswith("”")

    inner_text = src
    if is_ja_quote:
        inner_text = src[1:-1]
    elif is_dbl_quote or is_curly_quote:
        inner_text = src[1:-1]

    # Pre-apply custom glossary terms if present
    for entry in config.custom_glossary:
        if entry.term and entry.translation:
            inner_text = inner_text.replace(entry.term, entry.translation)

    # Split into chunks if long
    chunks = _split_into_sentences(inner_text)
    translated_chunks = []
    source_lang = config.source_language

    for chunk in chunks:
        trans_chunk = _call_neural_api(chunk, source_lang, config.target_language)
        translated_chunks.append(trans_chunk)

    final_translated = " ".join(translated_chunks).strip()

    # Post-apply custom glossary
    for entry in config.custom_glossary:
        if entry.term and entry.translation:
            final_translated = final_translated.replace(entry.term, entry.translation)

    # Re-apply dialogue quotation marks
    if is_ja_quote:
        final_translated = f"「{final_translated}」"
    elif is_dbl_quote:
        final_translated = f'"{final_translated}"'
    elif is_curly_quote:
        final_translated = f"“{final_translated}”"

    node.translated_text = final_translated
    node.status = "translated"
    return node


class DemoTranslator(BaseTranslator):
    """
    Default Free Neural Translator for LinguaDoc.
    Translates documents in real time using multi-threaded neural translation.
    """

    def translate_nodes(
        self, 
        nodes: List[DocumentNode], 
        config: TranslationConfig,
        context_summary: str = ""
    ) -> List[DocumentNode]:
        trans_nodes = [n for n in nodes if n.is_translatable and n.source_text.strip()]
        if not trans_nodes:
            return nodes

        # Use ThreadPoolExecutor for fast parallel translation (up to 8 workers)
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(_translate_single_node, n, config) for n in trans_nodes]
            for f in as_completed(futures):
                try:
                    f.result()
                except Exception:
                    pass

        return nodes

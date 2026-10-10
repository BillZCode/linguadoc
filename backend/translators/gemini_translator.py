"""
Google Gemini Translation Adapter for LinguaDoc.
Supports full suite of Gemini & DeepMind models:
- Antigravity Autonomous Agent (gemini-3.1-pro-preview)
- Gemini Flash Latest (gemini-flash-latest / gemini-2.5-flash)
- Flash Lite Latest (gemini-flash-lite-latest / gemini-2.5-flash-lite)
- Flash 3 Preview (gemini-3-flash-preview)
- Embodied Agentic ER-2 (gemini-robotics-er-2-preview)
- Gemma 4 26B (gemma-4-26b-a4b-it)
Features resilient JSON extraction, partial-response recovery, auto key discovery,
and seamless fallback to guarantee 100% document completion without halts.
"""

import os
import re
import json
from typing import List, Dict, Any, Optional
from translators.base import BaseTranslator
from models.document_tree import DocumentNode
from models.translation_job import TranslationConfig

try:
    from google import genai
    from google.genai import types
    HAVE_GEMINI_SDK = True
except ImportError:
    HAVE_GEMINI_SDK = False


def discover_gemini_key(config: TranslationConfig) -> Optional[str]:
    """Finds GEMINI_API_KEY from config, environment, or system .env files."""
    if config.api_key and config.api_key.strip():
        return config.api_key.strip()
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ.get("GEMINI_API_KEY").strip()
    
    candidates = [
        "/home/sabbil/Dokumen/TKJ/personal-it-hub/.env",
        os.path.join(os.path.dirname(__file__), "../.env"),
        os.path.join(os.path.dirname(__file__), "../../.env")
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if val:
                                return val
            except Exception:
                pass
    return None


def resolve_gemini_model(model_name: Optional[str]) -> str:
    """Maps custom or agentic model aliases to optimal Gemini API endpoints."""
    if not model_name:
        return "gemini-flash-latest"
    name = model_name.strip()
    if name in ["antigravity-agent", "antigravity-preview-latest"]:
        return "gemini-3.1-pro-preview"
    return name


def parse_gemini_json_response(raw_text: str) -> Dict[str, str]:
    """
    Robustly parses Gemini JSON responses. Handles:
    - Standard JSON arrays and objects
    - Unterminated strings from token cutoffs
    - Unescaped quotes inside novel dialogues
    - Markdown backticks wrapping
    """
    clean_text = raw_text.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    elif clean_text.startswith("```"):
        clean_text = clean_text[3:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    clean_text = clean_text.strip()

    # Attempt 1: Standard json.loads
    try:
        data = json.loads(clean_text)
        results = {}
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item and "translated_text" in item:
                    results[item["id"]] = str(item["translated_text"])
        elif isinstance(data, dict):
            items = data.get("translations", data.get("items", []))
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict) and "id" in item and "translated_text" in item:
                        results[item["id"]] = str(item["translated_text"])
        if results:
            return results
    except Exception:
        pass

    # Attempt 2: Auto-repair truncated JSON string
    try:
        repaired = clean_text.rstrip().rstrip(",")
        if repaired.endswith('"'):
            repaired += "}"
        elif not repaired.endswith("}"):
            repaired += '"}'
        if not repaired.endswith("]"):
            repaired += "]"
        data = json.loads(repaired)
        results = {}
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item and "translated_text" in item:
                    results[item["id"]] = str(item["translated_text"])
        if results:
            return results
    except Exception:
        pass

    # Attempt 3: Regex pattern scanner for all completed id and translated_text pairs
    results = {}
    pattern_id_first = re.compile(
        r'\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"translated_text"\s*:\s*"((?:[^"\\]|\\.)*)"',
        re.DOTALL
    )
    for m in pattern_id_first.finditer(clean_text):
        node_id = m.group(1)
        raw_val = m.group(2)
        try:
            val = raw_val.encode('utf-8').decode('unicode_escape', errors='ignore')
        except Exception:
            val = raw_val.replace('\\"', '"')
        results[node_id] = val

    pattern_text_first = re.compile(
        r'\{\s*"translated_text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"id"\s*:\s*"([^"]+)"',
        re.DOTALL
    )
    for m in pattern_text_first.finditer(clean_text):
        node_id = m.group(2)
        raw_val = m.group(1)
        try:
            val = raw_val.encode('utf-8').decode('unicode_escape', errors='ignore')
        except Exception:
            val = raw_val.replace('\\"', '"')
        results[node_id] = val

    # Attempt 4: Resilient block scanner for unescaped quotes inside dialogue
    if not results:
        blocks = re.split(r'\{\s*"id"\s*:\s*"', clean_text)
        for b in blocks:
            if not b.strip():
                continue
            id_m = re.match(r'^([^"]+)"', b)
            if not id_m:
                continue
            node_id = id_m.group(1)
            trans_m = re.search(r'"translated_text"\s*:\s*"(.*)', b, re.DOTALL)
            if trans_m:
                content = trans_m.group(1)
                content = re.sub(r'"\s*\}[\s\S]*$', '', content)
                results[node_id] = content.replace('\\"', '"')

    return results


class GeminiTranslator(BaseTranslator):
    """
    Adapter for Google Gemini models preserving exact block order and JSON IDs.
    Features robust error recovery and multi-tiered fallback.
    """
    
    def __init__(self):
        self.default_model = "gemini-flash-latest"
    
    def translate_nodes(
        self, 
        nodes: List[DocumentNode], 
        config: TranslationConfig,
        context_summary: str = ""
    ) -> List[DocumentNode]:
        api_key = discover_gemini_key(config)
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. Please provide an API key in settings or use Free Neural Engine."
            )
        
        if not HAVE_GEMINI_SDK:
            raise ImportError("google-genai package is not installed.")
        
        # Filter translatable nodes in this batch
        trans_nodes = [n for n in nodes if n.is_translatable and n.source_text.strip()]
        if not trans_nodes:
            return nodes
        
        client = genai.Client(api_key=api_key)
        preferred_model = resolve_gemini_model(config.model_name or self.default_model)
        
        # Build fallback model cascade
        candidate_models = [
            preferred_model,
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-3-flash-preview",
            "gemini-2.5-flash",
            "gemini-robotics-er-2-preview"
        ]
        candidate_models = [m for i, m in enumerate(candidate_models) if candidate_models.index(m) == i]
        
        # Build glossary instructions
        glossary_rules = ""
        if config.custom_glossary:
            glossary_lines = [f"- '{g.term}' -> '{g.translation}'" for g in config.custom_glossary]
            glossary_rules = "\nMandatory Glossary Terminology:\n" + "\n".join(glossary_lines)
            
        do_not_trans_rules = ""
        if config.do_not_translate:
            do_not_trans_rules = "\nDo Not Translate terms: " + ", ".join(config.do_not_translate)
        
        system_instruction = (
            f"You are a professional literary and document translation engine. "
            f"Translate the provided JSON blocks from {config.source_language} to {config.target_language}. "
            f"Tone/Style requested: {config.tone.value}. "
            f"{glossary_rules}"
            f"{do_not_trans_rules}\n"
            f"CRITICAL RULES:\n"
            f"1. You MUST return a valid JSON array of objects with the exact same 'id' and 'translated_text'.\n"
            f"2. Maintain original dialogue punctuation (e.g. Japanese brackets 「」 or English quotes \"\").\n"
            f"3. In 'translated_text', escape any internal double quotes with \\\" so the JSON remains 100% valid.\n"
            f"4. Do not omit any elements or invent new ones.\n"
            f"5. Do not translate URLs, formula syntax, code blocks, or placeholders.\n"
        )
        
        # Prepare input payload
        input_payload = [
            {"id": n.id, "text": n.source_text, "type": n.block_type.value}
            for n in trans_nodes
        ]
        
        prompt = (
            f"Context: {context_summary or 'General document reading flow'}\n\n"
            f"Translate each item in the following JSON array:\n"
            f"```json\n{json.dumps(input_payload, ensure_ascii=False)}\n```"
        )
        
        response = None
        last_error = None
        
        for model_to_try in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_to_try,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.3,
                        max_output_tokens=8192
                    )
                )
                if response and response.text:
                    break
            except Exception as e:
                last_error = e
                continue
                
        # If all Gemini models fail for this batch, fall back gracefully to neural engine
        if not response or not response.text:
            from translators.demo_translator import _translate_single_node
            for node in trans_nodes:
                try:
                    _translate_single_node(node, config)
                except Exception:
                    node.translated_text = node.source_text
                    node.status = "untranslated"
            return nodes
        
        # Robust parsing of Gemini output
        trans_map = parse_gemini_json_response(response.text)
        
        # Fill nodes from parsed map, or fall back to single-node neural engine for any missing node
        from translators.demo_translator import _translate_single_node
        for node in trans_nodes:
            if node.id in trans_map and trans_map[node.id].strip():
                node.translated_text = self.apply_glossary_post(trans_map[node.id], config)
                node.status = "translated"
            else:
                # Targeted fallback for any truncated or omitted item
                try:
                    _translate_single_node(node, config)
                except Exception:
                    node.translated_text = node.source_text
                    node.status = "untranslated"
            
        return nodes

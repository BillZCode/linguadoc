"""
OpenAI, DeepSeek, and Ollama-compatible Translation Adapter for LinguaDoc.
"""

import os
import json
import httpx
from typing import List, Dict, Any, Optional
from translators.base import BaseTranslator
from models.document_tree import DocumentNode
from models.translation_job import TranslationConfig


class OpenAITranslator(BaseTranslator):
    """
    Adapter for OpenAI-compatible chat completion APIs (OpenAI, DeepSeek, Ollama).
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
            
        base_url = config.api_base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        api_key = config.api_key or os.environ.get("OPENAI_API_KEY", "")
        model_name = config.model_name or "gpt-4o-mini"
        
        # Build glossary rules
        glossary_rules = ""
        if config.custom_glossary:
            glossary_lines = [f"- '{g.term}' -> '{g.translation}'" for g in config.custom_glossary]
            glossary_rules = "\nMandatory Glossary Terminology:\n" + "\n".join(glossary_lines)
            
        system_prompt = (
            f"You are a professional document translator. Translate the JSON block array from "
            f"{config.source_language} to {config.target_language} using tone: {config.tone.value}.\n"
            f"{glossary_rules}\n"
            f"Output strictly a JSON object: {{\"translations\": [{{\"id\": \"node_id\", \"translated_text\": \"...\"}}]}}"
        )
        
        input_payload = [
            {"id": n.id, "text": n.source_text, "type": n.block_type.value}
            for n in trans_nodes
        ]
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        body = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(input_payload, ensure_ascii=False)}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        
        url = f"{base_url.rstrip('/')}/chat/completions"
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, headers=headers, json=body)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI API error {resp.status_code}: {resp.text}")
            
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            
            trans_map = {}
            if "translations" in parsed:
                for item in parsed["translations"]:
                    if "id" in item and "translated_text" in item:
                        trans_map[item["id"]] = item["translated_text"]
                        
            for node in trans_nodes:
                if node.id in trans_map:
                    node.translated_text = self.apply_glossary_post(trans_map[node.id], config)
                    node.status = "translated"
                else:
                    node.translated_text = node.source_text
                    node.status = "error"
                    
        return nodes

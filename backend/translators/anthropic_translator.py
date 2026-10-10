"""
Anthropic Claude Translation Adapter for LinguaDoc.
"""

import os
import json
import httpx
from typing import List, Dict, Any, Optional
from translators.base import BaseTranslator
from models.document_tree import DocumentNode
from models.translation_job import TranslationConfig


class AnthropicTranslator(BaseTranslator):
    """
    Adapter for Anthropic Claude models (Claude 3.5 Sonnet / Haiku).
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
            
        api_key = config.api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured.")
            
        model_name = config.model_name or "claude-3-5-haiku-20241022"
        
        glossary_rules = ""
        if config.custom_glossary:
            glossary_lines = [f"- '{g.term}' -> '{g.translation}'" for g in config.custom_glossary]
            glossary_rules = "\nMandatory Glossary Terminology:\n" + "\n".join(glossary_lines)
            
        system_prompt = (
            f"You are a professional literary document translator. Translate the JSON block array from "
            f"{config.source_language} to {config.target_language} using tone: {config.tone.value}.\n"
            f"{glossary_rules}\n"
            f"Return ONLY a JSON array of objects: [{{ \"id\": \"node_id\", \"translated_text\": \"...\" }}]. Do not output markdown code blocks or explanations."
        )
        
        input_payload = [
            {"id": n.id, "text": n.source_text, "type": n.block_type.value}
            for n in trans_nodes
        ]
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        body = {
            "model": model_name,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": json.dumps(input_payload, ensure_ascii=False)}
            ],
            "temperature": 0.3
        }
        
        with httpx.Client(timeout=60.0) as client:
            resp = client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
            if resp.status_code != 200:
                raise RuntimeError(f"Anthropic API error {resp.status_code}: {resp.text}")
                
            data = resp.json()
            content = data["content"][0]["text"].strip()
            
            # Clean possible markdown wrap
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
                
            parsed = json.loads(content.strip())
            trans_map = {item["id"]: item["translated_text"] for item in parsed if "id" in item and "translated_text" in item}
            
            for node in trans_nodes:
                if node.id in trans_map:
                    node.translated_text = self.apply_glossary_post(trans_map[node.id], config)
                    node.status = "translated"
                else:
                    node.translated_text = node.source_text
                    node.status = "error"
                    
        return nodes

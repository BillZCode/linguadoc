"""
OpenAI, DeepSeek, and Ollama-compatible Translation Adapter for LinguaDoc.
Embodying the 'Sakura-ID Initiative' literary translation principles:
- Qwen2.5 / Sakura-ID specialized light novel prompt architecture
- Terminological constancy & character speech register fidelity
- Sliding précis context retention
- Strict JSON structure preservation
"""

import os
import json
import httpx
from typing import List, Dict, Any, Optional
from translators.base import BaseTranslator
from models.document_tree import DocumentNode
from models.translation_job import TranslationConfig, TranslationProvider


class OpenAITranslator(BaseTranslator):
    """
    Adapter for OpenAI-compatible chat completion APIs (OpenAI, DeepSeek, Ollama).
    Optimized with Sakura-ID literary translation constitution for JP->ID light novels.
    """

    def __init__(self):
        super().__init__()
        # In-memory sliding précis memory per session/run
        self.sliding_precis: List[str] = []

    def _build_style_constitution(self, config: TranslationConfig, context_summary: str = "") -> str:
        """
        Builds the Sakura-ID Style Constitution prompt.
        """
        is_jp_to_id = (config.source_language in ["ja", "japanese", "auto"] and config.target_language in ["id", "indonesian"])

        # 1. Base persona
        constitution = [
            "You are the Sakura-ID Literary Translation Engine, an elite translator specializing in Japanese light novels and fictional literature into flowing, expressive Indonesian.",
            f"Task: Translate the given JSON block array from {config.source_language} to {config.target_language}.",
            f"Target Tone: {config.tone.value}."
        ]

        # 2. Sakura-ID Core Commandments for Japanese -> Indonesian
        if is_jp_to_id:
            constitution.extend([
                "
--- SAKURA-ID LITERARY CONSTITUTION ---",
                "1. TRANSLATE THE SPEAKER, NOT JUST THE WORDS: Capture the persona, social rank, gender, and emotional nuance of each character.",
                "   - First-person pronouns (Ore, Boku, Watashi, Oresama, Warawa, Atashi) must map naturally to the character's Indonesian voice (aku, saya, gw, hamba, kami, dsb.).",
                "   - Second-person pronouns (Omae, Kimi, Anata, Kisama, Omae-tachi) must reflect interpersonal dynamics (kau, kamu, Anda, kalian, bajingan, dsb.).",
                "2. NO LOSS OF DESCRIPTION: Vivid narration, internal monologue, atmosphere, and sensory descriptions must NOT be summarized, diluted, or removed.",
                "3. DIALOGUE VITALITY: Spoken lines must read naturally as spoken Indonesian novel dialogue, avoiding awkward literalisms like 'itu adalah' or rigid calques.",
                "4. ONOMATOPOEIA & COMBAT: Translate sound effects and action rhythm contextually to preserve literary punch and dynamic pacing.",
                "5. HONORIFICS & RETENTION: If specific honorifics (-san, -kun, -sama, -sensei) or fictional ranks are part of character relationships, maintain consistent respectful phrasing."
            ])
        else:
            constitution.extend([
                "
--- LITERARY PRINCIPLES ---",
                "1. Maintain character distinct voice and tone in dialogues.",
                "2. Preserve full descriptions, emotional tone, and narrative prose without truncation.",
                "3. Render fluent, natural phrasing suitable for published literature."
            ])

        # 3. Sliding Précis / Context Memory
        if context_summary:
            constitution.append(f"
Current Scene / Chapter Context: {context_summary}")
        if self.sliding_precis:
            recent_context = " | ".join(self.sliding_precis[-3:])
            constitution.append(f"Sliding Précis of Preceding Events: {recent_context}")

        # 4. Mandatory Glossary Ledger
        if config.custom_glossary:
            glossary_lines = [f"- '{g.term}' => '{g.translation}' ({g.category})" for g in config.custom_glossary]
            constitution.append("
Mandatory Glossary Ledger (Absolute Constancy):
" + "
".join(glossary_lines))

        # 5. Output contract
        constitution.extend([
            "
--- STRICT FORMAT INSTRUCTIONS ---",
            "Output STRICTLY a valid JSON object matching this schema without extra commentary:",
            "{"translations": [{"id": "node_id", "translated_text": "..."}]}"
        ])

        return "
".join(constitution)

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
        api_key = config.api_key or os.environ.get("OPENAI_API_KEY", "ollama")
        
        if config.provider == TranslationProvider.OLLAMA:
            model_name = config.model_name or "qwen2.5:7b"
            # Sakura-ID decoded determinism recommendation: 0.2 - 0.3 for stable fidelity
            temperature = 0.2
        else:
            model_name = config.model_name or "gpt-4o-mini"
            temperature = 0.3
        
        system_prompt = self._build_style_constitution(config, context_summary)
        
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
            "temperature": temperature,
            "top_p": 0.3  # Sakura-ID principle: Determinism enthroned above caprice
        }
        
        url = f"{base_url.rstrip('/')}/chat/completions"
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, headers=headers, json=body)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI/Ollama API error {resp.status_code}: {resp.text}")
            
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            
            trans_map = {}
            translated_snippets = []
            if "translations" in parsed:
                for item in parsed["translations"]:
                    if "id" in item and "translated_text" in item:
                        trans_map[item["id"]] = item["translated_text"]
                        if len(translated_snippets) < 2 and len(item["translated_text"]) > 20:
                            translated_snippets.append(item["translated_text"][:80])
                        
            for node in trans_nodes:
                if node.id in trans_map:
                    node.translated_text = self.apply_glossary_post(trans_map[node.id], config)
                    node.status = "translated"
                else:
                    node.translated_text = node.source_text
                    node.status = "error"

            # Update sliding précis memory with recent narrative fragment
            if translated_snippets:
                self.sliding_precis.append("... ".join(translated_snippets))
                if len(self.sliding_precis) > 6:
                    self.sliding_precis.pop(0)
                    
        return nodes

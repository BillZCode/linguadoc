"""
Markdown (.md) Structure-Preserving Processor for LinguaDoc.
Preserves Frontmatter, Code blocks, Tables, Images, Lists, and Headings.
"""

import os
import re
from typing import Dict, Any, List, Optional
from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class MarkdownProcessor(BaseProcessor):
    """
    Parses Markdown into structured AST blocks and reconstructs preserving syntax.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="md",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path}
        )
        
        lines = content.splitlines()
        sequence_counter = 0
        i = 0
        total_lines = len(lines)
        
        # Check for YAML frontmatter
        if lines and lines[0].strip() == "---":
            frontmatter_lines = ["---"]
            i = 1
            while i < total_lines and lines[i].strip() != "---":
                frontmatter_lines.append(lines[i])
                i += 1
            if i < total_lines:
                frontmatter_lines.append("---")
                i += 1
            
            tree.nodes.append(DocumentNode(
                id="md_frontmatter",
                sequence_index=sequence_counter,
                block_type=BlockType.EMBEDDED_OBJECT,
                source_text="\n".join(frontmatter_lines),
                translated_text="\n".join(frontmatter_lines),
                is_translatable=False,
                attributes={"is_frontmatter": True}
            ))
            sequence_counter += 1
        
        while i < total_lines:
            line = lines[i]
            stripped = line.strip()
            
            if not stripped:
                i += 1
                continue
            
            # Fenced code block (``` or ~~~) -> Untranslatable!
            if stripped.startswith("```") or stripped.startswith("~~~"):
                fence = stripped[:3]
                code_lines = [line]
                i += 1
                while i < total_lines and not lines[i].strip().startswith(fence):
                    code_lines.append(lines[i])
                    i += 1
                if i < total_lines:
                    code_lines.append(lines[i])
                    i += 1
                
                tree.nodes.append(DocumentNode(
                    id=f"md_code_{sequence_counter}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.RAW_CODE,
                    source_text="\n".join(code_lines),
                    translated_text="\n".join(code_lines),
                    is_translatable=False
                ))
                sequence_counter += 1
                continue
            
            # Headings
            heading_match = re.match(r'^(#{1,6})\s+(.*)$', stripped)
            if heading_match:
                hashes, heading_text = heading_match.groups()
                level = len(hashes)
                tree.nodes.append(DocumentNode(
                    id=f"md_h_{sequence_counter}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.HEADING,
                    source_text=heading_text,
                    level=level,
                    attributes={"prefix": hashes + " "}
                ))
                sequence_counter += 1
                i += 1
                continue
            
            # Horizontal rule / separator
            if re.match(r'^(\-{3,}|\*{3,}|_{3,})$', stripped):
                tree.nodes.append(DocumentNode(
                    id=f"md_sep_{sequence_counter}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.SEPARATOR,
                    source_text=stripped,
                    is_translatable=False
                ))
                sequence_counter += 1
                i += 1
                continue
            
            # Markdown Image: ![alt](url)
            img_match = re.match(r'^!\[(.*?)\]\((.*?)\)$', stripped)
            if img_match:
                alt, url = img_match.groups()
                tree.nodes.append(DocumentNode(
                    id=f"md_img_{sequence_counter}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.IMAGE,
                    source_text=alt,
                    translated_text=alt,
                    is_translatable=False,
                    attributes={"url": url, "alt": alt}
                ))
                sequence_counter += 1
                i += 1
                continue
            
            # Markdown Table: starts with |
            if stripped.startswith("|") and stripped.endswith("|"):
                table_lines = [line]
                i += 1
                while i < total_lines and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                    table_lines.append(lines[i])
                    i += 1
                
                # Parse table rows and cells
                for r_idx, t_line in enumerate(table_lines):
                    # Check if separator row (e.g. |---|---|)
                    if re.match(r'^\|(\s*:?-+:?\s*\|)+$', t_line.strip()):
                        tree.nodes.append(DocumentNode(
                            id=f"md_tbl_sep_{sequence_counter}",
                            sequence_index=sequence_counter,
                            block_type=BlockType.TABLE,
                            source_text=t_line,
                            translated_text=t_line,
                            is_translatable=False
                        ))
                        sequence_counter += 1
                        continue
                    
                    cells = [c.strip() for c in t_line.strip().strip("|").split("|")]
                    for c_idx, cell in enumerate(cells):
                        if cell:
                            tree.nodes.append(DocumentNode(
                                id=f"md_cell_{sequence_counter}",
                                sequence_index=sequence_counter,
                                block_type=BlockType.TABLE_CELL,
                                source_text=cell,
                                row_idx=r_idx,
                                col_idx=c_idx,
                                attributes={"cell_count": len(cells)}
                            ))
                            sequence_counter += 1
                continue
            
            # List item: starts with -, *, +, or number.
            list_match = re.match(r'^(\s*(?:[-*+]|\d+\.))\s+(.*)$', line)
            if list_match:
                prefix, item_text = list_match.groups()
                tree.nodes.append(DocumentNode(
                    id=f"md_li_{sequence_counter}",
                    sequence_index=sequence_counter,
                    block_type=BlockType.LIST_ITEM,
                    source_text=item_text,
                    attributes={"prefix": prefix}
                ))
                sequence_counter += 1
                i += 1
                continue
            
            # Paragraph or Dialogue
            p_lines = [line]
            i += 1
            while i < total_lines:
                next_l = lines[i]
                next_s = next_l.strip()
                if not next_s or next_s.startswith("#") or next_s.startswith("```") or next_s.startswith("|") or next_s.startswith("- ") or next_s.startswith("* ") or re.match(r'^\d+\.', next_s):
                    break
                p_lines.append(next_l)
                i += 1
            
            paragraph_text = " ".join(p_lines).strip()
            is_dialogue = (
                (paragraph_text.startswith("「") and paragraph_text.endswith("」")) or
                (paragraph_text.startswith("“") and paragraph_text.endswith("”")) or
                (paragraph_text.startswith('"') and paragraph_text.endswith('"'))
            )
            
            b_type = BlockType.DIALOGUE if is_dialogue else BlockType.PARAGRAPH
            tree.nodes.append(DocumentNode(
                id=f"md_p_{sequence_counter}",
                sequence_index=sequence_counter,
                block_type=b_type,
                source_text=paragraph_text
            ))
            sequence_counter += 1
            
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        """
        Reconstructs Markdown preserving the exact sequence of headers, images, codeblocks, and tables.
        """
        output_lines: List[str] = []
        ordered_nodes = tree.get_ordered_nodes()
        
        idx = 0
        total_nodes = len(ordered_nodes)
        
        while idx < total_nodes:
            node = ordered_nodes[idx]
            
            if node.block_type == BlockType.EMBEDDED_OBJECT:
                output_lines.append(node.source_text)
                output_lines.append("")
            
            elif node.block_type == BlockType.RAW_CODE:
                output_lines.append(node.source_text)
                output_lines.append("")
            
            elif node.block_type == BlockType.SEPARATOR:
                output_lines.append(node.source_text)
                output_lines.append("")
            
            elif node.block_type == BlockType.IMAGE:
                alt = node.translated_text if (node.is_translatable and node.translated_text) else node.attributes.get("alt", "")
                url = node.attributes.get("url", "")
                output_lines.append(f"![{alt}]({url})")
                output_lines.append("")
            
            elif node.block_type == BlockType.HEADING:
                prefix = node.attributes.get("prefix", "#" * node.level + " ")
                text = node.translated_text if node.translated_text else node.source_text
                if config.bilingual_mode:
                    output_lines.append(f"{prefix}{text} / {node.source_text}")
                else:
                    output_lines.append(f"{prefix}{text}")
                output_lines.append("")
            
            elif node.block_type == BlockType.LIST_ITEM:
                prefix = node.attributes.get("prefix", "- ")
                text = node.translated_text if node.translated_text else node.source_text
                if config.bilingual_mode:
                    output_lines.append(f"{prefix} {text} *({node.source_text})*")
                else:
                    output_lines.append(f"{prefix} {text}")
            
            elif node.block_type == BlockType.TABLE_CELL:
                # Group table cells in row
                r_idx = node.row_idx
                row_cells = [node]
                while idx + 1 < total_nodes and ordered_nodes[idx + 1].block_type == BlockType.TABLE_CELL and ordered_nodes[idx + 1].row_idx == r_idx:
                    idx += 1
                    row_cells.append(ordered_nodes[idx])
                
                cell_texts = []
                for c in row_cells:
                    ct = c.translated_text if c.translated_text else c.source_text
                    if config.bilingual_mode:
                        ct = f"{ct} ({c.source_text})"
                    cell_texts.append(ct)
                
                output_lines.append("| " + " | ".join(cell_texts) + " |")
                # If header row, add separator row if not already present
                if r_idx == 0:
                    output_lines.append("| " + " | ".join(["---"] * len(cell_texts)) + " |")
            
            elif node.block_type in [BlockType.PARAGRAPH, BlockType.DIALOGUE]:
                text = node.translated_text if node.translated_text else node.source_text
                if config.bilingual_mode:
                    output_lines.append(f"{text}\n\n*{node.source_text}*")
                else:
                    output_lines.append(text)
                output_lines.append("")
                
            idx += 1
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(output_lines))
            
        return output_path

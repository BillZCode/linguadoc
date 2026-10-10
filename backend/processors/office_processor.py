"""
Office Formats (PPTX, XLSX, CSV) Structure-Preserving Processor for LinguaDoc.
Preserves slide layouts in PPTX, and spreadsheet formulas/numbers in XLSX/CSV.
"""

import os
import csv
from typing import Dict, Any, List
import pptx
from pptx.util import Inches, Pt
import openpyxl

from processors.base import BaseProcessor
from models.document_tree import DocumentTree, DocumentNode, BlockType
from models.translation_job import TranslationConfig


class PptxProcessor(BaseProcessor):
    """
    Handles PowerPoint presentations, preserving slide shapes, layouts, and formatting.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        prs = pptx.Presentation(file_path)
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="pptx",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path, "slide_count": len(prs.slides)}
        )
        
        sequence_counter = 0
        for slide_idx, slide in enumerate(prs.slides):
            # Page / slide break
            tree.nodes.append(DocumentNode(
                id=f"pptx_slide_{slide_idx}",
                sequence_index=sequence_counter,
                block_type=BlockType.PAGE_BREAK,
                source_text=f"--- Slide {slide_idx + 1} ---",
                is_translatable=False,
                chapter_index=slide_idx,
                chapter_title=f"Slide {slide_idx + 1}"
            ))
            sequence_counter += 1
            
            for shape_idx, shape in enumerate(slide.shapes):
                if shape.has_text_frame:
                    for p_idx, paragraph in enumerate(shape.text_frame.paragraphs):
                        text = paragraph.text.strip()
                        if text:
                            # Heading if title shape or level 0 in title
                            is_title = (shape == slide.shapes.title) or (p_idx == 0 and len(text) < 60)
                            b_type = BlockType.HEADING if is_title else BlockType.PARAGRAPH
                            
                            tree.nodes.append(DocumentNode(
                                id=f"pptx_s{slide_idx}_sh{shape_idx}_p{p_idx}",
                                sequence_index=sequence_counter,
                                block_type=b_type,
                                source_text=text,
                                chapter_index=slide_idx,
                                chapter_title=f"Slide {slide_idx + 1}",
                                attributes={
                                    "slide_idx": slide_idx,
                                    "shape_idx": shape_idx,
                                    "p_idx": p_idx
                                }
                            ))
                            sequence_counter += 1
                            
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        source_path = tree.metadata.get("source_file_path")
        prs = pptx.Presentation(source_path)
        
        replacements = {}
        for node in tree.nodes:
            if node.is_translatable and node.translated_text and "slide_idx" in node.attributes:
                key = (node.attributes["slide_idx"], node.attributes["shape_idx"], node.attributes["p_idx"])
                replacements[key] = node
        
        for slide_idx, slide in enumerate(prs.slides):
            for shape_idx, shape in enumerate(slide.shapes):
                if shape.has_text_frame:
                    for p_idx, paragraph in enumerate(shape.text_frame.paragraphs):
                        key = (slide_idx, shape_idx, p_idx)
                        if key in replacements:
                            node = replacements[key]
                            if config.bilingual_mode:
                                paragraph.text = f"{paragraph.text}\n({node.translated_text})"
                            else:
                                paragraph.text = node.translated_text
                                
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        prs.save(output_path)
        return output_path


class XlsxProcessor(BaseProcessor):
    """
    Handles Excel worksheets, preserving formulas, numbers, dates, and cell styles.
    Only translates human text labels.
    """
    
    def extract_structure(self, file_path: str, config: TranslationConfig) -> DocumentTree:
        wb = openpyxl.load_workbook(file_path, data_only=False)
        tree = DocumentTree(
            title=os.path.basename(file_path),
            source_format="xlsx",
            source_language=config.source_language,
            target_language=config.target_language,
            metadata={"source_file_path": file_path, "sheet_names": wb.sheetnames}
        )
        
        sequence_counter = 0
        for sheet_idx, sheet_name in enumerate(wb.sheetnames):
            ws = wb[sheet_name]
            
            tree.nodes.append(DocumentNode(
                id=f"xlsx_sheet_{sheet_idx}",
                sequence_index=sequence_counter,
                block_type=BlockType.CHAPTER_BREAK,
                source_text=f"Sheet: {sheet_name}",
                is_translatable=False,
                chapter_index=sheet_idx,
                chapter_title=sheet_name
            ))
            sequence_counter += 1
            
            for row in ws.iter_rows():
                for cell in row:
                    val = cell.value
                    if val is None:
                        continue
                    
                    # DO NOT translate formulas or non-string values!
                    val_str = str(val).strip()
                    if isinstance(val, (int, float, bool)):
                        continue
                    if val_str.startswith("="):
                        continue
                    if not val_str:
                        continue
                    
                    # Check if purely numbers or symbols
                    if val_str.replace(".", "").replace("-", "").isdigit():
                        continue
                    
                    tree.nodes.append(DocumentNode(
                        id=f"xlsx_s{sheet_idx}_{cell.coordinate}",
                        sequence_index=sequence_counter,
                        block_type=BlockType.TABLE_CELL,
                        source_text=val_str,
                        chapter_index=sheet_idx,
                        chapter_title=sheet_name,
                        row_idx=cell.row,
                        col_idx=cell.column,
                        is_header_cell=(cell.row == 1),
                        attributes={
                            "sheet_name": sheet_name,
                            "coordinate": cell.coordinate
                        }
                    ))
                    sequence_counter += 1
                    
        return tree

    def reconstruct(self, tree: DocumentTree, output_path: str, config: TranslationConfig) -> str:
        source_path = tree.metadata.get("source_file_path")
        wb = openpyxl.load_workbook(source_path)
        
        replacements = {}
        for node in tree.nodes:
            if node.is_translatable and node.translated_text and "sheet_name" in node.attributes:
                key = (node.attributes["sheet_name"], node.attributes["coordinate"])
                replacements[key] = node
        
        for (sheet_name, coord), node in replacements.items():
            if sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                if config.bilingual_mode:
                    ws[coord].value = f"{node.source_text} / {node.translated_text}"
                else:
                    ws[coord].value = node.translated_text
                    
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        wb.save(output_path)
        return output_path

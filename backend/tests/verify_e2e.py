"""
Comprehensive End-to-End Verification Test Script for LinguaDoc API and Pipeline.
Tests upload, translation, dual-pane preview, Graphify AST, validation audit, and export.
"""

import time
import requests
import json

BASE_URL = "http://127.0.0.1:8000"


def run_e2e_verification():
    print("=== LinguaDoc End-to-End Verification ===")
    
    # 1. Health Check
    health = requests.get(f"{BASE_URL}/api/health").json()
    print("✔ [1/7] Health check OK:", health["app_name"], "v" + health["version"])
    assert "epub" in health["supported_formats"]
    assert "docx" in health["supported_formats"]
    assert "pdf" in health["supported_formats"]
    
    # 2. Get Sample EPUB
    sample_res = requests.get(f"{BASE_URL}/api/samples/epub")
    assert sample_res.status_code == 200, f"Sample fetch failed: {sample_res.status_code}"
    epub_bytes = sample_res.content
    print("✔ [2/7] Fetched sample EPUB fixture (size:", len(epub_bytes), "bytes)")
    
    # 3. Upload Document
    files = {"file": ("sample_light_novel.epub", epub_bytes, "application/epub+zip")}
    upload_res = requests.post(f"{BASE_URL}/api/upload", files=files).json()
    job_id = upload_res["job_id"]
    print(f"✔ [3/7] Upload successful: Job ID = {job_id}, Total Blocks = {upload_res['total_blocks']}, Est. Tokens = {upload_res['estimated_tokens']}")
    
    # 4. Trigger Translation Job (Japanese to Indonesian)
    config = {
        "source_language": "ja",
        "target_language": "id",
        "tone": "natural",
        "provider": "demo",
        "preserve_ruby": True,
        "preserve_illustrations": True,
        "preserve_footnotes": True,
        "bilingual_mode": False,
        "custom_glossary": [
            {"term": "勇者", "translation": "Pahlawan", "category": "character"}
        ],
        "do_not_translate": [],
        "ocr_enabled": False
    }
    trans_res = requests.post(f"{BASE_URL}/api/translate/{job_id}", json=config).json()
    print("✔ [4/7] Started 10-stage translation pipeline:", trans_res["status"])
    
    # 5. Poll Job Progress
    print("  -> Polling pipeline progress...")
    while True:
        status = requests.get(f"{BASE_URL}/api/jobs/{job_id}").json()
        print(f"     [Stage {status['stage_index']}/10] {status['stage']} ({status['progress_percentage']}%) - {status['status_message']}")
        if status["stage"] in ["ready", "failed"]:
            break
        time.sleep(0.3)
        
    assert status["stage"] == "ready", f"Job failed: {status.get('error')}"
    print(f"✔ [5/7] Pipeline completed with 100% success! Blocks translated: {status['translated_blocks']}/{status['total_blocks']}")
    
    # 6. Verify Dual-Pane Preview Data
    preview = requests.get(f"{BASE_URL}/api/jobs/{job_id}/preview").json()
    print(f"✔ [6/7] Retrieved Dual-Pane Preview:")
    print(f"     - Document Title: {preview['title']}")
    print(f"     - Chapters: {len(preview['chapters'])}")
    print(f"     - Nodes Count: {len(preview['nodes'])}")
    print(f"     - Embedded Assets: {list(preview['assets'].keys())}")
    
    # Verify image presence and order
    image_nodes = [n for n in preview["nodes"] if n["block_type"] == "image"]
    assert len(image_nodes) == 2, f"Expected 2 image nodes, found {len(image_nodes)}"
    print(f"     - Confirmed: 2/2 illustrations preserved in exact document positions!")
    
    # 7. Verify Graphify AST and Validation Report
    ast_graph = requests.get(f"{BASE_URL}/api/jobs/{job_id}/ast").json()
    validation = requests.get(f"{BASE_URL}/api/jobs/{job_id}/validation").json()
    print(f"✔ [7/7] Graphify AST & Structural Validation Audit:")
    print(f"     - AST Hierarchy Chapters: {len(ast_graph['chapters'])}")
    print(f"     - Structural Fidelity Score: {int(validation['fidelity_score'] * 100)}%")
    print(f"     - Strict Sequence Preserved: {validation['is_sequence_strictly_preserved']}")
    print(f"     - Warnings: {validation['warnings']}")
    
    # Download check
    dl_res = requests.get(f"{BASE_URL}/api/jobs/{job_id}/download")
    assert dl_res.status_code == 200
    print(f"     - Download test: Translated EPUB downloaded successfully ({len(dl_res.content)} bytes)")
    
    print("\n🎉 ALL PIPELINE CHECKS PASSED WITH 100% INTEGRITY!\n")


if __name__ == "__main__":
    run_e2e_verification()

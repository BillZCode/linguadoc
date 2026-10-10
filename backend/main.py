"""
FastAPI Server for LinguaDoc — Universal Document Translator.
"""

import os
import shutil
import uuid
import threading
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.translation_job import (
    TranslationJob, TranslationConfig, PipelineStage, 
    TranslationProvider, ToneStyle, GlossaryEntry
)
from models.document_tree import DocumentTree
from processors.factory import ProcessorFactory
from pipeline.pipeline import TranslationPipeline
from pipeline.segmenter import DocumentSegmenter

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "storage", "uploads")
OUTPUTS_DIR = os.path.join(BASE_DIR, "storage", "outputs")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# In-memory job repository
JOBS_STORE: Dict[str, TranslationJob] = {}

app = FastAPI(
    title="LinguaDoc API",
    description="Universal Structure-Preserving Document Translation Engine",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = TranslationPipeline(output_dir=OUTPUTS_DIR)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app_name": "LinguaDoc",
        "version": "1.0.0",
        "supported_formats": ProcessorFactory.get_supported_formats(),
        "providers": [p.value for p in TranslationProvider],
        "tones": [t.value for t in ToneStyle]
    }


@app.get("/api/samples/{sample_type}")
def get_sample_fixture(sample_type: str):
    fixtures_dir = os.path.join(BASE_DIR, "tests", "fixtures")
    mapping = {
        "epub": ("sample_light_novel.epub", "application/epub+zip"),
        "docx": ("sample_spec.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        "md": ("sample_readme.md", "text/markdown"),
        "srt": ("sample_subs.srt", "text/plain"),
    }
    if sample_type not in mapping:
        raise HTTPException(status_code=404, detail="Sample not found.")
        
    filename, mime = mapping[sample_type]
    file_path = os.path.join(fixtures_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fixture file not found.")
        
    return FileResponse(file_path, filename=filename, media_type=mime)


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts document file, validates size & security, and creates a translation job.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
        
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
    safe_filename = f"{job_id}_{os.path.basename(file.filename)}"
    dest_path = os.path.join(UPLOADS_DIR, safe_filename)
    
    # Save file to disk
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(dest_path)
    
    # Security validation
    is_valid, error_msg = ProcessorFactory.validate_file_security(dest_path)
    if not is_valid:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=400, detail=error_msg)
        
    # Detect format and run initial AST extraction
    detected_format = ProcessorFactory.detect_format(dest_path)
    processor = ProcessorFactory.get_processor(detected_format)
    
    default_config = TranslationConfig()
    try:
        preview_tree: DocumentTree = processor.extract_structure(dest_path, default_config)
        stats = preview_tree.calculate_stats()
        metrics = DocumentSegmenter.estimate_metrics(preview_tree.nodes)
    except Exception as e:
        preview_tree = None
        stats = {"total_blocks": 0, "translatable_blocks": 0, "total_characters": 0}
        metrics = {"estimated_tokens": 0, "estimated_cost_usd": 0.0}
    
    job = TranslationJob(
        job_id=job_id,
        original_filename=file.filename,
        file_format=detected_format,
        file_size_bytes=file_size,
        source_file_path=dest_path,
        config=default_config,
        stage=PipelineStage.IDLE,
        total_blocks=stats.get("total_blocks", 0),
        translatable_blocks=stats.get("translatable_blocks", 0),
        character_count=stats.get("total_characters", 0),
        estimated_tokens=metrics.get("estimated_tokens", 0),
        estimated_cost_usd=metrics.get("estimated_cost_usd", 0.0),
        document_tree=preview_tree.model_dump() if preview_tree else None
    )
    
    JOBS_STORE[job_id] = job
    
    return {
        "job_id": job.job_id,
        "filename": job.original_filename,
        "format": job.file_format,
        "size_bytes": job.file_size_bytes,
        "total_blocks": job.total_blocks,
        "translatable_blocks": job.translatable_blocks,
        "character_count": job.character_count,
        "estimated_tokens": job.estimated_tokens,
        "estimated_cost_usd": job.estimated_cost_usd,
        "chapter_count": len(preview_tree.chapters) if preview_tree else 1
    }


def _execute_translation_task(job_id: str):
    """Worker function executed in background thread."""
    job = JOBS_STORE.get(job_id)
    if not job:
        return
    try:
        pipeline.run_pipeline(job)
    except Exception as e:
        job.stage = PipelineStage.FAILED
        job.error = str(e)


@app.post("/api/translate/{job_id}")
async def start_translation(
    job_id: str, 
    config: TranslationConfig,
    background_tasks: BackgroundTasks
):
    """
    Submits translation configuration and triggers async execution pipeline.
    """
    job = JOBS_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job.config = config
    job.stage = PipelineStage.VALIDATING_FILE
    job.status_message = "Translation job started"
    
    # Launch in background thread
    thread = threading.Thread(target=_execute_translation_task, args=(job_id,))
    thread.daemon = True
    thread.start()
    
    return {
        "job_id": job_id,
        "status": "started",
        "provider": config.provider.value,
        "source_language": config.source_language,
        "target_language": config.target_language
    }


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    job = JOBS_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    return {
        "job_id": job.job_id,
        "filename": job.original_filename,
        "format": job.file_format,
        "stage": job.stage.value,
        "stage_index": job.stage_index,
        "progress_percentage": job.progress_percentage,
        "status_message": job.status_message,
        "total_blocks": job.total_blocks,
        "translatable_blocks": job.translatable_blocks,
        "translated_blocks": job.translated_blocks,
        "character_count": job.character_count,
        "estimated_tokens": job.estimated_tokens,
        "estimated_cost_usd": job.estimated_cost_usd,
        "warnings": job.warnings,
        "error": job.error,
        "is_demo": job.is_demo,
        "has_output": bool(job.output_file_path and os.path.exists(job.output_file_path))
    }


@app.get("/api/jobs/{job_id}/preview")
def get_job_preview(job_id: str):
    """
    Returns side-by-side nodes for dual pane reader.
    """
    job = JOBS_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not job.document_tree:
        raise HTTPException(status_code=400, detail="Document tree not ready.")
        
    tree_data = job.document_tree
    nodes = tree_data.get("nodes", [])
    assets = tree_data.get("assets", {})
    chapters = tree_data.get("chapters", [])
    
    return {
        "job_id": job_id,
        "title": tree_data.get("title", job.original_filename),
        "source_format": tree_data.get("source_format", job.file_format),
        "chapters": chapters,
        "nodes": nodes,
        "assets": assets,
        "validation": job.validation_report
    }


@app.get("/api/jobs/{job_id}/ast")
def get_job_ast_graph(job_id: str):
    """
    Returns structural AST graph data for the 'Graphify' hierarchical document inspector.
    """
    job = JOBS_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not job.document_tree:
        raise HTTPException(status_code=400, detail="Document tree not ready.")
        
    tree_data = job.document_tree
    nodes = tree_data.get("nodes", [])
    chapters = tree_data.get("chapters", [])
    
    # Structure nodes by chapter for hierarchical tree view
    chapter_map: Dict[int, Dict[str, Any]] = {}
    for c_idx, ch in enumerate(chapters):
        chapter_map[c_idx] = {
            "chapter_index": c_idx,
            "title": ch.get("title", f"Chapter {c_idx + 1}"),
            "nodes": []
        }
    if not chapter_map:
        chapter_map[0] = {"chapter_index": 0, "title": "Main Document", "nodes": []}
        
    for n in nodes:
        c_idx = n.get("chapter_index", 0)
        if c_idx not in chapter_map:
            chapter_map[c_idx] = {"chapter_index": c_idx, "title": f"Section {c_idx + 1}", "nodes": []}
        chapter_map[c_idx]["nodes"].append({
            "id": n.get("id"),
            "sequence_index": n.get("sequence_index"),
            "block_type": n.get("block_type"),
            "preview_source": (n.get("source_text") or "")[:80],
            "preview_target": (n.get("translated_text") or "")[:80],
            "status": n.get("status"),
            "is_translatable": n.get("is_translatable"),
            "asset_id": n.get("asset_id")
        })
        
    return {
        "doc_id": tree_data.get("doc_id"),
        "title": tree_data.get("title"),
        "total_nodes": len(nodes),
        "chapters": list(chapter_map.values()),
        "validation_fidelity": job.validation_report.get("fidelity_score", 1.0) if job.validation_report else 1.0
    }


@app.get("/api/jobs/{job_id}/download")
def download_translated_document(job_id: str):
    job = JOBS_STORE.get(job_id)
    if not job or not job.output_file_path or not os.path.exists(job.output_file_path):
        raise HTTPException(status_code=404, detail="Translated output file not found or not ready.")
        
    out_filename = os.path.basename(job.output_file_path).split("_", 1)[-1]
    return FileResponse(
        path=job.output_file_path,
        filename=out_filename,
        media_type="application/octet-stream"
    )


@app.get("/api/jobs/{job_id}/validation")
def get_validation_report(job_id: str):
    job = JOBS_STORE.get(job_id)
    if not job or not job.validation_report:
        raise HTTPException(status_code=404, detail="Validation report not ready.")
    return job.validation_report


@app.get("/api/jobs")
def list_jobs():
    return [
        {
            "job_id": j.job_id,
            "filename": j.original_filename,
            "format": j.file_format,
            "stage": j.stage.value,
            "progress_percentage": j.progress_percentage,
            "total_blocks": j.total_blocks,
            "translated_blocks": j.translated_blocks,
            "created_at": j.created_at,
            "is_ready": bool(j.stage == PipelineStage.READY)
        }
        for j in sorted(JOBS_STORE.values(), key=lambda x: x.created_at, reverse=True)
    ]


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    job = JOBS_STORE.pop(job_id, None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    # Clean up files
    if job.source_file_path and os.path.exists(job.source_file_path):
        try:
            os.remove(job.source_file_path)
        except Exception:
            pass
    if job.output_file_path and os.path.exists(job.output_file_path):
        try:
            os.remove(job.output_file_path)
        except Exception:
            pass
            
    return {"status": "deleted", "job_id": job_id}


class TestProviderRequest(BaseModel):
    provider: TranslationProvider
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    model_name: Optional[str] = None


@app.post("/api/test-provider")
def test_provider_connection(req: TestProviderRequest):
    """
    Tests credentials and connectivity to the selected AI provider.
    """
    if req.provider == TranslationProvider.DEMO:
        return {"success": True, "message": "Demo mode is active (no API key required)."}
        
    if req.provider == TranslationProvider.GEMINI:
        key = req.api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            for env_path in ["/home/sabbil/Dokumen/TKJ/personal-it-hub/.env", ".env"]:
                if os.path.exists(env_path):
                    try:
                        with open(env_path, "r", encoding="utf-8") as f:
                            for line in f:
                                if line.startswith("GEMINI_API_KEY="):
                                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                                    break
                    except Exception:
                        pass
                if key:
                    break

        if not key:
            return {"success": False, "message": "GEMINI_API_KEY is not provided."}
        try:
            from google import genai
            client = genai.Client(api_key=key)
            target_model = req.model_name or "gemini-flash-latest"
            if target_model in ["antigravity-preview-latest", "antigravity-agent"]:
                target_model = "gemini-3.1-pro-preview"
            resp = client.models.generate_content(
                model=target_model,
                contents="Ping. Return 'OK'."
            )
            return {"success": True, "message": f"Gemini ({target_model}) connection successful: {resp.text.strip()[:20]}"}
        except Exception as e:
            return {"success": False, "message": f"Gemini connection error: {str(e)}"}
            
    if req.provider in [TranslationProvider.OPENAI, TranslationProvider.OLLAMA]:
        import httpx
        base_url = req.api_base_url or ("http://localhost:11434/v1" if req.provider == TranslationProvider.OLLAMA else "https://api.openai.com/v1")
        key = req.api_key or os.environ.get("OPENAI_API_KEY", "")
        headers = {"Authorization": f"Bearer {key}"} if key else {}
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{base_url.rstrip('/')}/models", headers=headers)
                if resp.status_code in [200, 401]:
                    return {"success": resp.status_code == 200, "message": f"Provider responded with status {resp.status_code}"}
                return {"success": False, "message": f"Provider returned {resp.status_code}"}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}
            
    return {"success": True, "message": f"Provider {req.provider.value} registered."}


# Mount built frontend SPA static distribution for standalone desktop / single-port deployment
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(FRONTEND_DIST):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static-frontend")

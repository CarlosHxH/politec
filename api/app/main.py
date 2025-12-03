import os
import shutil
import json
import time
import logging
import uuid
import threading
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.gemini_service import analyze_video
from app.core.config import settings
from app.utils.video import enrich_with_best_frame_images

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Maximum file size: 2GB (Gemini API limit)
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024

# In-memory job storage (for production, use Redis or database)
jobs: Dict[str, Dict[str, Any]] = {}
jobs_lock = threading.Lock()

app = FastAPI(
    title="API de Análise Forense de Vídeo",
    description="API para processamento de vídeo e extração de evidências forenses utilizando Google Gemini.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: Optional[str] = None
    created_at: str
    updated_at: str
    filename: Optional[str] = None
    error: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("🚀 API de Análise Forense iniciada (v2.0 - Async)")
    logger.info(f"📁 Diretório temporário: {settings.TEMP_VIDEO_DIR}")
    logger.info(f"🤖 Modelo Gemini: {settings.GEMINI_MODEL_NAME}")
    logger.info(f"🔑 API Key configurada: {'Sim' if settings.GOOGLE_API_KEY else 'NÃO!'}")
    logger.info("=" * 60)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure temp directory exists
os.makedirs(settings.TEMP_VIDEO_DIR, exist_ok=True)


def safe_remove_file(path: str, retries: int = 3, delay: float = 0.5):
    """Safely remove a file with retries for Windows file locking issues."""
    for attempt in range(retries):
        try:
            if os.path.exists(path):
                os.remove(path)
                logger.debug(f"🗑️ Arquivo temporário removido: {path}")
            return
        except PermissionError:
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                logger.warning(f"⚠️ Não foi possível remover arquivo temporário: {path}")


def update_job(job_id: str, **kwargs):
    """Thread-safe job update."""
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(kwargs)
            jobs[job_id]["updated_at"] = datetime.now().isoformat()


def process_video_job(job_id: str, temp_path: str, filename: str):
    """Background task to process video analysis."""
    start_time = time.time()
    
    try:
        update_job(job_id, status="processing", progress="Enviando vídeo para análise...")
        logger.info(f"🤖 [{job_id}] Iniciando análise com Gemini...")
        
        # Analyze video with Gemini
        result_json_str = analyze_video(temp_path)
        gemini_time = time.time() - start_time
        logger.info(f"✅ [{job_id}] Análise Gemini concluída em {gemini_time:.2f}s")
        
        update_job(job_id, progress="Extraindo frames do vídeo...")
        
        # Parse JSON response
        try:
            result_data = json.loads(result_json_str)
            num_results = len(result_data) if isinstance(result_data, list) else 1
            logger.info(f"📊 [{job_id}] Resultados encontrados: {num_results}")
            
            # Enrich with frame images
            logger.info(f"🖼️ [{job_id}] Extraindo frames do vídeo...")
            enriched = enrich_with_best_frame_images(result_data, temp_path)
            
            total_time = time.time() - start_time
            logger.info(f"🎉 [{job_id}] Processamento concluído em {total_time:.2f}s")
            
            update_job(
                job_id,
                status="completed",
                progress="Concluído",
                result=enriched,
                processing_time=f"{total_time:.2f}s"
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ [{job_id}] Erro ao parsear JSON: {e}")
            update_job(
                job_id,
                status="completed",
                result={"raw_output": result_json_str, "error": "Failed to parse JSON response"}
            )
            
    except Exception as e:
        logger.error(f"❌ [{job_id}] Erro durante processamento: {type(e).__name__}: {str(e)}")
        update_job(job_id, status="failed", error=str(e))
    finally:
        # Cleanup
        safe_remove_file(temp_path)


@app.post("/analyze", response_model=JobResponse)
async def analyze_endpoint(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Inicia análise assíncrona de vídeo forense.
    Retorna um job_id para consultar o status/resultado posteriormente.
    """
    job_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    
    logger.info("-" * 60)
    logger.info(f"📥 [{job_id}] Nova requisição de análise")
    logger.info(f"📄 [{job_id}] Arquivo: {file.filename}")
    logger.info(f"📋 [{job_id}] Content-Type: {file.content_type}")
    
    # Create unique filename to avoid conflicts
    safe_filename = f"{job_id}_{file.filename}"
    temp_path = os.path.join(settings.TEMP_VIDEO_DIR, safe_filename)
    
    try:
        # Save uploaded file locally
        logger.info(f"💾 [{job_id}] Salvando arquivo temporário...")
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Validate file size
        file_size = os.path.getsize(temp_path)
        file_size_mb = file_size / (1024 * 1024)
        logger.info(f"📊 [{job_id}] Tamanho do arquivo: {file_size_mb:.2f} MB")
        
        if file_size > MAX_FILE_SIZE_BYTES:
            logger.error(f"❌ [{job_id}] Arquivo muito grande: {file_size_mb:.2f} MB")
            safe_remove_file(temp_path)
            raise HTTPException(
                status_code=413,
                detail=f"Arquivo muito grande ({file_size / (1024**3):.2f} GB). O limite máximo é 2 GB."
            )
        
        # Create job entry
        with jobs_lock:
            jobs[job_id] = {
                "job_id": job_id,
                "status": "pending",
                "progress": "Arquivo recebido, aguardando processamento...",
                "filename": file.filename,
                "file_size_mb": f"{file_size_mb:.2f}",
                "created_at": now,
                "updated_at": now,
                "result": None,
                "error": None
            }
        
        # Start background processing
        background_tasks.add_task(process_video_job, job_id, temp_path, file.filename)
        
        logger.info(f"✅ [{job_id}] Job criado, processamento iniciado em background")
        
        return JobResponse(
            job_id=job_id,
            status="pending",
            message=f"Análise iniciada. Consulte o status em /jobs/{job_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [{job_id}] Erro ao criar job: {type(e).__name__}: {str(e)}")
        safe_remove_file(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Retorna o status atual do job."""
    with jobs_lock:
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail=f"Job {job_id} não encontrado")
        
        job = jobs[job_id]
        return JobStatusResponse(
            job_id=job["job_id"],
            status=job["status"],
            progress=job.get("progress"),
            created_at=job["created_at"],
            updated_at=job["updated_at"],
            filename=job.get("filename"),
            error=job.get("error")
        )


@app.get("/jobs/{job_id}")
async def get_job_result(job_id: str):
    """Retorna o resultado completo do job (quando concluído)."""
    with jobs_lock:
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail=f"Job {job_id} não encontrado")
        
        job = jobs[job_id].copy()
    
    if job["status"] == "pending":
        return {
            "job_id": job_id,
            "status": "pending",
            "message": "Análise ainda não iniciada",
            "progress": job.get("progress")
        }
    
    if job["status"] == "processing":
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Análise em andamento",
            "progress": job.get("progress")
        }
    
    if job["status"] == "failed":
        return {
            "job_id": job_id,
            "status": "failed",
            "error": job.get("error")
        }
    
    # Completed
    return {
        "job_id": job_id,
        "status": "completed",
        "filename": job.get("filename"),
        "processing_time": job.get("processing_time"),
        "result": job.get("result")
    }


@app.get("/jobs")
async def list_jobs():
    """Lista todos os jobs (útil para debug)."""
    with jobs_lock:
        return {
            "total": len(jobs),
            "jobs": [
                {
                    "job_id": j["job_id"],
                    "status": j["status"],
                    "filename": j.get("filename"),
                    "created_at": j["created_at"]
                }
                for j in jobs.values()
            ]
        }


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Remove um job da memória."""
    with jobs_lock:
        if job_id not in jobs:
            raise HTTPException(status_code=404, detail=f"Job {job_id} não encontrado")
        del jobs[job_id]
    return {"message": f"Job {job_id} removido"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gemini_model": settings.GEMINI_MODEL_NAME,
        "api_key_configured": bool(settings.GOOGLE_API_KEY)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)

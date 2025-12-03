import os
import shutil
import json
import time
import logging
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(
    title="API de Análise Forense de Vídeo",
    description="API para processamento de vídeo e extração de evidências forenses utilizando Google Gemini 1.5 Pro.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("🚀 API de Análise Forense iniciada")
    logger.info(f"📁 Diretório temporário: {settings.TEMP_VIDEO_DIR}")
    logger.info(f"🤖 Modelo Gemini: {settings.GEMINI_MODEL_NAME}")
    logger.info(f"🔑 API Key configurada: {'Sim' if settings.GOOGLE_API_KEY else 'NÃO!'}")
    logger.info("=" * 60)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
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


@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    """
    Endpoint to analyze a forensic video.
    Uploads the video, processes it with Gemini 1.5 Pro, and returns structured JSON.
    """
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    start_time = time.time()
    
    logger.info("-" * 60)
    logger.info(f"📥 [{request_id}] Nova requisição de análise")
    logger.info(f"📄 [{request_id}] Arquivo: {file.filename}")
    logger.info(f"📋 [{request_id}] Content-Type: {file.content_type}")
    
    temp_path = os.path.join(settings.TEMP_VIDEO_DIR, file.filename)
    
    try:
        # Save uploaded file locally
        logger.info(f"💾 [{request_id}] Salvando arquivo temporário...")
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Validate file size (Gemini API limit is 2GB)
        file_size = os.path.getsize(temp_path)
        file_size_mb = file_size / (1024 * 1024)
        logger.info(f"📊 [{request_id}] Tamanho do arquivo: {file_size_mb:.2f} MB")
        
        if file_size > MAX_FILE_SIZE_BYTES:
            logger.error(f"❌ [{request_id}] Arquivo muito grande: {file_size_mb:.2f} MB (limite: 2048 MB)")
            raise HTTPException(
                status_code=413,
                detail=f"Arquivo muito grande ({file_size / (1024**3):.2f} GB). O limite máximo é 2 GB."
            )
        
        # Analyze video
        logger.info(f"🤖 [{request_id}] Iniciando análise com Gemini...")
        gemini_start = time.time()
        result_json_str = analyze_video(temp_path)
        gemini_time = time.time() - gemini_start
        logger.info(f"✅ [{request_id}] Análise Gemini concluída em {gemini_time:.2f}s")
        
        # Parse JSON response
        try:
            result_data = json.loads(result_json_str)
            num_results = len(result_data) if isinstance(result_data, list) else 1
            logger.info(f"📊 [{request_id}] Resultados encontrados: {num_results}")
            
            logger.info(f"🖼️ [{request_id}] Extraindo frames do vídeo...")
            enriched = enrich_with_best_frame_images(result_data, temp_path)
            
            total_time = time.time() - start_time
            logger.info(f"🎉 [{request_id}] Processamento concluído com sucesso!")
            logger.info(f"⏱️ [{request_id}] Tempo total: {total_time:.2f}s")
            logger.info("-" * 60)
            
            return enriched
        except json.JSONDecodeError as e:
            logger.error(f"❌ [{request_id}] Erro ao parsear JSON: {e}")
            logger.error(f"📝 [{request_id}] Resposta raw: {result_json_str[:500]}...")
            return {"raw_output": result_json_str, "error": "Failed to parse JSON response"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [{request_id}] Erro durante processamento: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup with retry for Windows file locking
        safe_remove_file(temp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

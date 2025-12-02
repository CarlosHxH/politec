import os
import shutil
import json
import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.gemini_service import analyze_video
from app.core.config import settings
from app.utils.video import enrich_with_best_frame_images

# Maximum file size: 2GB (Gemini API limit)
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024

app = FastAPI(
    title="API de Análise Forense de Vídeo",
    description="API para processamento de vídeo e extração de evidências forenses utilizando Google Gemini 1.5 Pro.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

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
            return
        except PermissionError:
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                print(f"Warning: Could not delete temp file {path}")


@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    """
    Endpoint to analyze a forensic video.
    Uploads the video, processes it with Gemini 1.5 Pro, and returns structured JSON.
    """
    temp_path = os.path.join(settings.TEMP_VIDEO_DIR, file.filename)
    
    try:
        # Save uploaded file locally
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Validate file size (Gemini API limit is 2GB)
        file_size = os.path.getsize(temp_path)
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Arquivo muito grande ({file_size / (1024**3):.2f} GB). O limite máximo é 2 GB."
            )
        
        # Analyze video
        result_json_str = analyze_video(temp_path)
        
        # Parse JSON response
        try:
            result_data = json.loads(result_json_str)
            enriched = enrich_with_best_frame_images(result_data, temp_path)
            return enriched
        except json.JSONDecodeError:
            return {"raw_output": result_json_str, "error": "Failed to parse JSON response"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup with retry for Windows file locking
        safe_remove_file(temp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

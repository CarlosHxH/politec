import time
import logging
import google.generativeai as genai
from app.core.config import settings
from app.core.prompts import FORENSIC_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

# Configure the Gemini API
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    logger.info("🔑 Gemini API configurada com sucesso")
else:
    logger.warning("⚠️ GOOGLE_API_KEY não está configurada!")

def upload_to_gemini(path, mime_type="video/mp4"):
    """Uploads the given file to Gemini."""
    logger.info(f"📤 Enviando arquivo para Gemini: {path}")
    file = genai.upload_file(path, mime_type=mime_type)
    logger.info(f"✅ Upload concluído: {file.display_name} -> {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    logger.info("⏳ Aguardando processamento do arquivo no Gemini...")
    wait_start = time.time()
    
    for name in (file.name for file in files):
        file = genai.get_file(name)
        check_count = 0
        while file.state.name == "PROCESSING":
            check_count += 1
            if check_count % 6 == 0:  # Log a cada 30 segundos
                elapsed = time.time() - wait_start
                logger.info(f"⏳ Ainda processando... ({elapsed:.0f}s)")
            time.sleep(5)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            logger.error(f"❌ Falha no processamento do arquivo: {file.name} (estado: {file.state.name})")
            raise Exception(f"File {file.name} failed to process")
    
    wait_time = time.time() - wait_start
    logger.info(f"✅ Arquivo pronto para análise (aguardou {wait_time:.1f}s)")

def analyze_video(video_path: str):
    """
    Uploads a video to Gemini, waits for processing, and runs the forensic analysis prompt.
    Returns the JSON string response.
    """
    if not settings.GOOGLE_API_KEY:
        logger.error("❌ GOOGLE_API_KEY não está configurada!")
        raise ValueError("GOOGLE_API_KEY is not set.")

    logger.info(f"🎬 Iniciando análise do vídeo: {video_path}")
    
    # 1. Upload
    video_file = upload_to_gemini(video_path)
    
    # 2. Wait for processing
    wait_for_files_active([video_file])

    # 3. Generate content
    logger.info(f"🤖 Executando análise com modelo: {settings.GEMINI_MODEL_NAME}")
    model = genai.GenerativeModel(model_name=settings.GEMINI_MODEL_NAME)
    
    generation_start = time.time()
    response = model.generate_content(
        [video_file, FORENSIC_ANALYSIS_PROMPT],
        generation_config={"response_mime_type": "application/json"}
    )
    generation_time = time.time() - generation_start
    
    logger.info(f"✅ Análise concluída em {generation_time:.1f}s")
    logger.info(f"📊 Tamanho da resposta: {len(response.text)} caracteres")
    
    # Cleanup: Delete file from Gemini storage
    try:
        genai.delete_file(video_file.name)
        logger.info(f"🗑️ Arquivo removido do Gemini: {video_file.name}")
    except Exception as e:
        logger.warning(f"⚠️ Não foi possível remover arquivo do Gemini: {e}")
    
    return response.text


import time
import google.generativeai as genai
from app.core.config import settings
from app.core.prompts import FORENSIC_ANALYSIS_PROMPT

# Configure the Gemini API
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

def upload_to_gemini(path, mime_type="video/mp4"):
    """Uploads the given file to Gemini."""
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for name in (file.name for file in files):
        file = genai.get_file(name)
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(5)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
    print("...all files ready")

def analyze_video(video_path: str):
    """
    Uploads a video to Gemini, waits for processing, and runs the forensic analysis prompt.
    Returns the JSON string response.
    """
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set.")

    # 1. Upload
    video_file = upload_to_gemini(video_path)
    
    # 2. Wait for processing
    wait_for_files_active([video_file])

    # 3. Generate content
    model = genai.GenerativeModel(model_name=settings.GEMINI_MODEL_NAME)
    
    # Using generation_config to enforce JSON output if supported by the SDK version, 
    # otherwise the prompt instructions usually suffice, but explicit config is better.
    response = model.generate_content(
        [video_file, FORENSIC_ANALYSIS_PROMPT],
        generation_config={"response_mime_type": "application/json"}
    )
    
    # Optional: Delete file from Gemini storage to avoid clutter
    # genai.delete_file(video_file.name)
    
    return response.text


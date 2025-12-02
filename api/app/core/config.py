import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    # Defaulting to gemini-1.5-pro as "gemini-2.5-pro" is not a currently available model version.
    # Valid options include: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash-exp
    GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro")
    TEMP_VIDEO_DIR = "temp_videos"

settings = Settings()


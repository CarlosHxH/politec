# Forensic Video Analysis Project

This project contains a Python FastAPI backend and a React + Vite frontend.

## 1. Backend Setup

1.  **Navigate to root:** `cd politec`
2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure Environment:**
    Ensure `.env` has your `GOOGLE_API_KEY`.
4.  **Start Backend:**
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    API Docs: `http://127.0.0.1:8000/docs`

## 2. Frontend Setup

1.  **Navigate to frontend:** `cd frontend`
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start Frontend:**
    ```bash
    npm run dev
    ```
    Access: `http://localhost:5173`

## Usage

1. Open the frontend URL.
2. Upload a forensic video file.
3. Click "Analisar".
4. View the hierarchical breakdown of test results and evidence.

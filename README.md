# Forensic Video Analysis Platform

Plataforma de análise forense de vídeo usando IA (Google Gemini) para extração de evidências e auditoria de procedimentos laboratoriais.

## Arquitetura

- **Backend (API)**: FastAPI + Python + Google Gemini 1.5 Pro
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Shadcn UI

## Requisitos

- Docker e Docker Compose
- Google API Key (Gemini)

## Configuração

1. Crie um arquivo `.env` na raiz do projeto:

```env
GOOGLE_API_KEY=sua_chave_google_aqui
GEMINI_MODEL_NAME=gemini-1.5-pro
```

## Execução com Docker

### Build e Start

```bash
docker-compose up --build
```

### Apenas Start (após build)

```bash
docker-compose up
```

### Parar

```bash
docker-compose down
```

## Acesso

- **Frontend**: http://localhost
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API ReDoc**: http://localhost:8000/redoc

## Desenvolvimento Local (sem Docker)

### Backend

```bash
cd api
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Estrutura do Projeto

```
politec/
├── api/                    # Backend Python/FastAPI
│   ├── app/
│   │   ├── core/           # Configurações e prompts
│   │   ├── services/       # Serviço Gemini
│   │   └── utils/          # Utilitários (extração de frames)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # Frontend React/Vite
│   ├── src/
│   │   ├── components/ui/  # Componentes Shadcn
│   │   └── App.tsx
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Limites

- Tamanho máximo de vídeo: 2GB (limite da API Gemini)

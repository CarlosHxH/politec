# Configuração para Deploy no Coolify

## Arquitetura

- **API (Backend)**: Porta interna 5000
- **Frontend**: Porta interna 5757 (Nginx com proxy para API)

## Configuração no Coolify

### 1. Configuração da Aplicação

**Build Pack**: Docker Compose
**Docker Compose Location**: `/docker-compose.yml`

### 2. Configuração dos Serviços

#### Serviço: frontend
- **Domain**: `https://laudoai.facilmova.online` (SEM PORTA)
- **Port**: 5757
- **Expose**: Sim

#### Serviço: api  
- **Domain**: Deixe vazio ou remova (API não precisa de domínio público)
- **Port**: 5000
- **Expose**: Não (apenas interno)

### 3. Variáveis de Ambiente (Environment Variables)

No Coolify, adicione:

```
GOOGLE_API_KEY=sua_chave_aqui
GEMINI_MODEL_NAME=gemini-1.5-pro
```

### 4. Fluxo de Requisições

```
Cliente HTTPS
    ↓
laudoai.facilmova.online (Traefik/Coolify)
    ↓
frontend:5757 (Nginx)
    ↓ (/api/*)
api:5000 (FastAPI)
```

## Importante

- O frontend faz proxy de `/api/*` para `http://api:5000/*` internamente
- Não configure domínio separado para a API
- O Traefik do Coolify só precisa rotear para o frontend:5757
- A comunicação frontend↔API é interna via Docker network

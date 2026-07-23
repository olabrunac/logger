# Logger

Site pessoal para registrar e acompanhar filmes, séries, jogos e livros, inspirado em plataformas como YourGamerProfile, Letterboxd e TV Time.

## 🚀 Detalhes Técnicos
- **Arquitetura**: Monorepo (Backend: FastAPI/SQLite, Frontend: React/Vite/TS).
- **Enriquecimento**: Auto-popula metadados via TMDb, IGDB, Steam e Google Books.
- **Design**: Inspirado no padrão MDF/YGP, com temas baseados em variáveis CSS e cores de destaque customizáveis.
- **Desenvolvimento**:
  - Ambiente Windows PowerShell (5.1).
  - **NUNCA** use `&&` em comandos de shell; use `; if ($?) { cmd2 }`.
  - Consulte `AGENTS.md` para diretrizes específicas do agente.

## 🛠️ Configuração do Ambiente
1. **Segredos**: Crie `backend/.env` com as chaves das APIs (TMDB, IGDB, Steam, Google Books). **Não faça commit deste arquivo.**
2. **Backend**:
   - `python -m venv venv`
   - `.\venv\Scripts\pip.exe install -r requirements.txt`
   - `.\venv\Scripts\uvicorn.exe app.main:app --reload`
3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## ⚙️ Manutenção
- **Lint**: `npm run lint` (frontend)
- **Build/Typecheck**: `npm run build` (frontend)
- **Sintaxe Backend**: `.\venv\Scripts\python.exe -m py_compile app/main.py`

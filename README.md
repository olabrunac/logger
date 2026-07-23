# Logger

A personal media logger site to track movies, series, games, and books, inspired by platforms like YourGamerProfile, Letterboxd, and TV Time.

## 🚀 Key Technical Details
- **Architecture**: Monorepo (Backend: FastAPI/SQLite, Frontend: React/Vite/TS).
- **Enrichment**: Auto-populates metadata from TMDb, IGDB, Steam, and Google Books.
- **Design**: Inspired by MDF/YGP with CSS-variable based theming and customizable accent colors.
- **Development**:
  - Windows PowerShell (5.1) environment.
  - **Do NOT** use `&&` in shell commands; use `; if ($?) { cmd2 }`.
  - Check `AGENTS.md` for specific agent guidelines.

## 🛠️ Environment Setup
1. **Secrets**: Create `backend/.env` with API keys (TMDB, IGDB, Steam, Google Books). **Do not commit this file.**
2. **Backend**:
   - `python -m venv venv`
   - `.\venv\Scripts\pip.exe install -r requirements.txt`
   - `.\venv\Scripts\uvicorn.exe app.main:app --reload`
3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## ⚙️ Maintenance
- **Lint**: `npm run lint` (frontend)
- **Build/Typecheck**: `npm run build` (frontend)
- **Backend Syntax**: `.\venv\Scripts\python.exe -m py_compile app/main.py`

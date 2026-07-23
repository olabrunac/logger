# Logger Agent Guidelines

## 🚀 Operational Workflow
- **PowerShell (5.1) Caveat**: Do **NOT** use `&&`. Use `; if ($?) { cmd2 }`.
- **Environment**: Backend secrets (`.env` in `backend/`) are mandatory for API enrichment (TMDB, IGDB, Steam, Google Books). Never commit these.
- **Workflow**: Create a GitHub Issue, then a branch, and finally a PR for each distinct feature or fix.

## 🛠️ Build & Verification
- **Frontend (`frontend/`)**: 
  - Lint: `npm run lint`
  - Build/Typecheck: `npm run build`
  - Order: `lint` -> `build`
- **Backend (`backend/`)**: 
  - Syntax check: `.\venv\Scripts\python.exe -m py_compile app/main.py`

## 🏗️ Architecture & Style
- **Monorepo**: Backend (FastAPI) and Frontend (React/Vite).
- **Design System**: 
  - CSS vars for colors: `--mdf-bg: #0A0C10`, `--mdf-surface: #14181C`.
  - Accent Color: Injected via `user.accent_color` into `--accent` CSS variable.
- **Media Enrichment**: Media items are auto-enriched from external APIs upon creation/update.
- **TypeScript**: `verbatimModuleSyntax` and `erasableSyntaxOnly` active. Avoid `enum`; use union types + value arrays. Always use `import type`.

## ⚙️ Key Constraints
- Passwordless Auth: `username`-only.
- Statuses: 4 per media type (Enum exists, but use mapped labels).
- Favorite: Boolean toggle independent of status.
- Poster Tiles: Standardized layout with ❤️ badge and stats.

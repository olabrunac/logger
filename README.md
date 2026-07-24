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

## 📋 Status Atual

### ✅ Implementado
- **Top 5 Lists**: Backend completo (model, CRUD, API), Frontend com reordenção por setas, poster em coluna, adicionar/remover favoritos
- **Favoritos**: Toggle independente do status (coração no LogForm + badge ❤️ nos poster tiles)
- **Status por tipo de mídia**: 4 status cada (jogos/filmes/séries/livros)
- **Layout fixo**: Left sidebar 203px (não colapsa), Right sidebar 324px → 56px (colapsa), conteúdo central com margens fixas
- **Enriquecimento**: TMDb (filmes/séries), IGDB (jogos), Google Books (livros), Steam (achievements/store)
- **LogReview**: Histórico de reviews por log (snapshots de review_text, rating, platform, created_at)
- **LogDetailPage**: Conteúdo centralizado, reviews abaixo de todas as seções, estrelas ao lado da nota nas reviews, barra de progresso de temporadas sempre visível, botão marcar todos os episódios sempre visível
- **Bookmark toggle**: Botão "pretendo reassistir/rejogar" funciona como toggle (criar/remover wishlist)
- **Reviews**: ProfilePage, MediaTypeProfilePage e ReviewsPage exibem todas as snapshots de reviews do LogReview
- **Diário**: DiaryPage funcional com reviews agrupados por data
- **Wishlist**: Entradas separadas de log, auto-cleanup ao completar, deduplicação no backend

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

## 📋 Status Atual & Pendências

### ✅ Implementado
- **Top 5 Lists**: Backend completo (model, CRUD, API `/users/{id}/top-list`, `/users/{id}/favorites`), Frontend `TopListsSection` com drag-to-reorder, click-to-add favoritos, save/cancel
- **Favoritos**: Toggle independente do status (coração no LogForm + badge ❤️ nos poster tiles)
- **Status por tipo de mídia**: 4 status cada (jogos/filmes/séries/livros)
- **Layout fixo**: Left sidebar 270px (não colapsa), Right sidebar 324px → 56px (colapsa), conteúdo central com margens fixas
- **Enriquecimento**: TMDb (filmes/séries), IGDB (jogos), Google Books (livros), Steam (achievements/store)

### 🔄 Em Andamento / Pendente
1. **Top 5 Lists**: Corrigir exibição dos favoritos carregados no `TopListsSection`
2. **Mapa de Atividade (RightSidebar)**: Título duplicado "Mapa de Atividade"
3. **Atividade Recente (RightSidebar)**: Mostra 6 itens, deve mostrar 5
4. **Progresso de Temporada**: Tooltip deve abrir automaticamente no hover
5. **Botão "Todos"**: Adicionar em `ProfilePage` (já existe em `MediaTypeProfilePage`)
6. **Reviews de mídia**: Recolocar funcionalidade de reviews nas páginas de mídia
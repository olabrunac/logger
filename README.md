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
- **Status por tipo de mídia**: 8 status cada (jogos: completed, platinated, in_progress, wishlist, dropped, library, soon; filmes/séries/livros: completed, in_progress, wishlist, dropped, library, soon)
- **Layout fixo**: Left sidebar 203px (não colapsa), Right sidebar 324px → 56px (colapsa), conteúdo central com margens fixas
- **Sidebar analytics mobile**: Drawer lateral direito com ícone BarChart3 no header do MobileNav, mostra analytics (stats, gêneros, atividade, badges) em overlay滑入
- **Platinados**: Jogos com 100% de achievements são marcados `platinated` (import Steam + form manual); seção dedicada no perfil e diretórios; migração retroativa para dados existentes
- **Enriquecimento**: TMDb (filmes/séries), IGDB (jogos), Google Books (livros), Steam (achievements/store)
- **LogReview**: Histórico de reviews por log (snapshots de review_text, rating, platform, created_at)
- **LogDetailPage**: Conteúdo centralizado, reviews abaixo de todas as seções, estrelas ao lado da nota nas reviews, barra de progresso de temporadas sempre visível, botão marcar todos os episódios sempre visível
- **Bookmark toggle**: Botão "pretendo reassistir/rejogar" funciona como toggle (criar/remover wishlist)
- **Reviews**: ProfilePage, MediaTypeProfilePage e ReviewsPage exibem todas as snapshots de reviews do LogReview
- **Diário**: DiaryPage funcional com reviews agrupados por data
- **Wishlist**: Entradas separadas de log, auto-cleanup ao completar, deduplicação no backend
- **Top 5**: Capas com aspect ratio correto (inline styles)
- **Horas automáticas em filmes/séries**: Tempo manual bloqueado — filme = `runtime/60`, série = `runtime/60 × episódios assistidos`, com precisão de minutos (2 casas; ex.: 119 min = 1.98h)
- **"Limpar dados" preserva posts, respostas e follows**: O wipe (Settings → Segurança) apaga logs/reviews/episódios/conquistas/listas/curtidas/notificações/badges não especiais, mas mantém posts, respostas, seguidores, seguindo, avatar, banner, cor e badges especiais
- **Sidebar padrão + editor de layout alinhado**: Ordem Favoritos → Top 5 → Avaliações → Estatísticas → Gêneros / Categorias → Horas por Mídia → Mapa de Atividade → Logs recentes → Medalhas; Favoritos e Top 5 ocultos por padrão; Medalhas só no Geral; nomes dos blocos do editor idênticos aos títulos da sidebar
- **Lista de seguidores/seguindo clicável (#15)**: Contador abre modal com avatar, nome, username e link ao perfil
- **Hashtags coloridas (#16)**: `#tag` em posts/logs/reviews pinta com a accent color do usuário
- **Filtro de importação TV Time**: importação parcial — só séries, só filmes ou tudo antes de confirmar (chips segmentados no preview)
- **Diretório de listas de status (Onda D)**: página `/profile/:user/:status/:tipo` listando todos os itens da seção, com "Ver mais" nos headers
- **Scroll horizontal nas listas do perfil (mobile)**: faixas roláveis nos grids do perfil no mobile; desktop inalterado
- **Editor de layout alinhado (Onda E)**: defaults do editor idênticos ao render real da sidebar e das seções do perfil; preview ao vivo desktop/mobile; layout mobile estendido a tablets
- **Family Share "do nosso jeito" (import Steam)**: mescla jogos comprados + 50 recentes jogados (dedup por appid), marca `family_share`, com badge "Compartilhado" e filtro no diretório de status
- **Fix estado stale ao trocar de usuário/mídia**: `ProfilePage`, `MediaTypeProfilePage` e `MediaDetailPage` resetam o estado no início de cada fetch — reviews antigas não aparecem mais "duplicadas" em perfis de outros usuários
- **Timeline paginada por grupo no SQL**: agrupamento por (usuário + tipo + dia) com `GROUP BY` antes da paginação — usuários com muitos logs no mesmo dia não esmagam os demais da timeline
- **Horas em formato de minutos**: entrada manual só aceita `HhMM` (`20h30`) ou minutos (`180m`); exibição em `20h30m` (cards, perfil, diário, imports). Backend com precisão de round-4 — import Steam não perde mais minutos (1234 min = `20h34m`, não `20h36m`)
- **Badges de horas reajustadas**: thresholds `hours_{100..200000}` (bronze→cósmico), tiers antigos (10/25/50/250/2500h) removidos
- **Badge de platina via achievements**: conta jogos com status `platinated` **ou** com 100% dos achievements desbloqueados (mesma regra do card 100% e do import Steam)

### 🔄 Em Andamento / Pendente
- Nenhuma pendência ativa

### 📦 Arquivadas / Ideias futuras
- **Lista de jogos por achievement**: viabilidade confirmada (endpoint `IPlayerService/GetTopAchievementsForGames/v1/` em lote), implementação adiada
- **Início (HomePage)**: ajustes finais na página inicial

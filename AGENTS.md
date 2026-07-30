# Logger — Diretrizes para Agente

## 🚀 Fluxo Operacional
- **PowerShell 5.1**: **NUNCA** use `&&`. Use `; if ($?) { cmd2 }`.
- **Segredos**: `.env` em `backend/` (TMDB, Steam, Google Books). Nunca faça commit.
- **Workflow**: Issue → Branch → PR para cada funcionalidade/correção.

## 🛠️ Build & Verificação
- **Frontend**: `npm run lint` → `npm run build` (tsc + vite)
- **Backend**: `.\venv\Scripts\python.exe -m py_compile app/main.py`

## 🏗️ Arquitetura
- **Monorepo**: `backend/` (FastAPI + SQLAlchemy + SQLite) e `frontend/` (React/Vite + TypeScript).
- **Autenticação**: Email + senha (bcrypt via `bcrypt` lib). Dev bypass: username `bruna` → login com senha vazia. Admin: `admin@logger.dev` / `admin`.
- **Status**: 7 valores — `completed`, `in_progress`, `dropped`, `wishlist`, `soon`, `platinated`, `library` (def. em `models/media.py`).
- **Favorito**: Booleano independente do status.
- **Layout**:
  - Sidebar esquerda: 203px fixa, não colapsa. Sidebar direita: colapsável 324px/56px.
  - Conteúdo central: `marginLeft: 203px; marginRight: 324px` — não redimensiona.
  - Páginas de feed (Timeline, Notificações, Diário, Reviews, Calendário): `max-w-[1844px] mx-auto`.
- **Design System** (`constants/designSystem.ts`):
  - `TYPE_META`, `STATUS_COLORS`, `STATUS_ICONS`, `getStars`
  - Cores: `--mdf-bg: #0A0C10`, `--mdf-surface: #14181C`, `--mdf-green`/`--accent` via `user.accent_color`.
- **TypeScript**: `verbatimModuleSyntax` + `erasableSyntaxOnly`. Use `import type`. Evite `enum` (prefira união + arrays).
- **Timeline**: Logs agrupados por (usuário + tipo de mídia + data). Endpoint em `users.py`.
- **Timeline messages**: Mapeamento `statusLabels` por tipo de mídia em `TimelinePage.tsx` (ex: "assistiu", "jogou", "leu", "está assistindo").
- **Badges**: Evolutivas por grupo (1 badge por categoria, tiers substituem anteriores). Descrição no tooltip mostra progresso p/ próximo nível. Ordenadas por raridade decrescente (cósmico primeiro).
- **Importadores**: Letterboxd (ZIP/CSV), Steam (API), Trakt (JSON/CSV), TV Time (ZIP GDPR). Badge check roda ao final de cada import.
- **Review snapshots**: PUT `/logs/{log_id}` cria `LogReview` só quando review/rating/platform mudam.

## ⚙️ Convenções
- **Estrelas**: 5 estrelas com meio ponto. Usar `getStars(rating)` → `['full'|'half'|'empty']`.
- **"Ver mais"**: Sempre visível, mesmo com ≤12 itens. No header da seção (`justify-between`), seta `ChevronRight` gira 90° expandido.
- **Poster tiles**: `grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2`.
- **Platform options**: Multi-select (até 2), específico por tipo de mídia (`frontend/src/constants/designSystem.ts`).
- **Contador de stats**: `completed + in_progress + dropped` (exclui wishlist).
- **Wishlist**: Fetch separado via `/media/wishlist` (merge manual com logs nas páginas de perfil).

## 📋 Pendências (TODO)
1. **Edição de layout por tipo de mídia (#12)**: No MediaTypeProfilePage, permitir ao usuário reordenar as seções (drag-and-drop), ocultar Top 5, e selecionar quais listas personalizadas exibir
2. **Layout de perfil estilo YGP (#15)**: Copiar o layout de perfil do yourgamerprofile.com (seções, disposição dos elementos)
3. **Publicação (#10)**: Publicar o site, avaliar ferramentas de hosting do GitHub Students
4. **Testar importação TV Time (#17)**: Testar a importação de dados do TV Time (ZIP do GDPR) com dados reais
5. **Testar importação Steam (#18)**: Testar a importação de dados da Steam com ID de usuário real
6. **Filtrar mídias sem match na API (#20)**: Ao importar, pular mídias cujo título não encontre correspondência na API (TMDB/Steam/Google Books), evitando itens sem capa, descrição ou metadados
7. **Auto-somar runtime nas estatísticas (#21)**: Importar `runtime` de filmes e `episode_run_time` de episódios da TMDB, somar automaticamente nas horas totais do usuário (em vez de depender de `hours_spent` manual)

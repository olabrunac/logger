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
- **Steam covers**: Usar `library_600x900.jpg` (2:3 retrato). Importação verifica HEAD request antes; pula jogos sem capa válida (DLCs, betas, jogos sem capsule art).
- **Review snapshots**: PUT `/logs/{log_id}` cria `LogReview` só quando review/rating/platform mudam.
- **Episódios especiais (season 0) excluídos**: `get_tv_seasons` filtra `season_number == 0`; contagens de `EpisodeWatched` em `media.py` (stats/`_update_series_status`), `hours_service.py` e `total_episodes_from_tmdb` do import TV Time usam `season_number > 0`. Episódios da season 0 apagados do `logger.db` local.

## ⚙️ Convenções
- **Estrelas**: 5 estrelas com meio ponto. Usar `getStars(rating)` → `['full'|'half'|'empty']`.
- **"Ver mais"**: Sempre visível, mesmo com ≤12 itens. No header da seção (`justify-between`), seta `ChevronRight` gira 90° expandido.
- **Poster tiles**: `grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2`.
- **Platform options**: Multi-select (até 2), específico por tipo de mídia (`frontend/src/constants/designSystem.ts`).
- **Contador de stats**: `completed + in_progress + dropped` (exclui wishlist).
- **Wishlist**: Fetch separado via `/media/wishlist` (merge manual com logs nas páginas de perfil).

## 📋 Pendências (TODO)
1. **Busca global (#22)**: Botão de busca no site todo para pesquisar mídias e perfis de outros usuários.
2. **Publicação (#10)**: Publicar o site, avaliar ferramentas de hosting do GitHub Students
3. **CDN da Steam mudou**: Steam migrou de `cdn.akamai.steamstatic.com` para `shared.akamai.steamstatic.com/store_item_assets/`. `library_600x900.jpg` ainda funciona no CDN antigo, mas monitorar se quebrará.
4. **Import otimizado**: O HEAD request por jogo no import da Steam adiciona ~1s por app (276 jogos ≈ 5min). Considerar batch ou paralelizar no futuro.
5. **Retirar badge de primeiro log**: Remover a badge de "primeiro log" do sistema de badges.
6. **Importação de achievements dos jogos**: Ajustar/corrigir a importação de conquistas (achievements) dos jogos.

## ✅ Implementado
- **Popout do log**: Modal "Novo Log" (`FloatingLogButton.tsx`) fecha apenas no **X** — removido `onClick={handleClose}` do overlay.
- **Horas de episódios de série verificadas**: Marcando episódios na UI, `_update_series_status` grava `hours_spent = runtime/60 × assistidos` e `effective_hours` (no GET) cobre o caso sem horas manuais. Validado ponta-a-ponta (3 eps × 25min = 1.2h).
- **Railway — fixes deployados**: `UniqueViolation` no import Steam (sobrescrevia `steam_appid`) e `NameError: datetime` no `tmdb_service.get_tv_details` corrigidos e funcionando em produção.
- **Badges de horas com metas**: Substituídos `hours_332`/`hours_666` por badges `hours_{10..5000}` (bronze→cósmico) no padrão evolutivo de grupos (`_upgrade_group`/`_handle_group` em `crud_user_badge.py`), usando `effective_hours` (mesma contagem da sidebar). 1 badge por vez, tiers substituem anteriores, tooltip mostra progresso p/ próximo nível.
- **Overflow do poster na sidebar**: Poster das "Atividades recentes" (`RightSidebar.tsx`) reduzido de 48×66px para 44×60px — 5 tiles + bordas cabem no card (≈254px < 266px úteis), sem overflow horizontal.
- **Edição de layout por tipo de mídia (#12)**: MediaTypeProfilePage permite reordenar seções (drag-and-drop), ocultar Top 5 e selecionar listas personalizadas.
- **Filtrar mídias sem match na API (#20)**: Importadores (Letterboxd, Trakt, TV Time) pulam itens sem `tmdb_id` **ou sem capa** (`reason: no_cover`). Steam pula jogos sem capa válida (`library_600x900.jpg`).
- **Auto-somar runtime nas estatísticas (#21)**: Helper `effective_hours` (`backend/app/services/hours_service.py`) calcula horas automaticamente quando `hours_spent` manual é nulo — filmes = `runtime/60`, séries = `runtime/60 × episódios assistidos`. Aplicado em `GET /media/logs`, `/media/logs/{id}`, `/media/logs/by-item`, `/media/stats`, timeline e na contagem dos badges de horas. Valor manual continua tendo precedência.
- **Badges 404 para user inexistente**: `BadgesSection` não dispara requisição com id inválido (`≤0`/undefined) e cancela fetch ao trocar de usuário; `App.tsx` valida o usuário do localStorage no mount via `/login/by-username`, corrigindo id stale (ex: migração 3→2) ou limpando a sessão quando o usuário não existe mais (404).
- **Pílulas dos poster tiles**: `STATUS_ICONS` virou mapa de componentes lucide (sem emojis) — `completed`=Eye, `in_progress`=Ellipsis, `wishlist`=Star, `dropped`=Skull, `soon`=Hourglass, `library`=Library, `platinated`=Trophy. Layout padrão do `YgpCard`: avaliação (5 estrelas via `getStars`, **vazias se sem nota**) no canto inferior esquerdo com o indicador X/Y (conquistas para jogos, episódios para séries — sempre visível) acima; horas no canto inferior direito (só o número + "h", sem ícone de relógio); coração (favorito) e pílula amarela **"100%"** (platina, em vez de troféu) no canto superior esquerdo; status no canto superior direito. `YgpCard` é o **tile único** de pôster — usado em perfil (Atividade recente + seções de status + Top 5 desktop/mobile, com `rank` "#1 · tipo" e outline âmbar para o goat), Home, Favoritos e Listas (grupos, wishlist e itens de listas personalizadas); aceita `actions` (ReactNode) para ações hover (editar/remover), `showStatus`, `rank`, `className` e `style`. Ícone por status compartilhado via `components/StatusIcon.tsx`.

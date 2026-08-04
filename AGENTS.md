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
- **Episódios especiais (season 0) excluídos**: `get_tv_seasons` filtra `season_number == 0`; `get_tv_by_id.total_episodes` soma só seasons regulares; contagens de `EpisodeWatched` em `media.py` (stats/`_update_series_status`), `hours_service.py` e `total_episodes_from_tmdb` do import TV Time usam `season_number > 0`. Episódios da season 0 apagados do `logger.db` local.

## ⚙️ Convenções
- **Estrelas**: 5 estrelas com meio ponto. Usar `getStars(rating)` → `['full'|'half'|'empty']`.
- **"Ver mais"**: Sempre visível, mesmo com ≤12 itens. No header da seção (`justify-between`), seta `ChevronRight` gira 90° expandido.
- **Poster tiles**: `grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2`.
- **Platform options**: Multi-select (até 2), específico por tipo de mídia (`frontend/src/constants/designSystem.ts`).
- **Contador de stats**: `completed + in_progress + dropped` (exclui wishlist).
- **Wishlist**: Fetch separado via `/media/wishlist` (merge manual com logs nas páginas de perfil).

## 📋 Pendências (TODO) — ordenadas da mais fácil para a mais complexa
1. **Retirar badge de primeiro log**: Remover a badge de "primeiro log" do sistema de badges.
2. **Data de nascimento no Settings → Geral**: Mostrar a data de nascimento num bloco e permitir trocá-la **1 única vez** (caso o usuário tenha preenchido errado inicialmente).
3. **Importação de achievements dos jogos**: Ajustar/corrigir a importação de conquistas (achievements) dos jogos.
4. **Jogos do Family Share na importação Steam**: Importar também os jogos compartilhados pela família (não comprados). O endpoint `IFamilyGroupsService/GetSharedLibraryApps` exige **login OAuth com a conta Steam** (access token de curta duração + refresh) para listar os jogos e `GetPlaytimeSummary` para os tempos — fluxo de login novo no app.
5. **Ajustar site para mobile**: Revisar layout responsivo (sidebar, grids, modais) para telas pequenas.
6. **Publicação (#10)**: Publicar o site, avaliar ferramentas de hosting do GitHub Students

## ✅ Implementado
- **Jogos parados marcados como abandonados (import Steam)**: Na importação, todos os jogos próprios vão para `library` (usuário tem comprado na conta); jogos com **>120 dias** sem atividade (`rtime_last_played`) → `dropped`. Removido o `in_progress` da importação; mantida a regra de `completed` para 100% de achievements.
- **Import Steam otimizado**: HEAD requests das capas (`_steam_cover_url`) resolvidos em paralelo via `ThreadPoolExecutor` (10 workers) antes do loop — 276 jogos ≈ 5min serial → ~30s. ETA baseline ajustado (2.5 → 1.5s/item).
- **URL direta de perfil alheio (#17)**: `user` iniciava como `null` (só era lido do localStorage num `useEffect`), então digitar `/profile/:username` no browser (full page load) redirecionava para o próprio perfil (cascata `/login` → `/` → `/profile/{user.username}`). Fix: `App.tsx` inicializa `user` **sincronamente** via `useState` lazy a partir do localStorage — URL direta de qualquer rota agora renderiza o destino direto.
- **Railway — crash do Postgres corrigido (#16)**: `init_db.py` usava `ALTER TABLE user ...` (sem aspas, `user` é palavra reservada) com `except: pass` engolindo o erro → crash de startup (`column user.birth_date does not exist`). Fix: `_migrate()` cita `"user"`, roda cada statement em transação própria com `commit`/`rollback` e loga o erro.
- **Pílula branca no "Meu Log"**: Pílula de status no bloco "Meu Log" da página de mídia usa `color: '#fff'` fixa — `STATUS_TEXT_COLORS` removido de `MediaDetailPage.tsx`.
- **Grid de imagens estilo Twitter (#2)**: `PostImages.tsx` (grid 1/2/3/4 + lightbox fullscreen com setas/Escape/contador) integrado ao `TimelinePage`.
- **Poster tiles fixos (#3)**: Favoritos (`ProfilePage`) e Top 5 (`MediaTypeProfilePage`) usam a mesma grid fixa da Atividade recente (`grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2`).
- **Validação de banner/avatar + enquadramento (#4 e #8)**: `validateImageFile` no `SettingsPage` (banner largura ≥800 e proporção 2.5–8; avatar ≥256×256 e 1:1; máx 5MB) + `ImageFramingModal.tsx` com pan/zoom via canvas salvando JPEG (banner 1400×300, avatar 512×512). GIF ignora o enquadramento.
- **Zona de perigo (#5)**: Botões perigosos movidos só para a aba Segurança com confirmação; wipe preserva badges com `special=True` (`BADGE_DEFS` em `users.py`); botão LGPD morto removido.
- **Contadores de follow locais**: `ProfilePage` atualiza `followers_count`/`following_count` localmente após follow/unfollow via `onUserUpdate`.
- **Ver outras contas**: `DiaryPage`, `CalendarPage`, `ReviewsPage` e `ListsPage` resolvem `:username` da URL via `/login/by-username/` (antes usavam o usuário logado); `ListsPage` com gating `isOwnProfile`.
- **CDN da Steam com fallback**: `_steam_cover_url` (`import_data.py`) tenta o CDN legado (`cdn.akamai.steamstatic.com`) e cai para o novo (`shared.akamai.steamstatic.com/store_item_assets/`) se o HEAD falhar — import Steam não quebra na migração.
- **Popout do log**: Modal "Novo Log" (`FloatingLogButton.tsx`) fecha apenas no **X** — removido `onClick={handleClose}` do overlay.
- **Horas de episódios de série verificadas**: Marcando episódios na UI, `_update_series_status` grava `hours_spent = runtime/60 × assistidos` e `effective_hours` (no GET) cobre o caso sem horas manuais. Validado ponta-a-ponta (3 eps × 25min = 1.2h).
- **Railway — fixes deployados**: `UniqueViolation` no import Steam (sobrescrevia `steam_appid`) e `NameError: datetime` no `tmdb_service.get_tv_details` corrigidos e funcionando em produção.
- **Badges de horas com metas**: Substituídos `hours_332`/`hours_666` por badges `hours_{10..5000}` (bronze→cósmico) no padrão evolutivo de grupos (`_upgrade_group`/`_handle_group` em `crud_user_badge.py`), usando `effective_hours` (mesma contagem da sidebar). 1 badge por vez, tiers substituem anteriores, tooltip mostra progresso p/ próximo nível.
- **Overflow do poster na sidebar**: Poster das "Atividades recentes" (`RightSidebar.tsx`) reduzido de 48×66px para 44×60px — 5 tiles + bordas cabem no card (≈254px < 266px úteis), sem overflow horizontal.
- **Filtro por tipo na busca**: `global_search` aceita `#filme`, `#serie`, `#jogo`, `#livro` (também plural/inglês: `#filmes`, `#movies`, `#shows`...) no campo buscar — extraído por `_extract_type_filter` em `search.py`, filtra busca local e APIs externas (TMDB/IGDB/Google Books) pelo tipo. `@` continua exclusivo para perfis; hint no `SearchPage` documenta o uso.
- **Tempo para Zerar/Similares para jogos Steam (#22)**: Jogos importados via Steam ficavam sem `igdb_id` (258 de 261) e nunca mostravam Tempo para Zerar nem Jogos similares na página de mídia. Adicionado `get_igdb_id_from_steam` (`igdb_service.py`) que resolve o ID IGDB pelo Steam AppID via `external_games` (source 1) — mais confiável que match por título. `_enrich_media_item` em `media.py` agora roda para qualquer GAME (mesmo sem `igdb_id`), resolve o ID e popula `time_to_beat`/`similar_games` on-demand. Validado ao vivo (Metro Exodus: appid 412020 → igdb 37016 → ttb+similares).
- **Edição de layout por tipo de mídia (#12)**: MediaTypeProfilePage permite reordenar seções (drag-and-drop), ocultar Top 5 e selecionar listas personalizadas.
- **Filtrar mídias sem match na API (#20)**: Importadores (Letterboxd, Trakt, TV Time) pulam itens sem `tmdb_id` **ou sem capa** (`reason: no_cover`). Steam pula jogos sem capa válida (`library_600x900.jpg`).
- **Auto-somar runtime nas estatísticas (#21)**: Helper `effective_hours` (`backend/app/services/hours_service.py`) calcula horas automaticamente quando `hours_spent` manual é nulo — filmes = `runtime/60`, séries = `runtime/60 × episódios assistidos`. Aplicado em `GET /media/logs`, `/media/logs/{id}`, `/media/logs/by-item`, `/media/stats`, timeline e na contagem dos badges de horas. Valor manual continua tendo precedência.
- **Badges 404 para user inexistente**: `BadgesSection` não dispara requisição com id inválido (`≤0`/undefined) e cancela fetch ao trocar de usuário; `App.tsx` valida o usuário do localStorage no mount via `/login/by-username`, corrigindo id stale (ex: migração 3→2) ou limpando a sessão quando o usuário não existe mais (404).
- **Pílulas dos poster tiles**: `STATUS_ICONS` virou mapa de componentes lucide (sem emojis) — `completed`=Eye, `in_progress`=Ellipsis, `wishlist`=Star, `dropped`=Skull, `soon`=Hourglass, `library`=Library, `platinated`=Trophy. Layout padrão do `YgpCard`: avaliação (5 estrelas via `getStars`, **vazias se sem nota**) no canto inferior esquerdo com o indicador X/Y (conquistas para jogos, episódios para séries — sempre visível) acima; horas no canto inferior direito (só o número + "h", sem ícone de relógio); coração (favorito) e pílula amarela **"100%"** (platina, em vez de troféu) no canto superior esquerdo; status no canto superior direito. `YgpCard` é o **tile único** de pôster — usado em perfil (Atividade recente + seções de status + Top 5 desktop/mobile, com `rank` "#1 · tipo" e outline âmbar para o goat), Home, Favoritos e Listas (grupos, wishlist e itens de listas personalizadas); aceita `actions` (ReactNode) para ações hover (editar/remover), `showStatus`, `rank`, `className` e `style`. Ícone por status compartilhado via `components/StatusIcon.tsx`.

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
1. **Cor da pílula de status no bloco "Meu Log"**: Na página da mídia, o bloco "Meu Log" (avaliação, review, etc.) mostra a pílula de status com cor ilegível — deixar a cor da letra branca.
2. **Tamanho da imagem na timeline**: A imagem dos posts deve exibir num tamanho específico/fixo (estilo Twitter), não variando com a proporção da imagem.
3. **Tamanho do poster tile no favoritos**: O tamanho do poster tile na seção Favoritos deve ser fixo.
4. **Validação de banner/avatar**: Avisar o usuário quando tentar enviar banner/avatar que não atende as especificações (dimensões/tamanho).
5. **Zona de perigo nas configurações**: Mover os botões perigosos só para a área de segurança e exigir confirmação antes de excluir/apagar dados.
6. **Tags de jogos parados**: Na importação de jogos, adicionar tags corretas quando o jogo está há mais de 120 dias sem ser jogado.
7. **Import otimizado**: O HEAD request por jogo no import da Steam adiciona ~1s por app (276 jogos ≈ 5min). Considerar batch ou paralelizar no futuro.
8. **Enquadramento de banner/avatar**: Permitir mover o enquadramento da imagem enviada (pan/zoom) para ajuste pelo usuário.
9. **Ajustar site para mobile**: Revisar layout responsivo (sidebar, grids, modais) para telas pequenas.
10. **Publicação (#10)**: Publicar o site, avaliar ferramentas de hosting do GitHub Students

## ✅ Implementado
- **CDN da Steam com fallback**: `_steam_cover_url` (`import_data.py`) tenta o CDN legado (`cdn.akamai.steamstatic.com`) e cai para o novo (`shared.akamai.steamstatic.com/store_item_assets/`) se o HEAD falhar — import Steam não quebra na migração.
- **Data de nascimento no cadastro**: Novo campo opcional `birth_date` no `User` (model + migration em `init_db.py` + schemas) — formulário de registro (`LoginPage.tsx`) envia a data e o `SettingsPage` exibe/permite alterar (antes era hardcoded "19/04/1999").
- **Imagens na timeline sem corte**: Posts no `TimelinePage` e `ProfilePage` usam `object-contain` com fundo escuro (letterbox estilo Twitter) — imagem inteira visível, sem crop.
- **Bug das 5 estrelas**: Estrelas do `LogForm` agora preenchem o botão (`size={40}` + `w-full h-full`) — antes o ícone de 36px ficava desalinhado num botão de 40px, fazendo o eixo de "metade da estrela" mostrar 4.5 no hover e dificultando o 5.
- **Ver perfil de outros usuários**: `MediaTypeRedirect` (`App.tsx`) usava `user.username` (o usuário logado) em vez do `:username` da URL — links tipo `/profile/:username/games` agora redirecionam para o perfil correto.
- **Busca global (#22)**: Página dedicada `/search` (`SearchPage.tsx`) substituiu o `GlobalSearchModal` (removido) — NavLink "Buscar" na `LeftSidebar`. `App.tsx` esconde a `RightSidebar` global nas rotas `/media/*` (a página usa sidebar própria estilo YGP). `/log/*` redireciona para `/media/*`.
- **Busca de log por ISBN (#22)**: `google_books_service.search_books` detecta ISBN (via `_looks_like_isbn`, aceita ISBN-10/13 com/sem hífens) digitado no campo de título e constrói `isbn:<valor>`. Antes montava `intitle:<isbn>` → 0 resultados.
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

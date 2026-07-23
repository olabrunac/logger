# Logger

Logger é um site pessoal para registrar e acompanhar filmes, séries, jogos e livros, inspirado em plataformas como Your Gamer Profile, Letterboxd e TV Time.

## Visão Geral

O objetivo é criar uma plataforma centralizada onde o usuário mantém um diário de todo o conteúdo que consome — avaliando, escrevendo resenhas e acompanhando progresso. O sistema busca automaticamente detalhes em APIs externas (TMDb, IGDB, Google Books, Steam) para enriquecer os registros.

## Tecnologias

### Backend
- Python 3.11+ / FastAPI / Uvicorn
- SQLAlchemy ORM + SQLite
- Pydantic para validação
- APIs externas: TMDb (filmes/séries), IGDB (jogos), Steam (conquistas + loja), Google Books (livros)

### Frontend
- React 19 + TypeScript (Vite)
- React Router DOM (roteamento)
- Axios (requisições)
- Tailwind CSS (estilização)
- date-fns (calendário)
- lucide-react (ícones)
- oxlint (linting)

## Estrutura do Projeto

```
/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/   # login.py, media.py, users.py
│   │   ├── core/config.py   # Settings, API keys
│   │   ├── crud/
│   │   ├── models/          # User, MediaItem, LogEntry, EpisodeWatched, Achievement
│   │   ├── schemas/         # Request/response Pydantic schemas
│   │   ├── services/        # tmdb_service.py, igdb_service.py, steam_service.py, google_books_service.py
│   │   └── main.py          # FastAPI app + startup
│   ├── uploads/             # User-uploaded banners/avatars
│   ├── logger.db            # SQLite database (auto-created)
│   └── .env                 # API keys (gitignored)
│
├── frontend/
│   └── src/
│       ├── pages/           # 10 page components
│       ├── components/      # Header, LogForm, SearchMedia
│       │   └── sections/    # ActivityGraph, HoursPieChart, StatsSection, GenreChart, etc.
│       ├── services/api.ts  # Axios instances
│       ├── types/           # TypeScript types
│       ├── index.css        # MDF design system
│       ├── App.tsx          # Routes + accent color injection
│       └── main.tsx
│
├── AGENTS.md
├── YGP_REFERENCE.md
└── README.md
```

## Como Executar

### Pré-requisitos
- Python 3.11+ e `pip`
- Node.js e `npm`

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Configure `backend/.env`:
```
TMDB_API_KEY="sua_chave"
IGDB_CLIENT_ID="sua_chave"
IGDB_CLIENT_SECRET="seu_segredo"
GOOGLE_BOOKS_API_KEY="sua_chave"
STEAM_API_KEY="sua_chave"
```

```bash
.\venv\Scripts\uvicorn.exe app.main:app --reload
# Backend disponível em http://127.0.0.1:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend disponível em http://localhost:5173
```

## Funcionalidades Implementadas

### Autenticação
- Login apenas com nome de usuário (sem senha)
- Auto-criação de usuário no primeiro login
- Usuário admin seedado na inicialização
- Sessão persistida via `localStorage`

### Busca de Mídia
- Filmes e séries via TMDb (com filtro por ano)
- Jogos via IGDB
- Livros via Google Books (com campos de autor, ano e ISBN)
- Busca automática de metadados (capa, sinopse, data de lançamento)
- **Busca com autocomplete**: digitação debounced (500ms) — resultados aparecem enquanto o usuário digita

### Enriquecimento Automático de Metadados
- **Filmes/Séries (TMDb)**: gêneros, runtime, vote_average, diretor/cridor, trailer URL
- **Jogos (Steam)**: metacritic score, gêneros, categorias, preço, screenshots, requisitos, descrição curta
- **Livros (Google Books)**: page_count, publisher, categorias, idioma, rating
- Enriquecimento automático ao criar (`POST /logs`) e editar (`PUT /logs/{id}`) — campos do MediaItem são preenchidos automaticamente

### Sistema de Logs
- Rating com meio-estrela (5 estrelas, lado esquerdo = meio, lado direito = inteiro)
- **Favorito independente**: toggle ❤️ que pode ser combinado com qualquer status (não é um status)
- **Contador de rewatch** para filmes (Nx no poster tile)
- **Páginas lidas + horas** para livros (dois campos separados)
- Horas gastas (formato decimal) para jogos
- Reviews
- CRUD completo: criar, ler, editar (PUT/PATCH), deletar com confirmação (modal via `createPortal`)

### Status por Tipo de Mídia
| Tipo | Status |
|------|--------|
| 🎮 Jogos | Jogando, Finalizado, Pretendo Jogar, Abandonado |
| 🎬 Filmes | Assistindo, Assistido, Pretendo Assistir, Abandonado |
| 📺 Séries | Assistindo, Finalizado, Pretendo Assistir, Abandonado |
| 📚 Livros | Lendo, Lido, Pretendo Ler, Abandonado |

### Plataformas por Tipo de Mídia
| Tipo | Opções |
|------|--------|
| 🎮 Jogos | Steam, Epic Games, GOG, Xbox, PlayStation, Nintendo, Mobile, Pirata, Não especificado |
| 🎬 Filmes | Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Cinema, Blu-ray, Stremio, Não especificado |
| 📺 Séries | Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Crunchyroll, Stremio, Não especificado |
| 📚 Livros | Físico, Kindle, PDF, Audiobook, Web, Pirata, Não especificado (multi-select, até 2) |

### Séries e Episódios
- Busca de temporadas e episódios via TMDb
- Toggle individual de episódio assistido
- Marcar todos os episódios de uma temporada
- Contador de episódios assistidos/total nos poster tiles

### Jogos e Conquistas
- Conquistas via Steam API (com fallback para IGDB)
- Toggle individual de conquista desbloqueada
- Porcentagem de completion nos poster tiles (100% em dourado quando 100%)

### Poster Tiles (Padronizado)
Layout idêntico em todas as grids do site (HomePage, ProfilePage, MediaTypeProfilePage, ListsPage, FavoriteGamesSection):
- **Topo esquerdo**: ❤️ favorito (círculo rosa) → ícone de status (círculo colorido) → pill de conquistas (jogos)
- **Topo direito**: badge de plataforma
- **Overlay inferior**: título + estrelas de avaliação
- **Canto inferior direito**: stats por tipo (Nx filmes, episódios séries, horas jogos/livros)

### Páginas
| Rota | Descrição |
|------|-----------|
| `/` | Home com grid de contagem por tipo + atividade recente |
| `/new-log` | Busca de mídia + formulário de log (suporta edição via `?edit={id}`) |
| `/calendar` | Grid mensal com capas miniatura dos logs + dia fixo no canto |
| `/lists` | Logs agrupados por tipo e status |
| `/diary` | Timeline cronológica filtrável por tipo |
| `/profile/:username` | Perfil geral: atividade recente, mapa de atividade + donut de horas lado a lado, stats, gêneros, todos os logs |
| `/profile/:username/:mediaType` | Perfil por tipo: favoritos, atividade, stats, gêneros, reviews, todos os logs |
| `/log/:id` | Detalhe do log com edição inline + dados enriquecidos (Steam/TMDb/Google Books) |
| `/settings` | Upload de banner/avatar, cor de destaque, ordem das seções |

### Perfil e Customização
- Banner e avatar com upload (JPEG/PNG/WebP/GIF, máx 5MB)
- Cor de destaque customizável (aplicada como CSS variable global)
- Seções ordenáveis (via drag and drop)
- Botões de tipo (Filmes/Séries/Jogos/Livros) nas páginas de perfil para navegação rápida
- Perfil visualizável por username via URL `/profile/:username`

### Visualizações de Dados
- **Activity Grid**: Calendário com capas dos logs do dia, ícones 2x, grid 3x3 por dia
- **Mapa de Atividade**: Heatmap com cores por tipo de mídia dominante, inicia 01/01/2026, células 15x15px
- **Gráfico de Horas**: Donut SVG com horas por tipo de mídia, posicionado à direita no perfil geral
- **Estatísticas**: Total, média de horas, média de rating; % de conclusão para jogos
- **Gráfico de Gêneros**: Barras horizontais dos gêneros mais consumidos
- **Distribuição de Avaliações**: Barras coloridas por tipo de mídia (HSL shading)

### Design System
- Baseado na referência MDF (YourGamerProfile)
- CSS variables: `--mdf-bg: #0A0C10`, `--mdf-surface: #14181C`, `--mdf-surface-2: #1C2127`
- Tipografia: Outfit (headings), Manrope (body)
- Componentes: `.mdf-card`, `.mdf-card-hover`, `.mdf-btn-primary`, `.mdf-btn-ghost`, `.poster-tile`

## Endpoints da API (19 total)

### Login (`/api/v1/login`)
- `POST /` — Login ou criar usuário
- `GET /by-username/{username}` — Buscar usuário por username

### Usuários (`/api/v1/users`)
- `PUT /{id}/profile` — Atualizar accent_color e section_order
- `POST /{id}/upload/{banner|avatar}` — Upload de imagem
- `DELETE /{id}` — Deletar usuário e todos os dados

### Mídia (`/api/v1/media`)
- `GET /search?q=...&media_type=...` — Buscar em TMDb/IGDB/Google Books
- `POST /logs` — Criar log (auto-enriquece MediaItem)
- `GET /logs?user_id=...` — Buscar logs do usuário (retorna `LogEntryWithStats` com campos computados)
- `GET /logs/{id}` — Buscar log por ID
- `PUT /logs/{id}` — Atualização completa (usa schema `LogEntryUpdate` flat)
- `PATCH /logs/{id}` — Atualização parcial
- `DELETE /logs/{id}` — Deletar log
- `GET /stats?user_id=...` — Estatísticas do usuário
- `GET /series/{tmdb_id}/seasons` — Temporadas via TMDb
- `GET /series/{tmdb_id}/season/{n}/episodes` — Episódios via TMDb
- `GET /logs/{id}/episodes` — Episódios assistidos
- `POST /logs/{id}/episodes` — Toggle episódio
- `GET /logs/{id}/achievements` — Conquistas do jogo (Steam API)
- `POST /logs/{id}/achievements` — Toggle conquista

## Models

- **User**: id, username, banner_url, avatar_url, accent_color, section_order
- **MediaItem**: id, title, media_type, tmdb_id, igdb_id, steam_appid, google_books_id, cover_image_url, release_date, synopsis, seasons_data, header_image, metacritic_score, steam_genres, steam_categories, steam_price, screenshots, pc_requirements, short_description, backdrop_url, genres, runtime, vote_average, director, trailer_url, page_count, publisher, book_categories, book_language, book_rating
- **LogEntry**: id, user_id, media_item_id, log_date, rating (0-5 half stars), is_favorite, is_relog, relog_count, platform, hours_spent, pages_read, review, status
- **EpisodeWatched**: id, log_id, season_number, episode_number, episode_name, watched, log_date
- **Achievement**: id, log_id, external_id, name, description, image_url, unlocked

## Pendências

- [ ] Sistema de busca global (filtrar logs por título)
- [ ] Paginação ou infinite scroll na listagem de logs
- [ ] Notificações / feed de atividade
- [ ] Comparação de perfil entre usuários
- [ ] Compartilhamento de logs (social features)
- [ ] Export de dados (CSV/JSON)
- [ ] Modo escuro / temas alternativos
- [ ] PWA (Progressive Web App) com service worker
- [ ] Testes automatizados (frontend e backend)
- [ ] CI/CD pipeline
- [ ] Deploy (Docker + hosting)

## Ideias Futuras

- **Listas Curadas**: Criar listas temáticas (ex: "Melhores de 2026", "Maratona Marvel")
- **Recomendações**: Sugerir mídias baseadas no histórico e preferências do usuário
- **Timeline Visual**: Visualização cronológica tipo Letterboxd com posts
- **Integração com Trakt.tv / RAWG.io**: Importar dados de plataformas existentes
- **Gamificação**: Conquistas do sistema (não apenas de jogos), streaks de logging, badges
- **API Pública**: Endpoints para integração com apps de terceiros
- **Multi-idioma**: Suporte a pt-BR, en-US, es-ES
- **Mobile**: App nativo ou responsivo otimizado para mobile
- **Importar Histórico do Letterboxd**: Exportar ratings, reviews e listas do Letterboxd via arquivo CSV/API
- **Importar Histórico do TV Time**: Sincronizar séries e episódios assistidos do TV Time
- **Login com Senha**: Autenticação completa com email/senha (ou OAuth com Google/GitHub)
- **Sistema de Amigos**: Adicionar amigos, aceitar/solicitar amizade, ver perfil deles
- **Timeline Social na Home**: Feed com logs, reviews e favoritos dos amigos em ordem cronológica
- **Feed de Publicações**: Aba para postar screenshots, comentários e status (estilo activity feed)
- **Albuns (Música)**: Nova mídia para avaliar músicas dentro de albuns, favoritar individualmente e escrever reviews por faixa. Busca automática via Spotify API ou Deezer API para capa, tracklist e metadados

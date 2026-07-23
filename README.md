# Logger

Logger é um site pessoal para registrar e acompanhar filmes, séries, jogos e livros, inspirado em plataformas como Your Gamer Profile, Letterboxd e TV Time.

## Visão Geral

O objetivo é criar uma plataforma centralizada onde o usuário mantém um diário de todo o conteúdo que consome — avaliando, escrevendo resenhas e acompanhando progresso. O sistema busca automaticamente detalhes em APIs externas (TMDb, IGDB, Google Books) para enriquecer os registros.

## Tecnologias

### Backend
- Python 3.11+ / FastAPI / Uvicorn
- SQLAlchemy ORM + SQLite
- Pydantic para validação
- APIs externas: TMDb (filmes/séries), IGDB (jogos), Google Books (livros)

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
│   │   ├── services/        # tmdb_service.py, igdb_service.py, google_books_service.py
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

### Sistema de Logs
- Rating com meio-estrela (5 estrelas, lado esquerdo = meio, lado direito = inteiro)
- Horas gastas (formato decimal)
- Status: em progresso, completo, abandonado, desejo, em breve, platinado
- Favoritos, reviews e platform
- Log de episódios de séries (via TMDb)
- Conquistas de jogos (via IGDB)
- CRUD completo: criar, ler, editar (PUT/PATCH), deletar com confirmação

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
| `/log/:id` | Detalhe do log com edição inline |
| `/settings` | Upload de banner/avatar, cor de destaque, ordem das seções |

### Perfil e Customização
- Banner e avatar com upload (JPEG/PNG/WebP/GIF, máx 5MB)
- Cor de destaque customizável (aplicada como CSS variable global)
- Seções ordenáveis (via drag and drop)
- Botões de tipo (Filmes/Séries/Jogos/Livros) nas páginas de perfil para navegação rápida

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

## Endpoints da API (18 total)

### Login (`/api/v1/login`)
- `POST /` — Login ou criar usuário
- `GET /by-username/{username}` — Buscar usuário por username

### Usuários (`/api/v1/users`)
- `PUT /{id}/profile` — Atualizar accent_color e section_order
- `POST /{id}/upload/{banner|avatar}` — Upload de imagem
- `DELETE /{id}` — Deletar usuário e todos os dados

### Mídia (`/api/v1/media`)
- `GET /search?q=...&media_type=...` — Buscar em TMDb/IGDB/Google Books
- `POST /logs` — Criar log
- `GET /logs?user_id=...` — Buscar logs do usuário
- `GET /logs/{id}` — Buscar log por ID
- `PUT /logs/{id}` — Atualização completa
- `PATCH /logs/{id}` — Atualização parcial
- `DELETE /logs/{id}` — Deletar log
- `GET /stats?user_id=...` — Estatísticas do usuário
- `GET /series/{tmdb_id}/seasons` — Temporadas via TMDb
- `GET /series/{tmdb_id}/season/{n}/episodes` — Episódios via TMDb
- `GET /logs/{id}/episodes` — Episódios assistidos
- `POST /logs/{id}/episodes` — Toggle episódio
- `GET /logs/{id}/achievements` — Conquistas do jogo
- `POST /logs/{id}/achievements` — Toggle conquista
- `GET /games/{igdb_id}/achievements` — Conquistas via IGDB

## Models

- **User**: id, username, banner_url, avatar_url, accent_color, section_order
- **MediaItem**: id, title, media_type, tmdb_id, igdb_id, cover_image_url, release_date, synopsis, seasons_data
- **LogEntry**: id, user_id, media_item_id, log_date, rating, is_favorite, is_relog, platform, hours_spent, review, status
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

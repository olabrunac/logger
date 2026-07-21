# Logger

Logger é um site pessoal para registrar e acompanhar filmes, séries, jogos e livros, inspirado em plataformas como Your Gamer Profile, Letterboxd e TV Time.

## Visão Geral

O objetivo deste projeto é criar uma plataforma centralizada onde o usuário pode manter um diário de todo o conteúdo que consome, avaliar, escrever resenhas e acompanhar seu progresso. O sistema busca automaticamente os detalhes de cada item em bancos de dados online (TMDb, IGDB) para enriquecer os registros do usuário.

## Tecnologias

- **Backend:**
  - **Linguagem:** Python 3.11+
  - **Framework:** FastAPI
  - **Servidor ASGI:** Uvicorn
  - **Banco de Dados:** SQLite (para desenvolvimento inicial)
  - **ORM:** SQLAlchemy
  - **Validação de Dados:** Pydantic

- **Frontend:**
  - **Framework:** React (com TypeScript)
  - **Build Tool:** Vite
  - **Requisições HTTP:** Axios
  - **Roteamento:** React Router DOM
  - **Estilização:** A ser definido (ex: Material-UI, Tailwind CSS)

## Estrutura do Projeto

```
/
├── backend/                # Código do Backend (FastAPI)
│   ├── app/
│   │   ├── api/            # Endpoints da API
│   │   ├── core/           # Configurações, chaves de API
│   │   ├── crud/           # Funções de interação com o banco de dados
│   │   ├── models/         # Modelos de dados do SQLAlchemy
│   │   ├── schemas/        # Esquemas de validação do Pydantic
│   │   ├── services/       # Lógica para se comunicar com APIs externas (TMDb, IGDB)
│   │   └── main.py         # Ponto de entrada da aplicação FastAPI
│   ├── .env                # Arquivo para armazenar segredos (NÃO ENVIAR PARA O GIT)
│   └── requirements.txt    # Dependências do Python
│
├── frontend/               # Código do Frontend (React)
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/     # Componentes reutilizáveis
│       ├── hooks/
│       ├── pages/          # Páginas da aplicação (Home, Profile, etc.)
│       ├── services/       # Funções para chamar a API do backend
│       ├── styles/
│       ├── types/          # Definições de tipos TypeScript
│       ├── App.tsx
│       └── main.tsx
│
└── README.md               # Este arquivo
```

## Como Executar

### Pré-requisitos
- Python 3.11+ e `pip`
- Node.js e `npm`

### Backend
1. **Navegue até a pasta do backend:**
   ```bash
   cd backend
   ```
2. **Crie um ambiente virtual e ative-o:**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
3. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure as chaves de API:**
   - Renomeie o arquivo `.env.example` (a ser criado) para `.env`.
   - Preencha as seguintes variáveis com suas chaves:
     ```
     TMDB_API_KEY="***REMOVED***"
     IGDB_CLIENT_ID="***REMOVED***"
     IGDB_CLIENT_SECRET="***REMOVED***"
     ```
5. **Inicie o servidor:**
   ```bash
   uvicorn app.main:app --reload
   ```
   O backend estará disponível em `http://127.0.0.1:8000`.

### Frontend
1. **Navegue até a pasta do frontend:**
   ```bash
   cd frontend
   ```
2. **Instale as dependências:**
   ```bash
   npm install
   ```
3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O frontend estará disponível em `http://localhost:5175` (ou outra porta, caso a 5176 esteja em uso, indicada pelo Vite no terminal).

## Status do Projeto

### Concluído
- [x] **Backend: Estrutura e Models:** Todos os modelos de banco de dados (`User`, `MediaItem`, `LogEntry`) foram implementados.
- [x] **Backend: API Endpoints:** Endpoints para autenticação de usuário (criar/obter), buscar mídias externas e criar/ler logs estão funcionais.
- [x] **Backend: Services:** A integração com as APIs do TMDb (filmes/séries) e IGDB (jogos) está completa.
- [x] **Backend: Automação:** Um usuário 'admin' padrão é criado na inicialização do servidor para testes.
- [x] **Frontend: Autenticação:** O fluxo de login (apenas com nome de usuário) e a persistência da sessão (usando `localStorage`) estão implementados.
- [x] **Frontend: Logging:** O fluxo completo de log de um novo item (busca, seleção e preenchimento do formulário) está funcional.

### Implementação Básica (A ser melhorada)
- [ ] **Frontend: UI:** A interface do usuário é funcional, mas minimalista. O próximo passo é estilizá-la com base nas referências (`yourgamerprofile.com`, `Letterboxd`).
- [ ] **Frontend: Listas:** A página inicial exibe os logs mais recentes. A criação de listas dedicadas (Favoritos, Concluídos, etc.) no perfil do usuário é o próximo passo.

### Pendências e Próximos Passos
- [ ] **Frontend: Calendário:** Implementar a visualização em formato de calendário/diário.
- [ ] **Funcionalidade:** Integração com API de Livros (chave da API pendente).
- [ ] **Funcionalidade:** Sistema de achievements para jogos (importação e marcação).
- [ ] **Funcionalidade:** Log de episódios de séries.
- [ ] **Refatoração:** Melhorar o tratamento de erros no frontend e backend.
- [ ] **Refatoração:** Implementar um sistema de autenticação mais robusto (ex: JWT) em vez de passar o `user_id` explicitamente.


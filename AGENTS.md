# Diretrizes para o Agente Logger

## 🚀 Fluxo Operacional
- **Aviso sobre PowerShell (5.1)**: **NUNCA** use `&&`. Use `; if ($?) { cmd2 }`.
- **Ambiente**: Segredos de backend (`.env` em `backend/`) são obrigatórios para enriquecimento de APIs (TMDB, IGDB, Steam, Google Books). Nunca faça commit deles.
- **Workflow**: Crie uma issue no GitHub, depois uma branch e, por fim, um PR para cada funcionalidade ou correção distinta.

## 🛠️ Build & Verificação
- **Frontend (`frontend/`)**:
  - Lint: `npm run lint`
  - Build/Typecheck: `npm run build`
  - Ordem: `lint` -> `build`
- **Backend (`backend/`)**:
  - Verificação de sintaxe: `.\venv\Scripts\python.exe -m py_compile app/main.py`

## 🏗️ Arquitetura & Estilo
- **Monorepo**: Backend (FastAPI) e Frontend (React/Vite).
- **Design System**:
  - Variáveis CSS para cores: `--mdf-bg: #0A0C10`, `--mdf-surface: #14181C`.
  - Cor de Destaque: Injetada via `user.accent_color` na variável CSS `--accent`.
- **Enriquecimento de Mídia**: Itens de mídia são enriquecidos automaticamente por APIs externas na criação/atualização.
- **TypeScript**: `verbatimModuleSyntax` e `erasableSyntaxOnly` ativos. Evite `enum`; use tipos de união + arrays de valores. Sempre use `import type`.

## ⚙️ Restrições Principais
- **Autenticação**: Sem senha, apenas `username`.
- **Status**: 4 por tipo de mídia (completed, in_progress, dropped, wishlist).
- **Favorito**: Toggle booleano independente do status.
- **Poster Tiles**: Layout padronizado com badge ❤️ e estatísticas.
- **Barra lateral esquerda**: Travada em 203px, não colapsa. Right sidebar colapsa para 56px.
- **Conteúdo central**: Margens fixas (left: 203px, right: 324px) - não redimensiona ao colapsar sidebar.
- **MediaTypeProfilePage seções**: Ordem fixa: Top 5 → Recentes → Em Progresso → Lista de Desejos → Finalizados → Abandonados → Reviews → Todos → Listas Personalizadas.
- **MediaTypeProfilePage stats**: Contador de cards soma completed + in_progress + dropped (não wishlist).
- **Review snapshots**: Endpoint PUT cria LogReview apenas quando review/rating/platform mudam (evita duplicidade ao editar status).

## 📋 Pendências (TODO)
1. **Início**: ~~Arrumar a página inicial (HomePage)~~ ✅
2. **Páginas de mídia**: ~~Arrumar as páginas individuais de cada tipo de mídia (MediaTypeProfilePage)~~ ✅
12. **Edição de layout por tipo de mídia**: No MediaTypeProfilePage, permitir ao usuário reordenar as seções (drag-and-drop), ocultar Top 5, e selecionar quais listas personalizadas exibir (salvar config per-media-type no campo `section_order` do User)
3. **Perfil na sidebar**: ~~Mudar o layout do perfil na barra lateral esquerda~~ ✅
4. **Cadastro completo**: ~~Implementar cadastro de usuário com email e senha (atualmente só username)~~ ✅
5. **Interação entre contas**: Implementar sistema de seguir/curtir posts na timeline
6. **Timeline**: Implementar feed/timeline com posts dos seguidos
7. **Importação de logs**: Implementar importação de logs de outras plataformas (ex: Letterboxd, IGDB, etc)
8. **Reviews acima de conquistas**: ~~Mover as reviews de dentro da aba de conquistas do log de jogo para antes dela~~ ✅
9. **Medalhas/Conquistas do Usuário**: Sistema de badges que o usuário desbloqueia ao atingir marcos (ex: 10, 50, 100 mídias assistidas/jogadas/lidas, primeiro log, primeira review, streak de logs, completar todos os jogos de uma franquia, etc). Ideia é motivar o usuário a logar tudo o que consome.
10. **Publicação**: Publicar o site, avaliar ferramentas de hosting do GitHub Students
11. **Sidebar estilo Twitter mobile**: ~~Reorganizar a barra lateral esquerda seguindo o layout do Twitter/X mobile (perfil no topo, nav items minimalistas, ícones apenas ou com labels compactos)~~ ✅

## 📁 Estrutura de Pastas Importantes
- `backend/app/api/endpoints/media.py` - Endpoints de mídia, top lists, favoritos
- `backend/app/crud/crud_media.py` - CRUD de mídia, logs, favoritos
- `backend/app/crud/crud_top_list.py` - CRUD de top 5 lists
- `frontend/src/components/sections/TopListsSection.tsx` - Componente Top 5
- `frontend/src/components/RightSidebar.tsx` - Sidebar direita (analytics, activity graph)
- `frontend/src/components/LeftSidebar.tsx` - Sidebar esquerda (navegação fixa)
- `frontend/src/pages/ProfilePage.tsx` - Perfil do usuário
- `frontend/src/pages/MediaTypeProfilePage.tsx` - Perfil filtrado por tipo de mídia
- `frontend/src/pages/ReviewsPage.tsx` - Página de reviews (histórico de reviews por log)
- `frontend/src/pages/DiaryPage.tsx` - Diário de reviews
- `frontend/src/pages/LogDetailPage.tsx` - Detalhe do log (reviews, conquistas, temporadas)
- `frontend/src/pages/TimelinePage.tsx` - Timeline (placeholder, em desenvolvimento)
- `backend/app/crud/crud_custom_list.py` - CRUD de listas personalizadas

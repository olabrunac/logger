# YGP Design Reference

Reference extracted from YourGamerProfile visual analysis. Use when implementing profile features.

## Theme & Colors

- **Base**: Dark Mode (`#0E1015` or similar)
- **Accent Color**: User-customizable (default: vibrant neon purple)
- **Accent application**: Card borders, primary buttons, active menu items, progress bars, activity graphs, star selections, active state markers
- **Support colors**: Dark gray/antracite (cards, panels, modals, inputs), Light blue (save button, platform tag borders), White/light gray (primary/secondary typography), Green (positive status badges like "100%"), Yellow/Gold (main highlight, crown for "Top 1")

## Layout (Desktop 3-column grid)

- **Left column**: Fixed sidebar navigation
- **Center column**: Fluid, scrollable, main content (modular)
- **Right column**: Fixed widgets and charts

## Sidebar Navigation

- Top: Text logo
- Body: Vertical link list with linear icons. Active item gets accent color on icon, text, and a thin vertical border on the left edge
- Footer: Version, "Powered by IGDB", support links, mini user avatar

## Profile Header & Stats

- **Banner**: 1400x300px ideal, max 5MB, JPEG/PNG/WebP/GIF
- **Avatar**: Round, overlapping banner bottom
- **User info**: Username, bio, linked platform icons (Steam, Xbox, etc.)
- **Stats** (top of profile, reorderable in settings except "Jogos" count which is fixed first):
  - Average Hours Played
  - Average Completion (format: %)
  - Average Rating (star average)

## Central Modules (Drag & Drop, Desktop/Mobile separate configs)

### Allowed sections:
1. Jogos Favoritos
2. Vitrine de Troféus
3. Jogos Recentes
4. Reviews
5. Insígnias da Franquia
6. Biblioteca de Jogos Completa
7. Galeria (Screenshots)
8. Personagens Favoritos
9. Setup (Images or Specs)
10. Mural de Comentários

**EXCLUDED**: Guias (do NOT implement)

### A. Favorite Games (strict spec)
- Exactly 5 cards in a horizontal row, 3px gap
- Card: cover art fills 100% background (3:4 ratio)
- Selected card border = accent color. Top 1 gets a crown icon on top
- Card footer (dark overlay with gradient):
  - Bottom-left: Platform icon in semi-transparent box
  - Bottom line: Trophy icon + achievement fraction (e.g. 33/106). If 100% completed → green badge "100%"
  - Clock icon + play time (e.g. 239h 14m)

### B. Full Game Library (list)
- Search bar + combined filters (Status, Sources, Platforms)
- List item: square mini cover, title, rounded status tags, achievement/time metrics, thin linear progress bar under title

### C. Reviews
- Mini cover left, game title, 5-star rating, review date, text summary, "Ler mais" button

## Right Column Widgets

- **Rating Distribution**: Stylized bar chart, no visible axes, rounded bars filled with accent color. Shows quantity of 1-5 star ratings. Top shows exact average and total review count
- **Main Genres**: Radar/Spider chart with 4 axes (Indie, RPG, Shooter, Simulator), inner polygon filled with semi-transparent accent color
- **Activity Map**: GitHub-style heatmap, last 90 days, Y-axis shows initials (S, Q, S, D), legend "Less" to "More" with 5 opacity tones of accent color
- **Platforms**: Colored donut chart showing each platform's share
- **Highlights & Medals**: Lists with round icons and highlighted backgrounds for records

## Add/Edit Game Modal

- Floating centered popout
- Header: mini cover, name, developer, year, genre tags
- Interactive sections:
  - Status: 5 large square buttons with icons (Jogando, Finalizado, Completado, Pausado, Abandonado). Only selected is opaque
  - Rating: 5 large stars input
  - Platform: Text pills/tags. Selected gets blue highlight
  - Accordions: Hidden/shown inputs for "Datas" and "Tempo de jogo"
- Footer: Wide blue "Salvar" button

## Settings Interface

- **Feed Tabs**: List interface to reorder tabs using drag & drop
- **Avatar**: Upload button + grid of square avatars for quick selection. Active gets purple border
- **Accent Color**: Swatch circles, HEX code input, dark preview box showing how color affects links/badges
- **Profile Layout Control (Desktop/Mobile)**: Module list with drag handle on left (order) and eye icon on right (visibility toggle). Hidden modules appear dimmed

## Rules / Exclusions

- NO community feed (social posts, community tags, deals). Only tab ordering in settings
- NO real third-party account linking/importing (logger is manual)
- NO option to change avatar from round to square (round only)
- NO "Guias" module in profile section editor

---

## Detailed Design Specs

### Global Style Rules

- **Background Base**: Deep dark blue/black (`#0E1015`)
- **Panel/Card Background**: Slightly lighter than base to create depth
- **Accent Color**: Vibrant neon purple (ex: `#A855F7`). Used for active states and chart fills
- **Text**: White for titles and main text, light gray for support text and legends
- **Typography**: Clean modern sans-serif (ex: Inter or Roboto)

### Left Column — Sidebar Navigation

- **Behavior**: Fixed position, 100vh height, contained and fixed width
- **Top**: Text logo "YOUR GAMER PROFILE" uppercase, bold font
- **Body (Menu)**: Vertical list of links (Feed, Perfil, Buscar, Reviews, Loja, Notícias, etc.)
  - Each link has a minimal linear icon to the left of text
  - **Active state**: Current page item gets accent color on text and icon + a thin left vertical border (~3px) of the same color
  - **Hover**: Subtle glow or color change on text
- **Footer**:
  - Tiny gray text: Version (v1.3.0), "Powered by IGDB" (IGDB in purple), inline links (Termos, Privacidade, Suporte)
  - Mini profile at bottom: Small round avatar, bold username, @ symbol in gray below

### Right Column — Widgets & Analytics

- **Behavior**: Fixed width, positioned right, vertically stacked widgets with consistent gap
- **Widget design**: Each widget has a title at top-left with a small vertical accent color stroke before the text

#### Widget 1: Avaliações (Ratings)
- Stylized bar chart (no Cartesian axes, just bars)
- 5 bars (1-5 stars) filled with accent color
- Top-right of widget: average rating (ex: "4.0") with star icon + review count in parentheses

#### Widget 2: Principais Gêneros
- Radar/Spider chart with 4 points (ex: Indie, RPG, Shooter, Simulator)
- Internal affinity area = polygon filled with semi-transparent accent color

#### Widget 3: Mapa de Atividade
- GitHub-style contribution heatmap, last 90 days
- Small circle matrix. Left legend: day initials (S, Q, S, D). Bottom legend: "Menos" to "Mais" showing 5 opacity variations of accent color

#### Widget 4: Destaques (Highlights)
- Vertical list of records. Each item has a round icon with dark background and accent color drawing (ex: Steam logo, clock, trophy)
- Next to icon: main data in highlight (ex: "22h"), gray legend below (ex: "Tempo Médio por Jogo")

#### Widget 5: Plataformas
- Colored Donut (ring) chart showing platform distribution
- Simple text legend with colored dots below

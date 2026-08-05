# YGP Design Reference

Reference extracted from YourGamerProfile visual analysis. Use when implementing profile features.

---

## Mobile Layout Reference (extracted from YGP mobile profile HTML — `exemplo perfil mobile.txt`)

Full page capture (`<body>` → `</body>`), 4776 formatted lines. Mobile-only blocks use `lg:hidden`; desktop counterparts use `hidden lg:block` and render in the same DOM (both are present, React renders both and toggles via CSS breakpoints).

### Global (mobile)

- **Pinch-zoom disabled**: scripts prevent `gesturestart`, `gesturechange` and `touchmove` with >1 touch.
- **Fonts**: Inter variable + JetBrains Mono (CSS module vars), `antialiased`.
- **App shell**: `mx-auto flex min-h-screen w-full max-w-[1600px] bg-background lg:border-x lg:border-input`.
- **Profile accent CSS vars** (set inline on the content wrapper): `--primary: #A855F7`, `--primary-foreground: #FFFFFF`, `--star-fill: var(--primary)`.
- **Main content top padding**: `pt-[calc(3rem+env(safe-area-inset-top,0px))] lg:pt-0` — compensates the fixed mobile header; content goes edge-to-edge (no side margins on mobile).
- **Safe areas**: mobile drawer footer uses `pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]`.

### Mobile Header (`lg:hidden`)

- `safe-top fixed inset-x-0 top-0 z-40 flex min-h-14 items-end justify-between px-4 pb-2` + `bg-background/90 backdrop-blur-md`; hides on scroll down (`-translate-y-full opacity-0`).
- Left: hamburger button `h-11 w-11` (icon `lucide-menu h-6 w-6`), `active:scale-95 active:opacity-80`.
- Center: logo `text-xs font-bold tracking-[1.5px] text-foreground`.
- Right: invisible spacer `h-11 w-11` to balance the 3-column layout.

### Mobile Nav Drawer

- **Overlay**: `fixed inset-0 z-[60] bg-black/60`, `transition-opacity duration-300`; closed = `opacity-0 pointer-events-none`.
- **Drawer**: `fixed inset-y-0 left-0 z-[61] flex w-[min(300px,80vw)] flex-col border-r border-input bg-background transition-transform duration-300 lg:hidden`; closed = `-translate-x-full`; easing `cubic-bezier(0.32, 0.72, 0, 1)`.
- **Items**: `flex h-12 items-center gap-4 px-5 text-base font-medium` with icons `h-[22px] w-[22px]`; `active:bg-card`.
- **Footer area**: CTA button (`bg-primary text-sm font-semibold`), version link (`text-[11px] font-semibold`), "Powered by IGDB", legal links (`text-xs`), all centered.

### Profile Hero Mobile (`profile-hero-mobile lg:hidden`)

- **Banner**: `max-height: 140px`, img `min-h-[140px] w-full object-cover`; bottom gradient overlay `absolute inset-x-0 bottom-0 h-24` from `transparent` → `rgb(11, 13, 18)` (≈ Logger `--mdf-bg`).
- **Actions**: `absolute right-3 top-3 z-20`.
- **Info block**: `flex flex-col items-center -mt-16 px-5` — avatar **overlaps** banner by `-mt-16`.
- **Avatar**: 88×88, `rounded-full ring-[3px] ring-black/30`, centered; `bg-primary` fallback behind the image.
- **Username**: `text-lg font-bold`.
- **Platform links**: `h-5 w-5 rounded` brand-colored boxes with `h-3 w-3 text-white` icon (Steam `rgb(27,40,56)`, Xbox `rgb(16,124,16)`).
- **Counters row**: `mt-2 flex items-center gap-4 text-xs text-muted-foreground`, numbers `font-bold text-foreground` (e.g. "7 Jogos / 1 Seguindo / 1 Seguidores").
- Bottom divider: `border-t border-input`.

### Stats Row (`profile-hero-stats-row`)

- `flex justify-around px-4 py-3`; separated by `border-t border-input`.
- Each stat: `flex flex-col items-center gap-0.5`:
  - icon `h-3.5 w-3.5` with `color: var(--primary)` (accent)
  - value `text-sm font-bold tabular-nums text-foreground`
  - label `text-[9px] text-placeholder`
- Order/links (YGP): Jogos → `?tab=all`, Finalizados → `?tab=finished`, Completados → `?tab=completed`; Conquistas and Horas are buttons (no link).

### Profile Tabs (below hero)

- `flex items-center border-b border-t border-input` — equal tabs, each `flex-1 py-3`, label `text-xs font-medium`.
- Active = `color: var(--foreground)`; inactive = `var(--muted-foreground)`; disabled feature (Estatísticas/Galeria) = `opacity-40` + `--placeholder`.
- Tabs: Perfil, Jogos, Reviews (count badge `text-[10px] font-bold tabular-nums` in accent), Listas, Galeria (disabled), Guias, Atividade, Insígnias, Estatísticas (disabled).

### Quick Access Icons Row (mobile only, `px-5 lg:hidden`)

- `flex items-center justify-between px-1` — one icon per profile sub-page.
- Icon chip: `h-10 w-10 rounded-xl` with `background-color: rgba(accent, 0.1)` + lucide icon `h-[18px] w-[18px]` in accent color.
- Label below: `text-[9px] font-semibold text-muted-foreground`; `active:scale-[0.95]` on tap.
- Badge (unread count): `absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-input px-1 text-[8px] font-bold tabular-nums`.
- Items: Jogos, Reviews, Listas, Galeria (disabled `opacity-40`), Guias, Atividade, Insígnias, Estatísticas.

### Profile Body Wrapper

- `flex flex-col gap-4 px-5 pb-24 lg:gap-8 lg:px-6 lg:pb-12` — **`pb-24` on mobile** (room for FABs), `gap-4` mobile vs `gap-8` desktop.

### Section Header Pattern

- `flex items-center justify-between` header.
- Title: `h2 flex items-center gap-2.5 text-sm font-bold text-foreground lg:text-xl` with left accent bar `span block h-4 w-1 rounded-sm lg:h-5 bg-primary`.
- "Ver Todos" link (when section has more): `flex items-center gap-0.5 text-xs font-medium text-primary` + `lucide-chevron-right h-3.5 w-3.5`.

### Jogos Favoritos (5 tiles)

- Mobile: `flex items-end justify-center gap-1.5 lg:hidden`, each tile `min-w-0` `width: calc(20% - 4.8px)`.
- Desktop: `hidden gap-2 lg:flex lg:items-end lg:justify-center`, each `width: calc(20% - 6.4px)`.
- Top-1 (goat): wrapper `cover-goat-glow outline outline-2 mt-5` with `outline-color: rgb(245, 158, 11)` (amber) + crown icon absolutely centered above (`-top-5`, amber fill `#F59E0B`).
- Cover: `aspect-[3/4] w-full object-cover`; tile `bg-card border border-input` (except goat `cover-goat-shimmer`).
- **Overlay info is `hidden lg:flex`** (desktop only): platform badge top-left `h-5 w-5 rounded`, bottom gradient `h-14 bg-gradient-to-t from-black/80`, and chips (hours `bg-black/40`, achievements, green "100%" `bg-[#6FFF6F]/15 text-[#6FFF6F]`). On mobile tiles are clean covers.

### Vitrine de Troféus (marquee)

- `group/marquee relative overflow-hidden` wrapping `flex w-max gap-1.5 px-3 lg:px-0` — horizontal auto-scroll (marquee).
- Trophy tile: `w-16 h-16 lg:w-20 lg:h-20`, `border border-input bg-card`; platform badge `h-4 w-4 lg:h-5 lg:w-5` bottom-left (Steam `rgb(27,40,56)`); hover `scale-110`.

### Jogos Recentes

- Mobile: horizontal scroll carousel — `scrollbar-hide -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 lg:hidden`, each tile `w-[28%] shrink-0` (≈3.5 tiles visible).
- Desktop: grid `width: calc(20% - 6.4px)` (5 per row, gap).
- Cover: `aspect-[3/4] w-full border border-input bg-card`, hover `border-primary`.
- Below cover: `mt-1.5 flex items-center justify-between gap-2` — star rating (mobile: single star icon `h-3 w-3` accent `var(--user-accent, #F59E0B)` + `text-[11px] font-medium tabular-nums`; desktop: 5 partial-fill stars via nested overflow) OR empty `<span>`, and date `text-[11px] tabular-nums text-placeholder`.

### Right Rail (desktop)

- `hidden w-[340px] shrink-0 flex-col gap-6 border-l border-input pl-6 pr-6 pt-6 lg:flex`.

### FAB "Scroll to top"

- `fixed right-4 z-40 h-14 w-14 rounded-full shadow-lg`; mobile bottom `calc(5rem+var(--ygp-spotify-fab-h,0px)+var(--ygp-rail-fab-h,0px))`, desktop `right-[var(--ygp-fab-right,2rem)] bottom-[calc(6rem+…)]`.
- Accent background `var(--profile-fab-accent, var(--user-accent, var(--color-primary)))`, foreground white, shadow `color-mix(in srgb, accent 30%, transparent)`.
- Hidden until scroll: `pointer-events-none translate-y-4 opacity-0` (revealed with `translate-y-0 opacity-100`).

### Play Store Install Banner (mobile only)

- `fixed inset-x-0 top-[calc(env(safe-area-inset-top)+56px)] z-30 flex items-center gap-3 border-b border-input bg-card px-4 py-3 lg:hidden`, `shadow-[0_4px_20px_rgba(0,0,0,0.35)]`.
- Text `text-sm font-semibold`, "Instalar" button `rounded-xl bg-primary px-4 py-2 text-sm font-semibold`, dismiss X `text-placeholder`.

### Meta / Misc

- Viewport: `width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no`; `theme-color: #0B0D12`.
- Profile accent (`accentColor: #A855F7`) applied globally as `--user-accent`; FAB/trophy colors use `--profile-fab-accent` fallback chain.
- Layout config is server-side JSON: `desktopProfileLayout` (games, favorites, franchiseBadges, guides, reviews, trophies, recentGames), `profileRailLayout` (medals, yearInReview, ratingDistribution, topGenres, activityHeatmap, highlights, platformChart, setupRailScreenshot, setupRailSpecs), separate `mobileProfileLayout` (null in this dump — independent desktop/mobile section ordering).

### Notes for Logger adaptation (Onda 5 #13 mobile part)

- Left sidebar (203px fixed) should be replaced by this drawer pattern on small screens: hamburger header + slide-in drawer + overlay, `w-[min(300px,80vw)]`.
- Hero mobile: banner 1400×300 kept but rendered `max-height: 140px` with overlapping centered avatar (`-mt-16`, 88px), username below, counters + accent-colored stat row — maps to Logger's profile stats (completed/in_progress/dropped count, hours via `effective_hours`, badges).
- Use `env(safe-area-inset-top/bottom)` and disable pinch-zoom on mobile viewport meta.
- Poster grids on mobile: Favoritos/Top 5 as 5-tile row (`calc(20% - 4.8px)`, 3:4, clean covers); "Recentes" as horizontal carousel `w-[28%] shrink-0` with rating+date under the cover. YGP's `YgpCard` desktop overlay (platform/hours/ach/100%) stays desktop-only (`hidden lg:flex`).
- Quick Access icon row (`h-10 w-10`, `bg-accent/10`, `text-[9px]` label) replaces the per-type subpage links on mobile; accent bar section headers + "Ver Todos" (chevron) pattern applies to all profile sections.

---

## Logged-In Navigation (extracted from YGP Feed page with nav drawer open — `exemplo menu ygp.txt`)

Logged-in dump: body has `style="overflow: hidden; touch-action: none;"` (scroll locked because the drawer is open). `--user-accent:#A855F7; --user-accent-fg:#FFFFFF` set on `data-app-shell`.

### Desktop Sidebar (logged-in) — `w-[260px]`

- **Logo**: accent bar `h-5 w-[3px] rounded-sm` (`--profile-fab-accent` fallback chain) + `text-base font-bold tracking-[1px]`, `px-3 pt-6 pb-2`.
- **Nav items** (`nav flex flex-1 flex-col gap-1 px-3`): `flex h-11 items-center gap-3 rounded-xl px-3`.
  - Active: `text-foreground` + left accent bar `absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-sm`.
  - Inactive: `text-muted-foreground hover:bg-card/50 hover:text-foreground`.
  - Icon `h-5 w-5`, label `text-sm font-medium`. Items: Feed (house), Perfil (user), Buscar (search), Reviews (pen-line), Loja (store), Notícias (newspaper), Notificações (bell), Comunidades (users), Rankings (trophy), Premium (crown), Apoiadores (heart), Configurações (settings).
- **Footer**: version `text-[11px] font-semibold text-placeholder`, "Powered by IGDB" (accent link), legal links `text-xs`.
- **User block** (`border-t border-input p-3`, `flex h-11 items-center gap-3 px-3`): avatar 36px round, username `text-sm font-semibold`, `@username` `text-xs text-muted-foreground`, logout button `h-8 w-8 rounded-lg text-muted-foreground hover:bg-red-950/40 hover:text-red-400` + `lucide-log-out h-4 w-4`.

### Mobile Header (logged-in)

- Same fixed header as before, but left button = **avatar 32px** (opens drawer), center logo, right = **bell** link to `/notifications` (logged-out dump had hamburger left / spacer right).

### Mobile Nav Drawer (logged-in, OPEN state)

- Overlay active: `bg-black/60` + `pointer-events-auto opacity-100`; drawer `translate-x-0` (open) vs `-translate-x-full` (closed).
- **User header** (`border-b border-input px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]`): avatar 44px round, username + `@username`, logout `h-9 w-9 rounded-lg text-red-500 hover:bg-red-500/10`.
- **Nav items**: `flex h-12 items-center gap-4 px-5 text-base font-medium`, icon `h-[22px] w-[22px]`; active = `text-foreground` (+ `aria-current="page"`), inactive `text-muted-foreground`, `active:bg-card`. Same item list as desktop.
- **Footer**: version + "Powered by IGDB" + legal links, `pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]`. (Logged-out drawer instead had an "Entrar" CTA `bg-primary` above the footer.)

### Feed Page (logged-in, `/feed`)

- Page container: `flex min-w-0 flex-1 flex-col gap-3 px-4 pt-3 pb-24 lg:gap-4 lg:border-r lg:border-input lg:px-10 lg:pt-6 lg:pb-12` — mobile `pb-24` (FAB space), desktop has right border.
- Title `h1 text-2xl font-bold` is `hidden lg:block` (mobile relies on the fixed header).
- **Stories row**: `flex cursor-grab gap-3 overflow-x-auto` (hidden scrollbar), item width 56px; own story = dashed ring `border-2 border-dashed border-placeholder` + `+` button `h-5 w-5 bg-primary ring-2 ring-background`; label `text-[10px] text-muted-foreground`.
- **Feed tabs** (`relative -mx-4 flex border-b border-input px-4`): Jogos / Todos / Seguindo / Minha Atividade (last one `hidden lg:flex`). Active = `font-semibold text-foreground`; inactive `font-medium text-muted-foreground`. Animated underline: `absolute -bottom-px h-0.5 bg-primary` — mobile `w-[calc((100%-2rem)/3)]`, desktop `w-[calc((100%-5rem)/4)]`, slides via `translateX` with `transition-transform duration-300 ease-out`. Each tab has a filter chevron button `h-7 w-7 rounded-full`.
- **Feed cards**: list `divide-y divide-input`; card `-mx-4 rounded-xl px-4 py-5 hover:bg-input/20`; header row = avatar 40px (may have animated SVG border ring `animate-spin-slow`, gradient `#fbecda`), username `text-sm font-semibold` + role pill `text-[9px] font-bold` (`bg-violet-400/12 text-violet-400` e.g. "Explorador"), relative time `text-xs text-placeholder`, ellipsis menu `h-8 w-8 rounded-full`.
- Media line: cover thumb `h-[4.5rem] aspect-[3/4] rounded-[1px] bg-white/35 p-px` (white 1px frame + shadow), caption `text-sm text-placeholder`, title `text-[15px] font-semibold`.

### Notes for Logger adaptation (nav part of Onda 5 #13)

- LeftSidebar logged-in footer = user block (avatar + username + @handle + logout). Logged-out = "Entrar" CTA.
- Mobile drawer open = scroll-lock body (`overflow:hidden; touch-action:none`) + overlay `pointer-events-auto`; close = `-translate-x-full`.
- Feed tabs pattern (active underline sliding with `translateX`, filter chevron per tab) can be reused by Logger's Timeline filters; mobile shows fewer tabs (`hidden lg:flex` for the extra one).

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

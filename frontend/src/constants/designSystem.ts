export const TYPE_META: Record<string, { emoji: string; color: string; label: string; singular: string; slug: string }> = {
  movie: { emoji: '🎬', color: '#fbbf24', label: 'Filmes', singular: 'Filme', slug: 'movies' },
  series: { emoji: '📺', color: '#ef4444', label: 'Séries', singular: 'Série', slug: 'tvshows' },
  game: { emoji: '🎮', color: '#60a5fa', label: 'Jogos', singular: 'Jogo', slug: 'games' },
  book: { emoji: '📚', color: '#4ade80', label: 'Livros', singular: 'Livro', slug: 'books' },
};

export const TYPE_COLORS: Record<string, string> = {
  movie: '#fbbf24',
  series: '#ef4444',
  game: '#60a5fa',
  book: '#4ade80',
};

export const TYPE_EMOJI: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  game: '🎮',
  book: '📚',
};

export const STATUS_COLORS: Record<string, string> = {
  completed: 'rgba(34,197,94,0.85)',
  in_progress: 'rgba(59,130,246,0.85)',
  dropped: 'rgba(239,68,68,0.85)',
  wishlist: 'rgba(168,85,247,0.85)',
  soon: 'rgba(168,85,247,0.85)',
  platinated: 'rgba(250,204,21,0.85)',
  library: 'rgba(99,102,241,0.85)',
};

export const STATUS_ICONS: Record<string, string> = {
  completed: '✓',
  in_progress: '•••',
  dropped: '💀',
  wishlist: '★',
  soon: '…',
  library: '📚',
};

export const getStars = (rating?: number): string[] => {
  if (!rating) return [];
  const stars: string[] = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) stars.push('full');
    else if (i - 0.5 <= rating) stars.push('half');
    else stars.push('empty');
  }
  return stars;
};

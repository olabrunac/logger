import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import type { IncompleteEntry, WhatToDoResponse } from '../types/suggestions';
import { TYPE_META } from '../constants/designSystem';
import { Star, Heart, PlayCircle, Gamepad2, BookOpen, Sparkles, ListChecks } from 'lucide-react';
import { getApiId, getMediaUrl, imageUrl } from '../utils';

interface WhatToDoPageProps {
  user: User;
}

type TypeFilter = 'all' | 'movie' | 'series' | 'game' | 'book';

const FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'movie', label: 'Filmes' },
  { value: 'series', label: 'Séries' },
  { value: 'game', label: 'Jogos' },
  { value: 'book', label: 'Livros' },
];

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em progresso',
  completed: 'Finalizado',
  dropped: 'Abandonado',
  wishlist: 'Lista de desejos',
  soon: 'Em breve',
  platinated: 'Platinado',
  library: 'Biblioteca',
};

function PosterTile({ item }: { item: WhatToDoResponse['suggestions'][number] }) {
  const meta = TYPE_META[item.media.media_type] || TYPE_META.game;
  const apiId = getApiId(item.media);
  return (
    <Link
      key={item.media.id ?? apiId}
      to={getMediaUrl(item.media)}
      className="group block"
      title={item.media.title}
    >
      <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: '3/4', background: meta.color + '22' }}>
        {item.media.cover_image_url ? (
          <img src={imageUrl(item.media.cover_image_url) || ''} alt={item.media.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">{meta.emoji}</div>
        )}
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide" style={{ background: 'rgba(10,12,16,0.8)', color: meta.color }}>
          {meta.singular}
        </span>
        {item.in_wishlist && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5" style={{ background: 'rgba(168,85,247,0.9)', color: '#fff' }}>
            <Star size={9} className="fill-current" /> Na lista
          </span>
        )}
        {item.match_genres.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
            {item.match_genres.slice(0, 2).map(g => (
              <span key={g} className="px-1.5 py-0.5 rounded text-[9px] bg-black/70 text-white/80 truncate max-w-full">{g}</span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1.5 text-xs text-white/70 truncate group-hover:text-white transition-colors">{item.media.title}</div>
      <div className="text-[10px] text-white/35">
        {item.media.release_date ? new Date(item.media.release_date).getFullYear() : meta.singular}
      </div>
    </Link>
  );
}

function ProgressRow({ entry, mediaType }: { entry: IncompleteEntry; mediaType: string }) {
  const meta = TYPE_META[mediaType] || TYPE_META.game;
  const percent = entry.percent ?? 0;
  const label =
    mediaType === 'series'
      ? `${entry.watched_episodes}/${entry.total_episodes} episódios`
      : mediaType === 'game'
        ? `${entry.unlocked_achievements}/${entry.total_achievements} conquistas`
        : `${entry.pages_read}/${entry.page_count} páginas`;
  const remaining =
    mediaType === 'series'
      ? `${entry.remaining} eps.`
      : mediaType === 'game'
        ? `${entry.remaining} conquistas`
        : `${entry.remaining} págs.`;
  return (
    <Link
      to={getMediaUrl(entry.media)}
      className="flex items-center gap-3 p-3 mdf-card hover:bg-white/5 transition-colors group"
    >
      <div className="w-12 rounded-md overflow-hidden flex-shrink-0" style={{ aspectRatio: '3/4', background: meta.color + '22' }}>
        {entry.media.cover_image_url ? (
          <img src={imageUrl(entry.media.cover_image_url) || ''} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">{meta.emoji}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-white truncate group-hover:text-white transition-colors">{entry.media.title}</span>
          {entry.is_favorite && <Heart size={13} className="flex-shrink-0 fill-current" style={{ color: 'var(--accent)' }} />}
        </div>
        <div className="text-xs text-white/40 mb-1.5">
          {label}
          <span className="text-white/25 mx-1.5">·</span>
          {STATUS_LABELS[entry.status] || entry.status}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: meta.color }} />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-bold" style={{ color: meta.color }}>{Math.round(percent)}%</div>
        <div className="text-[10px] text-white/40">faltam {remaining}</div>
      </div>
    </Link>
  );
}

const WhatToDoPage = ({ user }: WhatToDoPageProps) => {
  const [data, setData] = useState<WhatToDoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/media/what-to-do', { params: { user_id: user.id } });
      if (requestId !== fetchIdRef.current) return;
      setData(res.data);
    } catch (err) {
      if (requestId !== fetchIdRef.current) return;
      console.error('Failed to fetch what-to-do', err);
      setError('Não foi possível carregar as sugestões.');
    } finally {
      if (requestId === fetchIdRef.current) setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSuggestions = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.suggestions;
    return data.suggestions.filter(s => s.media.media_type === filter);
  }, [data, filter]);

  const incomplete = data?.incomplete;
  const hasAnyIncomplete = !!(incomplete && (incomplete.series.length > 0 || incomplete.games.length > 0 || incomplete.books.length > 0));
  const hasSuggestions = filteredSuggestions.length > 0;
  const hasGenres = !!data && data.genres.length > 0;

  const genreColor = (mt: string) => (TYPE_META[mt]?.color || '#fff') + '33';

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto py-8">
        <div className="mdf-card p-8 text-center text-white/50">Carregando sugestões...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1100px] mx-auto py-8">
        <div className="mdf-card p-8 text-center text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">O que fazer?</h1>
          <p className="text-sm text-white/40">Baseado no que você já registrou e no que está pela metade.</p>
        </div>
      </div>

      {hasGenres && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Seus gêneros favoritos</h3>
          <div className="flex flex-wrap gap-2">
            {data.genres.map(g => (
              <span key={`${g.genre}-${g.media_type}`} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: genreColor(g.media_type), color: TYPE_META[g.media_type]?.color || '#fff' }}>
                {g.genre}
              </span>
            ))}
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Sparkles size={16} style={{ color: 'var(--accent)' }} /> Sugestões para você
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.value ? 'text-black' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              style={filter === f.value ? { background: 'var(--accent)' } : { background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {hasSuggestions ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {filteredSuggestions.map(item => <PosterTile key={item.media.id ?? getApiId(item.media)} item={item} />)}
          </div>
        ) : (
          <div className="mdf-card p-8 text-center text-white/40 text-sm">
            {filter === 'all'
              ? 'Registre mais mídias para receber sugestões melhores.'
              : `Nenhuma sugestão de ${TYPE_META[filter]?.label.toLowerCase()}.`}
          </div>
        )}
      </section>

      {hasAnyIncomplete && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
            <ListChecks size={16} style={{ color: 'var(--accent)' }} /> Continuar de onde parou
          </h2>
          <p className="text-xs text-white/35 mb-3">Do mais perto de completar para o mais longe.</p>
          <div className="space-y-4">
            {incomplete!.series.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PlayCircle size={14} style={{ color: TYPE_META.series.color }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: TYPE_META.series.color }}>
                    Séries ({incomplete!.series.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {incomplete!.series.map(e => <ProgressRow key={e.log_id} entry={e} mediaType="series" />)}
                </div>
              </div>
            )}
            {incomplete!.games.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gamepad2 size={14} style={{ color: TYPE_META.game.color }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: TYPE_META.game.color }}>
                    Jogos ({incomplete!.games.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {incomplete!.games.map(e => <ProgressRow key={e.log_id} entry={e} mediaType="game" />)}
                </div>
              </div>
            )}
            {incomplete!.books.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} style={{ color: TYPE_META.book.color }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: TYPE_META.book.color }}>
                    Livros ({incomplete!.books.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {incomplete!.books.map(e => <ProgressRow key={e.log_id} entry={e} mediaType="book" />)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default WhatToDoPage;

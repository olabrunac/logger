import React, { useState, useEffect, useRef } from 'react';
import type { LogStatus } from '../types';
import type { MediaItem } from '../types/media';
import { ChevronLeft, ChevronDown, ChevronUp, X, Check, Gamepad2, Film, Tv, Book, Flag, MessageCircle, Skull, Eye, Heart, Clock, Calendar, Star } from 'lucide-react';
import { TYPE_META } from '../constants/designSystem';

interface LogFormProps {
  onSubmit: (logDetails: any) => void;
  onCancel: () => void;
  initialData?: any;
  mediaItem?: MediaItem;
  isEditing?: boolean;
}

const STATUS_CONFIG: Record<string, { options: { value: LogStatus; label: string; icon: typeof Film; color: string }[] }> = {
  game: {
    options: [
      { value: 'completed', label: 'Finalizado', icon: Flag, color: '#22c55e' },
      { value: 'in_progress', label: 'Jogando', icon: Gamepad2, color: '#3b82f6' },
      { value: 'wishlist', label: 'Pretendo Jogar', icon: MessageCircle, color: '#a855f7' },
      { value: 'dropped', label: 'Abandonado', icon: Skull, color: '#ef4444' },
    ],
  },
  movie: {
    options: [
      { value: 'completed', label: 'Assistido', icon: Flag, color: '#22c55e' },
      { value: 'in_progress', label: 'Assistindo', icon: Eye, color: '#3b82f6' },
      { value: 'wishlist', label: 'Pretendo Assistir', icon: Film, color: '#a855f7' },
      { value: 'dropped', label: 'Abandonado', icon: Skull, color: '#ef4444' },
    ],
  },
  series: {
    options: [
      { value: 'completed', label: 'Finalizado', icon: Flag, color: '#22c55e' },
      { value: 'in_progress', label: 'Assistindo', icon: Eye, color: '#3b82f6' },
      { value: 'wishlist', label: 'Pretendo Assistir', icon: Tv, color: '#a855f7' },
      { value: 'dropped', label: 'Abandonado', icon: Skull, color: '#ef4444' },
    ],
  },
  book: {
    options: [
      { value: 'completed', label: 'Lido', icon: Flag, color: '#22c55e' },
      { value: 'in_progress', label: 'Lendo', icon: Book, color: '#3b82f6' },
      { value: 'wishlist', label: 'Pretendo Ler', icon: Book, color: '#a855f7' },
      { value: 'dropped', label: 'Abandonado', icon: Skull, color: '#ef4444' },
    ],
  },
};

const PLATFORM_OPTIONS: Record<string, string[]> = {
  game: ['Steam', 'Epic Games', 'GOG', 'Xbox', 'PlayStation', 'Nintendo', 'Mobile', 'Pirata', 'Não especificado'],
  movie: ['Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Cinema', 'Blu-ray', 'Stremio', 'Não especificado'],
  series: ['Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Crunchyroll', 'Stremio', 'YouTube', 'Não especificado'],
  book: ['Físico', 'Kindle', 'PDF', 'Audiobook', 'Web', 'Pirata', 'Não especificado'],
};

const LogForm: React.FC<LogFormProps> = ({ onSubmit, onCancel, initialData, mediaItem, isEditing = false }) => {
  const mediaType = mediaItem?.media_type || 'game';
  const meta = TYPE_META[mediaType] || TYPE_META.game;
  const statusConfig = STATUS_CONFIG[mediaType] || STATUS_CONFIG.game;
  const platformOptions = PLATFORM_OPTIONS[mediaType] || PLATFORM_OPTIONS.game;

  const [status, setStatus] = useState<LogStatus>(initialData?.status || statusConfig.options[0].value);
  const [rating, setRating] = useState<number>(initialData?.rating || 0);
  const [platform, setPlatform] = useState(initialData?.platform || '');
  const [hoursSpent, setHoursSpent] = useState<string>(initialData?.hours_spent?.toString() || '');
  const [pagesRead, setPagesRead] = useState<string>(initialData?.pages_read?.toString() || '');
  const [logDate, setLogDate] = useState(initialData?.log_date ? initialData.log_date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [isFavorite, setIsFavorite] = useState(initialData?.is_favorite || false);
  const [review, setReview] = useState<string>(initialData?.review || '');
  const [showDates, setShowDates] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setStatus(initialData.status);
      setRating(initialData.rating || 0);
      setPlatform(initialData.platform || '');
      setHoursSpent(initialData.hours_spent?.toString() || '');
      setPagesRead(initialData.pages_read?.toString() || '');
      setLogDate(initialData.log_date ? initialData.log_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setIsFavorite(initialData.is_favorite || false);
      setReview(initialData.review || '');
    }
  }, [initialData]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  const isWishlist = status === 'wishlist' || status === 'soon';

  const handleSubmit = () => {
    if (isWishlist) {
      onSubmit({
        status,
        rating: null,
        platform: platform || null,
        hours_spent: null,
        pages_read: undefined,
        log_date: new Date().toISOString(),
        is_favorite: false,
        relog_count: undefined,
        review: null,
      });
    } else {
      onSubmit({
        status,
        rating: rating || null,
        platform: platform || null,
        hours_spent: mediaType === 'book' ? (hoursSpent ? Number(String(hoursSpent).replace(',', '.')) : null) : (hoursSpent ? Number(String(hoursSpent).replace(',', '.')) : null),
        pages_read: mediaType === 'book' ? (pagesRead ? Number(pagesRead) : null) : undefined,
        log_date: logDate ? new Date(logDate).toISOString() : new Date().toISOString(),
        is_favorite: isFavorite,
        relog_count: undefined,
        review: review || null,
      });
    }
  };

  const renderStars = () => {
    const displayRating = hoveredStar !== null ? hoveredStar : rating;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const starValue = i + 1;
          const fillPercent = displayRating >= starValue ? 100
            : displayRating >= starValue - 0.5 ? 50 : 0;
          return (
            <button
              key={starValue}
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const isLeftHalf = clickX < rect.width / 2;
                setRating(isLeftHalf ? starValue - 0.5 : starValue);
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const hoverX = e.clientX - rect.left;
                const isLeftHalf = hoverX < rect.width / 2;
                setHoveredStar(isLeftHalf ? starValue - 0.5 : starValue);
              }}
              onMouseLeave={() => setHoveredStar(null)}
              className="relative w-10 h-10 transition-transform hover:scale-110"
              aria-label={`${starValue} estrelas`}
            >
              <Star size={36} className="absolute inset-0" style={{ color: 'rgba(255,255,255,0.1)' }} />
              {fillPercent > 0 && (
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                  <Star size={36} fill="#F5C518" style={{ color: '#F5C518' }} />
                </div>
              )}
            </button>
          );
        })}
        <span className="ml-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="text-white font-bold">{rating || 0}</span> / 5
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div ref={modalRef} className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-bold text-white">
            {isEditing ? 'Editar' : isWishlist ? 'Adicionar à Lista' : 'Adicionar'} {meta.singular}
          </span>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Favorite toggle in media info */}
          {mediaItem && !isWishlist && (
            <div className="flex gap-4">
              {mediaItem.cover_image_url ? (
                <img src={mediaItem.cover_image_url} alt="" className="w-[70px] h-[93px] rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-[70px] h-[93px] rounded-lg flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: meta.color + '22' }}>
                  {meta.emoji}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-white font-bold text-base truncate flex-1">{mediaItem.title}</div>
                  <button
                    type="button"
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: isFavorite ? '#FA3380' : 'rgba(255,255,255,0.3)' }}
                  >
                    <Heart size={20} fill={isFavorite ? '#FA3380' : 'none'} />
                  </button>
                </div>
                {mediaItem.release_date && (
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {mediaItem.release_date}
                  </div>
                )}
                {mediaItem.genres && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mediaItem.genres.split(', ').slice(0, 4).map((genre: string) => (
                      <span key={genre} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Status
            </div>
            <div className="grid grid-cols-4 gap-2">
              {statusConfig.options.map((opt) => {
                const Icon = opt.icon;
                const isActive = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      opacity: isActive ? 1 : 0.5,
                      border: isActive ? `1px solid ${opt.color}44` : '1px solid transparent',
                    }}
                  >
                    <Icon size={22} style={{ color: isActive ? opt.color : 'rgba(255,255,255,0.4)' }} />
                    <span className="text-[9px] font-medium text-center leading-tight" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          {!isWishlist && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Avaliação
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {renderStars()}
              </div>
            </div>
          )}

          {/* Platform */}
          {!isWishlist && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {mediaType === 'game' ? 'Plataforma' : mediaType === 'book' ? 'Formato' : 'Onde Assistir'}
              </div>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((p) => {
                  const selected = platform.split(', ').filter(Boolean);
                  const isActive = selected.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        if (mediaType === 'book') {
                          if (isActive) {
                            setPlatform(selected.filter((s: string) => s !== p).join(', '));
                          } else if (selected.length < 2) {
                            setPlatform([...selected, p].join(', '));
                          }
                        } else {
                          setPlatform(isActive ? '' : p);
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded-full transition-all font-medium"
                      style={{
                        background: isActive ? 'var(--accent-bg)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                        border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                        opacity: mediaType === 'book' && !isActive && selected.length >= 2 ? 0.4 : 1,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accordions */}
          {!isWishlist && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDates(!showDates)}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Adicionar data</span>
                </div>
                {showDates ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </button>
              {showDates && (
                <div className="px-3 pb-3">
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full text-sm p-2 rounded-lg outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowTime(!showTime)}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-3">
                  <Clock size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {mediaType === 'book' ? 'Páginas e tempo' : 'Adicionar tempo'}
                  </span>
                </div>
                {showTime ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </button>
              {showTime && (
                <div className="px-3 pb-3 space-y-2">
                  {mediaType === 'book' ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={pagesRead}
                        onChange={(e) => setPagesRead(e.target.value)}
                        placeholder="Páginas"
                        className="w-full text-sm p-2 rounded-lg outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={hoursSpent}
                        onChange={(e) => setHoursSpent(e.target.value)}
                        placeholder="Horas"
                        className="w-full text-sm p-2 rounded-lg outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={hoursSpent}
                      onChange={(e) => setHoursSpent(e.target.value)}
                      placeholder="Horas"
                      className="w-full text-sm p-2 rounded-lg outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  )}
                </div>
              )}


              <button
                type="button"
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Review</span>
                  {review && <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />}
                </div>
                {showReview ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </button>
              {showReview && (
                <div className="px-3 pb-3">
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value.slice(0, 280))}
                    placeholder="Escreva sua opinião sobre esta mídia..."
                    rows={4}
                    maxLength={280}
                    className="w-full text-sm p-3 rounded-lg outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <div className="text-right text-[11px] text-white/30 mt-1">{review.length}/280</div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 pt-0 space-y-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm transition-all"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            <Check size={18} />
            {isEditing ? 'Salvar Alterações' : isWishlist ? 'Adicionar à Lista' : 'Salvar'}
          </button>
          {!isWishlist && (
            <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Você pode editar todos os detalhes depois
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogForm;

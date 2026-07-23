import React, { useState, useEffect } from 'react';
import type { LogStatus } from '../types';
import { LogStatusValues } from '../types';

interface LogFormProps {
  onSubmit: (logDetails: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const LogForm: React.FC<LogFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [status, setStatus] = useState<LogStatus>(LogStatusValues[1]); // "completed"
  const [rating, setRating] = useState<number | string>(initialData?.rating ?? '');
  const [review, setReview] = useState(initialData?.review ?? '');
  const [isFavorite, setIsFavorite] = useState(initialData?.is_favorite ?? false);
  const [isRelog, setIsRelog] = useState(initialData?.is_relog ?? false);
  const [platform, setPlatform] = useState(initialData?.platform ?? '');
  const [hoursSpent, setHoursSpent] = useState<number | string>(initialData?.hours_spent ?? '');
  const [logDate, setLogDate] = useState(initialData?.log_date ? initialData.log_date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  useEffect(() => {
    if (initialData) {
      setStatus(initialData.status);
      setRating(initialData.rating ?? '');
      setReview(initialData.review ?? '');
      setIsFavorite(initialData.is_favorite ?? false);
      setIsRelog(initialData.is_relog ?? false);
      setPlatform(initialData.platform ?? '');
      setHoursSpent(initialData.hours_spent ?? '');
      setLogDate(initialData.log_date ? initialData.log_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      status,
      rating: rating === '' ? null : Number(rating),
      review,
      is_favorite: isFavorite,
      is_relog: isRelog,
      platform: platform || null,
      hours_spent: hoursSpent === '' ? null : Number(String(hoursSpent).replace(',', '.')),
      log_date: logDate ? new Date(logDate).toISOString() : new Date().toISOString(),
    });
  };

  const renderStars = () => {
    const currentRating = rating === '' ? 0 : Number(rating);
    const displayRating = hoveredStar !== null ? hoveredStar : currentRating;

    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const fillPercent = displayRating >= starValue ? 100
        : displayRating >= starValue - 0.5 ? 50
        : 0;

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
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.75rem',
            cursor: 'pointer',
            padding: '0 0.125rem',
            lineHeight: 1,
            position: 'relative',
            transition: 'transform var(--transition)',
            transform: hoveredStar !== null ? 'scale(1.15)' : 'scale(1)',
          }}
          aria-label={`${starValue} estrelas`}
        >
          <span style={{ color: 'var(--border)' }}>★</span>
          {fillPercent > 0 && (
            <span style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${fillPercent}%`,
              overflow: 'hidden',
              color: 'var(--rating-gold)',
            }}>★</span>
          )}
        </button>
      );
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LogStatus)}
          className="form-select"
        >
          {LogStatusValues.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Nota (0-5)</label>
        <div className="rating-input">
          <div className="rating-stars">
            {renderStars()}
          </div>
          <span className="rating-value">
            {rating !== '' ? Number(rating).toFixed(1) : '—'}
          </span>
        </div>
        <p className="form-hint">Clique nas estrelas para avaliar (meias estrelas disponíveis)</p>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Plataforma</label>
          <input
            type="text"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Ex: PS5, Steam, Netflix, Kindle..."
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Horas gastas</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={hoursSpent}
            onChange={(e) => setHoursSpent(e.target.value)}
            placeholder="0"
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Data do log</label>
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Review</label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          placeholder="Escreva sua opinião, pensamentos, destaques..."
          className="form-textarea"
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="favorite-toggle">
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
          />
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>Favorito</span>
        </label>

        <label className="favorite-toggle" style={{ color: isRelog ? 'var(--accent)' : 'inherit' }}>
          <input
            type="checkbox"
            checked={isRelog}
            onChange={(e) => setIsRelog(e.target.checked)}
          />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>Rejogado/Reassistido/Relido</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
          {initialData ? 'Atualizar Log' : 'Salvar Log'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default LogForm;
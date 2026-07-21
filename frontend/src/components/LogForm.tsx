import React, { useState } from 'react';
import { LogStatus } from '../types';

interface LogFormProps {
  onSubmit: (logDetails: any) => void;
  onCancel: () => void;
}

const LogForm: React.FC<LogFormProps> = ({ onSubmit, onCancel }) => {
  const [status, setStatus] = useState<LogStatus>(LogStatus.Completed);
  const [rating, setRating] = useState<number | string>('');
  const [review, setReview] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      status,
      rating: rating === '' ? null : Number(rating),
      review,
      log_date: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as LogStatus)}>
          {Object.values(LogStatus).map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Rating (0-5)</label>
        <input
          type="number"
          min="0"
          max="5"
          step="0.5"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />
      </div>
      <div>
        <label>Review</label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />
      </div>
      <div>
        <button type="submit">Save Log</button>
        <button type="button" onClick={onCancel}>Back to Search</button>
      </div>
    </form>
  );
};

export default LogForm;

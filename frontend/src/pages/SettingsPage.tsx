import { useState, useRef } from 'react';
import api, { uploadFile } from '../services/api';
import type { User } from '../types';

interface SettingsPageProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onDeleteAccount: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  activity: 'Mapa de Atividade',
  stats: 'Estatísticas',
  hours_pie: 'Horas por Mídia',
  genre_chart: 'Gráfico de Gêneros',
};

const DEFAULT_ORDER = [
  'activity', 'stats', 'hours_pie', 'genre_chart',
];

const SettingsPage = ({ user, onUserUpdate, onDeleteAccount }: SettingsPageProps) => {
  const [accentColor, setAccentColor] = useState(user.accent_color || '#ff6b35');
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      return user.section_order ? JSON.parse(user.section_order) : DEFAULT_ORDER;
    } catch {
      return DEFAULT_ORDER;
    }
  });
  const [uploading, setUploading] = useState<'banner' | 'avatar' | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, uploadType: 'banner' | 'avatar') => {
    setUploading(uploadType);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await uploadFile(`/users/${user.id}/upload/${uploadType}`, formData);
      const updatedUser = { ...user, [`${uploadType}_url`]: res.data.url };
      onUserUpdate(updatedUser);
      setMessage({ type: 'success', text: `${uploadType === 'banner' ? 'Banner' : 'Avatar'} atualizado!` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao fazer upload.' });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, uploadType: 'banner' | 'avatar') => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, uploadType);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`/users/${user.id}/profile`, {
        accent_color: accentColor,
        section_order: JSON.stringify(sectionOrder),
      });
      onUserUpdate(res.data);
      setMessage({ type: 'success', text: 'Perfil salvo com sucesso!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao salvar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setSectionOrder(newOrder);
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => { setDragIndex(index); };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveSection(dragIndex, index);
      setDragIndex(index);
    }
  };
  const handleDragEnd = () => { setDragIndex(null); };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      onDeleteAccount();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao excluir conta.' });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const bannerUrl = user.banner_url
    ? user.banner_url.startsWith('http') ? user.banner_url : `http://localhost:8000${user.banner_url}`
    : null;
  const avatarUrl = user.avatar_url
    ? user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="font-display text-3xl font-black tracking-tight">Configurações do Perfil</h1>

      {message && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{
          background: message.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
          color: message.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
        }}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Banner</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Tamanho ideal: 1400×300px. Máx 5 MB.
        </p>
        <div
          className="w-full h-48 rounded-xl overflow-hidden cursor-pointer border border-dashed flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          onClick={() => bannerInputRef.current?.click()}
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {uploading === 'banner' ? 'Enviando...' : 'Clique para enviar banner'}
            </span>
          )}
        </div>
        <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
      </div>

      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Avatar</h2>
        <div className="flex items-center gap-6">
          <div
            className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', border: '3px solid var(--border)' }}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-3xl font-black" style={{ color: 'var(--text-muted)' }}>
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              {uploading === 'avatar' ? 'Enviando...' : 'Clique no avatar para alterar'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>JPEG, PNG, WebP ou GIF. Máx 5 MB.</p>
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
      </div>

      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Cor de Destaque</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Usada nas bordas e detalhes do seu perfil.
        </p>
        <div className="flex items-center gap-4">
          <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border-2"
            style={{ borderColor: 'var(--border)', background: 'transparent', padding: 0 }} />
          <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
            className="w-28 font-mono text-sm" />
          <div className="w-10 h-10 rounded-lg" style={{ background: accentColor, border: `2px solid ${accentColor}` }} />
        </div>
      </div>

      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Ordem das Seções</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Arraste para reordenar as seções do seu perfil.
        </p>
        <div className="flex flex-col gap-2">
          {sectionOrder.map((sectionId, index) => (
            <div
              key={sectionId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-grab transition-all"
              style={{
                background: dragIndex === index ? 'rgba(0, 224, 84, 0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${dragIndex === index ? 'var(--mdf-green)' : 'var(--border)'}`,
                opacity: dragIndex === index ? 0.8 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" />
                <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
                <circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
              </svg>
              <span className="font-medium text-sm">{SECTION_LABELS[sectionId] || sectionId}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          className="mdf-btn-primary w-full text-center"
          onClick={handleSaveProfile}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="pt-6 border-t" style={{ borderColor: 'rgba(248, 113, 113, 0.2)' }}>
        <h2 className="font-display text-lg font-bold mb-1" style={{ color: '#f87171' }}>Zona de Perigo</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Excluir sua conta apagará todos os seus logs permanentemente.
        </p>
        <button
          className="w-full text-center py-3 rounded-xl text-sm font-bold transition-colors"
          style={{
            background: 'rgba(248, 113, 113, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.3)',
          }}
          onClick={() => setShowDeleteConfirm(true)}
        >
          Excluir Conta
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Excluir conta</h3>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir sua conta <strong>{user.username}</strong>?</p>
              <p className="text-sm mt-2" style={{ color: '#f87171' }}>Todos os seus logs, reviews e dados serão apagados permanentemente. Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="mdf-btn-ghost text-sm"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="text-sm py-2 px-4 rounded-xl font-bold"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {deleting ? 'Excluindo...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

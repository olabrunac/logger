import { useState, useRef } from 'react';
import api, { uploadFile } from '../services/api';
import type { User } from '../types';

interface SettingsPageProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onDeleteAccount: () => void;
}

const SettingsPage = ({ user, onUserUpdate, onDeleteAccount }: SettingsPageProps) => {
  const [accentColor, setAccentColor] = useState(user.accent_color || '#ff6b35');
  const [uploading, setUploading] = useState<'banner' | 'avatar' | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Change email state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (text: string) => setMessage({ type: 'success', text });
  const showError = (text: string) => setMessage({ type: 'error', text });

  const handleFileUpload = async (file: File, uploadType: 'banner' | 'avatar') => {
    setUploading(uploadType);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await uploadFile(`/users/${user.id}/upload/${uploadType}`, formData);
      const updatedUser = { ...user, [`${uploadType}_url`]: res.data.url };
      onUserUpdate(updatedUser);
      showSuccess(`${uploadType === 'banner' ? 'Banner' : 'Avatar'} atualizado!`);
    } catch (err) {
      console.error(err);
      showError('Erro ao fazer upload.');
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
      });
      onUserUpdate(res.data);
      showSuccess('Perfil salvo com sucesso!');
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !emailPassword) {
      showError('Preencha todos os campos.');
      return;
    }
    setChangingEmail(true);
    setMessage(null);
    try {
      const res = await api.put(`/users/${user.id}/change-email`, {
        current_password: emailPassword,
        new_email: newEmail.trim(),
      });
      onUserUpdate(res.data);
      setNewEmail('');
      setEmailPassword('');
      showSuccess('Email alterado com sucesso!');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erro ao alterar email.');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showError('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 6) {
      showError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError('As senhas nao coincidem.');
      return;
    }
    setChangingPassword(true);
    setMessage(null);
    try {
      await api.put(`/users/${user.id}/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showSuccess('Senha alterada com sucesso!');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erro ao alterar senha.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      onDeleteAccount();
    } catch (err) {
      console.error(err);
      showError('Erro ao excluir conta.');
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

  const inputClass = "w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--accent)] outline-none rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 transition-colors";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="font-display text-3xl font-black tracking-tight">Configuracoes</h1>

      {message && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{
          background: message.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
          color: message.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Banner */}
      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Banner</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Tamanho ideal: 1400x300px. Max 5 MB.
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

      {/* Avatar */}
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
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>JPEG, PNG, WebP ou GIF. Max 5 MB.</p>
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
      </div>

      {/* Accent Color */}
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

      <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          className="mdf-btn-primary w-full text-center"
          onClick={handleSaveProfile}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alteracoes'}
        </button>
      </div>

      {/* Change Email */}
      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Alterar Email</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Email atual: <span className="text-white/70">{user.email || 'Nao definido'}</span>
        </p>
        <div className="space-y-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Novo email"
            className={inputClass}
          />
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            placeholder="Senha atual para confirmar"
            className={inputClass}
          />
          <button
            className="mdf-btn-primary w-full text-center text-sm"
            onClick={handleChangeEmail}
            disabled={changingEmail || !newEmail || !emailPassword}
          >
            {changingEmail ? 'Alterando...' : 'Alterar Email'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h2 className="font-display text-lg font-bold mb-1">Alterar Senha</h2>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Senha atual"
            className={inputClass}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha (min. 6 caracteres)"
            className={inputClass}
          />
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Confirmar nova senha"
            className={inputClass}
          />
          <button
            className="mdf-btn-primary w-full text-center text-sm"
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
          >
            {changingPassword ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t" style={{ borderColor: 'rgba(248, 113, 113, 0.2)' }}>
        <h2 className="font-display text-lg font-bold mb-1" style={{ color: '#f87171' }}>Zona de Perigo</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Excluir sua conta apagara todos os seus logs permanentemente.
        </p>
        <button
          className="w-full text-center py-3 rounded-xl text-sm font-bold transition-colors"
          style={{
            background: 'var(--error-bg)',
            color: 'var(--error-text)',
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
              <button className="modal-close" onClick={() => !deleting && setShowDeleteConfirm(false)}>x</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir sua conta <strong>{user.username}</strong>?</p>
              <p className="text-sm mt-2" style={{ color: '#f87171' }}>Todos os seus logs, reviews e dados serao apagados permanentemente. Esta acao nao pode ser desfeita.</p>
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
                style={{ background: 'var(--error)', color: '#fff' }}
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

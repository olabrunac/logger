import { useState } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post<User>('/login/', { username: username.trim() });
      onLogin(response.data);
    } catch (err) {
      setError('Failed to login. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full" style={{background:'radial-gradient(circle, rgba(0,224,84,0.35), transparent 60%)'}}/>
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full" style={{background:'radial-gradient(circle, rgba(250,51,128,0.25), transparent 60%)'}}/>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:'var(--mdf-green)'}}>
            <span className="font-display font-black text-black text-lg">L</span>
          </div>
          <div>
            <div className="font-display font-black text-2xl tracking-tight leading-none">Logger</div>
            <div className="text-xs text-white/50 uppercase tracking-[0.25em] mt-1">Meu Diário Cultural</div>
          </div>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-5xl leading-[1.05] tracking-tight">
          Registre tudo que você <span style={{color:'var(--mdf-green)'}}>joga</span>, <span style={{color:'var(--mdf-pink)'}}>assiste</span> e <span style={{color:'var(--mdf-yellow)'}}>lê</span>.
        </h1>
        <p className="mt-4 text-white/60 leading-relaxed">
          Seu diário pessoal de jogos, filmes, séries e livros. Metadados automáticos, calendário e reviews.
        </p>

        <form onSubmit={handleLogin} className="mt-8 flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu-nome-de-usuário"
            disabled={loading}
            className="flex-1 bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-full px-5 py-3 text-white placeholder:text-white/30 transition-colors"
          />
          <button type="submit" disabled={loading} className="mdf-btn-primary disabled:opacity-50">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        <div className="mt-10 grid grid-cols-4 gap-3">
          {[
            { emoji: '🎮', label: 'Jogos', color: 'var(--mdf-green)' },
            { emoji: '🎬', label: 'Filmes', color: 'var(--mdf-pink)' },
            { emoji: '📺', label: 'Séries', color: 'var(--mdf-yellow)' },
            { emoji: '📚', label: 'Livros', color: '#9CB3C9' },
          ].map(({ emoji, label }) => (
            <div key={label} className="mdf-card p-4 flex flex-col items-center gap-2">
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

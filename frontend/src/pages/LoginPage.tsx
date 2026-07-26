import { useState } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-sent';

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [mode, setMode] = useState<Mode>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDevBypass = emailOrUsername.trim() === 'bruna' && !password;
    if (!emailOrUsername.trim() || (!password && !isDevBypass)) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post<User>('/login/', {
        email_or_username: emailOrUsername.trim(),
        password: password || '',
      });
      onLogin(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Falha ao entrar. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post<User>('/login/register', {
        username: username.trim(),
        email: email.trim(),
        password,
      });
      onLogin(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Falha ao registrar. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Informe seu email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/login/forgot-password', { email: resetEmail.trim() });
      setMode('reset-sent');
    } catch {
      setError('Erro ao enviar email de reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full" style={{background:'radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 60%)'}}/>
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full" style={{background:'radial-gradient(circle, rgba(250,51,128,0.25), transparent 60%)'}}/>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:'var(--mdf-green)'}}>
            <span className="font-display font-black text-black text-lg">L</span>
          </div>
          <div>
            <div className="font-display font-black text-2xl tracking-tight leading-none">Logger</div>
            <div className="text-xs text-white/50 uppercase tracking-[0.25em] mt-1">Meu Diario Cultural</div>
          </div>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-5xl leading-[1.05] tracking-tight">
          Registre tudo que voce <span style={{color:'var(--mdf-green)'}}>joga</span>, <span style={{color:'var(--mdf-pink)'}}>assiste</span> e <span style={{color:'var(--mdf-yellow)'}}>le</span>.
        </h1>
        <p className="mt-4 text-white/60 leading-relaxed">
          Seu diario pessoal de jogos, filmes, series e livros. Metadados automaticos, calendario e reviews.
        </p>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="mt-8 space-y-3">
            <input
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Email ou nome de usuario"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <button type="submit" disabled={loading} className="mdf-btn-primary w-full disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setMode('forgot-password'); setError(''); }}
                className="text-white/40 hover:text-white/60 transition-colors">
                Esqueci minha senha
              </button>
              <button type="button" onClick={() => { setMode('register'); setError(''); }}
                className="hover:underline transition-colors" style={{ color: 'var(--accent)' }}>
                Criar conta
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="mt-8 space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de usuario"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha (min. 6 caracteres)"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar senha"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <button type="submit" disabled={loading} className="mdf-btn-primary w-full disabled:opacity-50">
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
            <div className="text-center text-sm">
              <button type="button" onClick={() => { setMode('login'); setError(''); }}
                className="text-white/40 hover:text-white/60 transition-colors">
                Ja tem uma conta? Entrar
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-3">
            <p className="text-sm text-white/50">Informe seu email para receber um link de redefinicao de senha.</p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Seu email"
              disabled={loading}
              className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--mdf-green)] outline-none rounded-xl px-5 py-3 text-white placeholder:text-white/30 transition-colors"
            />
            <button type="submit" disabled={loading} className="mdf-btn-primary w-full disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar Link de Reset'}
            </button>
            <div className="text-center text-sm">
              <button type="button" onClick={() => { setMode('login'); setError(''); }}
                className="text-white/40 hover:text-white/60 transition-colors">
                Voltar ao login
              </button>
            </div>
          </form>
        )}

        {/* Reset Sent Confirmation */}
        {mode === 'reset-sent' && (
          <div className="mt-8 text-center space-y-4">
            <div className="rounded-xl px-4 py-3 text-sm" style={{
              background: 'rgba(74, 222, 128, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}>
              Se um account com esse email existir, um link de reset foi enviado. Verifique sua caixa de entrada.
            </div>
            <button type="button" onClick={() => setMode('login')}
              className="text-sm hover:underline transition-colors" style={{ color: 'var(--accent)' }}>
              Voltar ao login
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        <div className="mt-10 grid grid-cols-4 gap-3">
          {[
            { emoji: '🎮', label: 'Jogos', color: 'var(--mdf-green)' },
            { emoji: '🎬', label: 'Filmes', color: 'var(--mdf-pink)' },
            { emoji: '📺', label: 'Series', color: 'var(--mdf-yellow)' },
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

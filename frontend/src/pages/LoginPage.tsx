import { useState } from 'react';
import api from '../services/api';
import type { User } from '../types';

// Em um aplicativo real, você usaria um gerenciador de estado (Context, Redux, Zustand)
// para armazenar o usuário logado.
interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    try {
      const response = await api.post<User>('/login/', { username });
      onLogin(response.data);
    } catch (err) {
      setError('Failed to login. Please try again.');
      console.error(err);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
        />
        <button type="submit">Enter</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
};

export default LoginPage;

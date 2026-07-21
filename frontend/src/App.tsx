import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewLogPage from './pages/NewLogPage';
import Header from './components/Header';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <Header user={user} onLogout={handleLogout} />
      <main>
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
            }
          />
          <Route
            path="/"
            element={
              user ? <HomePage user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/new-log"
            element={
              user ? <NewLogPage /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </main>
    </Router>
  );
}

export default App;


import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewLogPage from './pages/NewLogPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';
import MediaTypeProfilePage from './pages/MediaTypeProfilePage';
import LogDetailPage from './pages/LogDetailPage';
import SettingsPage from './pages/SettingsPage';
import ListsPage from './pages/ListsPage';
import DiaryPage from './pages/DiaryPage';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const handleUserUpdate = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const accentStyle = user?.accent_color
    ? { '--mdf-green': user.accent_color, '--accent': user.accent_color } as React.CSSProperties
    : {};

  const getMainMarginRight = () => {
    if (!user) return '';
    return isSidebarCollapsed ? 'mr-14' : 'mr-[324px]';
  };

  return (
    <Router>
      <div style={accentStyle} className="min-h-screen">
        {user && <LeftSidebar user={user} />}
        {user && (
          <RightSidebar
            user={user}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}
        <main className={`ml-[270px] ${getMainMarginRight()} min-h-screen p-8 overflow-y-auto transition-all`}>
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
            <Route
              path="/calendar"
              element={
                user ? <CalendarPage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/lists"
              element={
                user ? <ListsPage user={user} /> : <Navigate to="/lists" />
              }
            />
            <Route
              path="/diary"
              element={
                user ? <DiaryPage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile"
              element={
                user ? <Navigate to={`/profile/${user.username}`} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/:mediaType"
              element={
                user ? <MediaTypeProfilePage currentUser={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username"
              element={
                user ? <ProfilePage currentUser={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/log/:id"
              element={
                user ? <LogDetailPage /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/settings"
              element={
                user ? <SettingsPage user={user} onUserUpdate={handleUserUpdate} onDeleteAccount={handleLogout} /> : <Navigate to="/login" />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

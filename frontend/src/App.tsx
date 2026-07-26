import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import NewLogPage from './pages/NewLogPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';
import MediaTypeProfilePage from './pages/MediaTypeProfilePage';
import LogDetailPage from './pages/LogDetailPage';
import SettingsPage from './pages/SettingsPage';
import ListsPage from './pages/ListsPage';
import DiaryPage from './pages/DiaryPage';
import ReviewsPage from './pages/ReviewsPage';
import TimelinePage from './pages/TimelinePage';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import FloatingLogButton from './components/FloatingLogButton';
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

  const accentHex = user?.accent_color || '#ff6b35';
  const accentStyle = (() => {
    const r = parseInt(accentHex.slice(1, 3), 16);
    const g = parseInt(accentHex.slice(3, 5), 16);
    const b = parseInt(accentHex.slice(5, 7), 16);
    return {
      '--mdf-green': accentHex,
      '--accent': accentHex,
      '--accent-hover': accentHex,
      '--accent-bg': `rgba(${r}, ${g}, ${b}, 0.12)`,
      '--accent-border': `rgba(${r}, ${g}, ${b}, 0.3)`,
    } as React.CSSProperties;
  })();

  useEffect(() => {
    const root = document.documentElement;
    const r = parseInt(accentHex.slice(1, 3), 16);
    const g = parseInt(accentHex.slice(3, 5), 16);
    const b = parseInt(accentHex.slice(5, 7), 16);
    root.style.setProperty('--accent', accentHex);
    root.style.setProperty('--accent-hover', accentHex);
    root.style.setProperty('--accent-bg', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.style.setProperty('--mdf-green', accentHex);
    root.style.setProperty('--mdf-green-hover', accentHex);
  }, [accentHex]);

  // Fixed sidebar widths - content area stays this width always
  const fixedSidebarWidths = user
    ? { left: 203, right: 324 }
    : { left: 203, right: 0 };

  return (
    <Router>
      <div style={accentStyle} className="min-h-screen flex">
        <LeftSidebar user={user} onLogout={handleLogout} />
        {user && (
          <RightSidebar
            user={user}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}
        <main className="flex-1 min-w-0 overflow-y-auto p-8 transition-all" style={{ marginLeft: fixedSidebarWidths.left, marginRight: fixedSidebarWidths.right }}>
          {user && <FloatingLogButton user={user} />}
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
                user ? <Navigate to={`/profile/${user.username}`} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/new-log"
              element={
                user ? <NewLogPage /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/settings"
              element={
                user ? <SettingsPage user={user} onUserUpdate={handleUserUpdate} onDeleteAccount={handleLogout} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/calendar"
              element={
                user ? <CalendarPage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/lists"
              element={
                user ? <ListsPage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/diary"
              element={
                user ? <DiaryPage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/reviews"
              element={
                user ? <ReviewsPage currentUser={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/timeline"
              element={
                user ? <TimelinePage user={user} /> : <Navigate to="/login" />
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

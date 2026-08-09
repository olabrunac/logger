import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import api, { resolveUserByUsername } from './services/api';
import { useMediaQuery } from './hooks/useMediaQuery';
import LoginPage from './pages/LoginPage';
import NewLogPage from './pages/NewLogPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';
import MediaDetailPage from './pages/MediaDetailPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import ListsPage from './pages/ListsPage';
import DiaryPage from './pages/DiaryPage';
import ReviewsPage from './pages/ReviewsPage';
import StatusDirectoryPage from './pages/StatusDirectoryPage';
import TimelinePage from './pages/TimelinePage';
import NotificationsPage from './pages/NotificationsPage';
import ImportPage from './pages/ImportPage';
import ErrorBoundary from './components/ErrorBoundary';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MobileNav from './components/MobileNav';
import FloatingLogButton from './components/FloatingLogButton';
import type { User } from './types';

function MediaTypeRedirect() {
  const { username, mediaType } = useParams<{ username: string; mediaType: string }>();
  return <Navigate to={`/profile/${username}?view=${mediaType}`} replace />;
}

function LogRedirect() {
  const { mediaType, apiId } = useParams<{ mediaType: string; apiId: string }>();
  return <Navigate to={`/media/${mediaType}/${apiId}`} replace />;
}

function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

function AppInner() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [unreadTrigger, setUnreadTrigger] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (!parsed.username) return;
      api.get('/login/by-username/' + encodeURIComponent(parsed.username))
        .then((res) => {
          localStorage.setItem('user', JSON.stringify(res.data));
          setUser(res.data);
        })
        .catch((err) => {
          if (err.response?.status === 404) {
            localStorage.removeItem('user');
            setUser(null);
          }
        });
    } catch {
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const resolveViewedUser = useCallback(async () => {
    const match = location.pathname.match(/^\/profile\/([^/]+)/);
    if (!match) { setViewedUser(null); return; }
    const username = decodeURIComponent(match[1]);
    if (!user || username === user.username) { setViewedUser(null); return; }
    try {
      const data = await resolveUserByUsername(username);
      setViewedUser(data);
    } catch {
      setViewedUser(null);
    }
  }, [location.pathname, user]);

  useEffect(() => { resolveViewedUser(); }, [resolveViewedUser]);

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

  // Fixed sidebar widths - content area stays this width always.
  // On /media pages the global RightSidebar is replaced by the page's own YGP sidebar.
  // Left sidebar is hidden on the login page; right sidebar only on the main profile route.
  const isLoginRoute = location.pathname === '/login';
  const isMediaDetailRoute = /^\/media\//.test(location.pathname);
  const isMainProfileRoute = /^\/profile\/[^/]+$/.test(location.pathname);
  const isTablet = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
  useEffect(() => {
    if (isTablet) setIsSidebarCollapsed(true);
  }, [isTablet]);
  const fixedSidebarWidths = user
    ? {
        left: isTablet ? 160 : 203,
        right: isMediaDetailRoute ? 0 : isMainProfileRoute ? (isTablet ? (isSidebarCollapsed ? 56 : 324) : 324) : 0,
      }
    : { left: isLoginRoute ? 0 : isTablet ? 160 : 203, right: 0 };

  return (
    <div style={accentStyle} className="min-h-screen flex">
        {!isLoginRoute && <MobileNav user={user} onLogout={handleLogout} refreshUnreadTrigger={unreadTrigger} />}
        {!isLoginRoute && <LeftSidebar user={user} onLogout={handleLogout} refreshUnreadTrigger={unreadTrigger} />}
        {user && isMainProfileRoute && !isMediaDetailRoute && (
          <RightSidebar
            user={viewedUser || user}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}
        <main
          className={`flex-1 min-w-0 overflow-y-auto transition-all app-main px-4 lg:px-8 ${isLoginRoute ? '' : 'pt-[calc(3rem+env(safe-area-inset-top,0px))] lg:pt-8'} pb-24 lg:pb-8`}
          style={{
            ['--app-margin-left' as string]: `${fixedSidebarWidths.left}px`,
            ['--app-margin-right' as string]: `${fixedSidebarWidths.right}px`,
            ['--fab-right-offset' as string]: `${isMainProfileRoute ? fixedSidebarWidths.right : 324}px`,
          }}
        >
          {user && <FloatingLogButton user={user} />}
          <ErrorBoundary>
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
              path="/search"
              element={
                user ? <SearchPage /> : <Navigate to="/login" />
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
                user ? <CalendarPage currentUser={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/lists"
              element={
                user ? <ListsPage currentUser={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/diary"
              element={
                user ? <DiaryPage currentUser={user} /> : <Navigate to="/login" />
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
              path="/notifications"
              element={
                user ? <NotificationsPage user={user} onNotificationsRead={() => setUnreadTrigger(t => t + 1)} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/import"
              element={
                user ? <ImportPage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile"
              element={
                user ? <Navigate to={`/profile/${user.username}`} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/me"
              element={
                user ? <Navigate to={`/profile/${user.username}`} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/:status/:mediaType"
              element={
                user ? <StatusDirectoryPage currentUser={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username/:mediaType"
              element={
                user ? <MediaTypeRedirect /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:username"
              element={
                user ? <ProfilePage currentUser={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/log/:mediaType/:apiId"
              element={
                user ? <LogRedirect /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/media/:mediaType/:apiId"
              element={
                user ? <MediaDetailPage /> : <Navigate to="/login" />
              }
            />
          </Routes>
          </ErrorBoundary>
        </main>
      </div>
  );
}

export default App;

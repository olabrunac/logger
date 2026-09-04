import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import api, { resolveUserByUsername } from './services/api';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MobileNav from './components/MobileNav';
import FloatingLogButton from './components/FloatingLogButton';
import { ChevronRight } from 'lucide-react';
import type { User } from './types';

// Code-splitting por rota: cada página vira um chunk separado carregado sob
// demanda (e cacheado após o primeiro acesso). Reduz o bundle inicial
// (~700KB / 185KB gzip -> só o shell + LoginPage no primeiro paint).
const NewLogPage = lazy(() => import('./pages/NewLogPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MediaDetailPage = lazy(() => import('./pages/MediaDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ListsPage = lazy(() => import('./pages/ListsPage'));
const DiaryPage = lazy(() => import('./pages/DiaryPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const StatusDirectoryPage = lazy(() => import('./pages/StatusDirectoryPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const WhatToDoPage = lazy(() => import('./pages/WhatToDoPage'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]" />
    </div>
  );
}

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
  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] = useState(false);

  // Preload do ProfilePage: a rota inicial redireciona para /profile/:username,
  // entao ja comeca o download desse chunk (lazy) em paralelo ao shell, antes
  // do primeiro navigate resolver.
  useEffect(() => {
    import('./pages/ProfilePage').catch(() => {});
  }, []);

  useEffect(() => {
    setMobileAnalyticsOpen(false);
  }, [location.pathname]);

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
  const fixedSidebarWidths = user
    ? { left: 203, right: isMediaDetailRoute ? 0 : isMainProfileRoute ? 324 : 0 }
    : { left: isLoginRoute ? 0 : 203, right: 0 };

  return (
    <div style={accentStyle} className="min-h-screen flex">
        {!isLoginRoute && <MobileNav user={user} onLogout={handleLogout} refreshUnreadTrigger={unreadTrigger} onOpenAnalytics={isMainProfileRoute ? () => setMobileAnalyticsOpen(true) : undefined} />}
        {!isLoginRoute && <LeftSidebar user={user} onLogout={handleLogout} refreshUnreadTrigger={unreadTrigger} />}
        {user && isMainProfileRoute && !isMediaDetailRoute && (
          <RightSidebar
            user={viewedUser || user}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        {user && isMainProfileRoute && !isMediaDetailRoute && (
          <>
            <div
              className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 lg:hidden ${mobileAnalyticsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setMobileAnalyticsOpen(false)}
            />
            <div className={`fixed inset-y-0 right-0 z-[61] flex w-[min(340px,85vw)] flex-col border-l bg-[var(--mdf-bg)] transition-transform duration-300 lg:hidden ${mobileAnalyticsOpen ? 'translate-x-0' : 'translate-x-full'}`}
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-display font-bold text-base">Analytics</h3>
                <button onClick={() => setMobileAnalyticsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/60">
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <RightSidebar
                  user={viewedUser || user}
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                  embedded
                />
              </div>
            </div>
          </>
        )}
        <main
          className={`flex-1 min-w-0 overflow-y-auto transition-all app-main px-4 lg:px-8 ${isLoginRoute ? '' : 'pt-[calc(3rem+env(safe-area-inset-top,0px))] lg:pt-8'} pb-24 lg:pb-8`}
          style={{
            ['--app-margin-left' as string]: `${fixedSidebarWidths.left}px`,
            ['--app-margin-right' as string]: `${fixedSidebarWidths.right}px`,
          }}
        >
          {user && <FloatingLogButton user={user} />}
          <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
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
              path="/what-to-do"
              element={
                user ? <WhatToDoPage user={user} /> : <Navigate to="/login" />
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
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
  );
}

export default App;

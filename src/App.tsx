// Main App Component - S.A Player TV

import { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { storage } from './services/storage';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { LiveTV } from './pages/LiveTV';
import { Movies } from './pages/Movies';
import { Series } from './pages/Series';
import { Favorites } from './pages/Favorites';
import { MyList } from './pages/MyList';
import { Settings } from './pages/Settings';
import { Sidebar } from './components/Sidebar';
import { ProfileManager } from './components/ProfileManager';
import { FocusContext, type FocusZone } from './contexts/FocusContext';
import './index.css';

type Page = 'home' | 'live' | 'movies' | 'series' | 'mylist' | 'favorites' | 'settings';
type AuthState = 'loading' | 'login' | 'authenticated';

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [focusZone, setFocusZone] = useState<FocusZone>('content');
  const [showProfileManager, setShowProfileManager] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const credentials = storage.getCredentials();
      if (credentials) {
        // Auto-login com credenciais salvas
        await api.authenticate(credentials.url, credentials.username, credentials.password);
        setAuthState('authenticated');
      } else {
        setAuthState('login');
      }
    } catch (err) {
      console.error('Auto-login failed:', err);
      storage.clearCredentials();
      setAuthState('login');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(checkAuth);
  }, [checkAuth]);

  const handleLoginSuccess = () => {
    setAuthState('authenticated');
  };

  const handleLogout = () => {
    api.logout();
    storage.clearCredentials();
    setAuthState('login');
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page as Page);
    setFocusZone('content'); // Reset focus to content when changing pages
  };

  // Loading screen
  if (authState === 'loading') {
    return (
      <div className="app-loading">
        <div className="app-loading-logo">
          <img src="/saplayer-logo.png" alt="S.A Player" style={{ width: 180, maxWidth: '60vw', height: 'auto' }} />
        </div>
        <div className="app-loading-spinner" />
        <p className="app-loading-text">S.A Player</p>
      </div>
    );
  }

  // Login screen
  if (authState === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Main app with sidebar
  return (
    <FocusContext.Provider value={{ focusZone, setFocusZone }}>
      <div className="app">
        <Sidebar
          activeItem={currentPage}
          onItemSelect={handlePageChange}
          onLogout={handleLogout}
          onProfileClick={() => setShowProfileManager(true)}
          focused={focusZone === 'sidebar'}
        />
        <main className="app-content">
          {currentPage === 'home' && <Home onNavigate={handlePageChange} />}
          {currentPage === 'live' && <LiveTV />}
          {currentPage === 'movies' && <Movies />}
          {currentPage === 'series' && <Series />}
          {currentPage === 'mylist' && <MyList />}
          {currentPage === 'favorites' && <Favorites />}
          {currentPage === 'settings' && <Settings />}
        </main>

        {/* Profile Manager Modal */}
        {showProfileManager && (
          <ProfileManager onClose={() => setShowProfileManager(false)} />
        )}
      </div>
    </FocusContext.Provider>
  );
}

export default App;

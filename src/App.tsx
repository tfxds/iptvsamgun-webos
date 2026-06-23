// Main App Component - S.A Player TV

import { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { storage } from './services/storage';
import * as panel from './services/panelService';
import { getBranding, setBranding, type Branding } from './services/brandingService';
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
import { Preloader } from './components/Preloader/Preloader';
import { FocusContext, type FocusZone } from './contexts/FocusContext';
import './index.css';

type Page = 'home' | 'live' | 'movies' | 'series' | 'mylist' | 'favorites' | 'settings';
type AuthState = 'loading' | 'login' | 'preloading' | 'authenticated';

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [focusZone, setFocusZone] = useState<FocusZone>('content');
  const [showProfileManager, setShowProfileManager] = useState(false);
  // Carrega a logo persistida na hora (reabrir o app ja mostra a do revendedor).
  const [branding, setBrandingState] = useState<Branding>(getBranding());

  const applyBranding = useCallback((cfg: panel.AppConfig) => {
    if (!cfg.imgLogo && !cfg.imgBg) return;
    const b: Branding = { imgLogo: cfg.imgLogo, imgBg: cfg.imgBg };
    setBranding(b);
    setBrandingState(b);
  }, []);

  const checkAuth = useCallback(async () => {
    // 1) Auto-login pelo painel (device registrado pelo MAC) -> traz creds + logo do revendedor
    try {
      const cfg = await panel.getConfig();
      if (cfg.playlists.length > 0) {
        const p = cfg.playlists[0];
        const server = p.dnsId || p.url;
        await api.authenticate(server, p.username, p.password);
        storage.saveCredentials({ url: server, username: p.username, password: p.password });
        applyBranding(cfg);
        setAuthState('preloading');
        return;
      }
    } catch (e) {
      console.warn('Config auto-login indisponivel:', e);
    }
    // 2) Fallback: credenciais salvas localmente
    try {
      const credentials = storage.getCredentials();
      if (credentials) {
        await api.authenticate(credentials.url, credentials.username, credentials.password);
        setAuthState('preloading');
        return;
      }
    } catch (err) {
      console.error('Auto-login failed:', err);
      storage.clearCredentials();
    }
    // 3) Sem device registrado e sem creds -> tela de login
    setAuthState('login');
  }, [applyBranding]);

  useEffect(() => {
    void Promise.resolve().then(checkAuth);
  }, [checkAuth]);

  const handleLoginSuccess = useCallback(async () => {
    // Apos logar, o device fica registrado sob o revendedor -> busca a logo dele.
    try {
      const cfg = await panel.getConfig();
      applyBranding(cfg);
    } catch {
      /* dev/CORS: segue sem branding atualizado */
    }
    setAuthState('preloading');
  }, [applyBranding]);

  const handleLogout = () => {
    api.logout();
    panel.logout().catch(() => {});
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

  // Preloader pos-login: carrega canais/filmes/series (esquenta cache) -> Home
  if (authState === 'preloading') {
    return <Preloader logoUrl={branding.imgLogo} onReady={() => setAuthState('authenticated')} />;
  }

  // Main app with sidebar
  return (
    <FocusContext.Provider value={{ focusZone, setFocusZone }}>
      <div className="app">
        {/* Fundo do revendedor (whitelabel) */}
        {branding.imgBg && (
          <div
            aria-hidden
            className="app-reseller-bg"
            style={{ backgroundImage: `url(${branding.imgBg})` }}
          />
        )}
        <Sidebar
          activeItem={currentPage}
          onItemSelect={handlePageChange}
          onLogout={handleLogout}
          onProfileClick={() => setShowProfileManager(true)}
          focused={focusZone === 'sidebar'}
          logoUrl={branding.imgLogo}
        />
        <main className="app-content">
          {currentPage === 'home' && <Home />}
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

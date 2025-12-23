// Main App Component - NeoStream TV

import { useState, useEffect } from 'react';
import { api } from './services/api';
import { storage } from './services/storage';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { LiveTV } from './pages/LiveTV';
import { Movies } from './pages/Movies';
import { Series } from './pages/Series';
import { Favorites } from './pages/Favorites';
import { MyList } from './pages/MyList';
import { Sidebar } from './components/Sidebar';
import './index.css';

type Page = 'home' | 'live' | 'movies' | 'series' | 'mylist' | 'favorites' | 'settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const credentials = storage.getCredentials();
      if (credentials) {
        // Try to authenticate with saved credentials
        await api.authenticate(credentials.url, credentials.username, credentials.password);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Auto-login failed:', err);
      storage.clearCredentials();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    storage.clearCredentials();
    setIsAuthenticated(false);
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page as Page);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-logo">
          <svg viewBox="0 0 24 24" fill="none" width="64" height="64">
            <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15V5Z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 16V20" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div className="app-loading-spinner" />
        <p className="app-loading-text">NeoStream</p>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Main app with sidebar
  return (
    <div className="app">
      <Sidebar
        activeItem={currentPage}
        onItemSelect={handlePageChange}
        onLogout={handleLogout}
      />
      <main className="app-content">
        {currentPage === 'home' && <Home onNavigate={handlePageChange} />}
        {currentPage === 'live' && <LiveTV />}
        {currentPage === 'movies' && <Movies />}
        {currentPage === 'series' && <Series />}
        {currentPage === 'mylist' && <MyList />}
        {currentPage === 'favorites' && <Favorites />}
        {currentPage === 'settings' && <PlaceholderPage title="Configurações" icon="⚙️" />}
      </main>
    </div>
  );
}

// Placeholder component for pages not yet implemented
function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">{icon}</span>
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-text">Em desenvolvimento...</p>
    </div>
  );
}

export default App;

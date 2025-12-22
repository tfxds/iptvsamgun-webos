// Login Page - TV Style with virtual keyboard navigation

import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Login.css';

interface LoginProps {
    onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(0);

    const inputs = useRef<(HTMLInputElement | HTMLButtonElement | null)[]>([]);

    // Check for saved credentials on mount
    useEffect(() => {
        const saved = storage.getCredentials();
        if (saved) {
            setUrl(saved.url);
            setUsername(saved.username);
            setPassword(saved.password);
        }
    }, []);

    const handleLogin = async () => {
        if (!url || !username || !password) {
            setError('Preencha todos os campos');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.authenticate(url, username, password);

            // Save credentials
            storage.saveCredentials({ url, username, password });

            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro ao conectar');
        } finally {
            setLoading(false);
        }
    };

    const moveFocus = (delta: number) => {
        const newIndex = Math.max(0, Math.min(focusedField + delta, 3));
        setFocusedField(newIndex);
        inputs.current[newIndex]?.focus();
    };

    useTVNavigation({
        onNavigate: (direction) => {
            if (direction === 'up') moveFocus(-1);
            if (direction === 'down') moveFocus(1);
        },
        onEnter: () => {
            if (focusedField === 3) {
                handleLogin();
            }
        },
    });

    return (
        <div className="login-container">
            {/* Animated background */}
            <div className="login-bg">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
                <div className="login-grid-overlay" />
            </div>

            <div className="login-content animate-scale-in">
                {/* Logo */}
                <div className="login-header">
                    <div className="login-logo">
                        <svg viewBox="0 0 24 24" fill="none" className="login-logo-icon">
                            <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15V5Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M8 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 16V20" stroke="currentColor" strokeWidth="2" />
                            <path d="M9 9L11 11L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="login-title">NeoStream</h1>
                    <p className="login-subtitle">Entre com suas credenciais IPTV</p>
                </div>

                {/* Login Form */}
                <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    <div className="login-field">
                        <label className="login-label">Servidor</label>
                        <input
                            ref={(el) => { inputs.current[0] = el; }}
                            type="text"
                            className={`tv-input ${focusedField === 0 ? 'tv-focused' : ''}`}
                            placeholder="http://servidor.com:8080"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onFocus={() => setFocusedField(0)}
                            disabled={loading}
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label">Usuário</label>
                        <input
                            ref={(el) => { inputs.current[1] = el; }}
                            type="text"
                            className={`tv-input ${focusedField === 1 ? 'tv-focused' : ''}`}
                            placeholder="seu_usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onFocus={() => setFocusedField(1)}
                            disabled={loading}
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label">Senha</label>
                        <input
                            ref={(el) => { inputs.current[2] = el; }}
                            type="password"
                            className={`tv-input ${focusedField === 2 ? 'tv-focused' : ''}`}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField(2)}
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        ref={(el) => { inputs.current[3] = el; }}
                        type="submit"
                        className={`tv-button login-button ${focusedField === 3 ? 'tv-focused' : ''}`}
                        onFocus={() => setFocusedField(3)}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="login-spinner" />
                                Conectando...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                                    <path d="M15 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                {/* Navigation hint */}
                <div className="login-hint">
                    <span>Use as setas ↑↓ para navegar</span>
                    <span>•</span>
                    <span>OK para confirmar</span>
                </div>
            </div>
        </div>
    );
}

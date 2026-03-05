// Login Page - Premium design with full TV navigation
import { useState, useRef, useEffect } from 'react';
import { FaTv, FaServer, FaUser, FaLock, FaSignInAlt, FaStar, FaArrowLeft } from 'react-icons/fa';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Login.css';

interface LoginProps {
    onLoginSuccess: () => void;
}

// Navigation order: 0=url, 1=username, 2=password, 3=includeTV, 4=includeVOD, 5=back, 6=submit
const MAX_FOCUS = 6;

export function Login({ onLoginSuccess }: LoginProps) {
    const [includeTV, setIncludeTV] = useState(true);
    const [includeVOD, setIncludeVOD] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(0);
    const [editingField, setEditingField] = useState<number | null>(null); // Which input is being edited

    const urlRef = useRef<HTMLInputElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const backBtnRef = useRef<HTMLButtonElement>(null);
    const submitBtnRef = useRef<HTMLButtonElement>(null);

    // Check for saved credentials on mount
    useEffect(() => {
        const saved = storage.getCredentials();
        if (saved) {
            if (urlRef.current) urlRef.current.value = saved.url;
            if (usernameRef.current) usernameRef.current.value = saved.username;
            if (passwordRef.current) passwordRef.current.value = saved.password;
        }
    }, []);

    const handleLogin = async () => {
        const currentUrl = urlRef.current?.value || '';
        const currentUsername = usernameRef.current?.value || '';
        const currentPassword = passwordRef.current?.value || '';

        if (!currentUrl || !currentUsername || !currentPassword) {
            setError('Preencha todos os campos');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.authenticate(currentUrl, currentUsername, currentPassword);
            localStorage.setItem('includeTV', includeTV.toString());
            localStorage.setItem('includeVOD', includeVOD.toString());
            storage.saveCredentials({ url: currentUrl, username: currentUsername, password: currentPassword });
            onLoginSuccess();
        } catch (err: any) {
            if (err?.message?.includes('Invalid URL') || err?.message?.includes('invalid url')) {
                setError('URL do servidor inválida');
            } else if (err?.message?.includes('fetch') || err?.message?.includes('ENOTFOUND') || err?.message?.includes('ECONNREFUSED')) {
                setError('Não foi possível conectar ao servidor');
            } else if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.message?.includes('authentication')) {
                setError('Usuário ou senha incorretos');
            } else if (err?.message?.includes('timeout')) {
                setError('Tempo limite excedido');
            } else {
                setError(err.message || 'Erro ao conectar');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        window.location.reload();
    };

    const handleEnter = () => {
        // If editing an input, blur it (close keyboard)
        if (editingField !== null) {
            setEditingField(null);
            urlRef.current?.blur();
            usernameRef.current?.blur();
            passwordRef.current?.blur();
            return;
        }

        // Handle action based on focused field
        switch (focusedField) {
            case 0: // URL input - start editing
            case 1: // Username input
            case 2: // Password input
                setEditingField(focusedField);
                if (focusedField === 0) urlRef.current?.focus();
                if (focusedField === 1) usernameRef.current?.focus();
                if (focusedField === 2) passwordRef.current?.focus();
                break;
            case 3: // Include TV checkbox
                setIncludeTV(!includeTV);
                break;
            case 4: // Include VOD checkbox
                setIncludeVOD(!includeVOD);
                break;
            case 5: // Back button
                handleBack();
                break;
            case 6: // Submit button
                handleLogin();
                break;
        }
    };

    useTVNavigation({
        onNavigate: (direction) => {
            if (direction === 'up') {
                setFocusedField(Math.max(0, focusedField - 1));
            }
            if (direction === 'down') {
                setFocusedField(Math.min(MAX_FOCUS, focusedField + 1));
            }
            if (direction === 'left' && focusedField >= 5) {
                setFocusedField(5); // Back button
            }
            if (direction === 'right' && focusedField >= 5) {
                setFocusedField(6); // Submit button
            }
        },
        onEnter: handleEnter,
        onBack: () => {
            handleBack();
        },
    });

    return (
        <div className="login-container">
            {/* Animated Background */}
            <div className="login-bg">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
                <div className="login-grid" />
            </div>

            {/* Content */}
            <div className="login-content">
                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-bg">
                        <FaTv className="login-logo-icon" />
                    </div>
                    <h1 className="login-title">NeoStream</h1>
                    <div className="login-badge">
                        <FaStar size={12} />
                        <span style={{ marginLeft: '8px' }}>IPTV LOGIN</span>
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="login-form">
                    {error && (
                        <div className="login-error">
                            <span>❌</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* URL Input */}
                    <div className="login-field">
                        <label>Endereço do Servidor</label>
                        <div
                            className={`login-input-wrap ${focusedField === 0 ? 'focused' : ''} ${editingField === 0 ? 'editing' : ''}`}
                            onClick={() => { setFocusedField(0); setEditingField(0); urlRef.current?.focus(); }}
                        >
                            <FaServer size={18} />
                            <input
                                ref={urlRef}
                                type="text"
                                onBlur={() => setEditingField(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 29443) {
                                        setEditingField(null);
                                        e.currentTarget.blur();
                                    }
                                }}
                                placeholder="http://example.com:8080"
                                disabled={loading}
                                readOnly={editingField !== 0}
                                tabIndex={-1}
                            />
                            {focusedField === 0 && editingField !== 0 && (
                                <span className="login-input-hint">OK para editar</span>
                            )}
                        </div>
                    </div>

                    {/* Username Input */}
                    <div className="login-field">
                        <label>Usuário</label>
                        <div
                            className={`login-input-wrap ${focusedField === 1 ? 'focused' : ''} ${editingField === 1 ? 'editing' : ''}`}
                            onClick={() => { setFocusedField(1); setEditingField(1); usernameRef.current?.focus(); }}
                        >
                            <FaUser size={18} />
                            <input
                                ref={usernameRef}
                                type="text"
                                onBlur={() => setEditingField(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 29443) {
                                        setEditingField(null);
                                        e.currentTarget.blur();
                                    }
                                }}
                                disabled={loading}
                                readOnly={editingField !== 1}
                                tabIndex={-1}
                            />
                            {focusedField === 1 && editingField !== 1 && (
                                <span className="login-input-hint">OK para editar</span>
                            )}
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="login-field">
                        <label>Senha</label>
                        <div
                            className={`login-input-wrap ${focusedField === 2 ? 'focused' : ''} ${editingField === 2 ? 'editing' : ''}`}
                            onClick={() => { setFocusedField(2); setEditingField(2); passwordRef.current?.focus(); }}
                        >
                            <FaLock size={18} />
                            <input
                                ref={passwordRef}
                                type="password"
                                onBlur={() => setEditingField(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 29443) {
                                        setEditingField(null);
                                        e.currentTarget.blur();
                                    }
                                }}
                                disabled={loading}
                                readOnly={editingField !== 2}
                                tabIndex={-1}
                            />
                            {focusedField === 2 && editingField !== 2 && (
                                <span className="login-input-hint">OK para editar</span>
                            )}
                        </div>
                    </div>

                    {/* Checkboxes for TV and VOD */}
                    <div className="login-checkboxes">
                        <div
                            className={`login-checkbox ${focusedField === 3 ? 'focused' : ''}`}
                            onClick={() => setIncludeTV(!includeTV)}
                            tabIndex={-1}
                        >
                            <span className={`login-checkbox-mark ${includeTV ? 'checked' : ''}`}>
                                {includeTV && '✓'}
                            </span>
                            <span>Incluir canais de TV</span>
                        </div>

                        <div
                            className={`login-checkbox ${focusedField === 4 ? 'focused' : ''}`}
                            onClick={() => setIncludeVOD(!includeVOD)}
                            tabIndex={-1}
                        >
                            <span className={`login-checkbox-mark ${includeVOD ? 'checked' : ''}`}>
                                {includeVOD && '✓'}
                            </span>
                            <span>Incluir VOD (Filmes e Séries)</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="login-buttons">
                        <button
                            ref={backBtnRef}
                            type="button"
                            onClick={handleBack}
                            className={`login-btn login-btn-secondary ${focusedField === 5 ? 'focused' : ''}`}
                            disabled={loading}
                            tabIndex={-1}
                        >
                            <FaArrowLeft size={18} />
                            <span>Voltar</span>
                        </button>

                        <button
                            ref={submitBtnRef}
                            type="submit"
                            className={`login-btn login-btn-primary ${focusedField === 6 ? 'focused' : ''}`}
                            disabled={loading}
                            tabIndex={-1}
                        >
                            {loading ? (
                                <>
                                    <div className="login-spinner" />
                                    <span>Autenticando...</span>
                                </>
                            ) : (
                                <>
                                    <FaSignInAlt size={18} />
                                    <span>Entrar</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Navigation hint for TV */}
                <div className="login-hint">
                    <span>↑↓ Navegar</span>
                    <span>•</span>
                    <span>OK Selecionar</span>
                    <span>•</span>
                    <span>← Voltar</span>
                </div>
            </div>
        </div>
    );
}

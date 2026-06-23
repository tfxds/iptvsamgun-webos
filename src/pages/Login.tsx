// Login Page - S.A Player - login por código de revendedor (2 passos), navegação TV (Tizen/webOS)
import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { FaUser, FaLock, FaSignInAlt, FaArrowLeft, FaKey, FaServer } from 'react-icons/fa';
import { api } from '../services/api';
import { storage } from '../services/storage';
import * as panel from '../services/panelService';
import type { DnsOption } from '../services/panelService';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Login.css';

interface LoginProps {
    onLoginSuccess: () => void;
    onLanguageSelect?: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
    const [step, setStep] = useState<'code' | 'creds'>('code');
    const [code, setCode] = useState('');
    const [dnsList, setDnsList] = useState<DnsOption[]>([]);
    const [dnsId, setDnsId] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(0);
    const [editingField, setEditingField] = useState<number | null>(null);

    const codeRef = useRef<HTMLInputElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    // Layout dos campos por passo (ids). DNS só vira campo navegável quando há mais de uma.
    const hasDnsSelector = dnsList.length > 1;
    const fields: string[] =
        step === 'code'
            ? ['code', 'continue']
            : hasDnsSelector
                ? ['dns', 'user', 'pass', 'back', 'entrar']
                : ['user', 'pass', 'back', 'entrar'];
    const maxFocus = fields.length - 1;
    const idxOf = (id: string) => fields.indexOf(id);

    // Restaura usuário salvo (conveniência)
    useEffect(() => {
        const saved = storage.getCredentials();
        if (saved?.username) setUsername(saved.username);
    }, []);

    // Reseta o foco ao trocar de passo
    useEffect(() => {
        setFocusedField(0);
        setEditingField(null);
    }, [step]);

    const stopEditingInput = useCallback(() => {
        codeRef.current?.blur();
        usernameRef.current?.blur();
        passwordRef.current?.blur();
        setEditingField(null);
    }, []);

    const handleInputKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            const key = event.key || String(event.keyCode);
            if (
                ['Enter', '13', '29443', 'Select', 'Done', 'Go', '10009', '461', 'XF86Back', 'Escape'].includes(key)
            ) {
                event.preventDefault();
                event.stopPropagation();
                stopEditingInput();
            }
        },
        [stopEditingInput],
    );

    const submitCode = useCallback(async () => {
        setError('');
        const c = code.trim().toUpperCase();
        if (!c) {
            setError('Informe o código do revendedor.');
            return;
        }
        setLoading(true);
        try {
            const r = await panel.resellerDns(c);
            if (!r.success) {
                setError(r.message || 'Revendedor não encontrado.');
                return;
            }
            if (!r.dns.length) {
                setError('Nenhuma DNS liberada para este revendedor.');
                return;
            }
            setDnsList(r.dns);
            setDnsId(r.dns[0].id);
            setStep('creds');
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [code]);

    const submitLogin = useCallback(async () => {
        setError('');
        if (!username.trim() || !password.trim()) {
            setError('Informe usuário e senha.');
            return;
        }
        setLoading(true);
        try {
            const c = code.trim().toUpperCase();
            const r = await panel.login({ dnsId, username: username.trim(), password: password.trim(), code: c });
            if (!r.success) {
                setError(r.message || 'Falha na validação do revendedor.');
                return;
            }
            const dnsUrl = dnsList.find((d) => d.id === dnsId)?.url || '';
            await api.authenticate(dnsUrl, username.trim(), password.trim());
            storage.saveCredentials({ url: dnsUrl, username: username.trim(), password: password.trim() });
            onLoginSuccess();
        } catch (e) {
            const m = e instanceof Error ? e.message : '';
            setError(
                m.includes('401') || m.toLowerCase().includes('auth')
                    ? 'Credenciais inválidas ou conta inativa.'
                    : 'Erro ao conectar no servidor.',
            );
        } finally {
            setLoading(false);
        }
    }, [username, password, dnsId, dnsList, code, onLoginSuccess]);

    const cycleDns = useCallback(() => {
        setDnsId((cur) => {
            const i = dnsList.findIndex((d) => d.id === cur);
            const next = dnsList[(i + 1) % dnsList.length];
            return next ? next.id : cur;
        });
    }, [dnsList]);

    const activate = useCallback(
        (id: string) => {
            switch (id) {
                case 'code':
                    codeRef.current?.focus();
                    break;
                case 'continue':
                    submitCode();
                    break;
                case 'dns':
                    cycleDns();
                    break;
                case 'user':
                    usernameRef.current?.focus();
                    break;
                case 'pass':
                    passwordRef.current?.focus();
                    break;
                case 'back':
                    setStep('code');
                    break;
                case 'entrar':
                    submitLogin();
                    break;
            }
        },
        [submitCode, submitLogin, cycleDns],
    );

    const handleEnter = useCallback(() => {
        if (editingField !== null) {
            stopEditingInput();
            return;
        }
        activate(fields[focusedField]);
    }, [editingField, stopEditingInput, activate, fields, focusedField]);

    const handleBackAction = useCallback(() => {
        if (editingField !== null) {
            stopEditingInput();
            return;
        }
        if (step === 'creds') setStep('code');
    }, [editingField, stopEditingInput, step]);

    useTVNavigation({
        onNavigate: (direction) => {
            if (editingField !== null) return;
            if (direction === 'up') setFocusedField((f) => Math.max(0, f - 1));
            if (direction === 'down') setFocusedField((f) => Math.min(maxFocus, f + 1));
        },
        onEnter: handleEnter,
        onBack: handleBackAction,
    });

    const currentDns = dnsList.find((d) => d.id === dnsId);
    const focusCls = (id: string) => (focusedField === idxOf(id) ? 'focused' : '');
    const editCls = (id: string) => (editingField === idxOf(id) ? 'editing' : '');

    return (
        <div className="login-container">
            <div className="login-bg">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
                <div className="login-grid" />
            </div>

            <div className="login-content">
                <div className="login-logo">
                    <img src="/saplayer-logo.png" alt="S.A Player" className="login-logo-img" />
                </div>

                <form onSubmit={(e) => e.preventDefault()} className="login-form">
                    {error && (
                        <div className="login-error">
                            <span>❌</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'code' ? (
                        <>
                            <div className="login-field">
                                <label>Código do revendedor</label>
                                <div
                                    className={`login-input-wrap ${focusCls('code')} ${editCls('code')}`}
                                    onClick={() => {
                                        setFocusedField(idxOf('code'));
                                        codeRef.current?.focus();
                                    }}
                                >
                                    <FaKey size={18} />
                                    <input
                                        ref={codeRef}
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        onFocus={() => setEditingField(idxOf('code'))}
                                        onBlur={() => setEditingField(null)}
                                        onKeyDown={handleInputKeyDown}
                                        placeholder="EX: MEUCODIGO"
                                        disabled={loading}
                                        tabIndex={-1}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>

                            <div className="login-buttons">
                                <button
                                    type="button"
                                    onClick={submitCode}
                                    className={`login-btn login-btn-primary ${focusCls('continue')}`}
                                    disabled={loading}
                                    tabIndex={-1}
                                >
                                    {loading ? (
                                        <>
                                            <div className="login-spinner" />
                                            <span>Carregando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSignInAlt size={18} />
                                            <span>Continuar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {hasDnsSelector && (
                                <div className="login-field">
                                    <label>Servidor</label>
                                    <div
                                        className={`login-input-wrap ${focusCls('dns')}`}
                                        onClick={() => {
                                            setFocusedField(idxOf('dns'));
                                            cycleDns();
                                        }}
                                    >
                                        <FaServer size={18} />
                                        <span style={{ flex: 1 }}>{currentDns?.title || 'Selecionar'}</span>
                                        <span className="login-input-hint">trocar</span>
                                    </div>
                                </div>
                            )}

                            <div className="login-field">
                                <label>Usuário</label>
                                <div
                                    className={`login-input-wrap ${focusCls('user')} ${editCls('user')}`}
                                    onClick={() => {
                                        setFocusedField(idxOf('user'));
                                        usernameRef.current?.focus();
                                    }}
                                >
                                    <FaUser size={18} />
                                    <input
                                        ref={usernameRef}
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onFocus={() => setEditingField(idxOf('user'))}
                                        onBlur={() => setEditingField(null)}
                                        onKeyDown={handleInputKeyDown}
                                        disabled={loading}
                                        tabIndex={-1}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <label>Senha</label>
                                <div
                                    className={`login-input-wrap ${focusCls('pass')} ${editCls('pass')}`}
                                    onClick={() => {
                                        setFocusedField(idxOf('pass'));
                                        passwordRef.current?.focus();
                                    }}
                                >
                                    <FaLock size={18} />
                                    <input
                                        ref={passwordRef}
                                        type="text"
                                        className="login-password-input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setEditingField(idxOf('pass'))}
                                        onBlur={() => setEditingField(null)}
                                        onKeyDown={handleInputKeyDown}
                                        disabled={loading}
                                        tabIndex={-1}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>

                            <div className="login-buttons">
                                <button
                                    type="button"
                                    onClick={() => setStep('code')}
                                    className={`login-btn login-btn-secondary ${focusCls('back')}`}
                                    disabled={loading}
                                    tabIndex={-1}
                                >
                                    <FaArrowLeft size={18} />
                                    <span>Voltar</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={submitLogin}
                                    className={`login-btn login-btn-primary ${focusCls('entrar')}`}
                                    disabled={loading}
                                    tabIndex={-1}
                                >
                                    {loading ? (
                                        <>
                                            <div className="login-spinner" />
                                            <span>Entrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSignInAlt size={18} />
                                            <span>Entrar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>

                <div className="login-hint">
                    <span>Navegue com as setas</span>
                    <span>•</span>
                    <span>OK para selecionar</span>
                    <span>•</span>
                    <span>Voltar</span>
                </div>
            </div>
        </div>
    );
}

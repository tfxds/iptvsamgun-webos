// Settings - Configurações do S.A Player (parental/PIN, limpar dados, versão, privacidade, diagnóstico)

import { useState, useRef, useEffect } from 'react';
import { storage, type ParentalConfig } from '../services/storage';
import { getDeviceId, getAppType } from '../services/deviceService';
import { useFocusZone } from '../contexts/FocusContext';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Settings.css';

const APP_VERSION = '1.0.0';

// Linhas navegáveis (em ordem)
const ROWS = ['block', 'pin', 'clear', 'privacy', 'diag'] as const;
type Row = typeof ROWS[number];

export function Settings() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [parental, setParental] = useState<ParentalConfig>(() => storage.getParental());
    const [focused, setFocused] = useState(0);
    const [askPin, setAskPin] = useState<null | 'set' | 'unlock' | 'clear'>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showDiag, setShowDiag] = useState(false);
    const pinRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (askPin) setTimeout(() => pinRef.current?.focus(), 50); }, [askPin]);

    const refresh = () => setParental(storage.getParental());

    const activate = (row: Row) => {
        if (row === 'block') {
            const turningOff = parental.blockAdult;
            if (turningOff && parental.pin) {
                setPinError(''); setPinInput(''); setAskPin('unlock');
            } else {
                storage.saveParental({ blockAdult: !parental.blockAdult }); refresh();
            }
        } else if (row === 'pin') {
            setPinError(''); setPinInput(''); setAskPin('set');
        } else if (row === 'clear') {
            // Limpar apaga o PIN/bloqueio: se ha PIN, exige o PIN antes (senao crianca burla o controle)
            if (parental.pin) { setPinError(''); setPinInput(''); setAskPin('clear'); }
            else setConfirmClear(true);
        } else if (row === 'privacy') {
            setShowPrivacy(p => !p);
        } else if (row === 'diag') {
            setShowDiag(d => !d);
        }
    };

    const confirmPin = () => {
        if (askPin === 'set') {
            if (pinInput.length !== 4) { setPinError('O PIN deve ter 4 dígitos.'); return; }
            storage.saveParental({ pin: pinInput }); refresh();
            setAskPin(null); setPinInput('');
        } else if (askPin === 'unlock') {
            if (pinInput === parental.pin) {
                storage.saveParental({ blockAdult: false }); refresh();
                setAskPin(null); setPinInput('');
            } else {
                setPinError('PIN incorreto.'); setPinInput('');
            }
        } else if (askPin === 'clear') {
            if (pinInput === parental.pin) {
                setAskPin(null); setPinInput(''); setConfirmClear(true);
            } else {
                setPinError('PIN incorreto.'); setPinInput('');
            }
        }
    };

    // TV Navigation (desativada enquanto um sub-fluxo está aberto)
    const subOpen = askPin !== null || confirmClear;
    useTVNavigation({
        onNavigate: (dir) => {
            if (dir === 'left') setFocusZone('sidebar');
            else if (dir === 'up') setFocused(p => Math.max(0, p - 1));
            else if (dir === 'down') setFocused(p => Math.min(ROWS.length - 1, p + 1));
        },
        onEnter: () => activate(ROWS[focused]),
        onBack: () => setFocusZone('sidebar'),
        enabled: focusZone === 'content' && !subOpen,
    });

    const diag: Record<string, string> = {
        versao: APP_VERSION,
        device: getDeviceId(),
        tipo: getAppType(),
        resolucao: `${window.innerWidth}×${window.innerHeight}`,
        plataforma: navigator.userAgent.slice(0, 80),
    };

    return (
        <div className="settings-page">
            <div className="settings-panel">
                <header className="settings-header">
                    <span className="settings-kicker">Configurações</span>
                    <h1>S.A Player</h1>
                </header>

                {/* Controle Parental */}
                <section className="settings-section">
                    <h2 className="settings-section-title">🔒 Controle Parental</h2>

                    <button className={`settings-row ${focused === 0 ? 'tv-focused' : ''}`} onClick={() => activate('block')}>
                        <div className="settings-row-text">
                            <span className="settings-row-label">Bloquear conteúdo adulto</span>
                            <span className="settings-row-desc">Esconde categorias e títulos adultos em Canais, Filmes e Séries</span>
                        </div>
                        <span className={`settings-toggle ${parental.blockAdult ? 'on' : ''}`}><span className="settings-toggle-dot" /></span>
                    </button>

                    <button className={`settings-row ${focused === 1 ? 'tv-focused' : ''}`} onClick={() => activate('pin')}>
                        <div className="settings-row-text">
                            <span className="settings-row-label">PIN de acesso</span>
                            <span className="settings-row-desc">{parental.pin ? 'PIN definido (••••)' : 'Nenhum PIN definido'}</span>
                        </div>
                        <span className="settings-row-action">{parental.pin ? 'Alterar' : 'Definir'}</span>
                    </button>

                    {askPin && (
                        <div className="settings-pinbox">
                            <span className="settings-pin-label">{askPin === 'set' ? 'Digite um PIN de 4 dígitos' : askPin === 'clear' ? 'Digite o PIN para limpar os dados' : 'Digite o PIN para desbloquear'}</span>
                            <input
                                ref={pinRef}
                                className="settings-pin-input"
                                value={pinInput}
                                inputMode="numeric"
                                maxLength={4}
                                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmPin(); } }}
                                placeholder="••••"
                            />
                            {pinError && <span className="settings-pin-error">{pinError}</span>}
                            <div className="settings-pin-actions">
                                <button className="settings-btn primary" onClick={confirmPin}>Confirmar</button>
                                <button className="settings-btn" onClick={() => { setAskPin(null); setPinInput(''); setPinError(''); }}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Limpar dados */}
                <section className="settings-section">
                    <h2 className="settings-section-title">🧹 Dados</h2>
                    <button className={`settings-row ${focused === 2 ? 'tv-focused' : ''}`} onClick={() => activate('clear')}>
                        <div className="settings-row-text">
                            <span className="settings-row-label">Limpar dados do app</span>
                            <span className="settings-row-desc">Apaga favoritos, continuar assistindo, lista, PIN e preferências (não desloga)</span>
                        </div>
                        <span className="settings-row-action danger">Limpar</span>
                    </button>
                    {confirmClear && (
                        <div className="settings-pinbox">
                            <span className="settings-pin-label">Apagar todos os dados locais do app?</span>
                            <div className="settings-pin-actions">
                                <button className="settings-btn danger" onClick={() => {
                                    const cred = storage.getCredentials();
                                    storage.clearAll();
                                    if (cred) storage.saveCredentials(cred); // mantém logado
                                    refresh(); setConfirmClear(false);
                                }}>Sim, limpar</button>
                                <button className="settings-btn" onClick={() => setConfirmClear(false)}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Privacidade */}
                <section className="settings-section">
                    <h2 className="settings-section-title">🛡️ Privacidade</h2>
                    <button className={`settings-row ${focused === 3 ? 'tv-focused' : ''}`} onClick={() => activate('privacy')}>
                        <div className="settings-row-text">
                            <span className="settings-row-label">Política de privacidade</span>
                            <span className="settings-row-desc">{showPrivacy ? 'Ocultar' : 'Ver como seus dados são usados'}</span>
                        </div>
                        <span className="settings-row-action">{showPrivacy ? '▲' : '▼'}</span>
                    </button>
                    {showPrivacy && (
                        <p className="settings-privacy">
                            O S.A Player guarda apenas localmente no aparelho suas credenciais de acesso,
                            favoritos, histórico de "continuar assistindo" e preferências. A senha não é
                            armazenada em texto após o login (sessão por token). Nenhum dado pessoal é
                            compartilhado com terceiros — apenas as chamadas necessárias ao seu provedor
                            de conteúdo e, para capas/sinopses, ao TMDB.
                        </p>
                    )}
                </section>

                {/* Sobre / Versão + Diagnóstico */}
                <section className="settings-section">
                    <h2 className="settings-section-title">ℹ️ Sobre</h2>
                    <div className="settings-info-row"><span>Versão</span><strong>S.A Player • v{APP_VERSION}</strong></div>
                    <button className={`settings-row settings-diag-toggle ${focused === 4 ? 'tv-focused' : ''}`} onClick={() => setShowDiag(d => !d)}>
                        <div className="settings-row-text"><span className="settings-row-label">Diagnóstico</span></div>
                        <span className="settings-row-action">{showDiag ? '▲' : '▼'}</span>
                    </button>
                    {showDiag && (
                        <div className="settings-diag">
                            {Object.entries(diag).map(([k, v]) => (
                                <div key={k} className="settings-diag-line"><span>{k}</span><code>{v}</code></div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

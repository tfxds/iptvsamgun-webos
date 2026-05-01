import { useEffect, useRef, useState } from 'react';
import { storage } from '../services/storage';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Settings.css';

type FocusTarget = 'input' | 'save' | 'clear';

export function Settings() {
    const [tmdbKey, setTmdbKey] = useState(() => storage.getTmdbApiKey());
    const [savedKey, setSavedKey] = useState(() => storage.getTmdbApiKey());
    const [message, setMessage] = useState('');
    const [focusTarget, setFocusTarget] = useState<FocusTarget>('input');
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!message) return;
        const timeout = setTimeout(() => setMessage(''), 3000);
        return () => clearTimeout(timeout);
    }, [message]);

    const saveKey = () => {
        storage.saveTmdbApiKey(tmdbKey);
        const current = storage.getTmdbApiKey();
        setSavedKey(current);
        setTmdbKey(current);
        setMessage(current ? 'Chave TMDB salva neste dispositivo.' : 'Chave TMDB removida.');
    };

    const clearKey = () => {
        storage.clearTmdbApiKey();
        setTmdbKey('');
        setSavedKey('');
        setMessage('Chave TMDB removida deste dispositivo.');
    };

    useTVNavigation({
        enabled: !editing,
        onNavigate: (direction) => {
            if (direction === 'up' || direction === 'left') {
                setFocusTarget((current) => {
                    if (current === 'clear') return 'save';
                    if (current === 'save') return 'input';
                    return 'input';
                });
            }
            if (direction === 'down' || direction === 'right') {
                setFocusTarget((current) => {
                    if (current === 'input') return 'save';
                    if (current === 'save') return 'clear';
                    return 'clear';
                });
            }
        },
        onEnter: () => {
            if (focusTarget === 'input') {
                setEditing(true);
                inputRef.current?.focus();
            }
            if (focusTarget === 'save') saveKey();
            if (focusTarget === 'clear') clearKey();
        },
    });

    const hasSavedKey = savedKey.length > 0;

    return (
        <div className="settings-page">
            <div className="settings-panel">
                <header className="settings-header">
                    <span className="settings-kicker">Configurações</span>
                    <h1>Integração TMDB</h1>
                    <p>
                        O TMDB é opcional. Sem chave, o app usa apenas os dados do seu provedor IPTV.
                        Com uma chave própria, o app busca sinopse, capas e metadados extras.
                    </p>
                </header>

                <section className="settings-section">
                    <label className="settings-label" htmlFor="tmdb-key">
                        Chave API TMDB
                    </label>
                    <input
                        id="tmdb-key"
                        ref={inputRef}
                        className={`settings-input ${focusTarget === 'input' ? 'focused' : ''}`}
                        value={tmdbKey}
                        onChange={(event) => setTmdbKey(event.target.value)}
                        onFocus={() => {
                            setFocusTarget('input');
                            setEditing(true);
                        }}
                        onBlur={() => setEditing(false)}
                        placeholder="Cole sua chave TMDB aqui"
                        autoComplete="off"
                        spellCheck={false}
                    />

                    <div className="settings-status">
                        Status: {hasSavedKey ? 'chave salva localmente neste dispositivo' : 'nenhuma chave salva'}
                    </div>

                    <div className="settings-actions">
                        <button
                            className={`settings-button primary ${focusTarget === 'save' ? 'focused' : ''}`}
                            onClick={saveKey}
                        >
                            Salvar chave
                        </button>
                        <button
                            className={`settings-button secondary ${focusTarget === 'clear' ? 'focused' : ''}`}
                            onClick={clearKey}
                            disabled={!hasSavedKey && !tmdbKey}
                        >
                            Remover chave
                        </button>
                    </div>

                    {message && <p className="settings-message">{message}</p>}
                </section>

                <section className="settings-help">
                    <h2>Como obter sua chave</h2>
                    <ol>
                        <li>Crie uma conta em themoviedb.org.</li>
                        <li>Abra as configurações da sua conta e solicite uma API key.</li>
                        <li>Cole a chave neste campo e salve.</li>
                    </ol>
                </section>
            </div>
        </div>
    );
}

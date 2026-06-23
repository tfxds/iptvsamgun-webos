// MyList Page - "Continuar Assistindo" (assistidos recentemente, filme/serie) com retomada

import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { storage, type ProgressItem } from '../services/storage';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { useFocusZone } from '../contexts/FocusContext';
import { VideoPlayer } from '../components/VideoPlayer';
import './MyList.css';

export function MyList() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [items, setItems] = useState<ProgressItem[]>(() => storage.getContinueWatching());
    const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [player, setPlayer] = useState<{ src: string; title: string; poster: string; resume: number; item: ProgressItem } | null>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'tabs' | 'items' | 'clear'>('items');
    const [focusedTabIndex, setFocusedTabIndex] = useState(0);
    const [focusedItemIndex, setFocusedItemIndex] = useState(0);

    const loadItems = useCallback(() => setItems(storage.getContinueWatching()), []);

    const removeItem = (id: string, type: 'movie' | 'series') => {
        setRemovingId(id);
        setTimeout(() => {
            storage.removeProgress(id, type);
            loadItems();
            setRemovingId(null);
        }, 300);
    };

    const clearAll = () => {
        storage.clearContinueWatching();
        loadItems();
    };

    const movies = items.filter(item => item.type === 'movie');
    const series = items.filter(item => item.type === 'series');
    const displayItems = activeTab === 'all' ? items : activeTab === 'movies' ? movies : series;
    const tabs = ['all', 'movies', 'series'] as const;

    // Retoma de onde parou
    const resumeItem = useCallback(async (item: ProgressItem) => {
        try {
            if (item.type === 'movie') {
                setPlayer({
                    src: api.getVodStreamUrl(Number(item.id), item.containerExtension || 'mp4'),
                    title: item.title, poster: item.poster || '', resume: item.position, item,
                });
            } else {
                const info = await api.getSeriesInfo(Number(item.id));
                const eps = info?.episodes?.[item.season || 1] || [];
                const ep = eps.find(e => e.episode_num === item.episode) || eps[0];
                if (!ep) return;
                setPlayer({
                    src: api.getSeriesStreamUrl(ep.id, ep.container_extension || 'mp4'),
                    title: `${item.title} - T${item.season} E${item.episode}`,
                    poster: item.poster || '', resume: item.position, item,
                });
            }
        } catch (e) {
            console.error('Erro ao retomar:', e);
        }
    }, []);

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'clear') {
            if (direction === 'down') setFocusArea('tabs');
            else if (direction === 'left') setFocusZone('sidebar');
        } else if (focusArea === 'tabs') {
            if (direction === 'left') {
                if (focusedTabIndex === 0) setFocusZone('sidebar');
                else setFocusedTabIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedTabIndex(prev => Math.min(tabs.length - 1, prev + 1));
            } else if (direction === 'up') {
                setFocusArea('clear'); // sobe pro botao Limpar Tudo
            } else if (direction === 'down') {
                setFocusArea('items');
                setFocusedItemIndex(0);
            }
        } else if (focusArea === 'items') {
            const cols = 8;
            const total = displayItems.length;
            if (direction === 'up') {
                if (focusedItemIndex < cols) setFocusArea('tabs');
                else setFocusedItemIndex(prev => Math.max(0, prev - cols));
            } else if (direction === 'down') {
                setFocusedItemIndex(prev => Math.min(total - 1, prev + cols));
            } else if (direction === 'left') {
                if (focusedItemIndex % cols === 0) setFocusZone('sidebar');
                else setFocusedItemIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedItemIndex(prev => Math.min(total - 1, prev + 1));
            }
        }
    };

    const handleEnter = () => {
        if (focusArea === 'clear') {
            clearAll();
        } else if (focusArea === 'tabs') {
            setActiveTab(tabs[focusedTabIndex]);
        } else if (focusArea === 'items') {
            const it = displayItems[focusedItemIndex];
            if (it) resumeItem(it);
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        enabled: focusZone === 'content' && !player,
    });

    const pct = (p: ProgressItem) => p.duration > 0 ? Math.min(100, Math.round((p.position / p.duration) * 100)) : 0;

    // Empty State
    if (items.length === 0) {
        return (
            <div className="mylist-page">
                <div className="mylist-backdrop" />
                <div className="empty-state">
                    <div className="empty-icon-container">
                        <div className="empty-icon">▶️</div>
                        <div className="empty-icon-glow" />
                    </div>
                    <h2 className="empty-title">Nada para continuar ainda</h2>
                    <p className="empty-text">
                        Os filmes e séries que você começar a assistir aparecem aqui pra
                        <strong> retomar de onde parou</strong>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mylist-page">
            <div className="mylist-backdrop" />

            <header className="mylist-header">
                <div className="header-title">
                    <div className="title-icon">▶️</div>
                    <div>
                        <h1>Continuar Assistindo</h1>
                        <p className="subtitle">{items.length} em andamento</p>
                    </div>
                </div>
                <button className={`clear-btn ${focusArea === 'clear' ? 'tv-focused' : ''}`} onClick={clearAll}>
                    <span>🗑️</span>
                    <span>Limpar Tudo</span>
                </button>
            </header>

            <div className="tabs-container">
                <button className={`tab ${activeTab === 'all' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 0 ? 'tv-focused' : ''}`} onClick={() => setActiveTab('all')}>
                    <span>Todos</span><span className="tab-count">{items.length}</span>
                </button>
                <button className={`tab ${activeTab === 'movies' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 1 ? 'tv-focused' : ''}`} onClick={() => setActiveTab('movies')}>
                    <span>🎬 Filmes</span><span className="tab-count">{movies.length}</span>
                </button>
                <button className={`tab ${activeTab === 'series' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 2 ? 'tv-focused' : ''}`} onClick={() => setActiveTab('series')}>
                    <span>📺 Séries</span><span className="tab-count">{series.length}</span>
                </button>
            </div>

            <div className="cards-grid">
                {displayItems.map((item, index) => (
                    <div
                        key={`${item.type}-${item.id}`}
                        className={`card ${removingId === item.id ? 'removing' : ''} ${focusArea === 'items' && focusedItemIndex === index ? 'tv-focused' : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => resumeItem(item)}
                    >
                        <div className="card-poster">
                            {item.poster ? (
                                <img src={item.poster} alt={item.title} />
                            ) : (
                                <div className="poster-placeholder">{item.type === 'movie' ? '🎬' : '📺'}</div>
                            )}
                            <div className="card-type">{item.type === 'movie' ? '🎬' : '📺'}</div>
                            <div className="card-overlay">
                                <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeItem(item.id, item.type); }}>🗑️</button>
                                <button className="play-btn" onClick={(e) => { e.stopPropagation(); resumeItem(item); }}>▶️</button>
                            </div>
                            {/* barra de progresso */}
                            <div className="card-progress"><div className="card-progress-fill" style={{ width: `${pct(item)}%` }} /></div>
                        </div>
                        <div className="card-info">
                            <h3 className="card-title">{item.title}</h3>
                            <div className="card-meta">
                                {item.type === 'series' && <span>T{item.season} E{item.episode}</span>}
                                <span>{pct(item)}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mylist-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Continuar</span>
                <span>← Voltar</span>
            </div>

            {player && (
                <VideoPlayer
                    src={player.src}
                    title={player.title}
                    poster={player.poster}
                    contentType={player.item.type}
                    resumeTime={player.resume || null}
                    onTimeUpdate={(t, d) => storage.saveProgress({ ...player.item, position: t, duration: d })}
                    onClose={() => { setPlayer(null); loadItems(); }}
                />
            )}
        </div>
    );
}

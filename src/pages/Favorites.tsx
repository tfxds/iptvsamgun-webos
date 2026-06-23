// Favorites Page - Matching NeoStream Desktop Style

import { useCallback, useState } from 'react';
import { storage } from '../services/storage';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { useFocusZone } from '../contexts/FocusContext';
import './Favorites.css';

interface FavoriteItem {
    id: string;
    type: 'movie' | 'series' | 'channel';
    title: string;
    poster?: string;
    rating?: string;
    year?: string;
    addedAt: number;
}

export function Favorites() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [items, setItems] = useState<FavoriteItem[]>(() => storage.getFavorites());
    const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series' | 'channels'>('all');
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'tabs' | 'items' | 'clear'>('items');
    const [focusedTabIndex, setFocusedTabIndex] = useState(0);
    const [focusedItemIndex, setFocusedItemIndex] = useState(0);

    const loadItems = useCallback(() => {
        const saved = storage.getFavorites();
        setItems(saved);
    }, []);

    const removeItem = (id: string) => {
        setRemovingId(id);
        setTimeout(() => {
            storage.removeFavorite(id);
            loadItems();
            setRemovingId(null);
        }, 300);
    };

    const clearAll = () => {
        storage.clearFavorites();
        loadItems();
    };

    const movies = items.filter(item => item.type === 'movie');
    const series = items.filter(item => item.type === 'series');
    const channels = items.filter(item => item.type === 'channel');

    const displayItems = activeTab === 'all' ? items :
        activeTab === 'movies' ? movies :
            activeTab === 'series' ? series : channels;

    const tabs = ['all', 'movies', 'series', 'channels'] as const;

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
                setFocusArea('clear');
            } else if (direction === 'down') {
                setFocusArea('items');
                setFocusedItemIndex(0);
            }
        } else if (focusArea === 'items') {
            const cols = 8;
            const total = displayItems.length;

            if (direction === 'up') {
                if (focusedItemIndex < cols) {
                    setFocusArea('tabs');
                } else {
                    setFocusedItemIndex(prev => Math.max(0, prev - cols));
                }
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
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        enabled: focusZone === 'content',
    });

    // Empty State
    if (items.length === 0) {
        return (
            <div className="favorites-page">
                <div className="favorites-backdrop" />
                <div className="empty-state">
                    <div className="empty-icon-container">
                        <div className="empty-icon">♥</div>
                        <div className="empty-icon-glow" />
                    </div>
                    <h2 className="empty-title">Nenhum favorito ainda</h2>
                    <p className="empty-text">
                        Seus filmes, séries e canais favoritos aparecerão aqui.
                        Clique no <strong>coração</strong> em qualquer conteúdo para adicionar aos favoritos.
                    </p>
                    <div className="empty-suggestions">
                        <button className="suggestion-btn">
                            <span>Filmes</span>
                            <span>Explorar Filmes</span>
                        </button>
                        <button className="suggestion-btn">
                            <span>Séries</span>
                            <span>Explorar Séries</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="favorites-page">
            <div className="favorites-backdrop" />

            {/* Header */}
            <header className="favorites-header">
                <div className="header-title">
                    <div className="title-icon">♥</div>
                    <div>
                        <h1>Meus Favoritos</h1>
                        <p className="subtitle">{items.length} itens salvos</p>
                    </div>
                </div>
                {items.length > 0 && (
                    <button className={`clear-btn ${focusArea === 'clear' ? 'tv-focused' : ''}`} onClick={clearAll}>
                        <span>Excluir</span>
                        <span>Limpar Tudo</span>
                    </button>
                )}
            </header>

            {/* Tabs */}
            <div className="tabs-container">
                <button
                    className={`tab ${activeTab === 'all' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 0 ? 'tv-focused' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span>Todos</span>
                    <span className="tab-count">{items.length}</span>
                </button>
                <button
                    className={`tab ${activeTab === 'movies' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 1 ? 'tv-focused' : ''}`}
                    onClick={() => setActiveTab('movies')}
                >
                    <span>Filmes</span>
                    <span className="tab-count">{movies.length}</span>
                </button>
                <button
                    className={`tab ${activeTab === 'series' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 2 ? 'tv-focused' : ''}`}
                    onClick={() => setActiveTab('series')}
                >
                    <span>Séries</span>
                    <span className="tab-count">{series.length}</span>
                </button>
                <button
                    className={`tab ${activeTab === 'channels' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 3 ? 'tv-focused' : ''}`}
                    onClick={() => setActiveTab('channels')}
                >
                    <span>Canais</span>
                    <span className="tab-count">{channels.length}</span>
                </button>
            </div>

            {/* Cards Grid */}
            <div className="cards-grid">
                {displayItems.map((item, index) => (
                    <div
                        key={item.id}
                        className={`card ${removingId === item.id ? 'removing' : ''} ${focusArea === 'items' && focusedItemIndex === index ? 'tv-focused' : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className="card-poster">
                            {item.poster ? (
                                <img src={item.poster} alt={item.title} />
                            ) : (
                                <div className="poster-placeholder">
                                    {item.type === 'movie' ? 'Filme' : item.type === 'series' ? 'Série' : 'Canal'}
                                </div>
                            )}
                            <div className="card-type">
                                {item.type === 'movie' ? 'Filme' : item.type === 'series' ? 'Série' : 'Canal'}
                            </div>
                            <div className="card-overlay">
                                <button
                                    className="remove-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(item.id);
                                    }}
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                        <div className="card-info">
                            <h3 className="card-title">{item.title}</h3>
                            <div className="card-meta">
                                {item.year && <span>{item.year}</span>}
                                {item.rating && <span>★ {item.rating}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Hints */}
            <div className="favorites-hints">
                <span>Setas Navegar</span>
                <span>OK Selecionar</span>
                <span>Voltar</span>
            </div>
        </div>
    );
}

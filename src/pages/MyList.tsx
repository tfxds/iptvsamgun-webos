// MyList Page - Watch Later List - Matching NeoStream Desktop Style

import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './MyList.css';

interface WatchLaterItem {
    id: string;
    type: 'movie' | 'series' | 'channel';
    title: string;
    poster?: string;
    rating?: string;
    year?: string;
    addedAt: number;
}

export function MyList() {
    const [items, setItems] = useState<WatchLaterItem[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'tabs' | 'items'>('items');
    const [focusedTabIndex, setFocusedTabIndex] = useState(0);
    const [focusedItemIndex, setFocusedItemIndex] = useState(0);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = () => {
        const saved = storage.getWatchLater();
        setItems(saved);
    };

    const removeItem = (id: string) => {
        setRemovingId(id);
        setTimeout(() => {
            storage.removeWatchLater(id);
            loadItems();
            setRemovingId(null);
        }, 300);
    };

    const clearAll = () => {
        storage.clearWatchLater();
        loadItems();
    };

    const movies = items.filter(item => item.type === 'movie');
    const series = items.filter(item => item.type === 'series');

    const displayItems = activeTab === 'all' ? items :
        activeTab === 'movies' ? movies : series;

    const tabs = ['all', 'movies', 'series'] as const;

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'tabs') {
            if (direction === 'left') {
                setFocusedTabIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedTabIndex(prev => Math.min(tabs.length - 1, prev + 1));
            } else if (direction === 'down') {
                setFocusArea('items');
                setFocusedItemIndex(0);
            }
        } else if (focusArea === 'items') {
            const cols = 5;
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
                setFocusedItemIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedItemIndex(prev => Math.min(total - 1, prev + 1));
            }
        }
    };

    const handleEnter = () => {
        if (focusArea === 'tabs') {
            setActiveTab(tabs[focusedTabIndex]);
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
    });

    // Empty State
    if (items.length === 0) {
        return (
            <div className="mylist-page">
                <div className="mylist-backdrop" />
                <div className="empty-state">
                    <div className="empty-icon-container">
                        <div className="empty-icon">📑</div>
                        <div className="empty-icon-glow" />
                    </div>
                    <h2 className="empty-title">Sua lista está vazia</h2>
                    <p className="empty-text">
                        Adicione filmes e séries para assistir depois clicando em
                        <strong> "+ Minha Lista"</strong> no modal de detalhes.
                    </p>
                    <div className="empty-suggestions">
                        <button className="suggestion-btn">
                            <span>🎬</span>
                            <span>Explorar Filmes</span>
                        </button>
                        <button className="suggestion-btn">
                            <span>📺</span>
                            <span>Explorar Séries</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mylist-page">
            <div className="mylist-backdrop" />

            {/* Header */}
            <header className="mylist-header">
                <div className="header-title">
                    <div className="title-icon">📑</div>
                    <div>
                        <h1>Minha Lista</h1>
                        <p className="subtitle">{items.length} itens para assistir</p>
                    </div>
                </div>
                {items.length > 0 && (
                    <button className="clear-btn" onClick={clearAll}>
                        <span>🗑️</span>
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
                    <span>🎬 Filmes</span>
                    <span className="tab-count">{movies.length}</span>
                </button>
                <button
                    className={`tab ${activeTab === 'series' ? 'active' : ''} ${focusArea === 'tabs' && focusedTabIndex === 2 ? 'tv-focused' : ''}`}
                    onClick={() => setActiveTab('series')}
                >
                    <span>📺 Séries</span>
                    <span className="tab-count">{series.length}</span>
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
                                    {item.type === 'movie' ? '🎬' : '📺'}
                                </div>
                            )}
                            <div className="card-type">
                                {item.type === 'movie' ? '🎬' : '📺'}
                            </div>
                            <div className="card-overlay">
                                <button
                                    className="remove-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(item.id);
                                    }}
                                >
                                    🗑️
                                </button>
                                <button className="play-btn">
                                    ▶️
                                </button>
                            </div>
                        </div>
                        <div className="card-info">
                            <h3 className="card-title">{item.title}</h3>
                            <div className="card-meta">
                                {item.year && <span>{item.year}</span>}
                                {item.rating && <span>⭐ {item.rating}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Hints */}
            <div className="mylist-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Selecionar</span>
                <span>← Voltar</span>
            </div>
        </div>
    );
}

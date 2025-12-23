// LiveTV Page - Matching NeoStream Desktop Style

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { LiveStream, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { CategoryMenu } from '../components/CategoryMenu';
import { AnimatedSearchBar } from '../components/AnimatedSearchBar';
import './LiveTV.css';

export function LiveTV() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<LiveStream | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'categories' | 'search' | 'channels'>('channels');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [streamsData, categoriesData] = await Promise.all([
                    api.getLiveStreams(),
                    api.getLiveCategories()
                ]);
                setStreams(streamsData);
                setCategories(categoriesData);
            } catch (err: any) {
                setError(err?.message || 'Erro ao carregar canais');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Filter streams
    const filteredStreams = streams.filter(stream => {
        const matchesSearch = stream.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || stream.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            if (direction === 'left') {
                setFocusedCategoryIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedCategoryIndex(prev => Math.min(categories.length, prev + 1));
            } else if (direction === 'down') {
                setFocusArea('channels');
                setFocusedChannelIndex(0);
            }
        } else if (focusArea === 'channels') {
            const cols = 3; // Grid columns
            const totalChannels = filteredStreams.length;

            if (direction === 'up') {
                if (focusedChannelIndex < cols) {
                    setFocusArea('categories');
                } else {
                    setFocusedChannelIndex(prev => Math.max(0, prev - cols));
                }
            } else if (direction === 'down') {
                setFocusedChannelIndex(prev => Math.min(totalChannels - 1, prev + cols));
            } else if (direction === 'left') {
                setFocusedChannelIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedChannelIndex(prev => Math.min(totalChannels - 1, prev + 1));
            }
        }
    };

    const handleEnter = () => {
        if (focusArea === 'categories') {
            if (focusedCategoryIndex === 0) {
                setSelectedCategory('all');
            } else {
                setSelectedCategory(categories[focusedCategoryIndex - 1]?.category_id || 'all');
            }
        } else if (focusArea === 'channels') {
            const channel = filteredStreams[focusedChannelIndex];
            if (channel) {
                setSelectedChannel(channel);
            }
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
    });

    const handleImageError = (streamId: number) => {
        setBrokenImages(prev => new Set(prev).add(streamId));
    };

    // Loading State with Animation
    if (loading) {
        return (
            <div className="livetv-loading-container">
                <div className="livetv-bg-gradient" />
                <div className="livetv-bg-glow" />

                <div className="loading-icon-wrapper">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="loading-ring" style={{ animationDelay: `${i * 0.5}s` }} />
                    ))}
                    <div className="loading-tv-icon">📺</div>
                </div>

                <div className="loading-text">
                    <span>Carregando canais</span>
                    <div className="loading-dots">
                        {[0, 1, 2].map(i => (
                            <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                </div>

                <div className="loading-skeleton-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton-icon" />
                            <div className="skeleton-text">
                                <div className="skeleton-line skeleton-line-long" />
                                <div className="skeleton-line skeleton-line-short" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="livetv-error-container">
                <div className="error-icon">📡</div>
                <h2>Erro ao carregar canais</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">
                    🔄 Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="livetv-page">
            {/* Animated Background */}
            <div className="livetv-bg-gradient" />
            <div className="livetv-bg-glow" />

            {/* Animated Search Bar */}
            <AnimatedSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar canais..."
            />

            {/* Category Menu (Hamburger Button) */}
            <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                type="live"
            />

            {/* Channel Preview (when selected) */}
            {selectedChannel && (
                <div className="channel-preview">
                    <div className="preview-header">
                        <h2 className="preview-title">{selectedChannel.name}</h2>
                        <button className="preview-close" onClick={() => setSelectedChannel(null)}>✕</button>
                    </div>
                    <div className="preview-content">
                        <div className="preview-video">
                            <div className="preview-placeholder">
                                {brokenImages.has(selectedChannel.stream_id) ? (
                                    <span className="placeholder-emoji">📺</span>
                                ) : (
                                    <img
                                        src={selectedChannel.stream_icon}
                                        alt={selectedChannel.name}
                                        onError={() => handleImageError(selectedChannel.stream_id)}
                                    />
                                )}
                            </div>
                            <div className="live-badge">
                                <span className="live-dot" />
                                AO VIVO
                            </div>
                        </div>
                        <div className="preview-actions">
                            <button className="play-button">
                                ▶ Assistir
                            </button>
                            <button className="info-button">
                                ℹ Informações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Channels Grid - Horizontal Cards */}
            <div className="livetv-content">
                {filteredStreams.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">📺</div>
                        <p>Nenhum canal encontrado</p>
                        <span>Tente buscar por outro termo</span>
                    </div>
                ) : (
                    <div className="channels-grid">
                        {filteredStreams.map((stream, index) => (
                            <div
                                key={stream.stream_id}
                                className={`channel-card ${focusArea === 'channels' && focusedChannelIndex === index ? 'tv-focused' : ''} ${selectedChannel?.stream_id === stream.stream_id ? 'selected' : ''}`}
                                onClick={() => setSelectedChannel(stream)}
                                style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                            >
                                <div className="channel-logo">
                                    {brokenImages.has(stream.stream_id) ? (
                                        <span className="channel-placeholder">📺</span>
                                    ) : (
                                        <img
                                            src={stream.stream_icon}
                                            alt={stream.name}
                                            onError={() => handleImageError(stream.stream_id)}
                                        />
                                    )}
                                </div>
                                <div className="channel-info">
                                    <div className="channel-name">{stream.name}</div>
                                </div>
                                <div className="channel-live-indicator" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Hints */}
            <div className="livetv-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Selecionar</span>
                <span>← Voltar</span>
            </div>
        </div>
    );
}

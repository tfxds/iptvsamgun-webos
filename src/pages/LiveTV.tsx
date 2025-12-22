// LiveTV Page - Channel Grid with Categories

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { LiveStream, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './LiveTV.css';

interface LiveTVProps {
    onPlayChannel?: (channel: LiveStream) => void;
}

export function LiveTV({ onPlayChannel }: LiveTVProps) {
    const [channels, setChannels] = useState<LiveStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [focusArea, setFocusArea] = useState<'categories' | 'channels'>('categories');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);

    const GRID_COLUMNS = 5;

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            setLoading(true);
            const [channelsData, categoriesData] = await Promise.all([
                api.getLiveStreams(),
                api.getLiveCategories(),
            ]);
            setChannels(channelsData);
            setCategories([{ category_id: 'all', category_name: 'Todos', parent_id: 0 }, ...categoriesData]);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar canais');
        } finally {
            setLoading(false);
        }
    };

    const filteredChannels = selectedCategory === 'all'
        ? channels
        : channels.filter(ch => ch.category_id === selectedCategory);

    const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            // Category navigation (horizontal)
            if (direction === 'left') {
                setFocusedCategoryIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedCategoryIndex(prev => Math.min(categories.length - 1, prev + 1));
            } else if (direction === 'down') {
                setFocusArea('channels');
                setFocusedChannelIndex(0);
            }
        } else {
            // Channel grid navigation
            const currentIndex = focusedChannelIndex;
            let newIndex = currentIndex;

            switch (direction) {
                case 'up':
                    newIndex = currentIndex - GRID_COLUMNS;
                    if (newIndex < 0) {
                        setFocusArea('categories');
                        return;
                    }
                    break;
                case 'down':
                    newIndex = currentIndex + GRID_COLUMNS;
                    break;
                case 'left':
                    if (currentIndex % GRID_COLUMNS !== 0) {
                        newIndex = currentIndex - 1;
                    }
                    break;
                case 'right':
                    if ((currentIndex + 1) % GRID_COLUMNS !== 0) {
                        newIndex = currentIndex + 1;
                    }
                    break;
            }

            if (newIndex >= 0 && newIndex < filteredChannels.length) {
                setFocusedChannelIndex(newIndex);
            }
        }
    }, [focusArea, focusedChannelIndex, categories.length, filteredChannels.length]);

    const handleEnter = useCallback(() => {
        if (focusArea === 'categories') {
            const category = categories[focusedCategoryIndex];
            if (category) {
                setSelectedCategory(category.category_id);
                setFocusedChannelIndex(0);
            }
        } else {
            const channel = filteredChannels[focusedChannelIndex];
            if (channel) {
                storage.setLastChannel(channel.stream_id);
                onPlayChannel?.(channel);
            }
        }
    }, [focusArea, focusedCategoryIndex, focusedChannelIndex, categories, filteredChannels, onPlayChannel]);

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
    });

    // Scroll focused channel into view
    useEffect(() => {
        const channelEl = document.querySelector(`[data-channel-index="${focusedChannelIndex}"]`);
        if (channelEl) {
            channelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [focusedChannelIndex]);

    if (loading) {
        return (
            <div className="livetv-loading">
                <div className="loading-spinner" />
                <p>Carregando canais...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="livetv-error">
                <p>{error}</p>
                <button className="tv-button" onClick={loadContent}>Tentar novamente</button>
            </div>
        );
    }

    return (
        <div className="livetv">
            {/* Header */}
            <header className="livetv-header">
                <h1 className="livetv-title">📺 TV ao Vivo</h1>
                <span className="livetv-count">{filteredChannels.length} canais</span>
            </header>

            {/* Category Filter */}
            <div className="livetv-categories">
                <div className="livetv-categories-scroll">
                    {categories.map((cat, index) => (
                        <button
                            key={cat.category_id}
                            className={`livetv-category ${selectedCategory === cat.category_id ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === index ? 'tv-focused' : ''}`}
                            onClick={() => {
                                setSelectedCategory(cat.category_id);
                                setFocusedCategoryIndex(index);
                            }}
                            data-focusable="true"
                        >
                            {cat.category_name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Channel Grid */}
            <div className="livetv-grid">
                {filteredChannels.map((channel, index) => (
                    <div
                        key={channel.stream_id}
                        className={`livetv-channel ${focusArea === 'channels' && focusedChannelIndex === index ? 'tv-focused' : ''}`}
                        data-channel-index={index}
                        data-focusable="true"
                        onClick={() => {
                            setFocusedChannelIndex(index);
                            onPlayChannel?.(channel);
                        }}
                    >
                        <div className="livetv-channel-image">
                            {channel.stream_icon ? (
                                <img
                                    src={channel.stream_icon}
                                    alt={channel.name}
                                    loading="lazy"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.classList.add('no-image');
                                    }}
                                />
                            ) : (
                                <div className="livetv-channel-placeholder">📺</div>
                            )}
                            <div className="livetv-channel-live">AO VIVO</div>
                        </div>
                        <div className="livetv-channel-info">
                            <h3 className="livetv-channel-name">{channel.name}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation hints */}
            <div className="livetv-hints">
                <span>↑↓←→ Navegar</span>
                <span>•</span>
                <span>OK Assistir</span>
            </div>
        </div>
    );
}

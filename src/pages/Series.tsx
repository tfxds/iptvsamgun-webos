// Series Page - Matching NeoStream Desktop Style

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Series as SeriesType, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { CategoryMenu } from '../components/CategoryMenu';
import { AnimatedSearchBar } from '../components/AnimatedSearchBar';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { VideoPlayer } from '../components/VideoPlayer';
import './Series.css';

export function Series() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [series, setSeries] = useState<SeriesType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeries, setSelectedSeries] = useState<SeriesType | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playerInfo, setPlayerInfo] = useState<{ url: string; title: string; poster: string } | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(24); // Start with reasonable default
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'categories' | 'series'>('series');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedSeriesIndex, setFocusedSeriesIndex] = useState(0);

    // Calculate initial visible count based on screen size
    useEffect(() => {
        const calculateVisibleItems = () => {
            const container = scrollContainerRef.current;
            if (!container) return;

            // Card dimensions (160px min width + 20px gap)
            const cardWidth = 180;
            const cardHeight = 290; // 2:3 aspect ratio (~240px) + title (~50px)

            const containerWidth = container.clientWidth - 32; // minus padding
            const containerHeight = window.innerHeight;

            // Calculate columns and rows that fit on screen + 1 extra row
            const cols = Math.floor(containerWidth / cardWidth);
            const rows = Math.ceil(containerHeight / cardHeight) + 1; // +1 extra row

            const initialCount = cols * rows;
            setVisibleCount(Math.max(initialCount, 12)); // Minimum 12 items
        };

        calculateVisibleItems();
        window.addEventListener('resize', calculateVisibleItems);

        return () => window.removeEventListener('resize', calculateVisibleItems);
    }, [loading]); // Recalculate when loading finishes

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [seriesData, categoriesData] = await Promise.all([
                    api.getSeries(),
                    api.getSeriesCategories()
                ]);
                setSeries(seriesData);
                setCategories(categoriesData);
            } catch (err: any) {
                setError(err?.message || 'Erro ao carregar séries');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Filter series
    const filteredSeries = series.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || s.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Lazy loading scroll - load one more row when scrolling near bottom
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Load more when user scrolls to 80% of the content
            if (scrollTop + clientHeight >= scrollHeight * 0.8 && visibleCount < filteredSeries.length) {
                const containerWidth = container.clientWidth - 32;
                const cols = Math.floor(containerWidth / 180);
                // Add one row at a time
                setVisibleCount(prev => Math.min(prev + cols, filteredSeries.length));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredSeries.length, visibleCount]);

    // Reset on filter change - recalculate visible count
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const cardWidth = 180;
        const cardHeight = 290;
        const containerWidth = container.clientWidth - 32;
        const containerHeight = window.innerHeight;
        const cols = Math.floor(containerWidth / cardWidth);
        const rows = Math.ceil(containerHeight / cardHeight) + 1;

        setVisibleCount(Math.max(cols * rows, 12));
        setSelectedSeries(null);
    }, [searchQuery, selectedCategory]);

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            if (direction === 'left') {
                setFocusedCategoryIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedCategoryIndex(prev => Math.min(categories.length, prev + 1));
            } else if (direction === 'down') {
                setFocusArea('series');
                setFocusedSeriesIndex(0);
            }
        } else if (focusArea === 'series') {
            const cols = 5;
            const totalSeries = filteredSeries.length;

            if (direction === 'up') {
                if (focusedSeriesIndex < cols) {
                    setFocusArea('categories');
                } else {
                    setFocusedSeriesIndex(prev => Math.max(0, prev - cols));
                }
            } else if (direction === 'down') {
                setFocusedSeriesIndex(prev => Math.min(totalSeries - 1, prev + cols));
            } else if (direction === 'left') {
                setFocusedSeriesIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedSeriesIndex(prev => Math.min(totalSeries - 1, prev + 1));
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
        } else if (focusArea === 'series') {
            const item = filteredSeries[focusedSeriesIndex];
            if (item) {
                setSelectedSeries(item);
                setShowModal(true);
            }
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
    });

    const handleImageError = (seriesId: number) => {
        setBrokenImages(prev => new Set(prev).add(seriesId));
    };

    // Loading State
    if (loading) {
        return (
            <div className="series-page">
                <div className="series-bg-gradient" />
                <div className="series-loading">
                    <div className="loading-grid">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="skeleton-poster" />
                                <div className="skeleton-title" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="series-error-container">
                <div className="error-glow" />
                <div className="error-content">
                    <div className="error-icon">📺</div>
                    <h2>Erro ao carregar séries</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-button">
                        🔄 Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="series-page">
            {/* Dynamic Background */}
            <div className="series-bg-gradient" />
            {selectedSeries && selectedSeries.cover && (
                <div
                    className="series-backdrop"
                    style={{ backgroundImage: `url(${selectedSeries.cover})` }}
                />
            )}

            {/* Animated Search Bar */}
            <AnimatedSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar séries..."
            />

            {/* Category Menu (Hamburger Button) */}
            <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                type="series"
            />

            {/* Content Detail Modal */}
            {selectedSeries && (
                <ContentDetailModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedSeries(null);
                    }}
                    contentId={String(selectedSeries.series_id)}
                    contentType="series"
                    contentData={{
                        name: selectedSeries.name,
                        cover: selectedSeries.cover,
                        rating: selectedSeries.rating,
                        plot: selectedSeries.plot,
                        genre: selectedSeries.genre,
                        cast: selectedSeries.cast,
                        director: selectedSeries.director,
                        release_date: selectedSeries.release_date,
                    }}
                    onPlay={async (season, episode) => {
                        // Get series info to find episode stream ID
                        try {
                            const seriesInfo = await api.getSeriesInfo(selectedSeries.series_id);
                            const episodes = seriesInfo?.episodes?.[season || 1] || [];
                            const episodeData = episodes.find(e => e.episode_num === episode) || episodes[0];

                            if (episodeData) {
                                const streamUrl = api.getSeriesStreamUrl(
                                    episodeData.id,
                                    episodeData.container_extension || 'mp4'
                                );
                                setPlayerInfo({
                                    url: streamUrl,
                                    title: `${selectedSeries.name} - T${season} E${episode}`,
                                    poster: selectedSeries.cover
                                });
                                setShowPlayer(true);
                            }
                        } catch (err) {
                            console.error('Error getting episode info:', err);
                        }
                        setShowModal(false);
                    }}
                />
            )}

            {/* Video Player */}
            {showPlayer && playerInfo && (
                <VideoPlayer
                    src={playerInfo.url}
                    title={playerInfo.title}
                    poster={playerInfo.poster}
                    onClose={() => {
                        setShowPlayer(false);
                        setPlayerInfo(null);
                    }}
                />
            )}

            {/* Series Grid */}
            <div ref={scrollContainerRef} className="series-content">
                {filteredSeries.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">📺</div>
                        <p>Nenhuma série encontrada</p>
                        <span>Tente buscar por outro termo</span>
                    </div>
                ) : (
                    <div className="series-grid">
                        {filteredSeries.slice(0, visibleCount).map((item, index) => (
                            <div
                                key={item.series_id}
                                className={`series-card ${focusArea === 'series' && focusedSeriesIndex === index ? 'tv-focused' : ''} ${selectedSeries?.series_id === item.series_id ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedSeries(item);
                                    setShowModal(true);
                                }}
                                style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                            >
                                <div className="series-poster">
                                    {brokenImages.has(item.series_id) ? (
                                        <div className="poster-placeholder">📺</div>
                                    ) : (
                                        <img
                                            src={item.cover}
                                            alt={item.name}
                                            loading="lazy"
                                            onError={() => handleImageError(item.series_id)}
                                        />
                                    )}
                                    {item.rating && parseFloat(item.rating) > 0 && (
                                        <div className="series-rating">⭐ {item.rating}</div>
                                    )}
                                </div>
                                <div className="series-title">{item.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Hints */}
            <div className="series-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Selecionar</span>
                <span>← Voltar</span>
            </div>
        </div>
    );
}

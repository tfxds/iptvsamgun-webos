// Series Page - Matching NeoStream Desktop Style

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Series as SeriesType, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { CategoryMenu } from '../components/CategoryMenu';
import './Series.css';

export function Series() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [series, setSeries] = useState<SeriesType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeries, setSelectedSeries] = useState<SeriesType | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(30);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'categories' | 'series'>('series');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedSeriesIndex, setFocusedSeriesIndex] = useState(0);

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

    // Lazy loading scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight * 0.85 && visibleCount < filteredSeries.length) {
                setVisibleCount(prev => Math.min(prev + 20, filteredSeries.length));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredSeries.length, visibleCount]);

    // Reset on filter change
    useEffect(() => {
        setVisibleCount(30);
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

            {/* Search Bar */}
            <div className="series-search-container">
                <div className="search-icon">🔍</div>
                <input
                    type="text"
                    className="series-search-input"
                    placeholder="Buscar séries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                )}
            </div>

            {/* Category Menu (Hamburger Button) */}
            <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                type="series"
            />

            {/* Series Preview Panel */}
            {selectedSeries && (
                <div className="series-preview-panel">
                    <div className="preview-poster">
                        <img
                            src={selectedSeries.cover}
                            alt={selectedSeries.name}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                    <div className="preview-info">
                        <h2 className="preview-title">{selectedSeries.name}</h2>
                        <div className="preview-meta">
                            {selectedSeries.rating && (
                                <span className="meta-badge rating-badge">⭐ {selectedSeries.rating}</span>
                            )}
                            {selectedSeries.release_date && (
                                <span className="meta-badge date-badge">📅 {selectedSeries.release_date.substring(0, 4)}</span>
                            )}
                            {selectedSeries.genre && (
                                <span className="meta-badge genre-badge">🎭 {selectedSeries.genre.split(',')[0]}</span>
                            )}
                        </div>
                        {selectedSeries.plot && (
                            <p className="preview-plot">{selectedSeries.plot}</p>
                        )}
                        <div className="preview-actions">
                            <button className="play-button">▶ Assistir</button>
                            <button className="close-button" onClick={() => setSelectedSeries(null)}>✕</button>
                        </div>
                    </div>
                </div>
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
                                onClick={() => setSelectedSeries(item)}
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

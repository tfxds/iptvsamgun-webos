// Movies Page - Matching NeoStream Desktop Style

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { VODStream, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Movies.css';

export function Movies() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [streams, setStreams] = useState<VODStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMovie, setSelectedMovie] = useState<VODStream | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(30);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'categories' | 'movies'>('movies');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [streamsData, categoriesData] = await Promise.all([
                    api.getVODStreams(),
                    api.getVodCategories()
                ]);
                setStreams(streamsData);
                setCategories(categoriesData);
            } catch (err: any) {
                setError(err?.message || 'Erro ao carregar filmes');
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

    // Lazy loading scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight * 0.85 && visibleCount < filteredStreams.length) {
                setVisibleCount(prev => Math.min(prev + 20, filteredStreams.length));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredStreams.length, visibleCount]);

    // Reset on filter change
    useEffect(() => {
        setVisibleCount(30);
        setSelectedMovie(null);
    }, [searchQuery, selectedCategory]);

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            if (direction === 'left') {
                setFocusedCategoryIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedCategoryIndex(prev => Math.min(categories.length, prev + 1));
            } else if (direction === 'down') {
                setFocusArea('movies');
                setFocusedMovieIndex(0);
            }
        } else if (focusArea === 'movies') {
            const cols = 5; // Grid columns
            const totalMovies = filteredStreams.length;

            if (direction === 'up') {
                if (focusedMovieIndex < cols) {
                    setFocusArea('categories');
                } else {
                    setFocusedMovieIndex(prev => Math.max(0, prev - cols));
                }
            } else if (direction === 'down') {
                setFocusedMovieIndex(prev => Math.min(totalMovies - 1, prev + cols));
            } else if (direction === 'left') {
                setFocusedMovieIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedMovieIndex(prev => Math.min(totalMovies - 1, prev + 1));
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
        } else if (focusArea === 'movies') {
            const movie = filteredStreams[focusedMovieIndex];
            if (movie) {
                setSelectedMovie(movie);
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

    // Loading State
    if (loading) {
        return (
            <div className="movies-page">
                <div className="movies-bg-gradient" />
                <div className="movies-loading">
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
            <div className="movies-error-container">
                <div className="error-glow" />
                <div className="error-content">
                    <div className="error-icon">🎬</div>
                    <h2>Erro ao carregar filmes</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-button">
                        🔄 Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="movies-page">
            {/* Dynamic Background */}
            <div className="movies-bg-gradient" />
            {selectedMovie && selectedMovie.cover && (
                <div
                    className="movies-backdrop"
                    style={{ backgroundImage: `url(${selectedMovie.cover})` }}
                />
            )}

            {/* Search Bar */}
            <div className="movies-search-container">
                <div className="search-icon">🔍</div>
                <input
                    type="text"
                    className="movies-search-input"
                    placeholder="Buscar filmes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                )}
            </div>

            {/* Category Menu */}
            <div className="movies-categories">
                <button
                    className={`category-btn ${selectedCategory === 'all' ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === 0 ? 'tv-focused' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                    Todos ({streams.length})
                </button>
                {categories.map((cat, index) => (
                    <button
                        key={cat.category_id}
                        className={`category-btn ${selectedCategory === cat.category_id ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === index + 1 ? 'tv-focused' : ''}`}
                        onClick={() => setSelectedCategory(cat.category_id)}
                    >
                        {cat.category_name}
                    </button>
                ))}
            </div>

            {/* Movie Preview Panel */}
            {selectedMovie && (
                <div className="movie-preview-panel">
                    <div className="preview-poster">
                        <img
                            src={selectedMovie.cover}
                            alt={selectedMovie.name}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                    <div className="preview-info">
                        <h2 className="preview-title">{selectedMovie.name}</h2>
                        <div className="preview-meta">
                            {selectedMovie.rating && (
                                <span className="meta-badge rating-badge">⭐ {selectedMovie.rating}</span>
                            )}
                            {selectedMovie.release_date && (
                                <span className="meta-badge date-badge">📅 {selectedMovie.release_date.substring(0, 4)}</span>
                            )}
                            {selectedMovie.genre && (
                                <span className="meta-badge genre-badge">🎭 {selectedMovie.genre.split(',')[0]}</span>
                            )}
                        </div>
                        {selectedMovie.plot && (
                            <p className="preview-plot">{selectedMovie.plot}</p>
                        )}
                        <div className="preview-actions">
                            <button className="play-button">▶ Assistir</button>
                            <button className="close-button" onClick={() => setSelectedMovie(null)}>✕</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Movies Grid */}
            <div ref={scrollContainerRef} className="movies-content">
                {filteredStreams.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🎬</div>
                        <p>Nenhum filme encontrado</p>
                        <span>Tente buscar por outro termo</span>
                    </div>
                ) : (
                    <div className="movies-grid">
                        {filteredStreams.slice(0, visibleCount).map((movie, index) => (
                            <div
                                key={movie.stream_id}
                                className={`movie-card ${focusArea === 'movies' && focusedMovieIndex === index ? 'tv-focused' : ''} ${selectedMovie?.stream_id === movie.stream_id ? 'selected' : ''}`}
                                onClick={() => setSelectedMovie(movie)}
                                style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                            >
                                <div className="movie-poster">
                                    {brokenImages.has(movie.stream_id) ? (
                                        <div className="poster-placeholder">🎬</div>
                                    ) : (
                                        <img
                                            src={movie.cover}
                                            alt={movie.name}
                                            loading="lazy"
                                            onError={() => handleImageError(movie.stream_id)}
                                        />
                                    )}
                                    {movie.rating && parseFloat(movie.rating) > 0 && (
                                        <div className="movie-rating">⭐ {movie.rating}</div>
                                    )}
                                </div>
                                <div className="movie-title">{movie.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Hints */}
            <div className="movies-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Selecionar</span>
                <span>← Voltar</span>
            </div>
        </div>
    );
}

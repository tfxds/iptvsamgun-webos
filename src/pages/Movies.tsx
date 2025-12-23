// Movies Page - Matching NeoStream Desktop Style

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { VODStream, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { CategoryMenu } from '../components/CategoryMenu';
import { AnimatedSearchBar } from '../components/AnimatedSearchBar';
import { ContentDetailModal } from '../components/ContentDetailModal';
import './Movies.css';

export function Movies() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [streams, setStreams] = useState<VODStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMovie, setSelectedMovie] = useState<VODStream | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(0); // Will be calculated dynamically
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Focus states for TV navigation
    const [focusArea, setFocusArea] = useState<'categories' | 'movies'>('movies');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);

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
    }, []);

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

    // Lazy loading scroll - load one more row when scrolling near bottom
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Load more when user scrolls to 80% of the content
            if (scrollTop + clientHeight >= scrollHeight * 0.8 && visibleCount < filteredStreams.length) {
                const containerWidth = container.clientWidth - 32;
                const cols = Math.floor(containerWidth / 180);
                // Add one row at a time
                setVisibleCount(prev => Math.min(prev + cols, filteredStreams.length));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredStreams.length, visibleCount]);

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
                setShowModal(true);
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
            {selectedMovie && (selectedMovie.stream_icon || selectedMovie.cover) && (
                <div
                    className="movies-backdrop"
                    style={{ backgroundImage: `url(${selectedMovie.stream_icon || selectedMovie.cover})` }}
                />
            )}

            {/* Animated Search Bar */}
            <AnimatedSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar filmes..."
            />

            {/* Category Menu (Hamburger Button) */}
            <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                type="vod"
            />

            {/* Content Detail Modal */}
            {selectedMovie && (
                <ContentDetailModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedMovie(null);
                    }}
                    contentId={String(selectedMovie.stream_id)}
                    contentType="movie"
                    contentData={{
                        name: selectedMovie.name,
                        cover: selectedMovie.stream_icon || selectedMovie.cover,
                        rating: selectedMovie.rating,
                        plot: selectedMovie.plot,
                        genre: selectedMovie.genre,
                        cast: selectedMovie.cast,
                        director: selectedMovie.director,
                        release_date: selectedMovie.release_date,
                        container_extension: selectedMovie.container_extension,
                    }}
                    onPlay={() => {
                        // TODO: Navigate to player
                        console.log('Play movie:', selectedMovie.name);
                        setShowModal(false);
                    }}
                />
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
                                onClick={() => {
                                    setSelectedMovie(movie);
                                    setShowModal(true);
                                }}
                                style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                            >
                                <div className="movie-poster">
                                    {brokenImages.has(movie.stream_id) ? (
                                        <div className="poster-placeholder">🎬</div>
                                    ) : (
                                        <img
                                            src={movie.stream_icon || movie.cover}
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

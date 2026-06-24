// Movies Page - S.A Player (categorias na lateral | grid de filmes, estilo Canais)

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { VODStream, Category } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { useFocusZone } from '../contexts/FocusContext';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { VideoPlayer } from '../components/VideoPlayer';
import './Movies.css';

const GRID_COLS = 5;

export function Movies() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [streams, setStreams] = useState<VODStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMovie, setSelectedMovie] = useState<VODStream | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playingMovie, setPlayingMovie] = useState<VODStream | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(30);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

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
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Erro ao carregar filmes');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Controle parental: esconde categorias/titulos adultos quando ligado (helpers em storage)
    const adultCatIds = storage.adultCategoryIds(categories);
    const cats = storage.filterAdultCategories(categories);

    // Filter streams
    const filteredStreams = streams.filter((stream) => {
        const streamName = stream.name || '';
        const matchesSearch = streamName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || stream.category_id === selectedCategory;
        const allowed = storage.isContentAllowed(streamName, stream.category_id, adultCatIds);
        return matchesSearch && matchesCategory && allowed;
    });

    // Lazy loading scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight * 0.8 && visibleCount < filteredStreams.length) {
                setVisibleCount(prev => Math.min(prev + GRID_COLS * 4, filteredStreams.length));
            }
        };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredStreams.length, visibleCount]);

    // Reset on filter change
    useEffect(() => {
        setVisibleCount(30);
        setSelectedMovie(null);
        setFocusedMovieIndex(0);
    }, [searchQuery, selectedCategory]);

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            // -1 = campo de busca (acima do "Todos os Filmes")
            if (direction === 'up') setFocusedCategoryIndex(prev => Math.max(-1, prev - 1));
            else if (direction === 'down') setFocusedCategoryIndex(prev => Math.min(cats.length, prev + 1));
            else if (direction === 'right') { setFocusArea('movies'); setFocusedMovieIndex(0); }
            else if (direction === 'left') setFocusZone('sidebar');
        } else if (focusArea === 'movies') {
            const totalMovies = filteredStreams.length;
            const currentCol = focusedMovieIndex % GRID_COLS;
            if (direction === 'up') {
                if (focusedMovieIndex < GRID_COLS) setFocusArea('categories');
                else setFocusedMovieIndex(prev => Math.max(0, prev - GRID_COLS));
            } else if (direction === 'down') {
                setFocusedMovieIndex(prev => {
                    const next = Math.min(totalMovies - 1, prev + GRID_COLS);
                    if (next >= visibleCount - GRID_COLS * 2) setVisibleCount(c => Math.min(c + GRID_COLS * 4, totalMovies));
                    return next;
                });
            } else if (direction === 'left') {
                if (currentCol === 0) setFocusArea('categories');
                else setFocusedMovieIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedMovieIndex(prev => {
                    const next = Math.min(totalMovies - 1, prev + 1);
                    if (next >= visibleCount - GRID_COLS) setVisibleCount(c => Math.min(c + GRID_COLS * 4, totalMovies));
                    return next;
                });
            }
        }
    };

    // Auto-scroll focused movie into view
    useEffect(() => {
        if (focusArea !== 'movies' || focusZone !== 'content') return;
        const el = scrollContainerRef.current?.querySelector('.movie-card.tv-focused') as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [focusedMovieIndex, focusArea, focusZone]);

    // Auto-scroll focused category into view
    useEffect(() => {
        if (focusArea !== 'categories') return;
        const el = document.querySelector('.movies-cat-col .cat-item.tv-focused') as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [focusedCategoryIndex, focusArea]);

    const handleEnter = () => {
        if (focusArea === 'categories') {
            if (focusedCategoryIndex === -1) { searchRef.current?.focus(); return; } // abre teclado do sistema (TV)
            setSelectedCategory(focusedCategoryIndex === 0 ? 'all' : (cats[focusedCategoryIndex - 1]?.category_id || 'all'));
        } else if (focusArea === 'movies') {
            const movie = filteredStreams[focusedMovieIndex];
            if (movie) { setSelectedMovie(movie); setShowModal(true); }
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        enabled: focusZone === 'content' && !showModal && !showPlayer,
    });

    const handleImageError = (streamId: number) => setBrokenImages(prev => new Set(prev).add(streamId));

    if (loading) {
        return (
            <div className="movies-page movies-page--cats">
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

    if (error) {
        return (
            <div className="movies-error-container">
                <div className="error-glow" />
                <div className="error-content">
                    <div className="error-icon">🎬</div>
                    <h2>Erro ao carregar filmes</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-button">🔄 Tentar novamente</button>
                </div>
            </div>
        );
    }

    return (
        <div className="movies-page movies-page--cats">
            <div className="movies-bg-gradient" />
            {selectedMovie && (selectedMovie.stream_icon || selectedMovie.cover) && (
                <div className="movies-backdrop" style={{ backgroundImage: `url(${selectedMovie.stream_icon || selectedMovie.cover})` }} />
            )}

            <div className="movies-layout">
                {/* COL 1 — Categorias (pastas) */}
                <aside className="cat-col movies-cat-col">
                    <div className={`cat-search ${focusArea === 'categories' && focusedCategoryIndex === -1 ? 'tv-focused' : ''}`}>
                        <span className="cat-search-icon">🔍</span>
                        <input
                            ref={searchRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar filmes..."
                            className="cat-search-input"
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                    <div className="cat-list">
                        <button
                            className={`cat-item ${selectedCategory === 'all' ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === 0 ? 'tv-focused' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >Todos os Filmes</button>
                        {cats.map((cat, i) => (
                            <button
                                key={cat.category_id}
                                className={`cat-item ${selectedCategory === cat.category_id ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === i + 1 ? 'tv-focused' : ''}`}
                                onClick={() => setSelectedCategory(cat.category_id)}
                            >{cat.category_name}</button>
                        ))}
                    </div>
                </aside>

                {/* COL 2 — Grid de filmes */}
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
                                    onClick={() => { setSelectedMovie(movie); setShowModal(true); }}
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
                                    <div className="movie-title">{movie?.name || 'Filme Sem Nome'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Detail Modal */}
            {selectedMovie && (
                <ContentDetailModal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setSelectedMovie(null); }}
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
                    onPlay={() => { setPlayingMovie(selectedMovie); setShowPlayer(true); setShowModal(false); }}
                />
            )}

            {/* Video Player */}
            {showPlayer && playingMovie && (
                <VideoPlayer
                    src={api.getVodStreamUrl(playingMovie.stream_id, playingMovie.container_extension || 'mp4')}
                    title={playingMovie.name}
                    poster={playingMovie.stream_icon || playingMovie.cover}
                    contentType="movie"
                    resumeTime={storage.getProgress(String(playingMovie.stream_id), 'movie')?.position ?? null}
                    onTimeUpdate={(t, d) => storage.saveProgress({
                        id: String(playingMovie.stream_id), type: 'movie', title: playingMovie.name,
                        poster: playingMovie.stream_icon || playingMovie.cover, position: t, duration: d,
                        containerExtension: playingMovie.container_extension || 'mp4',
                    })}
                    onClose={() => { setShowPlayer(false); setPlayingMovie(null); }}
                />
            )}

            <div className="movies-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Selecionar</span>
                <span>← Categorias</span>
            </div>
        </div>
    );
}

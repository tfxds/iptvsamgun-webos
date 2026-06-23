// ContentDetailModal.tsx - Premium modal matching original NeoStream app

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { searchMovieByName, searchSeriesByName, getImageUrl, formatGenres, type TMDBMovieDetails, type TMDBSeriesDetails } from '../services/tmdb';
import { useTVNavigation } from '../hooks/useTVNavigation';
import type { Episode, SeriesInfo } from '../types';
import './ContentDetailModal.css';

interface ContentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentId: string;
    contentType: 'series' | 'movie';
    contentData: {
        name: string;
        cover: string;
        rating?: string;
        plot?: string;
        genre?: string;
        cast?: string;
        director?: string;
        release_date?: string;
        container_extension?: string;
    };
    onPlay: (season?: number, episode?: number) => void;
}

// Simple favorites service (localStorage based) — guarda o item completo
// (title/poster/rating) pra pagina de Favoritos conseguir renderizar os cards.
interface FavoriteItemData {
    id: string;
    type: string;
    title?: string;
    poster?: string;
    rating?: string;
    addedAt?: number;
}

const favoritesService = {
    KEY: 'neostream_favorites',
    getAll(): FavoriteItemData[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch { return []; }
    },
    has(id: string, type: string): boolean {
        return this.getAll().some(f => f.id === id && f.type === type);
    },
    toggle(id: string, type: string, title?: string, poster?: string, rating?: string): void {
        const all = this.getAll();
        const index = all.findIndex(f => f.id === id && f.type === type);
        if (index >= 0) {
            all.splice(index, 1);
        } else {
            all.push({ id, type, title, poster, rating, addedAt: Date.now() });
        }
        localStorage.setItem(this.KEY, JSON.stringify(all));
    }
};

// Simple watch later service
interface WatchLaterItemData {
    id: string;
    type: string;
    title?: string;
    poster?: string;
    rating?: string;
    addedAt?: number;
}

const watchLaterService = {
    KEY: 'neostream_watch_later',
    getAll(): WatchLaterItemData[] {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch { return []; }
    },
    has(id: string, type: string): boolean {
        return this.getAll().some(f => f.id === id && f.type === type);
    },
    toggle(id: string, type: string, title?: string, poster?: string, rating?: string): void {
        const all = this.getAll();
        const index = all.findIndex(f => f.id === id && f.type === type);
        if (index >= 0) {
            all.splice(index, 1);
        } else {
            all.push({ id, type, title, poster, rating, addedAt: Date.now() });
        }
        localStorage.setItem(this.KEY, JSON.stringify(all));
    }
};

export function ContentDetailModal({
    isOpen,
    onClose,
    contentId,
    contentType,
    contentData,
    onPlay
}: ContentDetailModalProps) {
    const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [, setRefresh] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);

    // TMDB data states
    const [tmdbData, setTmdbData] = useState<TMDBMovieDetails | TMDBSeriesDetails | null>(null);
    const [xtreamPlot, setXtreamPlot] = useState('');
    const [tmdbLoading, setTmdbLoading] = useState(false);

    // Focus management for TV navigation
    type FocusZone = 'play' | 'watchLater' | 'favorite' | 'close' | 'season' | 'episode';
    const [focusZone, setFocusZone] = useState<FocusZone>('play');
    const [seasonFocusIndex, setSeasonFocusIndex] = useState(0);
    const [episodeFocusIndex, setEpisodeFocusIndex] = useState(0);

    // Reset focus when modal opens
    useEffect(() => {
        if (isOpen) {
            setFocusZone('play');
            setSeasonFocusIndex(0);
            setEpisodeFocusIndex(0);
        }
    }, [isOpen]);

    // Fetch series info
    useEffect(() => {
        if (!isOpen || contentType !== 'series') return;

        setLoading(true);
        api.getSeriesInfo(Number(contentId))
            .then(data => {
                setSeriesInfo(data);
                setSelectedSeason(1);
                setSelectedEpisode(1);
            })
            .catch(err => {
                console.error('Error fetching series info:', err);
                setSeriesInfo(null);
            })
            .finally(() => setLoading(false));
    }, [isOpen, contentId, contentType]);

    // Plot real do Xtream pro FILME (a lista get_vod_streams NAO traz plot; get_vod_info traz)
    useEffect(() => {
        if (!isOpen || contentType !== 'movie') { setXtreamPlot(''); return; }
        let cancelled = false;
        api.getVodInfo(Number(contentId))
            .then(d => {
                const md = (d?.movie_data || {}) as Record<string, unknown>;
                const p = d?.info?.plot || (md.plot as string) || (md.description as string) || '';
                if (!cancelled) setXtreamPlot(typeof p === 'string' ? p : '');
            })
            .catch(() => { if (!cancelled) setXtreamPlot(''); });
        return () => { cancelled = true; };
    }, [isOpen, contentId, contentType]);

    // Fetch TMDB data
    useEffect(() => {
        if (!isOpen || !contentData.name) return;

        setTmdbLoading(true);
        const fetchTMDB = async () => {
            try {
                // Extract year from release_date if available
                const year = contentData.release_date?.split('-')[0];

                if (contentType === 'movie') {
                    const data = await searchMovieByName(contentData.name, year);
                    setTmdbData(data);
                } else {
                    const data = await searchSeriesByName(contentData.name, year);
                    setTmdbData(data);
                }
            } catch (err) {
                console.error('Error fetching TMDB data:', err);
                setTmdbData(null);
            } finally {
                setTmdbLoading(false);
            }
        };

        fetchTMDB();
    }, [isOpen, contentData.name, contentData.release_date, contentType]);

    // Close with animation
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250);
    }, [onClose]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleClose]);

    // Close when clicking outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            handleClose();
        }
    };

    // Calculate navigation items
    const seasons = useMemo(
        () => seriesInfo?.episodes ? Object.keys(seriesInfo.episodes).sort((a, b) => Number(a) - Number(b)) : [],
        [seriesInfo]
    );
    const episodes = useMemo(
        () => seriesInfo?.episodes?.[selectedSeason] || [],
        [seriesInfo, selectedSeason]
    );

    // TV Navigation handlers
    const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!isOpen) return;

        if (contentType === 'series') {
            // Series modal navigation
            if (focusZone === 'play') {
                if (direction === 'right') setFocusZone('watchLater');
                else if (direction === 'up' && seasons.length > 0) setFocusZone('season');
                else if (direction === 'down' && episodes.length > 0) setFocusZone('episode');
            } else if (focusZone === 'watchLater') {
                if (direction === 'left') setFocusZone('play');
                else if (direction === 'right') setFocusZone('favorite');
                else if (direction === 'up') setFocusZone('close');
            } else if (focusZone === 'favorite') {
                if (direction === 'left') setFocusZone('watchLater');
                else if (direction === 'up') setFocusZone('close');
            } else if (focusZone === 'close') {
                if (direction === 'down') setFocusZone('play');
            } else if (focusZone === 'season') {
                if (direction === 'left') {
                    setSeasonFocusIndex(prev => Math.max(0, prev - 1));
                } else if (direction === 'right') {
                    setSeasonFocusIndex(prev => Math.min(seasons.length - 1, prev + 1));
                } else if (direction === 'down') {
                    setFocusZone('episode');
                } else if (direction === 'up') {
                    setFocusZone('play');
                }
            } else if (focusZone === 'episode') {
                if (direction === 'up') {
                    if (episodeFocusIndex === 0) {
                        setFocusZone('season');
                    } else {
                        setEpisodeFocusIndex(prev => Math.max(0, prev - 1));
                    }
                } else if (direction === 'down') {
                    if (episodeFocusIndex < episodes.length - 1) {
                        setEpisodeFocusIndex(prev => prev + 1);
                    } else {
                        setFocusZone('play');
                    }
                }
            }
        } else {
            // Movie modal navigation (simpler)
            if (focusZone === 'play') {
                if (direction === 'right') setFocusZone('watchLater');
                else if (direction === 'up') setFocusZone('close');
            } else if (focusZone === 'watchLater') {
                if (direction === 'left') setFocusZone('play');
                else if (direction === 'right') setFocusZone('favorite');
                else if (direction === 'up') setFocusZone('close');
            } else if (focusZone === 'favorite') {
                if (direction === 'left') setFocusZone('watchLater');
                else if (direction === 'up') setFocusZone('close');
            } else if (focusZone === 'close') {
                if (direction === 'down') setFocusZone('play');
            }
        }
    }, [isOpen, focusZone, contentType, seasons.length, episodes.length, episodeFocusIndex]);

    // Auto-scroll: mantém o episódio focado visível na lista (quando passa de ~4 episódios)
    useEffect(() => {
        if (focusZone !== 'episode') return;
        const el = document.querySelector('.episode-item.focused') as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [episodeFocusIndex, focusZone]);

    const handleEnter = useCallback(() => {
        if (!isOpen) return;

        if (focusZone === 'play') {
            onPlay(
                contentType === 'series' ? selectedSeason : undefined,
                contentType === 'series' ? selectedEpisode : undefined
            );
        } else if (focusZone === 'watchLater') {
            const posterForWatchLater = tmdbData?.poster_path ? getImageUrl(tmdbData.poster_path, 'w500') : contentData.cover;
            watchLaterService.toggle(
                contentId,
                contentType,
                contentData.name,
                posterForWatchLater || undefined,
                tmdbData?.vote_average ? tmdbData.vote_average.toFixed(1) : contentData.rating
            );
            setRefresh(r => r + 1);
        } else if (focusZone === 'favorite') {
            const posterForFav = tmdbData?.poster_path ? getImageUrl(tmdbData.poster_path, 'w500') : contentData.cover;
            favoritesService.toggle(
                contentId,
                contentType,
                contentData.name,
                posterForFav || undefined,
                tmdbData?.vote_average ? tmdbData.vote_average.toFixed(1) : contentData.rating
            );
            setRefresh(r => r + 1);
        } else if (focusZone === 'close') {
            handleClose();
        } else if (focusZone === 'season') {
            setSelectedSeason(Number(seasons[seasonFocusIndex]));
            setSelectedEpisode(1);
            setEpisodeFocusIndex(0);
        } else if (focusZone === 'episode') {
            const ep = episodes[episodeFocusIndex];
            if (ep) {
                setSelectedEpisode(Number(ep.episode_num));
            }
        }
    }, [isOpen, focusZone, contentType, selectedSeason, selectedEpisode, contentId, contentData, tmdbData, seasons, seasonFocusIndex, episodes, episodeFocusIndex, onPlay, handleClose]);

    const handleBack = useCallback(() => {
        handleClose();
    }, [handleClose]);

    // TV Navigation hook
    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        onBack: handleBack,
        enabled: isOpen
    });

    // Helper function for episode titles
    const getEpisodeTitle = (ep: Episode): string => {
        const epNum = Number(ep.episode_num);
        const rawTitle = ep.title || '';

        const cleanTitle = rawTitle
            .replace(/^(.*?)[\s-–—]*S\d+[\s:.]*E\d+[\s:.–—]*/i, '')
            .replace(/\s*(?:\[|\()?S\d+[\s.-]*E\d+(?:\]|\))?\s*/gi, '')
            .replace(/Episode\s*\d+/gi, '')
            .replace(/^\d+\.?\s*/, '')
            .trim();

        const genericPatterns = [
            /^ep\s*\d+$/i,
            /^\d+$/,
            /^episode$/i
        ];
        const isValidTitle = cleanTitle.length > 0 && !genericPatterns.some(p => p.test(cleanTitle));

        return isValidTitle ? cleanTitle : `Episódio ${epNum}`;
    };
    if (!isOpen) return null;

    // Use TMDB data if available, fallback to IPTV data
    const seriesPlot = (seriesInfo?.info as Record<string, unknown> | undefined)?.plot as string | undefined;
    const overview = tmdbData?.overview || xtreamPlot || seriesPlot || contentData.plot || 'Sem descrição disponível.';
    const rating = tmdbData?.vote_average ? tmdbData.vote_average.toFixed(1) : contentData.rating;
    const genres = tmdbData?.genres ? formatGenres(tmdbData.genres) : contentData.genre;
    const backdropUrl = tmdbData?.backdrop_path ? getImageUrl(tmdbData.backdrop_path, 'w1280') : null;
    const posterUrl = tmdbData?.poster_path ? getImageUrl(tmdbData.poster_path, 'w500') : contentData.cover;

    return (
        <div
            ref={modalRef}
            className={`modal-backdrop ${isClosing ? 'closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className={`modal-container ${isClosing ? 'closing' : ''}`}>
                {/* Close Button */}
                <button className={`modal-close-btn ${focusZone === 'close' ? 'focused' : ''}`} onClick={handleClose}>
                    X
                </button>

                {/* Backdrop from TMDB */}
                {backdropUrl && (
                    <div
                        className="modal-backdrop-image"
                        style={{ backgroundImage: `url(${backdropUrl})` }}
                    />
                )}

                {/* Poster */}
                <div className="modal-poster">
                    <img
                        src={posterUrl || contentData.cover}
                        alt={contentData.name}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="poster-gradient" />
                    {tmdbLoading && (
                        <div className="tmdb-loading-overlay">
                            <div className="tmdb-loading-spinner" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="modal-content">
                    {/* Title */}
                    <h2 className="modal-title">{contentData.name}</h2>

                    {/* Meta Badges */}
                    <div className="modal-meta">
                        {rating && (
                            <span className="meta-badge rating-badge">
                                <span className="star">★</span>
                                {rating}
                            </span>
                        )}
                        <span className={`meta-badge ${contentType === 'series' ? 'type-badge-series' : 'type-badge-movie'}`}>
                            {contentType === 'series' ? 'Série' : 'Filme'}
                        </span>
                        {contentType === 'series' && seasons.length > 0 && (
                            <span className="meta-badge season-badge">
                                {seasons.length} {seasons.length > 1 ? 'Temporadas' : 'Temporada'}
                            </span>
                        )}
                    </div>

                    {/* Genres */}
                    {genres && (
                        <div className="modal-genres">
                            {genres.split(',').map((genre: string, i: number) => (
                                <span key={i} className="genre-tag">{genre.trim()}</span>
                            ))}
                        </div>
                    )}

                    {/* Overview */}
                    <p className="modal-overview">{overview}</p>

                    {/* Series: Season & Episode Selector */}
                    {contentType === 'series' && !loading && seasons.length > 0 && (
                        <>
                            {/* Season Tabs */}
                            <div className="season-tabs">
                                {seasons.map((season, idx) => (
                                    <button
                                        key={season}
                                        className={`season-tab ${selectedSeason === Number(season) ? 'active' : ''} ${focusZone === 'season' && seasonFocusIndex === idx ? 'focused' : ''}`}
                                        onClick={() => {
                                            setSelectedSeason(Number(season));
                                            setSelectedEpisode(1);
                                        }}
                                    >
                                        T{season}
                                    </button>
                                ))}
                            </div>

                            {/* Episode List */}
                            <div className="episode-list">
                                {episodes.map((ep, index: number) => {
                                    const epNum = Number(ep.episode_num);
                                    const isSelected = epNum === selectedEpisode;

                                    return (
                                        <div
                                            key={ep.id || index}
                                            className={`episode-item ${isSelected ? 'selected' : ''} ${focusZone === 'episode' && episodeFocusIndex === index ? 'focused' : ''}`}
                                            onClick={() => setSelectedEpisode(epNum)}
                                        >
                                            <span className="episode-number default">{epNum}</span>
                                            <span className="episode-title">{getEpisodeTitle(ep)}</span>
                                            {isSelected && (
                                                <span className="episode-play-indicator">▶</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Loading for series info */}
                    {contentType === 'series' && loading && (
                        <div className="modal-loading">
                            <div className="loading-spinner" />
                            Carregando episódios...
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="modal-actions">
                        {/* Play Button */}
                        <button
                            className={`action-btn play-btn ${focusZone === 'play' ? 'focused' : ''}`}
                            onClick={() => {
                                onPlay(
                                    contentType === 'series' ? selectedSeason : undefined,
                                    contentType === 'series' ? selectedEpisode : undefined
                                );
                            }}
                        >
                            <span className="icon">▶</span>
                            {contentType === 'series'
                                ? `Assistir T${selectedSeason} E${selectedEpisode}`
                                : 'Assistir Filme'
                            }
                        </button>

                        {/* Watch Later Button */}
                        <button
                            className={`action-btn secondary-btn ${watchLaterService.has(contentId, contentType) ? 'active' : ''} ${focusZone === 'watchLater' ? 'focused' : ''}`}
                            onClick={() => {
                                watchLaterService.toggle(
                                    contentId,
                                    contentType,
                                    contentData.name,
                                    posterUrl || contentData.cover,
                                    rating
                                );
                                setRefresh(r => r + 1);
                            }}
                        >
                            {watchLaterService.has(contentId, contentType) ? '✓' : '+'}
                            {watchLaterService.has(contentId, contentType) ? 'Salvo' : 'Assistir Depois'}
                        </button>

                        {/* Favorite Button */}
                        <button
                            className={`action-btn favorite-btn ${favoritesService.has(contentId, contentType) ? 'active' : ''} ${focusZone === 'favorite' ? 'focused' : ''}`}
                            onClick={() => {
                                const posterForFav = tmdbData?.poster_path ? getImageUrl(tmdbData.poster_path, 'w500') : contentData.cover;
                                favoritesService.toggle(
                                    contentId,
                                    contentType,
                                    contentData.name,
                                    posterForFav || undefined,
                                    tmdbData?.vote_average ? tmdbData.vote_average.toFixed(1) : contentData.rating
                                );
                                setRefresh(r => r + 1);
                            }}
                            title={favoritesService.has(contentId, contentType) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                        >
                            {favoritesService.has(contentId, contentType) ? '♥' : '♡'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

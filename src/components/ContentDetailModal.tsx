// ContentDetailModal.tsx - Premium modal matching original NeoStream app

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { SeriesInfo } from '../types';
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

// Simple favorites service (localStorage based)
const favoritesService = {
    KEY: 'neostream_favorites',
    getAll(): Array<{ id: string; type: string }> {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch { return []; }
    },
    has(id: string, type: string): boolean {
        return this.getAll().some(f => f.id === id && f.type === type);
    },
    toggle(id: string, type: string): void {
        const all = this.getAll();
        const index = all.findIndex(f => f.id === id && f.type === type);
        if (index >= 0) {
            all.splice(index, 1);
        } else {
            all.push({ id, type });
        }
        localStorage.setItem(this.KEY, JSON.stringify(all));
    }
};

// Simple watch later service
const watchLaterService = {
    KEY: 'neostream_watch_later',
    getAll(): Array<{ id: string; type: string }> {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch { return []; }
    },
    has(id: string, type: string): boolean {
        return this.getAll().some(f => f.id === id && f.type === type);
    },
    toggle(id: string, type: string): void {
        const all = this.getAll();
        const index = all.findIndex(f => f.id === id && f.type === type);
        if (index >= 0) {
            all.splice(index, 1);
        } else {
            all.push({ id, type });
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

    // Close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250);
    };

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    // Close when clicking outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            handleClose();
        }
    };

    // Helper function for episode titles
    const getEpisodeTitle = (ep: any): string => {
        const epNum = Number(ep.episode_num);
        const rawTitle = ep.title || '';

        // Clean the title
        let cleanTitle = rawTitle
            .replace(/^(.*?)[\s\-–—]*S\d+[\s\-:\.]*E\d+[\s\-:\.–—]*/i, '')
            .replace(/\s*[\[\(]?S\d+[\s\.\\-]*E\d+[\]\)]?\s*/gi, '')
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

    const overview = contentData.plot || 'Sem descrição disponível.';
    const rating = contentData.rating;
    const genres = contentData.genre;
    const seasons = seriesInfo?.episodes ? Object.keys(seriesInfo.episodes).sort((a, b) => Number(a) - Number(b)) : [];
    const episodes = seriesInfo?.episodes?.[selectedSeason] || [];

    return (
        <div
            ref={modalRef}
            className={`modal-backdrop ${isClosing ? 'closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className={`modal-container ${isClosing ? 'closing' : ''}`}>
                {/* Close Button */}
                <button className="modal-close-btn" onClick={handleClose}>
                    ✕
                </button>

                {/* Poster */}
                <div className="modal-poster">
                    <img
                        src={contentData.cover}
                        alt={contentData.name}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="poster-gradient" />
                </div>

                {/* Content */}
                <div className="modal-content">
                    {/* Title */}
                    <h2 className="modal-title">{contentData.name}</h2>

                    {/* Meta Badges */}
                    <div className="modal-meta">
                        {rating && (
                            <span className="meta-badge rating-badge">
                                <span className="star">⭐</span>
                                {rating}
                            </span>
                        )}
                        <span className={`meta-badge ${contentType === 'series' ? 'type-badge-series' : 'type-badge-movie'}`}>
                            {contentType === 'series' ? '📺 Série' : '🎬 Filme'}
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
                                {seasons.map(season => (
                                    <button
                                        key={season}
                                        className={`season-tab ${selectedSeason === Number(season) ? 'active' : ''}`}
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
                                {episodes.map((ep: any, index: number) => {
                                    const epNum = Number(ep.episode_num);
                                    const isSelected = epNum === selectedEpisode;

                                    return (
                                        <div
                                            key={ep.id || index}
                                            className={`episode-item ${isSelected ? 'selected' : ''}`}
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
                            className="action-btn play-btn"
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
                            className={`action-btn secondary-btn ${watchLaterService.has(contentId, contentType) ? 'active' : ''}`}
                            onClick={() => {
                                watchLaterService.toggle(contentId, contentType);
                                setRefresh(r => r + 1);
                            }}
                        >
                            {watchLaterService.has(contentId, contentType) ? '✓' : '+'}
                            {watchLaterService.has(contentId, contentType) ? 'Salvo' : 'Assistir Depois'}
                        </button>

                        {/* Favorite Button */}
                        <button
                            className={`action-btn favorite-btn ${favoritesService.has(contentId, contentType) ? 'active' : ''}`}
                            onClick={() => {
                                favoritesService.toggle(contentId, contentType);
                                setRefresh(r => r + 1);
                            }}
                            title={favoritesService.has(contentId, contentType) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                        >
                            {favoritesService.has(contentId, contentType) ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

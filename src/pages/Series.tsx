// Series Page - S.A Player (categorias na lateral | grid de séries, estilo Canais)

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { Series as SeriesType, Category, SeriesInfo } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { useFocusZone } from '../contexts/FocusContext';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { VideoPlayer } from '../components/VideoPlayer';
import './Series.css';

const GRID_COLS = 5;

export function Series() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [series, setSeries] = useState<SeriesType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeries, setSelectedSeries] = useState<SeriesType | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playerInfo, setPlayerInfo] = useState<{ url: string; title: string; poster: string; name: string; seriesId: string; season: number; episode: number; resume: number; info: SeriesInfo; series: SeriesType } | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(30);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

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
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Erro ao carregar séries');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Filter series
    const filteredSeries = series.filter((s) => {
        const seriesName = s.name || '';
        const matchesSearch = seriesName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || s.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Lazy loading scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight * 0.8 && visibleCount < filteredSeries.length) {
                setVisibleCount(prev => Math.min(prev + GRID_COLS * 4, filteredSeries.length));
            }
        };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredSeries.length, visibleCount]);

    // Reset on filter change
    useEffect(() => {
        setVisibleCount(30);
        setSelectedSeries(null);
        setFocusedSeriesIndex(0);
    }, [searchQuery, selectedCategory]);

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            // -1 = campo de busca (acima do "Todas as Séries")
            if (direction === 'up') setFocusedCategoryIndex(prev => Math.max(-1, prev - 1));
            else if (direction === 'down') setFocusedCategoryIndex(prev => Math.min(categories.length, prev + 1));
            else if (direction === 'right') { setFocusArea('series'); setFocusedSeriesIndex(0); }
            else if (direction === 'left') setFocusZone('sidebar');
        } else if (focusArea === 'series') {
            const totalSeries = filteredSeries.length;
            const currentCol = focusedSeriesIndex % GRID_COLS;
            if (direction === 'up') {
                if (focusedSeriesIndex < GRID_COLS) setFocusArea('categories');
                else setFocusedSeriesIndex(prev => Math.max(0, prev - GRID_COLS));
            } else if (direction === 'down') {
                setFocusedSeriesIndex(prev => {
                    const next = Math.min(totalSeries - 1, prev + GRID_COLS);
                    if (next >= visibleCount - GRID_COLS * 2) setVisibleCount(c => Math.min(c + GRID_COLS * 4, totalSeries));
                    return next;
                });
            } else if (direction === 'left') {
                if (currentCol === 0) setFocusArea('categories');
                else setFocusedSeriesIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'right') {
                setFocusedSeriesIndex(prev => {
                    const next = Math.min(totalSeries - 1, prev + 1);
                    if (next >= visibleCount - GRID_COLS) setVisibleCount(c => Math.min(c + GRID_COLS * 4, totalSeries));
                    return next;
                });
            }
        }
    };

    // Auto-scroll focused series into view
    useEffect(() => {
        if (focusArea !== 'series' || focusZone !== 'content') return;
        const el = scrollContainerRef.current?.querySelector('.series-card.tv-focused') as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [focusedSeriesIndex, focusArea, focusZone]);

    // Auto-scroll focused category into view
    useEffect(() => {
        if (focusArea !== 'categories') return;
        const el = document.querySelector('.series-cat-col .cat-item.tv-focused') as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [focusedCategoryIndex, focusArea]);

    const handleEnter = () => {
        if (focusArea === 'categories') {
            if (focusedCategoryIndex === -1) { searchRef.current?.focus(); return; } // abre teclado do sistema (TV)
            setSelectedCategory(focusedCategoryIndex === 0 ? 'all' : (categories[focusedCategoryIndex - 1]?.category_id || 'all'));
        } else if (focusArea === 'series') {
            const item = filteredSeries[focusedSeriesIndex];
            if (item) { setSelectedSeries(item); setShowModal(true); }
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        enabled: focusZone === 'content' && !showModal && !showPlayer,
    });

    const handleImageError = (seriesId: number) => setBrokenImages(prev => new Set(prev).add(seriesId));

    // Reproduz um episodio especifico (monta URL + resume + contexto p/ proximo/anterior)
    const playSeriesEpisode = (series: SeriesType, info: SeriesInfo, s: number, ep: number) => {
        const eps = info?.episodes?.[s] || [];
        const epData = eps.find(e => Number(e.episode_num) === ep) || eps[0];
        if (!epData) return;
        const realEp = Number(epData.episode_num);
        const saved = storage.getProgress(String(series.series_id), 'series');
        const resume = (saved && saved.season === s && saved.episode === realEp) ? saved.position : 0;
        setPlayerInfo({
            url: api.getSeriesStreamUrl(epData.id, epData.container_extension || 'mp4'),
            title: `${series.name} - T${s} E${realEp}`,
            poster: series.cover, name: series.name, seriesId: String(series.series_id),
            season: s, episode: realEp, resume, info, series,
        });
        setShowPlayer(true);
    };

    // Calcula o (temporada, episodio) adjacente. delta +1 = proximo, -1 = anterior.
    const adjacentEpisode = (delta: number): { s: number; ep: number } | null => {
        if (!playerInfo) return null;
        const { info, season, episode } = playerInfo;
        const eps = info?.episodes?.[season] || [];
        const idx = eps.findIndex(e => Number(e.episode_num) === episode);
        if (delta > 0 && idx >= 0 && idx < eps.length - 1) return { s: season, ep: Number(eps[idx + 1].episode_num) };
        if (delta < 0 && idx > 0) return { s: season, ep: Number(eps[idx - 1].episode_num) };
        // troca de temporada
        const seasonsList = Object.keys(info?.episodes || {}).map(Number).sort((a, b) => a - b);
        const sIdx = seasonsList.indexOf(season);
        if (delta > 0 && sIdx >= 0 && sIdx < seasonsList.length - 1) {
            const ns = seasonsList[sIdx + 1];
            const nEps = info.episodes[ns] || [];
            if (nEps[0]) return { s: ns, ep: Number(nEps[0].episode_num) };
        } else if (delta < 0 && sIdx > 0) {
            const ps = seasonsList[sIdx - 1];
            const pEps = info.episodes[ps] || [];
            if (pEps.length) return { s: ps, ep: Number(pEps[pEps.length - 1].episode_num) };
        }
        return null;
    };

    const goToEpisode = (delta: number) => {
        const next = adjacentEpisode(delta);
        if (next && playerInfo) playSeriesEpisode(playerInfo.series, playerInfo.info, next.s, next.ep);
    };

    if (loading) {
        return (
            <div className="series-page series-page--cats">
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

    if (error) {
        return (
            <div className="series-error-container">
                <div className="error-glow" />
                <div className="error-content">
                    <div className="error-icon">📺</div>
                    <h2>Erro ao carregar séries</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-button">🔄 Tentar novamente</button>
                </div>
            </div>
        );
    }

    return (
        <div className="series-page series-page--cats">
            <div className="series-bg-gradient" />
            {selectedSeries && selectedSeries.cover && (
                <div className="series-backdrop" style={{ backgroundImage: `url(${selectedSeries.cover})` }} />
            )}

            <div className="series-layout">
                {/* COL 1 — Categorias (pastas) */}
                <aside className="cat-col series-cat-col">
                    <div className={`cat-search ${focusArea === 'categories' && focusedCategoryIndex === -1 ? 'tv-focused' : ''}`}>
                        <span className="cat-search-icon">🔍</span>
                        <input
                            ref={searchRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar séries..."
                            className="cat-search-input"
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                    <div className="cat-list">
                        <button
                            className={`cat-item ${selectedCategory === 'all' ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === 0 ? 'tv-focused' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >Todas as Séries</button>
                        {categories.map((cat, i) => (
                            <button
                                key={cat.category_id}
                                className={`cat-item ${selectedCategory === cat.category_id ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === i + 1 ? 'tv-focused' : ''}`}
                                onClick={() => setSelectedCategory(cat.category_id)}
                            >{cat.category_name}</button>
                        ))}
                    </div>
                </aside>

                {/* COL 2 — Grid de séries */}
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
                                    onClick={() => { setSelectedSeries(item); setShowModal(true); }}
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
                                    <div className="series-title">{item?.name || 'Série Sem Nome'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Detail Modal */}
            {selectedSeries && (
                <ContentDetailModal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setSelectedSeries(null); }}
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
                        try {
                            const info = await api.getSeriesInfo(selectedSeries.series_id);
                            if (info) playSeriesEpisode(selectedSeries, info, season || 1, episode || 1);
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
                    contentType="series"
                    resumeTime={playerInfo.resume || null}
                    onTimeUpdate={(t, d) => storage.saveProgress({
                        id: playerInfo.seriesId, type: 'series', title: playerInfo.name, poster: playerInfo.poster,
                        position: t, duration: d, season: playerInfo.season, episode: playerInfo.episode,
                    })}
                    onNextEpisode={() => goToEpisode(1)}
                    onPreviousEpisode={() => goToEpisode(-1)}
                    canGoNext={!!adjacentEpisode(1)}
                    canGoPrevious={!!adjacentEpisode(-1)}
                    onClose={() => { setShowPlayer(false); setPlayerInfo(null); }}
                />
            )}

            <div className="series-hints">
                <span>↑↓←→ Navegar</span>
                <span>OK Selecionar</span>
                <span>← Categorias</span>
            </div>
        </div>
    );
}

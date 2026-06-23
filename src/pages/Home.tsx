// Home Page - S.A Player

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { storage, type ProgressItem } from '../services/storage';
import type { VODStream, Series } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { useFocusZone } from '../contexts/FocusContext';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { VideoPlayer } from '../components/VideoPlayer';
import './Home.css';

export function Home() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [recentMovies, setRecentMovies] = useState<VODStream[]>([]);
    const [recentSeries, setRecentSeries] = useState<Series[]>([]);
    const [recommendations, setRecommendations] = useState<(VODStream | Series)[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [focusedSection, setFocusedSection] = useState(0);
    const [focusedItem, setFocusedItem] = useState(0);
    const [selectedItem, setSelectedItem] = useState<VODStream | Series | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [playerInfo, setPlayerInfo] = useState<{ url: string; title: string; poster: string; save: Omit<ProgressItem, 'position' | 'duration' | 'updatedAt'>; resume: number } | null>(null);

    // Update clock every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            try {
                const [movies, series, vodCats, seriesCats] = await Promise.all([
                    api.getVODStreams(),
                    api.getSeries(),
                    api.getVodCategories(),
                    api.getSeriesCategories(),
                ]);

                // Filtra conteudo adulto (por categoria + por nome) — nunca aparece na Home
                const adultRe = /(adult|adulto|\+\s*18|18\s*\+|xxx|porn|er[óo]tic|sex)/i;
                const adultVodIds = new Set(vodCats.filter(c => adultRe.test(c.category_name || '')).map(c => c.category_id));
                const adultSeriesIds = new Set(seriesCats.filter(c => adultRe.test(c.category_name || '')).map(c => c.category_id));
                const cleanMovies = movies.filter(m => !adultVodIds.has(m.category_id) && !adultRe.test(m.name || ''));
                const cleanSeries = series.filter(s => !adultSeriesIds.has(s.category_id) && !adultRe.test(s.name || ''));

                const sortedMovies = [...cleanMovies].sort((a, b) =>
                    parseInt(b.added || '0') - parseInt(a.added || '0')
                ).slice(0, 15);
                const sortedSeries = [...cleanSeries].sort((a, b) =>
                    new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
                ).slice(0, 15);
                setRecentMovies(sortedMovies);
                setRecentSeries(sortedSeries);

                // Recomendados: MESMA quantidade de filme e serie, intercalados (serie, filme, serie...)
                const N = 8;
                const randomMovies = [...cleanMovies].sort(() => Math.random() - 0.5).slice(0, N);
                const randomSeries = [...cleanSeries].sort(() => Math.random() - 0.5).slice(0, N);
                const mixed: (VODStream | Series)[] = [];
                for (let i = 0; i < N; i++) {
                    if (randomSeries[i]) mixed.push(randomSeries[i]);
                    if (randomMovies[i]) mixed.push(randomMovies[i]);
                }
                setRecommendations(mixed);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        }
        fetchData();
    }, []);

    const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const isMovie = (item: VODStream | Series): item is VODStream => 'stream_id' in item;
    const getCover = (item: VODStream | Series) => (isMovie(item) ? item.stream_icon || item.cover || '' : item.cover || '');
    const getName = (item: VODStream | Series) => item.name;
    const getId = (item: VODStream | Series) => (isMovie(item) ? item.stream_id : item.series_id);

    // Opcao A: clicar num item abre a tela de detalhe (com Reproduzir), igual Filmes/Series.
    const openDetail = (item: VODStream | Series) => {
        setSelectedItem(item);
        setShowModal(true);
    };

    const handlePlay = async (season?: number, episode?: number) => {
        const item = selectedItem;
        if (!item) return;
        try {
            if (isMovie(item)) {
                const id = String(item.stream_id);
                const poster = item.stream_icon || item.cover || '';
                setPlayerInfo({
                    url: api.getVodStreamUrl(item.stream_id, item.container_extension || 'mp4'),
                    title: item.name,
                    poster,
                    save: { id, type: 'movie', title: item.name, poster, containerExtension: item.container_extension || 'mp4' },
                    resume: storage.getProgress(id, 'movie')?.position || 0,
                });
            } else {
                const info = await api.getSeriesInfo(item.series_id);
                const s = season || 1;
                const e = episode || 1;
                const eps = info?.episodes?.[s] || [];
                const ep = eps.find(ev => ev.episode_num === e) || eps[0];
                if (!ep) { setShowModal(false); return; }
                const id = String(item.series_id);
                const saved = storage.getProgress(id, 'series');
                const resume = (saved && saved.season === s && saved.episode === e) ? saved.position : 0;
                setPlayerInfo({
                    url: api.getSeriesStreamUrl(ep.id, ep.container_extension || 'mp4'),
                    title: `${item.name} - T${s} E${e}`,
                    poster: item.cover || '',
                    save: { id, type: 'series', title: item.name, poster: item.cover || '', season: s, episode: e },
                    resume,
                });
            }
            setShowPlayer(true);
        } catch (err) {
            console.error('Error starting playback:', err);
        }
        setShowModal(false);
    };

    // TV Navigation
    const sections = [
        { id: 'recommendations', items: recommendations.length },
        { id: 'series', items: recentSeries.length },
        { id: 'movies', items: recentMovies.length }
    ];

    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (direction === 'up') {
            setFocusedSection(prev => Math.max(0, prev - 1));
            setFocusedItem(0);
        } else if (direction === 'down') {
            setFocusedSection(prev => Math.min(sections.length - 1, prev + 1));
            setFocusedItem(0);
        } else if (direction === 'left') {
            if (focusedItem === 0) {
                setFocusZone('sidebar');
            } else {
                setFocusedItem(prev => Math.max(0, prev - 1));
            }
        } else if (direction === 'right') {
            const maxItems = sections[focusedSection]?.items || 0;
            setFocusedItem(prev => Math.min(maxItems - 1, prev + 1));
        }
    };

    const handleEnter = () => {
        const section = sections[focusedSection];
        if (section?.id === 'recommendations') {
            const it = recommendations[focusedItem];
            if (it) openDetail(it);
        } else if (section?.id === 'series') {
            const it = recentSeries[focusedItem];
            if (it) openDetail(it);
        } else if (section?.id === 'movies') {
            const it = recentMovies[focusedItem];
            if (it) openDetail(it);
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        enabled: focusZone === 'content',
    });

    // Auto-scroll: segue o card focado (rola a fileira na horizontal + a secao na vertical)
    useEffect(() => {
        const sectionIds = ['home-recommendations', 'home-series', 'home-movies'];
        const sectionId = sectionIds[focusedSection];
        const section = sectionId ? document.getElementById(sectionId) : null;
        const card = section?.querySelectorAll('.content-card')[focusedItem] as HTMLElement | undefined;
        if (card) {
            // inline:center -> rola a .content-row pra centralizar o card; block:nearest -> ajuste vertical suave
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [focusedSection, focusedItem]);

    const fallbackPoster = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect fill="%231a1a2e" width="100" height="150"/><text x="50" y="80" text-anchor="middle" fill="%23666" font-size="40">🎬</text></svg>';

    return (
        <div className="home-page">
            <div className="home-bg-decoration home-bg-decoration-1" />
            <div className="home-bg-decoration home-bg-decoration-2" />

            {/* Header */}
            <header className="home-header">
                <div className="home-header-left">
                    <div className="home-date">{formatDate(currentTime)}</div>
                    <h1 className="home-greeting">
                        {getGreeting()}! <span className="waving-hand">👋</span>
                    </h1>
                    <p className="home-subtitle">O que você quer assistir hoje?</p>
                </div>
                <div className="home-clock">{formatTime(currentTime)}</div>
            </header>

            {/* Content Rows */}
            <section className="home-content">
                {/* Recommendations */}
                <div id="home-recommendations" className="content-section">
                    <h2 className="section-title">💡 Recomendados Para Você</h2>
                    <div className="content-row">
                        {recommendations.map((item, index) => (
                            <button
                                key={getId(item)}
                                className={`content-card ${focusedSection === 0 && focusedItem === index ? 'tv-focused' : ''}`}
                                onClick={() => openDetail(item)}
                            >
                                <div className="card-image card-image-poster">
                                    <img
                                        src={getCover(item)}
                                        alt={getName(item)}
                                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackPoster; }}
                                    />
                                </div>
                                <div className="card-title">{getName(item)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Series */}
                <div id="home-series" className="content-section">
                    <h2 className="section-title">🆕 Séries Recentes</h2>
                    <div className="content-row">
                        {recentSeries.map((series, index) => (
                            <button
                                key={series.series_id}
                                className={`content-card ${focusedSection === 1 && focusedItem === index ? 'tv-focused' : ''}`}
                                onClick={() => openDetail(series)}
                            >
                                <div className="card-image card-image-poster">
                                    <img
                                        src={series.cover}
                                        alt={series.name}
                                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackPoster; }}
                                    />
                                </div>
                                <div className="card-title">{series.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Movies */}
                <div id="home-movies" className="content-section">
                    <h2 className="section-title">🎬 Filmes Recentes</h2>
                    <div className="content-row">
                        {recentMovies.map((movie, index) => (
                            <button
                                key={movie.stream_id}
                                className={`content-card ${focusedSection === 2 && focusedItem === index ? 'tv-focused' : ''}`}
                                onClick={() => openDetail(movie)}
                            >
                                <div className="card-image card-image-poster">
                                    <img
                                        src={movie.stream_icon || movie.cover}
                                        alt={movie.name}
                                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackPoster; }}
                                    />
                                </div>
                                <div className="card-title">{movie.name}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <span>S.A Player</span>
                <span>v1.0.0</span>
            </footer>

            {/* Content Detail Modal (Opcao A) */}
            {selectedItem && (
                <ContentDetailModal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setSelectedItem(null); }}
                    contentId={String(getId(selectedItem))}
                    contentType={isMovie(selectedItem) ? 'movie' : 'series'}
                    contentData={{
                        name: selectedItem.name,
                        cover: getCover(selectedItem),
                        rating: selectedItem.rating,
                        plot: selectedItem.plot,
                        genre: selectedItem.genre,
                        cast: selectedItem.cast,
                        director: selectedItem.director,
                        release_date: selectedItem.release_date,
                        container_extension: isMovie(selectedItem) ? selectedItem.container_extension : undefined,
                    }}
                    onPlay={handlePlay}
                />
            )}

            {/* Video Player */}
            {showPlayer && playerInfo && (
                <VideoPlayer
                    src={playerInfo.url}
                    title={playerInfo.title}
                    poster={playerInfo.poster}
                    contentType={playerInfo.save.type}
                    resumeTime={playerInfo.resume || null}
                    onTimeUpdate={(t, d) => storage.saveProgress({ ...playerInfo.save, position: t, duration: d })}
                    onClose={() => { setShowPlayer(false); setPlayerInfo(null); }}
                />
            )}
        </div>
    );
}

// Home Page - TV Style with content carousels

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { LiveStream, VODStream, Series } from '../types';
import { ContentRow } from '../components/ContentRow';
import './Home.css';

export function Home() {
    const [liveChannels, setLiveChannels] = useState<LiveStream[]>([]);
    const [movies, setMovies] = useState<VODStream[]>([]);
    const [series, setSeries] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            setLoading(true);
            const [live, vod, ser] = await Promise.all([
                api.getLiveStreams().catch(() => []),
                api.getVODStreams().catch(() => []),
                api.getSeries().catch(() => []),
            ]);

            setLiveChannels(live.slice(0, 20)); // Limit for home
            setMovies(vod.slice(0, 20));
            setSeries(ser.slice(0, 20));
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar conteúdo');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="home-loading">
                <div className="loading-spinner" />
                <p>Carregando conteúdo...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="home-error">
                <p>{error}</p>
                <button className="tv-button" onClick={loadContent}>
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="home">
            {/* Hero Section */}
            <section className="home-hero">
                <div className="home-hero-bg" />
                <div className="home-hero-content">
                    <h1 className="home-hero-title">Bem-vindo ao NeoStream</h1>
                    <p className="home-hero-subtitle">
                        {liveChannels.length} canais • {movies.length} filmes • {series.length} séries
                    </p>
                </div>
            </section>

            {/* Content Rows */}
            <div className="home-content">
                {liveChannels.length > 0 && (
                    <ContentRow
                        title="📺 Canais ao Vivo"
                        items={liveChannels.map(ch => ({
                            id: ch.stream_id,
                            title: ch.name,
                            image: ch.stream_icon,
                            type: 'live' as const,
                        }))}
                    />
                )}

                {movies.length > 0 && (
                    <ContentRow
                        title="🎬 Filmes em Destaque"
                        items={movies.map(m => ({
                            id: m.stream_id,
                            title: m.name,
                            image: m.cover,
                            type: 'movie' as const,
                            rating: m.rating_5based,
                        }))}
                    />
                )}

                {series.length > 0 && (
                    <ContentRow
                        title="📺 Séries Populares"
                        items={series.map(s => ({
                            id: s.series_id,
                            title: s.name,
                            image: s.cover,
                            type: 'series' as const,
                            rating: s.rating_5based,
                        }))}
                    />
                )}
            </div>
        </div>
    );
}

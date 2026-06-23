// LiveTV Page - S.A Player (3 colunas: categorias | canais | EPG/info)

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { storage, ADULT_RE } from '../services/storage';
import type { LiveStream, Category, EPGProgram } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { useFocusZone } from '../contexts/FocusContext';
import { useHls } from '../hooks/useHls';
import { VideoPlayer } from '../components/VideoPlayer';
import './LiveTV.css';

export function LiveTV() {
    const { focusZone, setFocusZone } = useFocusZone();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<LiveStream | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [visibleCount, setVisibleCount] = useState(40);
    const [epg, setEpg] = useState<EPGProgram[]>([]);
    const [epgLoading, setEpgLoading] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);

    const channelsScrollRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLVideoElement>(null);

    // Mini preview do canal selecionado (mudo) na coluna de info; some ao abrir tela cheia
    const previewSrc = selectedChannel && !showPlayer ? api.getLiveStreamUrl(selectedChannel.stream_id) : '';
    useHls({ src: previewSrc, videoRef: previewRef, autoPlay: true });

    // Focus areas (3 colunas)
    const [focusArea, setFocusArea] = useState<'categories' | 'channels'>('channels');
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
    const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [streamsData, categoriesData] = await Promise.all([
                    api.getLiveStreams(),
                    api.getLiveCategories(),
                ]);
                setStreams(streamsData);
                setCategories(categoriesData);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Erro ao carregar canais');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Controle parental: esconde categorias/canais adultos quando ligado
    const adultBlocked = storage.isAdultBlocked();
    const adultCatIds = new Set(categories.filter(c => ADULT_RE.test(c.category_name || '')).map(c => c.category_id));
    const cats = adultBlocked ? categories.filter(c => !ADULT_RE.test(c.category_name || '')) : categories;

    const filteredStreams = streams.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const matchesSearch = name.includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || s.category_id === selectedCategory;
        const allowed = !adultBlocked || (!adultCatIds.has(s.category_id) && !ADULT_RE.test(s.name || ''));
        return matchesSearch && matchesCategory && allowed;
    });

    // Reset on filter change
    useEffect(() => {
        setVisibleCount(40);
        setFocusedChannelIndex(0);
    }, [searchQuery, selectedCategory]);

    // EPG load when selected channel changes
    useEffect(() => {
        if (!selectedChannel) { setEpg([]); return; }
        let cancelled = false;
        setEpgLoading(true);
        api.getShortEPG(selectedChannel.stream_id, 6)
            .then((p) => { if (!cancelled) setEpg(p); })
            .finally(() => { if (!cancelled) setEpgLoading(false); });
        return () => { cancelled = true; };
    }, [selectedChannel]);

    // Lazy load on channels scroll
    useEffect(() => {
        const c = channelsScrollRef.current;
        if (!c) return;
        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = c;
            if (scrollTop + clientHeight >= scrollHeight * 0.8 && visibleCount < filteredStreams.length) {
                setVisibleCount((p) => Math.min(p + 20, filteredStreams.length));
            }
        };
        c.addEventListener('scroll', onScroll);
        return () => c.removeEventListener('scroll', onScroll);
    }, [filteredStreams.length, visibleCount]);

    // TV Navigation
    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (focusArea === 'categories') {
            // -1 = campo de busca (acima do "Todos")
            if (direction === 'up') setFocusedCategoryIndex((p) => Math.max(-1, p - 1));
            else if (direction === 'down') setFocusedCategoryIndex((p) => Math.min(cats.length, p + 1));
            else if (direction === 'right') setFocusArea('channels');
            else if (direction === 'left') setFocusZone('sidebar');
        } else if (focusArea === 'channels') {
            if (direction === 'up') setFocusedChannelIndex((p) => Math.max(0, p - 1));
            else if (direction === 'down') setFocusedChannelIndex((p) => {
                const next = Math.min(filteredStreams.length - 1, p + 1);
                if (next >= visibleCount - 6) setVisibleCount((c) => Math.min(c + 20, filteredStreams.length));
                return next;
            });
            else if (direction === 'left') setFocusArea('categories');
        }
    };

    const handleEnter = () => {
        if (focusArea === 'categories') {
            const idx = focusedCategoryIndex;
            if (idx === -1) { searchRef.current?.focus(); return; } // abre o teclado do sistema (TV)
            setSelectedCategory(idx === 0 ? 'all' : (cats[idx - 1]?.category_id || "all"));
        } else if (focusArea === 'channels') {
            const ch = filteredStreams[focusedChannelIndex];
            if (ch) {
                // 1a vez: seleciona (mostra preview). 2a vez no MESMO canal: tela cheia.
                if (selectedChannel?.stream_id === ch.stream_id) setShowPlayer(true);
                else setSelectedChannel(ch);
            }
        }
    };

    useTVNavigation({ onNavigate: handleNavigate, onEnter: handleEnter, enabled: focusZone === 'content' && !showPlayer });

    // Auto-scroll focused channel into view
    useEffect(() => {
        if (focusArea !== 'channels') return;
        const el = channelsScrollRef.current?.querySelector('.ch-row.tv-focused') as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [focusedChannelIndex, focusArea]);

    const handleImageError = (id: number) => setBrokenImages((p) => new Set(p).add(id));

    // Zapping no player ao vivo: troca pro canal anterior/proximo da lista filtrada
    const zapChannel = (delta: number) => {
        if (!selectedChannel) return;
        const idx = filteredStreams.findIndex((c) => c.stream_id === selectedChannel.stream_id);
        const next = filteredStreams[idx + delta];
        if (next) { setSelectedChannel(next); setFocusedChannelIndex(idx + delta); }
    };

    const fmtTime = (s: string) => {
        const m = /(\d{2}:\d{2})/.exec(s || '');
        return m ? m[1] : '';
    };

    if (loading) {
        return (
            <div className="livetv2-loading">
                <div className="loading-tv-icon">📺</div>
                <span>Carregando canais...</span>
            </div>
        );
    }
    if (error) {
        return (
            <div className="livetv2-error">
                <div className="error-icon">📡</div>
                <h2>Erro ao carregar canais</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">🔄 Tentar novamente</button>
            </div>
        );
    }

    return (
        <div className="livetv2">
            {/* COL 1 — Categorias */}
            <aside className="cat-col">
                <div className={`cat-search ${focusArea === 'categories' && focusedCategoryIndex === -1 ? 'tv-focused' : ''}`}>
                    <span className="cat-search-icon">🔍</span>
                    <input
                        ref={searchRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="cat-search-input"
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
                <div className="cat-list">
                    <button
                        className={`cat-item ${selectedCategory === 'all' ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === 0 ? 'tv-focused' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >Todos</button>
                    {cats.map((cat, i) => (
                        <button
                            key={cat.category_id}
                            className={`cat-item ${selectedCategory === cat.category_id ? 'active' : ''} ${focusArea === 'categories' && focusedCategoryIndex === i + 1 ? 'tv-focused' : ''}`}
                            onClick={() => setSelectedCategory(cat.category_id)}
                        >{cat.category_name}</button>
                    ))}
                </div>
            </aside>

            {/* COL 2 — Canais */}
            <div className="ch-col" ref={channelsScrollRef}>
                {filteredStreams.length === 0 ? (
                    <div className="ch-empty">
                        <div className="ch-empty-icon">📺</div>
                        <p>Nenhum canal encontrado</p>
                    </div>
                ) : (
                    filteredStreams.slice(0, visibleCount).map((ch, i) => (
                        <div
                            key={ch.stream_id}
                            className={`ch-row ${focusArea === 'channels' && focusedChannelIndex === i ? 'tv-focused' : ''} ${selectedChannel?.stream_id === ch.stream_id ? 'selected' : ''}`}
                            onClick={() => setSelectedChannel(ch)}
                        >
                            <div className="ch-logo">
                                {brokenImages.has(ch.stream_id) || !ch.stream_icon ? (
                                    <span>📺</span>
                                ) : (
                                    <img src={ch.stream_icon} alt={ch.name} onError={() => handleImageError(ch.stream_id)} />
                                )}
                            </div>
                            <div className="ch-name">{ch.name || 'Canal'}</div>
                        </div>
                    ))
                )}
            </div>

            {/* COL 3 — Info + EPG */}
            <aside className="info-col">
                {!selectedChannel ? (
                    <div className="info-empty">
                        <div className="info-empty-icon">📺</div>
                        <p>Selecione um canal</p>
                    </div>
                ) : (
                    <>
                        <div className="info-head">
                            {/* Mini preview do canal (mudo) — OK de novo abre em tela cheia */}
                            <div className="info-preview-wrap">
                                <video
                                    ref={previewRef}
                                    className="info-preview"
                                    muted
                                    playsInline
                                    autoPlay
                                    poster={selectedChannel.stream_icon || undefined}
                                />
                                <span className="info-preview-badge"><span className="live-dot" /> PRÉVIA</span>
                            </div>
                            <h2 className="info-name">{selectedChannel.name}</h2>
                            <p className="info-hint">▶ Pressione OK de novo para assistir em tela cheia</p>
                        </div>

                        <div className="epg-block">
                            {epgLoading ? (
                                <p className="epg-empty">Carregando programação...</p>
                            ) : epg.length === 0 ? (
                                <p className="epg-empty">Sem programação disponível.</p>
                            ) : (
                                <>
                                    {/* No ar agora + sinopse */}
                                    <div className="epg-now">
                                        <span className="epg-now-badge"><span className="live-dot" /> NO AR AGORA</span>
                                        <h3 className="epg-now-prog">{epg[0].title || 'Programa'}</h3>
                                        {(epg[0].start || epg[0].end) && (
                                            <span className="epg-now-time">{fmtTime(epg[0].start)}{epg[0].end ? ` – ${fmtTime(epg[0].end)}` : ''}</span>
                                        )}
                                        {epg[0].description && <p className="epg-now-desc">{epg[0].description}</p>}
                                    </div>

                                    {/* A seguir (horários) */}
                                    {epg.length > 1 && (
                                        <div className="epg-next">
                                            <h4 className="epg-next-title">A seguir</h4>
                                            <ul className="epg-list">
                                                {epg.slice(1).map((p, idx) => (
                                                    <li key={idx} className="epg-item">
                                                        <span className="epg-time">{fmtTime(p.start)}</span>
                                                        <span className="epg-prog">{p.title || 'Programa'}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </aside>

            {showPlayer && selectedChannel && (
                <VideoPlayer
                    src={api.getLiveStreamUrl(selectedChannel.stream_id)}
                    title={selectedChannel.name}
                    poster={selectedChannel.stream_icon}
                    isLive
                    contentType="live"
                    onChannelUp={() => zapChannel(-1)}
                    onChannelDown={() => zapChannel(1)}
                    onClose={() => setShowPlayer(false)}
                />
            )}
        </div>
    );
}

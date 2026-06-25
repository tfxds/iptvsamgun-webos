// SeriesPlayer — player de série reutilizável (Continuar Assistindo / Home / Séries).
// Carrega a info da série, controla o episódio atual e habilita próximo/anterior +
// auto-avançar, salvando o progresso. Assim a série usa SEMPRE o mesmo player.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { SeriesInfo } from '../types';
import { VideoPlayer } from './VideoPlayer';

interface SeriesPlayerProps {
    seriesId: number;
    name: string;
    poster?: string;
    startSeason: number;
    startEpisode: number;
    resumeTime?: number | null; // retomada só do episódio inicial
    onClose: () => void;
}

export function SeriesPlayer({ seriesId, name, poster = '', startSeason, startEpisode, resumeTime, onClose }: SeriesPlayerProps) {
    const [info, setInfo] = useState<SeriesInfo | null>(null);
    const [cur, setCur] = useState<{ season: number; episode: number }>({ season: startSeason, episode: startEpisode });
    const [src, setSrc] = useState<string>('');
    const [resume, setResume] = useState<number>(resumeTime || 0);

    // carrega a info da série uma vez
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const data = await api.getSeriesInfo(seriesId);
                if (alive) setInfo(data);
            } catch (e) {
                console.error('Erro ao carregar série:', e);
            }
        })();
        return () => { alive = false; };
    }, [seriesId]);

    // monta a URL do episódio atual quando info/episódio mudam
    useEffect(() => {
        if (!info) return;
        const eps = info.episodes?.[cur.season] || [];
        const epData = eps.find(e => Number(e.episode_num) === cur.episode) || eps[0];
        if (!epData) return;
        setSrc(api.getSeriesStreamUrl(epData.id, epData.container_extension || 'mp4'));
    }, [info, cur]);

    // (temporada, episódio) adjacente — troca de temporada incluída
    const adjacent = useCallback((delta: number): { season: number; episode: number } | null => {
        if (!info) return null;
        const eps = info.episodes?.[cur.season] || [];
        const idx = eps.findIndex(e => Number(e.episode_num) === cur.episode);
        if (delta > 0 && idx >= 0 && idx < eps.length - 1) return { season: cur.season, episode: Number(eps[idx + 1].episode_num) };
        if (delta < 0 && idx > 0) return { season: cur.season, episode: Number(eps[idx - 1].episode_num) };
        const seasonsList = Object.keys(info.episodes || {}).map(Number).sort((a, b) => a - b);
        const sIdx = seasonsList.indexOf(cur.season);
        if (delta > 0 && sIdx >= 0 && sIdx < seasonsList.length - 1) {
            const ns = seasonsList[sIdx + 1];
            const nEps = info.episodes[ns] || [];
            if (nEps[0]) return { season: ns, episode: Number(nEps[0].episode_num) };
        } else if (delta < 0 && sIdx > 0) {
            const ps = seasonsList[sIdx - 1];
            const pEps = info.episodes[ps] || [];
            if (pEps.length) return { season: ps, episode: Number(pEps[pEps.length - 1].episode_num) };
        }
        return null;
    }, [info, cur]);

    const epNav = useMemo(() => ({ next: !!adjacent(1), prev: !!adjacent(-1) }), [adjacent]);

    const go = useCallback((delta: number) => {
        const n = adjacent(delta);
        if (!n) return;
        // retoma esse episódio se houver progresso salvo, senão começa do zero
        const saved = storage.getProgress(String(seriesId), 'series');
        setResume((saved && saved.season === n.season && saved.episode === n.episode) ? saved.position : 0);
        setCur(n);
    }, [adjacent, seriesId]);

    // enquanto a info carrega, fundo escuro (evita flash)
    if (!src) {
        return <div className="fixed inset-0 z-[60] bg-[#060912]" />;
    }

    return (
        <VideoPlayer
            src={src}
            title={`${name} - T${cur.season} E${cur.episode}`}
            poster={poster}
            contentType="series"
            resumeTime={resume || null}
            onTimeUpdate={(t, d) => storage.saveProgress({
                id: String(seriesId), type: 'series', title: name, poster,
                position: t, duration: d, season: cur.season, episode: cur.episode,
            })}
            onNextEpisode={() => go(1)}
            onPreviousEpisode={() => go(-1)}
            canGoNext={epNav.next}
            canGoPrevious={epNav.prev}
            onClose={onClose}
        />
    );
}

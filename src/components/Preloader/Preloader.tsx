// Preloader - tela de carregamento pos-login.
// Mostra a logo do revendedor grande + 3 passos (Canais, Filmes, Series)
// carregando em sequencia, com barra de progresso. Esquenta o cache da api
// pra que Canais/Filmes/Series abram instantaneos. Ao terminar -> onReady().

import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import './Preloader.css';

interface PreloaderProps {
    logoUrl?: string;
    onReady: () => void;
}

type StepStatus = 'pending' | 'loading' | 'done';

interface Step {
    key: 'live' | 'movies' | 'series';
    label: string;
    order: string;
    load: () => Promise<unknown>;
    status: StepStatus;
}

export function Preloader({ logoUrl, onReady }: PreloaderProps) {
    const [steps, setSteps] = useState<Step[]>([
        { key: 'live', order: '1º', label: 'Canais', status: 'pending', load: () => api.getLiveStreams() },
        { key: 'movies', order: '2º', label: 'Filmes', status: 'pending', load: () => api.getVODStreams() },
        { key: 'series', order: '3º', label: 'Séries', status: 'pending', load: () => api.getSeries() },
    ]);
    const startedRef = useRef(false);

    const setStatus = (index: number, status: StepStatus) =>
        setSteps(prev => prev.map((s, i) => (i === index ? { ...s, status } : s)));

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        let cancelled = false;
        (async () => {
            // Carrega em sequencia (Canais -> Filmes -> Series) pros passos acenderem 1 a 1.
            for (let i = 0; i < steps.length; i++) {
                if (cancelled) return;
                setStatus(i, 'loading');
                try {
                    await steps[i].load();
                } catch (e) {
                    // Mesmo se uma lista falhar, segue (a pagina lida com vazio/erro depois)
                    console.warn('Preloader: falha ao carregar', steps[i].key, e);
                }
                if (cancelled) return;
                setStatus(i, 'done');
            }
            // pequena pausa pro usuario ver o ultimo check antes de entrar
            await new Promise(r => setTimeout(r, 450));
            if (!cancelled) onReady();
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const doneCount = steps.filter(s => s.status === 'done').length;
    const progress = Math.round((doneCount / steps.length) * 100);

    return (
        <div className="sa-preloader">
            <div className="sa-preloader-bg" />
            <div className="sa-preloader-inner">
                <div className="sa-preloader-logo">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Revendedor" />
                    ) : (
                        <img src="/saplayer-logo.png" alt="S.A Player" />
                    )}
                </div>

                <div className="sa-preloader-side">
                    <h2 className="sa-preloader-title">Preparando seu conteúdo</h2>
                    <p className="sa-preloader-sub">Atualizando a lista de reprodução…</p>

                    <ul className="sa-preloader-steps">
                        {steps.map(s => (
                            <li key={s.key} className={`sa-step sa-step-${s.status}`}>
                                <span className="sa-step-icon">
                                    {s.status === 'done' ? '✓' : s.status === 'loading' ? <span className="sa-spinner" /> : s.order}
                                </span>
                                <span className="sa-step-label">
                                    {s.status === 'loading' ? `Carregando ${s.label.toLowerCase()}…` : `${s.label}`}
                                </span>
                                {s.status === 'done' && <span className="sa-step-ok">carregado</span>}
                            </li>
                        ))}
                    </ul>

                    <div className="sa-progress">
                        <div className="sa-progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="sa-progress-pct">{progress}%</div>
                </div>
            </div>
        </div>
    );
}

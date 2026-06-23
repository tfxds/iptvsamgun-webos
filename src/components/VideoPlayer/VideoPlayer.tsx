// VideoPlayer Component - Premium player with HLS support for TV
import { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaCog, FaStepForward, FaStepBackward, FaBackward, FaForward } from 'react-icons/fa';
import { useHls } from '../../hooks/useHls';
import { useTVNavigation } from '../../hooks/useTVNavigation';
import './VideoPlayer.css';

export interface VideoPlayerProps {
    src: string;
    title?: string;
    poster?: string;
    onClose?: () => void;
    isLive?: boolean;
    autoPlay?: boolean;
    resumeTime?: number | null;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onNextEpisode?: () => void;
    onPreviousEpisode?: () => void;
    canGoNext?: boolean;
    canGoPrevious?: boolean;
    contentType?: 'movie' | 'series' | 'live';
}

// Control buttons: close, prev(ep), rewind(-10s), play, forward(+10s), next(ep), quality
type ControlButton = 'close' | 'prev' | 'rewind' | 'play' | 'forward' | 'next' | 'quality';
const SEEK_STEP = 10; // segundos por toque em voltar/avancar
type PlayerFocus = 'controls' | 'quality-menu';

export function VideoPlayer({
    src,
    title,
    poster,
    onClose,
    isLive = false,
    autoPlay = true,
    resumeTime,
    onTimeUpdate,
    onNextEpisode,
    onPreviousEpisode,
    canGoNext,
    canGoPrevious,
    contentType = 'movie'
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const resumeAppliedRef = useRef(false);

    // Video state
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState(0);
    // Scrub estilo Netflix: ao avancar/voltar mostra a posicao de destino e so aplica
    // o seek depois de uma pausa (preview de tempo).
    const [scrubTarget, setScrubTarget] = useState<number | null>(null);
    const scrubTargetRef = useRef<number | null>(null);
    const scrubCommitRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Focus management
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [qualityMenuIndex, setQualityMenuIndex] = useState(0);
    const [playerFocus, setPlayerFocus] = useState<PlayerFocus>('controls');
    const [focusedControl, setFocusedControl] = useState<ControlButton>('play');

    // HLS hook with quality support
    const {
        cleanup,
        qualityLevels,
        currentQualityIndex,
        setQuality,
        isAutoQuality,
        setAutoQuality
    } = useHls({
        src,
        videoRef,
        autoPlay,
        onError: () => setError('Erro ao carregar stream')
    });

    // Build list of available control buttons
    const getControlButtons = useCallback((): ControlButton[] => {
        const isVod = !isLive && contentType !== 'live';
        const buttons: ControlButton[] = ['close'];
        if (canGoPrevious && onPreviousEpisode) buttons.push('prev');
        if (isVod) buttons.push('rewind');
        buttons.push('play');
        if (isVod) buttons.push('forward');
        if (canGoNext && onNextEpisode) buttons.push('next');
        if (qualityLevels.length > 0) buttons.push('quality');
        return buttons;
    }, [canGoPrevious, canGoNext, onPreviousEpisode, onNextEpisode, qualityLevels.length, isLive, contentType]);

    // Resume time - apply once when video is ready
    useEffect(() => {
        if (!resumeTime || !videoRef.current || resumeAppliedRef.current) return;

        const video = videoRef.current;

        const applyResumeTime = () => {
            if (video && resumeTime && !resumeAppliedRef.current) {
                if (Math.abs(video.currentTime - resumeTime) > 5) {
                    video.currentTime = resumeTime;
                }
                resumeAppliedRef.current = true;
            }
        };

        if (video.readyState >= 2) {
            applyResumeTime();
        } else {
            video.addEventListener('loadedmetadata', applyResumeTime, { once: true });
        }

        return () => video.removeEventListener('loadedmetadata', applyResumeTime);
    }, [resumeTime, src]);

    // Time update callback for progress tracking
    useEffect(() => {
        if (!onTimeUpdate || !videoRef.current) return;

        const video = videoRef.current;
        let lastReportedTime = 0;

        const handleTimeUpdate = () => {
            if (Math.abs(video.currentTime - lastReportedTime) >= 5) {
                onTimeUpdate(video.currentTime, video.duration || 0);
                lastReportedTime = video.currentTime;
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [onTimeUpdate]);

    // Auto go to next episode when video ends
    useEffect(() => {
        if (!videoRef.current || !onNextEpisode || !canGoNext) return;

        const video = videoRef.current;
        const handleEnded = () => onNextEpisode();

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [onNextEpisode, canGoNext]);

    // Cleanup on unmount
    useEffect(() => {
        const video = videoRef.current;
        return () => {
            cleanup();
            if (video) {
                video.pause();
                video.src = '';
                video.load();
            }
        };
    }, [cleanup]);

    // Auto-hide controls
    const resetHideControlsTimer = useCallback(() => {
        setShowControls(true);
        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
        }
        hideControlsTimeoutRef.current = setTimeout(() => {
            if (playing && !showQualityMenu) {
                setShowControls(false);
            }
        }, 3000);
    }, [playing, showQualityMenu]);

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setPlaying(true);
        const handlePause = () => setPlaying(false);
        const handleTimeUpdateLocal = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration || 0);
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };
        const handleWaiting = () => setLoading(true);
        const handlePlaying = () => setLoading(false);
        const handleCanPlay = () => setLoading(false);
        const handleError = () => setError('Erro ao reproduzir vídeo');

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdateLocal);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdateLocal);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('progress', handleProgress);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
        };
    }, []);

    // Mouse move handler for controls
    useEffect(() => {
        const handleMouseMove = () => resetHideControlsTimer();
        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            if (hideControlsTimeoutRef.current) {
                clearTimeout(hideControlsTimeoutRef.current);
            }
        };
    }, [resetHideControlsTimer]);

    // Close handler
    const handleClose = useCallback(() => {
        if (onTimeUpdate && videoRef.current) {
            onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration || 0);
        }
        cleanup();
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
            videoRef.current.load();
        }
        onClose?.();
    }, [cleanup, onClose, onTimeUpdate]);

    // Controls
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }, []);

    const seek = useCallback((time: number) => {
        const video = videoRef.current;
        if (video) {
            video.currentTime = time;
        }
    }, []);

    // Scrub: acumula o destino e mostra preview; aplica o seek ~600ms apos o ultimo toque
    const scrubBy = useCallback((delta: number) => {
        const base = scrubTargetRef.current ?? (videoRef.current?.currentTime || 0);
        const max = (duration && isFinite(duration)) ? duration : Number.MAX_SAFE_INTEGER;
        const t = Math.max(0, Math.min(max, base + delta));
        scrubTargetRef.current = t;
        setScrubTarget(t);
        if (scrubCommitRef.current) clearTimeout(scrubCommitRef.current);
        scrubCommitRef.current = setTimeout(() => {
            if (scrubTargetRef.current !== null) {
                seek(scrubTargetRef.current);
                scrubTargetRef.current = null;
                setScrubTarget(null);
            }
        }, 600);
    }, [duration, seek]);

    // Quality menu handlers
    const openQualityMenu = useCallback(() => {
        setShowQualityMenu(true);
        setPlayerFocus('quality-menu');
        setQualityMenuIndex(0);
    }, []);

    const closeQualityMenu = useCallback(() => {
        setShowQualityMenu(false);
        setPlayerFocus('controls');
    }, []);

    const selectQuality = useCallback((index: number) => {
        if (index === -1) {
            setAutoQuality();
        } else {
            setQuality(index);
        }
        closeQualityMenu();
    }, [setQuality, setAutoQuality, closeQualityMenu]);

    // Execute focused control action
    const executeControlAction = useCallback(() => {
        switch (focusedControl) {
            case 'close':
                handleClose();
                break;
            case 'prev':
                onPreviousEpisode?.();
                break;
            case 'rewind':
                scrubBy(-SEEK_STEP);
                break;
            case 'play':
                togglePlay();
                break;
            case 'forward':
                scrubBy(SEEK_STEP);
                break;
            case 'next':
                onNextEpisode?.();
                break;
            case 'quality':
                openQualityMenu();
                break;
        }
    }, [focusedControl, handleClose, onPreviousEpisode, togglePlay, onNextEpisode, openQualityMenu, scrubBy]);

    // TV Navigation handler
    const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        resetHideControlsTimer();

        if (playerFocus === 'quality-menu') {
            const totalItems = qualityLevels.length + 1;
            if (direction === 'up') {
                setQualityMenuIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'down') {
                setQualityMenuIndex(prev => Math.min(totalItems - 1, prev + 1));
            }
        } else {
            // Navigate controls with left/right
            if (direction === 'left' || direction === 'right') {
                const buttons = getControlButtons();
                const currentIndex = buttons.indexOf(focusedControl);
                if (direction === 'left') {
                    const newIndex = Math.max(0, currentIndex - 1);
                    setFocusedControl(buttons[newIndex]);
                } else {
                    const newIndex = Math.min(buttons.length - 1, currentIndex + 1);
                    setFocusedControl(buttons[newIndex]);
                }
            }
            // Seek with left/right when on play button
            if (focusedControl === 'play') {
                if (direction === 'left') {
                    // Only seek if already at leftmost position
                    const buttons = getControlButtons();
                    const currentIndex = buttons.indexOf(focusedControl);
                    if (currentIndex === 0 || (currentIndex === 1 && buttons[0] === 'close')) {
                        // Don't seek, just navigate
                    }
                } else if (direction === 'right') {
                    // Don't seek, just navigate
                }
            }
        }
    }, [playerFocus, qualityLevels.length, focusedControl, getControlButtons, resetHideControlsTimer]);

    const handleEnter = useCallback(() => {
        resetHideControlsTimer();

        if (playerFocus === 'quality-menu') {
            if (qualityMenuIndex === 0) {
                selectQuality(-1);
            } else {
                const level = qualityLevels[qualityMenuIndex - 1];
                if (level) selectQuality(level.index);
            }
        } else {
            executeControlAction();
        }
    }, [playerFocus, qualityMenuIndex, qualityLevels, selectQuality, executeControlAction, resetHideControlsTimer]);

    const handleBack = useCallback(() => {
        if (playerFocus === 'quality-menu') {
            closeQualityMenu();
        } else if (onClose) {
            handleClose();
        }
    }, [playerFocus, closeQualityMenu, handleClose, onClose]);

    // TV Navigation hook
    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
        onBack: handleBack,
        enabled: true
    });

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isLive || contentType === 'live') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        seek(clickPosition * duration);
    };

    const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isLive || contentType === 'live' || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        setHoverPosition(e.clientX - rect.left);
        setHoverTime(position * duration);
    };

    // Helpers
    const formatTime = (seconds: number): string => {
        if (!isFinite(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const percentage = (value: number, total: number): number => {
        return total > 0 ? (value / total) * 100 : 0;
    };

    const getCurrentQualityLabel = (): string => {
        if (isAutoQuality) {
            const current = qualityLevels.find(l => l.index === currentQualityIndex);
            return current ? `Auto (${current.label})` : 'Auto';
        }
        const level = qualityLevels.find(l => l.index === currentQualityIndex);
        return level?.label || 'Auto';
    };

    return (
        <div
            ref={containerRef}
            className="video-player-container"
            onMouseMove={resetHideControlsTimer}
        >
            {/* Close Button */}
            {onClose && showControls && (
                <button
                    className={`video-player-close ${focusedControl === 'close' && playerFocus === 'controls' ? 'focused' : ''}`}
                    onClick={handleClose}
                >
                    ✕
                </button>
            )}

            {/* Title */}
            {title && showControls && (
                <div className="video-player-title">{title}</div>
            )}

            {/* Video Wrapper */}
            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    className="video-element"
                    poster={poster}
                    onClick={togglePlay}
                    playsInline
                />
            </div>

            {/* Scrub preview (estilo Netflix): mostra a posicao de destino ao avancar/voltar */}
            {scrubTarget !== null && (
                <div className="scrub-preview">
                    <div className="scrub-preview-time">
                        {formatTime(scrubTarget)}
                        <span className="scrub-preview-total"> / {formatTime(duration)}</span>
                    </div>
                    <div className="scrub-preview-bar">
                        <div className="scrub-preview-fill" style={{ width: `${percentage(scrubTarget, duration)}%` }} />
                        <div className="scrub-preview-marker" style={{ left: `${percentage(scrubTarget, duration)}%` }} />
                    </div>
                </div>
            )}

            {/* Central Play Button */}
            {!playing && !loading && !error && (
                <div className="central-play-button" onClick={togglePlay}>
                    <div className="central-play-icon">
                        <FaPlay />
                    </div>
                </div>
            )}

            {/* Loading Spinner */}
            {loading && (
                <div className="video-player-loading">
                    <div className="modern-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                    </div>
                    <span className="loading-text">Carregando...</span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="video-player-error">
                    <p>⚠️ {error}</p>
                    {onClose && <button onClick={handleClose}>Fechar</button>}
                </div>
            )}

            {/* Quality Menu */}
            {showQualityMenu && qualityLevels.length > 0 && (
                <div className="quality-menu">
                    <div className="quality-menu-header">
                        <FaCog /> Qualidade
                    </div>
                    <div className="quality-menu-items">
                        <div
                            className={`quality-menu-item ${qualityMenuIndex === 0 ? 'focused' : ''} ${isAutoQuality ? 'selected' : ''}`}
                            onClick={() => selectQuality(-1)}
                        >
                            Auto {isAutoQuality && currentQualityIndex >= 0 && `(${qualityLevels.find(l => l.index === currentQualityIndex)?.label})`}
                        </div>
                        {qualityLevels.map((level, idx) => (
                            <div
                                key={level.index}
                                className={`quality-menu-item ${qualityMenuIndex === idx + 1 ? 'focused' : ''} ${!isAutoQuality && currentQualityIndex === level.index ? 'selected' : ''}`}
                                onClick={() => selectQuality(level.index)}
                            >
                                {level.label}
                                <span className="quality-bitrate">
                                    {Math.round(level.bitrate / 1000)} kbps
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className={`video-player-controls ${showControls ? 'visible' : 'hidden'}`}>
                {/* Progress Bar (VOD only) */}
                {!isLive && contentType !== 'live' && (
                    <div
                        ref={progressRef}
                        className="progress-container"
                        onClick={handleProgressClick}
                        onMouseMove={handleProgressHover}
                        onMouseLeave={() => setHoverTime(null)}
                    >
                        {hoverTime !== null && (
                            <div
                                className="time-preview-tooltip"
                                style={{ left: `${hoverPosition}px` }}
                            >
                                {formatTime(hoverTime)}
                            </div>
                        )}
                        <div className="progress-bar">
                            <div
                                className="progress-buffered"
                                style={{ width: `${percentage(buffered, duration)}%` }}
                            />
                            <div
                                className="progress-played"
                                style={{ width: `${percentage(currentTime, duration)}%` }}
                            />
                            <div
                                className="progress-handle"
                                style={{ left: `${percentage(currentTime, duration)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Controls Row */}
                <div className="controls-row">
                    <div className="controls-left">
                        {/* Previous Episode */}
                        {canGoPrevious && onPreviousEpisode && (
                            <button
                                className={`control-btn ${focusedControl === 'prev' && playerFocus === 'controls' ? 'focused' : ''}`}
                                onClick={onPreviousEpisode}
                            >
                                <FaStepBackward />
                            </button>
                        )}

                        {/* Voltar 10s (VOD) */}
                        {!isLive && contentType !== 'live' && (
                            <button
                                className={`control-btn ${focusedControl === 'rewind' && playerFocus === 'controls' ? 'focused' : ''}`}
                                onClick={() => scrubBy(-SEEK_STEP)}
                                title="Voltar 10s"
                            >
                                <FaBackward />
                            </button>
                        )}

                        {/* Play/Pause */}
                        <button
                            className={`control-btn ${focusedControl === 'play' && playerFocus === 'controls' ? 'focused' : ''}`}
                            onClick={togglePlay}
                        >
                            {playing ? <FaPause /> : <FaPlay />}
                        </button>

                        {/* Avancar 10s (VOD) */}
                        {!isLive && contentType !== 'live' && (
                            <button
                                className={`control-btn ${focusedControl === 'forward' && playerFocus === 'controls' ? 'focused' : ''}`}
                                onClick={() => scrubBy(SEEK_STEP)}
                                title="Avancar 10s"
                            >
                                <FaForward />
                            </button>
                        )}

                        {/* Next Episode */}
                        {canGoNext && onNextEpisode && (
                            <button
                                className={`control-btn ${focusedControl === 'next' && playerFocus === 'controls' ? 'focused' : ''}`}
                                onClick={onNextEpisode}
                            >
                                <FaStepForward />
                            </button>
                        )}

                        {/* Time / Live Badge */}
                        {isLive || contentType === 'live' ? (
                            <span className="live-badge">
                                <span className="live-dot" />
                                AO VIVO
                            </span>
                        ) : (
                            <span className="time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        )}
                    </div>

                    <div className="controls-right">
                        {/* Quality Button */}
                        {qualityLevels.length > 0 && (
                            <button
                                className={`control-btn quality-btn ${focusedControl === 'quality' && playerFocus === 'controls' ? 'focused' : ''}`}
                                onClick={openQualityMenu}
                                title="Qualidade"
                            >
                                <FaCog />
                                <span className="quality-label">{getCurrentQualityLabel()}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

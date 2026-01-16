// VideoPlayer Component - Premium player with HLS support for TV
import { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeDown, FaVolumeOff, FaVolumeMute, FaExpand, FaCompress, FaCog, FaStepForward, FaStepBackward } from 'react-icons/fa';
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
    // Resume & Progress
    resumeTime?: number | null;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    // Episode navigation
    onNextEpisode?: () => void;
    onPreviousEpisode?: () => void;
    canGoNext?: boolean;
    canGoPrevious?: boolean;
    // Content type
    contentType?: 'movie' | 'series' | 'live';
}

type PlayerFocus = 'video' | 'quality-menu';

export function VideoPlayer({
    src,
    title,
    poster,
    onClose,
    isLive = false,
    autoPlay = false,
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
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState(0);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

    // Quality menu state
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [qualityMenuIndex, setQualityMenuIndex] = useState(0);
    const [playerFocus, setPlayerFocus] = useState<PlayerFocus>('video');

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
        onError: () => setError('Erro ao carregar stream'),
        onStreamError: () => {
            // For live TV, could trigger quality fallback here
            console.log('[VideoPlayer] Stream error, could fall back to lower quality');
        }
    });

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
            video.addEventListener('canplay', applyResumeTime, { once: true });
        }

        return () => {
            video.removeEventListener('loadedmetadata', applyResumeTime);
            video.removeEventListener('canplay', applyResumeTime);
        };
    }, [resumeTime, src]);

    // Time update callback for progress tracking
    useEffect(() => {
        if (!onTimeUpdate || !videoRef.current) return;

        const video = videoRef.current;
        let lastReportedTime = 0;

        const handleTimeUpdate = () => {
            // Report every 5 seconds to avoid too many updates
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

        const handleEnded = () => {
            onNextEpisode();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [onNextEpisode, canGoNext]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = '';
                videoRef.current.load();
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

    // Fullscreen change handler
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

    // Close handler - cleanup before closing
    const handleClose = useCallback(() => {
        // Report final position before closing
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

    const handleVolumeChange = useCallback((newVolume: number) => {
        const video = videoRef.current;
        if (video) {
            video.volume = newVolume;
            setVolume(newVolume);
            if (newVolume > 0) setMuted(false);
        }
    }, []);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            setMuted(!muted);
        }
    }, [muted]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    // Quality menu handlers
    const openQualityMenu = useCallback(() => {
        setShowQualityMenu(true);
        setPlayerFocus('quality-menu');
        setQualityMenuIndex(0);
    }, []);

    const closeQualityMenu = useCallback(() => {
        setShowQualityMenu(false);
        setPlayerFocus('video');
    }, []);

    const selectQuality = useCallback((index: number) => {
        if (index === -1) {
            setAutoQuality();
        } else {
            setQuality(index);
        }
        closeQualityMenu();
    }, [setQuality, setAutoQuality, closeQualityMenu]);

    // TV Navigation handler
    const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        resetHideControlsTimer();

        if (playerFocus === 'quality-menu') {
            // Navigate quality menu
            const totalItems = qualityLevels.length + 1; // +1 for Auto
            if (direction === 'up') {
                setQualityMenuIndex(prev => Math.max(0, prev - 1));
            } else if (direction === 'down') {
                setQualityMenuIndex(prev => Math.min(totalItems - 1, prev + 1));
            }
        } else {
            // Video controls
            if (direction === 'left') {
                seek(Math.max(0, currentTime - 10));
            } else if (direction === 'right') {
                seek(Math.min(duration, currentTime + 10));
            } else if (direction === 'up') {
                handleVolumeChange(Math.min(1, volume + 0.1));
            } else if (direction === 'down') {
                handleVolumeChange(Math.max(0, volume - 0.1));
            }
        }
    }, [playerFocus, qualityLevels.length, currentTime, duration, volume, seek, handleVolumeChange, resetHideControlsTimer]);

    const handleEnter = useCallback(() => {
        resetHideControlsTimer();

        if (playerFocus === 'quality-menu') {
            // Select quality
            if (qualityMenuIndex === 0) {
                selectQuality(-1); // Auto
            } else {
                const level = qualityLevels[qualityMenuIndex - 1];
                if (level) selectQuality(level.index);
            }
        } else {
            togglePlay();
        }
    }, [playerFocus, qualityMenuIndex, qualityLevels, selectQuality, togglePlay, resetHideControlsTimer]);

    const handleBack = useCallback(() => {
        if (playerFocus === 'quality-menu') {
            closeQualityMenu();
        } else if (document.fullscreenElement) {
            document.exitFullscreen();
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

    // Handle specific keys for quality menu toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'q' || e.key === 'ColorF0Red') {
                e.preventDefault();
                if (showQualityMenu) {
                    closeQualityMenu();
                } else if (qualityLevels.length > 0) {
                    openQualityMenu();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showQualityMenu, qualityLevels.length, openQualityMenu, closeQualityMenu]);

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

    const getVolumeIcon = () => {
        if (muted || volume === 0) return <FaVolumeMute />;
        if (volume < 0.33) return <FaVolumeOff />;
        if (volume < 0.66) return <FaVolumeDown />;
        return <FaVolumeUp />;
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
                <button className="video-player-close" onClick={handleClose}>✕</button>
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
                        {/* Time Preview Tooltip */}
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
                            <button className="control-btn" onClick={onPreviousEpisode}>
                                <FaStepBackward />
                            </button>
                        )}

                        {/* Play/Pause */}
                        <button className="control-btn" onClick={togglePlay}>
                            {playing ? <FaPause /> : <FaPlay />}
                        </button>

                        {/* Next Episode */}
                        {canGoNext && onNextEpisode && (
                            <button className="control-btn" onClick={onNextEpisode}>
                                <FaStepForward />
                            </button>
                        )}

                        {/* Volume */}
                        <div
                            className="volume-control"
                            onMouseEnter={() => setShowVolumeSlider(true)}
                            onMouseLeave={() => setShowVolumeSlider(false)}
                        >
                            <button className="control-btn volume-btn" onClick={toggleMute}>
                                {getVolumeIcon()}
                            </button>
                            {showVolumeSlider && (
                                <input
                                    type="range"
                                    className="volume-slider"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={muted ? 0 : volume}
                                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                />
                            )}
                        </div>

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
                                className="control-btn quality-btn"
                                onClick={openQualityMenu}
                                title="Qualidade"
                            >
                                <FaCog />
                                <span className="quality-label">{getCurrentQualityLabel()}</span>
                            </button>
                        )}

                        {/* Fullscreen */}
                        <button className="control-btn fullscreen-btn" onClick={toggleFullscreen}>
                            {isFullscreen ? <FaCompress /> : <FaExpand />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

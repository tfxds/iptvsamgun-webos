// VideoPlayer Component - Premium player with HLS support
import { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeDown, FaVolumeOff, FaVolumeMute, FaExpand, FaCompress } from 'react-icons/fa';
import { useHls } from '../../hooks/useHls';
import './VideoPlayer.css';

interface VideoPlayerProps {
    src: string;
    title?: string;
    poster?: string;
    onClose?: () => void;
    isLive?: boolean;
    autoPlay?: boolean;
}

export function VideoPlayer({
    src,
    title,
    poster,
    onClose,
    isLive = false,
    autoPlay = false
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    // HLS hook - pass autoPlay
    const { cleanup } = useHls({
        src,
        videoRef,
        autoPlay,
        onError: () => setError('Erro ao carregar stream')
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
            // Stop video completely
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
            if (playing) {
                setShowControls(false);
            }
        }, 3000);
    }, [playing]);

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setPlaying(true);
        const handlePause = () => setPlaying(false);
        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
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
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    seek(Math.max(0, currentTime - 10));
                    break;
                case 'arrowright':
                    e.preventDefault();
                    seek(Math.min(duration, currentTime + 10));
                    break;
                case 'arrowup':
                    e.preventDefault();
                    handleVolumeChange(Math.min(1, volume + 0.1));
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    handleVolumeChange(Math.max(0, volume - 0.1));
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (onClose) {
                        handleClose();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, duration, volume, onClose]);

    // Close handler - cleanup before closing
    const handleClose = useCallback(() => {
        cleanup();
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
            videoRef.current.load();
        }
        onClose?.();
    }, [cleanup, onClose]);

    // Controls
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const seek = (time: number) => {
        const video = videoRef.current;
        if (video) {
            video.currentTime = time;
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        const video = videoRef.current;
        if (video) {
            video.volume = newVolume;
            setVolume(newVolume);
            if (newVolume > 0) setMuted(false);
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            setMuted(!muted);
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isLive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        seek(clickPosition * duration);
    };

    const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isLive || !progressRef.current) return;
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

            {/* Controls */}
            <div className={`video-player-controls ${showControls ? 'visible' : 'hidden'}`}>
                {/* Progress Bar (VOD only) */}
                {!isLive && (
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
                        {/* Play/Pause */}
                        <button className="control-btn" onClick={togglePlay}>
                            {playing ? <FaPause /> : <FaPlay />}
                        </button>

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
                        {isLive ? (
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

// useHls hook - Manages HLS.js for streaming playback with quality selection
import { useEffect, useRef, useCallback, useState, type RefObject } from 'react';
import Hls from 'hls.js';

export interface QualityLevel {
    index: number;
    height: number;
    width: number;
    bitrate: number;
    label: string;
}

interface UseHlsOptions {
    src: string;
    videoRef: RefObject<HTMLVideoElement | null>;
    onError?: () => void;
    onStreamError?: () => void; // For live TV fallback
    autoPlay?: boolean;
}

interface UseHlsReturn {
    hlsRef: React.MutableRefObject<Hls | null>;
    cleanup: () => void;
    qualityLevels: QualityLevel[];
    currentQualityIndex: number;
    setQuality: (index: number) => void;
    isAutoQuality: boolean;
    setAutoQuality: () => void;
}

export function useHls({
    src,
    videoRef,
    onError,
    onStreamError,
    autoPlay = false
}: UseHlsOptions): UseHlsReturn {
    const hlsRef = useRef<Hls | null>(null);
    const srcRef = useRef<string>('');
    const onErrorRef = useRef(onError);
    const onStreamErrorRef = useRef(onStreamError);

    // Quality state
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentQualityIndex, setCurrentQualityIndex] = useState(-1); // -1 = auto
    const [isAutoQuality, setIsAutoQuality] = useState(true);

    // Keep error callback refs updated
    onErrorRef.current = onError;
    onStreamErrorRef.current = onStreamError;

    const cleanup = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        setQualityLevels([]);
        setCurrentQualityIndex(-1);
        setIsAutoQuality(true);
    }, []);

    // Set quality level
    const setQuality = useCallback((index: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = index;
            setCurrentQualityIndex(index);
            setIsAutoQuality(index === -1);
        }
    }, []);

    // Set auto quality
    const setAutoQuality = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = -1;
            setCurrentQualityIndex(-1);
            setIsAutoQuality(true);
        }
    }, []);

    // Helper to create quality label
    const getQualityLabel = (height: number): string => {
        if (height >= 2160) return '4K';
        if (height >= 1440) return '1440p';
        if (height >= 1080) return '1080p';
        if (height >= 720) return '720p';
        if (height >= 480) return '480p';
        if (height >= 360) return '360p';
        return `${height}p`;
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        // Avoid re-initializing if same src
        if (srcRef.current === src && hlsRef.current) {
            return;
        }

        // Cleanup previous instance
        cleanup();
        srcRef.current = src;

        // Reset video state
        video.pause();
        video.src = '';
        video.removeAttribute('src');
        video.load();

        // Check if source is HLS
        const isHls = src.includes('.m3u8');

        if (isHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 90,
                    maxBufferLength: 60,
                    maxMaxBufferLength: 600,
                    startLevel: -1, // Auto quality selection
                });

                hls.loadSource(src);
                hls.attachMedia(video);

                // Capture quality levels when manifest is parsed
                hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                    const levels: QualityLevel[] = data.levels.map((level, index) => ({
                        index,
                        height: level.height,
                        width: level.width,
                        bitrate: level.bitrate,
                        label: getQualityLabel(level.height),
                    }));

                    // Sort by height descending (best first)
                    levels.sort((a, b) => b.height - a.height);
                    setQualityLevels(levels);

                    if (autoPlay) {
                        video.play().catch(() => { });
                    }
                });

                // Track quality changes
                hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
                    setCurrentQualityIndex(data.level);
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('[HLS] Network error, trying to recover...');
                                hls.startLoad();
                                // If network error persists, call stream error callback
                                setTimeout(() => {
                                    if (hls.media?.error) {
                                        onStreamErrorRef.current?.();
                                    }
                                }, 5000);
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('[HLS] Media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('[HLS] Fatal error:', data);
                                cleanup();
                                onErrorRef.current?.();
                                onStreamErrorRef.current?.();
                                break;
                        }
                    }
                });

                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support (no quality selection)
                video.src = src;
                if (autoPlay) {
                    video.addEventListener('loadedmetadata', () => {
                        video.play().catch(() => { });
                    }, { once: true });
                }
            }
        } else {
            // Direct video source (MP4, etc.)
            video.src = src;
            if (autoPlay) {
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(() => { });
                }, { once: true });
            }
        }

        return () => {
            cleanup();
            srcRef.current = '';
        };
    }, [src, autoPlay, cleanup]);

    return {
        hlsRef,
        cleanup,
        qualityLevels,
        currentQualityIndex,
        setQuality,
        isAutoQuality,
        setAutoQuality
    };
}

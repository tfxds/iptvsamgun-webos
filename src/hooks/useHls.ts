// useHls hook - Manages HLS.js for streaming playback
import { useEffect, useRef, useCallback, type RefObject } from 'react';
import Hls from 'hls.js';

interface UseHlsOptions {
    src: string;
    videoRef: RefObject<HTMLVideoElement | null>;
    onError?: () => void;
    autoPlay?: boolean;
}

export function useHls({ src, videoRef, onError, autoPlay = false }: UseHlsOptions) {
    const hlsRef = useRef<Hls | null>(null);
    const srcRef = useRef<string>('');
    const onErrorRef = useRef(onError);

    // Keep error callback ref updated
    onErrorRef.current = onError;

    const cleanup = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    }, []);

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
                    lowLatencyMode: false, // Disable for stability
                    backBufferLength: 90,
                    maxBufferLength: 60,
                    maxMaxBufferLength: 600,
                    startLevel: -1, // Auto quality selection
                });

                hls.loadSource(src);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    // Only autoplay if explicitly requested
                    if (autoPlay) {
                        video.play().catch(() => {
                            // Autoplay blocked - user needs to interact
                        });
                    }
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('[HLS] Network error, trying to recover...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('[HLS] Media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('[HLS] Fatal error:', data);
                                cleanup();
                                onErrorRef.current?.();
                                break;
                        }
                    }
                });

                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
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
    }, [src, autoPlay, cleanup]); // Removed videoRef and onError from dependencies

    return { hlsRef, cleanup };
}

// Storage service for TV platforms (localStorage-based)

import type { Credentials } from '../types';

interface FavoriteItem {
    id: string;
    type: 'movie' | 'series' | 'channel';
    title: string;
    poster?: string;
    rating?: string;
    year?: string;
    addedAt: number;
}

interface WatchLaterItem {
    id: string;
    type: 'movie' | 'series' | 'channel';
    title: string;
    poster?: string;
    rating?: string;
    year?: string;
    addedAt: number;
}

const STORAGE_KEYS = {
    CREDENTIALS: 'neostream_credentials',
    FAVORITES: 'neostream_favorites',
    WATCH_LATER: 'neostream_watch_later',
    CONTINUE: 'neostream_continue',
    LAST_CHANNEL: 'neostream_last_channel',
    SETTINGS: 'neostream_settings',
    TMDB_API_KEY: 'neostream_tmdb_api_key',
};

// Continuar Assistindo (resume) — guarda onde parou em filme/serie
export interface ProgressItem {
    id: string;                 // stream_id (filme) ou series_id (serie)
    type: 'movie' | 'series';
    title: string;
    poster?: string;
    position: number;           // segundos
    duration: number;           // segundos (0 se desconhecido)
    season?: number;            // serie: temporada atual
    episode?: number;           // serie: episodio atual
    containerExtension?: string;// filme: extensao p/ remontar a URL
    updatedAt: number;
}

interface Settings {
    language: 'pt' | 'en' | 'es';
    autoPlay: boolean;
    preferredQuality: 'auto' | '1080p' | '720p' | '480p';
}

const DEFAULT_SETTINGS: Settings = {
    language: 'pt',
    autoPlay: true,
    preferredQuality: 'auto',
};

class StorageService {
    // Credentials
    saveCredentials(credentials: Credentials): void {
        localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    }

    getCredentials(): Credentials | null {
        const data = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
        return data ? JSON.parse(data) : null;
    }

    clearCredentials(): void {
        localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
    }

    // Favorites (full item storage)
    getFavorites(): FavoriteItem[] {
        const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        return data ? JSON.parse(data) : [];
    }

    addFavorite(item: FavoriteItem): void {
        const favorites = this.getFavorites();
        if (!favorites.some(f => f.id === item.id)) {
            favorites.push({ ...item, addedAt: Date.now() });
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        }
    }

    removeFavorite(id: string): void {
        const favorites = this.getFavorites().filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }

    isFavorite(id: string): boolean {
        return this.getFavorites().some(f => f.id === id);
    }

    clearFavorites(): void {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([]));
    }

    // Watch Later (Minha Lista)
    getWatchLater(): WatchLaterItem[] {
        const data = localStorage.getItem(STORAGE_KEYS.WATCH_LATER);
        return data ? JSON.parse(data) : [];
    }

    addWatchLater(item: WatchLaterItem): void {
        const items = this.getWatchLater();
        if (!items.some(i => i.id === item.id)) {
            items.push({ ...item, addedAt: Date.now() });
            localStorage.setItem(STORAGE_KEYS.WATCH_LATER, JSON.stringify(items));
        }
    }

    removeWatchLater(id: string): void {
        const items = this.getWatchLater().filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEYS.WATCH_LATER, JSON.stringify(items));
    }

    isInWatchLater(id: string): boolean {
        return this.getWatchLater().some(i => i.id === id);
    }

    clearWatchLater(): void {
        localStorage.setItem(STORAGE_KEYS.WATCH_LATER, JSON.stringify([]));
    }

    // Continuar Assistindo (resume)
    getContinueWatching(): ProgressItem[] {
        const data = localStorage.getItem(STORAGE_KEYS.CONTINUE);
        const list: ProgressItem[] = data ? JSON.parse(data) : [];
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    getProgress(id: string, type: 'movie' | 'series'): ProgressItem | null {
        return this.getContinueWatching().find(p => p.id === id && p.type === type) || null;
    }

    // Upsert do progresso. Ignora o comeco (<10s) e remove quando quase termina (>92%).
    saveProgress(item: Omit<ProgressItem, 'updatedAt'>): void {
        const list = this.getContinueWatching().filter(p => !(p.id === item.id && p.type === item.type));
        const nearEnd = item.duration > 0 && item.position >= item.duration * 0.92;
        if (item.position >= 10 && !nearEnd) {
            list.unshift({ ...item, updatedAt: Date.now() });
        }
        localStorage.setItem(STORAGE_KEYS.CONTINUE, JSON.stringify(list.slice(0, 50)));
    }

    removeProgress(id: string, type: 'movie' | 'series'): void {
        const list = this.getContinueWatching().filter(p => !(p.id === id && p.type === type));
        localStorage.setItem(STORAGE_KEYS.CONTINUE, JSON.stringify(list));
    }

    clearContinueWatching(): void {
        localStorage.setItem(STORAGE_KEYS.CONTINUE, JSON.stringify([]));
    }

    // Last channel
    setLastChannel(streamId: number): void {
        localStorage.setItem(STORAGE_KEYS.LAST_CHANNEL, String(streamId));
    }

    getLastChannel(): number | null {
        const data = localStorage.getItem(STORAGE_KEYS.LAST_CHANNEL);
        return data ? parseInt(data, 10) : null;
    }

    // Settings
    hasSettings(): boolean {
        return localStorage.getItem(STORAGE_KEYS.SETTINGS) !== null;
    }

    getSettings(): Settings {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    }

    saveSettings(settings: Partial<Settings>): void {
        const current = this.getSettings();
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
    }

    // TMDB API key (user-provided and stored locally only)
    getTmdbApiKey(): string {
        return localStorage.getItem(STORAGE_KEYS.TMDB_API_KEY) || '';
    }

    saveTmdbApiKey(apiKey: string): void {
        const trimmed = apiKey.trim();
        if (trimmed) {
            localStorage.setItem(STORAGE_KEYS.TMDB_API_KEY, trimmed);
        } else {
            this.clearTmdbApiKey();
        }
    }

    clearTmdbApiKey(): void {
        localStorage.removeItem(STORAGE_KEYS.TMDB_API_KEY);
    }

    // Clear all data
    clearAll(): void {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }
}

export const storage = new StorageService();

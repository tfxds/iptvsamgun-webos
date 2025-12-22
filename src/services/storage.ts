// Storage service for TV platforms (localStorage-based)

import type { Credentials } from '../types';

const STORAGE_KEYS = {
    CREDENTIALS: 'neostream_credentials',
    FAVORITES: 'neostream_favorites',
    LAST_CHANNEL: 'neostream_last_channel',
    SETTINGS: 'neostream_settings',
};

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

    // Favorites
    getFavorites(): number[] {
        const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        return data ? JSON.parse(data) : [];
    }

    addFavorite(streamId: number): void {
        const favorites = this.getFavorites();
        if (!favorites.includes(streamId)) {
            favorites.push(streamId);
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        }
    }

    removeFavorite(streamId: number): void {
        const favorites = this.getFavorites().filter(id => id !== streamId);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }

    isFavorite(streamId: number): boolean {
        return this.getFavorites().includes(streamId);
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
    getSettings(): Settings {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    }

    saveSettings(settings: Partial<Settings>): void {
        const current = this.getSettings();
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
    }

    // Clear all data
    clearAll(): void {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }
}

export const storage = new StorageService();

// Xtream Codes API Client - Ported from NeoStream IPTV

import type { AuthResponse, LiveStream, VODStream, Series, Category, SeriesInfo, Credentials } from '../types';

class XtreamAPI {
    private baseUrl: string = '';
    private username: string = '';
    private password: string = '';

    private async makeRequest<T>(action: string, params: Record<string, string> = {}): Promise<T> {
        const url = new URL(`${this.baseUrl}/player_api.php`);
        url.searchParams.append('username', this.username);
        url.searchParams.append('password', this.password);
        url.searchParams.append('action', action);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    setCredentials(credentials: Credentials): void {
        this.baseUrl = credentials.url.endsWith('/') ? credentials.url.slice(0, -1) : credentials.url;
        this.username = credentials.username;
        this.password = credentials.password;
    }

    getCredentials(): Credentials | null {
        if (!this.baseUrl || !this.username || !this.password) {
            return null;
        }
        return {
            url: this.baseUrl,
            username: this.username,
            password: this.password,
        };
    }

    async authenticate(url: string, username: string, password: string): Promise<AuthResponse> {
        const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const apiUrl = new URL(`${baseUrl}/player_api.php`);
        apiUrl.searchParams.append('username', username);
        apiUrl.searchParams.append('password', password);

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AuthResponse = await response.json();

        if (data.user_info && data.user_info.auth === 0) {
            throw new Error('Usuário ou senha incorretos');
        }

        if (!data.user_info) {
            throw new Error('Resposta inválida do servidor');
        }

        // Save credentials
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;

        return data;
    }

    async getLiveStreams(): Promise<LiveStream[]> {
        return this.makeRequest<LiveStream[]>('get_live_streams');
    }

    async getVODStreams(): Promise<VODStream[]> {
        return this.makeRequest<VODStream[]>('get_vod_streams');
    }

    async getSeries(): Promise<Series[]> {
        return this.makeRequest<Series[]>('get_series');
    }

    async getSeriesInfo(seriesId: number): Promise<SeriesInfo> {
        return this.makeRequest<SeriesInfo>('get_series_info', { series_id: String(seriesId) });
    }

    async getLiveCategories(): Promise<Category[]> {
        return this.makeRequest<Category[]>('get_live_categories');
    }

    async getVodCategories(): Promise<Category[]> {
        return this.makeRequest<Category[]>('get_vod_categories');
    }

    async getSeriesCategories(): Promise<Category[]> {
        return this.makeRequest<Category[]>('get_series_categories');
    }

    getLiveStreamUrl(streamId: number): string {
        return `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.m3u8`;
    }

    getVodStreamUrl(streamId: number, container: string = 'mp4'): string {
        return `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${container}`;
    }

    getSeriesStreamUrl(streamId: string | number, container: string = 'mp4'): string {
        return `${this.baseUrl}/series/${this.username}/${this.password}/${streamId}.${container}`;
    }

    isAuthenticated(): boolean {
        return !!(this.baseUrl && this.username && this.password);
    }

    logout(): void {
        this.baseUrl = '';
        this.username = '';
        this.password = '';
    }
}

// Singleton instance
export const api = new XtreamAPI();

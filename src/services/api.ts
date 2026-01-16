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

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

        try {
            const response = await fetch(apiUrl.toString(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Get response as text first to check if it's valid
            const text = await response.text();

            console.log('[API] Response text length:', text?.length || 0);

            if (!text || text.trim() === '') {
                throw new Error('Servidor retornou resposta vazia. Verifique a URL do servidor.');
            }

            // Check if response looks like HTML (error page)
            if (text.trim().startsWith('<')) {
                throw new Error('Servidor retornou página de erro. Verifique a URL.');
            }

            let data: AuthResponse;
            try {
                data = JSON.parse(text);
            } catch {
                console.error('[API] Failed to parse JSON:', text.substring(0, 200));
                throw new Error('Resposta inválida do servidor (não é JSON)');
            }

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
        } catch (error: any) {
            clearTimeout(timeoutId);

            // Handle specific error cases
            if (error.name === 'AbortError') {
                throw new Error('Tempo esgotado. O servidor demorou muito para responder.');
            }

            if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                throw new Error('Erro de conexão. Verifique sua internet e a URL do servidor.');
            }

            throw error;
        }
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

    async getVodInfo(vodId: number): Promise<{ info: VODStream; movie_data: any }> {
        return this.makeRequest<{ info: VODStream; movie_data: any }>('get_vod_info', { vod_id: String(vodId) });
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

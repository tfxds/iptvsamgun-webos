// TMDB API Service for NeoStream TV
const TMDB_API_KEY = '9d8ec8b10e9b4acd85853c44b29bd83a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Cache settings
const CACHE_EXPIRY_HOURS = 24;
const CACHE_KEYS = {
    MOVIE_DETAILS: 'tmdb_movie_details',
    SERIES_DETAILS: 'tmdb_series_details',
    MOVIE_SEARCH: 'tmdb_movie_search',
    SERIES_SEARCH: 'tmdb_series_search'
};

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface CacheStore<T> {
    [key: string]: CacheEntry<T>;
}

// In-memory cache
const memoryCache: {
    movieDetails: CacheStore<TMDBMovieDetails>;
    seriesDetails: CacheStore<TMDBSeriesDetails>;
    movieSearch: CacheStore<string | null>;
    seriesSearch: CacheStore<string | null>;
} = {
    movieDetails: {},
    seriesDetails: {},
    movieSearch: {},
    seriesSearch: {}
};

// Load cache from localStorage
function loadCacheFromStorage<T>(key: string): CacheStore<T> {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn(`Failed to load cache ${key}:`, e);
    }
    return {};
}

// Save cache to localStorage
function saveCacheToStorage<T>(key: string, cache: CacheStore<T>): void {
    try {
        const cleaned: CacheStore<T> = {};
        const now = Date.now();
        const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

        for (const [k, entry] of Object.entries(cache)) {
            if (now - entry.timestamp < expiryMs) {
                cleaned[k] = entry;
            }
        }

        localStorage.setItem(key, JSON.stringify(cleaned));
    } catch (e) {
        console.warn(`Failed to save cache ${key}:`, e);
    }
}

// Check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    if (!entry) return false;
    const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    return Date.now() - entry.timestamp < expiryMs;
}

// Initialize cache from localStorage
function initCache(): void {
    memoryCache.movieDetails = loadCacheFromStorage(CACHE_KEYS.MOVIE_DETAILS);
    memoryCache.seriesDetails = loadCacheFromStorage(CACHE_KEYS.SERIES_DETAILS);
    memoryCache.movieSearch = loadCacheFromStorage(CACHE_KEYS.MOVIE_SEARCH);
    memoryCache.seriesSearch = loadCacheFromStorage(CACHE_KEYS.SERIES_SEARCH);
}

initCache();

// Generic cache operations
function getCached<T>(store: CacheStore<T>, key: string): T | null {
    const entry = store[key];
    if (isCacheValid(entry)) {
        return entry.data;
    }
    return null;
}

function setCache<T>(store: CacheStore<T>, key: string, data: T, storageKey: string): void {
    store[key] = { data, timestamp: Date.now() };
    saveCacheToStorage(storageKey, store);
}

// Normalize search query
function normalizeSearchKey(name: string, year?: string): string {
    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ');
    return year ? `${cleanName}:${year}` : cleanName;
}

// TMDB Types
export interface TMDBMovieDetails {
    id?: number;
    genres: { id: number; name: string }[];
    overview: string;
    title: string;
    release_date: string;
    vote_average: number;
    backdrop_path: string | null;
    poster_path: string | null;
    certification?: string;
    imdb_id?: string;
    runtime?: number;
}

export interface TMDBSeriesDetails {
    id?: number;
    genres: { id: number; name: string }[];
    overview: string;
    name: string;
    first_air_date: string;
    vote_average: number;
    backdrop_path: string | null;
    poster_path: string | null;
    certification?: string;
    imdb_id?: string;
    number_of_seasons?: number;
}

/**
 * Get backdrop/poster image URL from TMDB
 */
export function getImageUrl(path: string | null, size: string = 'w780'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Fetch movie details by TMDB ID
 */
export async function fetchMovieDetails(tmdbId: string): Promise<TMDBMovieDetails | null> {
    if (!tmdbId) return null;

    const cached = getCached<TMDBMovieDetails>(memoryCache.movieDetails, tmdbId);
    if (cached) return cached;

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=release_dates,external_ids`
        );
        if (!response.ok) return null;
        const data = await response.json();

        // Extract certification
        let certification: string | undefined;
        if (data.release_dates?.results) {
            const brRelease = data.release_dates.results.find((r: any) => r.iso_3166_1 === 'BR');
            const usRelease = data.release_dates.results.find((r: any) => r.iso_3166_1 === 'US');
            const releaseData = brRelease || usRelease || data.release_dates.results[0];
            if (releaseData?.release_dates?.[0]?.certification) {
                certification = releaseData.release_dates[0].certification;
            }
        }

        const result = { ...data, certification };
        setCache(memoryCache.movieDetails, tmdbId, result, CACHE_KEYS.MOVIE_DETAILS);
        return result;
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

/**
 * Fetch series details by TMDB ID
 */
export async function fetchSeriesDetails(tmdbId: string): Promise<TMDBSeriesDetails | null> {
    if (!tmdbId) return null;

    const cached = getCached<TMDBSeriesDetails>(memoryCache.seriesDetails, tmdbId);
    if (cached) return cached;

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=content_ratings,external_ids`
        );
        if (!response.ok) return null;
        const data = await response.json();

        // Extract certification
        let certification: string | undefined;
        if (data.content_ratings?.results) {
            const brRating = data.content_ratings.results.find((r: any) => r.iso_3166_1 === 'BR');
            const usRating = data.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US');
            const ratingData = brRating || usRating || data.content_ratings.results[0];
            if (ratingData?.rating) {
                certification = ratingData.rating;
            }
        }

        const imdb_id = data.external_ids?.imdb_id || undefined;
        const result = { ...data, certification, imdb_id };
        setCache(memoryCache.seriesDetails, tmdbId, result, CACHE_KEYS.SERIES_DETAILS);
        return result;
    } catch (error) {
        console.error('Error fetching series details:', error);
        return null;
    }
}

/**
 * Search movie by name and get details
 */
export async function searchMovieByName(movieName: string, year?: string): Promise<TMDBMovieDetails | null> {
    const searchKey = normalizeSearchKey(movieName, year);

    const cachedTmdbId = getCached<string | null>(memoryCache.movieSearch, searchKey);
    if (cachedTmdbId !== null) {
        if (cachedTmdbId === '') return null;
        return await fetchMovieDetails(cachedTmdbId);
    }

    try {
        let cleanName = movieName.replace(/\s*\(\d{4}\)\s*/g, '').trim();
        cleanName = cleanName.replace(/\s*\[.*?\]\s*/g, '').trim();
        cleanName = cleanName.replace(/\s+/g, ' ').trim();

        const searchUrl = year
            ? `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(cleanName)}&year=${year}`
            : `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(cleanName)}`;

        const response = await fetch(searchUrl);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const tmdbId = data.results[0].id.toString();
            setCache(memoryCache.movieSearch, searchKey, tmdbId, CACHE_KEYS.MOVIE_SEARCH);
            return await fetchMovieDetails(tmdbId);
        }

        setCache(memoryCache.movieSearch, searchKey, '', CACHE_KEYS.MOVIE_SEARCH);
        return null;
    } catch (error) {
        console.error('Error searching movie:', error);
        return null;
    }
}

/**
 * Search series by name and get details
 */
export async function searchSeriesByName(seriesName: string, year?: string): Promise<TMDBSeriesDetails | null> {
    const searchKey = normalizeSearchKey(seriesName, year);

    const cachedTmdbId = getCached<string | null>(memoryCache.seriesSearch, searchKey);
    if (cachedTmdbId !== null) {
        if (cachedTmdbId === '') return null;
        return await fetchSeriesDetails(cachedTmdbId);
    }

    try {
        let cleanName = seriesName.replace(/\s*\(\d{4}\)\s*/g, '').trim();
        cleanName = cleanName.replace(/\s*\[.*?\]\s*/g, '').trim();
        cleanName = cleanName.replace(/\s+/g, ' ').trim();

        const searchUrl = year
            ? `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(cleanName)}&first_air_date_year=${year}`
            : `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(cleanName)}`;

        const response = await fetch(searchUrl);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const tmdbId = data.results[0].id.toString();
            setCache(memoryCache.seriesSearch, searchKey, tmdbId, CACHE_KEYS.SERIES_SEARCH);
            return await fetchSeriesDetails(tmdbId);
        }

        setCache(memoryCache.seriesSearch, searchKey, '', CACHE_KEYS.SERIES_SEARCH);
        return null;
    } catch (error) {
        console.error('Error searching series:', error);
        return null;
    }
}

/**
 * Format genres array to string
 */
export function formatGenres(genres: { id: number; name: string }[]): string {
    return genres.map(g => g.name).join(', ');
}

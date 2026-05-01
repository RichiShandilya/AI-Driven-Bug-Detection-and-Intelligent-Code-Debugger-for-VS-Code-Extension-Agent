/**
 * @file In-memory cache for Gemini API responses.
 * Prevents duplicate API calls for identical bug type + code snippet combos.
 */

import logger from './logger';

/** Structure of a cached Gemini response. */
interface CacheEntry {
    /** AI-generated explanation. */
    explanation: string;
    /** AI-generated suggested fix. */
    suggestedFix: string;
    /** Timestamp when this entry was cached. */
    cachedAt: number;
}

/** Maximum number of entries the cache can hold. */
const MAX_CACHE_SIZE = 200;

/** Time-to-live for cache entries in milliseconds (30 minutes). */
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Simple in-memory LRU-like cache for Gemini API responses.
 * Keyed by a hash of bug type + code snippet to avoid redundant API calls.
 */
class GeminiCache {
    private cache: Map<string, CacheEntry> = new Map();

    /**
     * Generates a deterministic cache key from bug type and code snippet.
     * @param bugType - The type of bug detected.
     * @param codeSnippet - The source code snippet containing the bug.
     * @returns A string key for the cache map.
     */
    public createKey(bugType: string, codeSnippet: string): string {
        return `${bugType}::${codeSnippet.trim()}`;
    }

    /**
     * Retrieves a cached response if it exists and is still valid.
     * @param key - The cache key to look up.
     * @returns The cached entry or undefined if not found / expired.
     */
    public get(key: string): CacheEntry | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }

        const isExpired = Date.now() - entry.cachedAt > CACHE_TTL_MS;
        if (isExpired) {
            this.cache.delete(key);
            logger.debug(`Cache entry expired and removed: ${key.substring(0, 50)}...`);
            return undefined;
        }

        logger.debug(`Cache hit: ${key.substring(0, 50)}...`);
        return entry;
    }

    /**
     * Stores a response in the cache. Evicts the oldest entry if at capacity.
     * @param key - The cache key.
     * @param explanation - The AI explanation to cache.
     * @param suggestedFix - The AI suggested fix to cache.
     */
    public set(key: string, explanation: string, suggestedFix: string): void {
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
                logger.debug(`Cache evicted oldest entry: ${String(oldestKey).substring(0, 50)}...`);
            }
        }

        this.cache.set(key, {
            explanation,
            suggestedFix,
            cachedAt: Date.now(),
        });
        logger.debug(`Cache stored: ${key.substring(0, 50)}...`);
    }

    /** Clears all entries from the cache. */
    public clear(): void {
        this.cache.clear();
        logger.info('Cache cleared.');
    }

    /** Returns the current number of cached entries. */
    public get size(): number {
        return this.cache.size;
    }
}

/** Singleton cache instance shared across the extension. */
const geminiCache = new GeminiCache();
export default geminiCache;

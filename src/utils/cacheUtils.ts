/**
 * Cache utility functions for optimizing data fetching and reducing API calls
 */

// Cache duration constants (in milliseconds)
export const CACHE_DURATIONS = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 10 * 60 * 1000, // 10 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Get data from cache if it exists and is not expired
 * @param key The cache key
 * @returns The cached data or null if not found or expired
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`cache_${key}`);
    if (!item) return null;

    const cacheItem: CacheItem<T> = JSON.parse(item);
    const now = Date.now();

    // Check if cache is expired
    if (now > cacheItem.expiry) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    return null;
  }
}

/**
 * Save data to cache with expiration
 * @param key The cache key
 * @param data The data to cache
 * @param duration How long to cache the data (in milliseconds)
 */
export function saveToCache<T>(key: string, data: T, duration: number): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    };

    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    // If storage is full, clear older caches
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldestCache();
      // Try again
      try {
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          expiry: Date.now() + duration,
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      } catch (retryError) {
      }
    }
  }
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  const cacheKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_')) {
      cacheKeys.push(key);
    }
  }

  cacheKeys.forEach(key => localStorage.removeItem(key));
}

/**
 * Clear expired cache items
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  const cacheKeys = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_')) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const cacheItem = JSON.parse(item);
          if (now > cacheItem.expiry) {
            cacheKeys.push(key);
          }
        }
      } catch (error) {
        cacheKeys.push(key); // Remove invalid cache items
      }
    }
  }

  cacheKeys.forEach(key => localStorage.removeItem(key));
}

/**
 * Clear the oldest cache item to free up space
 */
function clearOldestCache(): void {
  let oldestKey: string | null = null;
  let oldestTimestamp = Infinity;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_')) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const cacheItem = JSON.parse(item);
          if (cacheItem.timestamp < oldestTimestamp) {
            oldestTimestamp = cacheItem.timestamp;
            oldestKey = key;
          }
        }
      } catch (error) {
      }
    }
  }

  if (oldestKey) {
    localStorage.removeItem(oldestKey);
  }
}
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";

interface Place {
  id: string;
  name: string;
  description: string;
  image: string;
  lastUpdated?: number;
}

interface CachedPlacesData {
  places: Place[];
  timestamp: number;
  etag?: string;
  version: string;
  requestCount: number;
  lastRequestTime: number;
}

// Enhanced configuration for high-traffic optimization
const PLACES_CONFIG = {
  SHEET_ID: "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM",
  CORS_PROXY: "https://corsproxy.io/?",
  GID: "658730705",
  CACHE_KEY: "places_cache_v2",
  CACHE_DURATION: 30 * 60 * 1000, // Extended to 30 minutes
  REFRESH_INTERVAL: 15 * 60 * 1000, // Extended to 15 minutes
  DATA_VERSION: "2.0",
  DEFAULT_IMAGE: "https://placehold.co/800x600?text=Image+Not+Found",
  STAGGER_DELAY: 100, // Reduced for faster loading
  // High-traffic optimizations
  MIN_REQUEST_INTERVAL: 5 * 60 * 1000, // Minimum 5 minutes between requests
  MAX_REQUESTS_PER_HOUR: 10, // Maximum requests per hour
  FALLBACK_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours fallback
  REQUEST_TIMEOUT: 15000, // 15 seconds timeout
  RETRY_ATTEMPTS: 2,
  EXPONENTIAL_BACKOFF: true,
} as const;

// Enhanced cache manager with request throttling
class AdvancedPlacesCacheManager {
  private static readonly STORAGE_KEYS = {
    cache: PLACES_CONFIG.CACHE_KEY,
    requestLog: `${PLACES_CONFIG.CACHE_KEY}_requests`,
    userPrefs: `${PLACES_CONFIG.CACHE_KEY}_prefs`,
  };

  static set(data: CachedPlacesData): void {
    const storageData = {
      ...data,
      requestCount: this.getRequestCount() + 1,
      lastRequestTime: Date.now(),
    };

    try {
      // Try localStorage first
      localStorage.setItem(this.STORAGE_KEYS.cache, JSON.stringify(storageData));
      this.logRequest();
    } catch (e) {
      try {
        // Fallback to sessionStorage
        sessionStorage.setItem(this.STORAGE_KEYS.cache, JSON.stringify(storageData));
        console.warn("Using sessionStorage as fallback");
      } catch (e2) {
        console.error("Both localStorage and sessionStorage failed", e2);
      }
    }
  }

  static get(): CachedPlacesData | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.cache) ||
                  sessionStorage.getItem(this.STORAGE_KEYS.cache);
      
      if (!data) return null;

      const parsed = JSON.parse(data) as CachedPlacesData;
      
      // Version check
      if (parsed.version !== PLACES_CONFIG.DATA_VERSION) {
        this.clear();
        return null;
      }

      return parsed;
    } catch (e) {
      console.error("Cache read error:", e);
      this.clear();
      return null;
    }
  }

  static clear(): void {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (e) {
      console.error("Cache clear error:", e);
    }
  }

  static isValid(data: CachedPlacesData | null): boolean {
    if (!data) return false;
    
    const now = Date.now();
    const cacheAge = now - data.timestamp;
    
    // Use fallback duration if we're hitting rate limits
    if (this.isRateLimited()) {
      return cacheAge < PLACES_CONFIG.FALLBACK_CACHE_DURATION;
    }
    
    return cacheAge < PLACES_CONFIG.CACHE_DURATION;
  }

  static shouldRefresh(data: CachedPlacesData | null): boolean {
    if (!data) return true;
    if (this.isRateLimited()) return false;
    
    const now = Date.now();
    const timeSinceLastRequest = now - (data.lastRequestTime || 0);
    
    return timeSinceLastRequest > PLACES_CONFIG.MIN_REQUEST_INTERVAL;
  }

  private static logRequest(): void {
    try {
      const requests = this.getRequestLog();
      const now = Date.now();
      
      // Keep only requests from the last hour
      const oneHourAgo = now - 60 * 60 * 1000;
      const recentRequests = requests.filter(time => time > oneHourAgo);
      recentRequests.push(now);
      
      localStorage.setItem(this.STORAGE_KEYS.requestLog, JSON.stringify(recentRequests));
    } catch (e) {
      console.error("Request logging error:", e);
    }
  }

  private static getRequestLog(): number[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.requestLog);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  private static getRequestCount(): number {
    const requests = this.getRequestLog();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return requests.filter(time => time > oneHourAgo).length;
  }

  static isRateLimited(): boolean {
    return this.getRequestCount() >= PLACES_CONFIG.MAX_REQUESTS_PER_HOUR;
  }

  static getNextAllowedRequestTime(): number {
    if (!this.isRateLimited()) return 0;
    
    const requests = this.getRequestLog();
    const oldestRequest = Math.min(...requests);
    return oldestRequest + 60 * 60 * 1000; // One hour from oldest request
  }

  // Analytics and monitoring
  static getStats() {
    const data = this.get();
    const requestCount = this.getRequestCount();
    
    return {
      cacheSize: data ? JSON.stringify(data).length : 0,
      itemCount: data?.places.length || 0,
      lastUpdate: data?.timestamp || 0,
      requestsThisHour: requestCount,
      isRateLimited: this.isRateLimited(),
      nextRequestAllowed: this.getNextAllowedRequestTime(),
    };
  }
}

// Enhanced image URL processing with CDN optimization
const getOptimizedImageUrl = (url: string): string => {
  if (!url?.trim()) return PLACES_CONFIG.DEFAULT_IMAGE;

  try {
    const cleanUrl = url.trim();

    if (cleanUrl.includes("drive.google.com")) {
      let fileId = "";
      
      // Multiple patterns for Google Drive URLs
      const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/,
      ];

      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match) {
          fileId = match[1];
          break;
        }
      }

      if (fileId) {
        // Optimized Google Drive image URL with size parameters
        return `https://lh3.googleusercontent.com/d/${fileId}=w800-h600-c`;
      }
    }

    // Check for direct image URLs
    if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(cleanUrl)) {
      return cleanUrl;
    }

    // Known CDN patterns
    const cdnPatterns = [
      'imgur.com',
      'cloudinary.com',
      'amazonaws.com',
      'unsplash.com',
      'picsum.photos',
      'via.placeholder.com',
      'images.unsplash.com',
    ];

    if (cdnPatterns.some(cdn => cleanUrl.includes(cdn))) {
      return cleanUrl;
    }

  } catch (e) {
    console.error("Image URL processing error:", e);
  }

  return PLACES_CONFIG.DEFAULT_IMAGE;
};

// Enhanced fetch with retry logic and exponential backoff
const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {}, 
  retryCount = 0
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PLACES_CONFIG.REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok && retryCount < PLACES_CONFIG.RETRY_ATTEMPTS) {
      const delay = PLACES_CONFIG.EXPONENTIAL_BACKOFF 
        ? Math.pow(2, retryCount) * 1000 
        : 1000;
      
      console.warn(`Request failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retryCount < PLACES_CONFIG.RETRY_ATTEMPTS && 
        (error as Error).name !== 'AbortError') {
      const delay = PLACES_CONFIG.EXPONENTIAL_BACKOFF 
        ? Math.pow(2, retryCount) * 1000 
        : 1000;
      
      console.warn(`Request error, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return fetchWithRetry(url, options, retryCount + 1);
    }
    
    throw error;
  }
};

const Places: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState(0);
  const [cacheStats, setCacheStats] = useState<any>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const SHEET_URL = useMemo(() => {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${PLACES_CONFIG.SHEET_ID}/export?format=csv&gid=${PLACES_CONFIG.GID}`;
    return process.env.NODE_ENV === "production"
      ? `${PLACES_CONFIG.CORS_PROXY}${baseUrl}`
      : baseUrl;
  }, []);

  const parseCSV = useCallback((csvText: string): Place[] => {
    try {
      const rows = csvText.split("\n").filter((row) => row.trim());
      if (rows.length < 2) throw new Error("Invalid CSV format");

      const headers = rows[0]
        .split(",")
        .map((col) => col.replace(/^"|"$/g, "").trim().toLowerCase());

      const indices = {
        id: headers.findIndex((col) => ["id_loc", "id"].includes(col)),
        name: headers.findIndex((col) => col === "name"),
        description: headers.findIndex((col) =>
          ["description", "desc"].includes(col)
        ),
        image: headers.findIndex((col) => ["image_url", "image"].includes(col)),
      };

      if (indices.id === -1 || indices.name === -1) {
        throw new Error("Missing required columns (id, name)");
      }

      return rows
        .slice(1)
        .map((row, index) => {
          try {
            const matches = row.match(/("([^"]*)"|([^,]+))(,|$)/g) || [];
            const columns = matches.map((col) =>
              col
                .replace(/(^,)|(,$)/g, "")
                .replace(/^"|"$/g, "")
                .trim()
            );

            const id = columns[indices.id]?.trim();
            const name = columns[indices.name]?.trim();

            if (!id || !name) return null;

            return {
              id,
              name,
              description:
                indices.description !== -1
                  ? columns[indices.description] || ""
                  : "",
              image: getOptimizedImageUrl(columns[indices.image] || ""),
              lastUpdated: Date.now(),
            } as Place;
          } catch (e) {
            console.warn(`Failed to parse row ${index + 2}:`, e);
            return null;
          }
        })
        .filter((place): place is Place => place !== null);
    } catch (error) {
      console.error("CSV parsing error:", error);
      throw new Error("Failed to parse places data");
    }
  }, []);

  const fetchPlaces = useCallback(
    async (forceRefresh = false): Promise<void> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Check cache and rate limiting
        const cachedData = AdvancedPlacesCacheManager.get();
        const stats = AdvancedPlacesCacheManager.getStats();
        setCacheStats(stats);

        // Use cache if valid and we shouldn't refresh
        if (!forceRefresh && 
            AdvancedPlacesCacheManager.isValid(cachedData) &&
            !AdvancedPlacesCacheManager.shouldRefresh(cachedData)) {
          
          setPlaces(cachedData!.places);
          setLoading(false);
          setError(null);
          setLastFetch(cachedData!.timestamp);
          return;
        }

        // Check rate limiting
        if (AdvancedPlacesCacheManager.isRateLimited() && !forceRefresh) {
          if (cachedData?.places.length) {
            setPlaces(cachedData.places);
            setError("Rate limited - using cached data");
            setLastFetch(cachedData.timestamp);
            setLoading(false);
            return;
          }
        }

        setLoading(true);
        setError(null);

        const headers: Record<string, string> = {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        };

        if (cachedData?.etag) {
          headers["If-None-Match"] = cachedData.etag;
        }

        const response = await fetchWithRetry(SHEET_URL, {
          signal: controller.signal,
          headers,
        });

        // Handle 304 Not Modified
        if (response.status === 304 && cachedData) {
          const updatedCache = {
            ...cachedData,
            timestamp: Date.now(),
            requestCount: cachedData.requestCount + 1,
            lastRequestTime: Date.now(),
          };
          AdvancedPlacesCacheManager.set(updatedCache);
          setPlaces(cachedData.places);
          setLastFetch(Date.now());
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();

        if (!csvText.trim()) {
          throw new Error("Empty response from server");
        }

        if (csvText.includes("<!DOCTYPE html")) {
          throw new Error("Sheet not publicly accessible");
        }

        const parsedPlaces = parseCSV(csvText);

        if (parsedPlaces.length === 0) {
          throw new Error("No valid places found");
        }

        // Cache the new data
        const newCacheData: CachedPlacesData = {
          places: parsedPlaces,
          timestamp: Date.now(),
          etag: response.headers.get("etag") || undefined,
          version: PLACES_CONFIG.DATA_VERSION,
          requestCount: 1,
          lastRequestTime: Date.now(),
        };

        AdvancedPlacesCacheManager.set(newCacheData);
        setPlaces(parsedPlaces);
        setLastFetch(Date.now());
        setError(null);
        
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        console.error("Fetch error:", error);

        // Enhanced fallback logic
        const cachedData = AdvancedPlacesCacheManager.get();
        if (cachedData?.places.length) {
          setPlaces(cachedData.places);
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          setError(`Network error - using cached data: ${errorMsg}`);
          setLastFetch(cachedData.timestamp);
        } else {
          const errorMsg = error instanceof Error ? error.message : "Failed to load places";
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [SHEET_URL, parseCSV]
  );

  // Intelligent refresh scheduling
  useEffect(() => {
    fetchPlaces();

    // Set up intelligent refresh interval
    const scheduleNextRefresh = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const stats = AdvancedPlacesCacheManager.getStats();
      let nextInterval = PLACES_CONFIG.REFRESH_INTERVAL;

      // Adjust interval based on rate limiting
      if (stats.isRateLimited) {
        nextInterval = Math.max(
          nextInterval,
          stats.nextRequestAllowed - Date.now()
        );
      }

      intervalRef.current = setInterval(() => {
        fetchPlaces();
        scheduleNextRefresh();
      }, nextInterval);
    };

    scheduleNextRefresh();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPlaces]);

  const handleCardClick = useCallback(
    (place: Place) => {
      navigate(`/places/${place.id}`, { state: { place } });
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    fetchPlaces(true);
  }, [fetchPlaces]);

  const handleClearCache = useCallback(() => {
    AdvancedPlacesCacheManager.clear();
    fetchPlaces(true);
  }, [fetchPlaces]);

  // Loading state
  if (loading && places.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Places</h1>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner} />
          <p>Loading places...</p>
          {cacheStats.isRateLimited && (
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Rate limited - may use cached data
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && places.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Places</h1>
        <div className={styles.error}>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button 
              onClick={handleRefresh} 
              className={styles.retryButton}
              disabled={cacheStats.isRateLimited}
            >
              {cacheStats.isRateLimited ? 'Rate Limited' : 'Try Again'}
            </button>
            <button
              onClick={handleClearCache}
              className={styles.clearCacheButton}
            >
              Clear Cache & Retry
            </button>
          </div>
          {cacheStats.isRateLimited && (
            <p style={{ fontSize: '0.8em', color: '#666', marginTop: '10px' }}>
              Next request allowed: {new Date(cacheStats.nextRequestAllowed).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Places</h1>
        <p className={styles.subtitle}>
          Explore amazing locations and discover their unique projects
        </p>

        <div className={styles.statusBar}>
          <span className={styles.dataStatus}>
            {loading ? (
              <>
                <i className="fas fa-sync fa-spin" /> Refreshing...
              </>
            ) : error ? (
              <>
                <i className="fas fa-exclamation-triangle" /> {cacheStats.isRateLimited ? 'Rate Limited' : 'Using cached data'}
              </>
            ) : (
              <>
                <i className="fas fa-check-circle" /> Data up to date
              </>
            )}
          </span>
          <span className={styles.lastUpdate}>
            Last updated: {new Date(lastFetch).toLocaleTimeString()}
          </span>
          <div className={styles.headerActions}>
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              title="Refresh data"
              disabled={cacheStats.isRateLimited}
            >
              <i className="fas fa-refresh" />
            </button>
            <button
              onClick={handleClearCache}
              className={styles.clearCacheButton}
              title="Clear cache"
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>

        <div className={styles.statsBar}>
          <span className={styles.resultsCount}>
            {places.length} {places.length === 1 ? "place" : "places"} available
          </span>
          {cacheStats.requestsThisHour > 0 && (
            <span className={styles.requestCount}>
              {cacheStats.requestsThisHour}/{PLACES_CONFIG.MAX_REQUESTS_PER_HOUR} requests this hour
            </span>
          )}
        </div>
      </div>

      <div className={styles.placesGrid}>
        {places.map((place, index) => (
          <div
            key={`${place.id}-${place.lastUpdated}`}
            className={styles.placeCard}
            onClick={() => handleCardClick(place)}
          >
            <div className={styles.imageContainer}>
              <OptimizedImage
                src={place.image}
                alt={place.name}
                className={styles.placeImage}
                loadingDelay={index * PLACES_CONFIG.STAGGER_DELAY}
                loadingClassName={styles.imageLoading}
                aspectRatio={16 / 9}
                objectFit="cover"
                fetchPriority={index < 6 ? "high" : "low"}
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4="
                fadeInDuration={200}
              />
            </div>
            <div className={styles.contentContainer}>
              <div className={styles.placeHeader}>
                <h2>{place.name}</h2>
              </div>
              {place.description && (
                <p className={styles.description}>{place.description}</p>
              )}
              <div className={styles.viewMore}>
                <span>Explore Projects</span>
                <i className="fas fa-arrow-right" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Places;
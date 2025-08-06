import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import OptimizedImage from "../common/OptimizedImage";

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  imageUrl: string;
  active: number; // 1 for active, 0 for inactive
  lastUpdated?: number;
}

interface CachedData {
  companies: Company[];
  timestamp: number;
  etag?: string;
  version: string;
}

interface FetchState {
  loading: boolean;
  error: string | null;
  lastFetch: number;
  retryCount: number;
}

// Configuration constants
const CONFIG = {
  DEFAULT_LOGO: "https://placehold.co/800x600?text=Image+Not+Found",
  CORS_PROXY: "https://corsproxy.io/?",
  CACHE_KEY: "companies_cache_v2",
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  REFRESH_INTERVAL: 2 * 60 * 1000, // 2 minutes
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  DEBOUNCE_DELAY: 300,
  STAGGER_DELAY: 100,
  DATA_VERSION: "2.0",
} as const;

const COMPANIES_SHEET_URL = process.env.NODE_ENV === "production"
  ? `${CONFIG.CORS_PROXY}https://docs.google.com/spreadsheets/d/1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM/export?format=csv`
  : `https://docs.google.com/spreadsheets/d/1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM/export?format=csv`;

// Enhanced cache management
class CacheManager {
  static set(key: string, data: CachedData): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      // Fallback to sessionStorage
      try {
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch (sessionError) {
        console.warn('Failed to save to sessionStorage:', sessionError);
      }
    }
  }

  static get(key: string): CachedData | null {
    try {
      const data = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!data) return null;
      
      const parsed = JSON.parse(data) as CachedData;
      
      // Check version compatibility
      if (parsed.version !== CONFIG.DATA_VERSION) {
        this.clear(key);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.warn('Failed to read from storage:', error);
      this.clear(key);
      return null;
    }
  }

  static clear(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  static isCacheValid(cachedData: CachedData | null): boolean {
    if (!cachedData) return false;
    return Date.now() - cachedData.timestamp < CONFIG.CACHE_DURATION;
  }
}

// Enhanced URL processing with better error handling
const getDirectImageUrl = (url: string): string => {
  if (!url) return CONFIG.DEFAULT_LOGO;

  try {
    // Handle Google Drive URLs
    if (url.includes("drive.google.com")) {
      let fileId = "";
      
      if (url.includes("/file/d/")) {
        fileId = url.split("/file/d/")[1].split("/")[0];
      } else if (url.includes("id=")) {
        fileId = url.split("id=")[1].split("&")[0];
      }
      
      if (fileId) {
        const cacheBuster = Date.now() % 10000;
        return `https://lh3.googleusercontent.com/d/${fileId}?cache=${cacheBuster}`;
      }
    }

    // Handle direct image URLs
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
      return url;
    }

    // Handle data URLs
    if (url.startsWith('data:image/')) {
      return url;
    }

    // Handle relative URLs
    if (url.startsWith('/') || url.startsWith('./')) {
      return url;
    }

  } catch (error) {
    console.warn('Image URL processing error:', error);
  }
  
  return CONFIG.DEFAULT_LOGO;
};

// Enhanced CSV parser with better error handling
const parseCSV = (csvText: string): Company[] => {
  try {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Invalid CSV format');

    const headers = lines[0]
      .split(',')
      .map(col => col.replace(/^"|"$/g, '').trim().toLowerCase());

    const activeIndex = headers.findIndex(col => 
      ['active', 'status', 'enabled', 'visible'].includes(col)
    );

    return lines.slice(1)
      .map((line, index) => {
        try {
          // Enhanced CSV parsing to handle quoted fields with commas
          const fields: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          
          // Add the last field
          fields.push(current.trim().replace(/^"|"$/g, ''));

          // Validate required fields
          if (!fields[0] || !fields[1]) return null;

          const id = parseInt(fields[0], 10);
          if (isNaN(id)) return null;

          const activeValue = activeIndex !== -1 && fields[activeIndex] 
            ? fields[activeIndex] 
            : '1';

          return {
            id,
            name: fields[1] || '',
            description: fields[2] || '',
            website: fields[3] || '',
            imageUrl: getDirectImageUrl(fields[4] || ''),
            active: ['1', 'true', 'active', 'yes', 'enabled'].includes(
              activeValue.toLowerCase()
            ) ? 1 : 0,
            lastUpdated: Date.now(),
          } as Company;

        } catch (error) {
          console.warn(`Failed to parse CSV row ${index + 2}:`, error);
          return null;
        }
      })
      .filter((company): company is Company => company !== null);

  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error('Failed to parse company data');
  }
};

// Enhanced loading skeleton with better animation
const LoadingSkeleton = React.memo(() => (
  <div className={styles.skeletonGrid}>
    {Array.from({ length: 6 }, (_, i) => (
      <div 
        key={i} 
        className={styles.skeletonCard}
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className={styles.skeletonImage} />
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} style={{ width: '70%' }} />
          <div className={styles.skeletonButton} />
        </div>
      </div>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>({
    loading: true,
    error: null,
    lastFetch: 0,
    retryCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "active" | "none">("none");
  const [showInactive, setShowInactive] = useState(true);

  // Refs for cleanup and optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, CONFIG.DEBOUNCE_DELAY);

  // Enhanced data fetching with caching and retry logic
  const fetchCompaniesData = useCallback(async (forceRefresh = false): Promise<void> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Check cache first
      const cachedData = CacheManager.get(CONFIG.CACHE_KEY);
      
      if (!forceRefresh && CacheManager.isCacheValid(cachedData)) {
        setCompanies(cachedData!.companies);
        setFetchState(prev => ({
          ...prev,
          loading: false,
          error: null,
          lastFetch: cachedData!.timestamp,
        }));
        return;
      }

      // Set loading state
      setFetchState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch fresh data
      const headers: Record<string, string> = {};
      if (cachedData?.etag) {
        headers['If-None-Match'] = cachedData.etag;
      }

      const response = await fetch(COMPANIES_SHEET_URL, {
        signal: controller.signal,
        headers,
        cache: 'no-store',
      });

      if (response.status === 304) {
        // Data unchanged, use cache
        if (cachedData) {
          const updatedCache = {
            ...cachedData,
            timestamp: Date.now(),
          };
          CacheManager.set(CONFIG.CACHE_KEY, updatedCache);
          setCompanies(cachedData.companies);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const parsedCompanies = parseCSV(csvText);

      if (parsedCompanies.length === 0) {
        throw new Error('No valid company data found');
      }

      // Cache the new data
      const newCacheData: CachedData = {
        companies: parsedCompanies,
        timestamp: Date.now(),
        etag: response.headers.get('etag') || undefined,
        version: CONFIG.DATA_VERSION,
      };

      CacheManager.set(CONFIG.CACHE_KEY, newCacheData);
      setCompanies(parsedCompanies);
      
      setFetchState(prev => ({
        ...prev,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        retryCount: 0,
      }));

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }

      console.error('Data fetching error:', error);
      
      // Use cached data if available on error
      const cachedData = CacheManager.get(CONFIG.CACHE_KEY);
      if (cachedData && cachedData.companies.length > 0) {
        setCompanies(cachedData.companies);
        setFetchState(prev => ({
          ...prev,
          loading: false,
          error: 'Using cached data - refresh failed',
          lastFetch: cachedData.timestamp,
        }));
      } else {
        setFetchState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          retryCount: prev.retryCount + 1,
        }));
      }
    }
  }, []);

  // Retry with exponential backoff
  const retryFetch = useCallback(() => {
    const delay = CONFIG.RETRY_DELAY * Math.pow(2, fetchState.retryCount);
    
    retryTimeoutRef.current = setTimeout(() => {
      if (fetchState.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        fetchCompaniesData();
      }
    }, delay);
  }, [fetchCompaniesData, fetchState.retryCount]);

  // Initial data load
  useEffect(() => {
    fetchCompaniesData();

    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      fetchCompaniesData();
    }, CONFIG.REFRESH_INTERVAL);

    return () => {
      // Cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchCompaniesData]);

  // Enhanced filtering and sorting
  const processedCompanies = useMemo(() => {
    let result = [...companies];

    // Filter by active status
    if (!showInactive) {
      result = result.filter(company => company.active === 1);
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase().trim();
      result = result.filter(company =>
        company.name.toLowerCase().includes(term) ||
        company.description.toLowerCase().includes(term) ||
        company.website.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "active":
        result.sort((a, b) => b.active - a.active);
        break;
      default:
        // Keep original order
        break;
    }

    return result;
  }, [companies, debouncedSearchTerm, sortBy, showInactive]);

  // Update filtered companies when processed companies change
  useEffect(() => {
    setFilteredCompanies(processedCompanies);
  }, [processedCompanies]);

  // Handle card click with enhanced navigation
  const handleCardClick = useCallback((company: Company) => {
    navigate(`/product/${company.id}`, {
      state: {
        id: company.id,
        companyName: company.name,
        companyData: company,
      },
    });
  }, [navigate]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    fetchCompaniesData(true);
  }, [fetchCompaniesData]);

  // Clear cache handler
  const handleClearCache = useCallback(() => {
    CacheManager.clear(CONFIG.CACHE_KEY);
    fetchCompaniesData(true);
  }, [fetchCompaniesData]);

  // Loading state
  if (fetchState.loading && companies.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Leading Real Estate Companies in Egypt</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state (only when no cached data)
  if (fetchState.error && companies.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Unable to Load Data</h2>
          <p>{fetchState.error}</p>
          <div className={styles.errorActions}>
            <button onClick={handleRefresh} className={styles.retryButton}>
              Try Again
            </button>
            <button onClick={handleClearCache} className={styles.clearCacheButton}>
              Clear Cache & Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Leading Real Estate Companies in Egypt</h1>
        <p className={styles.subtitle}>
          Discover the finest real estate developers and their exceptional projects
        </p>
        
        {/* Status indicator */}
        <div className={styles.statusBar}>
          <span className={styles.dataStatus}>
            {fetchState.loading ? (
              <><i className="fas fa-sync fa-spin" /> Refreshing...</>
            ) : fetchState.error ? (
              <><i className="fas fa-exclamation-triangle" /> Using cached data</>
            ) : (
              <><i className="fas fa-check-circle" /> Data up to date</>
            )}
          </span>
          <span className={styles.lastUpdate}>
            Last updated: {new Date(fetchState.lastFetch).toLocaleTimeString()}
          </span>
          <button onClick={handleRefresh} className={styles.refreshButton} title="Refresh data">
            <i className="fas fa-refresh" />
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <i className="fas fa-search" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className={styles.clearSearch}
              title="Clear search"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        <div className={styles.filterControls}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={styles.sortSelect}
          >
            <option value="none">Sort by...</option>
            <option value="name">Company Name</option>
            <option value="active">Active Status</option>
          </select>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive companies
          </label>
        </div>

        <div className={styles.resultsInfo}>
          Showing {filteredCompanies.length} of {companies.length} companies
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className={styles.noResults}>
          <i className="fas fa-search" />
          <h2>No companies found</h2>
          <p>Try adjusting your search criteria or filters</p>
          {debouncedSearchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className={styles.clearSearchButton}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className={styles.companiesGrid}>
          {filteredCompanies.map((company, index) => (
            <div
              key={`${company.id}-${company.lastUpdated}`}
              className={`${styles.companyCard} ${
                company.active === 0 ? styles.inactiveCompany : ""
              }`}
              onClick={() => handleCardClick(company)}
            >
              <div className={styles.imageContainer}>
                <OptimizedImage
                  src={company.imageUrl}
                  alt={`${company.name} logo`}
                  className={styles.companyImage}
                  loadingDelay={index * CONFIG.STAGGER_DELAY}
                  loadingClassName={styles.imageLoading}
                  fallbackSrc={CONFIG.DEFAULT_LOGO}
                  aspectRatio={16/9}
                  objectFit="contain"
                  decoding="async"
                  fetchPriority={index < 4 ? 'high' : 'low'}
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4="
                />
                {company.active === 0 && (
                  <div className={styles.unavailableBadge}>
                    Currently Unavailable
                  </div>
                )}
              </div>
              
              <div className={styles.contentContainer}>
                <div className={styles.companyHeader}>
                  <h2>{company.name}</h2>
                  {company.active === 1 && (
                    <span className={styles.activeBadge}>Active</span>
                  )}
                </div>
                <p className={styles.description}>
                  {company.description || "No description available"}
                </p>
                {company.website && (
                  <p className={styles.website}>
                    <i className="fas fa-globe" />
                    {new URL(company.website).hostname}
                  </p>
                )}
                <div className={styles.viewMore}>
                  <span>View Details</span>
                  <i className="fas fa-arrow-right" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./Places.module.css";
import OptimizedImage from "../common/OptimizedImage";

interface Project {
  id: string;
  id_loc: string;
  name: string;
  image: string;
  description?: string;
  companyId: string;
}

interface CachedProjectsData {
  projects: Record<string, Project[]>; // Keyed by location ID
  timestamp: number;
  etag?: string;
  version: string;
  requestCount: number;
  lastRequestTime: number;
  locationNames: Record<string, string>; // Cache location names
}

// Enhanced configuration for high-traffic optimization
const PROJECTS_CONFIG = {
  SHEET_ID: "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM",
  CORS_PROXY: "https://corsproxy.io/?",
  DATA_SHEET_GID: "1884577336",
  ALTERNATIVE_GIDS: ["0", "1977229403", "658730705", "123456789"],
  CACHE_KEY: "projects_cache_v2",
  CACHE_DURATION: 45 * 60 * 1000, // 45 minutes - longer for projects
  DATA_VERSION: "2.0",
  // High-traffic optimizations
  MIN_REQUEST_INTERVAL: 10 * 60 * 1000, // 10 minutes between requests
  MAX_REQUESTS_PER_HOUR: 6, // Fewer requests for project data
  FALLBACK_CACHE_DURATION: 48 * 60 * 60 * 1000, // 48 hours fallback
  REQUEST_TIMEOUT: 20000, // 20 seconds timeout
  RETRY_ATTEMPTS: 3,
  EXPONENTIAL_BACKOFF: true,
  DEFAULT_IMAGE: "https://placehold.co/800x600?text=No+Image",
} as const;

// Advanced cache manager for projects with location-based caching
class AdvancedProjectsCacheManager {
  private static readonly STORAGE_KEYS = {
    cache: PROJECTS_CONFIG.CACHE_KEY,
    requestLog: `${PROJECTS_CONFIG.CACHE_KEY}_requests`,
    metadata: `${PROJECTS_CONFIG.CACHE_KEY}_metadata`,
  };

  static set(data: CachedProjectsData): void {
    const storageData = {
      ...data,
      requestCount: this.getRequestCount() + 1,
      lastRequestTime: Date.now(),
    };

    try {
      // Compress data before storing
      const compressed = this.compressData(storageData);
      localStorage.setItem(this.STORAGE_KEYS.cache, compressed);
      this.logRequest();
    } catch (e) {
      try {
        // Fallback with basic compression
        const basicCompressed = JSON.stringify(storageData);
        sessionStorage.setItem(this.STORAGE_KEYS.cache, basicCompressed);
        console.warn("Using sessionStorage as fallback");
      } catch (e2) {
        console.error("Both storage methods failed", e2);
      }
    }
  }

  static get(): CachedProjectsData | null {
    try {
      let data = localStorage.getItem(this.STORAGE_KEYS.cache) ||
                sessionStorage.getItem(this.STORAGE_KEYS.cache);
      
      if (!data) return null;

      // Try to decompress, fallback to direct parse
      let parsed: CachedProjectsData;
      try {
        parsed = this.decompressData(data);
      } catch {
        parsed = JSON.parse(data) as CachedProjectsData;
      }
      
      if (parsed.version !== PROJECTS_CONFIG.DATA_VERSION) {
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

  static getForLocation(locationId: string): Project[] {
    const data = this.get();
    return data?.projects[locationId] || [];
  }

  static cacheLocationData(locationId: string, projects: Project[], locationName?: string): void {
    const existingData = this.get() || {
      projects: {},
      timestamp: Date.now(),
      version: PROJECTS_CONFIG.DATA_VERSION,
      requestCount: 0,
      lastRequestTime: Date.now(),
      locationNames: {},
    };

    existingData.projects[locationId] = projects;
    existingData.timestamp = Date.now();
    
    if (locationName) {
      existingData.locationNames[locationId] = locationName;
    }

    this.set(existingData);
  }

  static getLocationName(locationId: string): string | null {
    const data = this.get();
    return data?.locationNames[locationId] || null;
  }

  private static compressData(data: CachedProjectsData): string {
    // Simple compression by removing redundant spaces and shortening keys
    const compressed = {
      p: data.projects,
      t: data.timestamp,
      e: data.etag,
      v: data.version,
      rc: data.requestCount,
      lrt: data.lastRequestTime,
      ln: data.locationNames,
    };
    return JSON.stringify(compressed);
  }

  private static decompressData(compressedData: string): CachedProjectsData {
    const compressed = JSON.parse(compressedData);
    
    // Handle both compressed and uncompressed formats
    if (compressed.projects) {
      return compressed as CachedProjectsData; // Already uncompressed
    }
    
    return {
      projects: compressed.p || {},
      timestamp: compressed.t || 0,
      etag: compressed.e,
      version: compressed.v || PROJECTS_CONFIG.DATA_VERSION,
      requestCount: compressed.rc || 0,
      lastRequestTime: compressed.lrt || 0,
      locationNames: compressed.ln || {},
    };
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

  static isValid(data: CachedProjectsData | null, locationId?: string): boolean {
    if (!data) return false;
    
    const now = Date.now();
    const cacheAge = now - data.timestamp;
    
    // Check if specific location data exists and is not empty
    if (locationId && (!data.projects[locationId] || data.projects[locationId].length === 0)) {
      return false;
    }
    
    // Use fallback duration if we're hitting rate limits
    if (this.isRateLimited()) {
      return cacheAge < PROJECTS_CONFIG.FALLBACK_CACHE_DURATION;
    }
    
    return cacheAge < PROJECTS_CONFIG.CACHE_DURATION;
  }

  static shouldRefresh(data: CachedProjectsData | null): boolean {
    if (!data) return true;
    if (this.isRateLimited()) return false;
    
    const now = Date.now();
    const timeSinceLastRequest = now - (data.lastRequestTime || 0);
    
    return timeSinceLastRequest > PROJECTS_CONFIG.MIN_REQUEST_INTERVAL;
  }

  private static logRequest(): void {
    try {
      const requests = this.getRequestLog();
      const now = Date.now();
      
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
    return this.getRequestCount() >= PROJECTS_CONFIG.MAX_REQUESTS_PER_HOUR;
  }

  static getNextAllowedRequestTime(): number {
    if (!this.isRateLimited()) return 0;
    
    const requests = this.getRequestLog();
    const oldestRequest = Math.min(...requests);
    return oldestRequest + 60 * 60 * 1000;
  }

  static getStats() {
    const data = this.get();
    const requestCount = this.getRequestCount();
    
    return {
      cacheSize: data ? JSON.stringify(data).length : 0,
      totalLocations: data ? Object.keys(data.projects).length : 0,
      totalProjects: data ? Object.values(data.projects).reduce((sum, projects) => sum + projects.length, 0) : 0,
      lastUpdate: data?.timestamp || 0,
      requestsThisHour: requestCount,
      isRateLimited: this.isRateLimited(),
      nextRequestAllowed: this.getNextAllowedRequestTime(),
    };
  }

  // Clean old location data to prevent cache bloat
  static cleanOldLocationData(keepRecentCount = 50): void {
    const data = this.get();
    if (!data) return;

    const locationEntries = Object.entries(data.projects);
    if (locationEntries.length <= keepRecentCount) return;

    // Sort by last access (this is simplified - in a real app you might track access times)
    const sortedEntries = locationEntries.slice(-keepRecentCount);
    
    data.projects = Object.fromEntries(sortedEntries);
    this.set(data);
  }
}

// Enhanced image URL processing with better error handling
const getOptimizedImageUrl = (url: string): string => {
  if (!url?.trim()) return PROJECTS_CONFIG.DEFAULT_IMAGE;

  try {
    const cleanUrl = url.trim();

    if (cleanUrl.includes("drive.google.com")) {
      let fileId = "";
      
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
        // Multiple fallback URLs for Google Drive
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h600`;
      }
    }

    // Direct image URLs
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(cleanUrl)) {
      return cleanUrl;
    }

    // Known image hosting services
    const imageHosts = [
      'imgur.com', 'cloudinary.com', 'amazonaws.com', 'unsplash.com',
      'picsum.photos', 'via.placeholder.com', 'images.unsplash.com'
    ];

    if (imageHosts.some(host => cleanUrl.includes(host))) {
      return cleanUrl;
    }

    // If it starts with http, assume it might be an image
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }

  } catch (e) {
    console.error("Image URL processing error:", e);
  }

  return PROJECTS_CONFIG.DEFAULT_IMAGE;
};

// Enhanced fetch with better retry logic
const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {}, 
  retryCount = 0
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROJECTS_CONFIG.REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok && retryCount < PROJECTS_CONFIG.RETRY_ATTEMPTS) {
      // Different delays for different error types
      let delay = 1000;
      if (PROJECTS_CONFIG.EXPONENTIAL_BACKOFF) {
        delay = Math.pow(2, retryCount) * 1000;
      }
      
      // Longer delay for rate limiting
      if (response.status === 429) {
        delay = Math.max(delay, 5000);
      }
      
      console.warn(`Request failed (${response.status}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retryCount < PROJECTS_CONFIG.RETRY_ATTEMPTS && 
        (error as Error).name !== 'AbortError') {
      
      let delay = 1000;
      if (PROJECTS_CONFIG.EXPONENTIAL_BACKOFF) {
        delay = Math.pow(2, retryCount) * 1000;
      }
      
      console.warn(`Request error, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return fetchWithRetry(url, options, retryCount + 1);
    }
    
    throw error;
  }
};

// Enhanced CSV parser with better error handling
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  try {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Skip the next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip the \n in \r\n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell)) {
          rows.push([...currentRow]); // Create a copy
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }

    // Handle last row
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell)) {
        rows.push(currentRow);
      }
    }

    return rows;
  } catch (error) {
    console.error("CSV parsing error:", error);
    throw new Error("Failed to parse CSV data");
  }
};

const LocationProjects: React.FC = () => {
  const { id_loc } = useParams<{ id_loc: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string>("");
  const [cacheStats, setCacheStats] = useState<any>({});

  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate URLs with fallbacks
  const SHEET_URLS = useMemo(() => {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${PROJECTS_CONFIG.SHEET_ID}/export?format=csv&gid=`;
    const corsProxy = PROJECTS_CONFIG.CORS_PROXY;
    
    const urls = [PROJECTS_CONFIG.DATA_SHEET_GID, ...PROJECTS_CONFIG.ALTERNATIVE_GIDS].map(gid => {
      const fullUrl = baseUrl + gid;
      return process.env.NODE_ENV === "production" ? corsProxy + fullUrl : fullUrl;
    });
    
    return urls;
  }, []);

  const PUBLIC_SHEET_URL = useMemo(() => 
    `https://docs.google.com/spreadsheets/d/${PROJECTS_CONFIG.SHEET_ID}/edit?usp=sharing`,
    []
  );

  const fetchProjects = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!id_loc) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Check cache first
      const cachedData = AdvancedProjectsCacheManager.get();
      const stats = AdvancedProjectsCacheManager.getStats();
      setCacheStats(stats);

      // Use cached data if valid and not forcing refresh
      if (!forceRefresh && 
          AdvancedProjectsCacheManager.isValid(cachedData, id_loc) &&
          !AdvancedProjectsCacheManager.shouldRefresh(cachedData)) {
        
        const cachedProjects = AdvancedProjectsCacheManager.getForLocation(id_loc);
        setProjects(cachedProjects);
        setLoading(false);
        setError(null);
        
        // Set cached location name if available
        const cachedName = AdvancedProjectsCacheManager.getLocationName(id_loc);
        if (cachedName) setPlaceName(cachedName);
        
        return;
      }

      // Check rate limiting
      if (AdvancedProjectsCacheManager.isRateLimited() && !forceRefresh) {
        const cachedProjects = AdvancedProjectsCacheManager.getForLocation(id_loc);
        if (cachedProjects.length > 0) {
          setProjects(cachedProjects);
          setError("Rate limited - using cached data");
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      let csvText = "";
      let lastError: Error | null = null;

      // Try multiple URLs
      for (const url of SHEET_URLS) {
        try {
          const response = await fetchWithRetry(url, {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            }
          });

          if (response.ok) {
            csvText = await response.text();
            break;
          } else {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (fetchError) {
          lastError = fetchError as Error;
          continue;
        }
      }

      if (!csvText) {
        throw new Error(
          `All URL attempts failed. Last error: ${lastError?.message || 'Unknown'}. 
          Please check:
          1. Sheet permissions: Visit ${PUBLIC_SHEET_URL}
          2. Make sure sheet is publicly viewable
          3. Verify the "data" sheet exists
          4. Check if you're using the correct sheet ID`
        );
      }

      // Validate CSV content
      if (!csvText || csvText.trim() === "") {
        throw new Error("Empty CSV response - check if sheet exists and is accessible");
      }

      if (csvText.includes("<!DOCTYPE html")) {
        throw new Error(
          `Received HTML instead of CSV - sheet may not be publicly accessible. 
          Please visit: ${PUBLIC_SHEET_URL}`
        );
      }

      if (csvText.includes("400. That's an error")) {
        throw new Error("Sheet access denied. Please make sure the sheet is publicly viewable");
      }

      // Parse CSV
      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        throw new Error("Empty CSV data");
      }

      const header = rows[0].map((col: string) =>
        col.toLowerCase().replace(/"/g, "").trim()
      );

      // Find column indices
      const columnIndices = {
        companyId: header.findIndex(col =>
          col === "id" || col === "company_id" || col.includes("company")
        ),
        projectId: header.findIndex(col =>
          col === "project_id" || (col.includes("project") && col.includes("id"))
        ),
        name: header.findIndex(col =>
          col === "name" || col === "title" || col === "project_name"
        ),
        description: header.findIndex(col =>
          col === "description" || col === "desc" || col.includes("detail") ||
          col === "key_features" || col.includes("feature")
        ),
        image: header.findIndex(col =>
          col === "image_url" || col === "image" || col === "image_path" ||
          col.includes("photo") || col.includes("pic") || col.includes("img")
        ),
        idLoc: header.findIndex(col =>
          col === "id_loc" || col === "location_id" || col.includes("loc")
        ),
      };

      if (columnIndices.name === -1 || columnIndices.idLoc === -1) {
        const errorMsg = `Missing required columns! Found headers: ${header.join(", ")}. 
        Need 'name' and 'id_loc' columns.`;
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }

      // Process data rows
      const dataRows = rows.slice(1);
      const filteredProjects: Project[] = [];
      let projectCounter = 1;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length === 0) continue;

        try {
          const maxIndex = Math.max(...Object.values(columnIndices).filter(idx => idx !== -1));
          if (row.length <= maxIndex) continue;

          const getValue = (index: number) => 
            index !== -1 ? row[index]?.trim() || "" : "";

          const rowData = {
            companyId: getValue(columnIndices.companyId),
            projectId: getValue(columnIndices.projectId),
            idLoc: getValue(columnIndices.idLoc),
            name: getValue(columnIndices.name),
            description: getValue(columnIndices.description),
            image: getValue(columnIndices.image),
          };

          // Filter by location and validate required fields
          if (rowData.idLoc === id_loc && rowData.name) {
            const uniqueProjectId = rowData.projectId || 
              (rowData.companyId ? `${rowData.companyId}_${projectCounter}` : `project_${projectCounter}`);

            const project: Project = {
              id: uniqueProjectId,
              id_loc: rowData.idLoc,
              name: rowData.name,
              image: getOptimizedImageUrl(rowData.image),
              description: rowData.description,
              companyId: rowData.companyId,
            };

            filteredProjects.push(project);
            projectCounter++;
          }
        } catch (rowError) {
          console.warn(`Error processing row ${i + 2}:`, rowError);
          continue;
        }
      }

      // Cache the results
      AdvancedProjectsCacheManager.cacheLocationData(id_loc, filteredProjects, placeName);
      
      setProjects(filteredProjects);
      setError(null);

    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      
      console.error("💥 Error fetching projects:", err);

      // Enhanced fallback to cache
      const cachedProjects = AdvancedProjectsCacheManager.getForLocation(id_loc!);
      if (cachedProjects.length > 0) {
        setProjects(cachedProjects);
        setError(`Network error - using cached data: ${(err as Error).message}`);
      } else {
        let errorMessage = "Failed to load projects: ";
        if (err instanceof Error) {
          errorMessage += err.message;
        } else {
          errorMessage += "Unknown error";
        }

        if (errorMessage.includes("400") || errorMessage.includes("HTTP error")) {
          errorMessage += "\n\n🔧 Fix this by:\n1. Open your Google Sheet\n2. Click 'Share' button\n3. Change to 'Anyone with the link can view'\n4. Make sure the 'data' sheet tab exists";
        }

        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [id_loc, SHEET_URLS, PUBLIC_SHEET_URL, placeName]);

  // Initialize data
  useEffect(() => {
    if (location.state && (location.state as any).place) {
      setPlaceName((location.state as any).place.name);
    }

    fetchProjects();

    // Cleanup old cache periodically
    AdvancedProjectsCacheManager.cleanOldLocationData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProjects, location.state]);

  const handleProjectClick = useCallback((project: Project) => {
    const targetUrl = `/projects/${project.companyId}/${project.id}`;
    navigate(targetUrl);
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    fetchProjects(true);
  }, [fetchProjects]);

  const handleClearCache = useCallback(() => {
    AdvancedProjectsCacheManager.clear();
    fetchProjects(true);
  }, [fetchProjects]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <div style={{ marginTop: "16px", color: "#666" }}>
            Loading projects from data sheet...
          </div>
          {cacheStats.isRateLimited && (
            <div style={{ marginTop: "8px", fontSize: "0.9em", color: "#666" }}>
              Rate limited - may use cached data
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        <div className={styles.error}>
          <div style={{ whiteSpace: "pre-line" }}>{error}</div>
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={handleRefresh}
              disabled={cacheStats.isRateLimited}
              style={{
                padding: "8px 16px",
                backgroundColor: cacheStats.isRateLimited ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: cacheStats.isRateLimited ? "not-allowed" : "pointer",
                marginRight: "8px",
              }}
            >
              {cacheStats.isRateLimited ? 'Rate Limited' : 'Try Again'}
            </button>
            <button
              onClick={handleClearCache}
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "8px",
              }}
            >
              Clear Cache & Retry
            </button>
            <a
              href={PUBLIC_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 16px",
                backgroundColor: "#17a2b8",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Check Sheet Access
            </a>
          </div>
          {cacheStats.isRateLimited && (
            <div style={{ fontSize: '0.8em', color: '#666', marginTop: '10px' }}>
              Next request allowed: {new Date(cacheStats.nextRequestAllowed).toLocaleTimeString()}
              <br />
              Requests this hour: {cacheStats.requestsThisHour}/{PROJECTS_CONFIG.MAX_REQUESTS_PER_HOUR}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects in {placeName || id_loc}</h1>
        
        {/* Status bar */}
        <div className={styles.statusBar}>
          <span className={styles.dataStatus}>
            {loading ? (
              <>
                <i className="fas fa-sync fa-spin" /> Loading...
              </>
            ) : error ? (
              <>
                <i className="fas fa-exclamation-triangle" /> {cacheStats.isRateLimited ? 'Rate Limited' : 'Using cached data'}
              </>
            ) : (
              <>
                <i className="fas fa-check-circle" /> Data loaded
              </>
            )}
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

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <span className={styles.resultsCount}>
            {projects.length} {projects.length === 1 ? "project" : "projects"} found
          </span>
          {cacheStats.requestsThisHour > 0 && (
            <span className={styles.requestCount}>
              {cacheStats.requestsThisHour}/{PROJECTS_CONFIG.MAX_REQUESTS_PER_HOUR} requests this hour
            </span>
          )}
        </div>
      </div>

      <div className={
        projects.length === 0
          ? `${styles.placesGrid} ${styles["placesGrid--centered"]}`
          : styles.placesGrid
      }>
        {projects.length === 0 ? (
          <div className={styles.noProjects}>
            <span className={styles.noProjectsIcon}>🏗️</span>
            <div>No projects found for this location.</div>
            <div className={styles.noProjectsSecondary}>
              Please check back later or explore other locations!
            </div>
            <div style={{ fontSize: "0.8em", color: "#999", marginTop: "8px" }}>
              Location ID: {id_loc}
            </div>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={`${project.id}_${index}`}
              className={styles.placeCard}
              onClick={() => handleProjectClick(project)}
            >
              <div className={styles.imageContainer}>
                <OptimizedImage
                  src={project.image}
                  alt={project.name}
                  className={styles.placeImage}
                  loadingDelay={index * 100}
                  loadingClassName={styles.imageLoading}
                  onError={(e) => {
                    console.warn(`Failed to load image for project: ${project.name}`);
                  }}
                />
              </div>
              <div className={styles.contentContainer}>
                <div className={styles.placeHeader}>
                  <h2>{project.name}</h2>
                </div>
                {project.description && (
                  <p className={styles.description}>{project.description}</p>
                )}
                <button
                  className={styles.viewMoreButton}
                  aria-label={`View details for ${project.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project);
                  }}
                >
                  View Details <span>&rarr;</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationProjects;
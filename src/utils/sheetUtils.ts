/**
 * Utilities for fetching and processing Google Sheets data with caching and error handling
 */

import { getFromCache, saveToCache, CACHE_DURATIONS } from './cacheUtils';

// Constants
export const SHEET_ID = process.env.REACT_APP_SHEET_ID || "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
export const CORS_PROXY = process.env.REACT_APP_CORS_PROXY || "https://api.allorigins.win/raw?url=";
// Fallback proxy list (first item is preferred, others are backups)
export const PROXY_LIST = Array.from(new Set([
  "https://api.allorigins.win/raw?url=",
  "https://thingproxy.freeboard.io/fetch/",
  "https://cors-anywhere.herokuapp.com/",
])).filter(Boolean);
// Optional backend base URL - set to empty to disable backend API calls
export const API_URL = ""; // Disabled since my-real-backend.pages.dev is not accessible

// Sheet GIDs - Updated with correct GID for companies
export const SHEET_GIDS = {
  COMPANIES: "1065798889", // Updated to correct GID
  PROJECTS: "1884577336",
  USERS: "1815551767",
  PLACES: "658730705",
};

// Error messages
const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your connection and try again.",
  SERVER: "Server error. Please try again later.",
  EMPTY: "No data available. Please try again later.",
  FORMAT: "Data format error. Please contact support.",
  ACCESS_DENIED: "Access denied. Please make sure the sheet is publicly accessible.",
  TIMEOUT: "Request timed out. Please try again.",
};

/**
 * Get the URL for a Google Sheet
 * @param gid The sheet GID
 * @param format The export format (default: csv)
 * @param proxy The proxy to use
 * @returns The sheet URL
 */
export function getSheetUrl(gid: string, format: 'csv' | 'tq' = 'csv', proxy: string = CORS_PROXY): string {
  // Use a more reliable approach for accessing Google Sheets
  const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  
  // Choose encoding strategy based on proxy service
  if (proxy.includes("corsproxy.io")) {
    // corsproxy.io expects a different format: https://corsproxy.io/?url=...
    return `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`;
  } else if (proxy.includes("cors-anywhere.herokuapp.com")) {
    // cors-anywhere expects direct URL append
    return `${proxy}${baseUrl}`;
  }
  // Default: encode URL for proxies like api.allorigins.win and thingproxy
  return `${proxy}${encodeURIComponent(baseUrl)}`;
}

/**
 * Parse CSV data into rows and columns
 * @param text The CSV text
 * @returns Array of rows, each containing an array of column values
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
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
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell) {
    currentRow.push(currentCell.trim());
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Fetch data from a Google Sheet with caching, retries, and error handling
 * @param sheetType The type of sheet to fetch (companies, projects, users, places)
 * @param cacheDuration How long to cache the data
 * @param format The export format
 * @param maxRetries Maximum number of retry attempts
 * @returns Object with success flag, data (if successful), and error message (if failed)
 */
export async function fetchSheetData(
  sheetType: 'companies' | 'projects' | 'users' | 'places',
  cacheDuration = CACHE_DURATIONS.MEDIUM,
  format: 'csv' | 'tq' = 'csv',
  maxRetries = 3
): Promise<{ success: boolean; data?: string; error?: string }> {
  const cacheKey = `sheet_${sheetType}`;
  
  // Try to get from cache first
  const cachedData = getFromCache<string>(cacheKey);
  if (cachedData) {
    return { success: true, data: cachedData };
  }

  // Map sheet type to GID
  let gid: string;
  switch (sheetType) {
    case 'companies':
      gid = SHEET_GIDS.COMPANIES;
      break;
    case 'projects':
      gid = SHEET_GIDS.PROJECTS;
      break;
    case 'users':
      gid = SHEET_GIDS.USERS;
      break;
    case 'places':
      gid = SHEET_GIDS.PLACES;
      break;
    default:
      return { success: false, error: 'Invalid sheet type' };
  }

  // If not in cache, try server API first, then fall back to direct access if server is not available
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < maxRetries) {
    try {
      let csvData = "";
      let dataFetched = false;

      // First try the server API endpoint (only if API_URL is configured)
      if (API_URL) {
        const url = `${API_URL}/sheets/${sheetType}?format=${format}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for server API

        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            csvData = await response.text();
            dataFetched = true;
          } else {
            console.warn(`Server API returned ${response.status}, falling back to direct access`);
          }
        } catch (error) {
          clearTimeout(timeoutId);
          // If server API fails, fall through to direct access
          console.warn('Server API failed, falling back to direct access:', error);
        }
      }

      // Fall back to direct Google Sheets access if server API didn't work
      if (!dataFetched) {
        let success = false;
        
        // Try each proxy until one works
        for (const proxy of PROXY_LIST) {
          const url = getSheetUrl(gid, format, proxy);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              continue; // try next proxy
            }
            
            csvData = await response.text();
            success = true;
            break;
          } catch (error) {
            clearTimeout(timeoutId);
            // Continue to next proxy
            continue;
          }
        }
        
        if (!success) {
          throw new Error(ERROR_MESSAGES.NETWORK);
        }
      }

      // Validate the response
      if (!csvData || csvData.trim() === "") {
        throw new Error(ERROR_MESSAGES.EMPTY);
      }
      
      if (csvData.includes("<!DOCTYPE html") || csvData.includes("400. That's an error")) {
        throw new Error(ERROR_MESSAGES.ACCESS_DENIED);
      }

      // Cache and return successful result
      saveToCache(cacheKey, csvData, cacheDuration);
      return { success: true, data: csvData };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries++;

      // Add exponential backoff between retries
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
      }
    }
  }

  // If all retries failed, return error
  const errorMessage = lastError?.message || ERROR_MESSAGES.NETWORK;
  return { success: false, error: errorMessage };
}

/**
 * Find column indices from header row
 * @param headerRow The header row
 * @param columnNames Array of possible column names to find
 * @returns The index of the first matching column, or -1 if not found
 */
export function findColumnIndex(headerRow: string[], columnNames: string[]): number {
  const normalizedHeaders = headerRow.map(col => 
    col.toLowerCase().replace(/["']/g, '').trim()
  );
  
  for (const name of columnNames) {
    const index = normalizedHeaders.findIndex(header => 
      header === name.toLowerCase() || header.includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  
  return -1;
}

/**
 * Get a direct image URL from a Google Drive link or other image URL
 * Uses a proxy endpoint to hide the original source
 * @param url The original image URL
 * @returns A proxied image URL
 */
export function getDirectImageUrl(url: string): string {
  if (!url || url.trim() === "") {
    return "https://placehold.co/800x600?text=No+Image";
  }

  try {
    const cleanUrl = url.trim();

    // If already using our proxy format, return as is
    if (cleanUrl.includes("/image-proxy/")) {
      return cleanUrl;
    }

    // Handle Google Drive URLs
    if (cleanUrl.includes("drive.google.com") || cleanUrl.includes("lh3.googleusercontent.com")) {
      let fileId = "";

      if (cleanUrl.includes("/file/d/")) {
        const match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (cleanUrl.includes("id=")) {
        const match = cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (cleanUrl.includes("/d/")) {
        const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      }

      if (fileId) {
        // Use our proxy endpoint to hide Google Drive as the source
        // Add cache buster to prevent caching issues
        const cacheBuster = Date.now() % 1000;
        return `/image-proxy/${fileId}?v=${cacheBuster}`;
      }
    }

    // Handle standard image URLs
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(cleanUrl)) {
      return cleanUrl;
    }

    // Handle known image hosting services
    if (
      cleanUrl.includes("imgur.com") ||
      cleanUrl.includes("cloudinary.com") ||
      cleanUrl.includes("amazonaws.com") ||
      cleanUrl.includes("unsplash.com") ||
      cleanUrl.includes("picsum.photos") ||
      cleanUrl.includes("via.placeholder.com")
    ) {
      return cleanUrl;
    }

    // Handle any other URLs that start with http
    if (cleanUrl.startsWith("http")) {
      return cleanUrl;
    }
  } catch (error) {
    // Silent error handling to prevent crashes
    console.error("Error processing image URL", error);
  }

  return "https://placehold.co/800x600?text=Invalid+URL";
}
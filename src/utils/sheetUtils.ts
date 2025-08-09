/**
 * Utilities for fetching and processing Google Sheets data with caching and error handling
 */

import { getFromCache, saveToCache, CACHE_DURATIONS } from './cacheUtils';

// Constants
export const SHEET_ID = "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";
export const CORS_PROXY = "https://corsproxy.io/?";

// Sheet GIDs
export const SHEET_GIDS = {
  COMPANIES: "0",
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
 * @returns The sheet URL
 */
export function getSheetUrl(gid: string, format: 'csv' | 'tq' = 'csv'): string {
  let baseUrl = '';
  
  if (format === 'tq') {
    baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  } else {
    baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  }
  
  return process.env.NODE_ENV === "production"
    ? `${CORS_PROXY}${baseUrl}`
    : baseUrl;
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
  
  const cacheKey = `sheet_${sheetType}`;
  
  // Try to get from cache first
  const cachedData = getFromCache<string>(cacheKey);
  if (cachedData) {
    return { success: true, data: cachedData };
  }

  // If not in cache, fetch from API
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < maxRetries) {
    try {
      const url = getSheetUrl(gid, format);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMessage = response.status === 403
            ? ERROR_MESSAGES.ACCESS_DENIED
            : `${ERROR_MESSAGES.SERVER} (Status: ${response.status})`;
          throw new Error(errorMessage);
        }

        const csvText = await response.text();

        // Validate the response
        if (!csvText || csvText.trim() === "") {
          throw new Error(ERROR_MESSAGES.EMPTY);
        }

        if (csvText.includes("<!DOCTYPE html")) {
          throw new Error(ERROR_MESSAGES.ACCESS_DENIED);
        }

        if (csvText.includes("400. That's an error")) {
          throw new Error(ERROR_MESSAGES.ACCESS_DENIED);
        }

        // Cache the successful result
        saveToCache(cacheKey, csvText, cacheDuration);

        return { success: true, data: csvText };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
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
 * @param url The original image URL
 * @returns A direct image URL
 */
export function getDirectImageUrl(url: string): string {
  if (!url || url.trim() === "") {
    return "https://placehold.co/800x600?text=No+Image";
  }

  try {
    const cleanUrl = url.trim();

    if (cleanUrl.includes("drive.google.com")) {
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
        // Add cache buster to prevent caching issues
        const cacheBuster = Date.now() % 1000;
        // Use CORS proxy for Google Drive URLs
        return `${CORS_PROXY}https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h600&cb=${cacheBuster}`;
      }
    }

    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(cleanUrl)) {
      return cleanUrl;
    }

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

    if (cleanUrl.startsWith("http")) {
      return cleanUrl;
    }
  } catch (error) {
    // Silent error handling to prevent crashes
  }

  return "https://placehold.co/800x600?text=Invalid+URL";
}
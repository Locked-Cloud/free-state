/**
 * Utilities for fetching and processing Google Sheets data with caching and error handling
 * This version uses the apiService to hide the actual data source
 */

import { getFromCache, saveToCache, CACHE_DURATIONS } from './cacheUtils';
import { fetchSheetData as apiFetchSheetData, getDirectImageUrl as apiGetDirectImageUrl } from './apiService';

// Sheet types for type safety
export const SHEET_TYPES = {
  COMPANIES: 'companies',
  PROJECTS: 'projects',
  USERS: 'users',
  PLACES: 'places',
} as const;

// Error messages
const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your connection and try again.",
  SERVER: "Server error. Please try again later.",
  EMPTY: "No data available. Please try again later.",
  FORMAT: "Data format error. Please contact support.",
  ACCESS_DENIED: "Access denied. Please make sure the sheet is publicly accessible.",
  TIMEOUT: "Request timed out. Please try again.",
};

// No longer need getSheetUrl as we're using the API service

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
 * Fetch data from a sheet with caching, retries, and error handling
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

  // If not in cache, fetch from API
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < maxRetries) {
    try {
      // Use the API service to fetch data
      const result = await apiFetchSheetData(sheetType, format);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      const csvText = result.data;
      
      // Validate the response
      if (!csvText || csvText.trim() === "") {
        throw new Error(ERROR_MESSAGES.EMPTY);
      }

      // Cache the successful result
      saveToCache(cacheKey, csvText, cacheDuration);

      return { success: true, data: csvText };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries++;

      // Add exponential backoff between retries
      if (retries < maxRetries) {
        // Calculate wait time outside of the Promise callback to avoid capturing the changing `retries` variable
        const waitTime = 1000 * 2 ** (retries - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
 * This function now delegates to the apiService to hide the actual image source
 * @param url The original image URL
 * @returns A direct image URL
 */
export function getDirectImageUrl(url: string): string {
  return apiGetDirectImageUrl(url);
}
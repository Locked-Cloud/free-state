/**
 * Centralized data service for fetching and processing Google Sheets data.
 * ALL components should use these functions — never call fetch() directly.
 */

import { getFromCache, saveToCache, CACHE_DURATIONS } from './cacheUtils';
import { getDirectImageUrl } from './imageUtils';
import type { Company, Place, LocationProject } from '../types';

// Re-export types so existing imports don't break
export type { Company };

// Constants
export const SHEET_ID = process.env.REACT_APP_SHEET_ID || "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";

// Sheet GIDs
export const SHEET_GIDS = {
  COMPANIES: "1065798889",
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
 */
export function getSheetUrl(gid: string, format: 'csv' | 'tq' = 'csv'): string {
  if (format === 'tq') {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

/**
 * Robust CSV parser for Google Sheets format.
 * This is the ONLY CSV parser in the project — all components use this.
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

// ──────────────────────────────────────────────
// Centralized Fetch Helpers
// ──────────────────────────────────────────────

/**
 * Core fetch function that handles Google Sheets fetching with caching and retries.
 * All specific fetch functions delegate to this.
 */
async function fetchSheetCSV(
  gid: string,
  cacheKey: string,
  cacheDuration: number = CACHE_DURATIONS.MEDIUM,
  maxRetries: number = 3
): Promise<string> {
  // Try cache first
  const cachedData = getFromCache<string>(cacheKey);
  if (cachedData) return cachedData;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = getSheetUrl(gid, 'csv');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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

      // Cache and return
      saveToCache(cacheKey, csvText, cacheDuration);
      return csvText;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Exponential backoff between retries
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error(ERROR_MESSAGES.NETWORK);
}

// ──────────────────────────────────────────────
// Public API: Typed fetch functions
// ──────────────────────────────────────────────

/**
 * Fetch companies data, parsed and typed.
 */
export async function fetchCompanies(): Promise<Company[]> {
  const cacheKey = 'companies_data';

  // Try parsed cache first
  const cachedCompanies = getFromCache<Company[]>(cacheKey);
  if (cachedCompanies) return cachedCompanies;

  const csvText = await fetchSheetCSV(SHEET_GIDS.COMPANIES, 'sheet_companies_raw');
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error('Invalid data format');
  }

  const headerRow = rows[0].map(col => col.toLowerCase().trim());
  const activeColumnIndex = findColumnIndex(headerRow, ['active', 'status']);

  const companies = rows.slice(1)
    .map(columns => {
      if (columns.length < 5) return null;
      try {
        const imageUrl = getDirectImageUrl(columns[4]);
        let activeValue = '1';
        if (activeColumnIndex !== -1 && columns[activeColumnIndex]) {
          activeValue = columns[activeColumnIndex];
        }
        return {
          id: parseInt(columns[0], 10),
          name: columns[1],
          description: columns[2] || '',
          website: columns[3] || '',
          imageUrl,
          active: parseInt(activeValue || '1'),
        };
      } catch {
        return null;
      }
    })
    .filter((company): company is Company => company !== null);

  saveToCache(cacheKey, companies, CACHE_DURATIONS.MEDIUM);
  return companies;
}

/**
 * Fetch raw sheet data (for login/OTP which need raw CSV).
 */
export async function fetchSheetData(
  sheetType: 'companies' | 'projects' | 'users' | 'places',
  cacheDuration = CACHE_DURATIONS.MEDIUM
): Promise<{ success: boolean; data?: string; error?: string }> {
  let gid: string;
  switch (sheetType) {
    case 'companies': gid = SHEET_GIDS.COMPANIES; break;
    case 'projects': gid = SHEET_GIDS.PROJECTS; break;
    case 'users': gid = SHEET_GIDS.USERS; break;
    case 'places': gid = SHEET_GIDS.PLACES; break;
    default: return { success: false, error: 'Invalid sheet type' };
  }

  try {
    const csvText = await fetchSheetCSV(gid, `sheet_${sheetType}`, cacheDuration);
    return { success: true, data: csvText };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK;
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetch places data, parsed and typed.
 */
export async function fetchPlaces(): Promise<Place[]> {
  const cacheKey = 'places_data';

  const cachedPlaces = getFromCache<Place[]>(cacheKey);
  if (cachedPlaces) return cachedPlaces;

  const csvText = await fetchSheetCSV(SHEET_GIDS.PLACES, 'sheet_places_raw');
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error('Invalid data format');
  }

  const header = rows[0].map(col => col.toLowerCase().trim());
  const idIndex = header.findIndex(col => col === "id_loc" || col === "id");
  const nameIndex = header.findIndex(col => col === "name");
  const descIndex = header.findIndex(col => col === "description");
  const imageIndex = header.findIndex(col => col === "image_url");

  const places = rows.slice(1)
    .map(columns => {
      if (columns[idIndex] && columns[nameIndex]) {
        return {
          id: columns[idIndex],
          name: columns[nameIndex],
          description: descIndex !== -1 ? columns[descIndex] : "",
          image: getDirectImageUrl(columns[imageIndex] || ""),
        };
      }
      return null;
    })
    .filter((place): place is Place => place !== null);

  saveToCache(cacheKey, places, CACHE_DURATIONS.MEDIUM);
  return places;
}

/**
 * Fetch projects for a specific location, parsed and typed.
 */
export async function fetchLocationProjects(locationId: string): Promise<LocationProject[]> {
  const csvText = await fetchSheetCSV(SHEET_GIDS.PROJECTS, 'sheet_projects_raw');
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const header = rows[0].map(col => col.toLowerCase().replace(/"/g, "").trim());

  const companyIdIndex = header.findIndex(col => col === "id" || col === "company_id" || col.includes("company"));
  const projectIdIndex = header.findIndex(col => col === "project_id" || (col.includes("project") && col.includes("id")));
  const nameIndex = header.findIndex(col => col === "name" || col === "title" || col === "project_name");
  const descIndex = header.findIndex(col => col === "description" || col === "desc" || col.includes("detail") || col === "key_features" || col.includes("feature"));
  const imageIndex = header.findIndex(col => col === "image_url" || col === "image" || col === "image_path" || col.includes("photo") || col.includes("pic") || col.includes("img"));
  const idLocIndex = header.findIndex(col => col === "id_loc" || col === "location_id" || col.includes("loc"));

  if (nameIndex === -1 || idLocIndex === -1) {
    throw new Error(`Missing required columns. Found: ${header.join(", ")}. Need 'name' and 'id_loc'.`);
  }

  const projects: LocationProject[] = [];
  let counter = 1;

  for (const row of rows.slice(1)) {
    if (!row || row.length === 0) continue;

    const maxIndex = Math.max(companyIdIndex, projectIdIndex, nameIndex, descIndex, imageIndex, idLocIndex);
    if (row.length <= maxIndex) continue;

    const rowIdLoc = idLocIndex !== -1 ? row[idLocIndex]?.trim() || "" : "";
    const rowName = nameIndex !== -1 ? row[nameIndex]?.trim() || "" : "";

    if (rowIdLoc === locationId && rowName) {
      const companyId = companyIdIndex !== -1 ? row[companyIdIndex]?.trim() || "" : "";
      const projectId = projectIdIndex !== -1 ? row[projectIdIndex]?.trim() || "" : "";
      const rowDesc = descIndex !== -1 ? row[descIndex]?.trim() || "" : "";
      const rowImage = imageIndex !== -1 ? row[imageIndex]?.trim() || "" : "";

      projects.push({
        id: projectId || (companyId ? `${companyId}_${counter}` : `project_${counter}`),
        id_loc: rowIdLoc,
        name: rowName,
        image: getDirectImageUrl(rowImage),
        description: rowDesc,
        companyId,
      });
      counter++;
    }
  }

  return projects;
}

/**
 * Fetch projects sheet CSV for the Product page (company projects).
 */
export async function fetchProjectsCSV(): Promise<string[][]> {
  const csvText = await fetchSheetCSV(SHEET_GIDS.PROJECTS, 'sheet_projects_raw');
  return parseCSV(csvText);
}

/**
 * Fetch companies sheet CSV for the Product page.
 */
export async function fetchCompaniesCSV(): Promise<string[][]> {
  const csvText = await fetchSheetCSV(SHEET_GIDS.COMPANIES, 'sheet_companies_raw');
  return parseCSV(csvText);
}

/**
 * Fetch projects sheet CSV using the tq format (for ProjectDetails).
 */
export async function fetchProjectDetailCSV(): Promise<string[][]> {
  const cacheKey = 'sheet_projects_tq';
  const cachedData = getFromCache<string>(cacheKey);
  
  let csvText: string;
  if (cachedData) {
    csvText = cachedData;
  } else {
    const url = getSheetUrl(SHEET_GIDS.PROJECTS, 'tq');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    csvText = await response.text();
    
    if (!csvText.trim()) {
      throw new Error("No data received from the sheet");
    }
    
    saveToCache(cacheKey, csvText, CACHE_DURATIONS.MEDIUM);
  }
  
  return parseCSV(csvText);
}

// ──────────────────────────────────────────────
// Utility functions
// ──────────────────────────────────────────────

/**
 * Find column indices from header row.
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
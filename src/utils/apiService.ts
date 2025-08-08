/**
 * API Service for interacting with the backend server
 */

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://my-real-backend.pages.dev/api'); // ✅ Replace this with your actual deployed API URL

/**
 * Fetch data from a specific sheet type
 * @param sheetType - The type of sheet to fetch
 * @param format - Export format (csv by default)
 */
export async function fetchSheetData(
  sheetType: 'companies' | 'projects' | 'users' | 'places',
  format: 'csv' | 'tq' = 'csv'
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const url = `${API_BASE_URL}/sheets/${sheetType}?format=${format}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error: ${response.status}`);
    }

    const data = await response.text();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get proxied image URL from backend (Cloudflare image proxy or similar)
 * @param fileId - Google Drive file ID
 */
export function getProxyImageUrl(fileId: string): string {
  if (!fileId) {
    return "https://placehold.co/800x600?text=No+Image";
  }
  return `${API_BASE_URL}/image?fileId=${fileId}`;
}

/**
 * Extracts Google Drive file ID from various drive links
 */
export function extractGoogleDriveFileId(url: string): string {
  if (!url) return "";

  try {
    const cleanUrl = url.trim();
    const match =
      cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      cleanUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
      cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (match) return match[1];

    // Already a raw ID
    if (/^[a-zA-Z0-9_-]{25,}$/.test(cleanUrl)) {
      return cleanUrl;
    }
  } catch (error) {
    console.error("Error extracting file ID:", error);
  }

  return "";
}

/**
 * Converts any image URL (Drive or direct) to a viewable image URL
 */
export function getDirectImageUrl(url: string): string {
  if (!url || url.trim() === "") {
    return "https://placehold.co/800x600?text=No+Image";
  }

  try {
    const cleanUrl = url.trim();

    if (cleanUrl.includes("drive.google.com")) {
      const fileId = extractGoogleDriveFileId(cleanUrl);
      if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    if (cleanUrl.includes("lh3.googleusercontent.com/d/")) {
      return cleanUrl;
    }

    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(cleanUrl)) {
      return cleanUrl;
    }

    const trustedSources = [
      "imgur.com",
      "cloudinary.com",
      "amazonaws.com",
      "unsplash.com",
      "picsum.photos",
      "via.placeholder.com",
      "placehold.co"
    ];

    if (trustedSources.some(source => cleanUrl.includes(source))) {
      return cleanUrl;
    }

    if (cleanUrl.startsWith("http")) {
      return cleanUrl;
    }
  } catch (error) {
    console.error("Error processing image URL:", error, url);
  }

  return "https://placehold.co/800x600?text=Invalid+URL";
}

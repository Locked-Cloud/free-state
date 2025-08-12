/**
 * Utility functions for handling image URLs
 */

/**
 * Ensures all image URLs use HTTPS protocol
 * @param url The original image URL
 * @returns A secure image URL using HTTPS
 */
export function ensureHttps(url: string): string {
  if (!url) return url;
  
  // Already using HTTPS or is a relative URL
  if (url.startsWith('https://') || !url.startsWith('http')) {
    return url;
  }
  
  // Convert HTTP to HTTPS
  if (url.startsWith('http://')) {
    return url.replace(/^http:/i, 'https:');
  }
  
  return url;
}

/**
 * Gets a direct image URL from various sources, ensuring HTTPS is used
 * @param url The original image URL
 * @returns A direct, secure image URL
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
        // Route through backend API via universal proxy to handle permissions and CORS
        const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
        // Decide whether to route through the backend image proxy.
        // When the frontend is hosted on a static platform such as Cloudflare Pages,
        // the Express backend is not available, so we return the direct URL instead.
        const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
        if (API_BASE_URL && !API_BASE_URL.includes('.pages.dev')) {
          return `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(directUrl)}`;
        }
        return directUrl;
      }
    }

    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(cleanUrl)) {
      return ensureHttps(cleanUrl);
    }

    // Common image hosting services
    if (
      cleanUrl.includes("imgur.com") ||
      cleanUrl.includes("cloudinary.com") ||
      cleanUrl.includes("amazonaws.com") ||
      cleanUrl.includes("unsplash.com") ||
      cleanUrl.includes("picsum.photos") ||
      cleanUrl.includes("via.placeholder.com")
    ) {
      return ensureHttps(cleanUrl);
    }

    if (cleanUrl.startsWith("http")) {
      return ensureHttps(cleanUrl);
    }
  } catch (error) {
    // Silent error handling to prevent crashes
    console.error("Image URL processing error:", error);
  }

  return "https://placehold.co/800x600?text=Invalid+URL";
}
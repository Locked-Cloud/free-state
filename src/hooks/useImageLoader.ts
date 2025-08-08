import { useState, useEffect } from "react";

interface ImageLoaderOptions {
  fallbackImage?: string;
  loadingDelay?: number;
}

const DEFAULT_FALLBACK = "https://placehold.co/800x600?text=Image+Not+Found";

/**
 * Custom hook for optimized image loading with error handling
 * @param url The URL of the image to load
 * @param options Configuration options
 * @returns Object containing loading state, error state, and the final image URL
 */
const useImageLoader = (url: string, options: ImageLoaderOptions = {}) => {
  const { fallbackImage = DEFAULT_FALLBACK, loadingDelay = 0 } = options;

  const [imageUrl, setImageUrl] = useState<string>(transformGoogleDriveUrl(url));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!url) {
      setImageUrl(fallbackImage);
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Build a list of candidate URLs (for Google Drive links we will try several patterns)
    const candidates: string[] = buildUrlCandidates(url);
    let currentIndex = 0;

    const attemptLoad = () => {
      if (currentIndex >= candidates.length) {
        // All attempts failed – use fallback
        setImageUrl(fallbackImage);
        setIsLoading(false);
        setHasError(true);
        return;
      }

      const candidateUrl = candidates[currentIndex];
      // Update image while loading so <img> src reflects the attempt
      setImageUrl(candidateUrl);

      const img = new Image();
      img.onload = () => {
        // Successful load
        setImageUrl(candidateUrl);
        setIsLoading(false);
      };
      img.onerror = () => {
        // Try next candidate
        currentIndex += 1;
        attemptLoad();
      };
      img.src = candidateUrl;
    };

    // Optional delay before starting first attempt
    const timer = setTimeout(attemptLoad, loadingDelay);

    return () => clearTimeout(timer);
  }, [url, fallbackImage, loadingDelay]);

  return { imageUrl, isLoading, hasError };
};

export default useImageLoader;


const addCacheBuster = (url: string): string => {
  const cacheParam = `cb=${Date.now() % 100000}`;
  return url.includes("?") ? `${url}&${cacheParam}` : `${url}?${cacheParam}`;
};

// Transform Google Drive links to direct-download URLs

// Transform Google Drive links to a format that works with CORS restrictions
const transformGoogleDriveUrl = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;

  // If already using lh3.googleusercontent.com, just append cache-buster
  if (rawUrl.includes("lh3.googleusercontent.com/d/")) {
    return addCacheBuster(rawUrl);
  }
  
  let fileId = "";
  if (rawUrl.includes("/file/d/")) {
    fileId = rawUrl.split("/file/d/")[1].split("/")[0];
  } else if (rawUrl.includes("id=")) {
    fileId = rawUrl.split("id=")[1].split("&")[0];
  }

  if (!fileId) return rawUrl;

  // Use drive.google.com/thumbnail which has fewer CORS restrictions
  // Size=w1000 provides a reasonably large image that works for most purposes
  return addCacheBuster(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
};

// Build list of URLs to try when loading the image
const buildUrlCandidates = (rawUrl: string): string[] => {
  const list: string[] = [];

  // 1) Preferred thumbnail transformation
  const thumb = transformGoogleDriveUrl(rawUrl);
  if (thumb) list.push(thumb);

  // 2) Direct lh3.googleusercontent.com path if we can extract fileId
  let fileId = "";
  if (rawUrl.includes("/file/d/")) {
    fileId = rawUrl.split("/file/d/")[1].split("/")[0];
  } else if (rawUrl.includes("id=")) {
    fileId = rawUrl.split("id=")[1].split("&")[0];
  }
  if (fileId) {
    list.push(addCacheBuster(`https://lh3.googleusercontent.com/d/${fileId}=w1000`));
  }

  // 3) Original URL (with cache buster) as last resort
  if (rawUrl) {
    list.push(addCacheBuster(rawUrl));
  }

  // Remove duplicates
  return Array.from(new Set(list));
};

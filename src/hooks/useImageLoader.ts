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

  const [imageUrl, setImageUrl] = useState<string>(url);
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

    const transformedUrl = transformGoogleDriveUrl(url);

    // Implement a delay to stagger image loading
    const timer = setTimeout(() => {
      const img = new Image();

      img.onload = () => {
        setImageUrl(transformedUrl);
        setIsLoading(false);
      };

      img.onerror = () => {
        setImageUrl(fallbackImage);
        setIsLoading(false);
        setHasError(true);
      };

      img.src = transformedUrl;
    }, loadingDelay);

    return () => clearTimeout(timer);
  }, [url, fallbackImage, loadingDelay]);

  return { imageUrl, isLoading, hasError };
};

export default useImageLoader;


// Transform Google Drive links to a highly cacheable proxy endpoint to prevent 429 rate limiting
const transformGoogleDriveUrl = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;

  // Prevent double proxying if the URL has already been processed by imageUtils.ts
  if (rawUrl.includes("wsrv.nl")) return rawUrl;

  // We wrap Google Drive images with Weserv to ensure Google doesn't aggressively rate-limit (429) the user's IP.
  // Weserv acts as a fully compliant, high-performance image CDN that masks the IP and aggressively caches.
  if (rawUrl.includes("lh3.googleusercontent.com/d/")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}`;
  }

  let fileId = "";
  if (rawUrl.includes("/file/d/")) {
    const match = rawUrl.split("/file/d/")[1].split("/");
    if (match.length > 0) fileId = match[0];
  } else if (rawUrl.includes("id=")) {
    const match = rawUrl.split("id=")[1].split("&");
    if (match.length > 0) fileId = match[0];
  }

  if (!fileId) return rawUrl;

  const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  return `https://wsrv.nl/?url=${encodeURIComponent(directUrl)}`;
};

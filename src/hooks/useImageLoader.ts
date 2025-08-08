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


const addCacheBuster = (url: string): string => {
  const cacheParam = `cb=${Date.now() % 100000}`;
  return url.includes("?") ? `${url}&${cacheParam}` : `${url}?${cacheParam}`;
};

// Transform Google Drive links (or already transformed lh3 links) to a direct-download endpoint
const transformGoogleDriveUrl = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;

  // If already using lh3.googleusercontent.com or uc?export, just append cache-buster
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

  return addCacheBuster(`https://drive.google.com/uc?export=download&id=${fileId}`);
};

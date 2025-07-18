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

    // Implement a delay to stagger image loading
    const timer = setTimeout(() => {
      const img = new Image();

      img.onload = () => {
        setImageUrl(url);
        setIsLoading(false);
      };

      img.onerror = () => {
        setImageUrl(fallbackImage);
        setIsLoading(false);
        setHasError(true);
      };

      img.src = url;
    }, loadingDelay);

    return () => clearTimeout(timer);
  }, [url, fallbackImage, loadingDelay]);

  return { imageUrl, isLoading, hasError };
};

export default useImageLoader;

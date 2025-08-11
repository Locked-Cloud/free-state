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
  
  // Create IntersectionObserver to load images only when they become visible
  useEffect(() => {
    let observer: IntersectionObserver;
    let timer: NodeJS.Timeout;

    const loadImage = () => {
      if (!url) {
        setImageUrl(fallbackImage);
        setIsLoading(false);
        setHasError(true);
        return;
      }

      const transformedUrl = transformGoogleDriveUrl(url);
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
    };

    // Create observer to detect when image enters viewport
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timer = setTimeout(loadImage, loadingDelay);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' } // Start loading when image is 50px from viewport
    );

    // Start observing the image element
    const imageElement = document.querySelector(`img[src="${url}"]`);
    if (imageElement) {
      observer.observe(imageElement);
    } else {
      // If element not found, load immediately (e.g., for preloading)
      timer = setTimeout(loadImage, loadingDelay);
    }

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [url, fallbackImage, loadingDelay]);



  return { imageUrl, isLoading, hasError };
};

export default useImageLoader;




// Transform Google Drive links (or already transformed lh3 links) to a direct-download endpoint
const transformGoogleDriveUrl = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;

  // If already using lh3.googleusercontent.com, return as is to allow browser caching
  if (rawUrl.includes("lh3.googleusercontent.com/d/")) {
    return rawUrl;
  }

  let fileId = "";
  if (rawUrl.includes("/file/d/")) {
    fileId = rawUrl.split("/file/d/")[1].split("/")[0];
  } else if (rawUrl.includes("id=")) {
    fileId = rawUrl.split("id=")[1].split("&")[0];
  }

  if (!fileId) return rawUrl;

  // Use lh3.googleusercontent.com for direct image access
  return `https://lh3.googleusercontent.com/d/${fileId}`;
};

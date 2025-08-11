import React, { useState, useRef, useEffect } from "react";
import useImageLoader from "../../hooks/useImageLoader";

interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  loadingDelay?: number;
  className?: string;
  loadingClassName?: string;
  priority?: boolean;
  sizes?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = "https://placehold.co/800x600?text=Image+Not+Found",
  loadingDelay = 0,
  className = "",
  loadingClassName = "",
  priority = false,
  sizes = "100vw",
  ...props
}) => {
  // Use our custom hook with staggered loading
  const { imageUrl, isLoading } = useImageLoader(src, {
    fallbackImage: fallbackSrc,
    loadingDelay: loadingDelay,
  });
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Add intersection observer for better performance
  useEffect(() => {
    if (!priority && 'IntersectionObserver' in window && imgRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && imgRef.current) {
              // When image is visible, set fetchPriority to high
              // We've added a type declaration file to support this property
              imgRef.current.fetchPriority = 'high';
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '200px' }
      );
      
      observer.observe(imgRef.current);
      
      return () => {
        if (imgRef.current) observer.unobserve(imgRef.current);
      };
    }
  }, [priority]);

  return (
    <img
      ref={imgRef}
      src={error ? fallbackSrc : imageUrl}
      alt={alt}
      className={`${className} ${isLoading ? loadingClassName : ""}`}
      loading={priority ? undefined : "lazy"}
      onError={() => setError(true)}
      sizes={sizes}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      {...props}
    />
  );
};

export default OptimizedImage;

import React, { useState, useEffect, useRef } from 'react';
import styles from './OptimizedImage.module.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderColor?: string;
  lazyLoad?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderColor = '#f0f0f0',
  lazyLoad = true,
  fallbackSrc,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Function to handle image loading
  const loadImage = () => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      setError(true);
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
      if (onError) onError();
    };
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazyLoad) {
      loadImage();
      return;
    }

    // Reset state when src changes
    setIsLoaded(false);
    setError(false);
    setImageSrc(null);

    if ('IntersectionObserver' in window) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadImage();
          if (observerRef.current && imageRef.current) {
            observerRef.current.unobserve(imageRef.current);
          }
        }
      }, {
        rootMargin: '200px 0px', // Start loading when image is 200px from viewport
        threshold: 0.01
      });

      if (imageRef.current) {
        observerRef.current.observe(imageRef.current);
      }
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      loadImage();
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, lazyLoad]);

  // Generate a placeholder with the correct aspect ratio
  const placeholderStyle = {
    backgroundColor: placeholderColor,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: width && height ? `${width} / ${height}` : undefined
  };

  return (
    <div 
      className={`${styles.imageContainer} ${className}`} 
      style={!isLoaded ? placeholderStyle : undefined}
      ref={imageRef}
    >
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          loading={lazyLoad ? 'lazy' : undefined}
        />
      )}
      {error && !fallbackSrc && (
        <div className={styles.errorContainer}>
          <span className={styles.errorText}>Image failed to load</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
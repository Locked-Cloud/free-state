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
  loadingDelay?: number;
  loadingClassName?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
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
  onError,
  loadingDelay = 0,
  loadingClassName = '',
  priority = false,
  sizes = '100vw',
  quality = 85
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const imageRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to handle image loading
  const loadImage = () => {
    // If there's a loading delay, set a timer
    if (loadingDelay > 0) {
      timerRef.current = setTimeout(() => {
        startImageLoad();
      }, loadingDelay);
    } else {
      startImageLoad();
    }
  };

  // Actual image loading function
  const startImageLoad = () => {
    const img = new Image();
    
    // Add width and height if available to help browser calculate aspect ratio
    if (width) img.width = width;
    if (height) img.height = height;
    
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
    // If priority is true or lazyLoad is false, load immediately
    if (priority || !lazyLoad) {
      loadImage();
      return;
    }

    // Reset state when src changes
    setIsLoaded(false);
    setError(false);
    setImageSrc(null);
    setIsVisible(false);

    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if ('IntersectionObserver' in window) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
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
      setIsVisible(true);
      loadImage();
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      // Clear any existing timers on cleanup
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [src, lazyLoad, priority, loadingDelay]);

  // Generate a placeholder with the correct aspect ratio
  const placeholderStyle = {
    backgroundColor: placeholderColor,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: width && height ? `${width} / ${height}` : undefined
  };

  // Generate srcset for responsive images if width is provided
  const generateSrcSet = () => {
    if (!width || src.includes('placehold.co') || (fallbackSrc && error)) {
      return undefined;
    }
    
    // For Google Drive images (now using our proxy), we don't generate srcset
    if (src.includes('/image-proxy/')) {
      return undefined;
    }
    
    // For standard image URLs that support width parameters
    if (src.includes('unsplash.com') || src.includes('picsum.photos')) {
      const widths = [width/2, width, width*2].map(Math.floor);
      return widths.map(w => `${src.includes('?') ? `${src}&w=${w}` : `${src}?w=${w}`} ${w}w`).join(', ');
    }
    
    return undefined;
  };

  return (
    <div 
      className={`${styles.imageContainer} ${className} ${loadingClassName && !isLoaded ? loadingClassName : ''}`} 
      style={!isLoaded ? placeholderStyle : undefined}
      ref={imageRef}
      data-loaded={isLoaded}
      data-error={error}
    >
      {(imageSrc && isVisible) && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          loading={lazyLoad && !priority ? 'lazy' : undefined}
          srcSet={generateSrcSet()}
          sizes={sizes}
          decoding={priority ? 'sync' : 'async'}
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
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  ImgHTMLAttributes,
} from "react";
import useImageLoader from "../../hooks/useImageLoader";

// Enhanced interfaces
interface ImageSource {
  src: string;
  media?: string;
  sizes?: string;
  type?: string;
}

interface LoadingState {
  isLoading: boolean;
  progress?: number;
  error?: string | null;
}

interface OptimizedImageProps
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "onError" | "onProgress"
  > {
  // Core image props
  src: string | ImageSource[];
  alt: string;

  // Fallback and error handling
  fallbackSrc?: string;
  fallbackComponent?: React.ComponentType<{ error?: string }>;
  retryAttempts?: number;
  retryDelay?: number;

  // Loading behavior
  loadingDelay?: number;
  preload?: boolean;
  priority?: "high" | "normal" | "low";
  intersection?: {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
  };

  // Visual enhancements
  blurDataURL?: string;
  aspectRatio?: number;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";

  // Styling
  className?: string;
  loadingClassName?: string;
  errorClassName?: string;
  containerClassName?: string;

  // Animation and transitions
  fadeInDuration?: number;
  scaleOnHover?: boolean;

  // Callbacks
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onProgress?: (progress: number) => void;

  // Performance
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";

  // Accessibility
  role?: string;
  "aria-describedby"?: string;

  // Debug mode
  debug?: boolean;
}

// Default fallback component
const DefaultFallback: React.FC<{ error?: string }> = ({ error }) => (
  <div className="flex items-center justify-center bg-gray-100 text-gray-400 text-sm p-4">
    <div className="text-center">
      <div className="mb-2">📷</div>
      <div>{error || "Image not available"}</div>
    </div>
  </div>
);

// Loading skeleton component
const LoadingSkeleton: React.FC<{
  aspectRatio?: number;
  blurDataURL?: string;
  className?: string;
}> = ({ aspectRatio, blurDataURL, className }) => (
  <div
    className={`animate-pulse bg-gray-200 ${className}`}
    style={{
      aspectRatio: aspectRatio?.toString(),
      backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
      backgroundSize: "cover",
      filter: blurDataURL ? "blur(20px)" : undefined,
    }}
  >
    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
  </div>
);

const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      fallbackSrc = "https://placehold.co/800x600?text=Image+Not+Found",
      fallbackComponent: FallbackComponent = DefaultFallback,
      retryAttempts = 3,
      retryDelay = 1000,
      loadingDelay = 0,
      preload = false,
      priority = "normal",
      intersection = { threshold: 0.1, rootMargin: "50px", triggerOnce: true },
      blurDataURL,
      aspectRatio,
      objectFit = "cover",
      className = "",
      loadingClassName = "",
      errorClassName = "",
      containerClassName = "",
      fadeInDuration = 300,
      scaleOnHover = false,
      onLoad,
      onError,
      onLoadStart,
      onProgress,
      decoding = "async",
      fetchPriority = "auto",
      debug = false,
      ...props
    },
    ref
  ) => {
    // State management
    const [loadingState, setLoadingState] = useState<LoadingState>({
      isLoading: true,
    });
    const [isIntersecting, setIsIntersecting] = useState(
      !intersection || preload
    );
    const [retryCount, setRetryCount] = useState(0);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Memoized source processing
    const processedSrc = useMemo(() => {
      if (typeof src === "string") return src;

      // Handle responsive sources - pick the first one for now
      // In a real implementation, you'd want more sophisticated logic
      return src[0]?.src || fallbackSrc;
    }, [src, fallbackSrc]);

    // Enhanced image loader hook usage
    const {
      imageUrl,
      isLoading: hookLoading,
      hasError: hookError,
    } = useImageLoader(isIntersecting ? processedSrc : "", {
      fallbackImage: fallbackSrc,
      loadingDelay: loadingDelay,
    });

    // Intersection Observer setup
    useEffect(() => {
      if (!intersection || preload) return;

      const options = {
        threshold: intersection.threshold || 0.1,
        rootMargin: intersection.rootMargin || "50px",
      };

      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (intersection.triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      }, options);

      const container = containerRef.current;
      if (container && observerRef.current) {
        observerRef.current.observe(container);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [intersection, preload]);

    // Retry logic
    const handleRetry = useCallback(async () => {
      if (retryCount < retryAttempts) {
        setRetryCount((prev) => prev + 1);
        setLoadingState({ isLoading: true });

        await new Promise((resolve) => setTimeout(resolve, retryDelay));

        // Trigger reload by forcing a re-render
        if (imageRef.current) {
          imageRef.current.src = `${processedSrc}?retry=${retryCount + 1}`;
        }
      }
    }, [retryCount, retryAttempts, retryDelay, processedSrc]);

    // Enhanced error handling
    const handleError = useCallback(
      (error: string) => {
        setLoadingState({ isLoading: false, error });
        onError?.(error);

        if (retryCount < retryAttempts) {
          if (debug)
            console.warn(
              `Image load failed, retrying... (${retryCount + 1}/${retryAttempts})`
            );
          handleRetry();
        } else {
          if (debug)
            console.error(
              `Image load failed after ${retryAttempts} attempts:`,
              error
            );
        }
      },
      [retryCount, retryAttempts, handleRetry, onError, debug]
    );

    // Enhanced load handling
    const handleLoad = useCallback(
      (event: React.SyntheticEvent<HTMLImageElement>) => {
        setLoadingState({ isLoading: false });
        setHasLoaded(true);
        setRetryCount(0); // Reset retry count on success
        onLoad?.(event);

        if (debug) console.log("Image loaded successfully:", processedSrc);
      },
      [onLoad, debug, processedSrc]
    );

    // Loading start handler
    const handleLoadStart = useCallback(() => {
      setLoadingState({ isLoading: true });
      onLoadStart?.();

      if (debug) console.log("Image loading started:", processedSrc);
    }, [onLoadStart, debug, processedSrc]);

    // Preload effect
    useEffect(() => {
      if (preload && processedSrc) {
        const img = new Image();
        img.src = processedSrc;
      }
    }, [preload, processedSrc]);

    // Dynamic styles
    const containerStyles = useMemo(
      () => ({
        position: "relative" as const,
        overflow: "hidden" as const,
        aspectRatio: aspectRatio?.toString(),
        ...(scaleOnHover && {
          transition: "transform 0.3s ease",
          ":hover": { transform: "scale(1.05)" },
        }),
      }),
      [aspectRatio, scaleOnHover]
    );

    const imageStyles = useMemo(
      () => ({
        objectFit,
        transition: hasLoaded
          ? `opacity ${fadeInDuration}ms ease-in-out`
          : "none",
        opacity: hasLoaded ? 1 : 0,
        width: "100%",
        height: "100%",
      }),
      [objectFit, hasLoaded, fadeInDuration]
    );

    // Render loading state
    if (loadingState.isLoading || hookLoading) {
      return (
        <div
          ref={containerRef}
          className={`${containerClassName} relative`}
          style={containerStyles}
        >
          <LoadingSkeleton
            aspectRatio={aspectRatio}
            blurDataURL={blurDataURL}
            className={`${className} ${loadingClassName} w-full h-full`}
          />
          {debug && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Loading... {retryCount > 0 && `(Retry ${retryCount})`}
            </div>
          )}
        </div>
      );
    }

    // Render error state
    if (loadingState.error && retryCount >= retryAttempts) {
      return (
        <div
          ref={containerRef}
          className={`${containerClassName} ${errorClassName}`}
          style={containerStyles}
        >
          <FallbackComponent error={loadingState.error} />
          {debug && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              Error: {loadingState.error}
            </div>
          )}
        </div>
      );
    }

    // Render responsive image
    const renderImage = () => {
      if (Array.isArray(src)) {
        return (
          <picture>
            {src.map((source, index) => (
              <source
                key={index}
                srcSet={source.src}
                media={source.media}
                sizes={source.sizes}
                type={source.type}
              />
            ))}
            <img
              ref={(node) => {
                if (imageRef.current !== node) {
                  imageRef.current = node;
                }
                if (ref) {
                  if (typeof ref === "function") ref(node);
                  else ref.current = node;
                }
              }}
              src={imageUrl}
              alt={alt}
              className={`${className} ${scaleOnHover ? "hover:scale-105" : ""}`}
              style={imageStyles}
              loading={priority === "high" ? "eager" : "lazy"}
              decoding={decoding}
              fetchPriority={fetchPriority}
              onLoad={handleLoad}
              onError={() => handleError("Image failed to load")}
              onLoadStart={handleLoadStart}
              {...props}
            />
          </picture>
        );
      }

      return (
        <img
          ref={(node) => {
            imageRef.current = node;
            if (ref) {
              if (typeof ref === "function") ref(node);
              else ref.current = node;
            }
          }}
          src={imageUrl}
          alt={alt}
          className={`${className} ${scaleOnHover ? "hover:scale-105 transition-transform duration-300" : ""}`}
          style={imageStyles}
          loading={priority === "high" ? "eager" : "lazy"}
          decoding={decoding}
          fetchPriority={fetchPriority}
          onLoad={handleLoad}
          onError={() => handleError("Image failed to load")}
          onLoadStart={handleLoadStart}
          {...props}
        />
      );
    };

    return (
      <div
        ref={containerRef}
        className={`${containerClassName} relative`}
        style={containerStyles}
      >
        {blurDataURL && !hasLoaded && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${blurDataURL})`,
              filter: "blur(20px)",
              transform: "scale(1.1)",
            }}
          />
        )}

        {renderImage()}

        {debug && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            ✓ Loaded
          </div>
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;

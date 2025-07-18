import React from "react";
import useImageLoader from "../../hooks/useImageLoader";

interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  loadingDelay?: number;
  className?: string;
  loadingClassName?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = "https://placehold.co/800x600?text=Image+Not+Found",
  loadingDelay = 0,
  className = "",
  loadingClassName = "",
  ...props
}) => {
  // Use our custom hook with staggered loading
  const { imageUrl, isLoading } = useImageLoader(src, {
    fallbackImage: fallbackSrc,
    loadingDelay: loadingDelay,
  });

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`${className} ${isLoading ? loadingClassName : ""}`}
      loading="lazy" // Use native lazy loading
      {...props}
    />
  );
};

export default OptimizedImage;

import React, { useState } from "react";
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
  const [error, setError] = useState(false);

  return (
    <img
      src={error ? fallbackSrc : imageUrl}
      alt={alt}
      className={`${className} ${isLoading ? loadingClassName : ""}`}
      loading="lazy"
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default OptimizedImage;

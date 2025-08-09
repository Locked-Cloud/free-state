import { useEffect } from "react";

/**
 * A custom hook to dynamically update the document title
 * @param title - The title to set for the document
 * @param suffix - Optional suffix to append to the title (defaults to empty string)
 */
const useTitle = (title: string, suffix: string = '') => {
  useEffect(() => {
    // Save the original title to restore it when the component unmounts
    const originalTitle = document.title;
    
    // Set the new title
    document.title = suffix ? `${title} ${suffix}` : title;
    
    // Cleanup function to restore the original title when the component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [title, suffix]); // Re-run effect when title or suffix changes
};

export default useTitle;

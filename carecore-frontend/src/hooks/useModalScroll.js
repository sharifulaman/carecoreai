import { useEffect } from "react";

/**
 * Hook to lock body scroll when modal is open
 * Automatically restores scroll on unmount
 */
export function useModalScroll() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { 
      document.body.style.overflow = "auto"; 
    };
  }, []);
}
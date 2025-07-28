import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollState } from '../contexts/ScrollContext';

export const useScrollManagement = (pageKey) => {
  const location = useLocation();
  const { saveScrollPosition, restoreScrollPosition } = useScrollState();
  const scrollContainerRef = useRef(null);
  const isRestoringRef = useRef(false);

  // Generate a unique key for this page/route
  const scrollKey = pageKey || location.pathname;
  
  console.log(`🔧 useScrollManagement initialized for: ${scrollKey}`);
  console.log(`📍 Current location:`, location.pathname);

  // Save scroll position when component unmounts or route changes
  useEffect(() => {
    console.log(`📜 Setting up scroll listener for: ${scrollKey}`);
    
    const handleScroll = () => {
      if (scrollContainerRef.current && !isRestoringRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        saveScrollPosition(scrollKey, scrollTop);
        console.log(`💾 Saved scroll for ${scrollKey}:`, scrollTop);
      }
    };

    // Use a small delay to ensure the ref is attached
    const setupListener = () => {
      const container = scrollContainerRef.current;
      console.log(`📦 Container ref for ${scrollKey}:`, container ? 'Found' : 'Not found');
      
      if (container) {
        container.addEventListener('scroll', handleScroll, { passive: true });
        console.log(`✅ Scroll listener added for: ${scrollKey}`);
        
        return () => {
          console.log(`🧹 Cleaning up scroll listener for: ${scrollKey}`);
          container.removeEventListener('scroll', handleScroll);
          // Save final scroll position on cleanup
          handleScroll();
        };
      } else {
        console.warn(`⚠️ No container found for: ${scrollKey}`);
        return null;
      }
    };

    // Try immediate setup
    let cleanup = setupListener();
    
    // If no container found, try again after a short delay
    if (!cleanup) {
      const timeoutId = setTimeout(() => {
        cleanup = setupListener();
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        if (cleanup) cleanup();
      };
    }
    
    return cleanup;
  }, [scrollKey, saveScrollPosition]);

  // Restore scroll position when component mounts
  useEffect(() => {
    console.log(`🔄 Attempting to restore scroll for: ${scrollKey}`);
    
    let timeoutIds = [];
    let hasRestored = false;
    
    const attemptRestore = (delay, label) => {
      const timeoutId = setTimeout(() => {
        if (hasRestored) return; // Prevent multiple restores
        
        if (scrollContainerRef.current) {
          isRestoringRef.current = true;
          console.log(`⏰ ${label} restore attempt for: ${scrollKey}`);
          
          restoreScrollPosition(scrollKey, scrollContainerRef.current);
          console.log(`🎯 Restored scroll for ${scrollKey}:`, scrollContainerRef.current.scrollTop);
          
          hasRestored = true;
          isRestoringRef.current = false;
        } else {
          console.warn(`⚠️ No container available for ${label} restore: ${scrollKey}`);
        }
      }, delay);
      
      timeoutIds.push(timeoutId);
    };
    
    // Try multiple restore attempts with different delays
    attemptRestore(50, 'Immediate');
    attemptRestore(200, 'Backup');
    attemptRestore(500, 'Final');
    
    // Cleanup function
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      isRestoringRef.current = false;
    };
  }, [scrollKey, restoreScrollPosition]);

  return {
    scrollContainerRef,
    saveScrollPosition: (position) => saveScrollPosition(scrollKey, position),
    restoreScrollPosition: () => restoreScrollPosition(scrollKey, scrollContainerRef.current),
  };
};

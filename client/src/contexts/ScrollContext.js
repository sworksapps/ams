import React, { createContext, useContext, useRef, useCallback } from 'react';

const ScrollContext = createContext();

export const useScrollState = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollState must be used within a ScrollProvider');
  }
  return context;
};

export const ScrollProvider = ({ children }) => {
  const scrollPositions = useRef({});

  const saveScrollPosition = useCallback((pageKey, position) => {
    scrollPositions.current[pageKey] = position;
  }, []);

  const getScrollPosition = useCallback((pageKey) => {
    return scrollPositions.current[pageKey] || 0;
  }, []);

  const restoreScrollPosition = useCallback((pageKey, element) => {
    if (element && scrollPositions.current[pageKey]) {
      element.scrollTop = scrollPositions.current[pageKey];
    }
  }, []);

  const value = {
    saveScrollPosition,
    getScrollPosition,
    restoreScrollPosition,
  };

  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  );
};

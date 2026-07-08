import React, { createContext, useContext, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const MobileContext = createContext();

export function MobileProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const value = {
    isMobile,
    goBack,
    currentPath: location.pathname,
    safeAreaTop: 'env(safe-area-inset-top)',
    safeAreaBottom: 'env(safe-area-inset-bottom)',
    safeAreaLeft: 'env(safe-area-inset-left)',
    safeAreaRight: 'env(safe-area-inset-right)',
  };

  return <MobileContext.Provider value={value}>{children}</MobileContext.Provider>;
}

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within MobileProvider');
  }
  return context;
}
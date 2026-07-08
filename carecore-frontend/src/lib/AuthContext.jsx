// @ts-nocheck
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
// import { json } from 'node:stream/consumers';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const token = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        setAuthError({
          type: 'unknown',
          message: error.message || 'Unable to load user session'
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    }
  };

  // const logout = (shouldRedirect = true) => {
  //   setUser(null);
  //   setIsAuthenticated(false);
  //   setAuthError(null);
    
  //   if (shouldRedirect) {
  //     base44.auth.logout(window.location.href);
  //   } else {
  //     base44.auth.logout();
  //   }
  // };
  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('base44_access_token');
    sessionStorage.removeItem('user');
    if(shouldRedirect){
      base44.auth.logout('/');
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
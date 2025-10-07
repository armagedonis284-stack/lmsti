/**
 * RouteProvider Component
 * 
 * Provides route remounting functionality to ensure components are properly
 * reinitialized after authentication state changes.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface RouteContextType {
  routeKey: string;
  remountRoutes: () => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const useRouteRemount = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteRemount must be used within a RouteProvider');
  }
  return context;
};

interface RouteProviderProps {
  children: ReactNode;
}

/**
 * RouteProvider - Manages route remounting for auth state changes
 * 
 * This component ensures that routes are properly remounted when authentication
 * state changes, preventing stale data and ensuring clean component initialization.
 */
export const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const [routeKey, setRouteKey] = useState<string>('initial');

  // Generate a new route key when auth state changes
  useEffect(() => {
    if (!loading) {
      const newKey = user && profile 
        ? `${profile.role}-${user.id}-${Date.now()}` 
        : `unauthenticated-${Date.now()}`;
      
      setRouteKey(newKey);
      console.log('Route key updated:', newKey);
    }
  }, [user, profile, loading]);

  const remountRoutes = () => {
    const newKey = `remount-${Date.now()}`;
    setRouteKey(newKey);
    console.log('Routes manually remounted:', newKey);
  };

  const value: RouteContextType = {
    routeKey,
    remountRoutes
  };

  return (
    <RouteContext.Provider value={value}>
      <div key={routeKey}>
        {children}
      </div>
    </RouteContext.Provider>
  );
};

export default RouteProvider;

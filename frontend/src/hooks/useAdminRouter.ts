import { useState, useEffect, useCallback } from 'react';

// Global subscriber set to keep all useAdminRouter hook instances perfectly synchronized
const routerListeners = new Set<() => void>();

export function useAdminRouter() {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        setPathname(window.location.pathname);
      }
    };

    routerListeners.add(handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      routerListeners.delete(handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== to) {
        window.history.pushState({}, '', to);
      }
      setPathname(to);
      // Notify all other components subscribed to the router (including App.tsx)
      routerListeners.forEach((listener) => {
        try {
          listener();
        } catch {}
      });
      window.dispatchEvent(new Event('popstate'));
    }
  }, []);

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin');

  return {
    pathname,
    navigate,
    isAdminRoute,
  };
}

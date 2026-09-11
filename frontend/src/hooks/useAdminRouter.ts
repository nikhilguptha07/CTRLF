import { useState, useEffect, useCallback } from 'react';

export function useAdminRouter() {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', to);
      setPathname(to);
    }
  }, []);

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin');

  return {
    pathname,
    navigate,
    isAdminRoute,
  };
}

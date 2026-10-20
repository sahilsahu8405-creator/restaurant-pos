import { useState, useEffect, useCallback } from 'react';
import { WebsiteRoute } from './types';

export function useWebsiteRouter() {
  const getCleanPath = (): string => {
    const path = window.location.pathname || '/';
    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  };

  const [currentPath, setCurrentPath] = useState<string>(getCleanPath());

  useEffect(() => {
    const handleLocationChange = () => {
      const clean = getCleanPath();
      setCurrentPath(clean);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = useCallback((target: string) => {
    if (target.startsWith('#')) {
      const el = document.getElementById(target.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    if (target.startsWith('http')) {
      window.location.href = target;
      return;
    }

    // Handle hash on target route (e.g. /#pricing)
    const [pathOnly, hash] = target.split('#');
    const cleanPath = pathOnly || '/';

    if (window.location.pathname !== cleanPath) {
      window.history.pushState({}, '', target);
      setCurrentPath(cleanPath);
      if (!hash) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return { currentPath, navigate };
}

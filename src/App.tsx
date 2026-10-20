import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { WebsiteApp } from './components/website/WebsiteApp';

function AppRouter() {
  const { session, kdsDevice } = useAuth();
  const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const isDesktopApp = isFileProtocol || !!(window as any).restohubNative?.isElectron;

  const getPath = () => {
    if (isDesktopApp) {
      const hash = window.location.hash.replace(/^#/, '');
      return hash ? (hash.startsWith('/') ? hash : `/${hash}`) : '/app';
    }
    return window.location.pathname || '/';
  };

  const [path, setPath] = useState<string>(getPath());

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(getPath());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (newPath: string) => {
    if (isDesktopApp) {
      window.location.hash = newPath;
      setPath(newPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
      setPath(newPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Immediate detection of OAuth redirect tokens in URL (e.g. from Google Sign-In)
  useEffect(() => {
    const isOAuthReturn =
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('code=');

    if (isOAuthReturn && window.location.pathname !== '/app') {
      navigateTo('/app');
    }
  }, []);

  // When an authenticated session is active (e.g. signed in via Google or password):
  // Direct redirect to the restaurant app if user visits root or login routes
  useEffect(() => {
    const isAuthenticated = !!session || !!kdsDevice;
    if (isAuthenticated) {
      const isAuthOrRoot =
        path === '/' ||
        path === '/login' ||
        path === '/register' ||
        path === '/signin' ||
        path === '/signup';

      const hasExplicitWebsiteParam = window.location.search.includes('view=website');

      if (isAuthOrRoot && !hasExplicitWebsiteParam) {
        navigateTo('/app');
      }
    }
  }, [session, kdsDevice, path]);

  // Determine current display mode
  const isLoginRoute = path === '/login' || path === '/signin';
  const isRegisterRoute = path === '/register' || path === '/signup';
  const isAppRoute = path === '/app' || path.startsWith('/pos');

  const isMarketingSubpage =
    path === '/product' ||
    path === '/solutions' ||
    path === '/pricing' ||
    path === '/resources' ||
    path === '/contact' ||
    path === '/privacy' ||
    path === '/terms';

  // In desktop app, cashier counter always boots straight into POS Shell!
  // On web, unauthenticated root boots into marketing website.
  const isWebsiteMode = isDesktopApp
    ? path === '/' || path.startsWith('/website') || window.location.search.includes('view=website')
    : (session || kdsDevice)
    ? isMarketingSubpage || (path === '/' && window.location.search.includes('view=website'))
    : !isLoginRoute && !isRegisterRoute && !isAppRoute;

  return (
    <>
      {isWebsiteMode ? (
        <WebsiteApp
          onEnterApp={() => navigateTo('/app')}
          onEnterLogin={() => navigateTo('/login')}
          onEnterRegister={() => navigateTo('/register')}
        />
      ) : (
        <Shell
          initialAuthTab={isRegisterRoute ? 'register_owner' : 'signin'}
          onBackToWebsite={() => {
            if (session || kdsDevice) {
              navigateTo('/?view=website');
            } else {
              navigateTo('/');
            }
          }}
        />
      )}
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

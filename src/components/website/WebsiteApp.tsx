import React, { useEffect } from 'react';
import { useWebsiteRouter } from './useWebsiteRouter';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { PricingPage } from './pages/PricingPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { useAuth } from '../../context/AuthContext';

interface WebsiteAppProps {
  onEnterApp?: () => void;
  onEnterRegister?: () => void;
  onEnterLogin?: () => void;
}

export const WebsiteApp: React.FC<WebsiteAppProps> = ({
  onEnterApp,
  onEnterRegister,
  onEnterLogin,
}) => {
  const { currentPath, navigate } = useWebsiteRouter();
  const { session, user } = useAuth();

  // Dynamic Page Title & Meta tags for SEO
  useEffect(() => {
    switch (currentPath) {
      case '/product':
        document.title = 'Product Overview — RestoHub Restaurant Operating System';
        break;
      case '/solutions':
        document.title = 'Solutions for Restaurants, Cafés & Chains — RestoHub';
        break;
      case '/pricing':
        document.title = 'Pricing Plans — RestoHub Restaurant Operating System';
        break;
      case '/resources':
        document.title = 'Resources, Hardware & Guides — RestoHub';
        break;
      case '/contact':
        document.title = 'Contact Support & Sales — RestoHub';
        break;
      case '/privacy':
        document.title = 'Privacy Policy — RestoHub';
        break;
      case '/terms':
        document.title = 'Terms of Service — RestoHub';
        break;
      default:
        document.title = 'RestoHub — Modern Restaurant Operating System';
        break;
    }
  }, [currentPath]);

  // Intercept navigation for /login, /register, /app to launch the restaurant POS / login flows
  const handleNavigate = (path: string) => {
    if (path === '/login' || path === '/signin') {
      if (onEnterLogin) {
        onEnterLogin();
        return;
      }
    }
    if (path === '/register' || path === '/signup') {
      if (onEnterRegister) {
        onEnterRegister();
        return;
      }
    }
    if (path === '/app' || path === '/pos') {
      if (onEnterApp) {
        onEnterApp();
        return;
      }
    }
    navigate(path);
  };

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/product':
        return <ProductPage navigate={handleNavigate} />;
      case '/solutions':
        return <SolutionsPage navigate={handleNavigate} />;
      case '/pricing':
        return <PricingPage navigate={handleNavigate} />;
      case '/resources':
        return <ResourcesPage navigate={handleNavigate} />;
      case '/contact':
        return <ContactPage navigate={handleNavigate} />;
      case '/privacy':
        return <PrivacyPolicyPage navigate={handleNavigate} />;
      case '/terms':
        return <TermsOfServicePage navigate={handleNavigate} />;
      case '/':
      default:
        return <HomePage navigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#171A18] flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentPath={currentPath}
        navigate={handleNavigate}
        isAuthenticated={!!session}
        userEmail={user?.email}
      />

      {/* Main Page Area */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <Footer navigate={handleNavigate} />
    </div>
  );
};

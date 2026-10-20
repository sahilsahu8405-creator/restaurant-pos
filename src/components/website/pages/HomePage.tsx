import React, { useState } from 'react';
import { HeroSection } from '../HeroSection';
import { FeatureStrip } from '../FeatureStrip';
import { CapabilitiesSection } from '../CapabilitiesSection';
import { HowItWorksSection } from '../HowItWorksSection';
import { SolutionsBanner } from '../SolutionsBanner';
import { WhyChooseSection } from '../WhyChooseSection';
import { DeviceAvailabilitySection } from '../DeviceAvailabilitySection';
import { PricingSection } from '../PricingSection';
import { ClosingCtaSection } from '../ClosingCtaSection';
import { VideoModal } from '../VideoModal';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleContactSales = () => {
    navigate('/contact');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#171A18] flex flex-col">
      {/* 1. Hero Section with Real Product Mockups */}
      <HeroSection
        onGetStarted={handleGetStarted}
        onWatchVideo={() => setIsVideoModalOpen(true)}
      />

      {/* 2. Feature Strip */}
      <FeatureStrip />

      {/* 3. Everything Your Restaurant Needs (Photo Capabilities) */}
      <CapabilitiesSection
        onSelectFeature={(id) => navigate(`/product#${id}`)}
        onViewAll={() => navigate('/product')}
      />

      {/* 4. Luxury Dark Section: How It Works (3 Steps) */}
      <HowItWorksSection
        onSeeGuide={() => navigate('/resources')}
      />

      {/* 5. Built for Restaurants That Aim Higher Banner */}
      <SolutionsBanner
        onExplore={() => navigate('/solutions')}
      />

      {/* 6. Why Choose RestoHub? */}
      <WhyChooseSection
        onSeeAllFeatures={() => navigate('/product')}
      />

      {/* 7. Available on All Your Devices */}
      <DeviceAvailabilitySection
        onOpenWebApp={() => navigate('/app')}
        onRequestAccess={() => navigate('/contact')}
      />

      {/* 8. Simple & Transparent Pricing */}
      <PricingSection
        onGetStarted={handleGetStarted}
        onContactSales={handleContactSales}
      />

      {/* 9. Closing CTA: Bring Your Restaurant Operations Together */}
      <ClosingCtaSection
        onGetStarted={handleGetStarted}
        onTalkToTeam={handleContactSales}
      />

      {/* Interactive Video / Walkthrough Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onGetStarted={handleGetStarted}
      />
    </div>
  );
};

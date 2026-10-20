import React from 'react';
import { ArrowRight, Sparkles, Zap, ShieldCheck, MapPin } from 'lucide-react';

interface WhyChooseProps {
  onSeeAllFeatures?: () => void;
}

export const WhyChooseSection: React.FC<WhyChooseProps> = ({ onSeeAllFeatures }) => {
  const reasons = [
    {
      icon: Sparkles,
      title: 'Easy to Use',
      description: 'Intuitive interface for faster training.',
      color: 'bg-orange-50 text-[#E87524]',
    },
    {
      icon: Zap,
      title: 'Real-Time Sync',
      description: 'Live updates across all devices.',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: ShieldCheck,
      title: 'Secure & Reliable',
      description: 'Your data is safe with enterprise-grade security.',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: MapPin,
      title: 'Built for India',
      description: 'Designed for modern Indian restaurants.',
      color: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <section className="py-16 sm:py-20 px-6 sm:px-8 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-serif-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171A18] tracking-tight">
            Why Choose RestoHub?
          </h2>

          <button
            onClick={onSeeAllFeatures}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#E87524] hover:text-[#CC5E15] transition-colors cursor-pointer group"
          >
            <span>See all features</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {reasons.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E3DDD2] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center font-bold`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#171A18]">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#686A64] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

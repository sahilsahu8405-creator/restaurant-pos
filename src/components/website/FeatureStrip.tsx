import React from 'react';
import { Receipt, Users, Store, Cloud } from 'lucide-react';

export const FeatureStrip: React.FC = () => {
  const features = [
    {
      icon: Receipt,
      title: 'Complete Operations',
      subtitle: 'From order to payment',
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      subtitle: 'Owner, Manager, Waiter, Kitchen',
    },
    {
      icon: Store,
      title: 'Multi-Outlet Ready',
      subtitle: 'Scale your business',
    },
    {
      icon: Cloud,
      title: 'Use Anywhere',
      subtitle: 'Web, Desktop & Mobile',
    },
  ];

  return (
    <section className="relative z-10 -mt-4 mb-8 sm:mb-12 px-6 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 rounded-3xl bg-white border border-[#E3DDD2] shadow-sm shadow-black/5">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#FAF7F2] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 text-[#E87524] flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#171A18] leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#686A64] mt-0.5 leading-snug">
                    {item.subtitle}
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

import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

interface CapabilitiesSectionProps {
  onSelectFeature?: (featureId: string) => void;
  onViewAll?: () => void;
}

export const CapabilitiesSection: React.FC<CapabilitiesSectionProps> = ({
  onSelectFeature,
  onViewAll,
}) => {
  const capabilities = [
    {
      id: 'pos',
      title: 'POS & Billing',
      description: 'Fast, simple and reliable billing with multiple payment options.',
      image: '/images/pos_billing.jpg',
      alt: 'Restaurant POS and billing counter setup with thermal printer and screen',
      badge: 'Thermal Printing',
    },
    {
      id: 'tables',
      title: 'Table Management',
      description: 'Real-time table status and order management.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
      alt: 'Elegant restaurant interior with dining tables',
      badge: 'Live Statuses',
    },
    {
      id: 'kds',
      title: 'Kitchen KDS',
      description: 'Streamlined kitchen operations with live order tickets.',
      image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&auto=format&fit=crop&q=80',
      alt: 'Chef preparing food in restaurant kitchen',
      badge: 'Zero Delay',
    },
    {
      id: 'menu',
      title: 'Menu & Pricing',
      description: 'Flexible menu setup with categories, variants and pricing control.',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      alt: 'Authentic gourmet restaurant dishes',
      badge: 'Variants & Taxes',
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock',
      description: 'Track stock, manage purchases and get low-stock alerts.',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=80',
      alt: 'Restaurant pantry ingredients and bar stock',
      badge: 'Reorder Alerts',
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      description: 'Understand your business with powerful insights.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      alt: 'Business analytics and sales reporting dashboard on tablet',
      badge: 'Daily Closing',
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 px-6 sm:px-8 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-14">
          <div className="space-y-2 max-w-2xl">
            <h2 className="font-serif-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171A18] tracking-tight">
              Everything Your Restaurant Needs
            </h2>
            <p className="text-sm sm:text-base text-[#686A64]">
              A complete operating system to run, manage and grow your restaurant — all in one place.
            </p>
          </div>

          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#E87524] hover:text-[#CC5E15] transition-colors cursor-pointer group shrink-0"
          >
            <span>View All Features</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {capabilities.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectFeature?.(item.id)}
              className="group bg-white rounded-3xl overflow-hidden border border-[#E3DDD2] hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              {/* Photo Header */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                
                <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-slate-800 shadow-2xs">
                  {item.badge}
                </span>
              </div>

              {/* Text Body */}
              <div className="p-5 sm:p-6 flex items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#171A18] group-hover:text-[#E87524] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#686A64] leading-relaxed max-w-xs">
                    {item.description}
                  </p>
                </div>

                {/* Circle Arrow Action Button */}
                <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-[#E87524] text-slate-600 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

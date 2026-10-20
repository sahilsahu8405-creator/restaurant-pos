import React, { useEffect } from 'react';
import {
  UtensilsCrossed,
  Coffee,
  Store,
  Truck,
  Building2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface SolutionsPageProps {
  navigate: (path: string) => void;
}

export const SolutionsPage: React.FC<SolutionsPageProps> = ({ navigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  const solutions = [
    {
      id: 'finedine',
      title: 'Fine-Dine & Full-Service Restaurants',
      icon: UtensilsCrossed,
      tag: 'Floor Coordination',
      description:
        'Deliver uncompromised guest hospitality with synchronized table layouts, multi-course KOT firing, waiter mobile ordering, and split bill settlements.',
      workflow: [
        'Table status visualization keeps hosts, servers, and managers aligned',
        'Waiter tablets punch orders tableside with real-time kitchen transmission',
        'Split check capability allows guests to pay by cash, card, and UPI independently',
        'Kitchen display system tracks preparation stages without lost paper slips',
      ],
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'cafe',
      title: 'Cafés, Bakeries & Coffee Bars',
      icon: Coffee,
      tag: 'Speed & Customization',
      description:
        'Handle morning rushes and continuous counter queues with lightning-fast item modifiers, portion options, custom dietary tags, and rapid thermal checkout.',
      workflow: [
        'Quick item modifiers for milk choices, flavor syrups, and roast preferences',
        'Fast counter checkout: Select, calculate GST, and tap to pay in seconds',
        'Direct 58mm/80mm thermal receipt generation with brand header',
        'Inventory alerts for beans, milk cartons, and bakery ingredients',
      ],
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'qsr',
      title: 'Quick Service Restaurants (QSR)',
      icon: Store,
      tag: 'High Velocity',
      description:
        'Engineered for volume. Process dozens of orders every minute with streamlined cashier screens and real-time kitchen order staging.',
      workflow: [
        'Minimal-click cashier interface designed for rapid order punch-in',
        'Sequential token generation for customer pickup tracking',
        'Kitchen display system alerts prep cooks to high-volume bottlenecks',
        'End-of-shift drawer reconciliation for multiple cashier registers',
      ],
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'takeaway',
      title: 'Takeaway & Cloud Kitchens',
      icon: Truck,
      tag: 'Delivery Workflows',
      description:
        'Coordinate multiple preparation stations with dedicated kitchen screens and dispatch tracking designed for parcel and takeaway operations.',
      workflow: [
        'Separate order types: Takeaway, Counter, and Delivery packaging notes',
        'Customer phone and delivery address capture on invoice',
        'Kitchen station filtering: Route grill items to grill and fryers to fry stations',
        'Daily expense tracking for packaging materials and delivery overheads',
      ],
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'multi-outlet',
      title: 'Multi-Outlet Restaurant Groups',
      icon: Building2,
      tag: 'Central Governance',
      description:
        'Grow from a single flagship restaurant to multi-branch operations without fragmenting your database, menu catalogs, or staff permissions.',
      workflow: [
        'Manage multiple branches under a unified master restaurant account',
        'Scoped staff access: Managers and floor staff only see their assigned branch',
        'Branch-level performance reporting alongside centralized group totals',
        'Cryptographic Row-Level Security ensures branches never cross-contaminate data',
      ],
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="pt-28 sm:pt-36 pb-20 px-6 sm:px-8 bg-[#FAF7F2] text-[#171A18]">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
            TAILORED OPERATIONAL WORKFLOWS
          </div>
          <h1 className="font-serif-headline text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#171A18]">
            Solutions Built for Your Restaurant Format
          </h1>
          <p className="text-sm sm:text-base text-[#686A64] leading-relaxed">
            Every dining establishment has distinct operating requirements. RestoHub adapts seamlessly to match your service model.
          </p>
        </div>

        {/* Solutions List */}
        <div className="space-y-16 sm:space-y-20">
          {solutions.map((item, idx) => {
            const Icon = item.icon;
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={item.id}
                id={item.id}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center ${
                  isReversed ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text Content */}
                <div className={`lg:col-span-6 space-y-5 ${isReversed ? 'lg:order-2' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#E87524] flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-[#E3DDD2] text-slate-800">
                      {item.tag}
                    </span>
                  </div>

                  <h2 className="font-serif-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171A18] tracking-tight">
                    {item.title}
                  </h2>

                  <p className="text-sm text-[#686A64] leading-relaxed">
                    {item.description}
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {item.workflow.map((w, wIdx) => (
                      <div key={wIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => navigate('/register')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Get Started for This Format</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Photo Frame */}
                <div className={`lg:col-span-6 ${isReversed ? 'lg:order-1' : ''}`}>
                  <div className="rounded-3xl overflow-hidden border border-[#E3DDD2] shadow-lg bg-white">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-72 sm:h-96 object-cover hover:scale-102 transition-transform duration-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Workflow Consultation */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#E3DDD2] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="font-serif-headline text-2xl font-bold text-[#171A18]">
              Have a Unique Multi-Concept or Franchise Setup?
            </h3>
            <p className="text-xs sm:text-sm text-[#686A64]">
              Talk directly with our product team to see how RestoHub can map to your exact floor plan, kitchen stations, and branch permissions.
            </p>
          </div>
          <button
            onClick={() => navigate('/contact')}
            className="px-6 py-3 rounded-full border border-[#E3DDD2] hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
          >
            Consult With Our Team →
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import {
  CreditCard,
  Grid,
  ChefHat,
  Smartphone,
  UtensilsCrossed,
  Package,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
  Printer,
  Sparkles,
} from 'lucide-react';

interface ProductPageProps {
  navigate: (path: string) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({ navigate }) => {
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

  const modules = [
    {
      id: 'pos',
      title: 'POS & Thermal Billing',
      badge: 'High Performance',
      icon: CreditCard,
      description:
        'A fast, intuitive cashier point-of-sale built for relentless rush hours. Generate GST-compliant invoices in milliseconds with paise-accurate calculations.',
      highlights: [
        'Paise-accurate calculations for CGST, SGST, discounts, and rounding',
        'Direct hardware integration with 80mm and 58mm ESC/POS thermal receipt printers',
        'Multi-tender payment handling: Cash, UPI, Card, and split payments',
        'Offline resilience: Local cache fallback ensures uninterrupted cashier operation',
      ],
      image: '/images/pos_billing.jpg',
    },
    {
      id: 'tables',
      title: 'Interactive Table Management',
      badge: 'Floor Operations',
      icon: Grid,
      description:
        'Visual floor plan giving front-of-house staff instant clarity on available, occupied, reserved, and billed tables with running order totals.',
      highlights: [
        'Real-time color-coded table occupancy: Available, Occupied, Billed, and Reserved',
        'Seamless table transfer and bill merging without disrupting kitchen preparation',
        'Guest count tracking and server table assignments',
        'Direct conversion of table running tab into an instant checkout invoice',
      ],
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'kds',
      title: 'Kitchen Display System (KDS)',
      badge: 'Zero Paper Wastage',
      icon: ChefHat,
      description:
        'Replace lost paper KOT slips with synchronized digital kitchen displays. Orders placed at the counter or tableside appear instantly in the kitchen.',
      highlights: [
        'Secure 6-digit terminal pairing or direct Restaurant ID authentication',
        'Elapsed order timer with visual warnings for delayed dishes',
        'Item-level preparation state: Pending, Cooking, Ready to Serve, and Delivered',
        'Sound notifications on new incoming tickets for noisy kitchen environments',
      ],
      image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'waiter',
      title: 'Waiter Mobile Terminal',
      badge: 'Tableside Speed',
      icon: Smartphone,
      description:
        'Equip your waitstaff with an ultra-responsive web application that runs on any mobile phone or tablet, completely eliminating manual order pads.',
      highlights: [
        'Staff Login ID & PIN access without needing personal staff email addresses',
        'Role-scoped security: Waiters cannot access financial metrics or management settings',
        'Instant category filtering, item variants (half/full, sizes), and special chef notes',
        'Live confirmation when kitchen marks the order ready for pickup',
      ],
      image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'menu',
      title: 'Menu & Dynamic Pricing',
      badge: 'Flexible Catalog',
      icon: UtensilsCrossed,
      description:
        'Effortlessly structure your food catalog with categories, dietary indicators, custom portion sizes, and immediate 86 out-of-stock toggles.',
      highlights: [
        'Dietary badges: Pure Veg, Non-Veg, Egg, Vegan, and Jain',
        'Variant management: Multiple portions, crust types, and spice levels with individual pricing',
        'Instant out-of-stock toggling prevents waitstaff from selling depleted items',
        'Configurable tax rates per item or category to meet local tax guidelines',
      ],
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock Control',
      badge: 'Cost Prevention',
      icon: Package,
      description:
        'Maintain tight control over raw ingredients, beverage stock, and packaging materials with low-stock alerts before items run out during service.',
      highlights: [
        'Track stock in standard units: Kilograms, Liters, Packets, and Portions',
        'Custom minimum threshold alerts notify managers when reordering is necessary',
        'Stock adjustment logs record wastage, breakage, and physical inventory audits',
        'Petty cash and operational expense logging for daily store accountability',
      ],
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'reports',
      title: 'Reports & Day Closing',
      badge: 'Business Insights',
      icon: BarChart3,
      description:
        'Actionable intelligence on sales trends, peak service hours, cashier shift balances, and top-performing dishes.',
      highlights: [
        'End-of-day register reconciliation: Cash counted vs. expected digital totals',
        'Payment method breakdown across Cash, UPI, and Card transactions',
        'Hourly sales distribution highlights peak revenue windows',
        'Audit logs track discounts, bill edits, and voided orders',
      ],
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'security',
      title: 'Multi-Outlet & Data Isolation',
      badge: 'Enterprise Architecture',
      icon: Shield,
      description:
        'Architected from the ground up on Postgres Row-Level Security (RLS) to guarantee complete data isolation between different restaurants and branches.',
      highlights: [
        'Multi-tenant database policies enforce strict cryptographic tenant separation',
        'Multi-branch support: Manage multiple outlets under a single master brand',
        'Granular RBAC: Owner, Manager, Cashier, Waiter, and Kitchen roles',
        'Zero cross-tenant data leakage verified by automated security regression tests',
      ],
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="pt-28 sm:pt-36 pb-20 px-6 sm:px-8 bg-[#FAF7F2] text-[#171A18]">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
        
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 text-[#E87524] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unified Restaurant Architecture</span>
          </div>
          <h1 className="font-serif-headline text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#171A18]">
            One Connected System.<br />Every Restaurant Module.
          </h1>
          <p className="text-sm sm:text-base text-[#686A64] leading-relaxed">
            RestoHub eliminates disconnected software. Every order, inventory update, and payment flows seamlessly across POS, kitchen, floor staff, and owner analytics.
          </p>
        </div>

        {/* Modules Breakdown */}
        <div className="space-y-16 sm:space-y-24">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={m.id}
                id={m.id}
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
                      {m.badge}
                    </span>
                  </div>

                  <h2 className="font-serif-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171A18] tracking-tight">
                    {m.title}
                  </h2>

                  <p className="text-sm text-[#686A64] leading-relaxed">
                    {m.description}
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {m.highlights.map((h, hIdx) => (
                      <div key={hIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => navigate('/register')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#E87524] hover:text-[#CC5E15] group cursor-pointer"
                    >
                      <span>Try {m.title} in RestoHub</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Photo Frame */}
                <div className={`lg:col-span-6 ${isReversed ? 'lg:order-1' : ''}`}>
                  <div className="rounded-3xl overflow-hidden border border-[#E3DDD2] shadow-lg bg-white">
                    <img
                      src={m.image}
                      alt={m.title}
                      loading="lazy"
                      className="w-full h-72 sm:h-96 object-cover hover:scale-102 transition-transform duration-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Card */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#E3DDD2] shadow-sm text-center space-y-5 max-w-3xl mx-auto">
          <h3 className="font-serif-headline text-2xl sm:text-3xl font-bold text-[#171A18]">
            Experience RestoHub in Your Restaurant
          </h3>
          <p className="text-xs sm:text-sm text-[#686A64] max-w-xl mx-auto">
            Set up your menu, create your first branch, and start managing orders in minutes.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-600/25 transition-all cursor-pointer"
            >
              Get Started with RestoHub →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

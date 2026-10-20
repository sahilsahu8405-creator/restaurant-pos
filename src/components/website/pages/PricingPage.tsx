import React, { useState } from 'react';
import { Check, ArrowRight, HelpCircle, ShieldCheck } from 'lucide-react';

interface PricingPageProps {
  navigate: (path: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ navigate }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'For single outlet restaurants, cafés, and takeaway spots',
      isPopular: false,
      features: [
        'High-speed POS & billing interface',
        'Visual table management & floor maps',
        'Kitchen Display System (KDS) live tickets',
        'Basic sales & daily cashier closing reports',
        'ESC/POS thermal printer support (58mm & 80mm)',
        'Up to 5 concurrent staff user accounts',
      ],
      ctaText: 'Get Started with Starter',
      ctaAction: () => navigate('/register'),
      ctaPrimary: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      subtitle: 'For established restaurants needing full operations & inventory',
      isPopular: true,
      popularBadge: 'Most Popular',
      features: [
        'Everything included in Starter',
        'Full raw ingredient & stock inventory management',
        'Low-stock and reorder threshold alerts',
        'Waiter mobile terminal order taking',
        'Comprehensive financial reports & peak hour analytics',
        'Granular role-based permissions (Cashier, Waiter, Kitchen, Manager)',
        'Up to 15 concurrent staff user accounts',
      ],
      ctaText: 'Get Started with Growth',
      ctaAction: () => navigate('/register'),
      ctaPrimary: true,
    },
    {
      id: 'multi-outlet',
      name: 'Multi-Outlet',
      subtitle: 'For restaurant chains, franchise groups, and multi-concept operators',
      isPopular: false,
      features: [
        'Everything included in Growth',
        'Centralized multi-outlet management under one account',
        'Branch-scoped staff credentials and branch codes',
        'Consolidated group reports + individual branch breakdowns',
        'Central menu distribution with branch-level overrides',
        'Dedicated onboarding consultation & priority support',
        'Unlimited staff user accounts',
      ],
      ctaText: 'Contact Our Team',
      ctaAction: () => navigate('/contact'),
      ctaPrimary: false,
    },
  ];

  const faqs = [
    {
      q: 'Do I need special POS hardware to run RestoHub?',
      a: 'No. RestoHub runs on standard computers, laptops, iPads, Android tablets, and smartphones via modern web browsers. For physical receipts, it integrates directly with standard 58mm and 80mm ESC/POS thermal printers via USB, Bluetooth, or local network.',
    },
    {
      q: 'How does restaurant onboarding and registration work?',
      a: 'Clicking Get Started takes you to the Owner Registration screen. You enter your restaurant name, primary branch, and owner credentials to create a private workspace with immediate access.',
    },
    {
      q: 'Can staff access the system on their personal phones without seeing sales?',
      a: 'Yes. RestoHub provides a dedicated Waiter and Kitchen role. Floor staff log in with their assigned Restaurant ID and staff PIN. They can only punch orders or view kitchen tickets, and cannot access sales, daily closing, or admin settings.',
    },
    {
      q: 'Is our restaurant data isolated from other restaurants?',
      a: 'Absolutely. RestoHub is architected with strict PostgreSQL Row-Level Security (RLS) policies. Every query is filtered cryptographically to your tenant ID, preventing any unauthorized cross-tenant data access.',
    },
  ];

  return (
    <div className="pt-28 sm:pt-36 pb-20 px-6 sm:px-8 bg-[#FAF7F2] text-[#171A18]">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-5">
          <div className="space-y-2">
            <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
              TRANSPARENT PLANS
            </div>
            <h1 className="font-serif-headline text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#171A18]">
              Simple & Transparent Pricing
            </h1>
            <p className="text-sm sm:text-base text-[#686A64]">
              Choose the plan that fits your restaurant. No hidden charges.
            </p>
          </div>

          {/* Billing Cycle Switch */}
          <div className="inline-flex items-center p-1.5 rounded-full bg-[#EFE9DF] border border-[#E3DDD2] gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#E87524] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-[#E87524] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Yearly</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                billingCycle === 'yearly' ? 'bg-white text-[#E87524]' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Save more
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-200 ${
                plan.isPopular
                  ? 'bg-white border-2 border-[#E87524] shadow-xl shadow-orange-600/10 -translate-y-1'
                  : 'bg-white border border-[#E3DDD2] shadow-xs hover:shadow-md'
              }`}
            >
              {plan.popularBadge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#E87524] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  {plan.popularBadge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-[#171A18] tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[#686A64] mt-1 leading-relaxed">
                    {plan.subtitle}
                  </p>
                </div>

                <div className="h-px bg-slate-100" />

                <ul className="space-y-3.5 text-xs text-slate-700">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={plan.ctaAction}
                  className={`w-full py-3.5 px-5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.ctaPrimary
                      ? 'bg-[#E87524] hover:bg-[#CC5E15] text-white shadow-md shadow-orange-600/20 active:scale-[0.98]'
                      : 'border border-[#E3DDD2] hover:bg-slate-50 text-slate-900 active:scale-[0.98]'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing FAQs */}
        <div className="max-w-3xl mx-auto space-y-8 pt-8">
          <div className="text-center space-y-2">
            <h2 className="font-serif-headline text-2xl sm:text-3xl font-bold text-[#171A18]">
              Frequently Asked Questions About Pricing
            </h2>
            <p className="text-xs sm:text-sm text-[#686A64]">
              Clear, honest information before onboarding your restaurant.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E3DDD2] space-y-2 shadow-2xs"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-[#171A18]">
                  <HelpCircle className="w-4 h-4 text-[#E87524] shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <p className="text-xs text-[#686A64] leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

interface PricingSectionProps {
  onGetStarted: () => void;
  onContactSales: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  onGetStarted,
  onContactSales,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'For single outlet restaurants',
      isPopular: false,
      features: [
        'POS & Billing',
        'Table Management',
        'Kitchen KDS',
        'Basic Reports',
      ],
      buttonText: 'Get Started',
      buttonAction: onGetStarted,
      buttonPrimary: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      subtitle: 'For growing restaurants',
      isPopular: true,
      popularBadge: 'Most Popular',
      features: [
        'Everything in Starter',
        'Inventory & Stock',
        'Advanced Reports',
        'Staff Management',
      ],
      buttonText: 'Get Started',
      buttonAction: onGetStarted,
      buttonPrimary: true,
    },
    {
      id: 'multi-outlet',
      name: 'Multi-Outlet',
      subtitle: 'For restaurant groups',
      isPopular: false,
      features: [
        'Everything in Growth',
        'Multi-Outlet Management',
        'Centralized Reporting',
        'Priority Support',
      ],
      buttonText: 'Contact Sales',
      buttonAction: onContactSales,
      buttonPrimary: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 px-6 sm:px-8 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
        
        {/* Header with Monthly/Yearly Switch */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-5">
          <div className="space-y-2">
            <h2 className="font-serif-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171A18] tracking-tight">
              Simple & Transparent Pricing
            </h2>
            <p className="text-sm sm:text-base text-[#686A64]">
              Choose the plan that fits your restaurant. No hidden charges.
            </p>
          </div>

          {/* Billing Toggle */}
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
              {/* Popular Badge */}
              {plan.popularBadge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#E87524] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  {plan.popularBadge}
                </div>
              )}

              <div className="space-y-6">
                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-xl font-black text-[#171A18] tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[#686A64] mt-1">
                    {plan.subtitle}
                  </p>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Features List */}
                <ul className="space-y-3.5 text-xs text-slate-700">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                <button
                  onClick={plan.buttonAction}
                  className={`w-full py-3.5 px-5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.buttonPrimary
                      ? 'bg-[#E87524] hover:bg-[#CC5E15] text-white shadow-md shadow-orange-600/20 active:scale-[0.98]'
                      : 'border border-[#E3DDD2] hover:bg-slate-50 text-slate-900 active:scale-[0.98]'
                  }`}
                >
                  <span>{plan.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

import React from 'react';
import { Store, Users, ArrowRight, TrendingUp } from 'lucide-react';

interface HowItWorksProps {
  onSeeGuide?: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksProps> = ({ onSeeGuide }) => {
  const steps = [
    {
      step: '01',
      title: 'Set Up Your Restaurant',
      description: 'Create your restaurant and configure basic settings.',
      icon: Store,
    },
    {
      step: '02',
      title: 'Configure Menu & Team',
      description: 'Add menu, tables, staff and customize your workflow.',
      icon: Users,
    },
    {
      step: '03',
      title: 'Start Managing',
      description: 'Take orders, track operations and grow your business.',
      icon: TrendingUp,
    },
  ];

  return (
    <section className="relative py-20 sm:py-28 px-6 sm:px-8 bg-[#171B17] text-white overflow-hidden">
      {/* Background warm lighting and authentic restaurant culinary overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 mix-blend-luminosity pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#171B17] via-[#171B17]/90 to-[#171B17] -z-10 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12 sm:space-y-16">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-serif-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Get your restaurant running in just a few simple steps.
            </p>
          </div>

          <button
            onClick={onSeeGuide}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer w-fit"
          >
            <span>See Detailed Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative bg-[#222822]/90 border border-white/10 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-orange-500/40 transition-colors shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#E87524] text-white flex items-center justify-center font-black shadow-md shadow-orange-600/30">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-sm font-extrabold text-[#E87524] tracking-wider">
                    {item.step}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Subtle arrow indicator for steps 1 and 2 */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#171B17] border border-white/20 items-center justify-center text-slate-400 z-20">
                    <ArrowRight className="w-4 h-4 text-orange-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

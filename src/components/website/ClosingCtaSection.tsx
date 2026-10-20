import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ClosingCtaProps {
  onGetStarted: () => void;
  onTalkToTeam: () => void;
}

export const ClosingCtaSection: React.FC<ClosingCtaProps> = ({
  onGetStarted,
  onTalkToTeam,
}) => {
  return (
    <section className="py-16 sm:py-24 px-6 sm:px-8 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 lg:p-16 rounded-[32px] bg-white border border-[#E3DDD2] shadow-xl shadow-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          <div className="space-y-3 max-w-xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
              READY TO GET STARTED?
            </span>
            <h2 className="font-serif-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171A18] tracking-tight leading-tight">
              Bring Your Restaurant Operations Together.
            </h2>
            <p className="text-xs sm:text-sm text-[#686A64]">
              Join modern restaurants that trust RestoHub to run their business.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 shrink-0">
            <button
              onClick={onGetStarted}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onTalkToTeam}
              className="px-5 py-3.5 rounded-full border border-[#E3DDD2] hover:bg-slate-50 text-[#171A18] text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              Talk to Our Team
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

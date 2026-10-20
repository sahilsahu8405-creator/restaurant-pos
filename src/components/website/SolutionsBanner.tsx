import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SolutionsBannerProps {
  onExplore: () => void;
}

export const SolutionsBanner: React.FC<SolutionsBannerProps> = ({ onExplore }) => {
  return (
    <section className="py-12 sm:py-20 px-6 sm:px-8 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto">
        <div 
          className="relative rounded-3xl overflow-hidden min-h-[360px] sm:min-h-[420px] flex items-center p-8 sm:p-14 lg:p-16 text-white shadow-2xl bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1800&auto=format&fit=crop&q=85')`,
          }}
        >
          {/* Dark luxury gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#171B17]/95 via-[#171B17]/80 to-transparent" />

          {/* Text Content */}
          <div className="relative z-10 max-w-xl space-y-5">
            <div className="inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300">
              Built for
            </div>

            <h2 className="font-serif-headline text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-white">
              Restaurants<br />
              That Aim Higher
            </h2>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-md font-normal">
              Whether you run a café, a fine-dine restaurant, or a multi-outlet chain, RestoHub adapts to your workflow.
            </p>

            <div className="pt-2">
              <button
                onClick={onExplore}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-sm font-bold shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Explore Solutions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

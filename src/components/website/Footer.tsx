import React from 'react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E3DDD2] pt-16 pb-12 px-6 sm:px-8 text-slate-600 select-none">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo onClick={() => navigate('/')} />
            <p className="text-xs sm:text-sm text-[#686A64] max-w-sm leading-relaxed">
              RestoHub is a unified restaurant operating system built for modern restaurants, cafés, quick-service counters, and multi-branch chains.
            </p>
            <div className="pt-2 text-[11px] text-slate-400">
              High Performance • Low Latency • Row-Level Security
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Product
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/product#pos')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  POS & Billing
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/product#tables')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Table Management
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/product#kds')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Kitchen Display (KDS)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/product#waiter')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Waiter Mobile App
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/product#inventory')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Inventory & Stock
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/product#reports')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Reports & Analytics
                </button>
              </li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Solutions
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/solutions#finedine')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Fine-Dine & Full Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/solutions#cafe')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Cafés & Bakeries
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/solutions#qsr')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Quick Service (QSR)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/solutions#takeaway')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Takeaway & Cloud Kitchen
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/solutions#multi-outlet')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Multi-Outlet Groups
                </button>
              </li>
            </ul>
          </div>

          {/* Resources & Legal */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Resources & Legal
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/pricing')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Pricing Plans
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/resources')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Guides & Hardware
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/contact')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/terms')}
                  className="hover:text-[#E87524] transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar with Dynamic Year */}
        <div className="pt-8 border-t border-[#E3DDD2] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {currentYear} RestoHub Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/privacy')}
              className="hover:text-slate-800 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="hover:text-slate-800 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hover:text-[#E87524] font-semibold transition-colors"
            >
              Sign In to Terminal
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  CreditCard,
  Grid,
  ChefHat,
  Smartphone,
  UtensilsCrossed,
  Package,
  BarChart3,
  Coffee,
  Store,
  Building2,
  BookOpen,
  HelpCircle,
  Headphones,
  Printer,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  isAuthenticated?: boolean;
  userEmail?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  navigate,
  isAuthenticated = false,
  userEmail,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'product' | 'solutions' | 'resources' | null>(null);

  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (href: string) => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    navigate(href);
  };

  return (
    <header
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-[#FAF7F2]/95 backdrop-blur-md shadow-xs border-b border-[#E3DDD2]/80 py-3.5'
          : 'bg-[#FAF7F2]/80 backdrop-blur-xs py-5 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <BrandLogo onClick={() => handleNavClick('/')} />

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2 text-[13px] font-semibold text-[#171A18]">
          {/* 1. Product Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'product' ? null : 'product')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                activeDropdown === 'product' || currentPath.startsWith('/product')
                  ? 'text-[#E87524] bg-orange-50/60'
                  : 'text-[#171A18] hover:text-[#E87524]'
              }`}
            >
              <span>Product</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === 'product' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activeDropdown === 'product' && (
              <div className="absolute top-full left-0 mt-2 w-80 p-2.5 rounded-2xl bg-white border border-[#E3DDD2] shadow-xl shadow-black/5 animate-fade-in z-50">
                <div className="px-3 py-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Core Capabilities
                  </span>
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('/product')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Full Product Overview
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Explore all modules in one connected system
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/product#pos')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        POS & Thermal Billing
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Fast orders, GST breakdown, UPI & split payments
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/product#tables')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Grid className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Table & Floor Management
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Live table statuses, running bills & table transfers
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/product#kds')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <ChefHat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Kitchen Display System (KDS)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Real-time order tickets & kitchen station tracking
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/product#waiter')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Waiter Mobile App
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Table-side ordering directly on phones or tablets
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/product#inventory')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Inventory & Low-Stock Alerts
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Ingredients tracking, stock consumption & thresholds
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Solutions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'solutions' ? null : 'solutions')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                activeDropdown === 'solutions' || currentPath.startsWith('/solutions')
                  ? 'text-[#E87524] bg-orange-50/60'
                  : 'text-[#171A18] hover:text-[#E87524]'
              }`}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === 'solutions' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activeDropdown === 'solutions' && (
              <div className="absolute top-full left-0 mt-2 w-80 p-2.5 rounded-2xl bg-white border border-[#E3DDD2] shadow-xl shadow-black/5 animate-fade-in z-50">
                <div className="px-3 py-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    By Restaurant Type
                  </span>
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('/solutions#finedine')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Fine-Dine & Full-Service
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Multi-course dining, table management, split checks
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/solutions#cafe')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Cafés & Bakeries
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Rapid counter service, item modifiers, custom coffee tags
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/solutions#qsr')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Quick Service & Takeaway
                      </div>
                      <div className="text-[11px] text-slate-500">
                        High-volume counter ordering, rapid KDS turnaround
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/solutions#multi-outlet')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Multi-Outlet Restaurant Groups
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Central menu, branch codes, role separation
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Pricing */}
          <button
            onClick={() => handleNavClick('/pricing')}
            className={`px-3 py-2 rounded-xl transition-colors ${
              currentPath === '/pricing'
                ? 'text-[#E87524] bg-orange-50/60'
                : 'text-[#171A18] hover:text-[#E87524]'
            }`}
          >
            Pricing
          </button>

          {/* 4. Resources Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                activeDropdown === 'resources' || currentPath.startsWith('/resources')
                  ? 'text-[#E87524] bg-orange-50/60'
                  : 'text-[#171A18] hover:text-[#E87524]'
              }`}
            >
              <span>Resources</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === 'resources' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activeDropdown === 'resources' && (
              <div className="absolute top-full left-0 mt-2 w-72 p-2.5 rounded-2xl bg-white border border-[#E3DDD2] shadow-xl shadow-black/5 animate-fade-in z-50">
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('/resources')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Product Guide & Docs
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Setup guide, staff workflow & KDS pairing
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/resources#hardware')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Hardware & Printer Setup
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Thermal ESC/POS printers, Bluetooth & LAN
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/resources#faq')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Frequently Asked Questions
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Honest answers about platforms, offline & security
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('/contact')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#E87524]">
                        Contact Support & Sales
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Speak directly with the product team
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right CTA Area */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => handleNavClick('/app')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#171A18] text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <span>Launch POS App</span>
              <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
            </button>
          ) : (
            <>
              {/* Sign In Button */}
              <button
                onClick={() => handleNavClick('/login')}
                className="px-4 py-2 rounded-full border border-[#E3DDD2] hover:border-slate-400 text-xs font-bold text-[#171A18] hover:bg-white transition-all cursor-pointer"
              >
                Sign In
              </button>

              {/* Get Started Orange Button */}
              <button
                onClick={() => handleNavClick('/register')}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-xs font-bold transition-all shadow-sm shadow-orange-600/20 active:scale-[0.98] cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E3DDD2] px-6 py-6 space-y-4 animate-fade-in shadow-xl">
          <div className="space-y-1">
            <button
              onClick={() => handleNavClick('/')}
              className="w-full text-left py-2.5 text-sm font-bold text-slate-900 border-b border-slate-200/50"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('/product')}
              className="w-full text-left py-2.5 text-sm font-bold text-slate-900 border-b border-slate-200/50"
            >
              Product Overview
            </button>
            <button
              onClick={() => handleNavClick('/solutions')}
              className="w-full text-left py-2.5 text-sm font-bold text-slate-900 border-b border-slate-200/50"
            >
              Restaurant Solutions
            </button>
            <button
              onClick={() => handleNavClick('/pricing')}
              className="w-full text-left py-2.5 text-sm font-bold text-slate-900 border-b border-slate-200/50"
            >
              Pricing Plans
            </button>
            <button
              onClick={() => handleNavClick('/resources')}
              className="w-full text-left py-2.5 text-sm font-bold text-slate-900 border-b border-slate-200/50"
            >
              Resources & Hardware
            </button>
            <button
              onClick={() => handleNavClick('/contact')}
              className="w-full text-left py-2.5 text-sm font-bold text-slate-900 border-b border-slate-200/50"
            >
              Contact Support
            </button>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => handleNavClick('/app')}
                className="w-full py-3 rounded-full bg-[#171A18] text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>Launch Restaurant POS</span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick('/register')}
                  className="w-full py-3 rounded-full bg-[#E87524] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Get Started — Free Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavClick('/login')}
                  className="w-full py-3 rounded-full border border-[#E3DDD2] bg-white text-slate-800 text-xs font-bold text-center"
                >
                  Sign In to Terminal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

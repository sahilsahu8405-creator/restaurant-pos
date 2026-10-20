import React, { useEffect } from 'react';
import {
  BookOpen,
  Printer,
  HelpCircle,
  Headphones,
  CheckCircle2,
  ArrowRight,
  Tv,
  Wifi,
  FileText,
} from 'lucide-react';

interface ResourcesPageProps {
  navigate: (path: string) => void;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ navigate }) => {
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

  const hardwareGuides = [
    {
      title: 'ESC/POS Thermal Receipt Printers',
      subtitle: '80mm and 58mm Paper Roll Setup',
      desc: 'RestoHub connects to standard USB, Ethernet (LAN), and Bluetooth thermal printers. For automated raw ESC/POS printing without browser print dialogue popups, run the lightweight RestoHub Printer Agent locally.',
      details: [
        'Works with standard Epson, TVS, Xprinter, and generic thermal receipt printers',
        'Configurable header logos, restaurant GSTIN, and custom footer thank-you messages',
        'Automatic paper cutter command trigger at end of transaction',
      ],
    },
    {
      title: 'Kitchen Display (KDS) Screen Pairing',
      subtitle: 'Zero Wiring Kitchen Setup',
      desc: 'Mount any Android TV, tablet, or monitor in the kitchen. Launch the pairing screen and input your 6-digit kitchen pairing code or direct Restaurant ID to instantly sync tickets.',
      details: [
        'Real-time WebSocket sync with Supabase Realtime broadcast',
        'Station filters: Route tandoor/grill orders to Tandoor and beverages to Bar',
        'Audio chime alert on new tickets keeps cooks alerted during rushes',
      ],
    },
    {
      title: 'Waiter Mobile Devices',
      subtitle: 'Table-Side Ordering Hardware',
      desc: 'No dedicated proprietary handheld terminals required. Waiters can use standard Android or iOS smartphones over the restaurant Wi-Fi.',
      details: [
        'Optimized for one-handed thumb navigation and quick item searches',
        'No app-store install required; runs directly in mobile Chrome, Safari, or as a PWA',
        'Protected staff login credentials prevent accidental access to admin settings',
      ],
    },
  ];

  const faqs = [
    {
      q: 'What is RestoHub?',
      a: 'RestoHub is a unified restaurant operating system designed for restaurants, cafés, quick service counters, and multi-outlet operators. It centralizes POS billing, floor table management, kitchen order display (KDS), waiter ordering, inventory, and business reports into one connected platform.',
    },
    {
      q: 'Which restaurant types does RestoHub support?',
      a: 'RestoHub is built for full-service dining restaurants, cafés, bakeries, quick-service counters (QSR), takeaway spots, cloud kitchens, and multi-branch restaurant chains.',
    },
    {
      q: 'Can RestoHub operate during internet drops?',
      a: 'RestoHub incorporates local storage fallbacks for caching the food menu and maintaining open cart state. A standard broadband or mobile hotspot connection is recommended for real-time kitchen sync and cloud analytics.',
    },
    {
      q: 'How does staff onboarding work?',
      a: 'Restaurant owners can invite staff via email or directly generate a Staff Login ID (e.g. "waiter_ind") and PIN from Settings > Staff Management. Staff log in using the Restaurant ID and their assigned PIN without needing personal email addresses.',
    },
    {
      q: 'How do I download the Windows application?',
      a: 'RestoHub for Windows is available for direct download on our website. It includes the built-in silent ESC/POS hardware printer bridge (port 9100) and kiosk mode for billing counters, with no browser print popups.',
    },
    {
      q: 'How do I get in touch with the product team?',
      a: 'You can reach out through our Contact page or discuss setup directly with our team for custom configurations, multi-branch deployments, or hardware inquiries.',
    },
  ];

  return (
    <div className="pt-28 sm:pt-36 pb-20 px-6 sm:px-8 bg-[#FAF7F2] text-[#171A18]">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
            DOCUMENTATION & GUIDANCE
          </div>
          <h1 className="font-serif-headline text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#171A18]">
            Resources & Hardware Setup
          </h1>
          <p className="text-sm sm:text-base text-[#686A64] leading-relaxed">
            Everything you need to configure your printers, connect kitchen terminals, and train staff for successful daily service.
          </p>
        </div>

        {/* 3 Quick Resource Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-7 rounded-3xl bg-white border border-[#E3DDD2] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E87524] flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#171A18]">Getting Started Guide</h3>
            <p className="text-xs text-[#686A64] leading-relaxed">
              Step-by-step onboarding walkthrough covering restaurant registration, branch codes, category setup, and cashier opening.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E87524] hover:underline pt-2 cursor-pointer"
            >
              <span>Start Onboarding</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-[#E3DDD2] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#171A18]">Hardware & Printers</h3>
            <p className="text-xs text-[#686A64] leading-relaxed">
              Recommended 80mm/58mm thermal receipt printers, raw ESC/POS printer agents, and tablet mounting configurations.
            </p>
            <a
              href="#hardware"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline pt-2"
            >
              <span>View Hardware Specs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-[#E3DDD2] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#171A18]">Direct Support</h3>
            <p className="text-xs text-[#686A64] leading-relaxed">
              Need assistance with menu import, staff training, or multi-branch setup? Connect directly with the RestoHub team.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline pt-2 cursor-pointer"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hardware Deep Dive Section */}
        <div id="hardware" className="space-y-8 pt-4">
          <div className="space-y-2">
            <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
              EQUIPMENT SPECIFICATIONS
            </div>
            <h2 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#171A18]">
              Hardware Compatibility & Setup
            </h2>
            <p className="text-xs sm:text-sm text-[#686A64] max-w-2xl">
              RestoHub was designed for standard, affordable hardware rather than expensive proprietary POS lock-ins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {hardwareGuides.map((item, idx) => (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-white border border-[#E3DDD2] shadow-xs flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-[#171A18]">{item.title}</h3>
                    <p className="text-[11px] font-bold text-[#E87524]">{item.subtitle}</p>
                  </div>
                  <p className="text-xs text-[#686A64] leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {item.details.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-[11px] text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div id="faq" className="max-w-3xl mx-auto space-y-8 pt-6">
          <div className="text-center space-y-2">
            <h2 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#171A18]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#686A64]">
              Honest answers to common questions about capabilities and deployment.
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

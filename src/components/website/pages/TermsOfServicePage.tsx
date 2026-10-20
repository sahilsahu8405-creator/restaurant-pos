import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServicePageProps {
  navigate: (path: string) => void;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ navigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="pt-28 sm:pt-36 pb-20 px-6 sm:px-8 bg-[#FAF7F2] text-[#171A18]">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E87524] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="space-y-3">
          <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
            LEGAL TERMS
          </div>
          <h1 className="font-serif-headline text-3xl sm:text-5xl font-bold tracking-tight text-[#171A18]">
            Terms of Service
          </h1>
          <p className="text-xs text-[#686A64]">
            Last updated: October 20, 2026 • Initial draft for operator review
          </p>
        </div>

        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#E3DDD2] shadow-sm space-y-8 text-xs sm:text-sm text-[#686A64] leading-relaxed">
          
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, registering for, or using the RestoHub restaurant operating system ("RestoHub", the "Service"), you agree to be bound by these Terms of Service. If you are registering an account on behalf of a restaurant, partnership, or corporate entity, you represent that you hold the requisite legal authority to bind that entity.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              2. Permitted Use & Account Integrity
            </h2>
            <p>
              Restaurant owners are responsible for maintaining the confidentiality of their credentials and for all activities carried out under their tenant workspace. Owners may configure sub-accounts (Manager, Cashier, Waiter, Kitchen) and are responsible for enforcing access permissions within their organization.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              3. Service Availability & Offline Operation
            </h2>
            <p>
              RestoHub strives for high continuous availability. However, service may occasionally be subject to scheduled maintenance or network interruptions. RestoHub provides local caching for catalog browsing and cart retention, but reliable cloud synchronization and KDS transmission require active internet connectivity.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              4. Tax Calculations & Compliance Responsibility
            </h2>
            <p>
              RestoHub includes configurable GST and local tax calculation rules. While our calculation engine performs arithmetic with strict paise precision, the restaurant operator remains solely responsible for ensuring tax rates, tax classifications, and invoice details conform to local statutory regulations.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              5. Intellectual Property
            </h2>
            <p>
              RestoHub and its logos, interface designs, codebase, algorithms, and documentation are the intellectual property of RestoHub Technologies. All restaurant menus, customer records, logos, and sales figures remain the exclusive property of the respective restaurant owner.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              6. Modifications to Terms
            </h2>
            <p>
              We reserve the right to revise these terms to reflect evolving features, statutory updates, or security requirements. Operators will be notified of material changes through their restaurant dashboard.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            For legal notices or questions regarding these terms, please contact us through the <button onClick={() => navigate('/contact')} className="text-[#E87524] font-bold hover:underline">Contact Page</button>.
          </div>

        </div>

      </div>
    </div>
  );
};

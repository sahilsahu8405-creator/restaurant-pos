import React, { useEffect } from 'react';
import { Shield, Lock, Database, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyPageProps {
  navigate: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ navigate }) => {
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
            LEGAL & COMPLIANCE
          </div>
          <h1 className="font-serif-headline text-3xl sm:text-5xl font-bold tracking-tight text-[#171A18]">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#686A64]">
            Last updated: October 20, 2026 • Initial draft for operator review
          </p>
        </div>

        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#E3DDD2] shadow-sm space-y-8 text-xs sm:text-sm text-[#686A64] leading-relaxed">
          
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              1. Our Commitment to Restaurant Privacy
            </h2>
            <p>
              RestoHub Technologies ("RestoHub", "we", "us", or "our") builds operating software for restaurants. We treat restaurant data, menu pricing, recipe costs, customer details, and financial reports as strictly confidential property belonging entirely to the restaurant operator.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              2. Data Collected & Processed
            </h2>
            <p>
              When an owner registers a restaurant on RestoHub, we collect basic operational parameters necessary to execute transactions:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Information:</strong> Owner full name, email address, password hash, and optional phone number.</li>
              <li><strong>Restaurant Profile:</strong> Restaurant business name, branch code, currency, tax rates (CGST/SGST), and address.</li>
              <li><strong>Catalog Data:</strong> Menu items, categories, variants, pricing in paise, and raw ingredient inventories.</li>
              <li><strong>Order Transactions:</strong> Table allocations, items ordered, timestamps, invoice totals, and payment tender method (Cash, Card, UPI).</li>
              <li><strong>Staff Profiles:</strong> Staff display name, assigned branch, and system role (Cashier, Waiter, Kitchen). Staff personal emails are not required for terminal access.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              3. Architectural Row-Level Security (RLS)
            </h2>
            <p>
              RestoHub enforces strict multi-tenant isolation at the database layer using PostgreSQL Row-Level Security. Every read, write, or update operation is cryptographically restricted to the authenticated user's verified restaurant tenant ID. No restaurant operator can query, view, or modify data from any other restaurant.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              4. Zero Data Monetization Guarantee
            </h2>
            <p>
              RestoHub does <strong>not</strong> sell, rent, monetize, or broker restaurant customer data, guest phone numbers, dish popularity analytics, or sales figures to third-party marketing brokers, food aggregators, or advertising networks.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              5. Data Retention & Workspace Deletion
            </h2>
            <p>
              Restaurant owners maintain complete ownership of their records. Owners may request a complete export of their menu, sales logs, and customer registries or request full workspace deletion by submitting a verified request to our support team.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-[#171A18]">
              6. Security Safeguards
            </h2>
            <p>
              All communications between restaurant client browsers, kitchen terminals, mobile devices, and our backend are encrypted via Transport Layer Security (TLS 1.3). Passwords are never stored in plaintext and are hashed using industry-standard cryptographic algorithms.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            For specific privacy inquiries or compliance questions, please contact our team via the <button onClick={() => navigate('/contact')} className="text-[#E87524] font-bold hover:underline">Contact Page</button>.
          </div>

        </div>

      </div>
    </div>
  );
};

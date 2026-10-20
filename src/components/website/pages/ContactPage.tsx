import React, { useState } from 'react';
import { Mail, MessageSquare, Building2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface ContactPageProps {
  navigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ navigate }) => {
  const [fullName, setFullName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [outletCount, setOutletCount] = useState('1');
  const [inquiryType, setInquiryType] = useState('sales');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !restaurantName) return;

    setIsSubmitting(true);
    // Simulate honest, reliable submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFullName('');
      setRestaurantName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }, 700);
  };

  return (
    <div className="pt-28 sm:pt-36 pb-20 px-6 sm:px-8 bg-[#FAF7F2] text-[#171A18]">
      <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#E87524]">
            GET IN TOUCH
          </div>
          <h1 className="font-serif-headline text-4xl sm:text-5xl font-bold tracking-tight text-[#171A18]">
            Talk to the RestoHub Team
          </h1>
          <p className="text-sm sm:text-base text-[#686A64]">
            Have questions about running RestoHub in your restaurant, hardware integration, or multi-outlet setup? We are here to help.
          </p>
        </div>

        {/* Main Grid: Form + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
          
          {/* Left Column: Direct Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-7 rounded-3xl bg-white border border-[#E3DDD2] shadow-xs space-y-5">
              <h3 className="font-serif-headline text-2xl font-bold text-[#171A18]">
                How We Can Help
              </h3>
              
              <div className="space-y-4 text-xs text-[#686A64] leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E87524] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-900 block">Restaurant Onboarding</strong>
                    Guidance on structuring categories, table layouts, and branch codes for your specific restaurant concept.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E87524] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-900 block">Hardware Compatibility</strong>
                    Verification of your thermal receipt printers, kitchen display screens, and floor tablets.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E87524] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-900 block">Direct Inquiries</strong>
                    Inquiries are reviewed by the core technical and product team. We typically respond within 1 business day.
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  Ready to launch on your own right away?
                </div>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E87524] hover:underline mt-1 cursor-pointer"
                >
                  <span>Register Your Restaurant Directly</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#E3DDD2] shadow-md shadow-black/5 space-y-6">
              
              {isSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-fade-in text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Inquiry Received
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. A RestoHub product specialist will review your restaurant requirements and contact you via email shortly.
                  </p>
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-3 px-4 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Restaurant / Brand Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder="e.g. Spice Garden Bistro"
                        className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Work Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rahul@spicegarden.in"
                        className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Contact Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Number of Outlets
                      </label>
                      <select
                        value={outletCount}
                        onChange={(e) => setOutletCount(e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                      >
                        <option value="1">1 Outlet (Single Location)</option>
                        <option value="2-4">2 to 4 Outlets</option>
                        <option value="5-10">5 to 10 Outlets</option>
                        <option value="10+">More than 10 Outlets</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Inquiry Topic
                      </label>
                      <select
                        value={inquiryType}
                        onChange={(e) => setInquiryType(e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                      >
                        <option value="sales">Product Consultation & Pricing</option>
                        <option value="hardware">Hardware & Printer Setup</option>
                        <option value="support">Technical Support</option>
                        <option value="other">General Question</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Tell us about your restaurant and operations
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share your restaurant format, number of tables, POS hardware, or specific workflow questions..."
                      className="w-full bg-[#FAF7F2] border border-[#E3DDD2] rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E87524] focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#E87524] hover:bg-[#CC5E15] text-white text-xs font-bold shadow-md shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending inquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Inquiry</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

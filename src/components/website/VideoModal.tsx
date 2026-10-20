import React, { useState } from 'react';
import { X, Play, CreditCard, ChefHat, Smartphone, Grid, CheckCircle2 } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  onGetStarted,
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'kds' | 'tables' | 'waiter'>('pos');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[#171B17] border border-white/20 rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E87524] flex items-center justify-center text-white font-bold text-xs">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                RestoHub Interactive Walkthrough
              </h3>
              <p className="text-xs text-slate-400">
                Live demonstration of the connected restaurant operating system
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Preview Tabs */}
        <div className="grid grid-cols-4 p-2 bg-black/40 border-b border-white/10 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('pos')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'pos'
                ? 'bg-[#E87524] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">POS & Billing</span>
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tables'
                ? 'bg-[#E87524] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Table Management</span>
          </button>
          <button
            onClick={() => setActiveTab('kds')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'kds'
                ? 'bg-[#E87524] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span className="hidden sm:inline">Kitchen KDS</span>
          </button>
          <button
            onClick={() => setActiveTab('waiter')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'waiter'
                ? 'bg-[#E87524] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Waiter App</span>
          </button>
        </div>

        {/* Dynamic Interactive Preview Canvas */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-[#0E120E]">
          {activeTab === 'pos' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#171B17] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">
                    High-Velocity Counter & Dine-In Billing
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">
                    ESC/POS Ready
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px]">Tax Engine</div>
                    <div className="font-bold text-white">CGST 2.5% + SGST 2.5%</div>
                    <div className="text-[11px] text-slate-400">Strict paise accuracy with automatic rounding</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px]">Payment Support</div>
                    <div className="font-bold text-white">Cash, UPI & Card</div>
                    <div className="text-[11px] text-slate-400">Split payments across multiple tenders</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px]">Printer Bridge</div>
                    <div className="font-bold text-white">80mm & 58mm Thermal</div>
                    <div className="text-[11px] text-slate-400">Direct hardware integration via local print agent</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#171B17] border border-white/10 p-5 space-y-4">
                <div className="font-bold text-white text-sm">
                  Interactive Floor & Table Visualizer
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                    <div className="font-black text-emerald-400 text-sm">T-1</div>
                    <div className="text-[9px] text-emerald-300">Available</div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center">
                    <div className="font-black text-rose-400 text-sm">T-2</div>
                    <div className="text-[9px] text-rose-300">Occupied (4)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-center">
                    <div className="font-black text-amber-400 text-sm">T-3</div>
                    <div className="text-[9px] text-amber-300">Billed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center">
                    <div className="font-black text-rose-400 text-sm">T-4</div>
                    <div className="text-[9px] text-rose-300">Occupied (2)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                    <div className="font-black text-emerald-400 text-sm">T-5</div>
                    <div className="text-[9px] text-emerald-300">Available</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-center">
                    <div className="font-black text-purple-400 text-sm">T-6</div>
                    <div className="text-[9px] text-purple-300">Reserved</div>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Track running totals, merge bills, and shift tables seamlessly without losing KOT items or kitchen order sequences.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'kds' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#171B17] border border-white/10 p-5 space-y-4">
                <div className="font-bold text-white text-sm">
                  Dedicated Kitchen Display Station
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-400">#KOT-1097 • Table 2</span>
                      <span className="text-[10px] font-mono text-slate-400">2 min ago</span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      <div>1x Paneer Tikka (Less Spicy)</div>
                      <div>2x Butter Naan</div>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Cooking
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">#KOT-1096 • Table 6</span>
                      <span className="text-[10px] font-mono text-slate-400">8 min ago</span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      <div>2x Chicken Biryani (Special)</div>
                      <div>1x Raita</div>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Ready to Serve
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'waiter' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#171B17] border border-white/10 p-5 space-y-4">
                <div className="font-bold text-white text-sm">
                  Waiter Mobile Order Pad
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Floor staff log in using their secure Staff Login ID or PIN. Floor permissions ensure waiters only punch orders and view assigned tables, without access to financial day reports, owner settings, or restaurant data.
                </p>
                <div className="flex items-center gap-3 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Works smoothly on any smartphone or tablet browser with zero install requirements.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Ready to experience the real system?
          </div>
          <button
            onClick={() => {
              onClose();
              onGetStarted();
            }}
            className="px-5 py-2.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-xs font-bold transition-all shadow-md shadow-orange-600/30 cursor-pointer"
          >
            Launch Free Setup →
          </button>
        </div>

      </div>
    </div>
  );
};

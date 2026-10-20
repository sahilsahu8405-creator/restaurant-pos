import React from 'react';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  ChefHat,
  Grid,
  Users,
  UtensilsCrossed,
  Package,
  Settings,
  Receipt,
  Building2,
  Plus,
} from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onWatchVideo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onWatchVideo,
}) => {
  return (
    <section className="relative pt-28 sm:pt-36 pb-16 lg:pb-24 px-6 sm:px-8 bg-[#FAF7F2] overflow-hidden">
      {/* Subtle warm background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-100/40 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-amber-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <div className="inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-[#686A64]">
                RESTAURANT OPERATING SYSTEM
              </div>

              <h1 className="font-serif-headline text-4xl sm:text-5xl lg:text-[62px] font-bold text-[#171A18] tracking-tight leading-[1.06]">
                Your Restaurant.<br />
                <span className="text-[#171A18]">One Connected</span><br />
                <span className="text-[#171A18]">System.</span>
              </h1>

              <p className="text-sm sm:text-base text-[#686A64] leading-relaxed max-w-lg font-normal">
                Manage orders, tables, kitchen operations, inventory, and performance from one powerful platform built for the way restaurants work.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#E87524] hover:bg-[#CC5E15] text-white text-sm font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onWatchVideo}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-[#E3DDD2] text-[#171A18] text-sm font-bold transition-all shadow-xs cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:bg-[#E87524] transition-colors">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Watch Video</span>
              </button>
            </div>

            {/* Honest Product Guarantees */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs font-semibold text-[#686A64]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>No complex setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Works on all devices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Built for Indian restaurants</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Multi-Device RestoHub Mockup */}
          <div className="lg:col-span-7 relative flex items-center justify-center">
            
            {/* Laptop Mockup Housing RestoHub Dashboard */}
            <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/20 border border-slate-700/60 transition-transform duration-300">
              
              {/* Laptop Top Camera Bar */}
              <div className="flex items-center justify-between pb-2 px-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="text-[11px] font-mono text-slate-400 tracking-wider">
                  app.restohub.in — Connected System
                </div>
                <div className="w-6" />
              </div>

              {/* Laptop Screen Body: RestoHub Real Interface */}
              <div className="bg-[#FAF7F2] rounded-xl overflow-hidden border border-slate-200 text-slate-900 flex min-h-[340px] sm:min-h-[390px] select-none text-[11px]">
                
                {/* Left Mini Sidebar */}
                <div className="w-36 sm:w-44 bg-white border-r border-[#E3DDD2] p-3 flex flex-col justify-between shrink-0 hidden sm:flex">
                  <div className="space-y-3">
                    {/* Brand */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-5 h-5 rounded-md bg-[#E87524] text-white flex items-center justify-center font-bold text-[10px]">
                        R
                      </div>
                      <span className="font-bold text-xs tracking-tight text-slate-900">RestoHub</span>
                    </div>

                    {/* Nav Items */}
                    <div className="space-y-0.5 text-[10px] font-semibold text-slate-600">
                      <div className="px-2 py-1.5 rounded-lg bg-orange-50 text-[#E87524] font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E87524]" />
                        <span>Dashboard</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <span>POS Billing</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <Receipt className="w-3 h-3 text-slate-400" />
                        <span>Orders</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <Grid className="w-3 h-3 text-slate-400" />
                        <span>Table Management</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <ChefHat className="w-3 h-3 text-slate-400" />
                        <span>Kitchen KDS</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <UtensilsCrossed className="w-3 h-3 text-slate-400" />
                        <span>Menu & Prices</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <Package className="w-3 h-3 text-slate-400" />
                        <span>Inventory</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Staff & Permissions</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                        <Settings className="w-3 h-3 text-slate-400" />
                        <span>Settings</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-400">
                    Main Branch • v2.0
                  </div>
                </div>

                {/* Main Dashboard Canvas */}
                <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between overflow-hidden bg-[#FAF7F2]">
                  
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E3DDD2]/70">
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                        Good Evening, Rahul
                      </h4>
                      <p className="text-[9px] text-slate-500">Here is what is happening at your restaurant today</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
                      <span className="px-2 py-1 rounded-md bg-white border border-[#E3DDD2] text-[9px]">
                        Oct 20, 2026
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white border border-[#E3DDD2] text-[9px]">
                        Main Branch
                      </span>
                    </div>
                  </div>

                  {/* 4 Stats Cards */}
                  <div className="grid grid-cols-4 gap-2 my-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E3DDD2] shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-medium">Today's Sales</span>
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">+12%</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">₹24,320</div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E3DDD2] shadow-2xs">
                      <span className="text-[9px] text-slate-500 font-medium block">Total Orders</span>
                      <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">68</div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E3DDD2] shadow-2xs">
                      <span className="text-[9px] text-slate-500 font-medium block">Active Tables</span>
                      <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">12</div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E3DDD2] shadow-2xs">
                      <span className="text-[9px] text-slate-500 font-medium block">Pending Items</span>
                      <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">6</div>
                    </div>
                  </div>

                  {/* Split: Order Activity & Sales Overview Chart */}
                  <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
                    
                    {/* Live Order Activity Table */}
                    <div className="col-span-7 bg-white rounded-xl border border-[#E3DDD2] p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-800 pb-1.5 mb-1 border-b border-slate-100">
                        <span>Order Activity</span>
                        <span className="text-[8px] text-slate-400">Live KOT</span>
                      </div>
                      <div className="space-y-1.5 text-[9px]">
                        <div className="flex items-center justify-between p-1 rounded-md bg-slate-50/80">
                          <div>
                            <span className="font-bold text-slate-800">#1097</span> Paneer Tikka (T2)
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[8px] font-bold">
                            Preparing
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1 rounded-md bg-slate-50/80">
                          <div>
                            <span className="font-bold text-slate-800">#1096</span> Chicken Biryani (T6)
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-bold">
                            Ready
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1 rounded-md bg-slate-50/80">
                          <div>
                            <span className="font-bold text-slate-800">#1095</span> Masala Dosa (T4)
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[8px] font-bold">
                            Preparing
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1 rounded-md bg-slate-50/80">
                          <div>
                            <span className="font-bold text-slate-800">#1094</span> Veg Thali (T1)
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[8px] font-bold">
                            Delivered
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sales Overview Bar Chart */}
                    <div className="col-span-5 bg-white rounded-xl border border-[#E3DDD2] p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-800 pb-1 border-b border-slate-100">
                        <span>Sales Overview</span>
                        <span className="text-[8px] text-slate-400">Today</span>
                      </div>

                      <div className="p-1 rounded-lg bg-orange-50/70 border border-orange-100 text-center my-0.5">
                        <div className="text-[10px] font-extrabold text-[#E87524]">₹5,620</div>
                        <div className="text-[8px] text-slate-500">Peak 1pm - 3pm</div>
                      </div>

                      {/* Mini Bar Graph */}
                      <div className="flex items-end justify-between h-12 pt-1 gap-1 px-1">
                        <div className="w-full bg-slate-200 rounded-t h-[30%]" />
                        <div className="w-full bg-slate-200 rounded-t h-[45%]" />
                        <div className="w-full bg-[#E87524] rounded-t h-[95%]" />
                        <div className="w-full bg-[#E87524] rounded-t h-[75%]" />
                        <div className="w-full bg-slate-200 rounded-t h-[50%]" />
                        <div className="w-full bg-slate-200 rounded-t h-[65%]" />
                        <div className="w-full bg-slate-200 rounded-t h-[40%]" />
                      </div>
                      <div className="flex justify-between text-[7px] text-slate-400 font-mono pt-1">
                        <span>11am</span>
                        <span>2pm</span>
                        <span>5pm</span>
                        <span>8pm</span>
                        <span>11pm</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* Overlapping Mobile Phone Mockup showing Waiter App */}
            <div className="absolute -bottom-6 -right-2 sm:-right-4 w-44 sm:w-52 bg-slate-900 rounded-[28px] p-2 shadow-2xl shadow-black/30 border-2 border-slate-700/80 z-20 transition-transform duration-300 hover:-translate-y-1">
              
              {/* Phone Speaker Notch */}
              <div className="w-16 h-3 bg-black rounded-full mx-auto mb-1.5" />

              {/* Phone Screen: RestoHub Waiter View */}
              <div className="bg-white rounded-[22px] overflow-hidden text-[9px] flex flex-col justify-between h-72 sm:h-80 select-none shadow-inner border border-slate-200">
                
                {/* Header */}
                <div className="bg-[#FAF7F2] p-2 border-b border-[#E3DDD2] flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 text-[10px]">Table 4</span>
                    <span className="text-[8px] text-slate-500 block">4 Guests • Dine-In</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-bold">
                    Active
                  </span>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-[#FAF7F2] border-b border-slate-100 overflow-x-hidden text-[8px]">
                  <span className="px-2 py-0.5 rounded-full bg-[#E87524] text-white font-bold">Starters</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">Mains</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">Breads</span>
                </div>

                {/* Menu Items List */}
                <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-100 bg-[#FAF7F2]">
                    <div>
                      <div className="font-bold text-slate-900">Paneer Tikka</div>
                      <div className="text-[8px] text-slate-500 font-mono">₹280</div>
                    </div>
                    <button className="w-5 h-5 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center font-bold">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-100 bg-[#FAF7F2]">
                    <div>
                      <div className="font-bold text-slate-900">Chicken Biryani</div>
                      <div className="text-[8px] text-slate-500 font-mono">₹320</div>
                    </div>
                    <button className="w-5 h-5 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center font-bold">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-100 bg-[#FAF7F2]">
                    <div>
                      <div className="font-bold text-slate-900">Masala Dosa</div>
                      <div className="text-[8px] text-slate-500 font-mono">₹160</div>
                    </div>
                    <button className="w-5 h-5 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center font-bold">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-100 bg-[#FAF7F2]">
                    <div>
                      <div className="font-bold text-slate-900">Veg Thali</div>
                      <div className="text-[8px] text-slate-500 font-mono">₹220</div>
                    </div>
                    <button className="w-5 h-5 rounded-lg bg-orange-100 text-[#E87524] flex items-center justify-center font-bold">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Bottom Order Bar */}
                <div className="p-2 bg-white border-t border-slate-100">
                  <div className="w-full py-2 px-3 rounded-xl bg-[#E87524] text-white flex items-center justify-between font-bold text-[9px] shadow-sm">
                    <span>2 Items | ₹500</span>
                    <span>View Order →</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

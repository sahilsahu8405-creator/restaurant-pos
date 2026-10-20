import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Users,
  LogOut,
  ArrowRight,
  Shield,
  UtensilsCrossed,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NoMembershipView: React.FC = () => {
  const { user, profile, logout, createRestaurant, acceptStaffInvitation, isLoading, error, clearError } = useAuth();

  const pendingRestName = typeof window !== 'undefined' ? localStorage.getItem('restohub_pending_restaurant_name') || '' : '';
  const pendingCurrency = typeof window !== 'undefined' ? localStorage.getItem('restohub_pending_currency') || 'INR' : 'INR';

  const [mode, setMode] = useState<'options' | 'create_restaurant' | 'accept_invite'>(() => {
    return pendingRestName ? 'create_restaurant' : 'options';
  });

  // Create restaurant fields
  const [restaurantName, setRestaurantName] = useState(pendingRestName);
  const [outletName, setOutletName] = useState('Main Branch');
  const [outletCode, setOutletCode] = useState('MAIN');
  const [currency, setCurrency] = useState(pendingCurrency);
  const [phone, setPhone] = useState('');

  // Invite fields
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState(profile?.fullName || '');

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;
    clearError();
    try {
      await createRestaurant({
        restaurantName: restaurantName.trim(),
        outletName: outletName.trim() || 'Main Branch',
        outletCode: outletCode.trim().toUpperCase() || 'MAIN',
        currency,
        currencySymbol: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'AED' ? 'AED' : '₹',
        fullName: profile?.fullName || user?.email?.split('@')[0],
        phone: phone.trim() || undefined,
      });
      localStorage.removeItem('restohub_pending_restaurant_name');
      localStorage.removeItem('restohub_pending_currency');
    } catch {
      // Error handled in context
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    clearError();
    try {
      await acceptStaffInvitation(token.trim(), fullName.trim());
    } catch {
      // Error handled in context
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 select-none">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Welcome to RestoHub</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Signed in as <strong className="text-slate-200">{user?.email}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs text-left">
            {error}
          </div>
        )}

        {mode === 'options' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
              <strong className="text-white block font-bold">No Active Restaurant Workspace Found</strong>
              <p className="text-slate-400">
                Your authenticated account is not yet associated with any restaurant organization. Please register a new restaurant or accept an invitation from an existing restaurant owner.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('create_restaurant');
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register a New Restaurant (Owner)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('accept_invite');
                }}
                className="w-full py-3 px-4 rounded-2xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Enter Staff Invitation Token</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'create_restaurant' && (
          <form onSubmit={handleCreateRestaurant} className="space-y-4 text-left">
            <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
              Create Restaurant Workspace
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. Saffron Bistro & Grill"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">First Outlet Name</label>
                <input
                  type="text"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  placeholder="Main Branch"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Branch Code</label>
                <input
                  type="text"
                  value={outletCode}
                  onChange={(e) => setOutletCode(e.target.value.toUpperCase())}
                  placeholder="MAIN"
                  required
                  maxLength={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (AED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create & Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {mode === 'accept_invite' && (
          <form onSubmit={handleAcceptInvite} className="space-y-4 text-left">
            <div className="text-xs font-black text-indigo-400 uppercase tracking-wider">
              Accept Staff Invitation
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Invitation Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="inv-1729000000-xyz123"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Your Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enrolling...</span>
                  </>
                ) : (
                  <>
                    <span>Accept Invite</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Sign Out Option */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mx-auto font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

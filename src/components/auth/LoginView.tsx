import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Shield,
  ChefHat,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  Tv,
  Store,
  Copy,
  Check,
  MapPin,
  Monitor,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onOpenInvitation?: () => void;
  onOpenOwnerBootstrap?: () => void;
  onOpenKdsPairing?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const {
    login,
    signUp,
    createRestaurant,
    resetPassword,
    signInWithGoogle,
    acceptStaffInvitation,
    pairKdsTerminal,
    pairKdsWithRestaurantId,
    error,
    clearError,
    isLoading,
  } = useAuth();

  // Active view tab: 'signin' | 'register_owner' | 'invitation' | 'pair_kds'
  const [activeTab, setActiveTab] = useState<'signin' | 'register_owner' | 'invitation' | 'pair_kds'>('signin');

  // Sign In Mode: 'staff' vs 'owner'
  const [signInMode, setSignInMode] = useState<'staff' | 'owner'>('staff');

  // Staff Sign In State
  const [staffRestaurantId, setStaffRestaurantId] = useState('');
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffBranchCode, setStaffBranchCode] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Owner Sign In State
  const [ownerLoginEmail, setOwnerLoginEmail] = useState('');
  const [ownerLoginPassword, setOwnerLoginPassword] = useState('');

  // Password visibility & reset state
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Owner Registration State
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [outletName, setOutletName] = useState('Main Branch');
  const [outletCode, setOutletCode] = useState('MAIN');
  const [currency, setCurrency] = useState('INR');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [createdRestaurantResult, setCreatedRestaurantResult] = useState<{
    restaurantName: string;
    restaurantCode: string;
    outletCode: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Staff Invitation State
  const [inviteToken, setInviteToken] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  // KDS Pairing State (Dual support: Restaurant ID and 6-Digit Code)
  const [kdsPairMode, setKdsPairMode] = useState<'restaurant_id' | 'code'>('restaurant_id');
  const [kdsRestaurantId, setKdsRestaurantId] = useState('');
  const [kdsBranchCode, setKdsBranchCode] = useState('');
  const [kdsStationCode, setKdsStationCode] = useState('');
  const [kdsDeviceName, setKdsDeviceName] = useState('Kitchen Display 1');
  const [pairingCode, setPairingCode] = useState('');

  // Clean URL parameters if contaminated by previous browser form submission, preserving OAuth/recovery tokens
  useEffect(() => {
    const isAuthParams =
      window.location.search.includes('code=') ||
      window.location.search.includes('error=') ||
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('type=recovery');

    if (!isAuthParams && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Prevent browser password autofill heuristics from contaminating non-email fields
  useEffect(() => {
    if (staffBranchCode && staffBranchCode.includes('@')) {
      setStaffBranchCode('');
    }
  }, [staffBranchCode]);

  useEffect(() => {
    if (inviteFullName && inviteFullName.includes('@')) {
      setInviteFullName('');
    }
  }, [inviteFullName]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (signInMode === 'staff') {
        if (!staffRestaurantId.trim()) {
          throw new Error('Please enter your Restaurant ID (e.g. RH-K4A8X2).');
        }
        if (!staffIdentifier.trim()) {
          throw new Error('Please enter your Staff Login ID or email.');
        }
        if (!staffPassword) {
          throw new Error('Please enter your password.');
        }
        await login(
          staffIdentifier.trim(),
          staffPassword,
          staffRestaurantId.trim(),
          staffBranchCode.trim() || undefined
        );
      } else {
        if (!ownerLoginEmail.trim() || !ownerLoginPassword) {
          throw new Error('Please enter your owner email and password.');
        }
        await login(ownerLoginEmail.trim(), ownerLoginPassword);
      }
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleRegisterOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim() || !ownerEmail.trim() || !ownerPassword) return;
    clearError();
    try {
      await signUp(ownerEmail.trim(), ownerPassword, ownerFullName.trim());

      const res = await createRestaurant({
        restaurantName: restaurantName.trim(),
        outletName: outletName.trim() || 'Main Branch',
        outletCode: outletCode.trim().toUpperCase() || 'MAIN',
        currency,
        currencySymbol: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'AED' ? 'AED' : '₹',
        fullName: ownerFullName.trim(),
        phone: primaryPhone.trim() || undefined,
      });

      if (res?.restaurantCode) {
        setCreatedRestaurantResult({
          restaurantName: res.restaurantName,
          restaurantCode: res.restaurantCode,
          outletCode: outletCode.trim().toUpperCase() || 'MAIN',
        });
      }
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    clearError();
    try {
      await acceptStaffInvitation(inviteToken.trim(), inviteFullName.trim(), invitePassword || undefined);
    } catch {
      // Error handled in AuthContext
    }
  };

  const handlePairKds = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (kdsPairMode === 'code') {
        if (!pairingCode.trim()) return;
        await pairKdsTerminal(pairingCode.trim());
      } else {
        if (!kdsRestaurantId.trim()) return;
        await pairKdsWithRestaurantId(kdsRestaurantId.trim(), {
          branchCode: kdsBranchCode.trim() || undefined,
          stationCode: kdsStationCode.trim() || undefined,
          deviceName: kdsDeviceName.trim() || undefined,
        });
      }
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleForgotPassword = async () => {
    clearError();
    if (signInMode === 'staff') {
      if (staffIdentifier.includes('@')) {
        setIsResetting(true);
        try {
          await resetPassword(staffIdentifier.trim());
          setResetSent(true);
          setTimeout(() => setResetSent(false), 5000);
        } catch (err: any) {
          alert(err.message || 'Failed to send reset link');
        } finally {
          setIsResetting(false);
        }
      } else {
        alert(
          'Staff Passwords are securely managed by your Restaurant Owner or Manager.\n\nPlease ask your Manager or Owner to reset your password instantly from Settings > Staff Management.'
        );
      }
      return;
    }

    if (!ownerLoginEmail.trim() || !ownerLoginEmail.includes('@')) {
      alert('Please enter your Owner Email address above first, then click "Forgot password?".');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(ownerLoginEmail.trim());
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to send reset link');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex flex-col justify-between overflow-x-hidden select-none bg-[#0B0F17]">
      {/* Background Restaurant Photo with Ambient Warm Lighting */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=2000&auto=format&fit=crop&q=85')`,
        }}
      >
        {/* Warm atmospheric tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FBF8F3]/95 via-[#FBF8F3]/85 to-black/40 lg:to-black/30" />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />
      </div>

      {/* Top Bar with Brand Taglines */}
      <header className="relative z-10 w-full px-6 lg:px-16 pt-6 sm:pt-8 flex items-center justify-between">
        {/* Brand Logo & Version Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black shadow-md shadow-orange-600/25 shrink-0">
            {/* Stylized Fork / R Logo */}
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M11 2v8a3 3 0 0 1-2 2.83V22H7v-9.17A3 3 0 0 1 5 10V2h2v6h1V2h1v6h1V2h1zm7 0v20h-2V13h-2a3 3 0 0 1-3-3V2h2v7a1 1 0 0 0 1 1h2a2 2 0 0 0 2-2V2h2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-sans">
                RestoHub
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100/90 text-[#EA580C]">
                v2.0
              </span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
              RESTAURANT OPERATING SYSTEM
            </p>
          </div>
        </div>

        {/* Top Right Tagline Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-800">
          <div className="relative pb-1 font-bold text-slate-900">
            Better Operations
            <span className="absolute bottom-0 left-0 w-8 h-0.5 bg-[#EA580C] rounded-full" />
          </div>
          <span className="hover:text-slate-900 transition-colors">Happier Guests</span>
          <span className="hover:text-slate-900 transition-colors">Higher Profits</span>
        </div>
      </header>

      {/* Main Split Section */}
      <main className="relative z-10 w-full px-6 lg:px-16 py-8 sm:py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 max-w-7xl mx-auto">
        
        {/* Left Hero & Feature Highlights */}
        <div className="w-full lg:w-7/12 flex flex-col justify-center space-y-7">
          <div className="space-y-4">
            <div className="inline-block text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
              BUILT FOR MODERN RESTAURANTS
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-slate-900 tracking-tight leading-[1.08]">
              Simpler Operations.<br />
              <span className="text-[#EA580C]">Happier Guests.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
              RestoHub gives you complete control over your restaurant operations — from POS and table management to kitchen coordination, inventory, and financial tracking. All in one place.
            </p>
          </div>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            {/* 1. POS */}
            <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-orange-100/80 text-[#EA580C] flex items-center justify-center mb-2.5">
                <Monitor className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 leading-tight">POS & Billing</h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Fast, simple and reliable billing</p>
            </div>

            {/* 2. Tables */}
            <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-orange-100/80 text-[#EA580C] flex items-center justify-center mb-2.5">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 leading-tight">Table Management</h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Seamless dine-in experience</p>
            </div>

            {/* 3. KDS */}
            <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-orange-100/80 text-[#EA580C] flex items-center justify-center mb-2.5">
                <ChefHat className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 leading-tight">Kitchen KDS</h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Real-time kitchen coordination</p>
            </div>

            {/* 4. Analytics */}
            <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-orange-100/80 text-[#EA580C] flex items-center justify-center mb-2.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 leading-tight">Reports & Analytics</h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Make data-driven decisions</p>
            </div>
          </div>

          {/* Social Proof & Metrics */}
          <div className="flex items-center gap-8 pt-3 border-t border-slate-300/60">
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">1000+</div>
              <div className="text-xs text-slate-500 font-medium">Restaurants</div>
            </div>
            <div className="h-8 w-px bg-slate-300/60" />
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">99.9%</div>
              <div className="text-xs text-slate-500 font-medium">Uptime</div>
            </div>
            <div className="h-8 w-px bg-slate-300/60" />
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">Multi-Branch</div>
              <div className="text-xs text-slate-500 font-medium">Support</div>
            </div>
          </div>
        </div>

        {/* Right Floating Authentication Card */}
        <div className="w-full lg:w-5/12 max-w-lg">
          <div className="bg-[#FAF7F2]/95 backdrop-blur-xl border border-white/80 rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-black/10 space-y-6">
            
            {/* Top 4 Action Pills */}
            <div className="grid grid-cols-4 p-1 rounded-2xl bg-[#EFE9DF] gap-1">
              {/* Tab 1: Sign In */}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setActiveTab('signin');
                }}
                className={`py-2 px-1 sm:px-2 rounded-xl text-center text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'signin'
                    ? 'bg-[#EA580C] text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate w-full text-center">
                  {signInMode === 'staff' ? 'Staff Sign In' : 'Owner Login'}
                </span>
              </button>

              {/* Tab 2: Register Restaurant */}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setActiveTab('register_owner');
                }}
                className={`py-2 px-1 sm:px-2 rounded-xl text-center text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'register_owner'
                    ? 'bg-[#EA580C] text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate w-full text-center">Register Restaurant</span>
              </button>

              {/* Tab 3: Have Invite? */}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setActiveTab('invitation');
                }}
                className={`py-2 px-1 sm:px-2 rounded-xl text-center text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'invitation'
                    ? 'bg-[#EA580C] text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate w-full text-center">Have Invite?</span>
              </button>

              {/* Tab 4: Pair KDS */}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setActiveTab('pair_kds');
                }}
                className={`py-2 px-1 sm:px-2 rounded-xl text-center text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'pair_kds'
                    ? 'bg-[#EA580C] text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tv className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate w-full text-center">Pair KDS</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Password Reset Notice */}
            {resetSent && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>Password reset email sent! Please check your inbox.</div>
              </div>
            )}

            {/* TAB 1: SIGN IN (STAFF OR OWNER) */}
            {activeTab === 'signin' && (
              <div className="space-y-5">
                {/* Header with Title and Secure Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                      Welcome Back
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {signInMode === 'owner'
                        ? 'Sign in with your registered owner email to manage your restaurant workspaces.'
                        : 'Sign in with your Restaurant ID, login credentials, and PIN to access your terminal.'}
                    </p>
                  </div>

                  {/* RLS Badge */}
                  <div className="shrink-0 p-2 rounded-xl bg-orange-100/70 border border-orange-200/60 flex items-center gap-2 text-right">
                    <div className="w-6 h-6 rounded-lg bg-orange-200/80 text-[#EA580C] flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[10px] leading-tight text-left">
                      <span className="font-extrabold text-[#EA580C] block">Secure & Private</span>
                      <span className="text-slate-500 text-[9px]">Row Level Security</span>
                    </div>
                  </div>
                </div>

                {/* Staff vs Owner Sub-toggle */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-[#EFE9DF] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setSignInMode('staff');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      signInMode === 'staff'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setSignInMode('owner');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      signInMode === 'owner'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Owner Login</span>
                  </button>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  {signInMode === 'staff' ? (
                    <>
                      {/* Restaurant ID */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800">
                            Restaurant ID <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">e.g. RH-K4A8X2</span>
                        </div>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            name="restaurant_id_scope"
                            id="staff_rest_id_input"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={staffRestaurantId}
                            onChange={(e) => setStaffRestaurantId(e.target.value.toUpperCase())}
                            placeholder="RH-XXXXXX"
                            required
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 pl-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-mono uppercase tracking-wider font-bold"
                          />
                        </div>
                      </div>

                      {/* Staff Login ID or Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Staff Login ID or Email <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            name="staff_username"
                            id="staff_username_input"
                            autoComplete="username"
                            value={staffIdentifier}
                            onChange={(e) => setStaffIdentifier(e.target.value)}
                            placeholder="e.g. waiter_ind or staff@spice.com"
                            required
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 pl-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* Staff Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800">
                            Password <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={isResetting}
                            className="text-xs text-[#EA580C] hover:underline font-bold"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="staff_password"
                            id="staff_password_input"
                            autoComplete="current-password"
                            value={staffPassword}
                            onChange={(e) => setStaffPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 pl-10 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Optional Branch Code */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800">
                            Branch Code <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">e.g. IND, KOR, MAIN</span>
                        </div>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            name="staff_branch_scope"
                            id="staff_branch_input"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={staffBranchCode}
                            onChange={(e) => setStaffBranchCode(e.target.value.toUpperCase())}
                            placeholder="Leave blank for assigned branch"
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 pl-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-mono uppercase font-medium"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Owner Email Address */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Owner Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={ownerLoginEmail}
                            onChange={(e) => setOwnerLoginEmail(e.target.value)}
                            placeholder="rahulresto@gmail.com"
                            required
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 pl-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* Owner Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800">
                            Password <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={isResetting}
                            className="text-xs text-[#EA580C] hover:underline font-bold"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={ownerLoginPassword}
                            onChange={(e) => setOwnerLoginPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 pl-10 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Primary Orange Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-black shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>{signInMode === 'staff' ? 'Sign In as Staff' : 'Sign In as Owner'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Google OAuth Option for Owners */}
                  {signInMode === 'owner' && (
                    <div className="pt-2 space-y-3">
                      <div className="relative flex items-center justify-center">
                        <div className="border-t border-slate-300/80 w-full" />
                        <span className="bg-[#FAF7F2] px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          OR CONTINUE WITH
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          clearError();
                          try {
                            await signInWithGoogle();
                          } catch {
                            // Error handled in AuthContext
                          }
                        }}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-bold shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* TAB 2: REGISTER RESTAURANT */}
            {activeTab === 'register_owner' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                    Register Restaurant
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Create a secure, isolated workspace for your restaurant and launch your first branch.
                  </p>
                </div>

                {createdRestaurantResult ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Restaurant Successfully Registered!</span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Your workspace for <strong className="text-slate-900">{createdRestaurantResult.restaurantName}</strong> is active.
                        Share this unique Restaurant ID with your staff:
                      </p>

                      <div className="p-3 rounded-xl bg-white border border-emerald-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Restaurant ID</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black text-emerald-600 tracking-wider">
                              {createdRestaurantResult.restaurantCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(createdRestaurantResult.restaurantCode);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 3000);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all"
                              title="Copy Restaurant ID"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signin');
                        setSignInMode('owner');
                        setCreatedRestaurantResult(null);
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-bold shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Proceed to Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterOwner} className="space-y-3" autoComplete="off">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Owner Full Name</label>
                        <input
                          type="text"
                          value={ownerFullName}
                          onChange={(e) => setOwnerFullName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={primaryPhone}
                          onChange={(e) => setPrimaryPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Owner Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@myrestaurant.com"
                        required
                        className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Restaurant Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder="e.g. Spice Garden Bistro"
                        required
                        className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Initial Branch</label>
                        <input
                          type="text"
                          value={outletName}
                          onChange={(e) => setOutletName(e.target.value)}
                          placeholder="Main Branch"
                          className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="INR">₹ INR (India)</option>
                          <option value="USD">$ USD (US)</option>
                          <option value="EUR">€ EUR (Europe)</option>
                          <option value="AED">AED (UAE)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer mt-3"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Provisioning Restaurant Workspace...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Restaurant Workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: HAVE INVITE? */}
            {activeTab === 'invitation' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                    Accept Staff Invitation
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the invitation token issued by your restaurant owner to activate your workspace access.
                  </p>
                </div>

                <form onSubmit={handleAcceptInvite} className="space-y-4" autoComplete="off">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Invitation Token</label>
                    <input
                      type="text"
                      name="invite_auth_token"
                      id="invite_auth_token"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value.trim())}
                      placeholder="inv-1729000000-abcdef"
                      required
                      className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Your Full Name</label>
                    <input
                      type="text"
                      name="invitee_display_name"
                      id="invitee_display_name"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="e.g. Sunil Verma"
                      className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Set Your Password (if first time logging in)
                    </label>
                    <input
                      type="password"
                      name="invitee_security_key"
                      id="invitee_security_key"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !inviteToken.trim()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-black shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enrolling account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Workspace Access</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: PAIR KDS */}
            {activeTab === 'pair_kds' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                    Pair Kitchen Display
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect this display terminal to your kitchen station using your Restaurant ID or 6-digit pairing code.
                  </p>
                </div>

                {/* Sub-mode pill selector */}
                <div className="grid grid-cols-2 p-1 bg-[#F4EFEA] rounded-2xl border border-slate-200/90 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setKdsPairMode('restaurant_id');
                      clearError();
                    }}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer text-center ${
                      kdsPairMode === 'restaurant_id'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pair with Restaurant ID
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKdsPairMode('code');
                      clearError();
                    }}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer text-center ${
                      kdsPairMode === 'code'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    6-Digit Code
                  </button>
                </div>

                <form onSubmit={handlePairKds} className="space-y-4">
                  {kdsPairMode === 'restaurant_id' ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-800">
                            Restaurant ID <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">e.g. RH-K4A8X2</span>
                        </div>
                        <input
                          type="text"
                          value={kdsRestaurantId}
                          onChange={(e) => setKdsRestaurantId(e.target.value.toUpperCase())}
                          placeholder="RH-K4A8X2"
                          required
                          autoFocus
                          className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-3 text-sm font-mono font-bold tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Branch Code <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={kdsBranchCode}
                            onChange={(e) => setKdsBranchCode(e.target.value.toUpperCase())}
                            placeholder="MAIN"
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Station Code <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={kdsStationCode}
                            onChange={(e) => setKdsStationCode(e.target.value.toUpperCase())}
                            placeholder="MAIN or All"
                            className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Terminal / Screen Name <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={kdsDeviceName}
                          onChange={(e) => setKdsDeviceName(e.target.value)}
                          placeholder="e.g. Kitchen Display 1"
                          className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 text-center">
                        6-Digit Pairing Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pairingCode}
                        onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="482910"
                        required
                        autoFocus
                        className="w-full bg-[#F4EFEA] border border-slate-200/90 rounded-2xl py-4 text-center font-mono text-3xl font-black tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  <p className="p-3.5 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-500 leading-relaxed">
                    Pairing securely binds this physical screen to your kitchen orders and live ticket stream in real-time. Kitchen staff can also sign in directly using staff credentials under the Staff Sign In tab.
                  </p>

                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      (kdsPairMode === 'code' ? pairingCode.length < 6 : !kdsRestaurantId.trim())
                    }
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-black shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Pairing device...</span>
                      </>
                    ) : (
                      <>
                        <span>Pair Display Terminal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Bottom Security Tag */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium text-center">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Your data is securely isolated with <strong className="text-slate-600">Supabase</strong> Row Level Security
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Accent Strip */}
      <footer className="relative z-10 w-full px-6 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-400">
        <span>© {new Date().getFullYear()} RestoHub Operating System</span>
        <span className="font-semibold text-slate-500">Fast • Reliable • Multi-Tenant</span>
      </footer>
    </div>
  );
};

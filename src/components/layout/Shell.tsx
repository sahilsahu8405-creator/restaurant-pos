import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PosView } from '../pos/PosView';
import { OrdersView } from '../orders/OrdersView';
import { TablesView } from '../tables/TablesView';
import { WaiterView } from '../waiter/WaiterView';
import { KdsView } from '../kds/KdsView';
import { OwnerDashboard } from '../dashboard/OwnerDashboard';
import { ReportsView } from '../reports/ReportsView';
import { InventoryView } from '../inventory/InventoryView';
import { ExpensesView } from '../expenses/ExpensesView';
import { SuperAdminView } from '../superadmin/SuperAdminView';
import { SettingsView } from '../settings/SettingsView';
import { MenuManagementView } from '../menu/MenuManagementView';
import { LoginView } from '../auth/LoginView';
import { NoMembershipView } from '../auth/NoMembershipView';
import { WorkspaceSelectorModal } from '../auth/WorkspaceSelectorModal';
import { StaffInvitationModal } from '../auth/StaffInvitationModal';
import { OwnerBootstrapModal } from '../auth/OwnerBootstrapModal';
import { KdsPairingModal } from '../auth/KdsPairingModal';
import { ResetPasswordModal } from '../auth/ResetPasswordModal';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Shield,
  ArrowLeft,
  LogOut,
  Smartphone,
  ChefHat,
  Building2,
  Tv,
  Store,
  ChevronDown,
  UtensilsCrossed,
  Sun,
  Moon,
} from 'lucide-react';

interface ShellProps {
  initialAuthTab?: 'signin' | 'register_owner' | 'invitation' | 'pair_kds';
  onBackToWebsite?: () => void;
}

export const Shell: React.FC<ShellProps> = ({
  initialAuthTab = 'signin',
  onBackToWebsite,
}) => {
  const {
    workspace,
    setWorkspace,
    currentView,
    setCurrentView,
    toasts,
    dismissToast,
    activeOutlet,
    restaurant,
    isDark,
    toggleTheme,
  } = useApp();
  const {
    session,
    user,
    profile,
    role,
    isSuperAdmin,
    kdsDevice,
    memberships,
    membership,
    isAccountDeactivated,
    isLoading,
    logout,
    isPasswordRecovery,
    setIsPasswordRecovery,
  } = useAuth();

  // Workspace selector state
  const [isWorkspaceSelectorOpen, setIsWorkspaceSelectorOpen] = useState(false);
  const [isConfirmSignOutOpen, setIsConfirmSignOutOpen] = useState(false);

  // Auth Modals state
  const [isInvitationOpen, setIsInvitationOpen] = useState(false);
  const [isOwnerBootstrapOpen, setIsOwnerBootstrapOpen] = useState(false);
  const [isKdsPairingOpen, setIsKdsPairingOpen] = useState(false);

  // 0. Initial Session Restoration State
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
          <UtensilsCrossed className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-extrabold text-white">Restoring Authorized Session...</div>
        <p className="text-xs text-slate-400 mt-1">Verifying tenant cryptographic credentials and branch access</p>
      </div>
    );
  }

  // Password Recovery State -> Show dedicated modal to set new password
  if (isPasswordRecovery) {
    return (
      <ResetPasswordModal
        isOpen={true}
        onClose={async () => {
          setIsPasswordRecovery(false);
          await logout();
        }}
      />
    );
  }

  // 1. Unauthenticated State -> Render Production Login Screen
  if (!session && !kdsDevice) {
    return (
      <>
        <LoginView
          initialTab={initialAuthTab}
          onOpenInvitation={() => setIsInvitationOpen(true)}
          onOpenOwnerBootstrap={() => setIsOwnerBootstrapOpen(true)}
          onOpenKdsPairing={() => setIsKdsPairingOpen(true)}
          onBackToWebsite={onBackToWebsite}
        />
        <StaffInvitationModal
          isOpen={isInvitationOpen}
          onClose={() => setIsInvitationOpen(false)}
        />
        <OwnerBootstrapModal
          isOpen={isOwnerBootstrapOpen}
          onClose={() => setIsOwnerBootstrapOpen(false)}
        />
        <KdsPairingModal
          isOpen={isKdsPairingOpen}
          onClose={() => setIsKdsPairingOpen(false)}
        />
      </>
    );
  }

  // 2. Account Deactivated State
  if (isAccountDeactivated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 text-center select-none">
        <AlertTriangle className="w-14 h-14 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-black text-white">Staff Account Deactivated</h1>
        <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
          Your staff access to <strong className="text-white">{membership?.restaurantName || 'this restaurant'}</strong> has been deactivated by the restaurant owner.
          If this was in error, please contact your restaurant administrator.
        </p>
        <div className="flex gap-3 mt-6">
          {memberships.length > 1 && (
            <button
              onClick={() => setIsWorkspaceSelectorOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors"
            >
              Switch Workspace
            </button>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
        <WorkspaceSelectorModal
          isOpen={isWorkspaceSelectorOpen}
          onClose={() => setIsWorkspaceSelectorOpen(false)}
        />
      </div>
    );
  }

  // 3. Authenticated User with No Memberships (and not platform super admin)
  if (session && memberships.length === 0 && !isSuperAdmin && !kdsDevice) {
    return <NoMembershipView />;
  }

  // 4. Platform Super Admin Workspace (Guarded by isSuperAdmin)
  if (workspace === 'superadmin') {
    if (!isSuperAdmin) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 text-center">
          <Shield className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
          <h1 className="text-xl font-black">Access Denied: Super Admin Only</h1>
          <p className="text-xs text-slate-400 mt-2 max-w-md">
            This portal is restricted to platform multi-tenant administrators. Your account does not have platform-level clearance.
          </p>
          <button
            onClick={() => setWorkspace('restaurant')}
            className="mt-6 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500"
          >
            Return to Restaurant App
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100">
        <header className="h-14 px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">RestoHub Platform Admin</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-purple-900 text-purple-300">
                  Restricted SaaS Portal
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Multi-Tenant Management Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {memberships.length > 0 && (
              <button
                onClick={() => {
                  setWorkspace('restaurant');
                  setCurrentView('pos');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Restaurant App</span>
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          <SuperAdminView />
        </div>
      </div>
    );
  }

  // 5. Isolated WAITER Workspace (No Sidebar, No Management Navigation, Scoped to Assigned Outlet)
  if (role === 'waiter') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
        <header className="h-14 px-3 sm:px-4 bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {membership?.restaurantName || restaurant?.name || 'RestoHub'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  Waiter
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{activeOutlet?.name || 'Assigned Branch'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {memberships.length > 1 && (
              <button
                type="button"
                onClick={() => setIsWorkspaceSelectorOpen(true)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-blue-500" />
                <span>Switch Restaurant</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                {profile?.fullName || user?.email}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Verified Floor Staff
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmSignOutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-xs font-bold transition-all shrink-0 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <WaiterView />
        </main>

        <WorkspaceSelectorModal
          isOpen={isWorkspaceSelectorOpen}
          onClose={() => setIsWorkspaceSelectorOpen(false)}
        />

        {/* Sign Out Confirmation Modal to prevent accidental logouts */}
        {isConfirmSignOutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sign Out?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to exit your active shift?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSignOutOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Stay Working
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmSignOutOpen(false);
                    logout();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm shadow-rose-600/30"
                >
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 6. Isolated KITCHEN DISPLAY SYSTEM (KDS) Workspace (No Management Navigation, Scoped to Station)
  if (role === 'kitchen') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
        <header className="h-14 px-3 sm:px-4 bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {kdsDevice ? <Tv className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {kdsDevice
                    ? (kdsDevice.restaurantName ? `${kdsDevice.deviceName} • ${kdsDevice.restaurantName}` : kdsDevice.deviceName)
                    : membership?.restaurantName || 'Kitchen Display System'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                  {kdsDevice ? 'Paired' : 'Kitchen'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{activeOutlet?.name || kdsDevice?.outletName || 'Assigned Kitchen Station'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {memberships.length > 1 && !kdsDevice && (
              <button
                type="button"
                onClick={() => setIsWorkspaceSelectorOpen(true)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-purple-500" />
                <span>Switch Restaurant</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                {kdsDevice ? kdsDevice.deviceName : profile?.fullName || user?.email}
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                Kitchen Scope Active
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmSignOutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-xs font-bold transition-all shrink-0 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{kdsDevice ? 'Disconnect' : 'Sign Out'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <KdsView />
        </main>

        <WorkspaceSelectorModal
          isOpen={isWorkspaceSelectorOpen}
          onClose={() => setIsWorkspaceSelectorOpen(false)}
        />

        {/* Confirmation Modal for KDS / Kitchen */}
        {isConfirmSignOutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {kdsDevice ? 'Disconnect Terminal?' : 'Sign Out?'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {kdsDevice
                      ? 'Are you sure you want to disconnect this Kitchen display terminal?'
                      : 'Are you sure you want to sign out of the kitchen display?'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSignOutOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Stay Connected
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmSignOutOpen(false);
                    logout();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm shadow-rose-600/30"
                >
                  {kdsDevice ? 'Yes, Disconnect' : 'Yes, Sign Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 7. Normal Restaurant Shell for OWNER and MANAGER
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <OwnerDashboard />;
      case 'pos':
        return <PosView />;
      case 'orders':
        return <OrdersView />;
      case 'tables':
        return <TablesView />;
      case 'waiter':
        return <WaiterView />;
      case 'kds':
        return <KdsView />;
      case 'menu':
        return <MenuManagementView />;
      case 'inventory':
        return <InventoryView />;
      case 'expenses':
        return <ExpensesView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <PosView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onOpenWorkspaceSelector={() => setIsWorkspaceSelectorOpen(true)} />
        <div className="flex-1 flex overflow-hidden relative">
          {renderCurrentView()}
        </div>
      </div>

      {/* Workspace Selector Modal */}
      <WorkspaceSelectorModal
        isOpen={isWorkspaceSelectorOpen}
        onClose={() => setIsWorkspaceSelectorOpen(false)}
      />

      {/* Interactive Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white dark:bg-emerald-950 dark:border-emerald-800 border-slate-800'
                : toast.type === 'warning'
                ? 'bg-amber-900 text-white border-amber-800'
                : toast.type === 'error'
                ? 'bg-red-900 text-white border-red-800'
                : 'bg-slate-900 text-white dark:bg-slate-800 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : toast.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

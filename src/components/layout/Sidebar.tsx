import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  Grid,
  ChefHat,
  BarChart3,
  Package,
  Wallet,
  Smartphone,
  Settings,
  ChevronRight,
  Shield,
  PanelLeftClose,
  PanelLeft,
  X,
  LogOut,
} from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, profile, logout, isSuperAdmin, membership } = useAuth();
  const {
    restaurant,
    currentView,
    setCurrentView,
    activeRole,
    setActiveRole,
    settings,
    setWorkspace,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('restohub_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('restohub_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const isKdsEnabled = settings?.enableKds ?? true;
  const isInventoryEnabled = settings?.enableInventory ?? true;
  const isTableEnabled = settings?.enableTableManagement ?? true;

  interface NavItem {
    view: AppView;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { view: 'dashboard', label: 'Owner Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { view: 'pos', label: 'POS Billing', icon: UtensilsCrossed },
        { view: 'orders', label: 'Orders', icon: Receipt },
        ...(isTableEnabled ? [{ view: 'tables' as AppView, label: 'Table Management', icon: Grid }] : []),
        { view: 'waiter', label: 'Waiter App', icon: Smartphone },
        ...(isKdsEnabled ? [{ view: 'kds' as AppView, label: 'Kitchen KDS', icon: ChefHat }] : []),
      ],
    },
    {
      title: 'Catalog & Stock',
      items: [
        { view: 'menu', label: 'Menu & Prices', icon: UtensilsCrossed },
        ...(isInventoryEnabled ? [{ view: 'inventory' as AppView, label: 'Inventory & Stock', icon: Package }] : []),
      ],
    },
    {
      title: 'Financials',
      items: [
        { view: 'expenses', label: 'Expenses & Day Closing', icon: Wallet },
        { view: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Administration',
      items: [
        { view: 'settings', label: 'Restaurant Settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col h-screen select-none shrink-0 transition-all duration-200 bg-white dark:bg-[#121824] border-r border-slate-200 dark:border-slate-800 ${
          isMobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand Header & Collapse Toggle */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'md:justify-center w-full' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white truncate">
                    RestoHub
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                    POS
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  {membership?.restaurantName || restaurant?.name || 'Restaurant'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Drawer Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Menu"
            aria-label="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {isCollapsed && (
        <div className="py-2 px-3 border-b border-slate-100 dark:border-slate-800/60 flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-thin">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-0.5">
            {!isCollapsed && (
              <span className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {sec.title}
              </span>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <div key={item.view} className="relative group">
                  <button
                    onClick={() => {
                      setCurrentView(item.view);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center h-10 px-0' : 'justify-between px-3 py-2'
                    } rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                    aria-label={item.label}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-75 shrink-0" />}
                  </button>

                  {/* Tooltip on hover/focus when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / Role Profile Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <div
          className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 flex items-center ${
            isCollapsed && !isMobileMenuOpen ? 'flex-col gap-2' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {((profile?.fullName || user?.email || 'AM').substring(0, 2)).toUpperCase()}
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {profile?.fullName || user?.email?.split('@')[0] || 'Staff User'}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 capitalize font-medium">
                  {activeRole}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            title="Sign Out of RestoHub"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {isMobileMenuOpen && (
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900/60 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Shift</span>
          </button>
        )}

        {/* Separated Platform Administration Workspace Switcher (Visible only to Platform Super Admins) */}
        {isSuperAdmin && (!isCollapsed ? (
          <button
            onClick={() => {
              setWorkspace('superadmin');
              setCurrentView('superadmin');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-[11px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-colors"
            title="Switch to RestoHub Platform SaaS Management"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="truncate">Platform Admin Workspace →</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setWorkspace('superadmin');
              setCurrentView('superadmin');
            }}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-colors"
            title="Switch to RestoHub Platform SaaS Management"
          >
            <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </button>
        ))}
      </div>
    </aside>
    </>
  );
};

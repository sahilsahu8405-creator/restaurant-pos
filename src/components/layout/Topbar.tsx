import React, { useState, useEffect } from 'react';
import {
  Search,
  Moon,
  Sun,
  Store,
  Bell,
  Maximize2,
  Minimize2,
  Users,
  Wifi,
  WifiOff,
  Menu,
  ChevronDown,
  UtensilsCrossed,
  Check,
  Plus,
  Minus,
  X,
  Clock,
  Layers,
  Building2,
  LogOut,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { localRepository } from '../../services/localRepository';
import { DiningTable, Order, OrderType } from '../../types';
import { formatPaise } from '../../utils/currency';
import { NotificationDrawer } from './NotificationDrawer';

interface TopbarProps {
  onOpenWorkspaceSelector?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenWorkspaceSelector }) => {
  const { role, authorizedOutletId, membership, memberships, profile, user, logout } = useAuth();
  const [isConfirmSignOutOpen, setIsConfirmSignOutOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const {
    isDark,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    orderType,
    setOrderType,
    restaurant,
    activeOutlet,
    setActiveOutlet,
    selectedTable,
    guestCount,
    setGuestCount,
    openTableForBilling,
    pendingTableOrders,
    setPendingTableOrders,
    cartItems,
    activeExistingOrderId,
    currentView,
    addToast,
    setIsMobileMenuOpen,
  } = useApp();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [unservedNotifCount, setUnservedNotifCount] = useState<number>(0);

  const refreshNotifCount = async () => {
    try {
      const list = await localRepository.getKitchenNotifications(activeOutlet?.id);
      setUnservedNotifCount(list.filter((n) => !n.served).length);
    } catch {
      // Ignore
    }
  };

  const refreshTablesAndOrders = async () => {
    if (activeOutlet) {
      const [tList, oList] = await Promise.all([
        localRepository.getTables(activeOutlet.id),
        localRepository.getOrders(activeOutlet.id),
      ]);
      setTables(tList);
      setActiveOrders(oList.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'));
    }
  };

  useEffect(() => {
    refreshTablesAndOrders();
    refreshNotifCount();
    const unsubscribe = localRepository.subscribe(() => {
      refreshTablesAndOrders();
      refreshNotifCount();
    });

    const handleNotifUpdate = () => {
      refreshNotifCount();
    };

    window.addEventListener('restohub:food-ready-notification', handleNotifUpdate);
    window.addEventListener('restohub:kitchen-notification-change', handleNotifUpdate);
    window.addEventListener('restohub:operational-change', handleNotifUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('restohub:food-ready-notification', handleNotifUpdate);
      window.removeEventListener('restohub:kitchen-notification-change', handleNotifUpdate);
      window.removeEventListener('restohub:operational-change', handleNotifUpdate);
    };
  }, [activeOutlet, currentView]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('RestoHub connection restored. Cloud sync active.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('Working offline. Local persistence engine active.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const orderTypes: { type: OrderType; label: string }[] = [
    { type: 'dine_in', label: 'Dine-in' },
    { type: 'takeaway', label: 'Takeaway' },
    { type: 'counter', label: 'Counter' },
    { type: 'delivery', label: 'Delivery' },
  ];

  const handleSelectTableFromPopover = async (tbl: DiningTable) => {
    if (cartItems.length > 0 && !activeExistingOrderId && selectedTable?.id !== tbl.id) {
      const confirmSwitch = window.confirm(
        'You have unsaved items in the current cart. Switch table and start an order for Table ' +
          tbl.tableNumber +
          '?'
      );
      if (!confirmSwitch) return;
    }

    setIsTablePopoverOpen(false);
    await openTableForBilling(tbl);
  };

  // Group sections
  const sections = Array.from(new Set(tables.map((t) => t.section).filter(Boolean)));
  const filteredTables = selectedSectionFilter === 'all'
    ? tables
    : tables.filter((t) => t.section === selectedSectionFilter);

  // Helper to find table's running bill amount
  const getTableRunningBill = (tableId: string): number | null => {
    const tableActiveOrders = activeOrders.filter((o) => o.tableId === tableId);
    if (tableActiveOrders.length === 0) return null;
    return tableActiveOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  };

  return (
    <>
      <header className="h-16 px-3 sm:px-6 bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3 select-none transition-colors duration-200 shrink-0 relative z-30">
        <div className="flex items-center gap-2 flex-1 max-w-xs sm:max-w-md">
          {/* Mobile Hamburger Drawer Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-8 sm:pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Center Controls: Single Authoritative Contextual Control in POS */}
        {currentView === 'pos' && (
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Order Type Toggle */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {orderTypes.map((ot) => (
                <button
                  key={ot.type}
                  onClick={() => setOrderType(ot.type)}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    orderType === ot.type
                      ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ot.label}
                </button>
              ))}
            </div>

            {/* SINGLE COMBINED DINE-IN TABLE + GUESTS CONTROL */}
            {orderType === 'dine_in' && (
              <div className="relative">
                <button
                  type="button"
                  id="pos-combined-table-selector"
                  onClick={() => setIsTablePopoverOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                    isTablePopoverOpen
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/70 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                  }`}
                >
                  <span className="font-extrabold flex items-center gap-1">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Table: {selectedTable ? selectedTable.tableNumber : 'Select'}</span>
                  </span>
                  <span className={isTablePopoverOpen ? 'text-blue-200' : 'text-blue-300 dark:text-blue-700'}>|</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 text-blue-500 ${
                      isTablePopoverOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Combined Table & Guest Selection Popover Dropdown */}
                {isTablePopoverOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsTablePopoverOpen(false)}
                    />
                    <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[340px] sm:w-[420px] bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 z-50 animate-fade-in text-xs">
                      {/* Active Table Details Header */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {selectedTable ? `Table ${selectedTable.tableNumber}` : 'No Table Selected'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              • {selectedTable?.section || 'Main Hall'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Capacity: {selectedTable?.seatingCapacity || 4} Seats
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            selectedTable?.status === 'available'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {selectedTable?.status === 'available' ? '🟢 Available' : '🔵 Occupied'}
                        </span>
                      </div>

                      {/* Guest Count Selector */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            <span>Party Size / Guests</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                              className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black text-sm text-blue-600 dark:text-blue-400 min-w-5 text-center">
                              {guestCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setGuestCount(guestCount + 1)}
                              className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Guest Count Pills */}
                        <div className="grid grid-cols-7 gap-1">
                          {[1, 2, 3, 4, 5, 6, 8].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setGuestCount(num)}
                              className={`py-1.5 rounded-xl font-bold text-xs transition-all ${
                                guestCount === num
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {num}p
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Table Switcher Grid */}
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Switch Table
                          </span>
                          {/* Section Pills */}
                          {sections.length > 1 && (
                            <div className="flex gap-1 overflow-x-auto scrollbar-none">
                              <button
                                type="button"
                                onClick={() => setSelectedSectionFilter('all')}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  selectedSectionFilter === 'all'
                                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                All
                              </button>
                              {sections.map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => setSelectedSectionFilter(sec)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                                    selectedSectionFilter === sec
                                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                  }`}
                                >
                                  {sec}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Tables Grid */}
                        <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                          {filteredTables.map((tbl) => {
                            const isSelected = selectedTable?.id === tbl.id;
                            const isOccupied = tbl.status === 'occupied';
                            const runningBill = getTableRunningBill(tbl.id);

                            return (
                              <button
                                key={tbl.id}
                                type="button"
                                onClick={() => handleSelectTableFromPopover(tbl)}
                                className={`p-2 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : isOccupied
                                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 hover:border-blue-500'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {tbl.tableNumber}
                                  </span>
                                  <span className={`text-[9px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {tbl.seatingCapacity}p
                                  </span>
                                </div>

                                <div className="mt-1">
                                  {isOccupied && runningBill !== null ? (
                                    <span
                                      className={`text-[10px] font-extrabold block truncate ${
                                        isSelected ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                                      }`}
                                    >
                                      {formatPaise(runningBill)}
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[9px] font-medium block truncate ${
                                        isSelected ? 'text-blue-200' : 'text-emerald-600 dark:text-emerald-400'
                                      }`}
                                    >
                                      {tbl.status === 'available' ? 'Available' : tbl.status}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Network / Offline Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
            }`}
            title={isOnline ? 'Online • Local & Cloud Engine Active' : 'Offline • Local Persistence Active'}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-[11px]">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline text-[11px]">Offline</span>
              </>
            )}
          </div>

          {/* Restaurant / Workspace Switcher Badge */}
          {(membership?.restaurantName || restaurant?.name) && (
            <button
              type="button"
              onClick={onOpenWorkspaceSelector}
              disabled={!onOpenWorkspaceSelector || memberships.length <= 1}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                memberships.length > 1
                  ? 'bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 cursor-pointer shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-default'
              }`}
              title={memberships.length > 1 ? 'Switch Workspace / Restaurant' : 'Active Restaurant'}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="truncate max-w-[130px] font-bold">
                {membership?.restaurantName || restaurant?.name}
              </span>
              {memberships.length > 1 && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1 rounded-sm font-black">
                  {memberships.length}
                </span>
              )}
            </button>
          )}

          {/* Restaurant ID Badge with Quick Copy */}
          {(restaurant?.restaurantCode || membership?.restaurantCode) && (
            <button
              type="button"
              onClick={() => {
                const code = restaurant?.restaurantCode || membership?.restaurantCode;
                if (code) {
                  navigator.clipboard.writeText(code);
                  addToast(`Copied Restaurant ID: ${code}`, 'info');
                }
              }}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer transition-all shadow-xs"
              title="Click to copy Restaurant ID for staff login"
            >
              <span className="text-[10px] uppercase font-sans text-slate-400 font-bold">ID:</span>
              <span className="text-blue-600 dark:text-blue-400">
                {restaurant?.restaurantCode || membership?.restaurantCode}
              </span>
            </button>
          )}

          {/* Outlet Switcher */}
          {restaurant && restaurant.outlets.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              <Store className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {authorizedOutletId && (role === 'waiter' || role === 'kitchen') ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeOutlet?.name || 'Assigned Branch'}
                  </span>
                  {activeOutlet?.code && (
                    <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {activeOutlet.code}
                    </span>
                  )}
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Assigned
                  </span>
                </div>
              ) : (
                <select
                  value={activeOutlet?.id}
                  onChange={(e) => {
                    const found = restaurant.outlets.find((o) => o.id === e.target.value);
                    if (found) setActiveOutlet(found);
                  }}
                  className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
                >
                  {restaurant.outlets.map((outlet) => (
                    <option
                      key={outlet.id}
                      value={outlet.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {outlet.name} ({outlet.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="hidden md:block p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Notifications Icon with active badge & drawer trigger */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kitchen & Operational Notifications"
            aria-label="Kitchen & Operational Notifications"
          >
            <Bell className="w-4 h-4" />
            {unservedNotifCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse ring-2 ring-white dark:ring-[#121824]">
                {unservedNotifCount > 9 ? '9+' : unservedNotifCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121824]" />
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile & Quick Sign Out */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Account & Sign Out"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {((profile?.fullName || user?.email || 'U').substring(0, 2)).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                  {profile?.fullName || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold capitalize">
                  {role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate">
                      {profile?.fullName || user?.email}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {role}
                    </span>
                  </div>

                  {memberships.length > 1 && onOpenWorkspaceSelector && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenWorkspaceSelector();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
                    >
                      <Store className="w-4 h-4 text-blue-500" />
                      <span>Switch Restaurant</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsConfirmSignOutOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Multiple Active Orders Selection Modal */}
      {pendingTableOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Table {pendingTableOrders.table.tableNumber}: Multiple Running Bills
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingTableOrders(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400">
              This table currently has {pendingTableOrders.orders.length} active orders. Select which order to open or start a new independent order:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingTableOrders.orders.map((ord) => {
                const paid = ord.paidAmountPaise || (ord.paymentStatus === 'paid' ? ord.totalPaise : 0);
                const due = Math.max(0, ord.totalPaise - paid);
                return (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {ord.items.length} items
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>Total: <strong className="text-slate-800 dark:text-slate-200">{formatPaise(ord.totalPaise)}</strong></span>
                        {paid > 0 && <span>• Paid: {formatPaise(paid)}</span>}
                        {due > 0 && paid > 0 && <span className="text-amber-600 font-bold">• Due: {formatPaise(due)}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const tbl = pendingTableOrders.table;
                        setPendingTableOrders(null);
                        openTableForBilling(tbl, ord.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                    >
                      Open Bill
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const tbl = pendingTableOrders.table;
                  setPendingTableOrders(null);
                  openTableForBilling(tbl, '__new__');
                }}
                className="flex-1 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                + Start New Order for Table {pendingTableOrders.table.tableNumber}
              </button>
              <button
                type="button"
                onClick={() => setPendingTableOrders(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interactive Notification Popover / Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      {/* Sign Out Confirmation Modal */}
      {isConfirmSignOutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sign Out?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to exit your session?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSignOutOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Stay Logged In
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
    </>
  );
};

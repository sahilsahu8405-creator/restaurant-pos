import React, { useEffect, useState, useRef } from 'react';
import {
  Users,
  Clock,
  ChevronRight,
  UtensilsCrossed,
  ChefHat,
  Search,
  ShoppingBag,
  Bike,
  Plus,
  X,
  Phone,
  MapPin,
  FileText,
  Bell,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Check,
  Printer,
  Loader2,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { localRepository } from '../../services/localRepository';
import { subscribeToOperationalChanges, isSameOutlet } from '../../services/supabaseClient';
import { DiningTable, KitchenNotification, Order } from '../../types';
import { formatPaise } from '../../utils/currency';
import { TableWorkspace } from '../tables/TableWorkspace';
import { printService } from '../../services/printService';
import {
  playFoodReadyChime,
  subscribeToCrossTabEvents,
  showBrowserNotification,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from '../../utils/notificationSound';

export const WaiterView: React.FC = () => {
  const {
    activeOutlet,
    addToast,
    startNewTakeawayOrder,
    startNewDeliveryOrder,
    setCurrentView,
    restaurant,
    settings,
  } = useApp();

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [selectedWorkspaceOrderId, setSelectedWorkspaceOrderId] = useState<string | undefined>(undefined);
  const [printingTableId, setPrintingTableId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'occupied' | 'available'>('all');
  const [search, setSearch] = useState('');

  const { profile, membership, logout } = useAuth();
  const currentStaffName = profile?.fullName || 'Waiter';
  const [isConfirmSignOutOpen, setIsConfirmSignOutOpen] = useState(false);

  // Active Waiter Profile
  const [activeWaiter, setActiveWaiter] = useState<string>(currentStaffName);

  useEffect(() => {
    if (profile?.fullName) {
      setActiveWaiter(profile.fullName);
    }
  }, [profile?.fullName]);

  // Real-time Notifications State
  const [notifications, setNotifications] = useState<KitchenNotification[]>([]);
  const [activeBannerNotification, setActiveBannerNotification] = useState<KitchenNotification | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread' | 'ready' | 'served'>('all');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [orders, setOrders] = useState<Order[]>([]);

  // Delivery Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Load Tables, Orders & Persisted Notifications
  const loadData = async () => {
    if (!activeOutlet) return;
    try {
      const [tList, notifs, oList] = await Promise.all([
        localRepository.getTables(activeOutlet.id),
        localRepository.getKitchenNotifications(activeOutlet.id),
        localRepository.getOrders(activeOutlet.id),
      ]);
      setTables(tList);
      setNotifications(notifs);
      setOrders(oList.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'));

      // Check if there is an unread unserved food ready notification to show as banner
      const unservedReady = notifs.find((n) => !n.served && !n.read);
      if (unservedReady && !activeBannerNotification) {
        setActiveBannerNotification(unservedReady);
      }
    } catch (err) {
      console.warn('Error loading waiter data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Subscribe to local operational changes
    const unsubLocal = localRepository.subscribe(() => {
      loadData();
    });

    // 2. Subscribe to Supabase Postgres Realtime changes
    const unsubSupabase = subscribeToOperationalChanges(() => {
      loadData();
    }, activeOutlet?.id);

    // 3. Listen to cross-tab BroadcastChannel for zero-latency local sync
    const unsubCrossTab = subscribeToCrossTabEvents((msg) => {
      if (msg.type === 'FOOD_READY') {
        const notif = msg.notification;
        if (!activeOutlet || isSameOutlet(notif.outletId, activeOutlet.id)) {
          localRepository.addOrMergeKitchenNotification(notif);
          setActiveBannerNotification(notif);
          if (isSoundEnabled) {
            playFoodReadyChime();
          }
          showBrowserNotification(`🍽️ Food Ready: ${notif.tableNumber || notif.orderNumber}`, {
            body: notif.message,
          });
          loadData();
        }
      } else if (msg.type === 'NOTIFICATION_SERVED') {
        if (activeBannerNotification?.id === msg.notificationId) {
          setActiveBannerNotification(null);
        }
        loadData();
      }
    });

    // 4. Listen to in-window and Supabase food ready events
    const handleFoodReadyEvent = (e: any) => {
      const notif = e.detail as KitchenNotification;
      if (notif && (!activeOutlet || isSameOutlet(notif.outletId, activeOutlet.id))) {
        localRepository.addOrMergeKitchenNotification(notif);
        setActiveBannerNotification(notif);
        if (isSoundEnabled) {
          playFoodReadyChime();
        }
        showBrowserNotification(`🍽️ Food Ready: ${notif.tableNumber || notif.orderNumber}`, {
          body: notif.message,
        });
        loadData();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('restohub_')) {
        loadData();
      }
    };

    // 5. Periodic background check so no food-ready notification is ever missed
    const pollInterval = setInterval(() => {
      if (activeOutlet) {
        localRepository.getKitchenNotifications(activeOutlet.id).then((allNotifs) => {
          setNotifications(allNotifs);
          const unservedReady = allNotifs.find(
            (n) => !n.served && !n.read && (n.notificationType === 'order_ready' || n.notificationType === 'ticket_ready')
          );
          if (unservedReady) {
            setActiveBannerNotification((curr) => curr || unservedReady);
          }
        });
      }
    }, 4000);

    // 6. Online / Offline reconciliation
    const handleOnline = () => {
      setIsOnline(true);
      if (activeOutlet) {
        localRepository.reconcileKitchenNotifications(activeOutlet.id).then(() => {
          loadData();
        });
      }
    };
    const handleOffline = () => setIsOnline(false);

    const handleOperationalChange = () => {
      loadData();
    };

    window.addEventListener('restohub:operational-change', handleOperationalChange);
    window.addEventListener('restohub:food-ready-notification', handleFoodReadyEvent);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubLocal();
      unsubSupabase();
      unsubCrossTab();
      clearInterval(pollInterval);
      window.removeEventListener('restohub:operational-change', handleOperationalChange);
      window.removeEventListener('restohub:food-ready-notification', handleFoodReadyEvent);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeOutlet, activeWaiter, isSoundEnabled]);

  // Direct action: Open order in Workspace
  const handleViewOrder = async (orderId: string, tableNumber?: string) => {
    if (activeBannerNotification) {
      const currentId = activeBannerNotification.id;
      setActiveBannerNotification(null);
      localRepository.markKitchenNotificationRead(currentId).catch(() => {});
    }

    // Try finding table by number or orderId
    let targetTable: DiningTable | undefined;
    if (tableNumber) {
      const cleanNum = tableNumber.replace('Table', '').trim().replace(/^T/i, '');
      targetTable = tables.find(
        (t) =>
          t.tableNumber === tableNumber ||
          t.tableNumber === cleanNum ||
          t.tableNumber === `T${cleanNum}` ||
          `Table ${t.tableNumber}`.toLowerCase() === tableNumber.toLowerCase() ||
          t.tableNumber.toLowerCase() === tableNumber.toLowerCase().replace('table ', '')
      );
    }

    if (!targetTable && orderId) {
      const ord = await localRepository.getOrderById(orderId);
      if (ord?.tableId) {
        targetTable = tables.find((t) => t.id === ord.tableId);
      }
    }

    if (!targetTable && tables.length > 0) {
      targetTable = tables.find(
        (t) => tableNumber && (tableNumber.includes(t.tableNumber) || t.tableNumber.includes(tableNumber))
      );
    }

    if (targetTable) {
      setSelectedWorkspaceOrderId(orderId);
      setSelectedTable(targetTable);
      setIsNotificationDrawerOpen(false);
      return;
    }

    addToast(`Viewing order details for #${orderId}`, 'info');
  };

  // Direct action: Mark Served
  const handleMarkServed = async (notifId: string) => {
    setActiveBannerNotification(null);
    try {
      const res = await localRepository.markKitchenNotificationServed(notifId, activeWaiter);
      await loadData();
      const itemCount = res.notification.items?.length || 1;
      addToast(`✅ Marked ${itemCount} item(s) as SERVED to table!`, 'success');
    } catch {
      addToast('Marked as served', 'info');
    }
  };

  const handleDismissBanner = () => {
    if (activeBannerNotification) {
      const currentId = activeBannerNotification.id;
      setActiveBannerNotification(null);
      localRepository.markKitchenNotificationRead(currentId).catch(() => {});
    }
  };

  // Direct 1-tap bill printing for waiters from table card
  const handleQuickPrintTableBill = async (table: DiningTable, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeOutlet) return;

    setPrintingTableId(table.id);
    try {
      let targetOrder: Order | null = null;
      if (table.currentOrderId) {
        targetOrder = await localRepository.getOrderById(table.currentOrderId);
      }
      if (!targetOrder || targetOrder.status === 'completed' || targetOrder.status === 'cancelled') {
        const allOrders = await localRepository.getOrders(activeOutlet.id);
        targetOrder = allOrders.find(
          (o) => o.tableId === table.id && o.status !== 'completed' && o.status !== 'cancelled'
        ) || null;
      }

      if (!targetOrder) {
        addToast(`No active order found for Table ${table.tableNumber}`, 'warning');
        return;
      }

      addToast(`Printing bill for Table ${table.tableNumber}...`, 'info');
      const res = await printService.printReceipt(targetOrder, settings, restaurant, activeOutlet);
      if (res.success) {
        addToast(`✅ Printed Bill for Table ${table.tableNumber} (${settings?.receiptPaperWidth || '80mm'})`, 'success');
      } else {
        addToast(`Print bill: ${res.error || res.message}`, 'warning');
      }
    } catch (err: any) {
      addToast(`Failed to print bill: ${err?.message || 'Error'}`, 'error');
    } finally {
      setPrintingTableId(null);
    }
  };

  // Direct slip printing from kitchen ready notification
  const handlePrintNotificationSlip = async (notif: KitchenNotification) => {
    if (!activeOutlet) return;
    try {
      const order = await localRepository.getOrderById(notif.orderId);
      if (order) {
        const res = await printService.printReceipt(order, settings, restaurant, activeOutlet);
        if (res.success) {
          addToast(`Printed slip for Order #${notif.orderNumber}`, 'success');
        } else {
          addToast(`Print slip: ${res.error || res.message}`, 'warning');
        }
      }
    } catch (err: any) {
      addToast('Could not print slip for notification', 'error');
    }
  };

  const handleSelectTable = (table: DiningTable) => {
    setSelectedWorkspaceOrderId(undefined);
    setSelectedTable(table);
  };

  const handleStartTakeaway = () => {
    startNewTakeawayOrder();
    setCurrentView('pos');
  };

  const handleStartDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()) {
      addToast('Customer Name, Phone, and Delivery Address are required', 'warning');
      return;
    }

    startNewDeliveryOrder({
      customerName: deliveryName.trim(),
      customerPhone: deliveryPhone.trim(),
      customerAddress: deliveryAddress.trim(),
      deliveryInstructions: deliveryNotes.trim(),
    });

    setIsDeliveryModalOpen(false);
    setCurrentView('pos');
  };

  // Dedicated Table Workspace takes over screen when table is opened
  if (selectedTable) {
    return (
      <TableWorkspace
        table={selectedTable}
        initialOrderId={selectedWorkspaceOrderId}
        onBack={() => {
          setSelectedTable(null);
          setSelectedWorkspaceOrderId(undefined);
          loadData();
        }}
        onTableUpdated={loadData}
      />
    );
  }

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;

  const filteredTables = tables.filter((t) => {
    if (filter === 'occupied') return t.status === 'occupied';
    if (filter === 'available') return t.status === 'available';
    if (filter === 'assigned') {
      return (
        t.assignedWaiter === activeWaiter ||
        (activeWaiter && t.assignedWaiter?.toLowerCase() === activeWaiter.toLowerCase())
      );
    }
    if (search.trim()) {
      return (
        t.tableNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.section.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  // Notifications filtering for drawer
  const visibleNotifications = notifications.filter((n) => {
    const waiterMatch =
      activeWaiter === 'All Staff' ||
      !n.waiterName ||
      n.waiterName === 'All Staff' ||
      n.waiterName === activeWaiter;

    if (!waiterMatch) return false;
    if (notificationTab === 'unread') return !n.read;
    if (notificationTab === 'ready') return !n.served;
    if (notificationTab === 'served') return n.served;
    return true;
  });

  const unreadCount = notifications.filter(
    (n) =>
      !n.read &&
      (activeWaiter === 'All Staff' || !n.waiterName || n.waiterName === 'All Staff' || n.waiterName === activeWaiter)
  ).length;

  return (
    <div className="h-full w-full flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-y-auto select-none p-4 sm:p-6 space-y-4 animate-fade-in relative">
      {/* 1. INSTANT NOTIFICATION BANNER (When Food is Ready) - Clean, Compact, High-Contrast */}
      {activeBannerNotification && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg border border-emerald-400/30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Table & Items Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white text-emerald-800 px-2 py-0.5 rounded-full">
                    FOOD READY
                  </span>
                  <span className="text-xs font-black text-white">
                    {activeBannerNotification.tableNumber ? activeBannerNotification.tableNumber : activeBannerNotification.orderType}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-200">
                    {activeBannerNotification.orderNumber}
                  </span>
                </div>

                <div className="text-xs font-semibold text-emerald-50 truncate mt-0.5">
                  {activeBannerNotification.items.map((it) => `${it.quantity}× ${it.name}`).join(' • ')}
                </div>
              </div>
            </div>

            {/* Right: Crisp, Compact Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() =>
                  handleViewOrder(
                    activeBannerNotification.orderId,
                    activeBannerNotification.tableNumber
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkServed(activeBannerNotification.id)}
                className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-black text-white font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 border border-emerald-400/40"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Served</span>
              </button>

              <button
                type="button"
                onClick={handleDismissBanner}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Waiter Profile, Header & Action Bar - Streamlined, Clean, Uncluttered */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121824] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {activeWaiter.split(' ').map((n) => n[0]).join('').substring(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <select
                  value={activeWaiter}
                  onChange={(e) => setActiveWaiter(e.target.value)}
                  className="text-sm font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none cursor-pointer truncate max-w-[160px] sm:max-w-xs"
                >
                  <option value={currentStaffName} className="dark:bg-slate-800">{currentStaffName} (My Station)</option>
                  <option value="All Staff" className="dark:bg-slate-800">All Waiters (Outlet Queue)</option>
                </select>

                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{isOnline ? 'Live' : 'Offline'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeOutlet?.name || 'Main Branch'}
              </p>
            </div>
          </div>

          {/* Quick Sound, Bell & Sign Out for mobile */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={() => {
                setIsSoundEnabled((prev) => !prev);
                if (!isSoundEnabled) playFoodReadyChime();
              }}
              className={`p-2 rounded-xl border transition-all ${
                isSoundEnabled
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800'
                  : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
              title={isSoundEnabled ? 'Sound On' : 'Sound Muted'}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmSignOutOpen(true)}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-xs"
              title="Sign Out of Shift"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sound & Bell for Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSoundEnabled((prev) => !prev);
                if (!isSoundEnabled) playFoodReadyChime();
              }}
              className={`p-2 rounded-xl border transition-all ${
                isSoundEnabled
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800'
                  : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
              title={isSoundEnabled ? 'Sound On' : 'Sound Muted'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmSignOutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold shadow-xs"
              title="Sign Out of Shift"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Quick Order Actions */}
          <button
            type="button"
            onClick={handleStartTakeaway}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Takeaway</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>+ Delivery</span>
          </button>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search - Streamlined Horizontal Scroll */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap text-xs ${
              filter === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            All ({tables.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('assigned')}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap text-xs ${
              filter === 'assigned'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            Assigned ({tables.filter((t) => t.assignedWaiter === activeWaiter).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('occupied')}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap text-xs ${
              filter === 'occupied'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            Occupied ({occupiedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('available')}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap text-xs ${
              filter === 'available'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            Open ({availableCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table or section..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 4. Table Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredTables.map((t) => {
          const isOccupied = t.status === 'occupied';
          // Check if this table has pending food ready notifications waiting to be served
          const hasFoodReadyAlert = notifications.some(
            (n) => !n.served && (n.tableNumber === t.tableNumber || n.tableNumber === `Table ${t.tableNumber}`)
          );

          return (
            <div
              key={t.id}
              onClick={() => handleSelectTable(t)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between h-36 active:scale-95 hover:shadow-md relative overflow-hidden ${
                hasFoodReadyAlert
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                  : isOccupied
                  ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                  : 'bg-white dark:bg-[#121824] border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              {/* Ready Indicator Beacon */}
              {hasFoodReadyAlert && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs animate-bounce">
                  <span>🍽️ Food Ready</span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {t.tableNumber}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {t.section}
                  </span>
                </div>

                {!hasFoodReadyAlert && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>{t.seatingCapacity}</span>
                  </div>
                )}
              </div>

              {isOccupied && (() => {
                const tableOrder = orders.find(
                  (o) => o.tableId === t.id || (t.currentOrderId && o.id === t.currentOrderId)
                );
                return (
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">
                      {tableOrder ? formatPaise(tableOrder.totalPaise) : '₹0'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {tableOrder ? `${tableOrder.items.length} item(s)` : `${t.orderDurationMinutes || 15}m`}
                    </span>
                  </div>
                );
              })()}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      hasFoodReadyAlert
                        ? 'bg-emerald-600 text-white'
                        : isOccupied
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {hasFoodReadyAlert ? 'Food Ready' : isOccupied ? 'Occupied' : 'Open'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isOccupied && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickPrintTableBill(t, e)}
                      disabled={printingTableId === t.id}
                      className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition-all z-10 disabled:opacity-50"
                      title={`Print Bill for Table ${t.tableNumber}`}
                    >
                      {printingTableId === t.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Printer className="w-3 h-3" />
                      )}
                      <span>Bill</span>
                    </button>
                  )}
                  <div className="p-1 rounded-md text-slate-400 hover:text-blue-600">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. FOOD READY NOTIFICATIONS DRAWER / PANEL */}
      {isNotificationDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Kitchen Food Ready Alerts
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {visibleNotifications.length} notifications ({unreadCount} unread)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex p-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-bold">
              <button
                onClick={() => setNotificationTab('all')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  notificationTab === 'all'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setNotificationTab('ready')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  notificationTab === 'ready'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Needs Service ({notifications.filter((n) => !n.served).length})
              </button>
              <button
                onClick={() => setNotificationTab('served')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  notificationTab === 'served'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Served ({notifications.filter((n) => n.served).length})
              </button>
            </div>

            {/* Notifications Scroll List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {visibleNotifications.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-medium">No food ready notifications</p>
                </div>
              ) : (
                visibleNotifications.map((notif) => {
                  const isUnserved = !notif.served;
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isUnserved
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {notif.tableNumber || notif.orderType.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {notif.orderNumber}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                            Cook: {notif.kitchenUser || 'Chef Suresh'} • {notif.stationName || 'Kitchen'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              isUnserved
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isUnserved ? 'Ready' : 'Served'}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 block mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Ready Items */}
                      <div className="space-y-1 text-xs border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                        {notif.items.map((it) => (
                          <div key={it.cartItemId} className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>{it.quantity} × {it.name}</span>
                            {it.variantName && (
                              <span className="text-[10px] text-slate-400 font-normal">({it.variantName})</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleViewOrder(notif.orderId, notif.tableNumber)}
                          className="flex-1 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Order</span>
                        </button>

                        {isUnserved && (
                          <button
                            onClick={() => handleMarkServed(notif.id)}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Served</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. New Delivery Order Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleStartDelivery}
            className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  New Delivery Order Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Customer Name *</label>
              <input
                type="text"
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
                placeholder="e.g. Anand Sharma"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Contact Phone Number *
              </label>
              <div className="relative mt-1.5">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Delivery Address *
              </label>
              <div className="relative mt-1.5">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={2}
                  placeholder="Flat / Building, Street, Landmark..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Delivery Instructions (Optional)
              </label>
              <div className="relative mt-1.5">
                <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Ring bell twice, deliver to security guard..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm active:scale-95 transition-all"
              >
                Proceed to Order Items
              </button>
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
};

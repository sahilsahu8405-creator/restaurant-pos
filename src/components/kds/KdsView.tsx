import React, { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Filter,
  Volume2,
  RefreshCw,
  Flame,
  Layers,
  UtensilsCrossed,
  Check,
  User,
  Wifi,
  Sparkles,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { subscribeToOperationalChanges, isSameOutlet } from '../../services/supabaseClient';
import { CartItem, KitchenStation, KOTTicket, Order } from '../../types';
import {
  playNewTicketChime,
  subscribeToCrossTabEvents,
  showBrowserNotification,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from '../../utils/notificationSound';

export const KdsView: React.FC = () => {
  const { activeOutlet, addToast } = useApp();
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [tickets, setTickets] = useState<KOTTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );

  // Kitchen Chef Identity
  const [activeChef, setActiveChef] = useState<string>('Chef Suresh');

  // Debouncing / Request-in-flight locks to prevent double clicks & duplicate notifications
  const [transitioningTickets, setTransitioningTickets] = useState<Set<string>>(new Set());
  const [transitioningItems, setTransitioningItems] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSoundActive, setIsSoundActive] = useState<boolean>(isNotificationSoundEnabled());

  const fetchData = async () => {
    if (!activeOutlet) return;
    try {
      const [stns, kots, ords] = await Promise.all([
        localRepository.getKitchenStations(activeOutlet.id),
        localRepository.getKotTickets(activeOutlet.id, selectedStation),
        localRepository.getOrders(activeOutlet.id),
      ]);
      setStations(stns);
      setTickets(kots);
      setOrders(ords);
    } catch (err) {
      console.warn('Error fetching KDS data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Dedicated handler for instantaneous zero-latency ticket arrival
    const handleIncomingTickets = (incoming: KOTTicket[], eventOutletId?: string) => {
      if (!incoming || incoming.length === 0) return;
      if (activeOutlet && eventOutletId && !isSameOutlet(eventOutletId, activeOutlet.id)) {
        return;
      }

      // 1. Immediately merge into repository storage and memory
      localRepository.mergeKotTickets(incoming);

      // 2. Instant zero-lag state update directly to KDS screen
      setTickets((prev) => {
        const next = [...prev];
        for (const t of incoming) {
          const matchStation = !selectedStation || selectedStation === 'all' || t.stationId === selectedStation;
          if (!matchStation) continue;
          const idx = next.findIndex((existing) => existing.id === t.id || existing.kotNumber === t.kotNumber);
          if (idx !== -1) {
            next[idx] = t;
          } else {
            next.unshift(t);
          }
        }
        return next;
      });

      // 3. Audio chime and instant notifications
      if (isSoundActive) {
        playNewTicketChime();
      }
      const ticketNos = incoming.map((t) => t.kotNumber).join(', ');
      addToast(`🔔 New Kitchen Order: ${ticketNos}`, 'info');
      showBrowserNotification('🔔 New Kitchen Order', {
        body: `${incoming.length} ticket(s) received: ${ticketNos}`,
      });

      // 4. Background re-fetch to ensure orders are synchronized
      fetchData();
    };

    // 1. Subscribe to local repository changes (POS, Table workspace, Waiter)
    const unsubLocal = localRepository.subscribe(() => {
      fetchData();
    });

    // 2. Subscribe to Supabase Postgres Realtime changes
    const unsubSupabase = subscribeToOperationalChanges(() => {
      localRepository.rehydrateFromStorage();
      fetchData();
    }, activeOutlet?.id);

    // 3. Instant zero-latency cross-tab event subscription
    const unsubCrossTab = subscribeToCrossTabEvents((msg) => {
      if (msg.type === 'NEW_KOT_TICKETS') {
        handleIncomingTickets(msg.tickets, msg.outletId);
      } else if (msg.type === 'ORDER_UPDATED' || msg.type === 'NOTIFICATION_SERVED') {
        localRepository.rehydrateFromStorage();
        fetchData();
      }
    });

    // 4. In-window & Supabase realtime KOT event
    const handleNewKotEvent = (e: any) => {
      const tickets = e.detail?.tickets || [];
      if (tickets.length > 0) {
        handleIncomingTickets(tickets, e.detail?.outletId);
      } else {
        fetchData();
      }
    };

    // 5. Multi-tab storage & operational events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('restohub_')) {
        localRepository.rehydrateFromStorage();
        fetchData();
      }
    };
    const handleCustomChange = () => {
      localRepository.rehydrateFromStorage();
      fetchData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('restohub:operational-change', handleCustomChange);
    window.addEventListener('restohub:kitchen-notification-change', handleCustomChange);
    window.addEventListener('restohub:new-kot-ticket', handleNewKotEvent);

    // 6. Online/offline network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 7. Periodic background sync (every 5 seconds) to guarantee zero desync
    const syncInterval = setInterval(() => {
      localRepository.rehydrateFromStorage();
      fetchData();
    }, 5000);

    // Clock interval
    const clockInterval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
    }, 1000);

    return () => {
      unsubLocal();
      unsubSupabase();
      unsubCrossTab();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('restohub:operational-change', handleCustomChange);
      window.removeEventListener('restohub:kitchen-notification-change', handleCustomChange);
      window.removeEventListener('restohub:new-kot-ticket', handleNewKotEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, [activeOutlet, selectedStation, isSoundActive]);

  // Transition ticket status with double-click locking and validation
  const handleUpdateTicket = async (
    ticket: KOTTicket,
    status: 'sent' | 'preparing' | 'ready' | 'served'
  ) => {
    // 1. Double click / in-flight protection
    if (transitioningTickets.has(ticket.id)) return;

    // 2. Validation: prevent invalid or duplicate transitions
    if (ticket.status === status) return;
    if (ticket.status === 'served' && status !== 'served') {
      addToast('Cannot modify a ticket that is already served.', 'warning');
      return;
    }

    setTransitioningTickets((prev) => new Set(prev).add(ticket.id));

    try {
      await localRepository.updateKotTicketStatus(ticket.id, status, activeChef);
      await fetchData();

      if (status === 'ready') {
        addToast(
          `🍽️ Ticket ${ticket.kotNumber} marked READY TO SERVE! Waiter notified.`,
          'success'
        );
      } else if (status === 'served') {
        addToast(`Ticket ${ticket.kotNumber} marked SERVED to table.`, 'info');
      } else {
        addToast(`Ticket status updated to ${status.toUpperCase()}`, 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to update ticket status', 'error');
    } finally {
      setTransitioningTickets((prev) => {
        const next = new Set(prev);
        next.delete(ticket.id);
        return next;
      });
    }
  };

  // Item-level readiness transition: mark individual dish ready
  const handleMarkItemReady = async (ticket: KOTTicket, item: CartItem) => {
    if (transitioningItems.has(item.cartItemId)) return;
    if (item.kitchenStatus === 'ready' || item.kitchenStatus === 'served') return;

    setTransitioningItems((prev) => new Set(prev).add(item.cartItemId));

    try {
      await localRepository.updateOrderItemKitchenStatus(
        ticket.orderId,
        item.cartItemId,
        'ready',
        activeChef
      );
      await fetchData();
      addToast(
        `🍽️ ${item.quantity}× ${item.menuItem.name} marked READY! Waiter notified.`,
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Failed to update item status', 'error');
    } finally {
      setTransitioningItems((prev) => {
        const next = new Set(prev);
        next.delete(item.cartItemId);
        return next;
      });
    }
  };

  // Helper to get order's live item status
  const getLiveItemStatus = (orderId: string, cartItemId: string): string => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return 'new';
    const it = order.items.find((i) => i.cartItemId === cartItemId);
    return it?.kitchenStatus || 'new';
  };

  const [mobileColumnTab, setMobileColumnTab] = useState<'new' | 'preparing' | 'ready'>('new');

  const newTickets = tickets.filter((t) => t.status === 'sent');
  const preparingTickets = tickets.filter((t) => t.status === 'preparing');
  const readyTickets = tickets.filter((t) => t.status === 'ready');

  return (
    <div className="h-full w-full flex-1 flex flex-col bg-slate-100 dark:bg-[#0B0F17] overflow-hidden select-none">
      {/* KDS Header - Fully Responsive */}
      <div className="min-h-16 py-2.5 px-3 sm:px-6 bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  Kitchen KDS
                </h1>
                {/* Online / Live Sync indicator */}
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{isOnline ? 'Sync' : 'Offline'}</span>
                </div>
              </div>
              <span className="hidden lg:inline-block text-xs text-slate-500 dark:text-slate-400">
                Live Station Routing • Instant Ready-to-Serve Waiter Dispatch
              </span>
            </div>
          </div>

          {/* Clock & Sound for mobile top-right */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={() => {
                const next = !isSoundActive;
                setIsSoundActive(next);
                setNotificationSoundEnabled(next);
                if (next) {
                  playNewTicketChime();
                  addToast('Kitchen sound active', 'info');
                } else {
                  addToast('Kitchen sound muted', 'info');
                }
              }}
              className={`p-1.5 rounded-lg border text-xs ${
                isSoundActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-800'
              }`}
              title="Toggle sound"
            >
              {isSoundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-800 font-mono text-[11px] font-bold">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Station Routing Tabs & Chef Selector */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto overflow-x-auto scrollbar-none">
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto shrink-0 scrollbar-none">
            <button
              onClick={() => setSelectedStation('all')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg whitespace-nowrap transition-all ${
                selectedStation === 'all'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({tickets.length})
            </button>

            {stations.map((stn) => {
              const count = tickets.filter((t) => t.stationId === stn.id).length;
              return (
                <button
                  key={stn.id}
                  onClick={() => setSelectedStation(stn.id)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedStation === stn.id
                      ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {stn.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Audio Chime Toggle */}
            <button
              onClick={() => {
                const next = !isSoundActive;
                setIsSoundActive(next);
                setNotificationSoundEnabled(next);
                if (next) {
                  playNewTicketChime();
                  addToast('Kitchen order bell audio active', 'info');
                } else {
                  addToast('Kitchen audio muted', 'info');
                }
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                isSoundActive
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
              title={isSoundActive ? 'Kitchen sound alert active' : 'Kitchen sound muted'}
            >
              {isSoundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <select
                value={activeChef}
                onChange={(e) => setActiveChef(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-900 dark:text-white"
              >
                <option value="Chef Suresh" className="dark:bg-slate-800">Chef Suresh (Head Chef)</option>
                <option value="Chef Ramesh" className="dark:bg-slate-800">Chef Ramesh (Tandoor)</option>
                <option value="Chef Anita" className="dark:bg-slate-800">Chef Anita (Desserts)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800 font-mono text-xs font-bold shadow-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Column Switcher Bar */}
      <div className="flex md:hidden bg-slate-200/90 dark:bg-slate-800/90 p-1 rounded-xl mx-3 mt-2 shrink-0 gap-1 border border-slate-300/80 dark:border-slate-700/80">
        <button
          onClick={() => setMobileColumnTab('new')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileColumnTab === 'new'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>New ({newTickets.length})</span>
        </button>

        <button
          onClick={() => setMobileColumnTab('preparing')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileColumnTab === 'preparing'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Prep ({preparingTickets.length})</span>
        </button>

        <button
          onClick={() => setMobileColumnTab('ready')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileColumnTab === 'ready'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ready ({readyTickets.length})</span>
        </button>
      </div>

      {/* 3-Column Kanban Board - Responsive Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 p-3 sm:p-6 overflow-hidden">
        {/* Column 1: New Fired Tickets */}
        <div className={`flex-col h-full bg-slate-200/60 dark:bg-[#121824] rounded-2xl border border-slate-300/80 dark:border-slate-800/80 overflow-hidden ${
          mobileColumnTab === 'new' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="p-3 sm:p-3.5 bg-blue-600 text-white flex items-center justify-between font-bold text-xs sm:text-sm shrink-0">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              <span>New Tickets ({newTickets.length})</span>
            </span>
            <span className="text-[11px] sm:text-xs font-medium bg-blue-700/60 px-2 py-0.5 rounded-full">0 - 3 min</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {newTickets.length === 0 ? (
              <div className="h-full min-h-[160px] flex items-center justify-center text-xs text-slate-400 font-medium">
                No new kitchen tickets
              </div>
            ) : (
              newTickets.map((ticket) => {
                const isBusy = transitioningTickets.has(ticket.id);
                return (
                  <div
                    key={ticket.id}
                    className="bg-white dark:bg-[#1A2234] rounded-xl p-4 border border-blue-200 dark:border-slate-700 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-slate-900 dark:text-white">
                            {ticket.kotNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              ticket.ticketType === 'incremental'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {ticket.ticketType === 'incremental' ? '+ Incremental' : 'New Ticket'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                          {ticket.tableNumber} • {ticket.stationName}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Ticket Items */}
                    <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                      {ticket.items.map((it) => (
                        <div key={it.cartItemId} className="space-y-0.5">
                          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                            <span className="font-extrabold text-blue-600">{it.quantity}×</span>
                            <span className="truncate flex-1 ml-2">{it.menuItem.name}</span>
                            {it.variant && (
                              <span className="text-[10px] text-slate-400">({it.variant.name})</span>
                            )}
                          </div>
                          {it.notes && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 italic pl-5">
                              Note: {it.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={isBusy}
                      onClick={() => handleUpdateTicket(ticket, 'preparing')}
                      className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Accept & Start Prep</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className={`flex-col h-full bg-slate-200/60 dark:bg-[#121824] rounded-2xl border border-slate-300/80 dark:border-slate-800/80 overflow-hidden ${
          mobileColumnTab === 'preparing' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="p-3 sm:p-3.5 bg-amber-500 text-white flex items-center justify-between font-bold text-xs sm:text-sm shrink-0">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Preparing ({preparingTickets.length})</span>
            </span>
            <span className="text-[11px] sm:text-xs font-medium bg-amber-600/60 px-2 py-0.5 rounded-full">In Kitchen</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {preparingTickets.length === 0 ? (
              <div className="h-full min-h-[160px] flex items-center justify-center text-xs text-slate-400 font-medium">
                No tickets currently in prep
              </div>
            ) : (
              preparingTickets.map((ticket) => {
                const isTicketBusy = transitioningTickets.has(ticket.id);
                return (
                  <div
                    key={ticket.id}
                    className="bg-white dark:bg-[#1A2234] rounded-xl p-4 border border-amber-200 dark:border-amber-900/40 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-slate-900 dark:text-white">
                            {ticket.kotNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              ticket.ticketType === 'incremental'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {ticket.ticketType === 'incremental' ? '+ Incremental' : 'Standard'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                          {ticket.tableNumber} • {ticket.stationName}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Ticket Items with Item-Level Readiness Controls */}
                    <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                      {ticket.items.map((it) => {
                        const liveStatus = getLiveItemStatus(ticket.orderId, it.cartItemId);
                        const isItemReady = liveStatus === 'ready' || liveStatus === 'served';
                        const isItemBusy = transitioningItems.has(it.cartItemId);

                        return (
                          <div
                            key={it.cartItemId}
                            className="p-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                <span className="font-extrabold text-amber-600">{it.quantity}×</span>
                                <span className="truncate">{it.menuItem.name}</span>
                                {it.variant && (
                                  <span className="text-[10px] text-slate-400">({it.variant.name})</span>
                                )}
                              </div>
                              {it.notes && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                  Note: {it.notes}
                                </p>
                              )}
                            </div>

                            {/* Item-Level Ready Button / Badge */}
                            {isItemReady ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3" />
                                <span>Ready</span>
                              </span>
                            ) : (
                              <button
                                disabled={isItemBusy || isTicketBusy}
                                onClick={() => handleMarkItemReady(ticket, it)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300 border border-amber-300 transition-all shrink-0 active:scale-95 disabled:opacity-50 flex items-center gap-1"
                                title="Mark only this dish ready to notify waiter"
                              >
                                {isItemBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                <span>Ready</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* PRIMARY ACTION: "Ready to Serve" */}
                    <button
                      disabled={isTicketBusy}
                      onClick={() => handleUpdateTicket(ticket, 'ready')}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      title="Mark all items on this ticket ready and notify assigned waiter"
                    >
                      {isTicketBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UtensilsCrossed className="w-3.5 h-3.5" />}
                      <span>Ready to Serve</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Ready for Service */}
        <div className={`flex-col h-full bg-slate-200/60 dark:bg-[#121824] rounded-2xl border border-slate-300/80 dark:border-slate-800/80 overflow-hidden ${
          mobileColumnTab === 'ready' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="p-3 sm:p-3.5 bg-emerald-600 text-white flex items-center justify-between font-bold text-xs sm:text-sm shrink-0">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready for Service ({readyTickets.length})</span>
            </span>
            <span className="text-[11px] sm:text-xs font-medium bg-emerald-700/60 px-2 py-0.5 rounded-full">Notified</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {readyTickets.length === 0 ? (
              <div className="h-full min-h-[160px] flex items-center justify-center text-xs text-slate-400 font-medium">
                No tickets waiting for service
              </div>
            ) : (
              readyTickets.map((ticket) => {
                const isTicketBusy = transitioningTickets.has(ticket.id);
                return (
                  <div
                    key={ticket.id}
                    className="bg-white dark:bg-[#1A2234] rounded-xl p-4 border border-emerald-300 dark:border-emerald-900/60 shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-slate-900 dark:text-white">
                            {ticket.kotNumber}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                          {ticket.tableNumber} • {ticket.stationName}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Waiter Notified
                        </span>
                        {ticket.readyAt && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(ticket.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                      {ticket.items.map((it) => (
                        <div key={it.cartItemId} className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <span className="font-extrabold text-emerald-600">{it.quantity}×</span>
                          <span className="truncate flex-1 ml-2">{it.menuItem.name}</span>
                          {it.variant && (
                            <span className="text-[10px] text-slate-400">({it.variant.name})</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={isTicketBusy}
                      onClick={() => handleUpdateTicket(ticket, 'served')}
                      className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isTicketBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Mark Served to Table</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

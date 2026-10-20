import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Clock,
  Plus,
  ChevronRight,
  UtensilsCrossed,
  Layers,
  ShoppingBag,
  Truck,
  Sparkles,
  AlertTriangle,
  Wifi,
  WifiOff,
  CheckCircle2,
  Receipt,
  ArrowRight,
  X,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { subscribeToOperationalChanges } from '../../services/supabaseClient';
import { DiningTable, Order } from '../../types';
import { formatPaise } from '../../utils/currency';
import { TableWorkspace } from './TableWorkspace';
import { FloorPlanManagerModal } from './FloorPlanManagerModal';

export const TablesView: React.FC = () => {
  const {
    activeOutlet,
    addToast,
    startNewTakeawayOrder,
    startNewDeliveryOrder,
    setCurrentView,
    setSelectedTable,
    setGuestCount,
    setOrderType,
    openTableForBilling,
  } = useApp();

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'reserved' | 'food_ready' | 'cleaning'>('all');
  const [activeWorkspaceTable, setActiveWorkspaceTable] = useState<DiningTable | null>(null);
  const [selectedInitialOrderId, setSelectedInitialOrderId] = useState<string | undefined>(undefined);
  const [isFloorPlanModalOpen, setIsFloorPlanModalOpen] = useState(false);

  // Modals for Table Actions
  const [startOrderModalTable, setStartOrderModalTable] = useState<DiningTable | null>(null);
  const [guestCountChoice, setGuestCountChoice] = useState<number>(2);
  const [multipleOrdersModalTable, setMultipleOrdersModalTable] = useState<{ table: DiningTable; orders: Order[] } | null>(null);

  // Live Sync & Connectivity Status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [livePulse, setLivePulse] = useState<boolean>(false);

  // Authoritative Data Fetcher
  const fetchData = async () => {
    if (!activeOutlet) return;
    try {
      const [fetchedTables, fetchedOrders] = await Promise.all([
        localRepository.getTables(activeOutlet.id),
        localRepository.getOrders(activeOutlet.id),
      ]);
      setTables(fetchedTables);
      setOrders(fetchedOrders);
      setLastSyncTime(new Date());
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1200);
    } catch (err) {
      console.warn('Error fetching tables/orders:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // 1. Subscribe to local in-memory & POS updates
    const unsubscribeLocal = localRepository.subscribe(() => {
      fetchData();
    });

    // 2. Subscribe to Supabase Postgres real-time changes
    const unsubscribeSupabase = subscribeToOperationalChanges(() => {
      fetchData();
    });

    // 3. Multi-tab storage & operational events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('restohub_')) {
        fetchData();
      }
    };
    const handleCustomEvent = () => {
      fetchData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('restohub:operational-change', handleCustomEvent);

    // 4. Online/Offline network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Elapsed-time ticker (re-render every 30s to keep elapsed time fresh)
    const timer = setInterval(() => {
      setTables((prev) => [...prev]);
    }, 30000);

    return () => {
      unsubscribeLocal();
      unsubscribeSupabase();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('restohub:operational-change', handleCustomEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, [activeOutlet]);

  // Map active uncompleted orders per table
  const tableOrdersMap = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (order.tableId && order.status !== 'completed' && order.status !== 'cancelled') {
        const existing = map.get(order.tableId) || [];
        existing.push(order);
        map.set(order.tableId, existing);
      }
    }
    return map;
  }, [orders]);

  // Handle table interaction
  const handleTableClick = (table: DiningTable) => {
    const activeOrders = tableOrdersMap.get(table.id) || [];

    if (activeOrders.length > 1) {
      // Multiple orders: present chooser modal
      setMultipleOrdersModalTable({ table, orders: activeOrders });
      return;
    }

    if (activeOrders.length === 1) {
      // Single running order: open workspace loaded with this order
      setSelectedInitialOrderId(activeOrders[0].id);
      setActiveWorkspaceTable(table);
      return;
    }

    // Available or other non-occupied table: open quick start modal
    if (table.status === 'available') {
      setGuestCountChoice(table.seatingCapacity || 2);
      setStartOrderModalTable(table);
    } else {
      // Reserved, cleaning, etc. -> Open workspace for inspection
      setSelectedInitialOrderId(undefined);
      setActiveWorkspaceTable(table);
    }
  };

  const startDineInOrderFromModal = (inPosBilling: boolean) => {
    if (!startOrderModalTable) return;
    const table = startOrderModalTable;
    setStartOrderModalTable(null);

    if (inPosBilling) {
      setSelectedTable(table);
      setOrderType('dine_in');
      setGuestCount(guestCountChoice);
      openTableForBilling(table);
      setCurrentView('pos');
    } else {
      setSelectedTable(table);
      setOrderType('dine_in');
      setGuestCount(guestCountChoice);
      setSelectedInitialOrderId(undefined);
      setActiveWorkspaceTable(table);
    }
  };

  const occupiedCount = tables.filter((t) => {
    const activeOrders = tableOrdersMap.get(t.id) || [];
    return t.status === 'occupied' || activeOrders.length > 0;
  }).length;

  const availableCount = tables.filter((t) => {
    const activeOrders = tableOrdersMap.get(t.id) || [];
    return t.status === 'available' && activeOrders.length === 0;
  }).length;

  const reservedCount = tables.filter((t) => t.status === 'reserved').length;
  const foodReadyCount = tables.filter((t) => t.status === 'food_ready').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;

  const filteredTables = tables.filter((t) => {
    const activeOrders = tableOrdersMap.get(t.id) || [];
    const isOcc = t.status === 'occupied' || activeOrders.length > 0;
    const isAvail = t.status === 'available' && activeOrders.length === 0;

    if (filter === 'available') return isAvail;
    if (filter === 'occupied') return isOcc;
    if (filter === 'reserved') return t.status === 'reserved';
    if (filter === 'food_ready') return t.status === 'food_ready';
    if (filter === 'cleaning') return t.status === 'cleaning';
    return true;
  });

  // Dedicated Table Workspace takes over the screen when table is open
  if (activeWorkspaceTable) {
    return (
      <TableWorkspace
        table={activeWorkspaceTable}
        initialOrderId={selectedInitialOrderId}
        onBack={() => {
          setActiveWorkspaceTable(null);
          setSelectedInitialOrderId(undefined);
          fetchData();
        }}
        onTableUpdated={fetchData}
      />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#0B0F17] select-none">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
        {/* Header with Quick Order Actions & Floor Plan Manager */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Table Management
              </h1>
              {/* Real-time sync badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                }`}
                title={isOnline ? 'Real-time synchronization connected' : 'Working offline with local storage sync'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  } ${livePulse ? 'animate-ping' : ''}`}
                />
                <span>{isOnline ? 'Live Sync Active' : 'Offline / Local'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live floor plan, prominent running guest bills, and instant table order management
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Action: New Dine-in */}
            <button
              onClick={() => {
                const firstAvailable = tables.find((t) => {
                  const activeOrders = tableOrdersMap.get(t.id) || [];
                  return t.status === 'available' && activeOrders.length === 0;
                });
                if (firstAvailable) {
                  setGuestCountChoice(firstAvailable.seatingCapacity || 2);
                  setStartOrderModalTable(firstAvailable);
                } else {
                  addToast('All tables are currently occupied. Select an active table to view running bills.', 'info');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all active:scale-95"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Start Dine-In Order</span>
            </button>

            {/* Quick Action: New Takeaway */}
            <button
              onClick={() => startNewTakeawayOrder()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
              <span>New Takeaway</span>
            </button>

            {/* Quick Action: New Delivery */}
            <button
              onClick={() => startNewDeliveryOrder()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-500" />
              <span>New Delivery</span>
            </button>

            {/* Floor Plan Management Action */}
            <button
              onClick={() => setIsFloorPlanModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm transition-all active:scale-95 ml-1"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Manage Floor Plan</span>
            </button>
          </div>
        </div>

        {/* Operational Status Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <div className="flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 self-start">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({tables.length})
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'available'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setFilter('occupied')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'occupied'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Occupied ({occupiedCount})
            </button>
            {foodReadyCount > 0 && (
              <button
                onClick={() => setFilter('food_ready')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'food_ready'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Food Ready ({foodReadyCount})
              </button>
            )}
            {reservedCount > 0 && (
              <button
                onClick={() => setFilter('reserved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'reserved'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Reserved ({reservedCount})
              </button>
            )}
            {cleaningCount > 0 && (
              <button
                onClick={() => setFilter('cleaning')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'cleaning'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Needs Cleaning ({cleaningCount})
              </button>
            )}
          </div>
        </div>

        {/* Table Cards Grid */}
        {tables.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-md mx-auto my-8 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
              Set Up Your Floor Plan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              No dining tables or floor sections are configured for this branch yet. Create your sections (e.g. Main Hall, Outdoor Deck) and add tables to begin seating guests.
            </p>
            <button
              onClick={() => setIsFloorPlanModalOpen(true)}
              className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Set Up Floor Plan</span>
            </button>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No tables match this filter</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-xs text-blue-500 hover:underline font-bold"
            >
              Show all tables
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredTables.map((table) => {
            const activeOrders = (tableOrdersMap.get(table.id) || []).filter(
              (o) => o.status !== 'completed' && o.status !== 'cancelled'
            );
            const hasOrder = activeOrders.length > 0;
            const isOccupied = table.status === 'occupied' || hasOrder;
            const isReserved = table.status === 'reserved';
            const isFoodReady = table.status === 'food_ready';
            const isCleaning = table.status === 'cleaning';
            const isRound = table.shape === 'round';

            // Show running bill for occupied tables or reserved tables with active orders
            const showRunningBill = (isOccupied || isReserved) && hasOrder;

            // Accurate calculations matching POS Billing
            const totalPaise = activeOrders.reduce((sum, o) => sum + (o.totalPaise || 0), 0);
            const paidPaise = activeOrders.reduce(
              (sum, o) => sum + (o.paidAmountPaise || (o.paymentStatus === 'paid' ? o.totalPaise : 0)),
              0
            );
            const balanceDuePaise = Math.max(0, totalPaise - paidPaise);

            // Item count excluding cancelled items
            const activeItems = activeOrders.flatMap((o) =>
              (o.items || []).filter((i) => i.kitchenStatus !== 'cancelled')
            );
            const totalUnits = activeItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

            // Elapsed duration
            const oldestTime = activeOrders.reduce<number | null>((acc, o) => {
              const t = new Date(o.createdAt).getTime();
              if (isNaN(t)) return acc;
              return acc === null ? t : Math.min(acc, t);
            }, null);

            const elapsedMinutes = oldestTime
              ? Math.max(1, Math.round((Date.now() - oldestTime) / 60000))
              : table.orderDurationMinutes || 15;

            const waiter = table.assignedWaiter || activeOrders[0]?.waiterName || 'Unassigned';

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-44 group hover:shadow-md ${
                  isOccupied
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                    : isReserved
                    ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60'
                    : isFoodReady
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                    : 'bg-white dark:bg-[#121824] border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                {/* Header: Table Number & Guests Capacity */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {table.tableNumber}
                      </h3>
                      {isRound && (
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" title="Round Table" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {table.section}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>{table.seatingCapacity} Guests</span>
                  </div>
                </div>

                {/* Middle Section: Compact Running Bill or State Info */}
                {showRunningBill ? (
                  <div className="my-auto space-y-0.5">
                    <div className="flex items-baseline gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                      <span>{formatPaise(totalPaise)}</span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                        {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {balanceDuePaise > 0 ? `Due ${formatPaise(balanceDuePaise)}` : 'Paid in full'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span className="truncate max-w-[95px]">Waiter: {waiter}</span>
                      <span className="shrink-0">{elapsedMinutes} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-[11px] text-slate-400 font-medium">
                    {isReserved
                      ? 'Reserved for seating'
                      : isCleaning
                      ? 'Needs cleaning'
                      : 'Available for seating'}
                  </div>
                )}

                {/* Bottom Row: Status Badge & Chevron Action */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      isOccupied
                        ? 'bg-blue-600 text-white'
                        : isReserved
                        ? 'bg-purple-600 text-white'
                        : isFoodReady
                        ? 'bg-amber-600 text-white'
                        : isCleaning
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {isOccupied ? 'Occupied' : table.status.replace('_', ' ')}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableClick(table);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Open Table Workspace"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* MODAL 1: START DINE-IN ORDER FOR AVAILABLE TABLE */}
      {startOrderModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Start Dine-In Order
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Table {startOrderModalTable.tableNumber} • {startOrderModalTable.section}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStartOrderModalTable(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Party Size / Guests:
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestCountChoice(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        guestCountChoice === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Table Seating Capacity
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {startOrderModalTable.seatingCapacity} Seats
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => startDineInOrderFromModal(true)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Take Order in POS Billing</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => startDineInOrderFromModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
              >
                Open Table Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MULTIPLE ACTIVE ORDERS SELECTOR */}
      {multipleOrdersModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Table {multipleOrdersModalTable.table.tableNumber} Orders
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {multipleOrdersModalTable.orders.length} active orders on this table
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMultipleOrdersModalTable(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2.5 max-h-[340px] overflow-y-auto">
              {multipleOrdersModalTable.orders.map((ord) => {
                const duePaise = Math.max(
                  0,
                  ord.totalPaise - (ord.paidAmountPaise || (ord.paymentStatus === 'paid' ? ord.totalPaise : 0))
                );
                return (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ord.guestCount || 2} Guests
                        </span>
                      </div>
                      <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                        {formatPaise(ord.totalPaise)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      <span>{ord.items.length} items</span>
                      <span>Due: {formatPaise(duePaise)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const table = multipleOrdersModalTable.table;
                          setMultipleOrdersModalTable(null);
                          openTableForBilling(table, ord.id);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Open in POS</span>
                      </button>

                      <button
                        onClick={() => {
                          const table = multipleOrdersModalTable.table;
                          setMultipleOrdersModalTable(null);
                          setSelectedInitialOrderId(ord.id);
                          setActiveWorkspaceTable(table);
                        }}
                        className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                      >
                        Workspace
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const table = multipleOrdersModalTable.table;
                  setMultipleOrdersModalTable(null);
                  setSelectedTable(table);
                  setOrderType('dine_in');
                  setGuestCount(table.seatingCapacity);
                  openTableForBilling(table);
                  setCurrentView('pos');
                }}
                className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Additional Order on Table {multipleOrdersModalTable.table.tableNumber}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floor Plan & Table Configuration Modal */}
      <FloorPlanManagerModal
        outletId={activeOutlet?.id || 'outlet-blr-01'}
        isOpen={isFloorPlanModalOpen}
        onClose={() => setIsFloorPlanModalOpen(false)}
        onLayoutSaved={fetchData}
        addToast={addToast}
      />
    </div>
  );
};

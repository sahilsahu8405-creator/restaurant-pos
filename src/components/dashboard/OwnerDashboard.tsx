import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  Store,
  Receipt,
  UtensilsCrossed,
  HelpCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronRight,
  Calendar,
  Percent,
  CheckCircle2,
  Clock,
  X,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import {
  getLiveDashboardData,
  subscribeToOperationalChanges,
  SupabaseOrderRow,
  SupabaseOrderItemRow,
  SupabaseExpenseRow,
  SupabasePaymentRow,
} from '../../services/supabaseClient';
import { formatPaise } from '../../utils/currency';

export const OwnerDashboard: React.FC = () => {
  const { restaurant, activeOutlet, setActiveOutlet, setCurrentView, addToast } = useApp();

  // Filter States
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('all');

  // Live Data States
  const [orders, setOrders] = useState<SupabaseOrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<SupabaseOrderItemRow[]>([]);
  const [expenses, setExpenses] = useState<SupabaseExpenseRow[]>([]);
  const [payments, setPayments] = useState<SupabasePaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveOnline, setIsLiveOnline] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Interactive Modals / Popovers
  const [isSalesBreakdownOpen, setIsSalesBreakdownOpen] = useState(false);
  const [isAovHelpOpen, setIsAovHelpOpen] = useState(false);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{
    label: string;
    amountPaise: number;
    orderCount: number;
    x: number;
    y: number;
  } | null>(null);

  // Sync selectedOutletFilter with activeOutlet on initial mount
  useEffect(() => {
    if (activeOutlet && selectedOutletFilter === 'all') {
      setSelectedOutletFilter(activeOutlet.id);
    }
  }, [activeOutlet]);

  // Load live data from Supabase (with fallback to local repository)
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const outletIdToQuery = selectedOutletFilter === 'all' ? undefined : selectedOutletFilter;
      const data = await getLiveDashboardData(outletIdToQuery, dateRange);

      if (data.orders.length > 0 || data.expenses.length > 0) {
        setOrders(data.orders);
        setOrderItems(data.orderItems);
        setExpenses(data.expenses);
        setPayments(data.payments);
      } else {
        // Fallback to local repository if remote is empty
        const [localOrders, localExpenses] = await Promise.all([
          localRepository.getOrders(outletIdToQuery || activeOutlet?.id || 'outlet-blr-01'),
          localRepository.getExpenses(outletIdToQuery || activeOutlet?.id || 'outlet-blr-01'),
        ]);

        // Filter local orders by date range
        const now = new Date();
        let startDate: Date | null = null;
        if (dateRange === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (dateRange === 'week') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
        } else if (dateRange === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        }

        const filteredLocalOrders = localOrders.filter((o) => {
          if (!startDate) return true;
          return new Date(o.createdAt) >= startDate;
        });

        const mappedOrders: SupabaseOrderRow[] = filteredLocalOrders.map((o) => ({
          id: o.id,
          restaurant_id: o.restaurantId,
          outlet_id: o.outletId,
          order_number: o.orderNumber,
          order_type: o.orderType,
          status: o.status,
          payment_status: o.paymentStatus,
          subtotal_paise: o.subtotalPaise,
          discount_paise: o.discountPaise,
          tax_paise: (o.cgstPaise || 0) + (o.sgstPaise || 0),
          total_paise: o.totalPaise,
          created_at: o.createdAt,
          updated_at: o.updatedAt,
        }));

        const mappedItems: SupabaseOrderItemRow[] = [];
        filteredLocalOrders.forEach((o) => {
          o.items.forEach((it) => {
            mappedItems.push({
              id: it.cartItemId,
              order_id: o.id,
              item_id: it.menuItem.id,
              item_name_snapshot: it.menuItem.name,
              unit_price_paise: it.unitPricePaise,
              quantity: it.quantity,
              subtotal_paise: it.subtotalPaise,
              kitchen_status: it.kitchenStatus || 'served',
              created_at: o.createdAt,
            });
          });
        });

        const filteredExpenses = localExpenses.filter((e) => {
          if (!startDate) return true;
          return new Date(e.createdAt) >= startDate;
        });

        const mappedExpenses: SupabaseExpenseRow[] = filteredExpenses.map((e) => ({
          id: e.id,
          outlet_id: e.outletId,
          category: e.category,
          amount_paise: e.amountPaise,
          payment_method: e.paymentMethod,
          description: e.description,
          expense_date: e.date || e.createdAt.split('T')[0],
          created_at: e.createdAt,
        }));

        setOrders(mappedOrders);
        setOrderItems(mappedItems);
        setExpenses(mappedExpenses);
        setPayments([]);
      }

      setIsLiveOnline(true);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
      setIsLiveOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, selectedOutletFilter]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const unsubscribe = subscribeToOperationalChanges(() => {
      loadDashboardData();
      addToast('Realtime update: Operational records refreshed', 'info');
    }, selectedOutletFilter === 'all' ? undefined : selectedOutletFilter);

    return () => {
      unsubscribe();
    };
  }, [selectedOutletFilter, dateRange]);

  // ==========================================
  // AUTHORITATIVE METRIC CALCULATIONS
  // ==========================================

  // Eligible Orders: Excludes draft and cancelled orders
  const eligibleOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled' && o.status !== 'draft');
  }, [orders]);

  const cancelledOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'cancelled');
  }, [orders]);

  const paidOrders = useMemo(() => {
    return eligibleOrders.filter((o) => o.payment_status === 'paid');
  }, [eligibleOrders]);

  const unpaidOrders = useMemo(() => {
    return eligibleOrders.filter((o) => o.payment_status !== 'paid');
  }, [eligibleOrders]);

  // A. Total Gross Sales (Sum of item subtotals before discounts + taxes)
  const grossSalesPaise = useMemo(() => {
    return eligibleOrders.reduce((acc, o) => acc + o.total_paise, 0);
  }, [eligibleOrders]);

  const grossItemSalesPaise = useMemo(() => {
    return eligibleOrders.reduce((acc, o) => acc + o.subtotal_paise, 0);
  }, [eligibleOrders]);

  const totalDiscountPaise = useMemo(() => {
    return eligibleOrders.reduce((acc, o) => acc + o.discount_paise, 0);
  }, [eligibleOrders]);

  const totalTaxPaise = useMemo(() => {
    return eligibleOrders.reduce((acc, o) => acc + o.tax_paise, 0);
  }, [eligibleOrders]);

  const netSalesPaise = useMemo(() => {
    return Math.max(0, grossItemSalesPaise - totalDiscountPaise);
  }, [grossItemSalesPaise, totalDiscountPaise]);

  const collectedAmountPaise = useMemo(() => {
    return paidOrders.reduce((acc, o) => acc + o.total_paise, 0);
  }, [paidOrders]);

  const outstandingBalancePaise = useMemo(() => {
    return unpaidOrders.reduce((acc, o) => acc + o.total_paise, 0);
  }, [unpaidOrders]);

  // B. Total Orders Count
  const totalOrdersCount = eligibleOrders.length;
  const dineInCount = eligibleOrders.filter((o) => o.order_type === 'dine_in').length;
  const takeawayCount = eligibleOrders.filter((o) => o.order_type === 'takeaway').length;

  // C. Average Order Value (AOV = Eligible Sales ÷ Total Orders)
  const aovPaise = totalOrdersCount > 0 ? Math.round(grossSalesPaise / totalOrdersCount) : 0;

  // D. Estimated Net Contribution (Net Sales - Operating Expenses)
  const totalExpensesPaise = useMemo(() => {
    return expenses.reduce((acc, e) => acc + e.amount_paise, 0);
  }, [expenses]);

  const estNetContributionPaise = netSalesPaise - totalExpensesPaise;

  // E. Time-Series Aggregation for Revenue Progression Chart
  const chartData = useMemo(() => {
    if (eligibleOrders.length === 0) return [];

    const now = new Date();

    if (dateRange === 'today') {
      // 8 Time Buckets across the day: 08:00 to 22:00
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      return hours.map((hour) => {
        const matching = eligibleOrders.filter((o) => {
          const d = new Date(o.created_at);
          return d.getHours() >= hour - 2 && d.getHours() < hour;
        });
        const amountPaise = matching.reduce((sum, o) => sum + o.total_paise, 0);
        const label = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
        return { label, amountPaise, count: matching.length };
      });
    }

    if (dateRange === 'week') {
      // 7 Daily Buckets (Mon to Sun)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayMap = new Map<string, { amountPaise: number; count: number }>();
      days.forEach((d) => dayMap.set(d, { amountPaise: 0, count: 0 }));

      eligibleOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const dayIdx = d.getDay(); // 0 is Sun, 1 is Mon
        const dayName = days[dayIdx === 0 ? 6 : dayIdx - 1];
        if (dayMap.has(dayName)) {
          const cur = dayMap.get(dayName)!;
          cur.amountPaise += o.total_paise;
          cur.count += 1;
        }
      });

      return days.map((day) => ({
        label: day,
        amountPaise: dayMap.get(day)!.amountPaise,
        count: dayMap.get(day)!.count,
      }));
    }

    if (dateRange === 'month') {
      // 6 Interval points across the month (1st, 5th, 10th, 15th, 20th, 25th, end)
      const intervals = [1, 5, 10, 15, 20, 25, 30];
      return intervals.map((dayNum) => {
        const matching = eligibleOrders.filter((o) => {
          const d = new Date(o.created_at);
          return d.getDate() >= dayNum - 4 && d.getDate() <= dayNum;
        });
        const amountPaise = matching.reduce((sum, o) => sum + o.total_paise, 0);
        return { label: `Day ${dayNum}`, amountPaise, count: matching.length };
      });
    }

    // All Time: Group by Month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = now.getMonth();
    const pastMonths = [
      months[(currentMonthIdx - 3 + 12) % 12],
      months[(currentMonthIdx - 2 + 12) % 12],
      months[(currentMonthIdx - 1 + 12) % 12],
      months[currentMonthIdx],
    ];

    return pastMonths.map((m) => {
      const matching = eligibleOrders.filter((o) => {
        const d = new Date(o.created_at);
        return months[d.getMonth()] === m;
      });
      const amountPaise = matching.reduce((sum, o) => sum + o.total_paise, 0);
      return { label: m, amountPaise, count: matching.length };
    });
  }, [eligibleOrders, dateRange]);

  // SVG Chart Geometry
  const svgPoints = useMemo(() => {
    if (chartData.length === 0) return { pathD: '', fillD: '', points: [] };

    const maxAmount = Math.max(...chartData.map((d) => d.amountPaise), 100000);
    const width = 500;
    const height = 150;
    const paddingX = 30;
    const paddingY = 25;

    const points = chartData.map((d, idx) => {
      const x = paddingX + (idx / Math.max(chartData.length - 1, 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (d.amountPaise / maxAmount) * (height - 2 * paddingY);
      return { x, y, ...d };
    });

    if (points.length === 1) {
      return {
        pathD: `M 0,${height - paddingY} L ${width},${height - paddingY}`,
        fillD: `M 0,${height - paddingY} L ${width},${height - paddingY} L ${width},${height} L 0,${height} Z`,
        points,
      };
    }

    // Construct SVG cubic bezier curve
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      pathD += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }

    const fillD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

    return { pathD, fillD, points };
  }, [chartData]);

  // F. Top Ordered Dishes
  const topDishes = useMemo(() => {
    const dishMap = new Map<
      string,
      { name: string; imageUrl?: string; qty: number; revenuePaise: number }
    >();

    orderItems.forEach((it) => {
      const existing = dishMap.get(it.item_name_snapshot);
      if (existing) {
        existing.qty += it.quantity;
        existing.revenuePaise += it.subtotal_paise;
      } else {
        dishMap.set(it.item_name_snapshot, {
          name: it.item_name_snapshot,
          qty: it.quantity,
          revenuePaise: it.subtotal_paise,
        });
      }
    });

    return Array.from(dishMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orderItems]);

  const handleOutletChange = (newOutletId: string) => {
    setSelectedOutletFilter(newOutletId);
    if (newOutletId !== 'all') {
      const found = restaurant?.outlets.find((o) => o.id === newOutletId);
      if (found) setActiveOutlet(found);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-y-auto p-6 space-y-6 select-none transition-colors duration-200">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Owner Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Supabase</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time business performance derived from verified operational records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh Action */}
          <button
            onClick={() => loadDashboardData()}
            className="p-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors shadow-2xs"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Date Filter Pills */}
          <div className="flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800">
            {(['today', 'week', 'month', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  dateRange === r
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Functional Outlet Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
            <Store className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <select
              value={selectedOutletFilter}
              onChange={(e) => handleOutletChange(e.target.value)}
              className="bg-transparent font-bold cursor-pointer focus:outline-none pr-1"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                All Outlets (Consolidated)
              </option>
              {restaurant?.outlets.map((outlet) => (
                <option
                  key={outlet.id}
                  value={outlet.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        /* Skeleton Pulse Loading State */
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/60" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
            <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
          </div>
        </div>
      ) : totalOrdersCount === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Receipt className="w-7 h-7 stroke-[1.75]" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
            No Operational Records for {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'This Period'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Start billing in POS Billing or take guest orders from Table Management to populate your live performance analytics.
          </p>
          <button
            onClick={() => setCurrentView('pos')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Create First POS Bill</span>
          </button>
        </div>
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Gross Sales Card */}
            <div
              onClick={() => setCurrentView('reports')}
              className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-blue-400/60 dark:hover:border-blue-500/40 transition-all cursor-pointer group space-y-2 relative"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Gross Sales</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSalesBreakdownOpen(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="View Detailed Breakdown"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    <span>Real Stored</span>
                  </div>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatPaise(grossSalesPaise)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>{paidOrders.length} Paid • {unpaidOrders.length} Pending</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  Report <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Total Orders Card */}
            <div
              onClick={() => setCurrentView('orders')}
              className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-blue-400/60 dark:hover:border-blue-500/40 transition-all cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total Orders</span>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md">
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  <span>{paidOrders.length} Paid</span>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalOrdersCount}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>
                  {dineInCount} Dine-in • {takeawayCount} Takeaway
                  {cancelledOrders.length > 0 && ` • ${cancelledOrders.length} Void`}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Average Order Value (AOV) Card */}
            <div
              onClick={() => setIsAovHelpOpen(true)}
              className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-blue-400/60 dark:hover:border-blue-500/40 transition-all cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Avg. Order Value</span>
                <span className="text-slate-400 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  AOV
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatPaise(aovPaise)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Per ticket spending</span>
                <span className="text-blue-500 text-[10px] font-semibold flex items-center gap-0.5">
                  Formula <HelpCircle className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Estimated Net Contribution Card */}
            <div
              onClick={() => setCurrentView('expenses')}
              className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-emerald-400/60 dark:hover:border-emerald-500/40 transition-all cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Est. Net Contribution</span>
                <span className="text-emerald-500 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Sales - Expenses
                </span>
              </div>
              <div
                className={`text-2xl font-black tracking-tight ${
                  estNetContributionPaise >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-500 dark:text-amber-400'
                }`}
              >
                {formatPaise(estNetContributionPaise)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Expenses: {formatPaise(totalExpensesPaise)}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  Expenses <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Lower Section: Real Sales Trend Chart & Top Dishes Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Vector Chart */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Revenue Progression</h3>
                  <span className="text-xs text-slate-400">
                    Chronological sales volume for {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'All Time'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                    {eligibleOrders.length} Invoices
                  </span>
                </div>
              </div>

              {/* Real Data Interactive SVG Chart */}
              <div className="h-60 w-full relative flex items-end pt-4">
                {svgPoints.points.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No time-series sales points for this period
                  </div>
                ) : (
                  <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="liveSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Fill */}
                    {svgPoints.fillD && (
                      <path d={svgPoints.fillD} fill="url(#liveSalesGrad)" />
                    )}

                    {/* Curve Line */}
                    {svgPoints.pathD && (
                      <path
                        d={svgPoints.pathD}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Interactive Data Points */}
                    {svgPoints.points.map((pt, i) => (
                      <g key={i}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredChartPoint?.label === pt.label ? 6 : 4}
                          className="fill-blue-600 dark:fill-blue-500 cursor-pointer transition-all hover:scale-125"
                          onMouseEnter={() =>
                            setHoveredChartPoint({
                              label: pt.label,
                              amountPaise: pt.amountPaise,
                              orderCount: pt.count,
                              x: pt.x,
                              y: pt.y,
                            })
                          }
                          onMouseLeave={() => setHoveredChartPoint(null)}
                        />
                      </g>
                    ))}
                  </svg>
                )}

                {/* Tooltip Overlay */}
                {hoveredChartPoint && (
                  <div
                    className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl text-xs space-y-0.5 animate-fade-in"
                    style={{
                      left: `${(hoveredChartPoint.x / 500) * 100}%`,
                      top: `${(hoveredChartPoint.y / 150) * 100}%`,
                    }}
                  >
                    <div className="font-extrabold text-[11px]">{hoveredChartPoint.label}</div>
                    <div className="font-black text-sm text-blue-400 dark:text-blue-600">
                      {formatPaise(hoveredChartPoint.amountPaise)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {hoveredChartPoint.orderCount} Order{hoveredChartPoint.orderCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Chart Horizontal Axis */}
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {chartData.length > 0 ? (
                  chartData.map((d, i) => (
                    <span key={i} className="truncate max-w-[60px] text-center">
                      {d.label}
                    </span>
                  ))
                ) : (
                  <>
                    <span>Start</span>
                    <span>End</span>
                  </>
                )}
              </div>
            </div>

            {/* Top Dishes Leaderboard */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Top Ordered Dishes</h3>
                  <span className="text-xs text-slate-400">By quantity sold in this period</span>
                </div>
                <button
                  onClick={() => setCurrentView('menu')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Menu</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto">
                {topDishes.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                    <UtensilsCrossed className="w-7 h-7 text-slate-300 dark:text-slate-700" />
                    <span>No dishes recorded for this period</span>
                  </div>
                ) : (
                  topDishes.map((td) => (
                    <div
                      key={td.name}
                      onClick={() => setCurrentView('menu')}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Dish Avatar / Fallback */}
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {td.imageUrl ? (
                            <img
                              src={td.imageUrl}
                              alt={td.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {td.name}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatPaise(td.revenuePaise)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                          {td.qty}
                        </span>
                        <span className="text-[10px] text-slate-400">portions</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sales Breakdown Popover Modal */}
      {isSalesBreakdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Sales Accounting Breakdown
                </h3>
              </div>
              <button
                onClick={() => setIsSalesBreakdownOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Gross Item Subtotal:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatPaise(grossItemSalesPaise)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-red-600 dark:text-red-400">
                <span>Discounts Given (-):</span>
                <span className="font-bold">-{formatPaise(totalDiscountPaise)}</span>
              </div>
              <div className="py-2.5 flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>Net Sales (Pre-Tax):</span>
                <span>{formatPaise(netSalesPaise)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-blue-600 dark:text-blue-400">
                <span>Applicable GST Taxes (+):</span>
                <span className="font-bold">+{formatPaise(totalTaxPaise)}</span>
              </div>
              <div className="py-2.5 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/60 px-3 rounded-xl mt-1">
                <span>Total Gross Sales:</span>
                <span>{formatPaise(grossSalesPaise)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Actual Amount Collected:</span>
                <span className="font-bold">{formatPaise(collectedAmountPaise)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-amber-600 dark:text-amber-400">
                <span>Outstanding Unsettled Balance:</span>
                <span className="font-bold">{formatPaise(outstandingBalancePaise)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSalesBreakdownOpen(false);
                setCurrentView('reports');
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              Open Full Sales Report
            </button>
          </div>
        </div>
      )}

      {/* AOV Formula Modal */}
      {isAovHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Average Order Value (AOV)
              </h3>
              <button
                onClick={() => setIsAovHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Calculated strictly using verified non-cancelled orders within the active period:{' '}
                <strong className="text-slate-900 dark:text-white capitalize">{dateRange}</strong>.
              </p>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 font-mono text-[11px] space-y-1">
                <div>AOV = Gross Sales ÷ Total Orders</div>
                <div className="text-blue-600 dark:text-blue-400 font-bold">
                  {formatPaise(grossSalesPaise)} ÷ {totalOrdersCount} = {formatPaise(aovPaise)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsAovHelpOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  TrendingUp,
  Package,
  DollarSign,
  Percent,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Eye,
  Info,
  UtensilsCrossed,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { ItemSalesRow, CategorySalesRow } from '../../types/reports';
import { MenuItem } from '../../types';
import { formatPaise } from '../../utils/currency';
import { ItemSalesCharts } from './ItemSalesCharts';
import { ItemDrillDownModal } from './ItemDrillDownModal';
import { Order } from '../../types';

interface ItemSalesReportProps {
  items: ItemSalesRow[];
  allMenuItems: MenuItem[];
  categories: CategorySalesRow[];
  orders: Order[];
  dateRangeLabel: string;
}

export const ItemSalesReport: React.FC<ItemSalesReportProps> = ({
  items,
  allMenuItems,
  categories,
  orders,
  dateRangeLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerformanceFilter, setSelectedPerformanceFilter] = useState<
    'all' | 'top_qty' | 'top_revenue' | 'high_margin' | 'low_sales' | 'zero_sales'
  >('all');
  const [sortField, setSortField] = useState<keyof ItemSalesRow>('quantitySold');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItemForDrillDown, setSelectedItemForDrillDown] = useState<ItemSalesRow | null>(
    null
  );
  const [showCharts, setShowCharts] = useState(true);

  // Identify dishes with ZERO sales in the period
  const soldItemIds = useMemo(() => new Set(items.map((i) => i.menuItemId)), [items]);
  const zeroSalesMenuItems = useMemo(() => {
    return allMenuItems.filter((m) => !soldItemIds.has(m.id));
  }, [allMenuItems, soldItemIds]);

  // Aggregate daily sales for charts
  const dailySalesList = useMemo(() => {
    const dayMap: { [date: string]: { date: string; quantity: number; revenuePaise: number } } = {};
    orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((o) => {
        const dStr = new Date(o.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        });
        if (!dayMap[dStr]) dayMap[dStr] = { date: dStr, quantity: 0, revenuePaise: 0 };
        o.items.forEach((item) => {
          if (item.kotStatus !== 'cancelled') {
            dayMap[dStr].quantity += item.quantity;
            dayMap[dStr].revenuePaise += item.subtotalPaise;
          }
        });
      });
    return Object.values(dayMap);
  }, [orders]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalQty = items.reduce((sum, i) => sum + i.quantitySold, 0);
    const grossSales = items.reduce((sum, i) => sum + i.grossSalesPaise, 0);
    const totalDiscounts = items.reduce((sum, i) => sum + i.discountsPaise, 0);
    const netSales = items.reduce((sum, i) => sum + i.netSalesPaise, 0);
    const totalRefunds = items.reduce((sum, i) => sum + i.refundedAmountPaise, 0);

    // Items with recipe food cost configured
    const costedItems = items.filter((i) => i.hasCostConfigured && i.totalFoodCostPaise !== null);
    const totalFoodCost = costedItems.reduce((sum, i) => sum + (i.totalFoodCostPaise || 0), 0);
    const costedNetSales = costedItems.reduce((sum, i) => sum + i.netSalesPaise, 0);
    const grossProfit = costedNetSales - totalFoodCost;
    const grossProfitMargin =
      costedNetSales > 0 ? Math.round((grossProfit / costedNetSales) * 1000) / 10 : null;

    return {
      totalQty,
      grossSales,
      totalDiscounts,
      netSales,
      totalRefunds,
      totalFoodCost: costedItems.length > 0 ? totalFoodCost : null,
      grossProfit: costedItems.length > 0 ? grossProfit : null,
      grossProfitMargin,
      costedCount: costedItems.length,
      totalCount: items.length,
    };
  }, [items]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.categoryName.toLowerCase().includes(q)
      );
    }

    // Performance quick filters
    if (selectedPerformanceFilter === 'top_qty') {
      result = result.sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);
    } else if (selectedPerformanceFilter === 'top_revenue') {
      result = result.sort((a, b) => b.netSalesPaise - a.netSalesPaise).slice(0, 10);
    } else if (selectedPerformanceFilter === 'high_margin') {
      result = result
        .filter((i) => i.grossMarginPct !== null && i.grossMarginPct >= 65)
        .sort((a, b) => (b.grossMarginPct || 0) - (a.grossMarginPct || 0));
    } else if (selectedPerformanceFilter === 'low_sales') {
      result = result.filter((i) => i.quantitySold < 5).sort((a, b) => a.quantitySold - b.quantitySold);
    }

    // Dynamic Column Sorting
    result.sort((a, b) => {
      const valA = a[sortField] ?? -Infinity;
      const valB = b[sortField] ?? -Infinity;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [items, searchQuery, selectedPerformanceFilter, sortField, sortDirection]);

  const handleSort = (field: keyof ItemSalesRow) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SALES SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items Sold */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Items Sold</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summaryMetrics.totalQty.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Across {items.length} unique dishes
          </span>
        </div>

        {/* Gross vs Net Item Sales */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
              Net Item Sales
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatPaise(summaryMetrics.netSales)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span>Gross: {formatPaise(summaryMetrics.grossSales)}</span>
            {summaryMetrics.totalDiscounts > 0 && (
              <span className="text-amber-500 font-medium">
                (-{formatPaise(summaryMetrics.totalDiscounts)} disc)
              </span>
            )}
          </div>
        </div>

        {/* Estimated Food Cost */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Est. Food Cost</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summaryMetrics.totalFoodCost !== null
              ? formatPaise(summaryMetrics.totalFoodCost)
              : '—'}
          </div>
          <span className="text-[11px] text-slate-400">
            Based on {summaryMetrics.costedCount} of {summaryMetrics.totalCount} dishes with recipes
          </span>
        </div>

        {/* Estimated Gross Profit & Margin */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              Est. Gross Profit
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryMetrics.grossProfit !== null
              ? formatPaise(summaryMetrics.grossProfit)
              : '—'}
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {summaryMetrics.grossProfitMargin !== null
              ? `${summaryMetrics.grossProfitMargin}% Profit Margin`
              : 'Recipe costs incomplete'}
          </span>
        </div>
      </div>

      {/* 2. VISUAL CHARTS SECTION */}
      {showCharts && (
        <ItemSalesCharts
          items={items}
          categories={categories}
          dailySales={dailySalesList}
          onSelectItem={(item) => setSelectedItemForDrillDown(item)}
        />
      )}

      {/* 3. PERFORMANCE VIEWS & CONTROLS */}
      <div className="bg-white dark:bg-[#121824] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Top Control Bar: Search & View Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Performance Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-bold">
            {[
              { id: 'all', label: `All Sold (${items.length})` },
              { id: 'top_qty', label: 'Top Quantity' },
              { id: 'top_revenue', label: 'Top Revenue' },
              { id: 'high_margin', label: 'High Margin (65%+)' },
              { id: 'low_sales', label: 'Low Performing (<5)' },
              { id: 'zero_sales', label: `Zero Sales (${zeroSalesMenuItems.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedPerformanceFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  selectedPerformanceFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dish or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowCharts((prev) => !prev)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {showCharts ? 'Hide Visuals' : 'Show Visuals'}
            </button>
          </div>
        </div>

        {/* 4. ZERO SALES DISHES VIEW */}
        {selectedPerformanceFilter === 'zero_sales' ? (
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Zero-Sales Menu Dishes in {dateRangeLabel}
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  These dishes are listed on the active menu but recorded 0 sales in the selected period. Consider evaluating kitchen prep waste, promoting, or repositioning them.
                </p>
              </div>
            </div>

            {zeroSalesMenuItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                All menu dishes recorded sales in this period!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="p-3 pl-4">Dish Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Dietary</th>
                      <th className="p-3 text-right">Menu Price</th>
                      <th className="p-3 pr-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {zeroSalesMenuItems.map((dish) => {
                      const catName =
                        categories.find((c) => c.categoryId === dish.categoryId)?.categoryName ||
                        'Main Course';
                      return (
                        <tr key={dish.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                          <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">
                            {dish.name}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{catName}</td>
                          <td className="p-3">
                            <span
                              className={`text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                dish.foodType === 'veg'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {dish.foodType}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatPaise(dish.basePricePaise)}
                          </td>
                          <td className="p-3 pr-4 text-center">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                              0 sold in period
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* 5. ITEM SALES REPORT TABLE */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase select-none">
                <tr>
                  <th
                    onClick={() => handleSort('rank')}
                    className="p-3.5 pl-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Rank</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Item Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Dietary</th>
                  <th
                    onClick={() => handleSort('quantitySold')}
                    className="p-3.5 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Qty Sold</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('grossSalesPaise')}
                    className="p-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Gross Sales</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right">Discounts</th>
                  <th
                    onClick={() => handleSort('netSalesPaise')}
                    className="p-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Net Sales</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalFoodCostPaise')}
                    className="p-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Est. Food Cost</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('grossProfitPaise')}
                    className="p-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Gross Profit</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('grossMarginPct')}
                    className="p-3.5 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Margin %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right">Refunds</th>
                  <th className="p-3.5 pr-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-xs text-slate-400">
                      No dishes found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.menuItemId}
                      onClick={() => setSelectedItemForDrillDown(item)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 pl-4 font-extrabold text-slate-400 group-hover:text-blue-600">
                        #{item.rank}
                      </td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Avg Rate: {formatPaise(item.averageSellingPricePaise)}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {item.categoryName}
                      </td>
                      <td className="p-3.5">
                        {item.dietaryType ? (
                          <span
                            className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                              item.dietaryType === 'veg'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.dietaryType === 'non_veg'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.dietaryType.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-extrabold text-slate-900 dark:text-white">
                        {item.quantitySold}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatPaise(item.grossSalesPaise)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-600">
                        {item.discountsPaise > 0 ? `-${formatPaise(item.discountsPaise)}` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatPaise(item.netSalesPaise)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        {item.hasCostConfigured && item.totalFoodCostPaise !== null ? (
                          formatPaise(item.totalFoodCostPaise)
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Cost not configured
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold">
                        {item.hasCostConfigured && item.grossProfitPaise !== null ? (
                          <span
                            className={
                              item.grossProfitPaise >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600'
                            }
                          >
                            {formatPaise(item.grossProfitPaise)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {item.hasCostConfigured && item.grossMarginPct !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.grossMarginPct >= 65
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.grossMarginPct >= 50
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.grossMarginPct}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {item.refundedQuantity > 0 ? (
                          <span className="text-rose-600 font-bold">
                            {item.refundedQuantity} ({formatPaise(item.refundedAmountPaise)})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForDrillDown(item);
                          }}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View dish details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Drill Down Modal */}
      <ItemDrillDownModal
        item={selectedItemForDrillDown}
        isOpen={Boolean(selectedItemForDrillDown)}
        onClose={() => setSelectedItemForDrillDown(null)}
        orders={orders}
        dateRangeLabel={dateRangeLabel}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { BarChart3, TrendingUp, PieChart, Calendar, ChevronRight } from 'lucide-react';
import { ItemSalesRow, CategorySalesRow } from '../../types/reports';
import { formatPaise } from '../../utils/currency';

interface ItemSalesChartsProps {
  items: ItemSalesRow[];
  categories: CategorySalesRow[];
  dailySales: { date: string; quantity: number; revenuePaise: number }[];
  onSelectItem: (item: ItemSalesRow) => void;
}

export const ItemSalesCharts: React.FC<ItemSalesChartsProps> = ({
  items,
  categories,
  dailySales,
  onSelectItem,
}) => {
  const [chartView, setChartView] = useState<'quantity' | 'revenue' | 'categories' | 'daily'>(
    'quantity'
  );

  if (items.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
        <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Sales Data For Visualizations</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          No dish sales records match the selected date and filter criteria. Adjust filters or choose a broader date range.
        </p>
      </div>
    );
  }

  // Sorted items
  const topByQty = [...items].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);
  const maxQty = Math.max(...topByQty.map((i) => i.quantitySold), 1);

  const topByRevenue = [...items].sort((a, b) => b.netSalesPaise - a.netSalesPaise).slice(0, 10);
  const maxRevenue = Math.max(...topByRevenue.map((i) => i.netSalesPaise), 1);

  const maxDailyQty = Math.max(...dailySales.map((d) => d.quantity), 1);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Chart Switcher Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Menu Performance Visualizations
          </h3>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-bold gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setChartView('quantity')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartView === 'quantity'
                ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Top by Quantity
          </button>
          <button
            type="button"
            onClick={() => setChartView('revenue')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartView === 'revenue'
                ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Top by Net Revenue
          </button>
          <button
            type="button"
            onClick={() => setChartView('categories')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartView === 'categories'
                ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Category Distribution
          </button>
          <button
            type="button"
            onClick={() => setChartView('daily')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartView === 'daily'
                ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daily Sales Trend
          </button>
        </div>
      </div>

      {/* CHART 1: TOP 10 ITEMS BY QUANTITY */}
      {chartView === 'quantity' && (
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Dish (Click row to inspect)</span>
            <span>Quantity Sold • Net Revenue</span>
          </div>
          <div className="space-y-2.5">
            {topByQty.map((item, idx) => {
              const pct = Math.round((item.quantitySold / maxQty) * 100);
              return (
                <div
                  key={item.menuItemId}
                  onClick={() => onSelectItem(item)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                >
                  <div className="sm:w-1/3 flex items-center gap-2">
                    <span className="w-5 text-[11px] font-bold text-slate-400 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate hidden md:inline">
                      ({item.categoryName})
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500 group-hover:bg-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right shrink-0 min-w-[130px]">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white mr-2">
                        {item.quantitySold} units
                      </span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatPaise(item.netSalesPaise)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CHART 2: TOP 10 ITEMS BY REVENUE */}
      {chartView === 'revenue' && (
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Dish (Click row to inspect)</span>
            <span>Net Revenue Generated • Units Sold</span>
          </div>
          <div className="space-y-2.5">
            {topByRevenue.map((item, idx) => {
              const pct = Math.round((item.netSalesPaise / maxRevenue) * 100);
              return (
                <div
                  key={item.menuItemId}
                  onClick={() => onSelectItem(item)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                >
                  <div className="sm:w-1/3 flex items-center gap-2">
                    <span className="w-5 text-[11px] font-bold text-slate-400 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate hidden md:inline">
                      ({item.categoryName})
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500 group-hover:bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right shrink-0 min-w-[130px]">
                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 mr-2">
                        {formatPaise(item.netSalesPaise)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({item.quantitySold} sold)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CHART 3: CATEGORY REVENUE DISTRIBUTION */}
      {chartView === 'categories' && (
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Menu Category</span>
            <span>Share of Net Sales • Total Revenue</span>
          </div>
          <div className="space-y-2.5">
            {categories.map((cat) => (
              <div
                key={cat.categoryId}
                className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {cat.categoryName} ({cat.itemCount} dishes)
                  </span>
                  <div className="space-x-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {cat.revenueSharePct}% share
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatPaise(cat.netSalesPaise)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.revenueSharePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHART 4: DAILY SALES TREND */}
      {chartView === 'daily' && (
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Date</span>
            <span>Quantity Sold • Daily Revenue</span>
          </div>
          {dailySales.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No daily records in this period</p>
          ) : (
            <div className="space-y-2">
              {dailySales.map((d) => {
                const pct = Math.round((d.quantity / maxDailyQty) * 100);
                return (
                  <div key={d.date} className="flex items-center justify-between gap-3 text-xs">
                    <span className="w-24 font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {d.date}
                    </span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-right shrink-0 min-w-[130px]">
                      <span className="font-extrabold text-slate-900 dark:text-white mr-2">
                        {d.quantity} units
                      </span>
                      <span className="font-mono text-slate-500">{formatPaise(d.revenuePaise)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

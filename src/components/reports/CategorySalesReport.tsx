import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  PieChart,
  TrendingUp,
  DollarSign,
  Package,
  UtensilsCrossed,
  Eye,
} from 'lucide-react';
import { CategorySalesRow, ItemSalesRow } from '../../types/reports';
import { formatPaise } from '../../utils/currency';
import { ItemDrillDownModal } from './ItemDrillDownModal';
import { Order } from '../../types';

interface CategorySalesReportProps {
  categories: CategorySalesRow[];
  totalNetSalesPaise: number;
  orders: Order[];
  dateRangeLabel: string;
}

export const CategorySalesReport: React.FC<CategorySalesReportProps> = ({
  categories,
  totalNetSalesPaise,
  orders,
  dateRangeLabel,
}) => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [selectedItemForDrillDown, setSelectedItemForDrillDown] = useState<ItemSalesRow | null>(
    null
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const topCategory = categories[0] || null;
  const totalCategoryItemsSold = categories.reduce((sum, c) => sum + c.quantitySold, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Categories Reporting</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {categories.length}
          </div>
          <span className="text-[11px] text-slate-400">Configured menu groups</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
            Top Category
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 truncate">
            {topCategory ? topCategory.categoryName : '—'}
          </div>
          <span className="text-[11px] text-blue-600 font-bold">
            {topCategory ? `${topCategory.revenueSharePct}% of total net sales` : '—'}
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Category Volume</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalCategoryItemsSold.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Total portions served</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            Net Revenue
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatPaise(totalNetSalesPaise)}
          </div>
          <span className="text-[11px] text-slate-400">In {dateRangeLabel}</span>
        </div>
      </div>

      {/* Category Performance Table */}
      <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Category Sales & Revenue Share
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any category row to drill down into individual dishes sold
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {categories.length} Categories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase select-none">
              <tr>
                <th className="p-3.5 pl-6 w-8"></th>
                <th className="p-3.5">Category Name</th>
                <th className="p-3.5 text-center">Items Sold</th>
                <th className="p-3.5 text-right">Gross Sales</th>
                <th className="p-3.5 text-right">Discounts</th>
                <th className="p-3.5 text-right">Net Sales</th>
                <th className="p-3.5 text-center w-36">Share of Sales</th>
                <th className="p-3.5 text-right">Est. Food Cost</th>
                <th className="p-3.5 text-right">Gross Profit</th>
                <th className="p-3.5 pr-6 text-center">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-slate-400">
                    No category sales records in this period.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const isExpanded = expandedCategoryId === cat.categoryId;
                  return (
                    <React.Fragment key={cat.categoryId}>
                      <tr
                        onClick={() => toggleCategory(cat.categoryId)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 pl-6 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {cat.categoryName}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {cat.itemCount} menu items
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white">
                          {cat.quantitySold} units
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatPaise(cat.grossSalesPaise)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-amber-600">
                          {cat.discountsPaise > 0 ? `-${formatPaise(cat.discountsPaise)}` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatPaise(cat.netSalesPaise)}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full"
                                style={{ width: `${cat.revenueSharePct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-9 text-right">
                              {cat.revenueSharePct}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                          {cat.hasCostConfigured && cat.totalFoodCostPaise !== null ? (
                            formatPaise(cat.totalFoodCostPaise)
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Partial / None</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold">
                          {cat.hasCostConfigured && cat.grossProfitPaise !== null ? (
                            <span
                              className={
                                cat.grossProfitPaise >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600'
                              }
                            >
                              {formatPaise(cat.grossProfitPaise)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3.5 pr-6 text-center">
                          {cat.hasCostConfigured && cat.grossMarginPct !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cat.grossMarginPct >= 65
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {cat.grossMarginPct}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Drill Down: Dishes inside this Category */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="p-0 bg-slate-50/80 dark:bg-slate-900/50">
                            <div className="p-4 pl-12 space-y-2 border-y border-slate-200 dark:border-slate-800">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Dishes sold under {cat.categoryName} ({cat.items.length})
                              </h5>
                              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824]">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                                    <tr>
                                      <th className="p-2.5 pl-4">Rank</th>
                                      <th className="p-2.5">Dish Name</th>
                                      <th className="p-2.5">Dietary</th>
                                      <th className="p-2.5 text-center">Qty</th>
                                      <th className="p-2.5 text-right">Net Sales</th>
                                      <th className="p-2.5 text-right">Food Cost</th>
                                      <th className="p-2.5 text-right">Gross Profit</th>
                                      <th className="p-2.5 text-center">Margin</th>
                                      <th className="p-2.5 pr-4 text-center">Inspect</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {cat.items.map((dish) => (
                                      <tr
                                        key={dish.menuItemId}
                                        onClick={() => setSelectedItemForDrillDown(dish)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer"
                                      >
                                        <td className="p-2.5 pl-4 font-bold text-slate-400">
                                          #{dish.rank}
                                        </td>
                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                                          {dish.name}
                                        </td>
                                        <td className="p-2.5">
                                          {dish.dietaryType ? (
                                            <span
                                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                dish.dietaryType === 'veg'
                                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                              }`}
                                            >
                                              {dish.dietaryType}
                                            </span>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-bold">
                                          {dish.quantitySold}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                          {formatPaise(dish.netSalesPaise)}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-500">
                                          {dish.hasCostConfigured && dish.totalFoodCostPaise !== null
                                            ? formatPaise(dish.totalFoodCostPaise)
                                            : 'Cost not configured'}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                                          {dish.hasCostConfigured && dish.grossProfitPaise !== null
                                            ? formatPaise(dish.grossProfitPaise)
                                            : '—'}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {dish.hasCostConfigured && dish.grossMarginPct !== null
                                            ? `${dish.grossMarginPct}%`
                                            : '—'}
                                        </td>
                                        <td className="p-2.5 pr-4 text-center">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedItemForDrillDown(dish);
                                            }}
                                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:text-blue-600"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill Down Modal */}
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

import React from 'react';
import {
  X,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  UtensilsCrossed,
  Receipt,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ItemSalesRow } from '../../types/reports';
import { Order, CartItem } from '../../types';
import { formatPaise } from '../../utils/currency';

interface ItemDrillDownModalProps {
  item: ItemSalesRow | null;
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  dateRangeLabel: string;
}

export const ItemDrillDownModal: React.FC<ItemDrillDownModalProps> = ({
  item,
  isOpen,
  onClose,
  orders,
  dateRangeLabel,
}) => {
  if (!isOpen || !item) return null;

  // Find all orders that included this menu item
  const matchingOrders: { order: Order; lineItem: CartItem }[] = [];
  orders
    .filter((o) => o.status !== 'cancelled')
    .forEach((o) => {
      const lineItem = o.items.find(
        (i) => i.menuItem.id === item.menuItemId && i.kotStatus !== 'cancelled'
      );
      if (lineItem) {
        matchingOrders.push({ order: o, lineItem });
      }
    });

  // Group sales by day
  const salesByDayMap: { [dateStr: string]: { date: string; quantity: number; revenuePaise: number } } = {};
  matchingOrders.forEach(({ order, lineItem }) => {
    const dayKey = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
    if (!salesByDayMap[dayKey]) {
      salesByDayMap[dayKey] = { date: dayKey, quantity: 0, revenuePaise: 0 };
    }
    salesByDayMap[dayKey].quantity += lineItem.quantity;
    salesByDayMap[dayKey].revenuePaise += lineItem.subtotalPaise;
  });
  const salesByDay = Object.values(salesByDayMap);

  // Group sales by order type
  const salesByTypeMap: { [type: string]: number } = {
    dine_in: 0,
    takeaway: 0,
    delivery: 0,
    counter: 0,
  };
  matchingOrders.forEach(({ order, lineItem }) => {
    const type = order.orderType || 'dine_in';
    salesByTypeMap[type] = (salesByTypeMap[type] || 0) + lineItem.quantity;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-200 dark:border-blue-800">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {item.name}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Rank #{item.rank}
                </span>
                {item.dietaryType && (
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      item.dietaryType === 'veg'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.dietaryType === 'non_veg'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {item.dietaryType.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Category: <strong>{item.categoryName}</strong> • Base Price: {formatPaise(item.basePricePaise)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
              {dateRangeLabel}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Quantity Sold</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {item.quantitySold}
              </div>
              <span className="text-[11px] text-slate-500">
                In {item.orderCount} orders
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Revenue</span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {formatPaise(item.netSalesPaise)}
              </div>
              <span className="text-[11px] text-slate-500">
                {item.discountsPaise > 0 ? `-${formatPaise(item.discountsPaise)} disc` : 'Zero discounts'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Food Cost</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {item.hasCostConfigured && item.totalFoodCostPaise !== null
                  ? formatPaise(item.totalFoodCostPaise)
                  : '—'}
              </div>
              <span className="text-[11px] text-slate-500">
                {item.hasCostConfigured && item.unitCostPaise !== null
                  ? `${formatPaise(item.unitCostPaise)} / portion`
                  : 'Cost not configured'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Profit</span>
              <div
                className={`text-xl font-black mt-1 ${
                  item.grossProfitPaise !== null && item.grossProfitPaise >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {item.hasCostConfigured && item.grossProfitPaise !== null
                  ? formatPaise(item.grossProfitPaise)
                  : '—'}
              </div>
              <span className="text-[11px] text-slate-500">
                {item.hasCostConfigured && item.grossMarginPct !== null
                  ? `${item.grossMarginPct}% Margin`
                  : 'No recipe cost'}
              </span>
            </div>
          </div>

          {/* Sales Breakdown by Order Type */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Sales Distribution by Channel
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Dine-In', qty: salesByTypeMap.dine_in, color: 'bg-blue-500' },
                { label: 'Takeaway', qty: salesByTypeMap.takeaway, color: 'bg-emerald-500' },
                { label: 'Delivery', qty: salesByTypeMap.delivery, color: 'bg-amber-500' },
                { label: 'Counter', qty: salesByTypeMap.counter, color: 'bg-purple-500' },
              ].map((c) => {
                const pct = item.quantitySold > 0 ? Math.round((c.qty / item.quantitySold) * 100) : 0;
                return (
                  <div key={c.label} className="p-2.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">{c.label}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {c.qty} units
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${c.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Trend Table */}
          {salesByDay.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Daily Sales Activity ({salesByDay.length} Days)
              </h4>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="p-3 pl-4">Date</th>
                      <th className="p-3 text-center">Quantity Sold</th>
                      <th className="p-3 text-right pr-4">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {salesByDay.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 pl-4 font-bold text-slate-800 dark:text-slate-200">
                          {d.date}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                          {d.quantity} units
                        </td>
                        <td className="p-3 text-right pr-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatPaise(d.revenuePaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Completed Orders containing this dish */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Recent Associated Orders ({matchingOrders.length})
            </h4>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase sticky top-0">
                  <tr>
                    <th className="p-2.5 pl-4">Order #</th>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Table / Channel</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Line Total</th>
                    <th className="p-2.5 pr-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {matchingOrders.slice(0, 15).map(({ order, lineItem }) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-2.5 pl-4 font-extrabold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-2.5 capitalize text-slate-600 dark:text-slate-300 text-[11px]">
                        {order.tableName || order.orderType.replace('_', ' ')}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {lineItem.quantity}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatPaise(lineItem.subtotalPaise)}
                      </td>
                      <td className="p-2.5 pr-4 text-center">
                        <span
                          className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                            order.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

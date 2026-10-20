import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { Order } from '../../types';
import { formatPaise } from '../../utils/currency';
import { printService } from '../../services/printService';

export const OrdersView: React.FC = () => {
  const { activeOutlet, settings, restaurant, addToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const fetchOrders = async () => {
    if (!activeOutlet) return;
    const res = await localRepository.getOrders(activeOutlet.id);
    setOrders(res);
  };

  useEffect(() => {
    fetchOrders();
  }, [activeOutlet]);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchesSearch =
      search.trim() === '' ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.tableName && o.tableName.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-hidden select-none p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Order Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full order lifecycle & payment audit records
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search #105 or Table..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
            {['all', 'confirmed', 'preparing', 'ready', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
              <th className="p-4 pl-6">Order</th>
              <th className="p-4">Type / Table</th>
              <th className="p-4">Items Summary</th>
              <th className="p-4">Status</th>
              <th className="p-4">Payment</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 pr-6 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <td className="p-4 pl-6">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>

                <td className="p-4">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {order.tableName || 'Counter'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    {order.orderType.replace('_', ' ')}
                  </span>
                </td>

                <td className="p-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                  {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                </td>

                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      order.status === 'ready'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : order.status === 'preparing'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        : order.status === 'completed'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>

                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </td>

                <td className="p-4 text-right font-black text-sm text-slate-900 dark:text-white">
                  {formatPaise(order.totalPaise)}
                </td>

                <td className="p-4 pr-6 text-center">
                  <button
                    onClick={async () => {
                      const res = await printService.printReceipt(order, settings, restaurant, activeOutlet);
                      if (res.success) {
                        addToast(`Receipt for order ${order.orderNumber} sent directly to ${res.printerName} (${settings?.receiptPaperWidth || '80mm'})`, 'success');
                      } else {
                        addToast(`Direct printing: ${res.error || res.message}`, 'warning');
                      }
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Print Receipt Directly"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <Receipt className="w-6 h-6 stroke-1" />
                  </div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No orders recorded</p>
                  <p className="text-xs text-slate-400 mt-1">Orders placed in the POS or Waiter App will appear here in real time.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

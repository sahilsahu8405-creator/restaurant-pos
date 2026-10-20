import React, { useEffect, useState } from 'react';
import {
  Wallet,
  Plus,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  History,
  TrendingDown,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { DayClosingRecord, ExpenseRecord, Order } from '../../types';
import { formatPaise, rupeesToPaise } from '../../utils/currency';

export const ExpensesView: React.FC = () => {
  const { activeOutlet, addToast } = useApp();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [closings, setClosings] = useState<DayClosingRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'closings'>('expenses');

  // New Expense Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState('Vegetables & Produce');
  const [amountRupees, setAmountRupees] = useState<number>(500);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');

  // Day Closing Modal State
  const [isClosingOpen, setIsClosingOpen] = useState(false);
  const [openingFloatRupees, setOpeningFloatRupees] = useState<number>(2000);
  const [countedCashRupees, setCountedCashRupees] = useState<number>(2000);
  const [closingNotes, setClosingNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    if (!activeOutlet) return;
    const exp = await localRepository.getExpenses(activeOutlet.id);
    setExpenses(exp);
    const cls = await localRepository.getDayClosings(activeOutlet.id);
    setClosings(cls);
    const ord = await localRepository.getOrders(activeOutlet.id);
    setOrders(ord);
  };

  useEffect(() => {
    fetchData();
  }, [activeOutlet]);

  // Dynamic Day-End Cash Calculation
  const todayOrders = orders.filter((o) => {
    const isToday = o.createdAt?.startsWith(todayStr);
    return isToday && o.status !== 'cancelled';
  });

  const cashOrders = todayOrders.filter((o) => o.paymentMethod === 'cash');
  const upiOrders = todayOrders.filter((o) => o.paymentMethod === 'upi');
  const cardOrders = todayOrders.filter((o) => o.paymentMethod === 'card');

  const cashSalesPaise = cashOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const upiSalesPaise = upiOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const cardSalesPaise = cardOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalSalesPaise = cashSalesPaise + upiSalesPaise + cardSalesPaise;

  const todayCashExpensesPaise = expenses
    .filter((e) => e.date === todayStr && e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amountPaise, 0);

  const openingFloatPaise = rupeesToPaise(openingFloatRupees);
  const expectedCashPaise = Math.max(0, openingFloatPaise + cashSalesPaise - todayCashExpensesPaise);
  const countedCashPaise = rupeesToPaise(countedCashRupees);
  const cashVariancePaise = countedCashPaise - expectedCashPaise;
  const cashVarianceRupees = cashVariancePaise / 100;

  // Initialize counted cash when opening closing modal
  const handleOpenDayClose = () => {
    setCountedCashRupees(expectedCashPaise / 100);
    setIsClosingOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOutlet) return;
    if (amountRupees <= 0) {
      addToast('Please enter a valid expense amount', 'error');
      return;
    }

    await localRepository.addExpense({
      outletId: activeOutlet.id,
      category,
      amountPaise: rupeesToPaise(amountRupees),
      paymentMethod,
      description: description.trim() || category,
      date: todayStr,
    });

    await fetchData();
    setIsAdding(false);
    setDescription('');
    addToast('Expense recorded successfully', 'success');
  };

  const handleConfirmClosing = async () => {
    if (!activeOutlet) return;

    await localRepository.recordDayClosing({
      outletId: activeOutlet.id,
      date: todayStr,
      openingCashPaise: openingFloatPaise,
      cashSalesPaise,
      cashRefundsPaise: 0,
      expectedCashPaise,
      countedCashPaise,
      cashVariancePaise,
      upiCollectedPaise: upiSalesPaise,
      cardCollectedPaise: cardSalesPaise,
      totalSalesPaise,
      totalOrders: todayOrders.length,
      notes: closingNotes.trim() || (cashVariancePaise === 0 ? 'Cash drawer balanced' : `Variance ₹${cashVarianceRupees}`),
    });

    await fetchData();
    setIsClosingOpen(false);
    addToast(
      `Day closed! Cash variance: ${formatPaise(cashVariancePaise)}. Reconciled record saved.`,
      cashVariancePaise === 0 ? 'success' : 'warning'
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-y-auto select-none p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Expenses & Day Closing</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Petty cash logging, procurement invoices, and register cash reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Operating Expenses</span>
            </button>
            <button
              onClick={() => setActiveTab('closings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'closings'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Day Closings Ledger</span>
            </button>
          </div>

          <button
            onClick={handleOpenDayClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Close Day (Reconcile)</span>
          </button>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total Expenses Recorded</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatPaise(expenses.reduce((a, b) => a + b.amountPaise, 0))}
          </div>
          <span className="text-[11px] text-slate-400">{expenses.length} operating disbursements</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Today's Cash In Drawer</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatPaise(expectedCashPaise)}
          </div>
          <span className="text-[11px] text-slate-400">Float + {formatPaise(cashSalesPaise)} cash sales</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Today's Digital Sales</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatPaise(upiSalesPaise + cardSalesPaise)}
          </div>
          <span className="text-[11px] text-slate-400">UPI & Card verified payouts</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total Orders Today</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {todayOrders.length}
          </div>
          <span className="text-[11px] text-slate-400">Gross: {formatPaise(totalSalesPaise)}</span>
        </div>
      </div>

      {activeTab === 'expenses' ? (
        /* Expenses Table */
        <div className="flex-1 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Recent Operating Expenses</h2>
            <span className="text-xs text-slate-400">{expenses.length} Records</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                <th className="p-4 pl-6">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4 pr-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="p-4 pl-6 font-mono text-slate-500">{exp.date}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{exp.category}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{exp.description}</td>
                  <td className="p-4 uppercase text-[10px] font-bold text-blue-500">{exp.paymentMethod}</td>
                  <td className="p-4 pr-6 text-right font-black text-sm text-slate-900 dark:text-white">
                    {formatPaise(exp.amountPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Day Closings Ledger */
        <div className="flex-1 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Past Day-End Reconciliations</h2>
            <span className="text-xs text-slate-400">{closings.length} Archived Closings</span>
          </div>

          {closings.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No previous day-end reconciliations recorded yet. Use the "Close Day (Reconcile)" action at night to record register closure.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="p-4 pl-6">Business Date</th>
                  <th className="p-4">Expected Cash</th>
                  <th className="p-4">Counted Cash</th>
                  <th className="p-4">Cash Variance</th>
                  <th className="p-4">Digital Sales</th>
                  <th className="p-4">Total Orders</th>
                  <th className="p-4 pr-6">Notes / Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {closings.map((c) => {
                  const isBalanced = c.cashVariancePaise === 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="p-4 pl-6 font-mono font-bold text-slate-900 dark:text-white">
                        {c.date}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {new Date(c.closedAt).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{formatPaise(c.expectedCashPaise)}</td>
                      <td className="p-4 font-mono font-bold">{formatPaise(c.countedCashPaise)}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isBalanced
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                          }`}
                        >
                          {isBalanced ? 'Balanced (₹0)' : formatPaise(c.cashVariancePaise)}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {formatPaise(c.upiCollectedPaise + c.cardCollectedPaise)}
                      </td>
                      <td className="p-4 font-bold">{c.totalOrders}</td>
                      <td className="p-4 pr-6 text-slate-500">{c.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New Expense Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleCreateExpense}
            className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Record Operating Expense</h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="font-semibold text-slate-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none"
              >
                <option>Vegetables & Produce</option>
                <option>Dairy Supplies</option>
                <option>LPG Cylinders & Fuel</option>
                <option>Cleaning & Disposables</option>
                <option>Repairs & Maintenance</option>
                <option>Staff Welfare & Meals</option>
                <option>Store Utilities</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-500">Amount (₹)</label>
              <input
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(Number(e.target.value))}
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                required
                min="1"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-500">Paid Via</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="upi">UPI (Direct QR / Payout)</option>
                <option value="cash">Cash Register (Petty Cash Drawer)</option>
                <option value="card">Company Debit/Credit Card</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-500">Description / Bill Reference</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Milk & Paneer morning delivery from Amul"
                className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm active:scale-95 transition-all"
              >
                Save Expense Record
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Day Closing Modal */}
      {isClosingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Day-End Register Reconciliation</h3>
                <p className="text-slate-500">Reconcile physical cash drawer with POS orders for {todayStr}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-2.5 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Opening Cash Float:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white">
                  <span>₹</span>
                  <input
                    type="number"
                    value={openingFloatRupees}
                    onChange={(e) => setOpeningFloatRupees(Number(e.target.value))}
                    className="w-20 px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>POS Cash Sales Today:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPaise(cashSalesPaise)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Cash Expenses Deducted:</span>
                <span className="font-mono font-bold text-red-500">-{formatPaise(todayCashExpensesPaise)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-bold text-sm">
                <span className="text-slate-900 dark:text-white">System Expected Cash In Drawer:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{formatPaise(expectedCashPaise)}</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Physical Cash Counted in Drawer (₹)
              </label>
              <input
                type="number"
                value={countedCashRupees}
                onChange={(e) => setCountedCashRupees(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-xl"
              />
            </div>

            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between font-bold text-sm ${
                cashVariancePaise === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : cashVariancePaise > 0
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              }`}
            >
              <span>Cash Variance</span>
              <span>
                {cashVariancePaise === 0
                  ? '₹0.00 (Perfect Match)'
                  : cashVariancePaise > 0
                  ? `+₹${cashVarianceRupees} (Surplus)`
                  : `-₹${Math.abs(cashVarianceRupees)} (Shortage)`}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-500">Closing Notes / Discrepancy Reason</label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Optional explanation for manager audit..."
                className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmClosing}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm active:scale-95 transition-all"
              >
                Confirm Day Close & Archive
              </button>
              <button
                onClick={() => setIsClosingOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

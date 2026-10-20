import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { PaymentMethod, Order } from '../../types';
import { formatPaise, rupeesToPaise } from '../../utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paidOrder: Order) => void;
  order?: Order | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  order,
}) => {
  const { totalPaise, paidAmountPaise, submitActiveOrder, addToast } = useApp();

  const effectiveTotalPaise = order ? order.totalPaise : totalPaise;
  const existingPaidPaise = order
    ? (order.paidAmountPaise || (order.paymentStatus === 'paid' ? order.totalPaise : 0))
    : paidAmountPaise;
  const remainingBalancePaise = Math.max(0, effectiveTotalPaise - existingPaidPaise);

  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [customAmountRupees, setCustomAmountRupees] = useState<number>(
    Math.ceil(remainingBalancePaise / 100)
  );

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [cashTenderedRupees, setCashTenderedRupees] = useState<number>(
    Math.ceil(remainingBalancePaise / 100)
  );
  const [upiRef, setUpiRef] = useState<string>('');
  const [cardAuth, setCardAuth] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const payingPaise =
    paymentType === 'full'
      ? remainingBalancePaise
      : Math.min(remainingBalancePaise, Math.max(100, rupeesToPaise(customAmountRupees)));

  const cashTenderedPaise = rupeesToPaise(cashTenderedRupees);
  const changePaise = Math.max(0, cashTenderedPaise - payingPaise);

  const handleCompletePayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Submit/Save active order first if not saved
      const targetOrder = order || (await submitActiveOrder());

      // 2. Reference string
      const refString =
        method === 'upi'
          ? upiRef || `UPI-${Date.now().toString().slice(-6)}`
          : method === 'card'
          ? cardAuth || `AUTH-${Date.now().toString().slice(-4)}`
          : `CASH-REC-${Date.now().toString().slice(-4)}`;

      // 3. Call repo to record payment with exact paise amount
      const paidOrder = await localRepository.recordPayment(
        targetOrder.id,
        method,
        refString,
        payingPaise
      );

      if (payingPaise >= remainingBalancePaise) {
        addToast(
          `Payment of ${formatPaise(payingPaise)} completed! Order settled.`,
          'success'
        );
      } else {
        addToast(
          `Partial payment of ${formatPaise(payingPaise)} recorded. Remaining due: ${formatPaise(
            remainingBalancePaise - payingPaise
          )}.`,
          'info'
        );
      }

      onPaymentSuccess(paidOrder);
    } catch (err: any) {
      addToast(err.message || 'Payment processing failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Collect Payment</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select payment method & amount to record
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Financial Status Banner */}
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Bill Total: <strong>{formatPaise(effectiveTotalPaise)}</strong></span>
            {existingPaidPaise > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Already Paid: {formatPaise(existingPaidPaise)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-blue-900 dark:text-blue-200">
              Outstanding Balance Due
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {formatPaise(remainingBalancePaise)}
            </span>
          </div>
        </div>

        {/* Full vs Partial Payment Selector */}
        <div className="px-6 pt-4">
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setPaymentType('full');
                setCashTenderedRupees(Math.ceil(remainingBalancePaise / 100));
              }}
              className={`flex-1 py-2 rounded-xl text-center transition-all ${
                paymentType === 'full'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pay Full Balance ({formatPaise(remainingBalancePaise)})
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentType('partial');
                const half = Math.max(1, Math.floor(remainingBalancePaise / 200));
                setCustomAmountRupees(half);
                setCashTenderedRupees(half);
              }}
              className={`flex-1 py-2 rounded-xl text-center transition-all ${
                paymentType === 'partial'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Record Partial Payment
            </button>
          </div>

          {/* Partial payment custom amount field */}
          {paymentType === 'partial' && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Partial Amount to Pay (₹)
                </label>
                <span className="text-slate-400">
                  Max: ₹{Math.floor(remainingBalancePaise / 100)}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max={Math.floor(remainingBalancePaise / 100)}
                value={customAmountRupees}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomAmountRupees(val);
                  setCashTenderedRupees(val);
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                {[
                  Math.floor(remainingBalancePaise / 400),
                  Math.floor(remainingBalancePaise / 200),
                  Math.floor((remainingBalancePaise * 3) / 400),
                ].map((presetRupees, idx) => {
                  if (presetRupees <= 0) return null;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCustomAmountRupees(presetRupees);
                        setCashTenderedRupees(presetRupees);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-blue-500"
                    >
                      ₹{presetRupees}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Tabs */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'upi', label: 'UPI / QR', icon: QrCode },
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'split', label: 'Split', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = method === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMethod(tab.id as PaymentMethod)}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-2 border font-bold text-xs transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Payment Method Views */}
          {method === 'upi' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-3">
              <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center justify-center">
                <QrCode className="w-24 h-24 text-slate-900" />
                <span className="text-[9px] font-bold text-slate-600">Scan UPI QR</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Accepts GPay, PhonePe, Paytm, BHIM & Bank UPI
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">UPI ID: restohub.spicegarden@icici</p>
              </div>
              <input
                type="text"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                placeholder="Enter 12-digit UPI Reference (Optional)"
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {method === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Cash Tendered (₹)
                </label>
                <input
                  type="number"
                  value={cashTenderedRupees}
                  onChange={(e) => setCashTenderedRupees(Number(e.target.value))}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quick Cash Tender Pills */}
              <div className="flex gap-2">
                {[
                  Math.ceil(payingPaise / 100),
                  500,
                  1000,
                  2000,
                ].map((amt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCashTenderedRupees(amt)}
                    className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Change to Return</span>
                <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatPaise(changePaise)}
                </span>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span>Swipe / Tap on POS Terminal</span>
              </div>
              <input
                type="text"
                value={cardAuth}
                onChange={(e) => setCardAuth(e.target.value)}
                placeholder="POS Terminal Approval Code (e.g. 784920)"
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {method === 'split' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Split Bill Across Modes</p>
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span>Split 1: UPI</span>
                <span className="font-bold">{formatPaise(Math.floor(payingPaise / 2))}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Split 2: Cash</span>
                <span className="font-bold">{formatPaise(payingPaise - Math.floor(payingPaise / 2))}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-6 pt-0">
          <button
            onClick={handleCompletePayment}
            disabled={isProcessing || payingPaise <= 0}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <span>Recording Payment...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirm {formatPaise(payingPaise)} Received
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

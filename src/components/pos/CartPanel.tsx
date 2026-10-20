import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  Percent,
  Split,
  ChevronRight,
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
  Truck,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatPaise } from '../../utils/currency';
import { printService } from '../../services/printService';
import { KOTTicket } from '../../types';
import { localRepository } from '../../services/localRepository';

interface CartPanelProps {
  onOpenPayment: () => void;
  onOpenDiscountModal: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  onOpenPayment,
  onOpenDiscountModal,
}) => {
  const {
    cartItems,
    selectedTable,
    orderType,
    guestCount,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerAddress,
    setCustomerAddress,
    deliveryInstructions,
    setDeliveryInstructions,
    updateCartQty,
    removeFromCart,
    clearCart,
    subtotalPaise,
    discountPaise,
    cgstPaise,
    sgstPaise,
    totalPaise,
    paidAmountPaise,
    balanceDuePaise,
    submitActiveOrder,
    activeExistingOrderId,
    addToast,
    settings,
    restaurant,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveOrder = async () => {
    if (cartItems.length === 0) {
      addToast('Add at least one item to save order', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitActiveOrder();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFireKOT = async () => {
    if (cartItems.length === 0) {
      addToast('No items in cart to send to kitchen', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      let orderId = activeExistingOrderId;
      if (!orderId) {
        const created = await submitActiveOrder();
        orderId = created.id;
      }
      const tickets = await localRepository.submitOrderKOT(orderId);
      if (tickets.length === 0) {
        addToast('All items have already been submitted to the kitchen', 'info');
      } else {
        addToast(`Fired ${tickets.length} incremental KOT tickets to Kitchen!`, 'success');
        // Direct silent printing to configured KOT printer (no preview modal)
        if (settings?.autoPrintKot ?? true) {
          for (const ticket of tickets) {
            const res = await printService.printKOT(ticket, settings, restaurant);
            if (res.success) {
              addToast(`KOT ${ticket.kotNumber} sent directly to ${res.printerName}`, 'success');
            } else {
              addToast(`KOT printing: ${res.error || res.message}`, 'warning');
            }
          }
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to fire KOT', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unsentCount = cartItems.filter((i) => i.kotStatus !== 'sent').length;

  return (
    <aside className="w-full lg:w-96 bg-white dark:bg-[#121824] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full select-none shrink-0 transition-colors duration-200">
      {/* Contextual Header without duplicate table/guest selector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Billing & Cart
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Clear Cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Contextual Context Displays */}
        {orderType === 'dine_in' && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <UtensilsCrossed className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-extrabold text-blue-900 dark:text-blue-100 truncate">
                {selectedTable ? `Table ${selectedTable.tableNumber}` : 'No Table Selected'}
              </span>
              <span className="text-blue-300 dark:text-blue-700">•</span>
              <span className="text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
              </span>
              {selectedTable?.section && (
                <>
                  <span className="text-blue-300 dark:text-blue-700 hidden sm:inline">•</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate hidden sm:inline">
                    {selectedTable.section}
                  </span>
                </>
              )}
            </div>

            {activeExistingOrderId ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shrink-0 tracking-wide uppercase">
                Running Bill
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
                New Bill
              </span>
            )}
          </div>
        )}

        {orderType === 'takeaway' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway / Parcel Order</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
              <input
                type="tel"
                placeholder="Phone (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {orderType === 'counter' && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-xs font-bold text-purple-700 dark:text-purple-300">
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            <span>Quick Counter Order • Instant Checkout</span>
          </div>
        )}

        {orderType === 'delivery' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Truck className="w-3.5 h-3.5" />
              <span>Doorstep Delivery Order</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Delivery Address"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Drop instructions (Optional)"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3">
              <UtensilsCrossed className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Cart is Empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Click dishes from the catalog to build this order
            </p>
          </div>
        ) : (
          cartItems.map((ci) => {
            const isSent = ci.kotStatus === 'sent';
            return (
              <div
                key={ci.cartItemId}
                className={`p-3 rounded-2xl border transition-all ${
                  isSent
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900/90 border-blue-100 dark:border-blue-900/40 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {ci.menuItem.name}
                      </span>
                      {ci.variant && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                          {ci.variant.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatPaise(ci.unitPricePaise)}
                      </span>
                      {isSent ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          In Kitchen
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Adjustment Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCartQty(ci.cartItemId, -1)}
                      className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-slate-900 dark:text-white">
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(ci.cartItemId, 1)}
                      className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white ml-2 min-w-12 text-right">
                      {formatPaise(ci.subtotalPaise)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Action Badges */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
        <button
          onClick={onOpenDiscountModal}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Percent className="w-3 h-3 text-blue-500" />
          <span>Discount</span>
        </button>
        <button
          onClick={() => addToast('Split payment options available during checkout', 'info')}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Split className="w-3 h-3 text-emerald-500" />
          <span>Split Bill</span>
        </button>
      </div>

      {/* Financial Breakdown (GST & Authoritative Totals) */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{formatPaise(subtotalPaise)}</span>
        </div>

        {discountPaise > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Discount</span>
            <span>-{formatPaise(discountPaise)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>CGST (2.5%)</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{formatPaise(cgstPaise)}</span>
        </div>

        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>SGST (2.5%)</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{formatPaise(sgstPaise)}</span>
        </div>

        <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900 dark:text-white">Total Bill</span>
          <span className="font-black text-lg text-blue-600 dark:text-blue-400 font-mono">
            {formatPaise(totalPaise)}
          </span>
        </div>

        {/* Prominently distinguish Paid Amount from Outstanding Balance */}
        {paidAmountPaise > 0 ? (
          <>
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              <span>Amount Paid</span>
              <span className="font-mono">{formatPaise(paidAmountPaise)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <span className="font-black text-base text-amber-600 dark:text-amber-400 font-mono">
                {formatPaise(balanceDuePaise)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] pt-1">
            <span>Outstanding Balance</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatPaise(totalPaise)}</span>
          </div>
        )}
      </div>

      {/* Primary Actions (Send KOT / Save / Pay) */}
      <div className="p-4 pt-0 space-y-2">
        {unsentCount > 0 && (
          <button
            onClick={handleFireKOT}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <ChefHat className="w-4 h-4" />
            <span>Send New Items to Kitchen ({unsentCount} KOT)</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSaveOrder}
            disabled={cartItems.length === 0 || isSubmitting}
            className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Save Running Bill'}
          </button>

          <button
            onClick={onOpenPayment}
            disabled={cartItems.length === 0}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Pay & Settle</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
};

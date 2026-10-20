import React, { useEffect, useState } from 'react';
import {
  Flame,
  Search,
  Sparkles,
  Utensils,
  Percent,
  X,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { MenuCategory, MenuItem, Order } from '../../types';
import { DishCard } from './DishCard';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { printService } from '../../services/printService';
import { formatPaise } from '../../utils/currency';

export const PosView: React.FC = () => {
  const {
    cartItems,
    addToCart,
    updateCartQty,
    searchQuery,
    applyDiscountPaise,
    subtotalPaise,
    totalPaise,
    addToast,
    settings,
    restaurant,
    activeOutlet,
    setCurrentView,
  } = useApp();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('cat-all');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Discount input
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [flatDiscountRupees, setFlatDiscountRupees] = useState<number>(0);

  const loadCatalog = async () => {
    setIsLoading(true);
    const [cats, items] = await Promise.all([
      localRepository.getCategories(),
      localRepository.getMenuItems(),
    ]);
    setCategories(cats);
    setMenuItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCatalog();
    const unsub = localRepository.subscribe(() => {
      loadCatalog();
    });
    return unsub;
  }, [restaurant?.id, activeOutlet?.id]);

  // Filter items by category and search
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCatId === 'cat-all'
        ? true
        : selectedCatId === 'cat-popular'
        ? item.isBestseller
        : item.categoryId === selectedCatId;

    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleApplyDiscount = () => {
    if (flatDiscountRupees > 0) {
      applyDiscountPaise(flatDiscountRupees * 100);
      addToast(`Applied flat discount of ₹${flatDiscountRupees}`, 'info');
    } else if (discountPercent > 0) {
      const calculated = Math.round((subtotalPaise * discountPercent) / 100);
      applyDiscountPaise(calculated);
      addToast(`Applied ${discountPercent}% discount`, 'info');
    } else {
      applyDiscountPaise(0);
    }
    setIsDiscountOpen(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center Dish Catalog */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0B0F17] overflow-hidden">
        {/* Category Horizontal Pills */}
        <div className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#121824]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`h-9 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 inline-flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
                  }`}
                >
                  {cat.slug === 'popular' && <Flame className="w-3.5 h-3.5 text-amber-300 fill-current" />}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dish Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : menuItems.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                <Utensils className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                Add Your First Dish
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                This restaurant workspace is clean with no dishes in the catalog. Add your first dish or create categories to start taking orders.
              </p>
              <button
                onClick={() => setCurrentView('menu')}
                className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Go to Menu Management</span>
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <Search className="w-10 h-10 mb-2 stroke-1" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No dishes found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for something else or pick a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const cartItem = cartItems.find((ci) => ci.menuItem.id === item.id);
                const currentQty = cartItem ? cartItem.quantity : 0;
                return (
                  <DishCard
                    key={item.id}
                    item={item}
                    currentQty={currentQty}
                    onAdd={() => addToCart(item)}
                    onIncrement={() => cartItem && updateCartQty(cartItem.cartItemId, 1)}
                    onDecrement={() => cartItem && updateCartQty(cartItem.cartItemId, -1)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Desktop Cart Sidebar (Hidden on tablet/mobile screens) */}
      <div className="hidden lg:block h-full shrink-0">
        <CartPanel
          onOpenPayment={() => setIsPaymentOpen(true)}
          onOpenDiscountModal={() => setIsDiscountOpen(true)}
        />
      </div>

      {/* Floating Mobile Cart Action Bar */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 animate-fade-in">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs shadow-2xl flex items-center justify-between active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {cartItems.reduce((acc, ci) => acc + ci.quantity, 0)}
              </span>
              <span>View Order Cart</span>
            </div>
            <span className="font-mono text-sm">{formatPaise(totalPaise)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer Overlay */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121824] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Active Order Cart
              </span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close Cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartPanel
                onOpenPayment={() => {
                  setIsMobileCartOpen(false);
                  setIsPaymentOpen(true);
                }}
                onOpenDiscountModal={() => {
                  setIsMobileCartOpen(false);
                  setIsDiscountOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={async (paidOrder) => {
          setIsPaymentOpen(false);
          // Directly print receipt if auto-print enabled (no preview modal)
          if (settings?.autoPrintReceipt ?? true) {
            const res = await printService.printReceipt(paidOrder, settings, restaurant, activeOutlet);
            if (res.success) {
              addToast(`Receipt sent directly to ${res.printerName} (${settings?.receiptPaperWidth || '80mm'})`, 'success');
            } else {
              addToast(`Direct printing: ${res.error || res.message}`, 'warning');
            }
          }
        }}
      />

      {/* Quick Discount Modal */}
      {isDiscountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Apply Bill Discount</h3>
              </div>
              <button
                onClick={() => setIsDiscountOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-300">Quick Percentage</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        setDiscountPercent(pct);
                        setFlatDiscountRupees(0);
                      }}
                      className={`py-2 rounded-xl font-bold border transition-all ${
                        discountPercent === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-300">Or Flat Amount (₹)</label>
                <input
                  type="number"
                  value={flatDiscountRupees || ''}
                  onChange={(e) => {
                    setFlatDiscountRupees(Number(e.target.value));
                    setDiscountPercent(0);
                  }}
                  placeholder="e.g. 50 or 100"
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Apply</span>
              </button>
              <button
                onClick={() => {
                  applyDiscountPaise(0);
                  setIsDiscountOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

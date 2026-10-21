import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Users,
  Clock,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  ChefHat,
  Flame,
  CheckCircle2,
  AlertCircle,
  FileText,
  Percent,
  Sparkles,
  Layers,
  UtensilsCrossed,
  X,
  MessageSquare,
  Move,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import {
  CartItem,
  DiningTable,
  DietaryType,
  KitchenStation,
  MenuCategory,
  MenuItem,
  MenuVariant,
  Order,
} from '../../types';
import { calculateBill, formatPaise } from '../../utils/currency';
import { PaymentModal } from '../pos/PaymentModal';
import { printService } from '../../services/printService';

interface TableWorkspaceProps {
  table: DiningTable;
  initialOrderId?: string;
  onBack: () => void;
  onTableUpdated: () => void;
}

export const TableWorkspace: React.FC<TableWorkspaceProps> = ({
  table,
  initialOrderId,
  onBack,
  onTableUpdated,
}) => {
  const { activeOutlet, restaurant, settings, addToast } = useApp();

  // Master Data
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);

  // Filtering State
  const [selectedCategory, setSelectedCategory] = useState<string>('cat-all');
  const [selectedDietary, setSelectedDietary] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Active Order State for this Table
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [guestCount, setGuestCount] = useState<number>(table.guestCount || 2);
  const [isSubmittingKot, setIsSubmittingKot] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'menu' | 'bill'>('menu');

  // Note Modal
  const [editingItemNote, setEditingItemNote] = useState<CartItem | null>(null);
  const [itemNoteText, setItemNoteText] = useState<string>('');

  // Discount Modal
  const [isDiscountOpen, setIsDiscountOpen] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Billing & Payment Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  // Direct printing without in-app preview modal
  const handlePrintReceipt = async () => {
    if (!activeOrder) return;
    const res = await printService.printReceipt(activeOrder, settings, restaurant, activeOutlet);
    if (res.success) {
      addToast(`Receipt sent directly to ${res.printerName} (${settings?.receiptPaperWidth || '80mm'})`, 'success');
    } else {
      addToast(`Direct printing: ${res.error || res.message}`, 'warning');
    }
  };

  // Table Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferTablesList, setTransferTablesList] = useState<DiningTable[]>([]);
  const [selectedTargetTableId, setSelectedTargetTableId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  // Load Menu and Table's Running Order
  const loadData = async () => {
    if (!activeOutlet) return;

    const [cats, items, stns] = await Promise.all([
      localRepository.getCategories(),
      localRepository.getMenuItems(),
      localRepository.getKitchenStations(activeOutlet.id),
    ]);

    setCategories(cats);
    setMenuItems(items);
    setStations(stns);

    // 0. If initialOrderId provided directly, prioritize it
    if (initialOrderId) {
      const ord = await localRepository.getOrderById(initialOrderId);
      if (ord && ord.status !== 'completed' && ord.status !== 'cancelled') {
        setActiveOrder(ord);
        setGuestCount(ord.guestCount || table.guestCount || 2);
        return;
      }
    }

    // Look up running order for this table
    if (table.currentOrderId) {
      const ord = await localRepository.getOrderById(table.currentOrderId);
      if (ord && ord.status !== 'completed' && ord.status !== 'cancelled') {
        setActiveOrder(ord);
        setGuestCount(ord.guestCount || table.guestCount || 2);
        return;
      }
    }

    // Secondary lookup if not linked on table directly
    const allOrders = await localRepository.getOrders(activeOutlet.id);
    const tableOrder = allOrders.find(
      (o) => o.tableId === table.id && o.status !== 'completed' && o.status !== 'cancelled'
    );
    if (tableOrder) {
      setActiveOrder(tableOrder);
      setGuestCount(tableOrder.guestCount || table.guestCount || 2);
    } else {
      setActiveOrder(null);
    }
  };

  useEffect(() => {
    loadData();

    // Instant live sync listener: updates running bill immediately when items are added, updated, or fired
    const unsubscribe = localRepository.subscribe(() => {
      loadData();
    });

    const handleOpChange = () => {
      loadData();
    };

    window.addEventListener('restohub:operational-change', handleOpChange);

    return () => {
      unsubscribe();
      window.removeEventListener('restohub:operational-change', handleOpChange);
    };
  }, [table, activeOutlet, initialOrderId]);

  // Create Order if Table is Available and First Item is added
  const getOrCreateOrder = async (): Promise<Order> => {
    if (activeOrder) return activeOrder;
    if (!activeOutlet) throw new Error('No active outlet');

    const newOrder = await localRepository.createOrder({
      restaurantId: restaurant?.id || 'rest-001',
      outletId: activeOutlet.id,
      orderType: 'dine_in',
      tableId: table.id,
      tableName: `Table ${table.tableNumber}`,
      guestCount,
      items: [],
      status: 'confirmed',
      paymentStatus: 'pending',
      subtotalPaise: 0,
      discountPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      roundingPaise: 0,
      totalPaise: 0,
    });

    await localRepository.updateTableStatus(table.id, 'occupied', newOrder.id);
    setActiveOrder(newOrder);
    onTableUpdated();
    return newOrder;
  };

  // Add Item to Table Order
  const handleAddItem = async (item: MenuItem, variant?: MenuVariant) => {
    if (!item.isAvailable) {
      addToast(`${item.name} is currently sold out (86)`, 'warning');
      return;
    }

    try {
      const order = await getOrCreateOrder();
      const unitPricePaise = variant ? variant.pricePaise : item.basePricePaise;

      const station =
        (item.stationId && stations.find((s) => s.id === item.stationId)) ||
        stations.find((s) => s.isDefault) ||
        stations[0];

      const newCartItem: CartItem = {
        cartItemId: `ci-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        menuItem: item,
        variant,
        selectedModifiers: [],
        quantity: 1,
        unitPricePaise,
        subtotalPaise: unitPricePaise,
        stationId: station?.id,
        stationName: station?.name,
        kotStatus: 'pending', // Pending KOT until explicit fire
        kitchenStatus: 'new',
      };

      const updated = await localRepository.addItemsToOrder(order.id, [newCartItem]);
      setActiveOrder(updated);
      addToast(`Added ${item.name} to Table ${table.tableNumber}`, 'info');
      onTableUpdated();
    } catch {
      addToast('Failed to add item to table', 'error');
    }
  };

  // Adjust item quantity in table running order
  const handleUpdateQty = async (cartItemId: string, delta: number) => {
    if (!activeOrder) return;
    try {
      const updated = await localRepository.updateOrderItemQty(activeOrder.id, cartItemId, delta);
      setActiveOrder(updated);
      onTableUpdated();
    } catch {
      addToast('Failed to update quantity', 'error');
    }
  };

  // Remove item from table running order
  const handleRemoveItem = async (cartItemId: string) => {
    if (!activeOrder) return;
    try {
      const updated = await localRepository.removeOrderItem(activeOrder.id, cartItemId);
      setActiveOrder(updated);
      addToast('Item removed from order', 'info');
      onTableUpdated();
    } catch {
      addToast('Failed to remove item', 'error');
    }
  };

  // Fire KOT tickets to Kitchen Stations
  const handleFireKOT = async () => {
    if (!activeOrder || pendingItems.length === 0) {
      addToast('No new items pending kitchen ticket', 'info');
      return;
    }

    setIsSubmittingKot(true);
    try {
      const createdTickets = await localRepository.submitOrderKOT(activeOrder.id);
      // Reload order to refresh items kotStatus
      const refreshedOrder = await localRepository.getOrderById(activeOrder.id);
      setActiveOrder(refreshedOrder);

      const ticketSummaries = createdTickets
        .map((t) => `${t.kotNumber} (${t.stationName})`)
        .join(', ');

      addToast(
        `Fired ${createdTickets.length} KOT Ticket${createdTickets.length > 1 ? 's' : ''}: ${ticketSummaries}`,
        'success'
      );

      // Direct silent printing to configured KOT printer (no preview modal)
      if (settings?.autoPrintKot ?? true) {
        for (const ticket of createdTickets) {
          const res = await printService.printKOT(ticket, settings, restaurant);
          if (res.success) {
            addToast(`KOT ${ticket.kotNumber} sent directly to ${res.printerName}`, 'success');
          } else {
            addToast(`KOT printing: ${res.error || res.message}`, 'warning');
          }
        }
      }
      onTableUpdated();
    } catch {
      addToast('Failed to submit kitchen tickets', 'error');
    } finally {
      setIsSubmittingKot(false);
    }
  };

  // Apply Discount
  const handleApplyDiscount = async () => {
    if (!activeOrder) return;
    const discountPaise = Math.round((activeOrder.subtotalPaise * discountPercent) / 100);
    const calc = calculateBill(
      activeOrder.subtotalPaise,
      discountPaise,
      settings?.cgstPct ?? 2.5,
      settings?.sgstPct ?? 2.5
    );

    const updated: Order = {
      ...activeOrder,
      discountPaise,
      discountDescription: `${discountPercent}% Owner Discount`,
      cgstPaise: calc.cgstPaise,
      sgstPaise: calc.sgstPaise,
      roundingPaise: calc.roundingPaise,
      totalPaise: calc.totalPaise,
      updatedAt: new Date().toISOString(),
    };

    // Save order
    if (localRepository.updateOrder) {
      await localRepository.updateOrder(activeOrder.id, updated);
    }

    setActiveOrder(updated);
    setIsDiscountOpen(false);
    addToast(`Applied ${discountPercent}% discount (${formatPaise(discountPaise)})`, 'success');
  };

  // Save Item Cooking Note
  const handleSaveItemNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !editingItemNote) return;

    const updatedItems = activeOrder.items.map((i) =>
      i.cartItemId === editingItemNote.cartItemId ? { ...i, notes: itemNoteText.trim() } : i
    );

    const updated: Order = {
      ...activeOrder,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    if (localRepository.updateOrder) {
      await localRepository.updateOrder(activeOrder.id, updated);
    }

    setActiveOrder(updated);
    setEditingItemNote(null);
    setItemNoteText('');
    addToast('Special instruction attached to item', 'info');
  };

  // Free table after bill is paid
  const handleFreeTable = async () => {
    try {
      if (activeOrder) {
        await localRepository.updateOrderStatus(activeOrder.id, 'completed');
      }
      await localRepository.updateTableStatus(table.id, 'available', undefined);
      addToast(`Table ${table.tableNumber} completed & freed for new guests`, 'success');
      onTableUpdated();
      onBack();
    } catch {
      addToast('Failed to free table', 'error');
    }
  };

  // Transfer table order to another available table
  const handleTransferTable = async () => {
    if (!activeOrder || !selectedTargetTableId) {
      addToast('Please select a target table to transfer order', 'warning');
      return;
    }

    setIsTransferring(true);
    try {
      const success = await localRepository.transferTableOrder(
        table.id,
        selectedTargetTableId,
        activeOrder.id
      );

      if (success) {
        const target = transferTablesList.find((t) => t.id === selectedTargetTableId);
        addToast(
          `Order successfully moved from Table ${table.tableNumber} to Table ${target?.tableNumber || ''}`,
          'success'
        );
        setIsTransferModalOpen(false);
        onTableUpdated();
        onBack();
      } else {
        addToast('Target table is occupied or transfer failed', 'error');
      }
    } catch {
      addToast('Failed to transfer table', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  // Items partition: pending KOT vs already fired
  const orderItems = activeOrder?.items || [];
  const pendingItems = orderItems.filter((i) => i.kotStatus !== 'sent');
  const firedItems = orderItems.filter((i) => i.kotStatus === 'sent');

  // Filter menu items by Category, Dietary, and Search
  const filteredMenuItems = menuItems.filter((item) => {
    const matchCategory =
      selectedCategory === 'cat-all'
        ? true
        : selectedCategory === 'cat-popular'
        ? item.isBestseller
        : item.categoryId === selectedCategory;

    const matchDietary =
      selectedDietary === 'all'
        ? true
        : item.dietaryType === selectedDietary || item.foodType === selectedDietary;

    const matchSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());

    return matchCategory && matchDietary && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#0B0F17] overflow-hidden select-none animate-fade-in">
      {/* Top Workspace Header */}
      <header className="h-16 px-6 bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Floor</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:border-slate-800" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Table {table.tableNumber}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  activeOrder
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                }`}
              >
                {activeOrder ? 'Occupied (Running)' : 'Available'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {table.section} • Capacity: {table.seatingCapacity} Seats
            </span>
          </div>
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center gap-3">
          {/* Guest Count Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <select
              value={guestCount}
              onChange={(e) => {
                const count = Number(e.target.value);
                setGuestCount(count);
                if (activeOrder) {
                  activeOrder.guestCount = count;
                  localRepository.createOrder(activeOrder);
                }
              }}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                <option key={num} value={num} className="bg-white dark:bg-slate-900">
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>

          {activeOrder && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>00:{table.orderDurationMinutes || 18}</span>
            </div>
          )}

          {activeOrder && (
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 shrink-0"
              title="Print Bill Directly"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Subheader Tab Switcher */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="grid grid-cols-2 w-full p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            onClick={() => setMobileTab('menu')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'menu'
                ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Menu Catalog</span>
          </button>
          <button
            onClick={() => setMobileTab('bill')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all relative ${
              mobileTab === 'bill'
                ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Running Bill ({orderItems.length})</span>
            {pendingItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Table Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left / Center: Category-Based Menu */}
        <div
          className={`flex-1 flex flex-col p-3.5 sm:p-5 overflow-y-auto space-y-4 ${
            mobileTab === 'bill' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Menu Search and Dietary Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Search Input */}
            <div className="w-full sm:w-80 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes, drinks..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Dietary Classification Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1 text-xs font-bold scrollbar-none shrink-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'veg', label: '🟢 Veg' },
                { id: 'non_veg', label: '🔴 Non-Veg' },
                { id: 'egg', label: '🟡 Egg' },
                { id: 'vegan', label: '🌿 Vegan' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDietary(d.id)}
                  className={`h-8 px-3.5 rounded-xl border transition-all shrink-0 inline-flex items-center justify-center ${
                    selectedDietary === d.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-[#121824] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs font-bold shrink-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-9 px-4 rounded-xl transition-all shrink-0 inline-flex items-center justify-center ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                    : 'bg-white dark:bg-[#121824] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredMenuItems.map((item) => {
              const station = stations.find((s) => s.id === item.stationId);
              const inOrderQty = activeOrder?.items
                .filter((i) => i.menuItem.id === item.id)
                .reduce((sum, i) => sum + i.quantity, 0) || 0;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all shadow-xs ${
                    !item.isAvailable ? 'opacity-60 grayscale-[40%]' : 'hover:border-blue-400/60 dark:hover:border-blue-500/40'
                  }`}
                >
                  <div>
                    {/* Header: Dietary tag & Kitchen Station */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.dietaryType === 'non_veg' || item.foodType === 'non_veg'
                              ? 'bg-red-500'
                              : item.dietaryType === 'egg' || item.foodType === 'egg'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {item.dietaryType || item.foodType}
                        </span>
                      </div>

                      {station && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                          {station.code}
                        </span>
                      )}
                    </div>

                    {/* Dish Image & Info */}
                    <div className="flex gap-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Add Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                        {formatPaise(item.basePricePaise)}
                      </span>
                    </div>

                    {item.isAvailable ? (
                      <div className="flex items-center gap-1.5">
                        {inOrderQty > 0 && (
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center">
                            {inOrderQty}
                          </span>
                        )}

                        {item.variants && item.variants.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {item.variants.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => handleAddItem(item, v)}
                                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-300 font-bold text-[10px] transition-colors"
                              >
                                {v.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddItem(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 font-bold text-[10px]">
                        Sold Out (86)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Mobile Bill Bar */}
          {orderItems.length > 0 && (
            <div className="lg:hidden sticky bottom-2 mx-auto w-full max-w-sm px-2 pt-2 z-10">
              <button
                onClick={() => setMobileTab('bill')}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/90 flex items-center justify-center text-[10px] font-black">
                    {orderItems.length}
                  </span>
                  <span>View Table Docket & Bill</span>
                </div>
                <span className="font-mono font-black text-sm">
                  {activeOrder ? formatPaise(activeOrder.totalPaise) : '₹0'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Right Area: Running Order Panel */}
        <aside
          className={`w-full lg:w-96 bg-white dark:bg-[#121824] lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 overflow-y-auto ${
            mobileTab === 'menu' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-5 space-y-4">
            {/* Running Order Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Table Order
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {activeOrder ? activeOrder.orderNumber : 'New Order'}
                </h3>
              </div>

              {activeOrder && (
                <div className="flex flex-col items-end">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      activeOrder.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {activeOrder.paymentStatus}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Status: {activeOrder.status}</span>
                </div>
              )}
            </div>

            {/* ORDER ITEMS LIST */}
            <div className="space-y-3">
              {orderItems.length === 0 ? (
                !activeOrder ? (
                  <div className="py-8 px-4 text-center text-xs space-y-4 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Table {table.tableNumber} is Available
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Seating Capacity: {table.seatingCapacity} Guests • {table.section}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        Number of Guests:
                      </span>
                      <div className="flex justify-center gap-1.5 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setGuestCount(n)}
                            className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                              guestCount === n
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={getOrCreateOrder}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Start Dine-In Order ({guestCount} Guests)</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <span>Table order has no items yet</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Select dishes from the menu to add to this running order
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  {/* Newly Added Draft Items (Pending KOT) */}
                  {pendingItems.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>Unfired Items ({pendingItems.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Pending KOT</span>
                      </div>

                      {pendingItems.map((item) => (
                        <div
                          key={item.cartItemId}
                          className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.menuItem.name}
                              </span>
                              {item.variant && (
                                <span className="ml-1 text-[10px] text-blue-500 font-bold">
                                  ({item.variant.name})
                                </span>
                              )}
                              {item.stationName && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {item.stationName}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {formatPaise(item.subtotalPaise)}
                            </span>
                          </div>

                          {item.notes && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                              Note: {item.notes}
                            </p>
                          )}

                          {/* Controls */}
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <button
                              onClick={() => {
                                setEditingItemNote(item);
                                setItemNoteText(item.notes || '');
                              }}
                              className="text-[10px] text-slate-500 hover:text-blue-500 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{item.notes ? 'Edit Note' : 'Add Note'}</span>
                            </button>

                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                              <button
                                onClick={() => handleUpdateQty(item.cartItemId, -1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQty(item.cartItemId, 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.cartItemId)}
                                className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-slate-400 ml-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Already Fired Items (In Kitchen Prep) */}
                  {firedItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                        <span className="flex items-center gap-1">
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Sent to Kitchen ({firedItems.length})</span>
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold">KOT Active</span>
                      </div>

                      {firedItems.map((item) => (
                        <div
                          key={item.cartItemId}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-blue-600">{item.quantity}×</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {item.menuItem.name}
                              </span>
                              {item.variant && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ({item.variant.name})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">
                                {item.kotNumber || 'KOT-1'}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                                {item.kitchenStatus || 'new'}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatPaise(item.subtotalPaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Running Order Bottom Summary & Actions */}
          {activeOrder && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatPaise(activeOrder.subtotalPaise)}</span>
                </div>

                {activeOrder.discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatPaise(activeOrder.discountPaise)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>CGST (2.5%):</span>
                  <span className="font-mono">{formatPaise(activeOrder.cgstPaise)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>SGST (2.5%):</span>
                  <span className="font-mono">{formatPaise(activeOrder.sgstPaise)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Total Amount:
                  </span>
                  <span className="font-black text-lg text-blue-600 dark:text-blue-400 font-mono">
                    {formatPaise(activeOrder.totalPaise)}
                  </span>
                </div>

                {activeOrder.paidAmountPaise && activeOrder.paidAmountPaise > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                      <span>Amount Paid:</span>
                      <span className="font-mono">{formatPaise(activeOrder.paidAmountPaise)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        Outstanding Balance:
                      </span>
                      <span className="font-black text-base text-amber-600 dark:text-amber-400 font-mono">
                        {formatPaise(Math.max(0, activeOrder.totalPaise - (activeOrder.paidAmountPaise || 0)))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1">
                    <span>Outstanding Balance:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {formatPaise(activeOrder.totalPaise)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Fire KOT if pending items exist */}
                {pendingItems.length > 0 && (
                  <button
                    onClick={handleFireKOT}
                    disabled={isSubmittingKot}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Fire KOT to Kitchen ({pendingItems.length} New Items)</span>
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setIsDiscountOpen(true)}
                    className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Percent className="w-3.5 h-3.5 text-blue-500" />
                    <span>Discount</span>
                  </button>

                  <button
                    onClick={handlePrintReceipt}
                    className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                    title="Print Bill Directly"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (!activeOutlet) return;
                      const all = await localRepository.getTables(activeOutlet.id);
                      const others = all.filter((t) => t.id !== table.id);
                      setTransferTablesList(others);
                      const available = others.find((t) => t.status === 'available');
                      if (available) {
                        setSelectedTargetTableId(available.id);
                      }
                      setIsTransferModalOpen(true);
                    }}
                    className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Move className="w-3.5 h-3.5 text-amber-500" />
                    <span>Transfer</span>
                  </button>
                </div>

                {activeOrder.paymentStatus !== 'paid' ? (
                  <button
                    onClick={() => setIsPaymentOpen(true)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Collect Payment & Settle ({formatPaise(activeOrder.totalPaise)})</span>
                  </button>
                ) : (
                  <button
                    onClick={handleFreeTable}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Paid • Complete & Free Table</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Special Cooking Instruction Modal */}
      {editingItemNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleSaveItemNote}
            className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Special Cooking Note</h4>
              <button
                type="button"
                onClick={() => setEditingItemNote(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500">
              Specify instructions for chef for {editingItemNote.menuItem.name}:
            </p>

            <textarea
              value={itemNoteText}
              onChange={(e) => setItemNoteText(e.target.value)}
              placeholder="e.g. Extra spicy, no coriander, less oil, allergy alert..."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
              autoFocus
            />

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Instruction
              </button>
              <button
                type="button"
                onClick={() => setEditingItemNote(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Discount Modal */}
      {isDiscountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Apply Bill Discount</h4>
              <button
                type="button"
                onClick={() => setIsDiscountOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={`py-2 rounded-xl font-bold border ${
                    discountPercent === pct
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div>
              <label className="text-slate-500 font-medium">Custom Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Apply
              </button>
              <button
                onClick={() => setIsDiscountOpen(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Payment Modal */}
      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          order={activeOrder}
          onClose={() => setIsPaymentOpen(false)}
          onPaymentSuccess={(paidOrder) => {
            setActiveOrder(paidOrder);
            setIsPaymentOpen(false);
            onTableUpdated();
          }}
        />
      )}



      {/* Transfer Table Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-amber-500" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Transfer Table Order
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400">
              Move active running order for <span className="font-bold text-slate-800 dark:text-slate-200">Table {table.tableNumber}</span> to an available dining table. All items, fired KOT tickets, and running bill will be preserved.
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Select Destination Table:
              </label>
              <select
                value={selectedTargetTableId}
                onChange={(e) => setSelectedTargetTableId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none"
              >
                {transferTablesList.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.status !== 'available'}
                    className="bg-white dark:bg-slate-900"
                  >
                    Table {t.tableNumber} ({t.section} • {t.seatingCapacity} seats) — {t.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTransferTable}
                disabled={isTransferring || !selectedTargetTableId}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Move className="w-4 h-4" />
                <span>Confirm Transfer</span>
              </button>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  History,
  Layers,
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import { InventoryItem, InventoryMovement } from '../../types';
import { formatPaise, rupeesToPaise } from '../../utils/currency';

export const InventoryView: React.FC = () => {
  const { activeOutlet, addToast } = useApp();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'ledger'>('items');
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // New Ingredient Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Dairy & Cheese');
  const [newUnit, setNewUnit] = useState('kg');
  const [newStock, setNewStock] = useState(10);
  const [newMinThreshold, setNewMinThreshold] = useState(5);
  const [newCostRupees, setNewCostRupees] = useState(250);

  // Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState('Supplier Delivery / Restock');

  const fetchData = async () => {
    if (!activeOutlet) return;
    const inv = await localRepository.getInventory(activeOutlet.id);
    setItems(inv);
    const mov = await localRepository.getStockMovements();
    setMovements(mov);
  };

  useEffect(() => {
    fetchData();
  }, [activeOutlet]);

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOutlet) return;
    if (!newName.trim()) {
      addToast('Ingredient name is required', 'error');
      return;
    }

    await localRepository.saveInventoryItem({
      outletId: activeOutlet.id,
      name: newName.trim(),
      category: newCategory,
      unit: newUnit,
      currentStock: Number(newStock) || 0,
      minThreshold: Number(newMinThreshold) || 1,
      costPerUnitPaise: rupeesToPaise(Number(newCostRupees) || 0),
    });

    addToast(`Ingredient "${newName}" added to inventory`, 'success');
    setIsAddOpen(false);
    setNewName('');
    await fetchData();
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      addToast('Please enter a valid quantity', 'error');
      return;
    }

    const delta = adjustType === 'add' ? qty : -qty;
    const finalStock = Math.max(0, adjustingItem.currentStock + delta);

    await localRepository.recordStockMovement({
      itemId: adjustingItem.id,
      movementType: adjustType === 'add' ? 'purchase' : 'wastage',
      quantityDelta: delta,
      reason: adjustReason,
    });

    addToast(`Stock for ${adjustingItem.name} updated to ${finalStock} ${adjustingItem.unit}`, 'info');
    setAdjustingItem(null);
    await fetchData();
  };

  const lowStockCount = items.filter((i) => i.currentStock <= i.minThreshold).length;

  const filteredItems = items.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    const matchesLow = filterLowStock ? i.currentStock <= i.minThreshold : true;
    return matchesSearch && matchesLow;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-hidden select-none p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Inventory & Stock Ledger</span>
            {lowStockCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900">
                {lowStockCount} Low Stock Alert{lowStockCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Raw material tracking, consumption ledger, and low-stock threshold management
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'items'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stock Items</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ledger'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Movement Ledger</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ingredient</span>
          </button>
        </div>
      </div>

      {activeTab === 'items' ? (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#121824] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-full sm:w-72 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search raw material or category..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filterLowStock
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Only Low Stock ({lowStockCount})</span>
              </button>
            </div>
          </div>

          {/* Inventory Items Table */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="p-4 pl-6">Ingredient</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Min. Threshold</th>
                  <th className="p-4">Unit Cost</th>
                  <th className="p-4 pr-6 text-right">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredItems.map((item) => {
                  const isLowStock = item.currentStock <= item.minThreshold;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock Alert</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{item.category}</td>
                      <td className="p-4">
                        <span
                          className={`font-black text-sm ${
                            isLowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        {item.minThreshold} {item.unit}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatPaise(item.costPerUnitPaise)} / {item.unit}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => {
                            setAdjustingItem(item);
                            setAdjustQty(5);
                            setAdjustType('add');
                          }}
                          className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Movement Ledger View */
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                <th className="p-4 pl-6">Timestamp</th>
                <th className="p-4">Ingredient</th>
                <th className="p-4">Movement Type</th>
                <th className="p-4">Quantity Delta</th>
                <th className="p-4 pr-6">Reason / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {movements.map((mov) => {
                const item = items.find((i) => i.id === mov.itemId);
                const isPositive = mov.quantityDelta >= 0;
                return (
                  <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="p-4 pl-6 font-mono text-slate-400 text-[11px]">
                      {new Date(mov.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {item?.name || 'Raw Material'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          mov.movementType === 'purchase'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : mov.movementType === 'wastage'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        }`}
                      >
                        {mov.movementType === 'purchase' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{mov.movementType}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sm">
                      <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                        {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta} {item?.unit || ''}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-slate-600 dark:text-slate-300">{mov.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleCreateIngredient}
            className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Raw Material</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="font-semibold text-slate-500">Ingredient Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Basmati Rice 1121"
                className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-500">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option>Dairy & Cheese</option>
                  <option>Vegetables & Produce</option>
                  <option>Grains & Pulses</option>
                  <option>Spices & Condiments</option>
                  <option>Oils & Ghee</option>
                  <option>Meat & Seafood</option>
                  <option>Packaging & Disposables</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-500">Unit of Measure</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="l">Liters (L)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="pkt">Packets (pkt)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-500">Opening Stock</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  min="0"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500">Min. Threshold</label>
                <input
                  type="number"
                  value={newMinThreshold}
                  onChange={(e) => setNewMinThreshold(Number(e.target.value))}
                  className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  min="1"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500">Unit Cost (₹)</label>
                <input
                  type="number"
                  value={newCostRupees}
                  onChange={(e) => setNewCostRupees(Number(e.target.value))}
                  className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm active:scale-95 transition-all"
              >
                Save Raw Material
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleApplyAdjustment}
            className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Adjust Stock</h3>
                <span className="text-slate-400">{adjustingItem.name} • Current: {adjustingItem.currentStock} {adjustingItem.unit}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  adjustType === 'add'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                + Restock / Purchase
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('deduct')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  adjustType === 'deduct'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                - Wastage / Spoilage
              </button>
            </div>

            <div>
              <label className="font-semibold text-slate-500">
                Quantity to {adjustType === 'add' ? 'Add' : 'Deduct'} ({adjustingItem.unit})
              </label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-lg"
                min="0.1"
                step="any"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-500">Reason / Reference Note</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {adjustType === 'add' ? (
                  <>
                    <option>Supplier Delivery / Restock</option>
                    <option>Inter-outlet Transfer Received</option>
                    <option>Physical Inventory Audit Surplus</option>
                  </>
                ) : (
                  <>
                    <option>Kitchen Spoilage / Wastage</option>
                    <option>Cooking Consumption</option>
                    <option>Expired Stock Disposal</option>
                    <option>Physical Inventory Audit Shortage</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm active:scale-95 transition-all"
              >
                Confirm Stock Adjustment
              </button>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

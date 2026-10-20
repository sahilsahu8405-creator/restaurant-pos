import React, { useEffect, useState } from 'react';
import {
  X,
  ChefHat,
  Plus,
  Trash2,
  DollarSign,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import {
  MenuItem,
  RecipeItem,
  InventoryItem,
  FoodCostingSummary,
} from '../../types';
import { formatPaise, rupeesToPaise } from '../../utils/currency';

interface RecipeCostModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const RecipeCostModal: React.FC<RecipeCostModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { activeOutlet, addToast } = useApp();
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [costSummary, setCostSummary] = useState<FoodCostingSummary | null>(null);

  // New Ingredient Line Form
  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Additional direct costs
  const [packagingRupees, setPackagingRupees] = useState<number>(0);
  const [prepCostRupees, setPrepCostRupees] = useState<number>(0);

  const loadData = async () => {
    if (!item) return;

    const [recipes, inv, summaries] = await Promise.all([
      localRepository.getRecipeItems(item.id),
      localRepository.getInventory(activeOutlet?.id || ''),
      localRepository.getFoodCostingSummaries(activeOutlet?.id || ''),
    ]);

    setRecipeItems(recipes);
    setInventoryList(inv);

    const matchSummary = summaries.find((s) => s.menuItemId === item.id);
    if (matchSummary) {
      setCostSummary(matchSummary);
    }

    if (recipes.length > 0) {
      setPackagingRupees((recipes[0].packagingCostPaise || 0) / 100);
      setPrepCostRupees((recipes[0].directPrepCostPaise || 0) / 100);
    } else {
      setPackagingRupees(0);
      setPrepCostRupees(0);
    }

    if (inv.length > 0 && !selectedInvId) {
      setSelectedInvId(inv[0].id);
      setUnit(inv[0].unit || 'g');
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      loadData();
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvId || quantity <= 0) {
      addToast('Please specify valid ingredient and quantity', 'warning');
      return;
    }

    const inv = inventoryList.find((i) => i.id === selectedInvId);
    if (!inv) return;

    setIsSubmitting(true);
    try {
      await localRepository.saveRecipeItem({
        menuItemId: item.id,
        inventoryItemId: inv.id,
        inventoryItemName: inv.name,
        inventoryUnit: inv.unit,
        inventoryCostPerUnitPaise: inv.costPerUnitPaise,
        quantity,
        unit,
        packagingCostPaise: rupeesToPaise(packagingRupees),
        directPrepCostPaise: rupeesToPaise(prepCostRupees),
      });

      addToast(`Added ${inv.name} (${quantity} ${unit}) to recipe`, 'success');
      await loadData();
      onUpdated();
    } catch {
      addToast('Failed to add recipe ingredient', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecipeLine = async (id: string, name?: string) => {
    try {
      await localRepository.deleteRecipeItem(id);
      addToast(`Removed ${name || 'ingredient'} from recipe`, 'info');
      await loadData();
      onUpdated();
    } catch {
      addToast('Failed to delete recipe line', 'error');
    }
  };

  const handleUpdateDirectCosts = async () => {
    if (recipeItems.length === 0) {
      addToast('Please add at least one ingredient to the recipe first', 'info');
      return;
    }

    try {
      // Update packaging and prep cost on all recipe lines
      for (const line of recipeItems) {
        await localRepository.saveRecipeItem({
          ...line,
          packagingCostPaise: rupeesToPaise(packagingRupees),
          directPrepCostPaise: rupeesToPaise(prepCostRupees),
        });
      }

      addToast('Updated packaging and direct preparation costs', 'success');
      await loadData();
      onUpdated();
    } catch {
      addToast('Failed to update direct costs', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-3xl bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 text-xs max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Recipe & Food Costing
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.name}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Calculate estimated dish production costs and real gross contribution margins
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profitability KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Selling Price
            </span>
            <div className="font-black text-base text-slate-900 dark:text-white mt-1">
              {formatPaise(item.basePricePaise)}
            </div>
            <span className="text-[10px] text-slate-400">Base Menu Price</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Est. Dish Cost
            </span>
            <div className="font-black text-base text-slate-900 dark:text-white mt-1">
              {costSummary && costSummary.isComplete
                ? formatPaise(costSummary.totalEstimatedCostPaise)
                : 'Incomplete'}
            </div>
            <span className="text-[10px] text-slate-400">
              {costSummary && costSummary.isComplete
                ? `Ingredients + Direct`
                : 'Recipe not set'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Est. Contribution
            </span>
            <div className="font-black text-base text-blue-700 dark:text-blue-300 mt-1">
              {costSummary && costSummary.isComplete
                ? formatPaise(costSummary.contributionPaise)
                : '—'}
            </div>
            <span className="text-[10px] text-blue-500/80">Selling - Est. Cost</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Margin %
            </span>
            <div className="font-black text-base text-emerald-700 dark:text-emerald-300 mt-1">
              {costSummary && costSummary.isComplete
                ? `${costSummary.contributionMarginPct}%`
                : '—'}
            </div>
            <span className="text-[10px] text-emerald-600/80">Target: &gt; 65%</span>
          </div>
        </div>

        {/* Warning if Recipe is Incomplete */}
        {(!costSummary || !costSummary.isComplete) && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              This dish has no configured recipe ingredients. Production cost and profit margins are marked as "Cost incomplete" to avoid false profit claims.
            </span>
          </div>
        )}

        {/* Recipe Ingredients Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Recipe Ingredients ({recipeItems.length})
            </h4>
            <span className="text-[10px] text-slate-400">
              Linked to real inventory stock
            </span>
          </div>

          {recipeItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Scale className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-700 mb-1" />
              <span>No ingredients assigned to this recipe yet</span>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3 pl-4">Ingredient</th>
                    <th className="p-3">Recipe Qty</th>
                    <th className="p-3">Stock Unit Cost</th>
                    <th className="p-3">Line Cost</th>
                    <th className="p-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {recipeItems.map((r) => {
                    const inv = inventoryList.find((i) => i.id === r.inventoryItemId);
                    const unitCost = inv?.costPerUnitPaise ?? r.inventoryCostPerUnitPaise ?? 0;
                    const invUnit = inv?.unit ?? r.inventoryUnit ?? r.unit;

                    // Compute line cost with unit conversion
                    let factor = 1;
                    if (r.unit === 'g' && invUnit === 'kg') factor = 0.001;
                    else if (r.unit === 'kg' && invUnit === 'g') factor = 1000;
                    else if (r.unit === 'ml' && invUnit === 'L') factor = 0.001;
                    else if (r.unit === 'L' && invUnit === 'ml') factor = 1000;

                    const lineCostPaise = Math.round(r.quantity * factor * unitCost);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">
                          {r.inventoryItemName || inv?.name || 'Ingredient'}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {r.quantity} {r.unit}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {formatPaise(unitCost)} / {invUnit}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatPaise(lineCostPaise)}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            onClick={() => handleDeleteRecipeLine(r.id, r.inventoryItemName)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Ingredient Form */}
        <form
          onSubmit={handleAddIngredient}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
            + Add Recipe Ingredient
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Inventory Ingredient
              </label>
              <select
                value={selectedInvId}
                onChange={(e) => {
                  setSelectedInvId(e.target.value);
                  const found = inventoryList.find((i) => i.id === e.target.value);
                  if (found) {
                    setUnit(found.unit === 'kg' ? 'g' : found.unit === 'L' ? 'ml' : found.unit);
                  }
                }}
                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              >
                {inventoryList.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} (Stock: {inv.currentStock} {inv.unit} • {formatPaise(inv.costPerUnitPaise)}/{inv.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Recipe Quantity
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              >
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ml">Millilitres (ml)</option>
                <option value="L">Litres (L)</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="portion">Portion</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Dish Recipe</span>
            </button>
          </div>
        </form>

        {/* Additional Direct Costs (Packaging & Direct Prep) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto flex-1">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Packaging Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={packagingRupees}
                onChange={(e) => setPackagingRupees(Number(e.target.value))}
                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Direct Prep Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={prepCostRupees}
                onChange={(e) => setPrepCostRupees(Number(e.target.value))}
                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpdateDirectCosts}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 font-bold shrink-0 self-end"
          >
            Save Direct Costs
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

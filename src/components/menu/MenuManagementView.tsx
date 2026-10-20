import React, { useEffect, useState, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  FolderPlus,
  Upload,
  ChefHat,
  X,
  Loader2,
  Scale,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import {
  MenuCategory,
  MenuItem,
  MenuVariant,
  KitchenStation,
  DietaryType,
  FoodCostingSummary,
} from '../../types';
import { formatPaise, rupeesToPaise } from '../../utils/currency';
import { RecipeCostModal } from './RecipeCostModal';

export const MenuManagementView: React.FC = () => {
  const { activeOutlet, addToast } = useApp();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [costSummaries, setCostSummaries] = useState<FoodCostingSummary[]>([]);

  // Filtering State: Keep Category, Dietary, and Kitchen Station separate
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [selectedDietary, setSelectedDietary] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Recipe & Cost Modal
  const [costingItem, setCostingItem] = useState<MenuItem | null>(null);
  const [isCostingModalOpen, setIsCostingModalOpen] = useState<boolean>(false);

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Item Form Fields
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPriceRupees, setItemPriceRupees] = useState<number>(100);
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemDietaryType, setItemDietaryType] = useState<DietaryType>('veg');
  const [itemStationId, setItemStationId] = useState<string>('station-main');
  const [itemIsBestseller, setItemIsBestseller] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [halfPriceRupees, setHalfPriceRupees] = useState<number>(60);
  const [fullPriceRupees, setFullPriceRupees] = useState<number>(100);

  // Category Form Fields
  const [newCatName, setNewCatName] = useState('');

  const loadCatalog = async () => {
    const [cats, allItems, allStations, summaries] = await Promise.all([
      localRepository.getCategories(),
      localRepository.getMenuItems(),
      localRepository.getKitchenStations(),
      localRepository.getFoodCostingSummaries(activeOutlet?.id || 'outlet-blr-01'),
    ]);
    setCategories(cats);
    setItems(allItems);
    setStations(allStations);
    setCostSummaries(summaries);

    if (!itemCategory && cats.length > 0) {
      setItemCategory(cats[0].id);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [activeOutlet]);

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(
      categories.find((c) => c.slug !== 'all' && c.slug !== 'popular')?.id ||
        categories[0]?.id ||
        ''
    );
    setItemPriceRupees(150);
    setItemDescription('');
    setItemImageUrl('');
    setItemDietaryType('veg');
    setItemStationId(stations[0]?.id || 'station-main');
    setItemIsBestseller(false);
    setHasVariants(false);
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.categoryId);
    setItemPriceRupees(item.basePricePaise / 100);
    setItemDescription(item.description);
    setItemImageUrl(item.imageUrl || '');
    setItemDietaryType(item.dietaryType || (item.foodType as any) || 'veg');
    setItemStationId(item.stationId || stations[0]?.id || 'station-main');
    setItemIsBestseller(item.isBestseller || false);
    if (item.variants && item.variants.length > 0) {
      setHasVariants(true);
      const half = item.variants.find((v) => v.name.toLowerCase().includes('half'));
      const full = item.variants.find((v) => v.name.toLowerCase().includes('full'));
      if (half) setHalfPriceRupees(half.pricePaise / 100);
      if (full) setFullPriceRupees(full.pricePaise / 100);
    } else {
      setHasVariants(false);
    }
    setIsItemModalOpen(true);
  };

  // Image Upload Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Please upload a valid JPEG, PNG, or WebP image', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size cannot exceed 5MB', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const res = await localRepository.uploadMenuImage(file);
      setItemImageUrl(res.url);
      addToast('Dish photo uploaded successfully to Supabase Storage', 'success');
    } catch {
      addToast('Failed to upload dish image', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemPriceRupees < 0) {
      addToast('Price cannot be negative', 'error');
      return;
    }

    const variants: MenuVariant[] = hasVariants
      ? [
          { id: `v-${Date.now()}-1`, name: 'Half', pricePaise: rupeesToPaise(halfPriceRupees) },
          { id: `v-${Date.now()}-2`, name: 'Full', pricePaise: rupeesToPaise(fullPriceRupees), isDefault: true },
        ]
      : [];

    await localRepository.saveMenuItem({
      id: editingItem?.id,
      name: itemName,
      categoryId: itemCategory,
      basePricePaise: rupeesToPaise(itemPriceRupees),
      description: itemDescription,
      imageUrl: itemImageUrl.trim(),
      dietaryType: itemDietaryType,
      foodType: itemDietaryType === 'jain' ? 'veg' : (itemDietaryType as any),
      stationId: itemStationId || 'station-main',
      isBestseller: itemIsBestseller,
      variants,
    });

    await loadCatalog();
    setIsItemModalOpen(false);
    addToast(editingItem ? 'Item updated successfully' : 'New dish added to catalog', 'success');
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const updated = await localRepository.toggleMenuItemAvailability(item.id, !item.isAvailable);
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    addToast(`${item.name} marked ${updated.isAvailable ? 'Available' : 'Sold Out (86)'}`, 'info');
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (window.confirm(`Are you sure you want to archive "${name}" from the menu?`)) {
      await localRepository.deleteMenuItem(itemId);
      await loadCatalog();
      addToast(`"${name}" removed from catalog`, 'info');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await localRepository.saveCategory({
      name: newCatName.trim(),
      slug: newCatName.toLowerCase().replace(/\s+/g, '-'),
    });
    setNewCatName('');
    setIsCatModalOpen(false);
    await loadCatalog();
    addToast('Category created successfully', 'success');
  };

  // Filter Items with separate Category, Dietary, and Station
  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCatId === 'all'
        ? true
        : selectedCatId === 'popular'
        ? item.isBestseller
        : item.categoryId === selectedCatId ||
          categories.find((c) => c.slug === selectedCatId)?.id === item.categoryId;

    const dietary = item.dietaryType || (item.foodType as any) || 'veg';
    const matchesDietary =
      selectedDietary === 'all' ? true : dietary === selectedDietary;

    const matchesStation =
      selectedStation === 'all'
        ? true
        : (item.stationId || 'station-main') === selectedStation;

    const matchesSearch =
      search.trim() === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());

    return matchesCat && matchesDietary && matchesStation && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-hidden select-none p-6 space-y-5">
      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Menu, Recipes & Costing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure dishes, image uploads, portion variants, recipe-based food costing, and 86 availability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
          >
            <FolderPlus className="w-4 h-4 text-purple-500" />
            <span>+ Add Category</span>
          </button>

          <button
            onClick={openAddItemModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Menu Dish</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Separated Category, Dietary, Station, and Search */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        {/* Row 1: Categories */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedCatId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCatId === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCatId === cat.slug
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, descriptions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Row 2: Dietary Classification and Kitchen Station Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Dietary Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Dietary:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'veg', label: '🟢 Veg' },
              { id: 'non_veg', label: '🔴 Non-Veg' },
              { id: 'egg', label: '🟡 Egg' },
              { id: 'vegan', label: '🌿 Vegan' },
              { id: 'jain', label: '🪷 Jain' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDietary(d.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedDietary === d.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Kitchen Station Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Station:
            </span>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
            >
              <option value="all">All Stations</option>
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Menu Catalog Table with Food Costing Column */}
      <div className="flex-1 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] bg-slate-50/50 dark:bg-slate-900/50">
              <th className="p-4 pl-6">Dish Details</th>
              <th className="p-4">Category</th>
              <th className="p-4">Kitchen Station</th>
              <th className="p-4">Dietary</th>
              <th className="p-4">Selling Price</th>
              <th className="p-4">Food Cost & Margin</th>
              <th className="p-4">Availability</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {filteredItems.map((item) => {
              const itemStation = stations.find((s) => s.id === item.stationId) || stations[0];
              const dietary = item.dietaryType || (item.foodType as any) || 'veg';
              const costSummary = costSummaries.find((s) => s.menuItemId === item.id);

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <td className="p-4 pl-6 flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500">
                        <UtensilsCrossed className="w-5 h-5 opacity-60" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        {item.isBestseller && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold">
                            Bestseller
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  </td>

                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                    {categories.find((c) => c.id === item.categoryId)?.name || 'General'}
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span>🍳</span>
                      <span>{itemStation?.name || 'Main Kitchen'}</span>
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        dietary === 'veg'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : dietary === 'non_veg'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : dietary === 'egg'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : dietary === 'vegan'
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      {dietary === 'veg' && '🟢 Veg'}
                      {dietary === 'non_veg' && '🔴 Non-Veg'}
                      {dietary === 'egg' && '🟡 Egg'}
                      {dietary === 'vegan' && '🌿 Vegan'}
                      {dietary === 'jain' && '🪷 Jain'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {formatPaise(item.basePricePaise)}
                    </div>
                    {item.variants && item.variants.length > 0 && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                        {item.variants.map((v) => `${v.name}: ${formatPaise(v.pricePaise)}`).join(', ')}
                      </span>
                    )}
                  </td>

                  {/* Food Cost & Contribution Margin */}
                  <td className="p-4">
                    {costSummary && costSummary.isComplete ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatPaise(costSummary.totalEstimatedCostPaise)}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              costSummary.contributionMarginPct >= 65
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {costSummary.contributionMarginPct}% margin
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {costSummary.ingredientCount} ingredient{costSummary.ingredientCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
                        Cost Incomplete
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                        item.isAvailable
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                      }`}
                    >
                      {item.isAvailable ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{item.isAvailable ? 'In Stock' : 'Sold Out (86)'}</span>
                    </button>
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => {
                          setCostingItem(item);
                          setIsCostingModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        title="Configure Recipe & Food Costing"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditItemModal(item)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Item & Price"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Archive Dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <ChefHat className="w-7 h-7 stroke-1" />
                  </div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    {items.length === 0 ? 'No dishes in this restaurant menu' : 'No dishes match this filter'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {items.length === 0
                      ? 'Create your first dish or create categories to build your restaurant catalog.'
                      : 'Try selecting a different category or clearing search filters.'}
                  </p>
                  {items.length === 0 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={openAddItemModal}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Your First Dish</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCatModalOpen(true)}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dish Modal with File Picker */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleSaveItem}
            className="w-full max-w-lg bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingItem ? 'Edit Dish & Price' : 'Add New Menu Dish'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Dish Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Kadai Paneer Special"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none"
                >
                  {categories
                    .filter((c) => c.slug !== 'all' && c.slug !== 'popular')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dietary Tag</label>
                <select
                  value={itemDietaryType}
                  onChange={(e) => setItemDietaryType(e.target.value as DietaryType)}
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none"
                >
                  <option value="veg">🟢 Veg</option>
                  <option value="non_veg">🔴 Non-Veg</option>
                  <option value="egg">🟡 Egg</option>
                  <option value="vegan">🌿 Vegan</option>
                  <option value="jain">🪷 Jain</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Kitchen Station</label>
                <select
                  value={itemStationId}
                  onChange={(e) => setItemStationId(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Base Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={itemPriceRupees}
                onChange={(e) => setItemPriceRupees(Number(e.target.value))}
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-lg text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>

            {/* Dish Image Upload Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Dish Image (Supabase Storage)
              </label>

              <div className="flex items-center gap-3">
                {itemImageUrl ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                    <img
                      src={itemImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setItemImageUrl('')}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    </button>

                    {itemImageUrl && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Image attached
                      </span>
                    )}
                  </div>

                  <input
                    type="url"
                    value={itemImageUrl}
                    onChange={(e) => setItemImageUrl(e.target.value)}
                    placeholder="Or paste external image URL..."
                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={2}
                placeholder="Ingredients, preparation and taste notes"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Variants Toggle */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Enable Portion Variants</span>
                  <p className="text-slate-400 text-[10px]">Configure Half and Full pricing</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {hasVariants && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-300">Half Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={halfPriceRupees}
                      onChange={(e) => setHalfPriceRupees(Number(e.target.value))}
                      className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-300">Full Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={fullPriceRupees}
                      onChange={(e) => setFullPriceRupees(Number(e.target.value))}
                      className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bestseller-toggle"
                checked={itemIsBestseller}
                onChange={(e) => setItemIsBestseller(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <label
                htmlFor="bestseller-toggle"
                className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Tag as Bestseller
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm active:scale-95 transition-all"
              >
                Save Dish to Menu
              </button>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleCreateCategory}
            className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Create Menu Category
              </h3>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Category Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Tandoori Starters, Biryanis, Mocktails"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
              >
                Create Category
              </button>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recipe & Food Costing Modal */}
      {isCostingModalOpen && costingItem && (
        <RecipeCostModal
          isOpen={isCostingModalOpen}
          item={costingItem}
          onClose={() => {
            setIsCostingModalOpen(false);
            setCostingItem(null);
          }}
          onUpdated={loadCatalog}
        />
      )}
    </div>
  );
};

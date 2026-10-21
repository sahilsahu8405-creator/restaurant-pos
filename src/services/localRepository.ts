import {
  AuditLog,
  CartItem,
  DayClosingRecord,
  DiningSection,
  DiningTable,
  ExpenseRecord,
  FoodCostingSummary,
  InventoryItem,
  InventoryMovement,
  KitchenNotification,
  KitchenStation,
  KitchenStatus,
  KOTTicket,
  MenuCategory,
  MenuItem,
  Order,
  Outlet,
  RecipeItem,
  Restaurant,
  RestaurantSettings,
  RoleType,
} from '../types';
import { IDataAdapter } from './dataAdapter';
import {
  mockCategories,
  mockExpenses,
  mockInitialOrders,
  mockInventory,
  mockKitchenStations,
  mockMenuItems,
  mockRestaurant,
  mockTables,
} from './mockData';
import { calculateBill } from '../utils/currency';
import {
  getRolePermissions,
  validateRestaurantData,
  validateBranchData,
} from '../utils/permissions';
import {
  syncOrderToSupabase,
  syncPaymentToSupabase,
  syncExpenseToSupabase,
  uploadDishImage,
  broadcastOperationalEvent,
  fetchSupabaseSections,
  upsertSupabaseSection,
  deleteSupabaseSection,
  fetchSupabaseTables,
  upsertSupabaseTable,
  deleteSupabaseTable,
  fetchSupabaseRecipeItems,
  upsertSupabaseRecipeItem,
  deleteSupabaseRecipeItem,
  syncKitchenNotificationToSupabase,
  fetchKitchenNotificationsFromSupabase,
  updateKitchenNotificationInSupabase,
  updateRestaurantInSupabase,
  updateOutletInSupabase,
  fetchRestaurantAndOutletsFromSupabase,
  fetchSupabaseCategories,
  saveSupabaseCategory,
  deleteSupabaseCategory,
  fetchSupabaseMenuItems,
  saveSupabaseMenuItem,
  deleteSupabaseMenuItem,
  fetchSupabaseOrders,
  fetchSupabaseInventory,
  fetchSupabaseExpenses,
  resolveOutletId,
  isSameOutlet,
  syncKotTicketsToSupabase,
  fetchSupabaseKotTickets,
  updateKotTicketStatusInSupabase,
} from './supabaseClient';
import { postCrossTabEvent } from '../utils/notificationSound';

const STORAGE_KEYS = {
  RESTAURANT: 'restohub_restaurant_v2',
  SETTINGS: 'restohub_settings_v2',
  CATEGORIES: 'restohub_categories_v2',
  MENU_ITEMS: 'restohub_menu_items_v2',
  ORDERS: 'restohub_orders_v2',
  TABLES: 'restohub_tables_v2',
  SECTIONS: 'restohub_dining_sections_v2',
  RECIPES: 'restohub_recipe_items_v2',
  INVENTORY: 'restohub_inventory_v2',
  MOVEMENTS: 'restohub_stock_movements_v2',
  EXPENSES: 'restohub_expenses_v2',
  CLOSINGS: 'restohub_closings_v2',
  AUDIT: 'restohub_audit_logs_v2',
  STATIONS: 'restohub_kitchen_stations_v2',
  KOT_TICKETS: 'restohub_kot_tickets_v2',
  NOTIFICATIONS: 'restohub_kitchen_notifications_v2',
};

const defaultDiningSections: DiningSection[] = [
  { id: 'sec-main', outletId: 'outlet-blr-01', name: 'Main Hall', sortOrder: 1 },
  { id: 'sec-outdoor', outletId: 'outlet-blr-01', name: 'Outdoor Deck', sortOrder: 2 },
  { id: 'sec-family', outletId: 'outlet-blr-01', name: 'Family VIP', sortOrder: 3 },
];

export function normalizeOutletId(id?: string): string {
  if (!id) return '';
  if (id === 'outlet-blr-01') return 'e7b1a0e1-0000-4000-8000-000000000011';
  if (id === 'outlet-blr-02') return 'e7b1a0e1-0000-4000-8000-000000000012';
  return id.toLowerCase();
}

export function isMatchingOutlet(outletA?: string, outletB?: string): boolean {
  if (!outletA || !outletB) return false;
  if (outletA === outletB) return true;
  return normalizeOutletId(outletA) === normalizeOutletId(outletB);
}


const defaultRecipeItems: RecipeItem[] = [
  {
    id: 'rec-1',
    menuItemId: 'item-1',
    inventoryItemId: 'inv-1',
    inventoryItemName: 'Fresh Paneer (Malai)',
    inventoryUnit: 'kg',
    inventoryCostPerUnitPaise: 32000,
    quantity: 180,
    unit: 'g',
    packagingCostPaise: 1500,
    directPrepCostPaise: 1000,
  },
  {
    id: 'rec-2',
    menuItemId: 'item-1',
    inventoryItemId: 'inv-2',
    inventoryItemName: 'Amul Salted Butter',
    inventoryUnit: 'kg',
    inventoryCostPerUnitPaise: 48000,
    quantity: 30,
    unit: 'g',
    packagingCostPaise: 0,
    directPrepCostPaise: 0,
  },
  {
    id: 'rec-3',
    menuItemId: 'item-2',
    inventoryItemId: 'inv-4',
    inventoryItemName: 'Toor Dal (Premium)',
    inventoryUnit: 'kg',
    inventoryCostPerUnitPaise: 14000,
    quantity: 150,
    unit: 'g',
    packagingCostPaise: 1000,
    directPrepCostPaise: 500,
  },
  {
    id: 'rec-4',
    menuItemId: 'item-3',
    inventoryItemId: 'inv-3',
    inventoryItemName: 'Basmati Rice (Daawat)',
    inventoryUnit: 'kg',
    inventoryCostPerUnitPaise: 11000,
    quantity: 200,
    unit: 'g',
    packagingCostPaise: 1500,
    directPrepCostPaise: 1000,
  },
];

function calculateIngredientCost(quantity: number, recipeUnit: string, invUnit: string, costPerUnitPaise: number): number {
  let factor = 1;
  const rUnit = recipeUnit.toLowerCase().trim();
  const iUnit = invUnit.toLowerCase().trim();

  if (iUnit === 'kg' && rUnit === 'g') {
    factor = quantity / 1000;
  } else if (iUnit === 'g' && rUnit === 'kg') {
    factor = quantity * 1000;
  } else if ((iUnit === 'liters' || iUnit === 'l' || iUnit === 'litre') && rUnit === 'ml') {
    factor = quantity / 1000;
  } else if (iUnit === 'ml' && (rUnit === 'l' || rUnit === 'liters' || rUnit === 'litre')) {
    factor = quantity * 1000;
  } else {
    factor = quantity;
  }

  return Math.round(costPerUnitPaise * factor);
}

class LocalDataRepository implements IDataAdapter {
  private currentTenantId: string | null = null;
  private restaurant: Restaurant = mockRestaurant;
  private categories: MenuCategory[] = [];
  private menuItems: MenuItem[] = [];
  private diningSections: DiningSection[] = [];
  private tables: DiningTable[] = [];
  private recipeItems: RecipeItem[] = [];
  private orders: Order[] = [];
  private inventory: InventoryItem[] = [];
  private movements: InventoryMovement[] = [];
  private expenses: ExpenseRecord[] = [];
  private closings: DayClosingRecord[] = [];
  private auditLogs: AuditLog[] = [];
  private kitchenStations: KitchenStation[] = [];
  private kotTickets: KOTTicket[] = [];
  private kitchenNotifications: KitchenNotification[] = [];

  constructor() {
    this.init();
  }

  private getStorageKey(baseKey: string): string {
    const tenantId = this.currentTenantId || this.restaurant?.id;
    return tenantId ? `restohub_${tenantId}_${baseKey}` : `restohub_${baseKey}`;
  }

  public clearTenantData(): void {
    this.currentTenantId = null;
    this.categories = [];
    this.menuItems = [];
    this.tables = [];
    this.orders = [];
    this.diningSections = [];
    this.inventory = [];
    this.expenses = [];
    this.kotTickets = [];
    this.kitchenNotifications = [];
    this.movements = [];
    this.closings = [];
    this.auditLogs = [];
    this.notifyChange();
  }

  private init() {
    try {
      const storedRes = localStorage.getItem(STORAGE_KEYS.RESTAURANT);
      if (storedRes) {
        this.restaurant = JSON.parse(storedRes);
        this.currentTenantId = this.restaurant.id;
      }

      const tenantId = this.currentTenantId || this.restaurant?.id;
      // Only seed mock data if this is explicitly Spice Garden
      const isSpiceGarden = tenantId === 'e7b1a0e1-0000-4000-8000-000000000001';

      const storedCats = localStorage.getItem(this.getStorageKey('categories'));
      this.categories = storedCats ? JSON.parse(storedCats) : (isSpiceGarden ? mockCategories : []);

      const storedItems = localStorage.getItem(this.getStorageKey('menu_items'));
      this.menuItems = storedItems ? JSON.parse(storedItems) : (isSpiceGarden ? mockMenuItems : []);

      const storedOrders = localStorage.getItem(this.getStorageKey('orders'));
      this.orders = storedOrders ? JSON.parse(storedOrders) : (isSpiceGarden ? mockInitialOrders : []);

      const storedTables = localStorage.getItem(this.getStorageKey('tables'));
      this.tables = storedTables ? JSON.parse(storedTables) : (isSpiceGarden ? mockTables : []);

      const storedSections = localStorage.getItem(this.getStorageKey('sections'));
      this.diningSections = storedSections ? JSON.parse(storedSections) : (isSpiceGarden ? defaultDiningSections : []);

      const storedRecipes = localStorage.getItem(this.getStorageKey('recipes'));
      this.recipeItems = storedRecipes ? JSON.parse(storedRecipes) : (isSpiceGarden ? defaultRecipeItems : []);

      const storedInventory = localStorage.getItem(this.getStorageKey('inventory'));
      this.inventory = storedInventory ? JSON.parse(storedInventory) : (isSpiceGarden ? mockInventory : []);

      const storedMovements = localStorage.getItem(this.getStorageKey('movements'));
      this.movements = storedMovements ? JSON.parse(storedMovements) : [];

      const storedExpenses = localStorage.getItem(this.getStorageKey('expenses'));
      this.expenses = storedExpenses ? JSON.parse(storedExpenses) : (isSpiceGarden ? mockExpenses : []);

      const storedClosings = localStorage.getItem(this.getStorageKey('closings'));
      this.closings = storedClosings ? JSON.parse(storedClosings) : [];

      const storedAudit = localStorage.getItem(this.getStorageKey('audit'));
      this.auditLogs = storedAudit ? JSON.parse(storedAudit) : [];

      const storedStations = localStorage.getItem(this.getStorageKey('stations'));
      this.kitchenStations = storedStations ? JSON.parse(storedStations) : (isSpiceGarden ? mockKitchenStations : []);

      const storedKot = localStorage.getItem(this.getStorageKey('kot_tickets'));
      this.kotTickets = storedKot ? JSON.parse(storedKot) : [];

      const storedNotifs = localStorage.getItem(this.getStorageKey('notifications'));
      this.kitchenNotifications = storedNotifs ? JSON.parse(storedNotifs) : [];
    } catch {
      this.restaurant = mockRestaurant;
      this.categories = [];
      this.menuItems = [];
      this.diningSections = [];
      this.recipeItems = [];
      this.orders = [];
      this.tables = [];
      this.inventory = [];
      this.expenses = [];
      this.kitchenStations = [];
      this.kotTickets = [];
      this.kitchenNotifications = [];
    }
  }

  private saveRestaurant() {
    localStorage.setItem(STORAGE_KEYS.RESTAURANT, JSON.stringify(this.restaurant));
  }

  private saveCategories() {
    localStorage.setItem(this.getStorageKey('categories'), JSON.stringify(this.categories));
  }

  private saveMenuItems() {
    localStorage.setItem(this.getStorageKey('menu_items'), JSON.stringify(this.menuItems));
  }

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyChange() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in localRepository listener:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restohub:operational-change'));
    }
  }

  private saveOrders() {
    localStorage.setItem(this.getStorageKey('orders'), JSON.stringify(this.orders));
    this.notifyChange();
  }

  private saveStations() {
    localStorage.setItem(this.getStorageKey('stations'), JSON.stringify(this.kitchenStations));
    this.notifyChange();
  }

  private saveKotTickets() {
    localStorage.setItem(this.getStorageKey('kot_tickets'), JSON.stringify(this.kotTickets));
    this.notifyChange();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restohub:operational-change'));
    }
  }

  public rehydrateFromStorage(): void {
    try {
      const storedKot = localStorage.getItem(this.getStorageKey('kot_tickets'));
      if (storedKot) {
        const parsed = JSON.parse(storedKot);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge avoiding duplicates
          const map = new Map<string, KOTTicket>();
          this.kotTickets.forEach((t) => map.set(t.id || t.kotNumber, t));
          parsed.forEach((t: KOTTicket) => map.set(t.id || t.kotNumber, t));
          this.kotTickets = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      }
      const storedOrders = localStorage.getItem(this.getStorageKey('orders'));
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, Order>();
          this.orders.forEach((o) => map.set(o.id, o));
          parsed.forEach((o: Order) => map.set(o.id, o));
          this.orders = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      }
      const storedTables = localStorage.getItem(this.getStorageKey('tables'));
      if (storedTables) {
        const parsed = JSON.parse(storedTables);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tables = parsed;
        }
      }
      const storedNotifs = localStorage.getItem(this.getStorageKey('notifications'));
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.kitchenNotifications = parsed;
        }
      }
    } catch {}
  }

  public mergeKotTickets(incoming: KOTTicket[]): void {
    if (!incoming || incoming.length === 0) return;
    this.rehydrateFromStorage();
    let changed = false;
    for (const ticket of incoming) {
      const idx = this.kotTickets.findIndex((t) => t.id === ticket.id || t.kotNumber === ticket.kotNumber);
      if (idx !== -1) {
        this.kotTickets[idx] = { ...this.kotTickets[idx], ...ticket };
        changed = true;
      } else {
        this.kotTickets.unshift(ticket);
        changed = true;
      }
    }
    if (changed) {
      this.saveKotTickets();
      this.notifyChange();
    }
  }

  private saveNotifications() {
    localStorage.setItem(this.getStorageKey('notifications'), JSON.stringify(this.kitchenNotifications));
    this.notifyChange();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restohub:kitchen-notification-change'));
    }
  }

  private saveTables() {
    localStorage.setItem(this.getStorageKey('tables'), JSON.stringify(this.tables));
    this.notifyChange();
  }

  private saveSections() {
    localStorage.setItem(this.getStorageKey('sections'), JSON.stringify(this.diningSections));
  }

  private saveRecipes() {
    localStorage.setItem(this.getStorageKey('recipes'), JSON.stringify(this.recipeItems));
  }

  private saveInventory() {
    localStorage.setItem(this.getStorageKey('inventory'), JSON.stringify(this.inventory));
  }

  private saveMovements() {
    localStorage.setItem(this.getStorageKey('movements'), JSON.stringify(this.movements));
  }

  private saveExpenses() {
    localStorage.setItem(this.getStorageKey('expenses'), JSON.stringify(this.expenses));
  }

  private saveClosings() {
    localStorage.setItem(this.getStorageKey('closings'), JSON.stringify(this.closings));
  }

  private saveAudit() {
    localStorage.setItem(this.getStorageKey('audit'), JSON.stringify(this.auditLogs));
  }

  async loadRestaurantFromSupabase(targetRestaurantId: string, targetOutletId?: string): Promise<Restaurant | null> {
    try {
      this.currentTenantId = targetRestaurantId;
      const data = await fetchRestaurantAndOutletsFromSupabase(targetRestaurantId);
      if (data && data.restaurant) {
        const fullRestaurant: Restaurant = {
          id: data.restaurant.id || targetRestaurantId,
          name: data.restaurant.name || 'Restaurant',
          slug: data.restaurant.slug || 'restaurant',
          restaurantCode: data.restaurant.restaurantCode || undefined,
          legalName: data.restaurant.legalName || data.restaurant.name || '',
          currency: (data.restaurant.currency as any) || 'INR',
          currencySymbol: data.restaurant.currencySymbol || '₹',
          primaryPhone: data.restaurant.primaryPhone || '',
          businessEmail: data.restaurant.businessEmail || '',
          gstin: data.restaurant.gstin || '',
          fssaiLicense: data.restaurant.fssaiLicense || '',
          operatingHours: data.restaurant.operatingHours || '11:00 AM - 11:00 PM',
          timezone: data.restaurant.timezone || 'Asia/Kolkata',
          outlets: data.outlets,
          settings: data.restaurant.settings || this.restaurant.settings,
        };
        this.restaurant = fullRestaurant;

        const outletToQuery = targetOutletId || fullRestaurant.outlets[0]?.id;

        // Fetch tenant-isolated operational records from Supabase
        const [cats, items, sections, tables, orders, inv, exp, remoteKots, remoteNotifs] = await Promise.all([
          fetchSupabaseCategories(targetRestaurantId),
          fetchSupabaseMenuItems(targetRestaurantId),
          outletToQuery ? fetchSupabaseSections(outletToQuery) : Promise.resolve([]),
          outletToQuery ? fetchSupabaseTables(outletToQuery) : Promise.resolve([]),
          outletToQuery ? fetchSupabaseOrders(outletToQuery, targetRestaurantId) : Promise.resolve([]),
          fetchSupabaseInventory(targetRestaurantId),
          outletToQuery ? fetchSupabaseExpenses(targetRestaurantId, outletToQuery) : Promise.resolve([]),
          outletToQuery ? fetchSupabaseKotTickets(outletToQuery) : Promise.resolve([]),
          outletToQuery ? fetchKitchenNotificationsFromSupabase(outletToQuery) : Promise.resolve([]),
        ]);

        const isSpiceGarden = targetRestaurantId === 'e7b1a0e1-0000-4000-8000-000000000001';

        if (cats.length > 0) {
          this.categories = cats;
        } else if (!isSpiceGarden) {
          const storedCats = localStorage.getItem(this.getStorageKey('categories'));
          this.categories = storedCats ? JSON.parse(storedCats) : [];
        } else {
          this.categories = mockCategories;
        }

        if (items.length > 0) {
          this.menuItems = items;
        } else if (!isSpiceGarden) {
          const storedItems = localStorage.getItem(this.getStorageKey('menu_items'));
          this.menuItems = storedItems ? JSON.parse(storedItems) : [];
        } else {
          this.menuItems = mockMenuItems;
        }

        if (sections.length > 0) {
          this.diningSections = sections;
        } else if (!isSpiceGarden) {
          const storedSecs = localStorage.getItem(this.getStorageKey('sections'));
          if (storedSecs) {
            try {
              const parsed = JSON.parse(storedSecs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                this.diningSections = parsed;
              }
            } catch {}
          }
        } else {
          this.diningSections = defaultDiningSections;
        }

        if (tables.length > 0) {
          this.tables = tables;
        } else if (!isSpiceGarden) {
          const storedTables = localStorage.getItem(this.getStorageKey('tables'));
          if (storedTables) {
            try {
              const parsed = JSON.parse(storedTables);
              if (Array.isArray(parsed) && parsed.length > 0) {
                this.tables = parsed;
              }
            } catch {}
          }
        } else {
          this.tables = mockTables;
        }

        if (orders.length > 0) {
          this.orders = orders;
        } else if (!isSpiceGarden) {
          const storedOrders = localStorage.getItem(this.getStorageKey('orders'));
          if (storedOrders) {
            try {
              const parsed = JSON.parse(storedOrders);
              if (Array.isArray(parsed) && parsed.length > 0) {
                this.orders = parsed;
              }
            } catch {}
          }
        } else {
          this.orders = mockInitialOrders;
        }

        if (remoteKots && remoteKots.length > 0) {
          this.kotTickets = remoteKots;
        } else if (!isSpiceGarden) {
          const storedKot = localStorage.getItem(this.getStorageKey('kot_tickets'));
          this.kotTickets = storedKot ? JSON.parse(storedKot) : [];
        } else {
          this.kotTickets = [];
        }

        if (remoteNotifs && remoteNotifs.length > 0) {
          this.kitchenNotifications = remoteNotifs;
        } else if (!isSpiceGarden) {
          const storedNotifs = localStorage.getItem(this.getStorageKey('notifications'));
          this.kitchenNotifications = storedNotifs ? JSON.parse(storedNotifs) : [];
        } else {
          this.kitchenNotifications = [];
        }

        this.inventory = inv.length > 0 ? inv : (isSpiceGarden ? mockInventory : []);
        this.expenses = exp.length > 0 ? exp : (isSpiceGarden ? mockExpenses : []);

        this.saveRestaurant();
        this.saveCategories();
        this.saveMenuItems();
        this.saveTables();
        this.saveSections();
        this.saveOrders();
        this.saveKotTickets();
        this.saveNotifications();
        this.saveInventory();
        this.saveExpenses();

        this.notifyChange();
        return fullRestaurant;
      }
    } catch (e) {
      console.warn('Could not load restaurant from Supabase:', e);
    }
    return null;
  }

  setRestaurant(res: Restaurant): void {
    this.restaurant = res;
    this.currentTenantId = res.id;
    this.saveRestaurant();
    this.notifyChange();
  }

  // Restaurant & Settings
  async getRestaurant(): Promise<Restaurant> {
    return this.restaurant;
  }

  async updateRestaurantProfile(
    updates: Partial<Restaurant>,
    actorRole: RoleType = 'owner'
  ): Promise<Restaurant> {
    const permissions = getRolePermissions(actorRole);

    if (!permissions.canEditRestaurantProfile) {
      throw new Error(
        `Unauthorized: Your role (${permissions.roleDisplayName}) does not have permission to modify restaurant business details. Only the Restaurant Owner can perform this action.`
      );
    }

    // Validate
    const validationErrors = validateRestaurantData({
      name: updates.name !== undefined ? updates.name : this.restaurant.name,
      legalName: updates.legalName !== undefined ? updates.legalName : this.restaurant.legalName,
      primaryPhone: updates.primaryPhone !== undefined ? updates.primaryPhone : this.restaurant.primaryPhone,
      businessEmail: updates.businessEmail !== undefined ? updates.businessEmail : this.restaurant.businessEmail,
      gstin: updates.gstin !== undefined ? updates.gstin : this.restaurant.gstin,
      fssaiLicense: updates.fssaiLicense !== undefined ? updates.fssaiLicense : this.restaurant.fssaiLicense,
      operatingHours: updates.operatingHours !== undefined ? updates.operatingHours : this.restaurant.operatingHours,
      timezone: updates.timezone !== undefined ? updates.timezone : this.restaurant.timezone,
    });

    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      throw new Error(firstError);
    }

    // Apply updates
    const currency = updates.currency || this.restaurant.currency || 'INR';
    const currencySymbol =
      updates.currencySymbol ||
      (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'AED' ? 'AED' : '₹');

    this.restaurant = {
      ...this.restaurant,
      ...updates,
      currency,
      currencySymbol,
    };

    // Keep settings in sync if relevant fields were provided
    if (this.restaurant.settings) {
      this.restaurant.settings = {
        ...this.restaurant.settings,
        primaryPhone: updates.primaryPhone !== undefined ? updates.primaryPhone : this.restaurant.settings.primaryPhone,
        operatingHours: updates.operatingHours !== undefined ? updates.operatingHours : this.restaurant.settings.operatingHours,
        gstin: updates.gstin !== undefined ? updates.gstin : this.restaurant.settings.gstin,
        fssaiLicense: updates.fssaiLicense !== undefined ? updates.fssaiLicense : this.restaurant.settings.fssaiLicense,
        currencySymbol,
      };
    }

    this.saveRestaurant();

    // Async sync to Supabase database
    updateRestaurantInSupabase(this.restaurant).catch((err) =>
      console.warn('Failed to sync updated restaurant to Supabase:', err)
    );

    await this.recordAuditLog({
      action: 'UPDATE_RESTAURANT_PROFILE',
      entityType: 'restaurant',
      details: updates,
      actor: permissions.roleDisplayName,
    });

    this.notifyChange();
    return this.restaurant;
  }

  async updateOutletProfile(
    outletId: string,
    updates: Partial<Outlet>,
    actorRole: RoleType = 'owner'
  ): Promise<Outlet> {
    const permissions = getRolePermissions(actorRole);

    if (!permissions.canEditBranchProfile) {
      throw new Error(
        `Unauthorized: Your role (${permissions.roleDisplayName}) does not have permission to modify branch profile settings.`
      );
    }

    const outletIndex = this.restaurant.outlets.findIndex((o) => o.id === outletId);
    if (outletIndex === -1) {
      throw new Error(`Outlet not found with ID ${outletId}`);
    }

    const currentOutlet = this.restaurant.outlets[outletIndex];

    // Validate
    const validationErrors = validateBranchData({
      name: updates.name !== undefined ? updates.name : currentOutlet.name,
      code: updates.code !== undefined ? updates.code : currentOutlet.code,
      phone: updates.phone !== undefined ? updates.phone : currentOutlet.phone,
      email: updates.email !== undefined ? updates.email : currentOutlet.email,
      gstin: updates.gstin !== undefined ? updates.gstin : currentOutlet.gstin,
      fssaiLicense: updates.fssaiLicense !== undefined ? updates.fssaiLicense : currentOutlet.fssaiLicense,
    });

    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      throw new Error(firstError);
    }

    const updatedOutlet: Outlet = {
      ...currentOutlet,
      ...updates,
    };

    this.restaurant.outlets[outletIndex] = updatedOutlet;
    this.saveRestaurant();

    // Async sync to Supabase database
    updateOutletInSupabase(updatedOutlet).catch((err) =>
      console.warn('Failed to sync updated outlet to Supabase:', err)
    );

    await this.recordAuditLog({
      action: 'UPDATE_OUTLET_PROFILE',
      entityType: 'outlet',
      details: updates,
      actor: permissions.roleDisplayName,
    });

    this.notifyChange();
    return updatedOutlet;
  }

  async updateRestaurantSettings(settings: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
    this.restaurant.settings = {
      ...this.restaurant.settings,
      ...settings,
    };
    this.saveRestaurant();
    await this.recordAuditLog({
      action: 'UPDATE_SETTINGS',
      entityType: 'restaurant_settings',
      details: settings,
      actor: 'Owner',
    });
    return this.restaurant.settings;
  }

  // Menu Categories
  async getCategories(): Promise<MenuCategory[]> {
    return this.categories;
  }

  async saveCategory(catInput: Partial<MenuCategory> & { name: string; slug: string }): Promise<MenuCategory> {
    if (catInput.id) {
      const idx = this.categories.findIndex((c) => c.id === catInput.id);
      if (idx !== -1) {
        this.categories[idx] = { ...this.categories[idx], ...catInput };
        this.saveCategories();
        saveSupabaseCategory({ ...this.categories[idx], restaurantId: this.restaurant.id }).catch((err) => {
          console.warn('Error updating category in Supabase:', err);
        });
        return this.categories[idx];
      }
    }

    let savedCat: MenuCategory | null = null;
    try {
      savedCat = await saveSupabaseCategory({
        restaurantId: this.restaurant.id,
        name: catInput.name,
        slug: catInput.slug || catInput.name.toLowerCase().replace(/\s+/g, '-'),
        sortOrder: this.categories.length + 1,
      });
    } catch (err) {
      console.warn('Could not save category to Supabase:', err);
    }

    const newCat: MenuCategory = savedCat || {
      id: `cat-${Date.now()}`,
      sortOrder: this.categories.length + 1,
      isActive: true,
      ...catInput,
      name: catInput.name,
      slug: catInput.slug || catInput.name.toLowerCase().replace(/\s+/g, '-'),
    };
    this.categories.push(newCat);
    this.saveCategories();
    return newCat;
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
    this.saveCategories();
    deleteSupabaseCategory(id).catch(() => {});
  }

  // Menu Items & Prices
  async getMenuItems(categoryId?: string): Promise<MenuItem[]> {
    if (!categoryId || categoryId === 'cat-all') {
      return this.menuItems;
    }
    if (categoryId === 'cat-popular') {
      return this.menuItems.filter((i) => i.isBestseller);
    }
    return this.menuItems.filter((i) => i.categoryId === categoryId);
  }

  async getMenuItemById(id: string): Promise<MenuItem | null> {
    return this.menuItems.find((i) => i.id === id) || null;
  }

  async saveMenuItem(
    itemInput: Partial<MenuItem> & { name: string; basePricePaise: number; categoryId: string }
  ): Promise<MenuItem> {
    if (itemInput.id) {
      const idx = this.menuItems.findIndex((i) => i.id === itemInput.id);
      if (idx !== -1) {
        this.menuItems[idx] = {
          ...this.menuItems[idx],
          ...itemInput,
          imageUrl: itemInput.imageUrl !== undefined ? itemInput.imageUrl : this.menuItems[idx].imageUrl,
        };
        this.saveMenuItems();
        try {
          const updated = await saveSupabaseMenuItem({
            ...this.menuItems[idx],
            restaurantId: this.restaurant.id,
          });
          if (updated) {
            this.menuItems[idx] = updated;
            this.saveMenuItems();
          }
        } catch (err) {
          console.error('Error updating menu item in Supabase:', err);
        }

        await this.recordAuditLog({
          action: 'UPDATE_MENU_ITEM',
          entityType: 'menu_item',
          entityId: itemInput.id,
          details: { name: itemInput.name, price: itemInput.basePricePaise },
          actor: 'Owner',
        });
        return this.menuItems[idx];
      }
    }

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      categoryId: itemInput.categoryId,
      name: itemInput.name,
      description: itemInput.description || '',
      imageUrl: itemInput.imageUrl || '',
      foodType: itemInput.foodType || 'veg',
      dietaryType: itemInput.dietaryType || (itemInput.foodType as any) || 'veg',
      stationId: itemInput.stationId || 'station-main',
      basePricePaise: Math.max(0, itemInput.basePricePaise),
      isAvailable: itemInput.isAvailable !== undefined ? itemInput.isAvailable : true,
      isBestseller: itemInput.isBestseller || false,
      cgstPct: itemInput.cgstPct || this.restaurant.settings?.cgstPct || 2.5,
      sgstPct: itemInput.sgstPct || this.restaurant.settings?.sgstPct || 2.5,
      variants: itemInput.variants || [],
      modifierGroups: itemInput.modifierGroups || [],
    };

    let itemToStore: MenuItem = newItem;
    try {
      const saved = await saveSupabaseMenuItem({
        ...newItem,
        restaurantId: this.restaurant.id,
      });
      if (saved) {
        itemToStore = saved;
      }
    } catch (err) {
      console.error('Error saving new menu item to Supabase:', err);
    }

    this.menuItems.push(itemToStore);
    this.saveMenuItems();

    await this.recordAuditLog({
      action: 'CREATE_MENU_ITEM',
      entityType: 'menu_item',
      entityId: itemToStore.id,
      details: { name: itemToStore.name, price: itemToStore.basePricePaise },
      actor: 'Owner',
    });
    return itemToStore;
  }

  async toggleMenuItemAvailability(itemId: string, isAvailable: boolean): Promise<MenuItem> {
    const idx = this.menuItems.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error('Menu item not found');

    this.menuItems[idx] = {
      ...this.menuItems[idx],
      isAvailable,
    };
    this.saveMenuItems();
    saveSupabaseMenuItem({
      ...this.menuItems[idx],
      restaurantId: this.restaurant.id,
    }).catch(() => {});
    return this.menuItems[idx];
  }

  async deleteMenuItem(itemId: string): Promise<void> {
    this.menuItems = this.menuItems.filter((i) => i.id !== itemId);
    this.saveMenuItems();
    deleteSupabaseMenuItem(itemId).catch(() => {});
  }

  async uploadMenuImage(file: File): Promise<{ url: string }> {
    return uploadDishImage(file);
  }

  // Food Costing & Recipe Builder
  async getRecipeItems(menuItemId: string): Promise<RecipeItem[]> {
    return this.recipeItems.filter((r) => r.menuItemId === menuItemId);
  }

  async saveRecipeItem(
    itemInput: Partial<RecipeItem> & { menuItemId: string; inventoryItemId: string; quantity: number; unit: string }
  ): Promise<RecipeItem> {
    const inv = this.inventory.find((i) => i.id === itemInput.inventoryItemId);
    const newItem: RecipeItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      inventoryItemName: inv?.name || 'Ingredient',
      inventoryUnit: inv?.unit || itemInput.unit,
      inventoryCostPerUnitPaise: inv?.costPerUnitPaise || 0,
      packagingCostPaise: 0,
      directPrepCostPaise: 0,
      ...itemInput,
    };

    const idx = this.recipeItems.findIndex((r) => r.id === newItem.id);
    if (idx !== -1) {
      this.recipeItems[idx] = newItem;
    } else {
      this.recipeItems.push(newItem);
    }
    this.saveRecipes();
    upsertSupabaseRecipeItem(newItem).catch(() => {});
    return newItem;
  }

  async deleteRecipeItem(id: string): Promise<void> {
    this.recipeItems = this.recipeItems.filter((r) => r.id !== id);
    this.saveRecipes();
    deleteSupabaseRecipeItem(id).catch(() => {});
  }

  async getFoodCostingSummaries(outletId: string): Promise<FoodCostingSummary[]> {
    return this.menuItems.map((item) => {
      const recipes = this.recipeItems.filter((r) => r.menuItemId === item.id);
      let ingredientCostPaise = 0;
      let packagingCostPaise = 0;
      let directPrepCostPaise = 0;

      for (const r of recipes) {
        const inv = this.inventory.find((i) => i.id === r.inventoryItemId);
        const unitCost = inv?.costPerUnitPaise ?? r.inventoryCostPerUnitPaise ?? 0;
        const invUnit = inv?.unit ?? r.inventoryUnit ?? r.unit;
        ingredientCostPaise += calculateIngredientCost(r.quantity, r.unit, invUnit, unitCost);
        if (r.packagingCostPaise) packagingCostPaise += r.packagingCostPaise;
        if (r.directPrepCostPaise) directPrepCostPaise += r.directPrepCostPaise;
      }

      const additionalCostPaise = packagingCostPaise + directPrepCostPaise;
      const totalEstimatedCostPaise = ingredientCostPaise + additionalCostPaise;
      const sellingPricePaise = item.basePricePaise;
      const isComplete = recipes.length > 0;
      const contributionPaise = isComplete ? sellingPricePaise - totalEstimatedCostPaise : 0;
      const contributionMarginPct =
        isComplete && sellingPricePaise > 0
          ? Math.round((contributionPaise / sellingPricePaise) * 1000) / 10
          : 0;

      return {
        menuItemId: item.id,
        dishName: item.name,
        sellingPricePaise,
        ingredientCostPaise,
        additionalCostPaise,
        totalEstimatedCostPaise,
        contributionPaise,
        contributionMarginPct,
        isComplete,
        ingredientCount: recipes.length,
      };
    });
  }

  // Dining Sections
  async getDiningSections(outletId: string): Promise<DiningSection[]> {
    let sections = this.diningSections.filter((s) => isMatchingOutlet(s.outletId, outletId));

    if (sections.length === 0) {
      const storedSecs = localStorage.getItem(this.getStorageKey('sections'));
      if (storedSecs) {
        try {
          const parsed = JSON.parse(storedSecs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const restored = parsed.filter((s: DiningSection) => isMatchingOutlet(s.outletId, outletId));
            if (restored.length > 0) {
              const other = this.diningSections.filter((s) => !isMatchingOutlet(s.outletId, outletId));
              this.diningSections = [...other, ...restored];
              sections = restored;
            }
          }
        } catch {}
      }
    }

    if (sections.length === 0) {
      const defaultSec: DiningSection = {
        id: `sec-default-${Date.now()}`,
        outletId,
        name: 'Main Dining',
        sortOrder: 1,
      };
      this.diningSections.push(defaultSec);
      this.saveSections();
      sections = [defaultSec];
      upsertSupabaseSection(defaultSec).catch(() => {});
    }

    return sections;
  }

  async saveDiningSection(
    sectionInput: Partial<DiningSection> & { name: string; outletId: string }
  ): Promise<DiningSection> {
    if (sectionInput.id) {
      const idx = this.diningSections.findIndex((s) => s.id === sectionInput.id);
      if (idx !== -1) {
        this.diningSections[idx] = { ...this.diningSections[idx], ...sectionInput };
        this.saveSections();
        this.notifyChange();
        try {
          const remote = await upsertSupabaseSection(this.diningSections[idx]);
          if (remote && remote.id) {
            this.diningSections[idx] = remote;
            this.saveSections();
          }
        } catch (e) {
          console.warn('Error saving section to Supabase:', e);
        }
        return this.diningSections[idx];
      }
    }
    const newSection: DiningSection = {
      id: `sec-${Date.now()}`,
      sortOrder: this.diningSections.length + 1,
      ...sectionInput,
    };
    this.diningSections.push(newSection);
    this.saveSections();
    this.notifyChange();

    try {
      const remote = await upsertSupabaseSection(newSection);
      if (remote && remote.id) {
        const idx = this.diningSections.findIndex((s) => s.id === newSection.id);
        if (idx !== -1) {
          this.diningSections[idx] = remote;
          this.saveSections();
        }
        return remote;
      }
    } catch (e) {
      console.warn('Error saving new section to Supabase:', e);
    }
    return newSection;
  }

  async deleteDiningSection(id: string): Promise<void> {
    const section = this.diningSections.find((s) => s.id === id);
    if (!section) return;

    const hasTables = this.tables.some((t) => t.section === section.name || t.sectionId === id);
    if (hasTables) {
      throw new Error(`Cannot delete section "${section.name}" because tables are currently assigned to it.`);
    }

    this.diningSections = this.diningSections.filter((s) => s.id !== id);
    this.saveSections();
    this.notifyChange();
    deleteSupabaseSection(id).catch(() => {});
  }

  // Dining Tables & Floor Plan
  async getTables(outletId: string): Promise<DiningTable[]> {
    let tablesForOutlet = this.tables.filter((t) => isMatchingOutlet(t.outletId, outletId) && t.isActive !== false);

    // If memory is empty for this outlet, try localStorage first
    if (tablesForOutlet.length === 0) {
      const stored = localStorage.getItem(this.getStorageKey('tables'));
      if (stored) {
        try {
          const parsed: DiningTable[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const otherTables = this.tables.filter((t) => !isMatchingOutlet(t.outletId, outletId));
            const restoredTables = parsed.filter((t) => isMatchingOutlet(t.outletId, outletId));
            if (restoredTables.length > 0) {
              this.tables = [...otherTables, ...restoredTables];
              tablesForOutlet = restoredTables.filter((t) => t.isActive !== false);
            }
          }
        } catch {}
      }
    }

    const isSpiceGarden =
      this.restaurant.id === 'e7b1a0e1-0000-4000-8000-000000000001' ||
      this.currentTenantId === 'e7b1a0e1-0000-4000-8000-000000000001';

    if (tablesForOutlet.length === 0) {
      if (isSpiceGarden) {
        const spiceTables = mockTables.map((t) => ({ ...t, outletId }));
        this.tables.push(...spiceTables);
        this.saveTables();
        tablesForOutlet = spiceTables;
      } else {
        // Auto-provision default starter tables (T1 - T6) so tables NEVER disappear or show blank
        const starterTables: DiningTable[] = [
          { id: `tbl-${Date.now()}-1`, outletId, tableNumber: 'T1', seatingCapacity: 2, status: 'available', section: 'Main Dining', posX: 100, posY: 100, shape: 'square', isActive: true },
          { id: `tbl-${Date.now()}-2`, outletId, tableNumber: 'T2', seatingCapacity: 4, status: 'available', section: 'Main Dining', posX: 260, posY: 100, shape: 'square', isActive: true },
          { id: `tbl-${Date.now()}-3`, outletId, tableNumber: 'T3', seatingCapacity: 4, status: 'available', section: 'Main Dining', posX: 420, posY: 100, shape: 'square', isActive: true },
          { id: `tbl-${Date.now()}-4`, outletId, tableNumber: 'T4', seatingCapacity: 6, status: 'available', section: 'Main Dining', posX: 100, posY: 260, shape: 'rectangle', isActive: true },
          { id: `tbl-${Date.now()}-5`, outletId, tableNumber: 'T5', seatingCapacity: 4, status: 'available', section: 'Main Dining', posX: 260, posY: 260, shape: 'square', isActive: true },
          { id: `tbl-${Date.now()}-6`, outletId, tableNumber: 'T6', seatingCapacity: 4, status: 'available', section: 'Main Dining', posX: 420, posY: 260, shape: 'round', isActive: true },
        ];
        this.tables.push(...starterTables);
        this.saveTables();
        tablesForOutlet = starterTables;

        // Persist starter tables to Supabase asynchronously
        Promise.all(starterTables.map((tbl) => upsertSupabaseTable(tbl))).catch((err) =>
          console.warn('Could not sync starter tables to Supabase:', err)
        );
      }
    }

    // Authoritative reconciliation: find all active running orders for this table
    return tablesForOutlet.map((t) => {
      const activeOrders = this.orders.filter(
        (o) => o.tableId === t.id && o.status !== 'completed' && o.status !== 'cancelled'
      );
      if (activeOrders.length > 0) {
        const primaryOrder = activeOrders[0];
        return {
          ...t,
          status: 'occupied',
          currentOrderId: primaryOrder.id,
          guestCount: primaryOrder.guestCount || t.guestCount || t.seatingCapacity,
        };
      }
      if (t.status === 'occupied') {
        return {
          ...t,
          status: 'available',
          currentOrderId: undefined,
        };
      }
      return t;
    });
  }

  async getActiveOrdersForTable(tableId: string): Promise<Order[]> {
    return this.orders.filter(
      (o) => o.tableId === tableId && o.status !== 'completed' && o.status !== 'cancelled'
    );
  }

  async saveTable(
    tableInput: Partial<DiningTable> & { tableNumber: string; outletId: string; seatingCapacity: number; section: string }
  ): Promise<DiningTable> {
    if (tableInput.id) {
      const idx = this.tables.findIndex((t) => t.id === tableInput.id);
      if (idx !== -1) {
        this.tables[idx] = {
          ...this.tables[idx],
          ...tableInput,
        };
        this.saveTables();
        this.notifyChange();
        try {
          const remote = await upsertSupabaseTable(this.tables[idx]);
          if (remote && remote.id) {
            this.tables[idx] = { ...this.tables[idx], id: remote.id, sectionId: remote.sectionId };
            this.saveTables();
          }
        } catch (e) {
          console.warn('Failed to upsert table to Supabase:', e);
        }
        return this.tables[idx];
      }
    }

    const newTable: DiningTable = {
      id: `tbl-${Date.now()}`,
      status: 'available',
      shape: tableInput.shape || 'square',
      posX: tableInput.posX ?? 50,
      posY: tableInput.posY ?? 50,
      isActive: true,
      ...tableInput,
      tableNumber: tableInput.tableNumber,
      outletId: tableInput.outletId,
      seatingCapacity: tableInput.seatingCapacity,
      section: tableInput.section,
    };

    this.tables.push(newTable);
    this.saveTables();
    this.notifyChange();

    try {
      const remote = await upsertSupabaseTable(newTable);
      if (remote && remote.id) {
        const idx = this.tables.findIndex((t) => t.id === newTable.id || t.tableNumber === newTable.tableNumber);
        if (idx !== -1) {
          this.tables[idx] = { ...this.tables[idx], id: remote.id, sectionId: remote.sectionId };
          this.saveTables();
        }
        return remote;
      }
    } catch (e) {
      console.warn('Failed to upsert new table to Supabase:', e);
    }
    return newTable;
  }

  async deleteTable(id: string): Promise<void> {
    const table = this.tables.find((t) => t.id === id);
    if (!table) return;

    const hasActiveOrder = this.orders.some(
      (o) => o.tableId === id && o.status !== 'completed' && o.status !== 'cancelled'
    );
    if (hasActiveOrder) {
      throw new Error(
        'Cannot delete an active table with running orders! Please complete, cancel, or transfer the order first.'
      );
    }

    this.tables = this.tables.filter((t) => t.id !== id);
    this.saveTables();
    this.notifyChange();
    deleteSupabaseTable(id).catch(() => {});
  }

  async saveTableLayout(
    layout: { id: string; posX: number; posY: number; shape?: 'square' | 'round' | 'rectangle' }[]
  ): Promise<void> {
    for (const item of layout) {
      const idx = this.tables.findIndex((t) => t.id === item.id);
      if (idx !== -1) {
        this.tables[idx] = {
          ...this.tables[idx],
          posX: item.posX,
          posY: item.posY,
          shape: item.shape || this.tables[idx].shape || 'square',
        };
        upsertSupabaseTable(this.tables[idx]).catch(() => {});
      }
    }
    this.saveTables();
    this.notifyChange();
  }

  async updateTableStatus(tableId: string, status: DiningTable['status'], orderId?: string): Promise<DiningTable> {
    const tableIndex = this.tables.findIndex((t) => t.id === tableId);
    if (tableIndex === -1) throw new Error('Table not found');

    this.tables[tableIndex] = {
      ...this.tables[tableIndex],
      status,
      currentOrderId: orderId !== undefined ? orderId : this.tables[tableIndex].currentOrderId,
    };
    this.saveTables();
    this.notifyChange();
    return this.tables[tableIndex];
  }

  // Orders Lifecycle
  async getOrders(outletId: string): Promise<Order[]> {
    this.rehydrateFromStorage();
    return this.orders.filter((o) => isSameOutlet(o.outletId, outletId));
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    return this.orders.find((o) => o.id === orderId) || null;
  }

  async createOrder(
    orderInput: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> & { orderNumber?: string }
  ): Promise<Order> {
    const nextCounter = this.orders.length + 109;
    const isCryptoUuidAvailable = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    const newOrder: Order = {
      ...orderInput,
      id: isCryptoUuidAvailable ? crypto.randomUUID() : `ord-${Date.now()}`,
      orderNumber: orderInput.orderNumber || `#${nextCounter}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elapsedMinutes: 0,
    };

    this.orders.unshift(newOrder);
    this.saveOrders();

    if (newOrder.tableId) {
      await this.updateTableStatus(newOrder.tableId, 'occupied', newOrder.id);
    }

    await this.recordAuditLog({
      action: 'CREATE_ORDER',
      entityType: 'order',
      entityId: newOrder.id,
      details: { orderNumber: newOrder.orderNumber, total: newOrder.totalPaise, table: newOrder.tableName },
      actor: 'Staff',
    });

    syncOrderToSupabase(newOrder);

    return newOrder;
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    this.orders[idx] = {
      ...this.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveOrders();
    this.notifyChange();
    syncOrderToSupabase(this.orders[idx]).catch(() => {});
    return this.orders[idx];
  }

  async addItemsToOrder(orderId: string, newItems: Order['items']): Promise<Order> {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const existingOrder = this.orders[idx];
    const mergedItems = [...existingOrder.items];

    for (const newItem of newItems) {
      // Find an existing item that is still pending KOT submission (not yet sent to kitchen)
      const pendingItemIndex = mergedItems.findIndex(
        (i) =>
          i.menuItem.id === newItem.menuItem.id &&
          i.variant?.id === newItem.variant?.id &&
          (i.kotStatus === 'pending' || !i.kotStatus) &&
          (i.notes || '') === (newItem.notes || '')
      );

      if (pendingItemIndex > -1) {
        const current = mergedItems[pendingItemIndex];
        const updatedQty = current.quantity + newItem.quantity;
        mergedItems[pendingItemIndex] = {
          ...current,
          quantity: updatedQty,
          subtotalPaise: updatedQty * current.unitPricePaise,
          kotStatus: 'pending',
        };
      } else {
        // Appends as new item with kotStatus = 'pending' for incremental KOT ticketing
        mergedItems.push({
          ...newItem,
          cartItemId: newItem.cartItemId || `ci-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          kotStatus: 'pending',
          kitchenStatus: 'new',
        });
      }
    }

    // Recalculate totals
    const subtotalPaise = mergedItems.reduce((acc, i) => acc + i.subtotalPaise, 0);
    const calc = calculateBill(
      subtotalPaise,
      existingOrder.discountPaise,
      this.restaurant.settings.cgstPct,
      this.restaurant.settings.sgstPct
    );

    this.orders[idx] = {
      ...existingOrder,
      items: mergedItems,
      subtotalPaise,
      cgstPaise: calc.cgstPaise,
      sgstPaise: calc.sgstPaise,
      roundingPaise: calc.roundingPaise,
      totalPaise: calc.totalPaise,
      updatedAt: new Date().toISOString(),
    };

    this.saveOrders();
    await this.recordAuditLog({
      action: 'ADD_ITEMS_TO_ORDER',
      entityType: 'order',
      entityId: orderId,
      details: { orderNumber: existingOrder.orderNumber, addedCount: newItems.length },
      actor: 'Staff',
    });

    return this.orders[idx];
  }

  async updateOrderItemQty(orderId: string, cartItemId: string, delta: number): Promise<Order> {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = this.orders[idx];
    const itemIndex = order.items.findIndex((i) => i.cartItemId === cartItemId);
    if (itemIndex === -1) throw new Error('Item not found in order');

    const item = order.items[itemIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      order.items.splice(itemIndex, 1);
    } else {
      order.items[itemIndex] = {
        ...item,
        quantity: newQty,
        subtotalPaise: newQty * item.unitPricePaise,
      };
    }

    // Recalculate totals
    const subtotalPaise = order.items.reduce((acc, i) => acc + i.subtotalPaise, 0);
    const calc = calculateBill(
      subtotalPaise,
      order.discountPaise,
      this.restaurant.settings.cgstPct,
      this.restaurant.settings.sgstPct
    );

    order.subtotalPaise = subtotalPaise;
    order.cgstPaise = calc.cgstPaise;
    order.sgstPaise = calc.sgstPaise;
    order.roundingPaise = calc.roundingPaise;
    order.totalPaise = calc.totalPaise;
    order.updatedAt = new Date().toISOString();

    this.saveOrders();
    return order;
  }

  async removeOrderItem(orderId: string, cartItemId: string): Promise<Order> {
    return this.updateOrderItemQty(orderId, cartItemId, -9999);
  }

  // Incremental Kitchen Station Routing & KOT Submission
  async submitOrderKOT(orderId: string, specificCartItemIds?: string[]): Promise<KOTTicket[]> {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = this.orders[idx];
    const createdTickets: KOTTicket[] = [];

    // Identify pending items to fire
    const itemsToFire = order.items.filter((item) => {
      if (specificCartItemIds && specificCartItemIds.length > 0) {
        return specificCartItemIds.includes(item.cartItemId) && item.kotStatus !== 'sent';
      }
      return item.kotStatus !== 'sent';
    });

    if (itemsToFire.length === 0) {
      return [];
    }

    const defaultStation =
      this.kitchenStations.find((s) => s.isDefault && s.isActive) ||
      this.kitchenStations[0] || {
        id: 'station-main',
        restaurantId: order.restaurantId,
        outletId: order.outletId,
        name: 'Main Kitchen',
        code: 'MAIN',
        isDefault: true,
        isActive: true,
      };

    // Determine if this is the first ticket for the order
    const existingOrderTickets = this.kotTickets.filter((t) => t.orderId === orderId);
    const isFirstTicketForOrder = existingOrderTickets.length === 0;

    // Group items by station
    const stationGroups = new Map<string, { station: KitchenStation; items: CartItem[] }>();

    for (const item of itemsToFire) {
      const station =
        (item.menuItem.stationId && this.kitchenStations.find((s) => s.id === item.menuItem.stationId && s.isActive)) ||
        defaultStation;

      if (!stationGroups.has(station.id)) {
        stationGroups.set(station.id, { station, items: [] });
      }

      // Mark item with station info
      item.stationId = station.id;
      item.stationName = station.name;
      item.kotStatus = 'sent';
      item.kitchenStatus = 'new';
      item.sentToKitchenAt = new Date().toISOString();

      stationGroups.get(station.id)!.items.push(item);
    }

    // Generate KOT tickets per station
    for (const [stationId, group] of stationGroups.entries()) {
      const existingStationTickets = existingOrderTickets.filter((t) => t.stationId === stationId);
      const ticketSeq = existingStationTickets.length + 1;
      const kotNumber = `${order.orderNumber}-${group.station.code}-${ticketSeq}`;

      // Stamp items with KOT number
      for (const item of group.items) {
        item.kotNumber = kotNumber;
      }

      const isCryptoUuidAvailable = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
      const ticket: KOTTicket = {
        id: isCryptoUuidAvailable ? crypto.randomUUID() : `kot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        outletId: order.outletId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableName || 'Table',
        kotNumber,
        stationId: group.station.id,
        stationName: group.station.name,
        ticketType: isFirstTicketForOrder && ticketSeq === 1 ? 'new' : 'incremental',
        items: group.items,
        status: 'sent',
        createdAt: new Date().toISOString(),
      };

      this.kotTickets.unshift(ticket);
      createdTickets.push(ticket);
    }

    // Update order status if it was draft
    if (order.status === 'draft') {
      order.status = 'confirmed';
    }
    order.updatedAt = new Date().toISOString();

    this.saveOrders();
    this.saveKotTickets();
    this.notifyChange();

    // Instant zero-latency cross-tab and cross-device sync to Kitchen KDS
    postCrossTabEvent({
      type: 'NEW_KOT_TICKETS',
      outletId: order.outletId,
      tickets: createdTickets,
      orderId,
    });
    broadcastOperationalEvent(order.outletId, 'new_kot', {
      tickets: createdTickets,
      orderId,
      outletId: order.outletId,
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('restohub:new-kot-ticket', {
          detail: { tickets: createdTickets, orderId, outletId: order.outletId },
        })
      );
      window.dispatchEvent(new CustomEvent('restohub:operational-change'));
    }

    // Persist to Supabase kot_tickets table
    syncKotTicketsToSupabase(createdTickets).catch(() => {});

    await this.recordAuditLog({
      action: 'FIRE_KOT_TICKETS',
      entityType: 'kot_tickets',
      entityId: orderId,
      details: {
        orderNumber: order.orderNumber,
        ticketsCount: createdTickets.length,
        tickets: createdTickets.map((t) => ({ kotNumber: t.kotNumber, station: t.stationName })),
      },
      actor: 'Staff',
    });

    return createdTickets;
  }

  // Kitchen Stations
  async getKitchenStations(outletId?: string): Promise<KitchenStation[]> {
    if (outletId) {
      return this.kitchenStations.filter((s) => s.outletId === outletId);
    }
    return this.kitchenStations;
  }

  async saveKitchenStation(
    stationInput: Partial<KitchenStation> & { name: string; code: string; restaurantId?: string; outletId?: string }
  ): Promise<KitchenStation> {
    if (stationInput.id) {
      const idx = this.kitchenStations.findIndex((s) => s.id === stationInput.id);
      if (idx !== -1) {
        this.kitchenStations[idx] = {
          ...this.kitchenStations[idx],
          ...stationInput,
        };
        this.saveStations();
        return this.kitchenStations[idx];
      }
    }

    const newStation: KitchenStation = {
      id: `station-${Date.now()}`,
      restaurantId: stationInput.restaurantId || 'rest-001',
      outletId: stationInput.outletId || 'outlet-blr-01',
      name: stationInput.name,
      code: stationInput.code.toUpperCase(),
      isDefault: stationInput.isDefault || false,
      printerName: stationInput.printerName,
      isActive: stationInput.isActive !== undefined ? stationInput.isActive : true,
    };

    if (newStation.isDefault) {
      this.kitchenStations.forEach((s) => (s.isDefault = false));
    }

    this.kitchenStations.push(newStation);
    this.saveStations();
    return newStation;
  }

  async deleteKitchenStation(id: string): Promise<void> {
    this.kitchenStations = this.kitchenStations.filter((s) => s.id !== id);
    this.saveStations();
  }

  async getKotTickets(outletId?: string, stationId?: string): Promise<KOTTicket[]> {
    this.rehydrateFromStorage();
    if (outletId) {
      try {
        const remoteKots = await fetchSupabaseKotTickets(outletId);
        if (remoteKots && remoteKots.length > 0) {
          this.mergeKotTickets(remoteKots);
        }
      } catch (err) {
        console.warn('Network sync of KOT tickets skipped:', err);
      }
    }
    return this.kotTickets.filter((t) => {
      const matchOutlet = !outletId || isSameOutlet(t.outletId, outletId);
      const matchStation = !stationId || stationId === 'all' || t.stationId === stationId;
      return matchOutlet && matchStation;
    });
  }

  async updateKotTicketStatus(
    ticketId: string,
    status: 'sent' | 'preparing' | 'ready' | 'served',
    kitchenUser?: string
  ): Promise<KOTTicket> {
    const idx = this.kotTickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) throw new Error('KOT ticket not found');

    const currentTicket = this.kotTickets[idx];
    // Idempotent: prevent duplicate transitions
    if (currentTicket.status === status) {
      return currentTicket;
    }

    const now = new Date().toISOString();
    const actor = kitchenUser || 'Chef Suresh';

    this.kotTickets[idx] = {
      ...currentTicket,
      status,
      ...(status === 'ready' ? { readyAt: now, readyBy: actor } : {}),
      ...(status === 'served' ? { servedAt: now, servedBy: actor } : {}),
    };
    this.saveKotTickets();

    // Sync ticket status to Supabase and broadcast operational event
    updateKotTicketStatusInSupabase(currentTicket.id, status).catch(() => {});
    broadcastOperationalEvent(currentTicket.outletId, 'ticket_status', {
      ticketId: currentTicket.id,
      status,
      orderId: currentTicket.orderId,
      outletId: currentTicket.outletId,
    }).catch(() => {});

    // Sync order items kitchen status
    const ticket = this.kotTickets[idx];
    const orderIdx = this.orders.findIndex((o) => o.id === ticket.orderId);
    if (orderIdx !== -1) {
      const order = this.orders[orderIdx];
      const itemCartIds = ticket.items.map((i) => i.cartItemId);
      order.items = order.items.map((i) => {
        if (itemCartIds.includes(i.cartItemId)) {
          return {
            ...i,
            kitchenStatus: status === 'sent' ? 'new' : status,
            ...(status === 'ready' ? { readyAt: now, readyBy: actor } : {}),
            ...(status === 'served' ? { servedAt: now, servedBy: actor } : {}),
          };
        }
        return i;
      });

      // Update order overall status if all items ready or served
      const allReadyOrServed = order.items.every(
        (i) => i.kitchenStatus === 'ready' || i.kitchenStatus === 'served'
      );
      if (allReadyOrServed && order.status !== 'completed') {
        order.status = 'ready';
      } else if (status === 'preparing' && order.status === 'confirmed') {
        order.status = 'preparing';
      }
      order.updatedAt = now;
      this.saveOrders();

      // Trigger notification when food becomes READY
      if (status === 'ready') {
        const table = this.tables.find((t) => t.id === order.tableId);
        const assignedWaiter = order.waiterName || table?.assignedWaiter || '';

        const notif: KitchenNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          outletId: ticket.outletId,
          restaurantId: order.restaurantId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableNumber: order.tableName || (table ? `Table ${table.tableNumber.replace('T', '')}` : undefined),
          orderType: order.orderType,
          waiterName: assignedWaiter,
          kitchenUser: actor,
          stationName: ticket.stationName,
          ticketId: ticket.id,
          kotNumber: ticket.kotNumber,
          notificationType: allReadyOrServed ? 'order_ready' : 'ticket_ready',
          isAllItemsReady: allReadyOrServed,
          items: ticket.items.map((i) => ({
            cartItemId: i.cartItemId,
            name: i.menuItem.name,
            quantity: i.quantity,
            variantName: i.variant?.name,
            notes: i.notes,
          })),
          message: allReadyOrServed
            ? 'Your entire order is ready to serve. Please serve it.'
            : `${ticket.items.length} item${ticket.items.length > 1 ? 's are' : ' is'} ready from ${ticket.stationName}. Please serve it.`,
          createdAt: now,
          read: false,
          served: false,
        };

        await this.createKitchenNotification(notif);
      }
    }

    return this.kotTickets[idx];
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error('Order not found');

    this.orders[index] = {
      ...this.orders[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    this.saveOrders();

    if ((status === 'completed' || status === 'cancelled') && this.orders[index].tableId) {
      const remainingOrders = this.orders.filter(
        (o) => o.id !== orderId && o.tableId === this.orders[index].tableId && o.status !== 'completed' && o.status !== 'cancelled'
      );
      if (remainingOrders.length === 0) {
        await this.updateTableStatus(this.orders[index].tableId!, 'available', undefined);
      } else {
        await this.updateTableStatus(this.orders[index].tableId!, 'occupied', remainingOrders[0].id);
      }
    }

    return this.orders[index];
  }

  async updateOrderItemKitchenStatus(
    orderId: string,
    cartItemId: string,
    status: Order['items'][0]['kitchenStatus'],
    kitchenUser?: string
  ): Promise<Order> {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found');

    const now = new Date().toISOString();
    const actor = kitchenUser || 'Chef Suresh';

    const currentItem = this.orders[orderIndex].items.find((i) => i.cartItemId === cartItemId);
    // Idempotent: prevent duplicate transition
    if (currentItem && currentItem.kitchenStatus === status) {
      return this.orders[orderIndex];
    }

    const updatedItems = this.orders[orderIndex].items.map((item) =>
      item.cartItemId === cartItemId
        ? {
            ...item,
            kitchenStatus: status,
            ...(status === 'ready' ? { readyAt: now, readyBy: actor } : {}),
            ...(status === 'served' ? { servedAt: now, servedBy: actor } : {}),
          }
        : item
    );

    const allReadyOrServed = updatedItems.every(
      (i) => i.kitchenStatus === 'ready' || i.kitchenStatus === 'served'
    );
    const orderStatus = allReadyOrServed ? 'ready' : this.orders[orderIndex].status;

    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      items: updatedItems,
      status: orderStatus,
      updatedAt: now,
    };
    this.saveOrders();

    // Trigger item-level notification when marked ready
    if (status === 'ready') {
      const order = this.orders[orderIndex];
      const targetItem = updatedItems.find((i) => i.cartItemId === cartItemId)!;
      const table = this.tables.find((t) => t.id === order.tableId);
      const assignedWaiter = order.waiterName || table?.assignedWaiter || '';

      const notif: KitchenNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        outletId: order.outletId,
        restaurantId: order.restaurantId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableName || (table ? `Table ${table.tableNumber.replace('T', '')}` : undefined),
        orderType: order.orderType,
        waiterName: assignedWaiter,
        kitchenUser: actor,
        stationName: targetItem.stationName || 'Kitchen',
        notificationType: allReadyOrServed ? 'order_ready' : 'item_ready',
        isAllItemsReady: allReadyOrServed,
        items: [
          {
            cartItemId: targetItem.cartItemId,
            name: targetItem.menuItem.name,
            quantity: targetItem.quantity,
            variantName: targetItem.variant?.name,
            notes: targetItem.notes,
          },
        ],
        message: allReadyOrServed
          ? 'Your order is ready. Please serve it.'
          : `${targetItem.quantity}× ${targetItem.menuItem.name} is ready. Please serve it.`,
        createdAt: now,
        read: false,
        served: false,
      };

      await this.createKitchenNotification(notif);
    }

    return this.orders[orderIndex];
  }

  // Kitchen-to-Waiter Notifications
  async getKitchenNotifications(outletId?: string, waiterName?: string): Promise<KitchenNotification[]> {
    return this.kitchenNotifications.filter((n) => {
      const matchOutlet = !outletId || n.outletId === outletId;
      const matchWaiter =
        !waiterName ||
        waiterName === 'all' ||
        n.waiterName === waiterName ||
        !n.waiterName ||
        n.waiterName === 'All Staff';
      return matchOutlet && matchWaiter;
    });
  }

  async createKitchenNotification(notification: KitchenNotification): Promise<KitchenNotification> {
    // Idempotency: prevent duplicates within a short window
    const isDuplicate = this.kitchenNotifications.some((n) => {
      if (n.id === notification.id) return true;
      if (
        n.orderId === notification.orderId &&
        n.notificationType === notification.notificationType &&
        n.items.length === notification.items.length &&
        n.items[0]?.cartItemId === notification.items[0]?.cartItemId &&
        Math.abs(new Date(n.createdAt).getTime() - new Date(notification.createdAt).getTime()) < 5000
      ) {
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      return notification;
    }

    this.kitchenNotifications.unshift(notification);
    if (this.kitchenNotifications.length > 200) {
      this.kitchenNotifications.pop();
    }
    this.saveNotifications();

    // Instant zero-latency cross-tab and cross-device sync to Waiters
    postCrossTabEvent({
      type: 'FOOD_READY',
      outletId: notification.outletId,
      notification,
    });
    broadcastOperationalEvent(notification.outletId, 'food_ready', notification).catch(() => {});

    // Persist to Supabase
    syncKitchenNotificationToSupabase(notification).catch(() => {});

    // Dispatch custom browser event for instant in-tab & cross-component awareness
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('restohub:food-ready-notification', { detail: notification })
      );
    }

    return notification;
  }

  async markKitchenNotificationRead(id: string): Promise<KitchenNotification> {
    const idx = this.kitchenNotifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notification not found');

    this.kitchenNotifications[idx] = {
      ...this.kitchenNotifications[idx],
      read: true,
    };
    this.saveNotifications();
    updateKitchenNotificationInSupabase(id, { read: true }).catch(() => {});
    return this.kitchenNotifications[idx];
  }

  async markKitchenNotificationServed(
    id: string,
    servedBy?: string
  ): Promise<{ notification: KitchenNotification; order?: Order }> {
    const idx = this.kitchenNotifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notification not found');

    const notif = this.kitchenNotifications[idx];
    if (notif.served) {
      const existingOrder = this.orders.find((o) => o.id === notif.orderId);
      return { notification: notif, order: existingOrder };
    }

    const now = new Date().toISOString();
    const serverName = servedBy || 'Staff';

    this.kitchenNotifications[idx] = {
      ...notif,
      served: true,
      servedAt: now,
      servedBy: serverName,
      read: true,
    };
    this.saveNotifications();

    // Instant sync to update across tabs & devices
    postCrossTabEvent({
      type: 'NOTIFICATION_SERVED',
      outletId: notif.outletId,
      notificationId: id,
    });
    broadcastOperationalEvent(notif.outletId, 'order_updated', { notificationId: id }).catch(() => {});

    updateKitchenNotificationInSupabase(id, {
      served: true,
      servedAt: now,
      servedBy: serverName,
      read: true,
    }).catch(() => {});

    // Update KOT ticket if applicable
    if (notif.ticketId) {
      const tIdx = this.kotTickets.findIndex((t) => t.id === notif.ticketId);
      if (tIdx !== -1) {
        this.kotTickets[tIdx] = {
          ...this.kotTickets[tIdx],
          status: 'served',
          servedAt: now,
          servedBy: serverName,
        };
        this.saveKotTickets();
      }
    }

    // Update order items
    let updatedOrder: Order | undefined;
    const orderIdx = this.orders.findIndex((o) => o.id === notif.orderId);
    if (orderIdx !== -1) {
      const order = this.orders[orderIdx];
      const targetCartIds = notif.items.map((i) => i.cartItemId);

      order.items = order.items.map((it) => {
        if (targetCartIds.includes(it.cartItemId)) {
          return {
            ...it,
            kitchenStatus: 'served',
            servedAt: now,
            servedBy: serverName,
          };
        }
        return it;
      });

      const allItemsServed = order.items.every((it) => it.kitchenStatus === 'served');
      if (allItemsServed && order.status !== 'completed') {
        order.status = 'served';
      }
      order.updatedAt = now;
      this.saveOrders();
      updatedOrder = order;

      await this.recordAuditLog({
        action: 'MARK_SERVED',
        entityType: 'order',
        entityId: order.id,
        details: {
          orderNumber: order.orderNumber,
          notificationId: notif.id,
          servedItems: notif.items.map((i) => i.name),
          servedBy: serverName,
        },
        actor: serverName,
      });
    }

    return { notification: this.kitchenNotifications[idx], order: updatedOrder };
  }

  async reconcileKitchenNotifications(outletId: string): Promise<void> {
    try {
      const remoteNotifs = await fetchKitchenNotificationsFromSupabase(outletId);
      if (remoteNotifs && remoteNotifs.length > 0) {
        let changed = false;
        for (const rem of remoteNotifs) {
          const localIdx = this.kitchenNotifications.findIndex((l) => l.id === rem.id);
          if (localIdx === -1) {
            this.kitchenNotifications.push(rem);
            changed = true;
          } else {
            // Reconcile read or served state if updated remotely
            if (rem.served && !this.kitchenNotifications[localIdx].served) {
              this.kitchenNotifications[localIdx] = rem;
              changed = true;
            }
          }
        }
        if (changed) {
          this.kitchenNotifications.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.saveNotifications();
        }
      }
    } catch (err) {
      console.warn('Reconcile notifications fallback:', err);
    }
  }

  async recordPayment(
    orderId: string,
    paymentMethod: Order['paymentMethod'],
    reference?: string,
    amountPaise?: number
  ): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error('Order not found');

    const order = this.orders[index];
    const prevPaid = order.paidAmountPaise || (order.paymentStatus === 'paid' ? order.totalPaise : 0);
    const payingAmount = amountPaise !== undefined ? amountPaise : Math.max(0, order.totalPaise - prevPaid);
    const newPaidTotal = prevPaid + payingAmount;
    const isFullPayment = newPaidTotal >= order.totalPaise;

    this.orders[index] = {
      ...order,
      paidAmountPaise: newPaidTotal,
      paymentStatus: isFullPayment ? 'paid' : 'partially_paid',
      paymentMethod,
      paymentReference: reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      updatedAt: new Date().toISOString(),
    };
    this.saveOrders();

    await this.recordAuditLog({
      action: 'RECORD_PAYMENT',
      entityType: 'payment',
      entityId: orderId,
      details: { amount: payingAmount, totalPaid: newPaidTotal, method: paymentMethod, ref: reference },
      actor: 'Cashier',
    });

    syncPaymentToSupabase(this.orders[index], paymentMethod, payingAmount, reference);

    return this.orders[index];
  }

  async transferTableOrder(
    fromTableId: string,
    toTableId: string,
    orderId: string
  ): Promise<{ success: boolean; message: string }> {
    const fromTable = this.tables.find((t) => t.id === fromTableId);
    const toTable = this.tables.find((t) => t.id === toTableId);
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);

    if (!fromTable || !toTable || orderIndex === -1) {
      throw new Error('Could not find source table, destination table, or running order for transfer.');
    }

    const toActiveOrder = this.orders.find(
      (o) => o.tableId === toTable.id && o.status !== 'completed' && o.status !== 'cancelled'
    );
    if (toActiveOrder) {
      throw new Error(
        `Destination table ${toTable.tableNumber} is already occupied by active order ${toActiveOrder.orderNumber}!`
      );
    }

    const order = this.orders[orderIndex];
    order.tableId = toTable.id;
    order.tableName = `Table ${toTable.tableNumber.replace('T', '')}`;
    order.updatedAt = new Date().toISOString();

    fromTable.status = 'available';
    fromTable.currentOrderId = undefined;

    toTable.status = 'occupied';
    toTable.currentOrderId = order.id;

    this.saveOrders();
    this.saveTables();

    await this.recordAuditLog({
      action: 'TRANSFER_TABLE_ORDER',
      entityType: 'order',
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        fromTable: fromTable.tableNumber,
        toTable: toTable.tableNumber,
      },
      actor: 'Staff',
    });

    return {
      success: true,
      message: `Order ${order.orderNumber} successfully transferred from Table ${fromTable.tableNumber} to Table ${toTable.tableNumber}.`,
    };
  }

  // Inventory & Movements
  async getInventory(outletId: string): Promise<InventoryItem[]> {
    return this.inventory.filter((i) => i.outletId === outletId);
  }

  async saveInventoryItem(
    itemInput: Partial<InventoryItem> & { name: string; unit: string; outletId: string }
  ): Promise<InventoryItem> {
    if (itemInput.id) {
      const idx = this.inventory.findIndex((i) => i.id === itemInput.id);
      if (idx !== -1) {
        this.inventory[idx] = { ...this.inventory[idx], ...itemInput };
        this.saveInventory();
        return this.inventory[idx];
      }
    }

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      outletId: itemInput.outletId,
      name: itemInput.name,
      category: itemInput.category || 'General',
      currentStock: itemInput.currentStock || 0,
      unit: itemInput.unit,
      minThreshold: itemInput.minThreshold || 5,
      costPerUnitPaise: itemInput.costPerUnitPaise || 0,
    };
    this.inventory.push(newItem);
    this.saveInventory();

    await this.recordStockMovement({
      itemId: newItem.id,
      movementType: 'purchase',
      quantityDelta: newItem.currentStock,
      reason: 'Opening stock entry',
    });

    return newItem;
  }

  async updateStock(itemId: string, newStock: number): Promise<InventoryItem> {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error('Inventory item not found');
    const oldStock = this.inventory[idx].currentStock;
    const delta = newStock - oldStock;
    this.inventory[idx].currentStock = Math.max(0, newStock);
    this.saveInventory();

    await this.recordStockMovement({
      itemId,
      movementType: delta >= 0 ? 'purchase' : 'wastage',
      quantityDelta: delta,
      reason: delta >= 0 ? 'Manual Restock Adjustment' : 'Manual Spoilage / Wastage',
    });

    return this.inventory[idx];
  }

  async recordStockMovement(
    movementInput: Omit<InventoryMovement, 'id' | 'createdAt'>
  ): Promise<InventoryMovement> {
    const movement: InventoryMovement = {
      ...movementInput,
      id: `mov-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.movements.unshift(movement);
    this.saveMovements();

    // Adjust item current stock
    const itemIdx = this.inventory.findIndex((i) => i.id === movementInput.itemId);
    if (itemIdx !== -1) {
      this.inventory[itemIdx].currentStock = Math.max(
        0,
        this.inventory[itemIdx].currentStock + movementInput.quantityDelta
      );
      this.saveInventory();
    }

    return movement;
  }

  async getStockMovements(itemId?: string): Promise<InventoryMovement[]> {
    if (itemId) {
      return this.movements.filter((m) => m.itemId === itemId);
    }
    return this.movements;
  }

  // Expenses & Day Closings
  async getExpenses(outletId: string): Promise<ExpenseRecord[]> {
    return this.expenses.filter((e) => e.outletId === outletId);
  }

  async addExpense(expenseInput: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord> {
    const record: ExpenseRecord = {
      ...expenseInput,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.expenses.unshift(record);
    this.saveExpenses();

    await this.recordAuditLog({
      action: 'ADD_EXPENSE',
      entityType: 'expense',
      entityId: record.id,
      details: { amount: record.amountPaise, category: record.category },
      actor: 'Staff',
    });

    syncExpenseToSupabase(record);

    return record;
  }

  async getDayClosings(outletId: string): Promise<DayClosingRecord[]> {
    return this.closings.filter((c) => c.outletId === outletId);
  }

  async recordDayClosing(
    closingInput: Omit<DayClosingRecord, 'id' | 'closedAt'>
  ): Promise<DayClosingRecord> {
    const record: DayClosingRecord = {
      ...closingInput,
      id: `close-${Date.now()}`,
      closedAt: new Date().toISOString(),
    };
    this.closings.unshift(record);
    this.saveClosings();

    await this.recordAuditLog({
      action: 'DAY_CLOSING',
      entityType: 'day_closing',
      entityId: record.id,
      details: {
        date: record.date,
        variance: record.cashVariancePaise,
        counted: record.countedCashPaise,
        expected: record.expectedCashPaise,
      },
      actor: 'Manager',
    });

    return record;
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return this.auditLogs;
  }

  async recordAuditLog(logInput: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const log: AuditLog = {
      ...logInput,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    this.saveAudit();
    return log;
  }
}

export const localRepository = new LocalDataRepository();

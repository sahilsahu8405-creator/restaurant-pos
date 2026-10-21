import {
  AuditLog,
  DayClosingRecord,
  DiningSection,
  DiningTable,
  ExpenseRecord,
  FoodCostingSummary,
  InventoryItem,
  InventoryMovement,
  KitchenNotification,
  KitchenStation,
  KOTTicket,
  MenuCategory,
  MenuItem,
  Order,
  RecipeItem,
  Restaurant,
  RestaurantSettings,
} from '../types';

export interface IDataAdapter {
  getRestaurant(): Promise<Restaurant>;
  updateRestaurantSettings(settings: Partial<RestaurantSettings>): Promise<RestaurantSettings>;
  
  // Menu Categories
  getCategories(): Promise<MenuCategory[]>;
  saveCategory(cat: Partial<MenuCategory> & { name: string; slug: string }): Promise<MenuCategory>;
  deleteCategory(id: string): Promise<void>;

  // Menu Items & Prices
  getMenuItems(categoryId?: string): Promise<MenuItem[]>;
  getMenuItemById(id: string): Promise<MenuItem | null>;
  saveMenuItem(item: Partial<MenuItem> & { name: string; basePricePaise: number; categoryId: string }): Promise<MenuItem>;
  toggleMenuItemAvailability(itemId: string, isAvailable: boolean): Promise<MenuItem>;
  deleteMenuItem(itemId: string): Promise<void>;
  uploadMenuImage(file: File): Promise<{ url: string }>;

  // Food Costing & Recipe Builder
  getRecipeItems(menuItemId: string): Promise<RecipeItem[]>;
  saveRecipeItem(item: Partial<RecipeItem> & { menuItemId: string; inventoryItemId: string; quantity: number; unit: string }): Promise<RecipeItem>;
  deleteRecipeItem(id: string): Promise<void>;
  getFoodCostingSummaries(outletId: string): Promise<FoodCostingSummary[]>;

  // Dining Sections & Floor Plan
  getDiningSections(outletId: string): Promise<DiningSection[]>;
  saveDiningSection(section: Partial<DiningSection> & { name: string; outletId: string }): Promise<DiningSection>;
  deleteDiningSection(id: string): Promise<void>;

  // Dining Tables & Floor Plan
  getTables(outletId: string): Promise<DiningTable[]>;
  saveTable(table: Partial<DiningTable> & { tableNumber: string; outletId: string; seatingCapacity: number; section: string }): Promise<DiningTable>;
  deleteTable(id: string): Promise<void>;
  saveTableLayout(layout: { id: string; posX: number; posY: number; shape?: 'square' | 'round' | 'rectangle' }[]): Promise<void>;
  updateTableStatus(tableId: string, status: DiningTable['status'], orderId?: string): Promise<DiningTable>;

  // Orders Lifecycle
  getOrders(outletId: string): Promise<Order[]>;
  getOrderById(orderId: string): Promise<Order | null>;
  createOrder(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> & { orderNumber?: string }): Promise<Order>;
  updateOrder?(orderId: string, updates: Partial<Order>): Promise<Order>;
  addItemsToOrder(orderId: string, newItems: Order['items']): Promise<Order>;
  updateOrderStatus(orderId: string, status: Order['status']): Promise<Order>;
  updateOrderItemKitchenStatus(orderId: string, cartItemId: string, status: Order['items'][0]['kitchenStatus']): Promise<Order>;
  recordPayment(orderId: string, paymentMethod: Order['paymentMethod'], reference?: string, amountPaise?: number): Promise<Order>;
  getActiveOrdersForTable?(tableId: string): Promise<Order[]>;
  transferTableOrder(fromTableId: string, toTableId: string, orderId: string): Promise<{ success: boolean; message: string }>;

  // Kitchen Stations & Routing
  getKitchenStations(outletId?: string): Promise<KitchenStation[]>;
  saveKitchenStation(station: Partial<KitchenStation> & { name: string; code: string }): Promise<KitchenStation>;
  deleteKitchenStation(id: string): Promise<void>;

  // KOT Tickets & Kitchen Display
  getKotTickets(outletId?: string, stationId?: string): Promise<KOTTicket[]>;
  submitOrderKOT(orderId: string, specificCartItemIds?: string[]): Promise<KOTTicket[]>;
  updateKotTicketStatus(ticketId: string, status: 'sent' | 'preparing' | 'ready' | 'served', kitchenUser?: string): Promise<KOTTicket>;
  mergeKotTickets(incoming: KOTTicket[]): void;
  rehydrateFromStorage(): void;

  // Kitchen-to-Waiter Food Ready Notifications
  getKitchenNotifications(outletId?: string, waiterName?: string): Promise<KitchenNotification[]>;
  createKitchenNotification(notification: KitchenNotification): Promise<KitchenNotification>;
  markKitchenNotificationRead(id: string): Promise<KitchenNotification | null>;
  markKitchenNotificationServed(id: string, servedBy?: string): Promise<{ notification: KitchenNotification; order?: Order }>;

  // Inventory & Stock Ledger
  getInventory(outletId: string): Promise<InventoryItem[]>;
  updateStock(itemId: string, newStock: number): Promise<InventoryItem>;
  saveInventoryItem(item: Partial<InventoryItem> & { name: string; unit: string; outletId: string }): Promise<InventoryItem>;
  recordStockMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement>;
  getStockMovements(itemId?: string): Promise<InventoryMovement[]>;

  // Operating Expenses & Day Closing
  getExpenses(outletId: string): Promise<ExpenseRecord[]>;
  addExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord>;
  getDayClosings(outletId: string): Promise<DayClosingRecord[]>;
  recordDayClosing(closing: Omit<DayClosingRecord, 'id' | 'closedAt'>): Promise<DayClosingRecord>;

  // Audit Ledger
  getAuditLogs(): Promise<AuditLog[]>;
  recordAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
}

// Domain Models and Type Definitions for RestoHub

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'AED';

export type FoodType = 'veg' | 'non_veg' | 'egg' | 'vegan';

export type DietaryType = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';

export type OrderType = 'dine_in' | 'takeaway' | 'counter' | 'delivery';

export type OrderStatus = 'draft' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export type KitchenStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'refunded';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split' | 'wallet';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'food_ready' | 'unavailable';

export type RoleType = 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'superadmin';

export type WorkspaceType = 'restaurant' | 'superadmin';

export interface UserProfile {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface RestaurantMembership {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  restaurantCode?: string;
  outletId?: string;
  outletName?: string;
  outletCode?: string;
  role: RoleType;
  isActive: boolean;
  createdAt: string;
  userProfile?: UserProfile;
  currency?: string;
  currencySymbol?: string;
  loginId?: string;
}

export interface StaffInvitation {
  id: string;
  restaurantId: string;
  restaurantCode?: string;
  outletId?: string;
  email: string;
  fullName: string;
  role: RoleType;
  loginId?: string;
  stationId?: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface KdsDeviceSession {
  id: string;
  restaurantId: string;
  outletId: string;
  stationId?: string;
  deviceName: string;
  pairingCode?: string;
  pairingCodeExpiresAt?: string;
  deviceToken?: string;
  isActive: boolean;
  lastSeenAt?: string;
  createdAt: string;
  outletName?: string;
  restaurantName?: string;
}

export interface KitchenStation {
  id: string;
  restaurantId: string;
  outletId: string;
  name: string;
  code: string;
  isDefault: boolean;
  printerName?: string;
  isActive: boolean;
}

export interface RestaurantSettings {
  id: string;
  restaurantId: string;
  enableKot: boolean;
  enableKds: boolean;
  enableTableManagement: boolean;
  enableInventory: boolean;
  enableCustomerCrm: boolean;
  cgstPct: number;
  sgstPct: number;
  invoicePrefix: string;
  kotPrefix: string;
  receiptFooter: string;
  currencySymbol: string;
  roundingRule: 'nearest_rupee' | 'exact_paise';
  operatingHours: string;
  primaryPhone: string;
  gstin: string;
  fssaiLicense: string;
  receiptPaperWidth?: '58mm' | '80mm' | 'a4';
  kotPaperWidth?: '58mm' | '80mm';
  printCopies?: number;
  // Direct printing configurations
  receiptPrinterName?: string;
  receiptConnectionType?: 'local_agent' | 'network_escpos' | 'web_serial' | 'browser';
  receiptEndpoint?: string;
  receiptCopies?: number;
  autoPrintReceipt?: boolean;
  kotPrinterName?: string;
  kotConnectionType?: 'local_agent' | 'network_escpos' | 'web_serial' | 'browser';
  kotEndpoint?: string;
  kotPaperWidthConfig?: '58mm' | '80mm';
  kotCopies?: number;
  autoPrintKot?: boolean;
  kotStation?: string;
  // Receipt Designer & Customization
  receiptConfig?: import('../utils/receiptConfig').ReceiptConfig;
  branchReceiptConfigs?: Record<string, Partial<import('../utils/receiptConfig').ReceiptConfig>>;
}

export type { ReceiptConfig } from '../utils/receiptConfig';

export type PrinterConnectionType = 'local_agent' | 'network_escpos' | 'web_serial' | 'browser';

export interface PrintResult {
  success: boolean;
  jobId: string;
  message: string;
  printerName: string;
  connectionType: PrinterConnectionType;
  isSilent: boolean;
  error?: string;
}

export interface DiningSection {
  id: string;
  outletId: string;
  name: string;
  sortOrder: number;
}

export interface Outlet {
  id: string;
  restaurantId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  gstin: string;
  fssaiLicense: string;
  isActive: boolean;
  operatingHours?: string;
  email?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  restaurantCode?: string;
  currency: CurrencyCode;
  currencySymbol: string;
  timezone: string;
  logoUrl?: string;
  businessEmail?: string;
  legalName?: string;
  gstin?: string;
  fssaiLicense?: string;
  primaryPhone?: string;
  operatingHours?: string;
  outlets: Outlet[];
  settings: RestaurantSettings;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuVariant {
  id: string;
  name: string; // e.g. Half, Full, Regular, Large
  pricePaise: number;
  isDefault?: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  pricePaise: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  foodType: FoodType;
  dietaryType?: DietaryType;
  stationId?: string; // e.g. 'station-tandoor', 'station-main', 'station-bar'
  basePricePaise: number; // Stored in paise (1 INR = 100 paise)
  isAvailable: boolean;
  isBestseller?: boolean;
  cgstPct: number; // e.g. 2.5
  sgstPct: number; // e.g. 2.5
  variants?: MenuVariant[];
  modifierGroups?: ModifierGroup[];
  sortOrder?: number;
}

export interface CartItemModifier {
  optionId: string;
  optionName: string;
  pricePaise: number;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  variant?: MenuVariant;
  selectedModifiers: CartItemModifier[];
  quantity: number;
  unitPricePaise: number;
  subtotalPaise: number;
  notes?: string;
  stationId?: string;
  stationName?: string;
  kitchenStatus?: KitchenStatus;
  kotStatus?: 'pending' | 'sent' | 'preparing' | 'ready' | 'served' | 'cancelled';
  kotNumber?: string;
  sentToKitchenAt?: string;
  readyAt?: string;
  readyBy?: string;
  servedAt?: string;
  servedBy?: string;
}

export interface KOTTicket {
  id: string;
  outletId: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  kotNumber: string;
  stationId: string;
  stationName: string;
  ticketType: 'new' | 'incremental' | 'correction' | 'cancel';
  items: CartItem[];
  status: 'sent' | 'preparing' | 'ready' | 'served';
  createdAt: string;
  readyAt?: string;
  readyBy?: string;
  servedAt?: string;
  servedBy?: string;
  waiterName?: string;
}

export interface DiningTable {
  id: string;
  outletId: string;
  section: string;
  sectionId?: string;
  tableNumber: string;
  seatingCapacity: number;
  status: TableStatus;
  shape?: 'square' | 'round' | 'rectangle';
  posX?: number;
  posY?: number;
  isActive?: boolean;
  guestCount?: number;
  currentOrderId?: string;
  orderDurationMinutes?: number;
  assignedWaiter?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  outletId: string;
  orderType: OrderType;
  tableId?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryInstructions?: string;
  guestCount: number;
  items: CartItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalPaise: number;
  discountPaise: number;
  discountDescription?: string;
  cgstPaise: number;
  sgstPaise: number;
  roundingPaise: number;
  totalPaise: number;
  paidAmountPaise?: number;
  waiterName?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  elapsedMinutes?: number;
}

export interface RecipeItem {
  id: string;
  restaurantId?: string;
  menuItemId: string;
  variantId?: string;
  inventoryItemId: string;
  inventoryItemName?: string;
  inventoryUnit?: string;
  inventoryCostPerUnitPaise?: number;
  quantity: number;
  unit: string;
  packagingCostPaise?: number;
  directPrepCostPaise?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodCostingSummary {
  menuItemId: string;
  dishName: string;
  sellingPricePaise: number;
  ingredientCostPaise: number;
  additionalCostPaise: number;
  totalEstimatedCostPaise: number;
  contributionPaise: number;
  contributionMarginPct: number;
  isComplete: boolean;
  ingredientCount: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  movementType: 'purchase' | 'wastage' | 'adjustment' | 'consumption';
  quantityDelta: number;
  reason: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  outletId: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minThreshold: number;
  costPerUnitPaise: number;
}

export interface ExpenseRecord {
  id: string;
  outletId: string;
  category: string;
  amountPaise: number;
  paymentMethod: PaymentMethod;
  description: string;
  date: string;
  createdAt: string;
}

export interface DayClosingRecord {
  id: string;
  outletId: string;
  date: string;
  openingCashPaise: number;
  cashSalesPaise: number;
  cashRefundsPaise: number;
  expectedCashPaise: number;
  countedCashPaise: number;
  cashVariancePaise: number;
  upiCollectedPaise: number;
  cardCollectedPaise: number;
  totalSalesPaise: number;
  totalOrders: number;
  notes: string;
  closedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  actor: string;
  createdAt: string;
}

export type NotificationType = 'item_ready' | 'order_ready' | 'ticket_ready';

export interface KitchenNotificationItem {
  cartItemId: string;
  name: string;
  quantity: number;
  variantName?: string;
  notes?: string;
}

export interface KitchenNotification {
  id: string;
  outletId: string;
  restaurantId: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  orderType: OrderType;
  waiterName?: string;
  kitchenUser?: string;
  stationName?: string;
  ticketId?: string;
  kotNumber?: string;
  notificationType: NotificationType;
  isAllItemsReady: boolean;
  items: KitchenNotificationItem[];
  message: string;
  createdAt: string;
  read: boolean;
  served: boolean;
  servedAt?: string;
  servedBy?: string;
}

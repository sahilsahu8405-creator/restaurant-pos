import { Order, Outlet, Restaurant, RestaurantSettings } from '../types';

export interface ReceiptConfig {
  // A. Business Identity
  customDisplayName?: string;
  showLogo: boolean;
  logoUrl?: string;
  showRestaurantName: boolean;
  showBranchName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showGstin: boolean;
  showFssai: boolean;

  // B. Receipt Header
  headerTitle?: string;
  subtitle?: string;
  welcomeMessage?: string;
  headerAlignment: 'left' | 'center' | 'right';
  logoAlignment: 'left' | 'center' | 'right';

  // C. Invoice Information
  showInvoiceNumber: boolean;
  showOrderNumber: boolean;
  showOrderDate: boolean;
  showOrderTime: boolean;
  showOrderType: boolean;
  showTableNumber: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;
  showCashierName: boolean;
  showWaiterName: boolean;

  // D. Item & Price Display
  showItemQuantity: boolean;
  showUnitPrice: boolean;
  showLineTotal: boolean;
  showModifiers: boolean;
  showItemNotes: boolean;
  showVariant: boolean;
  showDiscountDetails: boolean;
  showSubtotal: boolean;
  showRoundingAdjustment: boolean;
  showTaxBreakdown: boolean;
  showGrandTotal: boolean;

  // E. Tax & Payment Details
  showCgst: boolean;
  showSgst: boolean;
  showIgst: boolean;
  showPaymentMethod: boolean;
  showPaymentStatus: boolean;
  showAmountPaid: boolean;
  showBalanceDue: boolean;
  showChangeReturned: boolean;
  showPaymentReference: boolean;

  // F. Footer & Thank-You Message
  showFooter: boolean;
  thankYouMessage: string;
  footerParagraph?: string;
  website?: string;
  showWebsite: boolean;
  socialHandle?: string;
  showSocialHandle: boolean;
  returnVisitMessage?: string;
  showReturnVisitMessage: boolean;
  customDisclaimer?: string;
  showCustomDisclaimer: boolean;

  // G. Paper & Layout
  paperWidth: '58mm' | '80mm' | 'a4';
  fontScaling?: 'compact' | 'standard' | 'comfortable';
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  // Business Identity
  customDisplayName: '',
  showLogo: true,
  logoUrl: '',
  showRestaurantName: true,
  showBranchName: true,
  showAddress: true,
  showPhone: true,
  showEmail: false,
  showGstin: true,
  showFssai: true,

  // Header
  headerTitle: 'TAX INVOICE',
  subtitle: 'Fresh Food, Made with Care',
  welcomeMessage: '',
  headerAlignment: 'center',
  logoAlignment: 'center',

  // Invoice Info
  showInvoiceNumber: true,
  showOrderNumber: true,
  showOrderDate: true,
  showOrderTime: true,
  showOrderType: true,
  showTableNumber: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showCashierName: false,
  showWaiterName: true,

  // Item & Price
  showItemQuantity: true,
  showUnitPrice: true,
  showLineTotal: true,
  showModifiers: true,
  showItemNotes: true,
  showVariant: true,
  showDiscountDetails: true,
  showSubtotal: true,
  showRoundingAdjustment: true,
  showTaxBreakdown: true,
  showGrandTotal: true,

  // Tax & Payment
  showCgst: true,
  showSgst: true,
  showIgst: false,
  showPaymentMethod: true,
  showPaymentStatus: true,
  showAmountPaid: true,
  showBalanceDue: true,
  showChangeReturned: true,
  showPaymentReference: true,

  // Footer & Thank-You
  showFooter: true,
  thankYouMessage: 'Thank you for dining with us! Please visit again.',
  footerParagraph: 'We appreciate your visit. We hope you enjoyed your meal and look forward to serving you again.',
  website: 'www.restohub.io',
  showWebsite: false,
  socialHandle: '@restohub_pos',
  showSocialHandle: false,
  returnVisitMessage: 'Show this receipt on your next visit to receive 10% off your meal!',
  showReturnVisitMessage: false,
  customDisclaimer: '* This is a computer generated invoice and does not require a physical signature.',
  showCustomDisclaimer: true,

  // Paper & Layout
  paperWidth: '80mm',
  fontScaling: 'standard',
};

/**
 * Returns the effective receipt configuration for a given restaurant settings and optional outlet.
 * Merges defaults with restaurant-level configuration and branch-specific overrides.
 */
export function getEffectiveReceiptConfig(
  settings?: RestaurantSettings | null,
  outletId?: string
): ReceiptConfig {
  const base = { ...DEFAULT_RECEIPT_CONFIG };

  const restaurantConfig = (settings as any)?.receiptConfig || {};
  const branchOverrides =
    outletId && (settings as any)?.branchReceiptConfigs?.[outletId]
      ? (settings as any).branchReceiptConfigs[outletId]
      : {};

  const merged = {
    ...base,
    ...restaurantConfig,
    ...branchOverrides,
  };

  if (settings?.receiptPaperWidth) {
    merged.paperWidth = settings.receiptPaperWidth;
  }
  if (settings?.receiptFooter) {
    merged.thankYouMessage = settings.receiptFooter;
  }

  return merged;
}

/**
 * Sample order data for the receipt designer preview.
 * Clearly marked as sample order - never interacts with live inventory, sales, or financial records.
 */
export const SAMPLE_PREVIEW_ORDER: Order = {
  id: 'sample-preview-order',
  orderNumber: 'PREVIEW-101',
  restaurantId: 'rest-001',
  outletId: 'outlet-blr-01',
  orderType: 'dine_in',
  tableName: 'Table 5',
  tableId: 't-5',
  customerName: 'Arjun Mehta',
  customerPhone: '+91 98765 43210',
  customerAddress: 'Indiranagar 100 Feet Rd, Bengaluru',
  guestCount: 3,
  waiterName: 'Karan Singh (Capt)',
  status: 'completed',
  paymentStatus: 'paid',
  paymentMethod: 'upi',
  paymentReference: 'UPI-REF-9823412',
  subtotalPaise: 114000, // ₹1,140.00
  discountPaise: 10000,  // ₹100.00
  discountDescription: 'Special Launch Promo (10%)',
  cgstPaise: 2600,       // ₹26.00 (2.5%)
  sgstPaise: 2600,       // ₹26.00 (2.5%)
  roundingPaise: 0,
  totalPaise: 109200,    // ₹1,092.00
  paidAmountPaise: 109200,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    {
      cartItemId: 'sample-item-1',
      menuItem: {
        id: 'sample-m1',
        categoryId: 'cat-starters',
        name: 'Paneer Tikka Angara with Mint Chutney',
        description: 'Smoky grilled cottage cheese cubes in spiced marinade',
        imageUrl: '',
        foodType: 'veg',
        basePricePaise: 38000,
        isAvailable: true,
        cgstPct: 2.5,
        sgstPct: 2.5,
      },
      variant: {
        id: 'var-full',
        name: 'Full Portion (8 Pcs)',
        pricePaise: 38000,
      },
      selectedModifiers: [
        {
          optionId: 'mod-spice',
          optionName: 'Extra Spicy',
          pricePaise: 0,
        },
      ],
      quantity: 1,
      unitPricePaise: 38000,
      subtotalPaise: 38000,
      notes: 'Crispy edges, extra chaat masala',
    },
    {
      cartItemId: 'sample-item-2',
      menuItem: {
        id: 'sample-m2',
        categoryId: 'cat-main',
        name: 'Dal Makhani Bukhara',
        description: 'Slow-cooked overnight black lentils with churned butter',
        imageUrl: '',
        foodType: 'veg',
        basePricePaise: 32000,
        isAvailable: true,
        cgstPct: 2.5,
        sgstPct: 2.5,
      },
      variant: {
        id: 'var-reg',
        name: 'Regular Bowl',
        pricePaise: 32000,
      },
      selectedModifiers: [],
      quantity: 1,
      unitPricePaise: 32000,
      subtotalPaise: 32000,
    },
    {
      cartItemId: 'sample-item-3',
      menuItem: {
        id: 'sample-m3',
        categoryId: 'cat-breads',
        name: 'Butter Garlic Naan',
        description: 'Clay tandoor flatbread with minced garlic and butter',
        imageUrl: '',
        foodType: 'veg',
        basePricePaise: 9000,
        isAvailable: true,
        cgstPct: 2.5,
        sgstPct: 2.5,
      },
      selectedModifiers: [],
      quantity: 3,
      unitPricePaise: 9000,
      subtotalPaise: 27000,
    },
    {
      cartItemId: 'sample-item-4',
      menuItem: {
        id: 'sample-m4',
        categoryId: 'cat-beverages',
        name: 'Fresh Mint Lime Soda',
        description: 'Chilled soda with fresh lime juice, mint and rock salt',
        imageUrl: '',
        foodType: 'veg',
        basePricePaise: 8500,
        isAvailable: true,
        cgstPct: 2.5,
        sgstPct: 2.5,
      },
      selectedModifiers: [
        {
          optionId: 'mod-sweet',
          optionName: 'Sweet & Salt Mix',
          pricePaise: 0,
        },
      ],
      quantity: 2,
      unitPricePaise: 8500,
      subtotalPaise: 17000,
    },
  ],
};

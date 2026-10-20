import { FoodType, DietaryType } from './index';

export interface ItemSalesRow {
  menuItemId: string;
  rank: number;
  name: string;
  categoryName: string;
  categoryId?: string;
  foodType?: FoodType;
  dietaryType?: DietaryType;
  imageUrl?: string;
  basePricePaise: number;
  quantitySold: number;
  grossSalesPaise: number;
  discountsPaise: number;
  netSalesPaise: number;
  hasCostConfigured: boolean;
  unitCostPaise: number | null;
  totalFoodCostPaise: number | null;
  grossProfitPaise: number | null;
  grossMarginPct: number | null;
  refundedQuantity: number;
  refundedAmountPaise: number;
  orderCount: number;
  averageSellingPricePaise: number;
}

export interface CategorySalesRow {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  quantitySold: number;
  grossSalesPaise: number;
  discountsPaise: number;
  netSalesPaise: number;
  revenueSharePct: number;
  hasCostConfigured: boolean;
  totalFoodCostPaise: number | null;
  grossProfitPaise: number | null;
  grossMarginPct: number | null;
  items: ItemSalesRow[];
}

export type DateFilterPreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last_month'
  | 'custom'
  | 'all';

export interface DateRangeFilter {
  preset: DateFilterPreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

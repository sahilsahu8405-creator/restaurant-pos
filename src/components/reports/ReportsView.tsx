import React, { useEffect, useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  FileSpreadsheet,
  PieChart as PieIcon,
  BarChart2,
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  Package,
  Layers,
  Percent,
  CheckCircle2,
  Clock,
  Filter,
  UtensilsCrossed,
  Store,
  Tag,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localRepository } from '../../services/localRepository';
import {
  Order,
  InventoryItem,
  ExpenseRecord,
  FoodCostingSummary,
  DiningTable,
  MenuItem,
  MenuCategory,
} from '../../types';
import { formatPaise } from '../../utils/currency';
import { ItemSalesRow, CategorySalesRow, DateFilterPreset } from '../../types/reports';
import { ItemSalesReport } from './ItemSalesReport';
import { CategorySalesReport } from './CategorySalesReport';

export const ReportsView: React.FC = () => {
  const { restaurant, activeOutlet, addToast } = useApp();

  // Core Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [foodCostings, setFoodCostings] = useState<FoodCostingSummary[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation & Filtering
  const [activeReportTab, setActiveReportTab] = useState<string>('items'); // Default to Item Sales!
  const [dateRange, setDateRange] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(activeOutlet?.id || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const outletIdToQuery = selectedOutletId === 'all' ? (activeOutlet?.id || '') : selectedOutletId;
      const [ordList, invList, expList, costList, tblList, catList, itemList] = await Promise.all([
        localRepository.getOrders(outletIdToQuery),
        localRepository.getInventory(outletIdToQuery),
        localRepository.getExpenses(outletIdToQuery),
        localRepository.getFoodCostingSummaries(outletIdToQuery),
        localRepository.getTables(outletIdToQuery),
        localRepository.getCategories(),
        localRepository.getMenuItems(),
      ]);
      setOrders(ordList);
      setInventory(invList);
      setExpenses(expList);
      setFoodCostings(costList);
      setTables(tblList);
      setCategories(catList);
      setMenuItems(itemList);
    } catch (err) {
      console.error('Failed to load operational report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOutlet, selectedOutletId]);

  // Report Tabs Definition
  const reportTabs = [
    { id: 'sales', label: 'Sales Overview', icon: BarChart2 },
    { id: 'items', label: 'Item Sales', icon: UtensilsCrossed },
    { id: 'categories', label: 'Category Sales', icon: Layers },
    { id: 'profitability', label: 'Menu Profitability', icon: Receipt },
    { id: 'payment', label: 'Payment Ledger', icon: DollarSign },
    { id: 'inventory', label: 'Stock Valuation', icon: Package },
    { id: 'expense', label: 'Expense Audit', icon: FileSpreadsheet },
    { id: 'table', label: 'Table Utilization', icon: PieIcon },
  ];

  // Date Filtering Logic
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((o) => {
      // Order Type Filter
      if (selectedOrderType !== 'all' && o.orderType !== selectedOrderType) {
        return false;
      }

      // Order Status Filter
      if (selectedOrderStatus !== 'all' && o.status !== selectedOrderStatus) {
        return false;
      }

      // Payment Status Filter
      if (selectedPaymentStatus !== 'all' && o.paymentStatus !== selectedPaymentStatus) {
        return false;
      }

      // Date Range Filter
      if (dateRange === 'all') return true;

      const orderDate = new Date(o.createdAt);

      if (dateRange === 'today') {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate()
        );
      }

      if (dateRange === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return (
          orderDate.getFullYear() === yesterday.getFullYear() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getDate() === yesterday.getDate()
        );
      }

      if (dateRange === 'week') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return orderDate >= sevenDaysAgo && orderDate <= now;
      }

      if (dateRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return orderDate >= startOfMonth && orderDate <= now;
      }

      if (dateRange === 'last_month') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
      }

      if (dateRange === 'custom') {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`);
          if (orderDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59.999`);
          if (orderDate > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [
    orders,
    dateRange,
    customStartDate,
    customEndDate,
    selectedOrderType,
    selectedOrderStatus,
    selectedPaymentStatus,
  ]);

  // Formatted Date Range Label
  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') {
      return `Today (${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`;
    }
    if (dateRange === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return `Yesterday (${yesterday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`;
    }
    if (dateRange === 'week') {
      return 'This Week (Last 7 Days)';
    }
    if (dateRange === 'month') {
      return `This Month (${now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})`;
    }
    if (dateRange === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `Last Month (${prevMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})`;
    }
    if (dateRange === 'custom') {
      return `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    }
    return 'All Historical Records';
  }, [dateRange, customStartDate, customEndDate]);

  // Authoritative Sales & Financial Aggregations for Sales Overview
  const completedOrConfirmed = useMemo(
    () => filteredOrders.filter((o) => o.status !== 'cancelled'),
    [filteredOrders]
  );
  const grossSalesPaise = completedOrConfirmed.reduce((sum, o) => sum + o.subtotalPaise, 0);
  const totalDiscountsPaise = completedOrConfirmed.reduce(
    (sum, o) => sum + (o.discountPaise || 0),
    0
  );
  const totalTaxesPaise = completedOrConfirmed.reduce(
    (sum, o) => sum + (o.cgstPaise || 0) + (o.sgstPaise || 0),
    0
  );
  const netSalesPaise = completedOrConfirmed.reduce((sum, o) => sum + o.totalPaise, 0);

  const totalCollectedPaise = completedOrConfirmed
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalPaise, 0);

  const outstandingBalancePaise = completedOrConfirmed
    .filter((o) => o.paymentStatus !== 'paid')
    .reduce((sum, o) => sum + o.totalPaise, 0);

  const orderCount = completedOrConfirmed.length;
  const averageOrderValuePaise = orderCount > 0 ? Math.round(netSalesPaise / orderCount) : 0;

  // Dynamic Payment Method calculations
  const methodTotals = useMemo(() => {
    const totals = { upi: 0, cash: 0, card: 0, other: 0 };
    completedOrConfirmed.forEach((o) => {
      const m = (o.paymentMethod || 'cash') as keyof typeof totals;
      if (totals[m] !== undefined) {
        totals[m] += o.totalPaise;
      } else {
        totals.other += o.totalPaise;
      }
    });
    return totals;
  }, [completedOrConfirmed]);

  const upiPct = netSalesPaise > 0 ? Math.round((methodTotals.upi / netSalesPaise) * 100) : 0;
  const cashPct = netSalesPaise > 0 ? Math.round((methodTotals.cash / netSalesPaise) * 100) : 0;
  const cardPct = netSalesPaise > 0 ? Math.round((methodTotals.card / netSalesPaise) * 100) : 0;

  // =========================================================================
  // ITEM SALES AGGREGATIONS (Section 1, 3, 4, 7)
  // =========================================================================
  const itemSalesRows: ItemSalesRow[] = useMemo(() => {
    const dishMap: { [dishId: string]: ItemSalesRow } = {};

    completedOrConfirmed.forEach((o) => {
      const orderSubtotal = o.subtotalPaise || 1;
      const orderDiscount = o.discountPaise || 0;

      o.items?.forEach((item) => {
        // Exclude cancelled items per requirement
        if (item.kotStatus === 'cancelled' || item.kitchenStatus === 'cancelled') return;

        // Apply category filter if selected
        if (selectedCategory !== 'all' && item.menuItem.categoryId !== selectedCategory) return;

        const dishId = item.menuItem.id;
        const matchingCategory = categories.find((c) => c.id === item.menuItem.categoryId);
        const costing = foodCostings.find((c) => c.menuItemId === dishId);

        if (!dishMap[dishId]) {
          dishMap[dishId] = {
            menuItemId: dishId,
            rank: 0,
            name: item.menuItem.name,
            categoryName: matchingCategory?.name || 'Main Course',
            categoryId: item.menuItem.categoryId,
            foodType: item.menuItem.foodType,
            dietaryType: item.menuItem.dietaryType,
            imageUrl: item.menuItem.imageUrl,
            basePricePaise: item.menuItem.basePricePaise,
            quantitySold: 0,
            grossSalesPaise: 0,
            discountsPaise: 0,
            netSalesPaise: 0,
            hasCostConfigured: costing?.isComplete ?? false,
            unitCostPaise: costing?.isComplete ? costing.totalEstimatedCostPaise : null,
            totalFoodCostPaise: 0,
            grossProfitPaise: 0,
            grossMarginPct: 0,
            refundedQuantity: 0,
            refundedAmountPaise: 0,
            orderCount: 0,
            averageSellingPricePaise: 0,
          };
        }

        if (o.paymentStatus === 'refunded') {
          dishMap[dishId].refundedQuantity += item.quantity;
          dishMap[dishId].refundedAmountPaise += item.subtotalPaise;
        } else {
          dishMap[dishId].quantitySold += item.quantity;
          dishMap[dishId].grossSalesPaise += item.subtotalPaise;

          // Standard GAAP proportional discount allocation
          const itemDiscount = Math.round((item.subtotalPaise / orderSubtotal) * orderDiscount);
          dishMap[dishId].discountsPaise += itemDiscount;
          dishMap[dishId].netSalesPaise += (item.subtotalPaise - itemDiscount);
          dishMap[dishId].orderCount += 1;
        }
      });
    });

    const rows = Object.values(dishMap).map((row) => {
      if (row.hasCostConfigured && row.unitCostPaise !== null) {
        row.totalFoodCostPaise = row.unitCostPaise * row.quantitySold;
        row.grossProfitPaise = row.netSalesPaise - row.totalFoodCostPaise;
        row.grossMarginPct =
          row.netSalesPaise > 0
            ? Math.round((row.grossProfitPaise / row.netSalesPaise) * 1000) / 10
            : 0;
      } else {
        row.totalFoodCostPaise = null;
        row.grossProfitPaise = null;
        row.grossMarginPct = null;
      }
      row.averageSellingPricePaise =
        row.quantitySold > 0 ? Math.round(row.grossSalesPaise / row.quantitySold) : row.basePricePaise;
      return row;
    });

    // Rank 1..N by quantitySold descending
    rows.sort((a, b) => b.quantitySold - a.quantitySold);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    return rows;
  }, [completedOrConfirmed, selectedCategory, categories, foodCostings]);

  // =========================================================================
  // CATEGORY SALES AGGREGATIONS (Section 5)
  // =========================================================================
  const categorySalesRows: CategorySalesRow[] = useMemo(() => {
    const totalNetSales = itemSalesRows.reduce((sum, i) => sum + i.netSalesPaise, 0);

    const catMap: { [catId: string]: CategorySalesRow } = {};

    categories.forEach((cat) => {
      const itemsInCat = itemSalesRows.filter(
        (i) => i.categoryId === cat.id || i.categoryName.toLowerCase() === cat.name.toLowerCase()
      );
      if (itemsInCat.length === 0 && selectedCategory !== 'all' && selectedCategory !== cat.id) {
        return;
      }

      const quantitySold = itemsInCat.reduce((sum, i) => sum + i.quantitySold, 0);
      const grossSalesPaise = itemsInCat.reduce((sum, i) => sum + i.grossSalesPaise, 0);
      const discountsPaise = itemsInCat.reduce((sum, i) => sum + i.discountsPaise, 0);
      const netSalesPaise = itemsInCat.reduce((sum, i) => sum + i.netSalesPaise, 0);

      const costedItems = itemsInCat.filter((i) => i.hasCostConfigured && i.totalFoodCostPaise !== null);
      const totalFoodCostPaise =
        costedItems.length > 0
          ? costedItems.reduce((sum, i) => sum + (i.totalFoodCostPaise || 0), 0)
          : null;
      const costedNetSales = costedItems.reduce((sum, i) => sum + i.netSalesPaise, 0);
      const grossProfitPaise =
        totalFoodCostPaise !== null ? costedNetSales - totalFoodCostPaise : null;
      const grossMarginPct =
        grossProfitPaise !== null && costedNetSales > 0
          ? Math.round((grossProfitPaise / costedNetSales) * 1000) / 10
          : null;

      const revenueSharePct =
        totalNetSales > 0 ? Math.round((netSalesPaise / totalNetSales) * 1000) / 10 : 0;

      catMap[cat.id] = {
        categoryId: cat.id,
        categoryName: cat.name,
        itemCount: itemsInCat.length,
        quantitySold,
        grossSalesPaise,
        discountsPaise,
        netSalesPaise,
        revenueSharePct,
        hasCostConfigured: costedItems.length > 0,
        totalFoodCostPaise,
        grossProfitPaise,
        grossMarginPct,
        items: itemsInCat,
      };
    });

    return Object.values(catMap).sort((a, b) => b.netSalesPaise - a.netSalesPaise);
  }, [itemSalesRows, categories, selectedCategory]);

  // Inventory & Expense aggregations
  const totalStockValuationPaise = inventory.reduce(
    (sum, i) => sum + i.currentStock * i.costPerUnitPaise,
    0
  );
  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minThreshold).length;
  const totalExpensesPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

  // =========================================================================
  // FORMULA-INJECTION SAFE CSV EXPORT (Section 10)
  // =========================================================================
  const escapeCsv = (val: any) => {
    let str = String(val ?? '');
    // Neutralize spreadsheet formula injection (=, +, -, @)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const downloadCsvFile = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${filename} successfully`, 'success');
  };

  const handleExportCSV = () => {
    if (activeReportTab === 'items') {
      if (itemSalesRows.length === 0) {
        addToast('No item sales to export for selected filters', 'warning');
        return;
      }
      const headers = [
        'Rank',
        'Item Name',
        'Category',
        'Dietary Tag',
        'Quantity Sold',
        'Gross Sales (INR)',
        'Discounts (INR)',
        'Net Sales (INR)',
        'Estimated Food Cost (INR)',
        'Gross Profit (INR)',
        'Profit Margin %',
        'Refunds (INR)',
      ];
      const rows = itemSalesRows.map((r) => [
        escapeCsv(r.rank),
        escapeCsv(r.name),
        escapeCsv(r.categoryName),
        escapeCsv(r.dietaryType || 'Standard'),
        escapeCsv(r.quantitySold),
        escapeCsv((r.grossSalesPaise / 100).toFixed(2)),
        escapeCsv((r.discountsPaise / 100).toFixed(2)),
        escapeCsv((r.netSalesPaise / 100).toFixed(2)),
        escapeCsv(
          r.hasCostConfigured && r.totalFoodCostPaise !== null
            ? (r.totalFoodCostPaise / 100).toFixed(2)
            : 'Cost not configured'
        ),
        escapeCsv(
          r.hasCostConfigured && r.grossProfitPaise !== null
            ? (r.grossProfitPaise / 100).toFixed(2)
            : '—'
        ),
        escapeCsv(
          r.hasCostConfigured && r.grossMarginPct !== null ? `${r.grossMarginPct}%` : '—'
        ),
        escapeCsv((r.refundedAmountPaise / 100).toFixed(2)),
      ]);
      downloadCsvFile(
        'restohub-item-sales-report.csv',
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      );
    } else if (activeReportTab === 'categories') {
      if (categorySalesRows.length === 0) {
        addToast('No category sales records to export', 'warning');
        return;
      }
      const headers = [
        'Category Name',
        'Dishes Sold',
        'Units Sold',
        'Gross Sales (INR)',
        'Discounts (INR)',
        'Net Sales (INR)',
        'Share of Sales %',
        'Estimated Food Cost (INR)',
        'Gross Profit (INR)',
        'Margin %',
      ];
      const rows = categorySalesRows.map((c) => [
        escapeCsv(c.categoryName),
        escapeCsv(c.itemCount),
        escapeCsv(c.quantitySold),
        escapeCsv((c.grossSalesPaise / 100).toFixed(2)),
        escapeCsv((c.discountsPaise / 100).toFixed(2)),
        escapeCsv((c.netSalesPaise / 100).toFixed(2)),
        escapeCsv(`${c.revenueSharePct}%`),
        escapeCsv(
          c.hasCostConfigured && c.totalFoodCostPaise !== null
            ? (c.totalFoodCostPaise / 100).toFixed(2)
            : 'Incomplete'
        ),
        escapeCsv(
          c.hasCostConfigured && c.grossProfitPaise !== null
            ? (c.grossProfitPaise / 100).toFixed(2)
            : '—'
        ),
        escapeCsv(
          c.hasCostConfigured && c.grossMarginPct !== null ? `${c.grossMarginPct}%` : '—'
        ),
      ]);
      downloadCsvFile(
        'restohub-category-sales-report.csv',
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      );
    } else if (activeReportTab === 'profitability') {
      const headers = [
        'Dish Name',
        'Units Sold',
        'Base Price (INR)',
        'Est. Dish Cost (INR)',
        'Est. Contribution (INR)',
        'Total Gross Profit (INR)',
        'Gross Margin %',
        'Recipe Status',
      ];
      const rows = itemSalesRows.map((d) => [
        escapeCsv(d.name),
        escapeCsv(d.quantitySold),
        escapeCsv((d.basePricePaise / 100).toFixed(2)),
        escapeCsv(
          d.hasCostConfigured && d.unitCostPaise !== null
            ? (d.unitCostPaise / 100).toFixed(2)
            : 'Cost not configured'
        ),
        escapeCsv(
          d.hasCostConfigured && d.unitCostPaise !== null
            ? ((d.basePricePaise - d.unitCostPaise) / 100).toFixed(2)
            : '—'
        ),
        escapeCsv(
          d.hasCostConfigured && d.grossProfitPaise !== null
            ? (d.grossProfitPaise / 100).toFixed(2)
            : '—'
        ),
        escapeCsv(
          d.hasCostConfigured && d.grossMarginPct !== null ? `${d.grossMarginPct}%` : '—'
        ),
        escapeCsv(d.hasCostConfigured ? 'Recipe Configured' : 'No Recipe'),
      ]);
      downloadCsvFile(
        'restohub-menu-profitability.csv',
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      );
    } else if (activeReportTab === 'sales' || activeReportTab === 'payment') {
      if (completedOrConfirmed.length === 0) {
        addToast('No transaction records to export for selected filter', 'warning');
        return;
      }
      const headers = [
        'Order Number',
        'Date Time',
        'Type',
        'Table',
        'Status',
        'Payment Status',
        'Payment Method',
        'Subtotal (INR)',
        'Discounts (INR)',
        'Taxes (INR)',
        'Total Paid (INR)',
      ];
      const rows = completedOrConfirmed.map((o) => [
        escapeCsv(o.orderNumber),
        escapeCsv(new Date(o.createdAt).toLocaleString('en-IN')),
        escapeCsv(o.orderType),
        escapeCsv(o.tableName || 'Counter'),
        escapeCsv(o.status),
        escapeCsv(o.paymentStatus),
        escapeCsv(o.paymentMethod || 'Pending'),
        escapeCsv((o.subtotalPaise / 100).toFixed(2)),
        escapeCsv(((o.discountPaise || 0) / 100).toFixed(2)),
        escapeCsv((((o.cgstPaise || 0) + (o.sgstPaise || 0)) / 100).toFixed(2)),
        escapeCsv((o.totalPaise / 100).toFixed(2)),
      ]);
      downloadCsvFile(
        `restohub-${activeReportTab}-report.csv`,
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      );
    } else if (activeReportTab === 'inventory') {
      const headers = [
        'Ingredient',
        'Category',
        'Current Stock',
        'Unit',
        'Threshold',
        'Unit Cost (INR)',
        'Valuation (INR)',
      ];
      const rows = inventory.map((i) => [
        escapeCsv(i.name),
        escapeCsv(i.category),
        escapeCsv(i.currentStock),
        escapeCsv(i.unit),
        escapeCsv(i.minThreshold),
        escapeCsv((i.costPerUnitPaise / 100).toFixed(2)),
        escapeCsv(((i.currentStock * i.costPerUnitPaise) / 100).toFixed(2)),
      ]);
      downloadCsvFile(
        'restohub-inventory-valuation.csv',
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      );
    } else if (activeReportTab === 'expense') {
      const headers = ['Date', 'Category', 'Description', 'Payment Method', 'Amount (INR)'];
      const rows = expenses.map((e) => [
        escapeCsv(e.date),
        escapeCsv(e.category),
        escapeCsv(e.description),
        escapeCsv(e.paymentMethod),
        escapeCsv((e.amountPaise / 100).toFixed(2)),
      ]);
      downloadCsvFile(
        'restohub-expense-report.csv',
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      );
    } else {
      addToast('CSV export generated', 'info');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#0B0F17] select-none">
      {/* Mobile Horizontal Report Navigation */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto p-3 bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 scrollbar-none shrink-0">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sub-navigation Sidebar for Reports */}
      <aside className="hidden md:block w-64 bg-white dark:bg-[#121824] border-r border-slate-200 dark:border-slate-800 p-4 space-y-1 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Business Reports
          </span>
          <button
            onClick={loadData}
            title="Refresh Report Data"
            className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Report Body */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* =========================================================================
            COMPREHENSIVE GLOBAL REPORT FILTER BAR (Section 2)
            ========================================================================= */}
        <div className="bg-white dark:bg-[#121824] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                  {reportTabs.find((t) => t.id === activeReportTab)?.label || 'Reports'}
                </h1>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                  {dateRangeLabel}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Audited operational dataset ({completedOrConfirmed.length} Orders analyzed)
              </span>
            </div>

            {/* Export CSV Button */}
            <div className="flex items-center gap-2.5 self-start lg:self-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            {/* Date Range Selector Segmented Control */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'custom', label: 'Custom' },
                { id: 'all', label: 'All Time' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateRange(d.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateRange === d.id
                      ? 'bg-white dark:bg-[#121824] text-blue-600 dark:text-blue-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers when 'custom' is active */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs focus:outline-none font-medium"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs focus:outline-none font-medium"
                />
              </div>
            )}

            {/* Branch / Outlet Selector */}
            {restaurant && restaurant.outlets && restaurant.outlets.length > 1 && (
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none"
              >
                <option value="all">All Authorized Branches</option>
                {restaurant.outlets.map((out) => (
                  <option key={out.id} value={out.id}>
                    {out.name}
                  </option>
                ))}
              </select>
            )}

            {/* Menu Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none"
            >
              <option value="all">All Menu Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Order Type Filter */}
            <select
              value={selectedOrderType}
              onChange={(e) => setSelectedOrderType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none"
            >
              <option value="all">All Order Types</option>
              <option value="dine_in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
              <option value="counter">Counter</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Reset Filters Shortcut */}
            {(dateRange !== 'all' ||
              selectedCategory !== 'all' ||
              selectedOrderType !== 'all' ||
              selectedPaymentStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setDateRange('all');
                  setSelectedCategory('all');
                  setSelectedOrderType('all');
                  setSelectedPaymentStatus('all');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            TAB 1: SALES OVERVIEW (Existing Preserved)
            ========================================================================= */}
        {activeReportTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">Gross Sales</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {formatPaise(grossSalesPaise)}
                </div>
                <span className="text-[11px] text-slate-400">Before discounts & taxes</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">Discounts & Taxes</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  -{formatPaise(totalDiscountsPaise)} / +{formatPaise(totalTaxesPaise)}
                </div>
                <span className="text-[11px] text-slate-400">Discounts given / GST</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                  Net Revenue
                </span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatPaise(netSalesPaise)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {orderCount} total orders (AOV: {formatPaise(averageOrderValuePaise)})
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Collected vs Outstanding
                </span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatPaise(totalCollectedPaise)}
                </div>
                <span className="text-[11px] text-red-500 font-semibold">
                  Pending: {formatPaise(outstandingBalancePaise)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Audited Sales Invoices
                </h3>
                <span className="text-xs text-slate-400">{completedOrConfirmed.length} orders</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5 pl-6">Order</th>
                      <th className="p-3.5">Type & Table</th>
                      <th className="p-3.5">Date / Time</th>
                      <th className="p-3.5">Subtotal</th>
                      <th className="p-3.5">Tax (GST)</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {completedOrConfirmed.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                          No order records found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      completedOrConfirmed.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                          <td className="p-3.5 pl-6 font-extrabold text-slate-900 dark:text-white">
                            {o.orderNumber}
                          </td>
                          <td className="p-3.5 capitalize text-slate-600 dark:text-slate-300">
                            {o.orderType.replace('_', ' ')} • {o.tableName || 'Counter'}
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {formatPaise(o.subtotalPaise)}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400">
                            {formatPaise((o.cgstPaise || 0) + (o.sgstPaise || 0))}
                          </td>
                          <td className="p-3.5 font-mono font-black text-blue-600 dark:text-blue-400">
                            {formatPaise(o.totalPaise)}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                o.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {o.paymentStatus} ({o.paymentMethod || 'cash'})
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ITEM SALES REPORT (Section 1, 3, 4, 7, 8, 9)
            ========================================================================= */}
        {activeReportTab === 'items' && (
          <ItemSalesReport
            items={itemSalesRows}
            allMenuItems={menuItems}
            categories={categorySalesRows}
            orders={filteredOrders}
            dateRangeLabel={dateRangeLabel}
          />
        )}

        {/* =========================================================================
            TAB 3: CATEGORY SALES REPORT (Section 5)
            ========================================================================= */}
        {activeReportTab === 'categories' && (
          <CategorySalesReport
            categories={categorySalesRows}
            totalNetSalesPaise={netSalesPaise}
            orders={filteredOrders}
            dateRangeLabel={dateRangeLabel}
          />
        )}

        {/* =========================================================================
            TAB 4: MENU PROFITABILITY (Section 6)
            ========================================================================= */}
        {activeReportTab === 'profitability' && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Dish Gross Contribution vs Business Net Profit
                </h4>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                  Figures below reflect estimated gross contribution (Dish Price minus Recipe Ingredients and Packaging). Overall business net profit also accounts for store overheads, labor, rent, utilities, and kitchen prep wastage.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Menu Profitability & Contribution Analysis
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dishes without configured recipes are clearly identified per accounting standards
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {itemSalesRows.length} Dishes Analyzed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5 pl-6">Dish Name</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5 text-right">Selling Price</th>
                      <th className="p-3.5 text-right">Unit Food Cost</th>
                      <th className="p-3.5 text-right">Unit Contribution</th>
                      <th className="p-3.5 text-center">Units Sold</th>
                      <th className="p-3.5 text-right">Total Food Cost</th>
                      <th className="p-3.5 text-right">Total Contribution</th>
                      <th className="p-3.5 pr-6 text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {itemSalesRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                          No menu sales records found for this period.
                        </td>
                      </tr>
                    ) : (
                      itemSalesRows.map((d) => (
                        <tr key={d.menuItemId} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                          <td className="p-3.5 pl-6 font-extrabold text-slate-900 dark:text-white">
                            {d.name}
                          </td>
                          <td className="p-3.5 text-slate-500">{d.categoryName}</td>
                          <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatPaise(d.basePricePaise)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            {d.hasCostConfigured && d.unitCostPaise !== null ? (
                              formatPaise(d.unitCostPaise)
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Cost not configured
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {d.hasCostConfigured && d.unitCostPaise !== null
                              ? formatPaise(d.basePricePaise - d.unitCostPaise)
                              : '—'}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white">
                            {d.quantitySold}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            {d.hasCostConfigured && d.totalFoodCostPaise !== null
                              ? formatPaise(d.totalFoodCostPaise)
                              : '—'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            {d.hasCostConfigured && d.grossProfitPaise !== null
                              ? formatPaise(d.grossProfitPaise)
                              : '—'}
                          </td>
                          <td className="p-3.5 pr-6 text-center">
                            {d.hasCostConfigured && d.grossMarginPct !== null ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.grossMarginPct >= 65
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : d.grossMarginPct >= 50
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {d.grossMarginPct}% Margin
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No recipe</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PAYMENT LEDGER (Existing Preserved)
            ========================================================================= */}
        {activeReportTab === 'payment' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">UPI Payments</span>
                <div className="text-xl font-black text-blue-600 mt-1">
                  {formatPaise(methodTotals.upi)}
                </div>
                <span className="text-[11px] text-slate-400">{upiPct}% of collections</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Cash Collections</span>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {formatPaise(methodTotals.cash)}
                </div>
                <span className="text-[11px] text-slate-400">{cashPct}% of collections</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Card POS</span>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {formatPaise(methodTotals.card)}
                </div>
                <span className="text-[11px] text-slate-400">{cardPct}% of collections</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Unsettled Balance</span>
                <div className="text-xl font-black text-red-600 mt-1">
                  {formatPaise(outstandingBalancePaise)}
                </div>
                <span className="text-[11px] text-red-400">Requires settlement</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Payment Method Distribution
                </h3>
                <p className="text-xs text-slate-400">
                  Verified collections reconciled against active cash drawers and provider channels
                </p>

                <div className="space-y-2 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>UPI</span>
                      <span>{upiPct}% ({formatPaise(methodTotals.upi)})</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div style={{ width: `${upiPct}%` }} className="h-full bg-blue-500 rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Cash</span>
                      <span>{cashPct}% ({formatPaise(methodTotals.cash)})</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div style={{ width: `${cashPct}%` }} className="h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Card POS</span>
                      <span>{cardPct}% ({formatPaise(methodTotals.card)})</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div style={{ width: `${cardPct}%` }} className="h-full bg-amber-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#3B82F6"
                    strokeWidth="14"
                    strokeDasharray={`${(upiPct / 100) * 238.7} 238.7`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray={`${(cashPct / 100) * 238.7} 238.7`}
                    strokeDashoffset={`-${(upiPct / 100) * 238.7}`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    strokeDasharray={`${(cardPct / 100) * 238.7} 238.7`}
                    strokeDashoffset={`-${((upiPct + cashPct) / 100) * 238.7}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Paid</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatPaise(totalCollectedPaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: STOCK VALUATION (Existing Preserved)
            ========================================================================= */}
        {activeReportTab === 'inventory' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Tracked Raw Ingredients
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {inventory.length} Items
                </div>
                <span className="text-[11px] text-slate-400">In restaurant stockroom</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                  Low Stock Alerts
                </span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {lowStockCount} Items
                </div>
                <span className="text-[11px] text-slate-400">Below reorder threshold</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                  Total Stock Valuation
                </span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatPaise(totalStockValuationPaise)}
                </div>
                <span className="text-[11px] text-slate-400">Current inventory assets</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5 pl-6">Ingredient</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Current Stock</th>
                    <th className="p-3.5">Reorder Threshold</th>
                    <th className="p-3.5">Cost per Unit</th>
                    <th className="p-3.5 pr-6">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {inventory.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="p-3.5 pl-6 font-bold text-slate-900 dark:text-white">{i.name}</td>
                      <td className="p-3.5 text-slate-500">{i.category}</td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {i.currentStock} {i.unit}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-500">
                        {i.minThreshold} {i.unit}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {formatPaise(i.costPerUnitPaise)} / {i.unit}
                      </td>
                      <td className="p-3.5 pr-6 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatPaise(i.currentStock * i.costPerUnitPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: EXPENSE AUDIT (Existing Preserved)
            ========================================================================= */}
        {activeReportTab === 'expense' && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Total Recorded Expenses
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatPaise(totalExpensesPaise)}
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500">{expenses.length} Expense Entries</span>
            </div>

            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5 pl-6">Date</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5 pr-6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="p-3.5 pl-6 text-slate-500">{e.date}</td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 capitalize">
                        {e.category}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{e.description}</td>
                      <td className="p-3.5 uppercase text-[11px] text-slate-400">{e.paymentMethod}</td>
                      <td className="p-3.5 pr-6 font-mono font-bold text-red-600">
                        {formatPaise(e.amountPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 8: TABLE UTILIZATION (Existing Preserved)
            ========================================================================= */}
        {activeReportTab === 'table' && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Floor Layout & Table Utilization
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real dining session metrics and occupancy turnover
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tables.map((t) => {
                const isOccupied = t.status === 'occupied';
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-3xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Table {t.tableNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          isOccupied
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {t.section} • {t.seatingCapacity} Seats
                    </span>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono">
                      {isOccupied ? `Session active: ${t.orderDurationMinutes || 15}m` : 'Ready for seating'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

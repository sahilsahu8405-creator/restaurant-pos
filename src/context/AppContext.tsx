import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { localRepository } from '../services/localRepository';
import {
  CartItem,
  DiningTable,
  MenuItem,
  MenuVariant,
  Order,
  OrderType,
  Outlet,
  Restaurant,
  RestaurantSettings,
  RoleType,
  WorkspaceType,
} from '../types';
import { calculateBill } from '../utils/currency';

export type AppView =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'tables'
  | 'waiter'
  | 'kds'
  | 'menu'
  | 'inventory'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'superadmin';

interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Workspace Separation (Restaurant App vs Platform Super Admin)
  workspace: WorkspaceType;
  setWorkspace: (ws: WorkspaceType) => void;

  // View Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // User Role
  activeRole: RoleType;
  setActiveRole: (role: RoleType) => void;

  // Restaurant, Outlets & Settings
  restaurant: Restaurant | null;
  settings: RestaurantSettings | null;
  activeOutlet: Outlet | null;
  setActiveOutlet: (outlet: Outlet) => void;
  updateSettings: (partial: Partial<RestaurantSettings>) => Promise<void>;
  updateRestaurantProfile: (updates: Partial<Restaurant>) => Promise<void>;
  updateOutletProfile: (outletId: string, updates: Partial<Outlet>) => Promise<void>;

  // Search Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Cart State (Authoritative Paise Calculations)
  cartItems: CartItem[];
  selectedTable: DiningTable | null;
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryInstructions: string;
  guestCount: number;
  discountPaise: number;
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
  paidAmountPaise: number;
  balanceDuePaise: number;
  activeExistingOrderId: string | null;

  // Cart Actions
  addToCart: (item: MenuItem, variant?: MenuVariant) => void;
  updateCartQty: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  setSelectedTable: (table: DiningTable | null) => void;
  setOrderType: (type: OrderType) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setCustomerAddress: (address: string) => void;
  setDeliveryInstructions: (instructions: string) => void;
  setGuestCount: (count: number) => void;
  applyDiscountPaise: (paise: number) => void;
  openTableForBilling: (table: DiningTable, targetOrderId?: string) => Promise<void>;
  pendingTableOrders: { table: DiningTable; orders: Order[] } | null;
  setPendingTableOrders: (val: { table: DiningTable; orders: Order[] } | null) => void;
  startNewTakeawayOrder: () => void;
  startNewDeliveryOrder: (details?: {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    deliveryInstructions?: string;
  }) => void;

  // Quick Order Submission
  submitActiveOrder: () => Promise<Order>;

  // Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;

  // Mobile Drawer State
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, authorizedOutletId, isSuperAdmin, membership, kdsDevice, isLoading } = useAuth();

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('restohub_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Workspaces: 'restaurant' (default operational client) or 'superadmin' (platform management)
  const [workspace, setWorkspaceState] = useState<WorkspaceType>(() => {
    return role === 'superadmin' ? 'superadmin' : 'restaurant';
  });

  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    const saved = localStorage.getItem('restohub_current_view') as AppView;
    if (saved && (role !== 'waiter' || saved === 'waiter') && (role !== 'kitchen' || saved === 'kds')) {
      return saved;
    }
    if (role === 'waiter') return 'waiter';
    if (role === 'kitchen') return 'kds';
    if (role === 'owner') return 'dashboard';
    return 'pos';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Real verified role derived from authentication
  const activeRole: RoleType = role;
  const setActiveRole = (_newRole: RoleType) => {
    console.info('Role changes are controlled via authenticated session.');
  };

  // Restaurant & Outlets
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [activeOutlet, setActiveOutletState] = useState<Outlet | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart & Order Details
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [activeExistingOrderId, setActiveExistingOrderId] = useState<string | null>(null);
  const [paidAmountPaise, setPaidAmountPaise] = useState<number>(0);
  const [pendingTableOrders, setPendingTableOrders] = useState<{ table: DiningTable; orders: Order[] } | null>(null);
  const [orderType, setOrderTypeState] = useState<OrderType>('dine_in');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(4);
  const [discountPaise, setDiscountPaise] = useState<number>(0);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // View protection based on authenticated role
  useEffect(() => {
    if (isLoading) return; // Wait until session loading finishes before evaluating role restrictions

    if (role === 'waiter' && currentView !== 'waiter') {
      setCurrentViewState('waiter');
      localStorage.setItem('restohub_current_view', 'waiter');
    } else if (role === 'kitchen' && currentView !== 'kds') {
      setCurrentViewState('kds');
      localStorage.setItem('restohub_current_view', 'kds');
    } else if (role === 'superadmin' && workspace !== 'superadmin') {
      setWorkspaceState('superadmin');
      setCurrentViewState('superadmin');
    }
  }, [role, currentView, workspace, isLoading]);

  const setWorkspace = (ws: WorkspaceType) => {
    if (ws === 'superadmin' && !isSuperAdmin) {
      addToast('Access Denied: Super Admin console requires platform administrator privileges', 'error');
      return;
    }
    setWorkspaceState(ws);
  };

  const setCurrentView = (view: AppView) => {
    if (role === 'waiter' && view !== 'waiter') {
      addToast('Access Restricted: Waiter workspace only.', 'warning');
      return;
    }
    if (role === 'kitchen' && view !== 'kds') {
      addToast('Access Restricted: Kitchen Display System only.', 'warning');
      return;
    }
    if (view === 'superadmin' && !isSuperAdmin) {
      addToast('Access Denied: Platform Administrator privileges required.', 'error');
      return;
    }
    localStorage.setItem('restohub_current_view', view);
    setCurrentViewState(view);
  };

  // Branch switching guard
  const setActiveOutlet = (outlet: Outlet) => {
    if (authorizedOutletId) {
      const isMatch =
        outlet.id === authorizedOutletId ||
        (authorizedOutletId === 'e7b1a0e1-0000-4000-8000-000000000011' &&
          (outlet.code === 'IND' || outlet.id === 'outlet-blr-01')) ||
        (authorizedOutletId === 'e7b1a0e1-0000-4000-8000-000000000012' &&
          (outlet.code === 'KOR' || outlet.id === 'outlet-blr-02'));

      if (!isMatch) {
        addToast(`Access Restricted: You are assigned strictly to ${activeOutlet?.name || 'your authorized branch'}.`, 'warning');
        return;
      }
    }
    setActiveOutletState(outlet);
  };

  // Initialize Restaurant, Settings & Default Table selection
  useEffect(() => {
    const initTenantData = async () => {
      // Clear active cart and selection state to prevent cross-tenant order leakage
      setSelectedTable(null);
      setActiveExistingOrderId(null);
      setCartItems([]);
      setDiscountPaise(0);
      setPaidAmountPaise(0);

      let res: Restaurant | null = null;
      const targetRestaurantId = membership?.restaurantId || kdsDevice?.restaurantId;
      if (targetRestaurantId) {
        res = await localRepository.loadRestaurantFromSupabase(targetRestaurantId, authorizedOutletId || undefined);
        if (!res) {
          addToast('Unable to verify restaurant data from database. Please reload or re-authenticate.', 'error');
        }
      } else {
        res = await localRepository.getRestaurant();
      }

      setRestaurant(res);
      setSettings(res?.settings || null);

      let chosenOutlet: Outlet | null = null;
      if (res?.outlets && res.outlets.length > 0) {
        if (authorizedOutletId) {
          chosenOutlet =
            res.outlets.find(
              (o) =>
                o.id === authorizedOutletId ||
                (authorizedOutletId === 'e7b1a0e1-0000-4000-8000-000000000011' &&
                  (o.code === 'IND' || o.id === 'outlet-blr-01')) ||
                (authorizedOutletId === 'e7b1a0e1-0000-4000-8000-000000000012' &&
                  (o.code === 'KOR' || o.id === 'outlet-blr-02'))
            ) || res.outlets[0];
        } else {
          chosenOutlet = res.outlets[0];
        }
        setActiveOutletState(chosenOutlet);
      }

      // Initialize table selection for the outlet if tables exist
      if (chosenOutlet) {
        const tables = await localRepository.getTables(chosenOutlet.id);
        if (tables.length > 0) {
          const firstActiveTable = tables.find((t) => t.status === 'occupied') || tables[0];
          if (firstActiveTable) {
            setSelectedTable(firstActiveTable);
            if (firstActiveTable.currentOrderId) {
              const ord = await localRepository.getOrderById(firstActiveTable.currentOrderId);
              if (ord && ord.status !== 'completed' && ord.status !== 'cancelled') {
                setActiveExistingOrderId(ord.id);
                setCartItems(ord.items);
                setDiscountPaise(ord.discountPaise || 0);
                setPaidAmountPaise(ord.paidAmountPaise || (ord.paymentStatus === 'paid' ? ord.totalPaise : 0));
                setGuestCount(ord.guestCount || firstActiveTable.guestCount || 4);
              }
            }
          }
        }
      }
    };

    initTenantData();
  }, [membership?.restaurantId, authorizedOutletId, kdsDevice?.restaurantId]);

  // Listen to repository changes to keep POS synchronized
  useEffect(() => {
    const unsub = localRepository.subscribe(() => {
      if (activeExistingOrderId) {
        localRepository.getOrderById(activeExistingOrderId).then((ord) => {
          if (ord) {
            setPaidAmountPaise(ord.paidAmountPaise || (ord.paymentStatus === 'paid' ? ord.totalPaise : 0));
            if (ord.status === 'completed' || ord.status === 'cancelled') {
              setActiveExistingOrderId(null);
              setCartItems([]);
              setDiscountPaise(0);
              setPaidAmountPaise(0);
            }
          }
        });
      }
    });
    return unsub;
  }, [activeExistingOrderId]);

  // Contextual safe order type switcher - never silently convert an existing dine-in order
  const setOrderType = (type: OrderType) => {
    if (orderType === 'dine_in' && type !== 'dine_in' && activeExistingOrderId) {
      // Park the active running dine-in order safely
      setActiveExistingOrderId(null);
      setCartItems([]);
      setDiscountPaise(0);
      setPaidAmountPaise(0);
      addToast('Preserved running dine-in table bill safely.', 'info');
    }
    setOrderTypeState(type);
  };

  // Sync theme with DOM
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('restohub_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('restohub_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);


  const updateSettings = async (partial: Partial<RestaurantSettings>) => {
    const updated = await localRepository.updateRestaurantSettings(partial);
    setSettings(updated);
    addToast('Restaurant settings updated successfully', 'success');
  };

  const updateRestaurantProfile = async (updates: Partial<Restaurant>) => {
    const updated = await localRepository.updateRestaurantProfile(updates, activeRole);
    setRestaurant({ ...updated });
    if (updated.settings) {
      setSettings({ ...updated.settings });
    }
    addToast('Restaurant profile updated successfully', 'success');
  };

  const updateOutletProfile = async (outletId: string, updates: Partial<Outlet>) => {
    const updated = await localRepository.updateOutletProfile(outletId, updates, activeRole);
    if (activeOutlet && activeOutlet.id === outletId) {
      setActiveOutlet({ ...updated });
    }
    const currentRes = await localRepository.getRestaurant();
    setRestaurant({ ...currentRes });
    addToast(`Branch "${updated.name}" updated successfully`, 'success');
  };

  // Cart Operations with immediate authoritative synchronization on running bills
  const addToCart = async (item: MenuItem, variant?: MenuVariant) => {
    const unitPricePaise = variant ? variant.pricePaise : item.basePricePaise;
    const newCartItem: CartItem = {
      cartItemId: `ci-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      menuItem: item,
      variant,
      selectedModifiers: [],
      quantity: 1,
      unitPricePaise,
      subtotalPaise: unitPricePaise,
      kitchenStatus: 'new',
      kotStatus: 'pending',
    };

    if (activeExistingOrderId) {
      try {
        const updated = await localRepository.addItemsToOrder(activeExistingOrderId, [newCartItem]);
        setCartItems(updated.items);
        setDiscountPaise(updated.discountPaise || 0);
        addToast(`Added ${item.name} to running bill`, 'info');
        return;
      } catch (err: any) {
        addToast(err.message || 'Failed to add item', 'error');
      }
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (ci) => ci.menuItem.id === item.id && ci.variant?.id === variant?.id
      );

      if (existingIndex > -1) {
        const copy = [...prev];
        const updatedQty = copy[existingIndex].quantity + 1;
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: updatedQty,
          subtotalPaise: updatedQty * unitPricePaise,
        };
        return copy;
      }

      return [...prev, newCartItem];
    });
  };

  const updateCartQty = async (cartItemId: string, delta: number) => {
    if (activeExistingOrderId) {
      try {
        const updated = await localRepository.updateOrderItemQty(activeExistingOrderId, cartItemId, delta);
        setCartItems(updated.items);
        return;
      } catch (err: any) {
        addToast(err.message || 'Failed to update quantity', 'error');
      }
    }

    setCartItems((prev) =>
      prev
        .map((ci) => {
          if (ci.cartItemId !== cartItemId) return ci;
          const newQty = ci.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...ci,
            quantity: newQty,
            subtotalPaise: newQty * ci.unitPricePaise,
          };
        })
        .filter((ci): ci is CartItem => ci !== null)
    );
  };

  const removeFromCart = async (cartItemId: string) => {
    if (activeExistingOrderId) {
      try {
        const updated = await localRepository.removeOrderItem(activeExistingOrderId, cartItemId);
        setCartItems(updated.items);
        return;
      } catch (err: any) {
        addToast(err.message || 'Failed to remove item', 'error');
      }
    }
    setCartItems((prev) => prev.filter((ci) => ci.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountPaise(0);
    setPaidAmountPaise(0);
    setActiveExistingOrderId(null);
  };

  const applyDiscountPaise = async (paise: number) => {
    setDiscountPaise(paise);
    if (activeExistingOrderId) {
      try {
        const order = await localRepository.getOrderById(activeExistingOrderId);
        if (order) {
          const subtotal = order.items.reduce((acc, i) => acc + i.subtotalPaise, 0);
          const calc = calculateBill(subtotal, paise, settings?.cgstPct ?? 2.5, settings?.sgstPct ?? 2.5);
          order.discountPaise = paise;
          order.subtotalPaise = subtotal;
          order.cgstPaise = calc.cgstPaise;
          order.sgstPaise = calc.sgstPaise;
          order.roundingPaise = calc.roundingPaise;
          order.totalPaise = calc.totalPaise;
          order.updatedAt = new Date().toISOString();
          (localRepository as any).saveOrders();
        }
      } catch {}
    }
  };

  // Open a specific table for billing with reliable running order resolution
  const openTableForBilling = async (table: DiningTable, targetOrderId?: string) => {
    setSelectedTable(table);
    setOrderTypeState('dine_in');
    setGuestCount(table.guestCount || table.seatingCapacity);

    // 1. Direct lookup by targetOrderId if specified
    let existing: Order | null = null;
    if (targetOrderId) {
      existing = await localRepository.getOrderById(targetOrderId);
    } else {
      // Find all active uncompleted orders for this table
      const activeOrders = await localRepository.getActiveOrdersForTable(table.id);
      if (activeOrders.length > 1) {
        setPendingTableOrders({ table, orders: activeOrders });
        return;
      } else if (activeOrders.length === 1) {
        existing = activeOrders[0];
      }
    }

    if (existing && existing.status !== 'completed' && existing.status !== 'cancelled') {
      setActiveExistingOrderId(existing.id);
      setCartItems(existing.items);
      setDiscountPaise(existing.discountPaise || 0);
      setPaidAmountPaise(existing.paidAmountPaise || (existing.paymentStatus === 'paid' ? existing.totalPaise : 0));
      setGuestCount(existing.guestCount || table.seatingCapacity);
      if (existing.customerName) setCustomerName(existing.customerName);
      if (existing.customerPhone) setCustomerPhone(existing.customerPhone);
      setCurrentView('pos');
      addToast(`Loaded running bill ${existing.orderNumber} for Table ${table.tableNumber}`, 'info');
      return;
    }

    // New order for available table
    setActiveExistingOrderId(null);
    setCartItems([]);
    setDiscountPaise(0);
    setPaidAmountPaise(0);
    setCurrentView('pos');
    addToast(`Ready to take new order for Table ${table.tableNumber}`, 'info');
  };

  const startNewTakeawayOrder = () => {
    setSelectedTable(null);
    setOrderType('takeaway');
    setActiveExistingOrderId(null);
    setCartItems([]);
    setDiscountPaise(0);
    setCurrentView('pos');
    addToast('Ready to take new Takeaway order', 'info');
  };

  const startNewDeliveryOrder = (details?: {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    deliveryInstructions?: string;
  }) => {
    setSelectedTable(null);
    setOrderType('delivery');
    setActiveExistingOrderId(null);
    setCartItems([]);
    setDiscountPaise(0);
    if (details) {
      if (details.customerName) setCustomerName(details.customerName);
      if (details.customerPhone) setCustomerPhone(details.customerPhone);
      if (details.customerAddress) setCustomerAddress(details.customerAddress);
      if (details.deliveryInstructions) setDeliveryInstructions(details.deliveryInstructions);
    }
    setCurrentView('pos');
    addToast('Ready to take new Delivery order', 'info');
  };

  // Authoritative Calculation based on active settings
  const subtotalPaise = cartItems.reduce((acc, i) => acc + i.subtotalPaise, 0);
  const activeCgstPct = settings?.cgstPct ?? 2.5;
  const activeSgstPct = settings?.sgstPct ?? 2.5;

  const calculation = calculateBill(subtotalPaise, discountPaise, activeCgstPct, activeSgstPct);
  const cgstPaise = calculation.cgstPaise;
  const sgstPaise = calculation.sgstPaise;
  const totalPaise = calculation.totalPaise;
  const balanceDuePaise = Math.max(0, totalPaise - paidAmountPaise);

  const submitActiveOrder = async (): Promise<Order> => {
    if (cartItems.length === 0) {
      throw new Error('Cannot submit an empty order');
    }

    // If an existing order is active on this table, append/update instead of duplicate!
    if (activeExistingOrderId) {
      const updated = await localRepository.addItemsToOrder(activeExistingOrderId, cartItems);
      addToast(`Updated order ${updated.orderNumber} with new items`, 'success');
      return updated;
    }

    const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
      orderNumber: '',
      restaurantId: restaurant?.id || '',
      outletId: activeOutlet?.id || '',
      orderType,
      tableId: orderType === 'dine_in' ? selectedTable?.id : undefined,
      tableName: orderType === 'dine_in' && selectedTable ? `Table ${selectedTable.tableNumber.replace('T', '')}` : undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerAddress: orderType === 'delivery' ? customerAddress : undefined,
      deliveryInstructions: orderType === 'delivery' ? deliveryInstructions : undefined,
      guestCount: orderType === 'dine_in' ? guestCount : 1,
      items: cartItems,
      status: 'confirmed',
      paymentStatus: 'pending',
      subtotalPaise,
      discountPaise,
      cgstPaise,
      sgstPaise,
      roundingPaise: calculation.roundingPaise,
      totalPaise,
    };

    const created = await localRepository.createOrder(orderData);
    setActiveExistingOrderId(created.id);
    addToast(`Order ${created.orderNumber} placed & sent to Kitchen!`, 'success');
    clearCart();
    return created;
  };

  return (
    <AppContext.Provider
      value={{
        isDark,
        toggleTheme,
        workspace,
        setWorkspace,
        currentView,
        setCurrentView,
        activeRole,
        setActiveRole,
        restaurant,
        settings,
        activeOutlet,
        setActiveOutlet,
        updateSettings,
        updateRestaurantProfile,
        updateOutletProfile,
        searchQuery,
        setSearchQuery,
        cartItems,
        selectedTable,
        orderType,
        customerName,
        customerPhone,
        customerAddress,
        deliveryInstructions,
        guestCount,
        discountPaise,
        subtotalPaise,
        cgstPaise,
        sgstPaise,
        totalPaise,
        paidAmountPaise,
        balanceDuePaise,
        activeExistingOrderId,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        setSelectedTable,
        setOrderType,
        setCustomerName,
        setCustomerPhone,
        setCustomerAddress,
        setDeliveryInstructions,
        setGuestCount,
        applyDiscountPaise,
        openTableForBilling,
        pendingTableOrders,
        setPendingTableOrders,
        startNewTakeawayOrder,
        startNewDeliveryOrder,
        submitActiveOrder,
        toasts,
        addToast,
        dismissToast,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

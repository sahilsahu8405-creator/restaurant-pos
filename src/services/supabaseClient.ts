import { createClient } from '@supabase/supabase-js';
import {
  AuditLog,
  KitchenNotification,
  Restaurant,
  Outlet,
  UserProfile,
  RestaurantMembership,
  StaffInvitation,
  KdsDeviceSession,
  MenuCategory,
  MenuItem,
  DiningTable,
  DiningSection,
  Order,
  CartItem,
  InventoryItem,
  ExpenseRecord,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lolbdfykmoarhblkjgaa.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseOrderRow {
  id: string;
  restaurant_id: string;
  outlet_id: string;
  order_number: string;
  order_type: string;
  status: string;
  payment_status: string;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_paise: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseOrderItemRow {
  id: string;
  order_id: string;
  item_id: string;
  item_name_snapshot: string;
  unit_price_paise: number;
  quantity: number;
  subtotal_paise: number;
  kitchen_status: string;
  created_at: string;
}

export interface SupabaseExpenseRow {
  id: string;
  outlet_id: string;
  category: string;
  amount_paise: number;
  payment_method: string;
  description: string;
  expense_date: string;
  created_at: string;
}

export interface SupabasePaymentRow {
  id: string;
  restaurant_id: string;
  outlet_id: string;
  order_id: string;
  payment_method: string;
  amount_paise: number;
  status: string;
  transaction_reference?: string;
  created_at: string;
}

// Fetch orders, items and expenses with exact date range and outlet filtering
export async function getLiveDashboardData(
  outletId?: string,
  dateRange: 'today' | 'week' | 'month' | 'all' = 'month'
) {
  const now = new Date();
  let startDate: Date | null = null;

  if (dateRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (dateRange === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
  } else if (dateRange === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  // 1. Fetch Orders
  let ordersQuery = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (outletId && outletId !== 'all') {
    ordersQuery = ordersQuery.eq('outlet_id', outletId);
  }
  if (startDate) {
    ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
  }

  // 2. Fetch Expenses
  let expensesQuery = supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (outletId && outletId !== 'all') {
    expensesQuery = expensesQuery.eq('outlet_id', outletId);
  }
  if (startDate) {
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, '0');
    const dd = String(startDate.getDate()).padStart(2, '0');
    const isoDateStr = `${yyyy}-${mm}-${dd}`;
    expensesQuery = expensesQuery.gte('expense_date', isoDateStr);
  }

  // 3. Fetch Payments
  let paymentsQuery = supabase
    .from('payments')
    .select('*')
    .eq('status', 'completed');

  if (outletId && outletId !== 'all') {
    paymentsQuery = paymentsQuery.eq('outlet_id', outletId);
  }
  if (startDate) {
    paymentsQuery = paymentsQuery.gte('created_at', startDate.toISOString());
  }

  const [ordersRes, expensesRes, paymentsRes] = await Promise.all([
    ordersQuery,
    expensesQuery,
    paymentsQuery,
  ]);

  const orders = (ordersRes.data as SupabaseOrderRow[]) || [];
  const expenses = (expensesRes.data as SupabaseExpenseRow[]) || [];
  const payments = (paymentsRes.data as SupabasePaymentRow[]) || [];

  // Fetch Order Items for the fetched orders
  let orderItems: SupabaseOrderItemRow[] = [];
  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);
    orderItems = (itemsData as SupabaseOrderItemRow[]) || [];
  }

  return {
    orders,
    orderItems,
    expenses,
    payments,
    isLive: true,
  };
}

// Singleton Outlet Realtime Channel Manager
interface OutletChannelManager {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<() => void>;
}

const outletManagers = new Map<string, OutletChannelManager>();

export function getOutletRealtimeChannel(outletId?: string) {
  const resolved = resolveOutletId(outletId) || outletId;
  const safeOutletId = resolved && resolved !== 'all' ? resolved : 'global';
  const channelKey = `outlet-ops-${safeOutletId}`;

  let mgr = outletManagers.get(channelKey);
  if (!mgr) {
    const listeners = new Set<() => void>();
    const notifyAll = () => {
      listeners.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };

    const channel = supabase.channel(channelKey, {
      config: {
        broadcast: { ack: true, self: false },
      },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(outletId && outletId !== 'all' ? { filter: `outlet_id=eq.${outletId}` } : {}),
        },
        notifyAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          ...(outletId && outletId !== 'all' ? { filter: `outlet_id=eq.${outletId}` } : {}),
        },
        notifyAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          ...(outletId && outletId !== 'all' ? { filter: `outlet_id=eq.${outletId}` } : {}),
        },
        notifyAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dining_tables',
        },
        notifyAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kot_tickets',
        },
        notifyAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_notifications',
          ...(outletId && outletId !== 'all' ? { filter: `outlet_id=eq.${outletId}` } : {}),
        },
        notifyAll
      )
      .on('broadcast', { event: 'food_ready' }, (msg: any) => {
        if (typeof window !== 'undefined' && msg?.payload) {
          window.dispatchEvent(
            new CustomEvent('restohub:food-ready-notification', { detail: msg.payload })
          );
        }
        notifyAll();
      })
      .on('broadcast', { event: 'new_kot' }, (msg: any) => {
        if (typeof window !== 'undefined' && msg?.payload) {
          window.dispatchEvent(
            new CustomEvent('restohub:new-kot-ticket', { detail: msg.payload })
          );
        }
        notifyAll();
      })
      .on('broadcast', { event: 'order_updated' }, () => {
        notifyAll();
      })
      .on('broadcast', { event: 'ticket_status' }, () => {
        notifyAll();
      })
      .subscribe();

    mgr = { channel, listeners };
    outletManagers.set(channelKey, mgr);
  }

  return { channelKey, channel: mgr.channel, listeners: mgr.listeners };
}

// Broadcast an operational event to all connected devices in this outlet via Supabase WebSocket
export async function broadcastOperationalEvent(
  outletId: string | undefined,
  eventName: 'food_ready' | 'new_kot' | 'order_updated' | 'ticket_status',
  payload: any
): Promise<void> {
  try {
    const { channel } = getOutletRealtimeChannel(outletId);
    await channel.send({
      type: 'broadcast',
      event: eventName,
      payload,
    });
  } catch (err) {
    console.warn(`[Realtime Broadcast] Failed to send ${eventName}:`, err);
  }
}

// Supabase Realtime Listener for live updates across all devices
export function subscribeToOperationalChanges(
  onUpdate: () => void,
  outletId?: string
) {
  const { listeners } = getOutletRealtimeChannel(outletId);
  listeners.add(onUpdate);

  return () => {
    listeners.delete(onUpdate);
  };
}

// Upload Dish Image to Supabase Storage bucket 'menu-images'
export async function uploadDishImage(file: File): Promise<{ url: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanExt = fileExt.toLowerCase();
    const fileName = `dish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
    const filePath = `dishes/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadErr) {
      throw uploadErr;
    }

    const { data: publicData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return { url: publicData.publicUrl };
  } catch (err: any) {
    console.warn('Supabase storage upload failed, falling back to local object URL:', err);
    // Provide persistent blob URL fallback so user is never blocked
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string });
      reader.onerror = () => resolve({ url: URL.createObjectURL(file) });
      reader.readAsDataURL(file);
    });
  }
}

// Helper to resolve outlet ID safely without hardcoding single-tenant constants
export function resolveOutletId(outletId?: string): string | undefined {
  if (!outletId || outletId === 'all') return undefined;
  if (outletId === 'outlet-blr-02') return 'e7b1a0e1-0000-4000-8000-000000000012';
  if (outletId === 'outlet-blr-01') return 'e7b1a0e1-0000-4000-8000-000000000011';
  return outletId;
}

export function isSameOutlet(outletA?: string | null, outletB?: string | null): boolean {
  if (!outletA || !outletB) return true;
  if (outletA === outletB) return true;
  const canonicalA = resolveOutletId(outletA) || outletA;
  const canonicalB = resolveOutletId(outletB) || outletB;
  return canonicalA === canonicalB;
}

// Sync KOT tickets to Supabase kot_tickets table
export async function syncKotTicketsToSupabase(tickets: any[]) {
  if (!tickets || tickets.length === 0) return;
  try {
    const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rows = tickets.map((t) => {
      const dbOutlet = resolveOutletId(t.outletId) || t.outletId;
      const safeId = isUuidPattern.test(t.id) ? t.id : crypto.randomUUID();
      const safeOrderId = t.orderId && isUuidPattern.test(t.orderId) ? t.orderId : null;
      const safeStationId = t.stationId && isUuidPattern.test(t.stationId) ? t.stationId : null;

      return {
        id: safeId,
        outlet_id: dbOutlet,
        order_id: safeOrderId,
        kot_number: t.kotNumber,
        ticket_type: t.ticketType || 'new',
        status: t.status || 'sent',
        station_id: safeStationId,
        station_name: t.stationName || null,
        table_number: t.tableNumber || null,
        items: t.items || [],
        created_at: t.createdAt || new Date().toISOString(),
      };
    });

    const { error } = await supabase.from('kot_tickets').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Network sync of KOT tickets to Supabase error:', error.message);
    }
  } catch (err) {
    console.warn('Network sync of KOT tickets to Supabase skipped:', err);
  }
}

export async function updateKotTicketStatusInSupabase(ticketId: string, status: string) {
  try {
    const { error } = await supabase.from('kot_tickets').update({ status }).eq('id', ticketId);
    if (error) {
      console.warn('Failed to update ticket status in Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Failed to update ticket status in Supabase:', err);
  }
}

// Fetch KOT tickets from Supabase kot_tickets table
export async function fetchSupabaseKotTickets(outletId?: string): Promise<any[]> {
  try {
    const dbOutlet = resolveOutletId(outletId);
    let query = supabase.from('kot_tickets').select('*').order('created_at', { ascending: false }).limit(100);
    if (dbOutlet) {
      query = query.eq('outlet_id', dbOutlet);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      outletId: row.outlet_id,
      orderId: row.order_id,
      orderNumber: row.kot_number.split('-')[0] || row.kot_number,
      tableNumber: row.table_number || 'Table',
      kotNumber: row.kot_number,
      stationId: row.station_id || undefined,
      stationName: row.station_name || undefined,
      ticketType: row.ticket_type,
      items: row.items || [],
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

// Helper to resolve restaurant ID safely without falling back to Spice Garden
export function resolveRestaurantId(restaurantId?: string): string | undefined {
  if (!restaurantId) return undefined;
  if (restaurantId === 'rest-001') return 'e7b1a0e1-0000-4000-8000-000000000001';
  return restaurantId;
}

// Dining Sections CRUD
export async function fetchSupabaseSections(outletId?: string): Promise<DiningSection[]> {
  const dbOutlet = resolveOutletId(outletId);
  if (!dbOutlet) return [];
  const { data, error } = await supabase
    .from('dining_sections')
    .select('*')
    .eq('outlet_id', dbOutlet)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('Failed to fetch dining sections from Supabase:', error.message);
    return [];
  }
  return (data || []).map((s: any) => ({
    id: s.id,
    outletId: s.outlet_id,
    name: s.name,
    sortOrder: s.sort_order || 1,
  }));
}

export async function upsertSupabaseSection(section: { id?: string; outletId: string; name: string; sortOrder?: number }): Promise<DiningSection> {
  const dbOutlet = resolveOutletId(section.outletId) || section.outletId;
  const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const payload: any = {
    outlet_id: dbOutlet,
    name: section.name,
    sort_order: section.sortOrder || 1,
  };
  if (section.id && isUuidPattern.test(section.id)) {
    payload.id = section.id;
  }
  const { data, error } = await supabase.from('dining_sections').upsert(payload).select().single();
  if (error) {
    console.error('upsertSupabaseSection error:', error);
    throw error;
  }
  return {
    id: data.id,
    outletId: data.outlet_id,
    name: data.name,
    sortOrder: data.sort_order || 1,
  };
}

export async function deleteSupabaseSection(sectionId: string) {
  const { error } = await supabase.from('dining_sections').delete().eq('id', sectionId);
  if (error) throw error;
}

// Dining Tables CRUD
export async function fetchSupabaseTables(outletId?: string): Promise<DiningTable[]> {
  const dbOutlet = resolveOutletId(outletId);
  if (!dbOutlet) return [];
  const { data, error } = await supabase
    .from('dining_tables')
    .select('*, dining_sections(name)')
    .eq('outlet_id', dbOutlet)
    .order('table_number', { ascending: true });
  if (error) {
    console.warn('Failed to fetch dining tables from Supabase:', error.message);
    return [];
  }
  return (data || [])
    .filter((t: any) => t.is_active !== false)
    .map((t: any) => ({
      id: t.id,
      outletId: t.outlet_id,
      section: t.dining_sections?.name || 'Main Hall',
      sectionId: t.section_id,
      tableNumber: t.table_number,
      seatingCapacity: t.seating_capacity || 4,
      status: (t.status as any) || 'available',
      shape: t.shape || 'square',
      posX: Number(t.pos_x) || 100,
      posY: Number(t.pos_y) || 100,
      isActive: t.is_active ?? true,
    }));
}

export async function upsertSupabaseTable(table: any): Promise<DiningTable> {
  const dbOutlet = resolveOutletId(table.outletId) || table.outletId;
  const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 1. Ensure valid non-null section_id
  let resolvedSectionId: string | null = null;
  if (table.sectionId && isUuidPattern.test(table.sectionId)) {
    const { data: secCheck } = await supabase
      .from('dining_sections')
      .select('id')
      .eq('id', table.sectionId)
      .maybeSingle();
    if (secCheck?.id) {
      resolvedSectionId = secCheck.id;
    }
  }

  if (!resolvedSectionId) {
    const { data: existingSecs } = await supabase
      .from('dining_sections')
      .select('id, name')
      .eq('outlet_id', dbOutlet)
      .limit(1);

    if (existingSecs && existingSecs.length > 0) {
      resolvedSectionId = existingSecs[0].id;
    } else {
      const { data: newSec, error: secErr } = await supabase
        .from('dining_sections')
        .insert({
          outlet_id: dbOutlet,
          name: table.section || 'Main Dining',
          sort_order: 1,
        })
        .select()
        .single();
      if (!secErr && newSec) {
        resolvedSectionId = newSec.id;
      }
    }
  }

  const payload: any = {
    outlet_id: dbOutlet,
    section_id: resolvedSectionId,
    table_number: table.tableNumber,
    seating_capacity: table.seatingCapacity || 4,
    status: table.status || 'available',
    pos_x: table.posX ?? 0,
    pos_y: table.posY ?? 0,
    shape: table.shape || 'square',
    is_active: table.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  if (table.id && isUuidPattern.test(table.id)) {
    payload.id = table.id;
  } else if (table.tableNumber) {
    // If updating an existing table by table_number for this outlet
    const { data: existingByNum } = await supabase
      .from('dining_tables')
      .select('id')
      .eq('outlet_id', dbOutlet)
      .eq('table_number', table.tableNumber)
      .maybeSingle();
    if (existingByNum?.id) {
      payload.id = existingByNum.id;
    }
  }

  const { data, error } = await supabase.from('dining_tables').upsert(payload).select('*, dining_sections(name)').single();
  if (error) {
    console.error('upsertSupabaseTable error:', error);
    throw error;
  }

  return {
    id: data.id,
    outletId: data.outlet_id,
    section: data.dining_sections?.name || table.section || 'Main Hall',
    sectionId: data.section_id,
    tableNumber: data.table_number,
    seatingCapacity: data.seating_capacity,
    status: data.status,
    shape: data.shape,
    posX: Number(data.pos_x) || 0,
    posY: Number(data.pos_y) || 0,
    isActive: data.is_active ?? true,
  };
}

export async function deleteSupabaseTable(tableId: string) {
  const { error } = await supabase.from('dining_tables').delete().eq('id', tableId);
  if (error) throw error;
}

// Menu Categories CRUD
export async function fetchSupabaseCategories(restaurantId: string): Promise<MenuCategory[]> {
  const dbRestaurantId = resolveRestaurantId(restaurantId);
  if (!dbRestaurantId) return [];
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', dbRestaurantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('Failed to fetch categories from Supabase:', error.message);
    return [];
  }
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.description || c.name.toLowerCase().replace(/\s+/g, '-'),
    sortOrder: c.sort_order || 1,
    isActive: c.is_active ?? true,
  }));
}

export async function saveSupabaseCategory(category: { id?: string; restaurantId: string; name: string; slug?: string; sortOrder?: number }): Promise<MenuCategory> {
  const dbRestaurantId = resolveRestaurantId(category.restaurantId) || category.restaurantId;
  const payload: any = {
    restaurant_id: dbRestaurantId,
    name: category.name,
    description: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
    sort_order: category.sortOrder || 1,
    is_active: true,
  };
  if (category.id && category.id.includes('-') && category.id.length >= 32) {
    payload.id = category.id;
  }
  const { data, error } = await supabase.from('menu_categories').upsert(payload).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    slug: data.description,
    sortOrder: data.sort_order,
    isActive: data.is_active,
  };
}

export async function deleteSupabaseCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.from('menu_categories').delete().eq('id', categoryId);
  if (error) throw error;
}

// Menu Items CRUD
export async function fetchSupabaseMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const dbRestaurantId = resolveRestaurantId(restaurantId);
  if (!dbRestaurantId) return [];
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_variants(*)')
    .eq('restaurant_id', dbRestaurantId)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('Failed to fetch menu items from Supabase:', error.message);
    return [];
  }
  return (data || []).map((m: any) => ({
    id: m.id,
    categoryId: m.category_id,
    name: m.name,
    description: m.description || '',
    imageUrl: m.image_url || '',
    foodType: (m.food_type as any) || 'veg',
    dietaryType: m.dietary_type,
    stationId: m.station_id,
    basePricePaise: m.base_price_paise || 0,
    isAvailable: m.is_available ?? true,
    isBestseller: m.is_bestseller ?? false,
    cgstPct: Number(m.cgst_pct) || 2.5,
    sgstPct: Number(m.sgst_pct) || 2.5,
    variants: (m.menu_variants || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      pricePaise: v.price_paise,
      isDefault: v.is_default ?? false,
    })),
    sortOrder: m.sort_order || 1,
  }));
}

export async function saveSupabaseMenuItem(item: Partial<MenuItem> & { name: string; basePricePaise: number; categoryId: string; restaurantId: string }): Promise<MenuItem> {
  const dbRestaurantId = resolveRestaurantId(item.restaurantId) || item.restaurantId;
  if (!dbRestaurantId) {
    throw new Error('Restaurant ID is required to save menu item');
  }

  // 1. Resolve safe category_id (UUID format that exists in menu_categories)
  let resolvedCategoryId: string = item.categoryId;
  const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let categoryValid = false;

  if (resolvedCategoryId && isUuidPattern.test(resolvedCategoryId)) {
    const { data: catRow } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('id', resolvedCategoryId)
      .maybeSingle();
    if (catRow?.id) {
      categoryValid = true;
    }
  }

  if (!categoryValid) {
    // Check if any category exists for this restaurant in Supabase
    const { data: existingCats } = await supabase
      .from('menu_categories')
      .select('id, name')
      .eq('restaurant_id', dbRestaurantId)
      .limit(5);

    if (existingCats && existingCats.length > 0) {
      resolvedCategoryId = existingCats[0].id;
    } else {
      // Create a default category for the restaurant
      const { data: createdCat, error: catCreateErr } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: dbRestaurantId,
          name: 'Main Course',
          description: 'main-course',
          sort_order: 1,
          is_active: true,
        })
        .select()
        .single();

      if (catCreateErr || !createdCat) {
        throw new Error('Failed to create default category for restaurant: ' + (catCreateErr?.message || 'unknown error'));
      }
      resolvedCategoryId = createdCat.id;
    }
  }

  // 2. Resolve safe station_id (must be a valid UUID that exists in kitchen_stations, or null)
  let safeStationId: string | null = null;
  if (item.stationId && isUuidPattern.test(item.stationId)) {
    const { data: stationRow } = await supabase
      .from('kitchen_stations')
      .select('id')
      .eq('id', item.stationId)
      .maybeSingle();
    if (stationRow?.id) {
      safeStationId = stationRow.id;
    }
  }

  const payload: any = {
    restaurant_id: dbRestaurantId,
    category_id: resolvedCategoryId,
    name: item.name,
    description: item.description || '',
    image_url: item.imageUrl || '',
    food_type: item.foodType || 'veg',
    dietary_type: item.dietaryType || null,
    station_id: safeStationId,
    base_price_paise: item.basePricePaise,
    is_available: item.isAvailable ?? true,
    is_bestseller: item.isBestseller ?? false,
    cgst_pct: item.cgstPct ?? 2.5,
    sgst_pct: item.sgstPct ?? 2.5,
    sort_order: item.sortOrder || 1,
  };

  if (item.id && isUuidPattern.test(item.id)) {
    payload.id = item.id;
  }

  const { data, error } = await supabase.from('menu_items').upsert(payload).select().single();
  if (error) {
    console.error('saveSupabaseMenuItem upsert error:', error);
    throw error;
  }

  return {
    id: data.id,
    categoryId: data.category_id,
    name: data.name,
    description: data.description || '',
    imageUrl: data.image_url || '',
    foodType: data.food_type,
    dietaryType: data.dietary_type,
    stationId: data.station_id,
    basePricePaise: data.base_price_paise,
    isAvailable: data.is_available,
    isBestseller: data.is_bestseller,
    cgstPct: Number(data.cgst_pct),
    sgstPct: Number(data.sgst_pct),
    sortOrder: data.sort_order,
    variants: item.variants || [],
  };
}

export async function deleteSupabaseMenuItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
  if (error) throw error;
}

// Orders Fetching
export async function fetchSupabaseOrders(outletId?: string, restaurantId?: string): Promise<Order[]> {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  const dbOutlet = resolveOutletId(outletId);
  if (dbOutlet) {
    query = query.eq('outlet_id', dbOutlet);
  }
  const dbRest = resolveRestaurantId(restaurantId);
  if (dbRest) {
    query = query.eq('restaurant_id', dbRest);
  }
  const { data: ordersData, error: ordersErr } = await query;
  if (ordersErr || !ordersData) {
    return [];
  }
  if (ordersData.length === 0) return [];

  const orderIds = ordersData.map((o: any) => o.id);
  const { data: itemsData } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  const itemsByOrder: Record<string, CartItem[]> = {};
  (itemsData || []).forEach((row: any) => {
    if (!itemsByOrder[row.order_id]) itemsByOrder[row.order_id] = [];
    itemsByOrder[row.order_id].push({
      cartItemId: row.id,
      menuItem: {
        id: row.item_id,
        categoryId: '',
        name: row.item_name_snapshot,
        description: '',
        imageUrl: '',
        foodType: 'veg',
        basePricePaise: row.unit_price_paise,
        isAvailable: true,
        cgstPct: 2.5,
        sgstPct: 2.5,
      },
      quantity: row.quantity,
      unitPricePaise: row.unit_price_paise,
      subtotalPaise: row.subtotal_paise,
      notes: row.notes,
      kitchenStatus: row.kitchen_status,
      selectedModifiers: [],
    });
  });

  return ordersData.map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    restaurantId: o.restaurant_id,
    outletId: o.outlet_id,
    orderType: o.order_type,
    tableId: o.table_id || undefined,
    customerName: o.customer_name || undefined,
    customerPhone: o.customer_phone || undefined,
    guestCount: o.guest_count || 2,
    items: itemsByOrder[o.id] || [],
    status: o.status,
    paymentStatus: o.payment_status,
    subtotalPaise: o.subtotal_paise || 0,
    discountPaise: o.discount_paise || 0,
    taxPaise: o.tax_paise || 0,
    cgstPaise: Math.round((o.tax_paise || 0) / 2),
    sgstPaise: Math.round((o.tax_paise || 0) / 2),
    roundingPaise: o.rounding_paise || 0,
    totalPaise: o.total_paise || 0,
    notes: o.notes || undefined,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }));
}

// Inventory Fetching & Upsert
export async function fetchSupabaseInventory(restaurantId: string): Promise<InventoryItem[]> {
  const dbRestaurantId = resolveRestaurantId(restaurantId);
  if (!dbRestaurantId) return [];
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('restaurant_id', dbRestaurantId)
    .order('name', { ascending: true });
  if (error) {
    console.warn('Failed to fetch inventory from Supabase:', error.message);
    return [];
  }
  return (data || []).map((i: any) => ({
    id: i.id,
    restaurantId: i.restaurant_id,
    outletId: i.outlet_id,
    name: i.name,
    category: i.category || 'General',
    unit: i.unit || 'kg',
    currentStock: Number(i.current_stock) || 0,
    minThreshold: Number(i.min_threshold) || 0,
    costPerUnitPaise: i.cost_per_unit_paise || 0,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }));
}

export async function saveSupabaseInventoryItem(item: Partial<InventoryItem> & { name: string; restaurantId: string; outletId: string; costPerUnitPaise: number }): Promise<void> {
  const payload: any = {
    restaurant_id: item.restaurantId,
    outlet_id: item.outletId,
    name: item.name,
    category: item.category || 'General',
    unit: item.unit || 'kg',
    current_stock: item.currentStock || 0,
    min_threshold: item.minThreshold || 0,
    cost_per_unit_paise: item.costPerUnitPaise,
  };
  if (item.id && item.id.includes('-') && item.id.length >= 32) {
    payload.id = item.id;
  }
  await supabase.from('inventory_items').upsert(payload);
}

// Expenses Fetching
export async function fetchSupabaseExpenses(restaurantId: string, outletId?: string): Promise<ExpenseRecord[]> {
  let query = supabase.from('expenses').select('*').order('created_at', { ascending: false });
  const dbOutlet = resolveOutletId(outletId);
  if (dbOutlet) {
    query = query.eq('outlet_id', dbOutlet);
  }
  const { data, error } = await query;
  if (error) {
    console.warn('Failed to fetch expenses from Supabase:', error.message);
    return [];
  }
  return (data || []).map((e: any) => ({
    id: e.id,
    outletId: e.outlet_id,
    category: e.category,
    amountPaise: e.amount_paise,
    paymentMethod: e.payment_method,
    description: e.description || '',
    date: e.expense_date || (e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    createdAt: e.created_at,
  }));
}

// Resolve Staff Login Email via Restaurant ID / Slug and Branch Code
export async function resolveStaffLoginEmail(
  identifier: string,
  restaurantIdentifier?: string,
  branchCode?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('resolve_staff_login_email', {
      p_identifier: identifier.trim(),
      p_restaurant_identifier: restaurantIdentifier ? restaurantIdentifier.trim() : null,
      p_branch_code: branchCode ? branchCode.trim() : null,
    });
    if (!error) return data;
  } catch {
    // Fall back to 2-arg signature if needed
  }

  const { data, error } = await supabase.rpc('resolve_staff_login_email', {
    p_identifier: identifier.trim(),
    p_restaurant_slug: restaurantIdentifier ? restaurantIdentifier.trim() : null,
  });
  if (error) throw error;
  return data;
}

// Recipe Items & Food Costing
export async function fetchSupabaseRecipeItems(menuItemId?: string) {
  let query = supabase.from('recipe_items').select('*, inventory_items(name, unit, cost_per_unit_paise)');
  if (menuItemId) {
    query = query.eq('menu_item_id', menuItemId);
  }
  const { data, error } = await query;
  if (error) {
    console.warn('Failed to fetch recipe items from Supabase:', error.message);
    return null;
  }
  return data;
}

export async function upsertSupabaseRecipeItem(recipe: any) {
  const restId = resolveRestaurantId(recipe.restaurantId);
  const payload: any = {
    restaurant_id: restId,
    menu_item_id: recipe.menuItemId,
    inventory_item_id: recipe.inventoryItemId,
    quantity: recipe.quantity,
    unit: recipe.unit,
    packaging_cost_paise: recipe.packagingCostPaise || 0,
    direct_prep_cost_paise: recipe.directPrepCostPaise || 0,
    updated_at: new Date().toISOString(),
  };
  if (recipe.id && recipe.id.includes('-') && recipe.id.length >= 32) {
    payload.id = recipe.id;
  }
  const { data, error } = await supabase.from('recipe_items').upsert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSupabaseRecipeItem(recipeId: string) {
  const { error } = await supabase.from('recipe_items').delete().eq('id', recipeId);
  if (error) throw error;
}

export async function syncOrderToSupabase(order: any) {
  try {
    const restaurantId = resolveRestaurantId(order.restaurantId);
    const outletId = resolveOutletId(order.outletId) || order.outletId;
    const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const orderPayload: any = {
      restaurant_id: restaurantId,
      outlet_id: outletId,
      order_number: order.orderNumber,
      order_type: order.orderType,
      table_id: order.tableId && isUuidPattern.test(order.tableId) ? order.tableId : null,
      customer_name: order.customerName || (order.tableName ? order.tableName : null),
      guest_count: order.guestCount || 1,
      status: order.status,
      payment_status: order.paymentStatus,
      subtotal_paise: order.subtotalPaise,
      discount_paise: order.discountPaise || 0,
      tax_paise: (order.cgstPaise || 0) + (order.sgstPaise || 0),
      rounding_paise: order.roundingPaise || 0,
      total_paise: order.totalPaise,
      notes: order.notes || (order.tableName ? `Table: ${order.tableName}` : null),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };

    if (order.id && isUuidPattern.test(order.id)) {
      orderPayload.id = order.id;
    }

    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .upsert(orderPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (orderErr) {
      console.warn('Failed to sync order to Supabase:', orderErr.message);
      return;
    }

    const targetOrderId = insertedOrder?.id || (order.id && isUuidPattern.test(order.id) ? order.id : null);

    if (targetOrderId && order.items && order.items.length > 0) {
      const itemsToInsert = order.items.map((i: any) => ({
        order_id: targetOrderId,
        item_id: i.menuItem?.id && isUuidPattern.test(i.menuItem.id) ? i.menuItem.id : null,
        item_name_snapshot: i.menuItem?.name || 'Dish',
        unit_price_paise: i.unitPricePaise,
        quantity: i.quantity,
        subtotal_paise: i.subtotalPaise,
        tax_paise: i.taxPaise || 0,
        kitchen_status: i.kitchenStatus || 'new',
      }));

      await supabase.from('order_items').delete().eq('order_id', targetOrderId);
      await supabase.from('order_items').insert(itemsToInsert);
    }
  } catch (err) {
    console.warn('Network sync to Supabase skipped:', err);
  }
}

export async function syncPaymentToSupabase(
  order: any,
  paymentMethod?: string,
  amountPaise?: number,
  reference?: string
) {
  try {
    const restaurantId = resolveRestaurantId(order.restaurantId);
    const outletId = resolveOutletId(order.outletId) || order.outletId;

    const { data: dbOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order.orderNumber)
      .maybeSingle();

    if (dbOrder) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbOrder.id);

      await supabase.from('payments').insert({
        restaurant_id: restaurantId,
        outlet_id: outletId,
        order_id: dbOrder.id,
        payment_method: paymentMethod || 'cash',
        amount_paise: amountPaise || order.totalPaise || 0,
        status: 'completed',
        transaction_reference: reference || `REF-${Date.now()}`,
      });
    }
  } catch (err) {
    console.warn('Payment sync to Supabase skipped:', err);
  }
}

export async function syncExpenseToSupabase(expense: any) {
  try {
    const outletId = resolveOutletId(expense.outletId) || expense.outletId;

    await supabase.from('expenses').insert({
      outlet_id: outletId,
      category: expense.category,
      amount_paise: expense.amountPaise,
      payment_method: expense.paymentMethod,
      description: expense.description,
      expense_date: expense.date || expense.createdAt.split('T')[0],
      created_at: expense.createdAt,
    });
  } catch (err) {
    console.warn('Expense sync to Supabase skipped:', err);
  }
}

export async function syncKitchenNotificationToSupabase(notif: KitchenNotification) {
  try {
    const payload = {
      id: notif.id,
      outlet_id: notif.outletId,
      restaurant_id: notif.restaurantId,
      order_id: notif.orderId,
      order_number: notif.orderNumber,
      table_number: notif.tableNumber || null,
      order_type: notif.orderType,
      waiter_name: notif.waiterName || null,
      kitchen_user: notif.kitchenUser || null,
      station_name: notif.stationName || null,
      ticket_id: notif.ticketId || null,
      kot_number: notif.kotNumber || null,
      notification_type: notif.notificationType,
      is_all_items_ready: notif.isAllItemsReady,
      items: notif.items,
      message: notif.message,
      created_at: notif.createdAt,
      read: notif.read,
      served: notif.served,
      served_at: notif.servedAt || null,
      served_by: notif.servedBy || null,
    };

    await supabase.from('kitchen_notifications').upsert(payload, { onConflict: 'id' });

    // Instant cross-device broadcast via unified WebSocket channel
    broadcastOperationalEvent(notif.outletId, 'food_ready', notif).catch(() => {});
  } catch (err) {
    console.warn('Failed to sync kitchen notification to Supabase:', err);
  }
}

export async function fetchKitchenNotificationsFromSupabase(outletId: string): Promise<KitchenNotification[]> {
  try {
    const { data, error } = await supabase
      .from('kitchen_notifications')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      outletId: row.outlet_id,
      restaurantId: row.restaurant_id,
      orderId: row.order_id,
      orderNumber: row.order_number,
      tableNumber: row.table_number || undefined,
      orderType: row.order_type,
      waiterName: row.waiter_name || undefined,
      kitchenUser: row.kitchen_user || undefined,
      stationName: row.station_name || undefined,
      ticketId: row.ticket_id || undefined,
      kotNumber: row.kot_number || undefined,
      notificationType: row.notification_type,
      isAllItemsReady: Boolean(row.is_all_items_ready),
      items: Array.isArray(row.items) ? row.items : [],
      message: row.message,
      createdAt: row.created_at,
      read: Boolean(row.read),
      served: Boolean(row.served),
      servedAt: row.served_at || undefined,
      servedBy: row.served_by || undefined,
    }));
  } catch {
    return [];
  }
}

export async function updateKitchenNotificationInSupabase(
  id: string,
  updates: Partial<KitchenNotification>
) {
  try {
    const patch: any = {};
    if (updates.read !== undefined) patch.read = updates.read;
    if (updates.served !== undefined) patch.served = updates.served;
    if (updates.servedAt !== undefined) patch.served_at = updates.servedAt;
    if (updates.servedBy !== undefined) patch.served_by = updates.servedBy;

    await supabase.from('kitchen_notifications').update(patch).eq('id', id);
  } catch (err) {
    console.warn('Failed to update kitchen notification in Supabase:', err);
  }
}

export async function updateRestaurantInSupabase(restaurant: Partial<Restaurant> & { id: string }) {
  try {
    const payload: any = {
      name: restaurant.name,
      slug: restaurant.slug || 'spice-garden',
      currency: restaurant.currency || 'INR',
      currency_symbol: restaurant.currencySymbol || '₹',
      timezone: restaurant.timezone || 'Asia/Kolkata',
      logo_url: restaurant.logoUrl || null,
      business_email: restaurant.businessEmail || null,
      legal_name: restaurant.legalName || null,
      gstin: restaurant.gstin || null,
      fssai_license: restaurant.fssaiLicense || null,
      primary_phone: restaurant.primaryPhone || null,
      operating_hours: restaurant.operatingHours || null,
      updated_at: new Date().toISOString(),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    const res = await supabase.from('restaurants').update(payload).eq('id', restaurant.id);
    if (res.error) {
      const { data: firstRow } = await supabase.from('restaurants').select('id').limit(1).single();
      if (firstRow) {
        await supabase.from('restaurants').update(payload).eq('id', firstRow.id);
      }
    }
  } catch (err) {
    console.warn('Failed to update restaurant in Supabase:', err);
  }
}

export async function updateOutletInSupabase(outlet: Partial<Outlet> & { id: string }) {
  try {
    const payload: any = {
      name: outlet.name,
      code: outlet.code,
      address: typeof outlet.address === 'string' ? { full: outlet.address } : outlet.address,
      phone: outlet.phone || null,
      gstin: outlet.gstin || null,
      fssai_license: outlet.fssaiLicense || null,
      operating_hours: outlet.operatingHours || null,
      email: outlet.email || null,
      is_active: outlet.isActive !== undefined ? outlet.isActive : true,
      updated_at: new Date().toISOString(),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    const res = await supabase.from('outlets').update(payload).eq('id', outlet.id);
    if (res.error && outlet.code) {
      await supabase.from('outlets').update(payload).eq('code', outlet.code);
    }
  } catch (err) {
    console.warn('Failed to update outlet in Supabase:', err);
  }
}

export async function fetchRestaurantAndOutletsFromSupabase(targetRestaurantId?: string): Promise<{
  restaurant: Partial<Restaurant> | null;
  outlets: Outlet[];
}> {
  try {
    let restQuery = supabase.from('restaurants').select('*');
    if (targetRestaurantId) {
      restQuery = restQuery.eq('id', targetRestaurantId);
    }
    const { data: restData } = await restQuery.limit(1).maybeSingle();

    if (!restData) return { restaurant: null, outlets: [] };

    const { data: outletsData } = await supabase
      .from('outlets')
      .select('*')
      .eq('restaurant_id', restData.id)
      .order('created_at', { ascending: true });

    const { data: settingsData } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', restData.id)
      .maybeSingle();

    let outlets: Outlet[] = [];
    if (outletsData && outletsData.length > 0) {
      outlets = outletsData.map((o: any) => ({
        id: o.id,
        restaurantId: o.restaurant_id,
        name: o.name,
        code: o.code,
        address:
          typeof o.address === 'object' && o.address
            ? o.address.full || o.address.street || JSON.stringify(o.address)
            : String(o.address || ''),
        phone: o.phone || '',
        gstin: o.gstin || '',
        fssaiLicense: o.fssai_license || '',
        isActive: o.is_active !== undefined ? o.is_active : true,
        operatingHours: o.operating_hours || '',
        email: o.email || '',
      }));
    }

    let parsedSettings: any = undefined;
    if (settingsData) {
      parsedSettings = {
        id: settingsData.id,
        restaurantId: settingsData.restaurant_id,
        enableKot: settingsData.enable_kot ?? true,
        enableKds: settingsData.enable_kds ?? true,
        enableTableManagement: settingsData.enable_table_management ?? true,
        enableInventory: settingsData.enable_inventory ?? true,
        enableCustomerCrm: settingsData.enable_customer_crm ?? false,
        cgstPct: Number(settingsData.default_tax_rate_cgst_pct ?? 2.5),
        sgstPct: Number(settingsData.default_tax_rate_sgst_pct ?? 2.5),
        invoicePrefix: settingsData.invoice_prefix || 'INV-',
        kotPrefix: settingsData.kot_prefix || 'KOT-',
        receiptFooter: settingsData.receipt_footer || 'Thank you for dining with us!',
        currencySymbol: restData.currency_symbol || '₹',
        roundingRule: 'nearest_rupee',
        operatingHours: restData.operating_hours || '',
        primaryPhone: restData.primary_phone || '',
        gstin: restData.gstin || '',
        fssaiLicense: restData.fssai_license || '',
      };
    }

    return {
      restaurant: {
        id: restData.id,
        name: restData.name,
        slug: restData.slug,
        restaurantCode: restData.restaurant_code || undefined,
        currency: restData.currency,
        currencySymbol: restData.currency_symbol,
        timezone: restData.timezone,
        logoUrl: restData.logo_url || undefined,
        businessEmail: restData.business_email || undefined,
        legalName: restData.legal_name || undefined,
        gstin: restData.gstin || undefined,
        fssaiLicense: restData.fssai_license || undefined,
        primaryPhone: restData.primary_phone || undefined,
        operatingHours: restData.operating_hours || undefined,
        settings: parsedSettings,
      },
      outlets,
    };
  } catch (err) {
    console.warn('Failed to fetch restaurant & outlets:', err);
    return { restaurant: null, outlets: [] };
  }
}

export async function createRestaurantWithOwnerInSupabase(params: {
  restaurantName: string;
  outletName: string;
  outletCode: string;
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  fullName?: string;
  taxCgstPct?: number;
  taxSgstPct?: number;
  phone?: string;
  address?: string;
}): Promise<{
  restaurantId: string;
  restaurantName: string;
  slug: string;
  restaurantCode: string;
  outletId: string;
  membershipId: string;
  role: string;
}> {
  const { data, error } = await supabase.rpc('create_restaurant_with_owner', {
    p_restaurant_name: params.restaurantName.trim(),
    p_outlet_name: params.outletName.trim(),
    p_outlet_code: params.outletCode.trim().toUpperCase(),
    p_currency: params.currency || 'INR',
    p_currency_symbol: params.currencySymbol || '₹',
    p_timezone: params.timezone || 'Asia/Kolkata',
    p_full_name: params.fullName?.trim() || null,
    p_tax_cgst_pct: params.taxCgstPct ?? 2.50,
    p_tax_sgst_pct: params.taxSgstPct ?? 2.50,
    p_phone: params.phone?.trim() || null,
    p_address: params.address?.trim() || null,
  });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create restaurant');
  }

  return {
    restaurantId: data.restaurant_id,
    restaurantName: data.restaurant_name,
    slug: data.slug,
    restaurantCode: data.restaurant_code,
    outletId: data.outlet_id,
    membershipId: data.membership_id,
    role: data.role,
  };
}

export async function revokeStaffInvitationInSupabase(invitationId: string) {
  const { data, error } = await supabase.rpc('revoke_staff_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
  return data;
}

export async function getCurrentUserProfileAndMemberships(): Promise<{
  profile: UserProfile | null;
  memberships: RestaurantMembership[];
  isSuperAdmin: boolean;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profile: null, memberships: [], isSuperAdmin: false };

    // Concurrently fetch profile and authorized memberships
    const [profileRes, v2Res] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
      supabase.rpc('get_user_authorized_memberships_v2'),
    ]);

    const profileData = profileRes.data;
    const profile: UserProfile = profileData
      ? {
          id: profileData.id,
          authUserId: profileData.auth_user_id,
          email: profileData.email || user.email || '',
          fullName: profileData.full_name,
          phone: profileData.phone || undefined,
          avatarUrl: profileData.avatar_url || undefined,
          isSuperAdmin: Boolean(profileData.is_super_admin),
          createdAt: profileData.created_at,
        }
      : {
          id: user.id,
          authUserId: user.id,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff User',
          isSuperAdmin: false,
          createdAt: user.created_at,
        };

    let rpcMemberships: any[] | null = null;
    let rpcErr: any = null;

    if (!v2Res.error && Array.isArray(v2Res.data)) {
      rpcMemberships = v2Res.data;
    } else {
      rpcErr = v2Res.error;
      const v1Res = await supabase.rpc('get_user_authorized_memberships');
      rpcMemberships = v1Res.data;
      rpcErr = v1Res.error;
    }

    let memberships: RestaurantMembership[] = [];

    if (!rpcErr && Array.isArray(rpcMemberships) && rpcMemberships.length > 0) {
      memberships = rpcMemberships.map((row: any) => ({
        id: row.membership_id,
        userId: profile.id,
        restaurantId: row.restaurant_id,
        restaurantName: row.restaurant_name,
        restaurantSlug: row.restaurant_slug,
        restaurantCode: row.restaurant_code || undefined,
        currency: row.currency,
        currencySymbol: row.currency_symbol,
        outletId: row.outlet_id || undefined,
        outletName: row.outlet_name || undefined,
        outletCode: row.outlet_code || undefined,
        role: row.role,
        loginId: row.login_id || undefined,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        userProfile: profile,
      }));
    } else if (profileData) {
      // Fallback query if RPC fails
      const { data: memData } = await supabase
        .from('restaurant_memberships')
        .select('*, restaurants(id, name, slug, restaurant_code, currency, currency_symbol), outlets(id, name, code)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (memData) {
        memberships = memData.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          restaurantId: row.restaurant_id,
          restaurantName: row.restaurants?.name,
          restaurantSlug: row.restaurants?.slug,
          restaurantCode: row.restaurants?.restaurant_code || undefined,
          currency: row.restaurants?.currency,
          currencySymbol: row.restaurants?.currency_symbol,
          outletId: row.outlet_id || undefined,
          outletName: row.outlets?.name,
          outletCode: row.outlets?.code,
          role: row.role,
          loginId: row.login_id || undefined,
          isActive: Boolean(row.is_active),
          createdAt: row.created_at,
          userProfile: profile,
        }));
      }
    }

    return {
      profile,
      memberships,
      isSuperAdmin: profile.isSuperAdmin,
    };
  } catch (err) {
    console.warn('Error fetching user profile & memberships:', err);
    return { profile: null, memberships: [], isSuperAdmin: false };
  }
}

export async function getCurrentUserProfileAndMembership(): Promise<{
  profile: UserProfile | null;
  membership: RestaurantMembership | null;
  isSuperAdmin: boolean;
}> {
  const { profile, memberships, isSuperAdmin } = await getCurrentUserProfileAndMemberships();
  return {
    profile,
    membership: memberships[0] || null,
    isSuperAdmin,
  };
}

export async function fetchStaffMembersFromSupabase(restaurantId: string): Promise<RestaurantMembership[]> {
  try {
    const { data, error } = await supabase
      .from('restaurant_memberships')
      .select('*, user_profiles(*), outlets(name)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      outletId: row.outlet_id || undefined,
      role: row.role,
      loginId: row.login_id || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      outletName: row.outlets?.name,
      userProfile: row.user_profiles
        ? {
            id: row.user_profiles.id,
            authUserId: row.user_profiles.auth_user_id,
            email: row.user_profiles.email || '',
            fullName: row.user_profiles.full_name,
            phone: row.user_profiles.phone || undefined,
            avatarUrl: row.user_profiles.avatar_url || undefined,
            isSuperAdmin: Boolean(row.user_profiles.is_super_admin),
            createdAt: row.user_profiles.created_at,
          }
        : undefined,
    }));
  } catch {
    return [];
  }
}

export async function createStaffInvitationInSupabase(invitation: {
  restaurantId: string;
  outletId?: string;
  email: string;
  fullName: string;
  role: string;
  loginId?: string;
  stationId?: string;
}): Promise<{ invitation: StaffInvitation; token: string }> {
  const token = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const payload: any = {
    restaurant_id: invitation.restaurantId,
    outlet_id: invitation.outletId || null,
    email: invitation.email.toLowerCase().trim(),
    full_name: invitation.fullName.trim(),
    role: invitation.role,
    login_id: invitation.loginId ? invitation.loginId.toLowerCase().trim() : null,
    station_id: invitation.stationId || null,
    token,
    expires_at: expiresAt,
  };

  const { data, error } = await supabase
    .from('staff_invitations')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return {
    invitation: {
      id: data.id,
      restaurantId: data.restaurant_id,
      outletId: data.outlet_id || undefined,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      loginId: data.login_id || undefined,
      stationId: data.station_id || undefined,
      token: data.token,
      expiresAt: data.expires_at,
      acceptedAt: data.accepted_at || undefined,
      createdAt: data.created_at,
    },
    token: data.token,
  };
}

export async function fetchStaffInvitationsFromSupabase(restaurantId: string): Promise<StaffInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      restaurantId: d.restaurant_id,
      outletId: d.outlet_id || undefined,
      email: d.email,
      fullName: d.full_name,
      role: d.role,
      loginId: d.login_id || undefined,
      stationId: d.station_id || undefined,
      token: d.token,
      expiresAt: d.expires_at,
      acceptedAt: d.accepted_at || undefined,
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
}

export async function updateStaffMembershipStatusInSupabase(membershipId: string, isActive: boolean) {
  const { error } = await supabase
    .from('restaurant_memberships')
    .update({ is_active: isActive })
    .eq('id', membershipId);

  if (error) throw error;
}

export async function updateStaffMembershipRoleInSupabase(membershipId: string, role: string, outletId?: string) {
  const patch: any = { role };
  if (outletId !== undefined) {
    patch.outlet_id = outletId || null;
  }
  const { error } = await supabase
    .from('restaurant_memberships')
    .update(patch)
    .eq('id', membershipId);

  if (error) throw error;
}

export async function provisionStaffAccountInSupabase(params: {
  restaurantId: string;
  outletId?: string;
  fullName: string;
  loginId: string;
  email?: string;
  password?: string;
  role: string;
  stationId?: string;
}) {
  const cleanOutletId = params.outletId && params.outletId.trim().length > 0 ? params.outletId.trim() : null;
  const cleanStationId = params.stationId && params.stationId.trim().length > 0 ? params.stationId.trim() : null;
  const cleanEmail = params.email && params.email.trim().length > 0 ? params.email.trim().toLowerCase() : null;

  const { data, error } = await supabase.rpc('provision_staff_account', {
    p_restaurant_id: params.restaurantId,
    p_outlet_id: cleanOutletId,
    p_full_name: params.fullName.trim(),
    p_login_id: params.loginId.trim().toLowerCase(),
    p_email: cleanEmail,
    p_password: params.password,
    p_role: params.role,
    p_station_id: cleanStationId,
  });

  if (error) throw error;
  return data;
}

export async function resetStaffPasswordInSupabase(params: {
  restaurantId: string;
  membershipId: string;
  newPassword: string;
}) {
  const { data, error } = await supabase.rpc('reset_staff_password', {
    p_restaurant_id: params.restaurantId,
    p_membership_id: params.membershipId,
    p_new_password: params.newPassword,
  });

  if (error) throw error;
  return data;
}

export async function updateStaffMemberInSupabase(params: {
  restaurantId: string;
  membershipId: string;
  fullName: string;
  role: string;
  outletId?: string;
  isActive: boolean;
}) {
  const { data, error } = await supabase.rpc('update_staff_member', {
    p_restaurant_id: params.restaurantId,
    p_membership_id: params.membershipId,
    p_full_name: params.fullName.trim(),
    p_role: params.role,
    p_outlet_id: params.outletId || null,
    p_is_active: params.isActive,
  });

  if (error) throw error;
  return data;
}

export async function generateKdsPairingCodeInSupabase(
  outletId: string,
  stationId: string | undefined,
  deviceName: string
): Promise<{ sessionId: string; pairingCode: string; expiresInMinutes: number }> {
  const { data, error } = await supabase.rpc('generate_kds_pairing_code', {
    p_outlet_id: outletId,
    p_station_id: stationId || null,
    p_device_name: deviceName,
  });

  if (error) throw error;
  return {
    sessionId: data.session_id,
    pairingCode: data.pairing_code,
    expiresInMinutes: data.expires_in_minutes,
  };
}

export async function fetchKdsDeviceSessionsFromSupabase(restaurantId: string): Promise<KdsDeviceSession[]> {
  try {
    const { data, error } = await supabase
      .from('kds_device_sessions')
      .select('*, outlets(name)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      restaurantId: d.restaurant_id,
      outletId: d.outlet_id,
      stationId: d.station_id || undefined,
      deviceName: d.device_name,
      pairingCode: d.pairing_code || undefined,
      pairingCodeExpiresAt: d.pairing_code_expires_at || undefined,
      deviceToken: d.device_token || undefined,
      isActive: Boolean(d.is_active),
      lastSeenAt: d.last_seen_at || undefined,
      createdAt: d.created_at,
      outletName: d.outlets?.name,
    }));
  } catch {
    return [];
  }
}

export async function revokeKdsDeviceSessionInSupabase(sessionId: string) {
  const { error } = await supabase
    .from('kds_device_sessions')
    .update({ is_active: false })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function fetchAuditLogsFromSupabase(restaurantId: string): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      action: d.action,
      entityType: d.entity_type,
      entityId: d.entity_id || undefined,
      details: d.details || {},
      actor: d.user_id || 'System',
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
}



import { createClient } from '@supabase/supabase-js';
import { Customer, Order, OrderItem, Product, RoznamchaEntry } from '../types';
import { db } from './index';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vgwfimosnvhcipapxyjx.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd2ZpbW9zbnZoY2lwYXB4eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDIwOTQsImV4cCI6MjEwNTcxODA5NH0.9AfFJ4b_Yjcj-F5Cfjv4Cbhp7fqqX1gy9jTl7GZobcE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const DEFAULT_TENANT_ID = 'primelink-main';

/**
 * Checks connectivity to the live Supabase project
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  projectId: string;
}> {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) {
      return { connected: false, error: error.message, projectId: 'vgwfimosnvhcipapxyjx' };
    }
    return { connected: true, projectId: 'vgwfimosnvhcipapxyjx' };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Network error connecting to Supabase',
      projectId: 'vgwfimosnvhcipapxyjx',
    };
  }
}

/**
 * Fetches live row counts from Supabase tables
 */
export async function fetchSupabaseLiveCounts(): Promise<{
  products: number;
  customers: number;
  orders: number;
  roznamcha: number;
}> {
  try {
    const [pRes, cRes, oRes, rRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('sales_orders').select('id', { count: 'exact', head: true }),
      supabase.from('financial_roznamcha').select('id', { count: 'exact', head: true }),
    ]);

    return {
      products: pRes.count || 0,
      customers: cRes.count || 0,
      orders: oRes.count || 0,
      roznamcha: rRes.count || 0,
    };
  } catch (e) {
    console.error('Failed to fetch Supabase counts:', e);
    return { products: 0, customers: 0, orders: 0, roznamcha: 0 };
  }
}

/**
 * Syncs a single product to Supabase 'products' table
 */
export async function syncProductToSupabase(product: Product) {
  try {
    const payload = {
      id: product.id,
      tenant_id: DEFAULT_TENANT_ID,
      sku: product.sku,
      title: product.name,
      company: product.brand || 'PrimeLink Distribution',
      pack_size: product.packSize || 1,
      trade_price: product.tradePrice || 0,
      retail_price: product.retailPrice || 0,
      stock_cartons: product.cartonStock || 0,
    };

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn(`[Supabase Sync] Failed to sync product ${product.id}:`, err);
    return false;
  }
}

/**
 * Syncs multiple products in batch to Supabase
 */
export async function syncProductsToSupabase(products: Product[]) {
  if (!products || products.length === 0) return 0;
  try {
    const payloads = products.map((p) => ({
      id: p.id,
      tenant_id: DEFAULT_TENANT_ID,
      sku: p.sku,
      title: p.name,
      company: p.brand || 'PrimeLink Distribution',
      pack_size: p.packSize || 1,
      trade_price: p.tradePrice || 0,
      retail_price: p.retailPrice || 0,
      stock_cartons: p.cartonStock || 0,
    }));

    const { error } = await supabase.from('products').upsert(payloads, { onConflict: 'id' });
    if (error) throw error;
    return payloads.length;
  } catch (err) {
    console.warn('[Supabase Sync] Batch product sync error:', err);
    return 0;
  }
}

/**
 * Syncs a customer to Supabase 'customers' table
 */
export async function syncCustomerToSupabase(customer: Customer) {
  try {
    const payload = {
      id: customer.id,
      tenant_id: DEFAULT_TENANT_ID,
      shop_name: customer.shopName || customer.shop_name || 'Retail Store',
      owner_name: customer.name || customer.owner_name || '',
      phone: customer.phone || '',
      whatsapp_number: customer.whatsapp_number || customer.phone || '',
      route: customer.route || '',
      credit_limit: customer.creditLimit ?? customer.credit_limit ?? 50000,
      current_balance: customer.currentBalance ?? customer.current_balance ?? 0,
      status: (customer.status || 'ACTIVE').toUpperCase(),
    };

    const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn(`[Supabase Sync] Failed to sync customer ${customer.id}:`, err);
    return false;
  }
}

/**
 * Syncs multiple customers in batch to Supabase
 */
export async function syncCustomersToSupabase(customers: Customer[]) {
  if (!customers || customers.length === 0) return 0;
  try {
    const payloads = customers.map((c) => ({
      id: c.id,
      tenant_id: DEFAULT_TENANT_ID,
      shop_name: c.shopName || c.shop_name || 'Retail Store',
      owner_name: c.name || c.owner_name || '',
      phone: c.phone || '',
      whatsapp_number: c.whatsapp_number || c.phone || '',
      route: c.route || '',
      credit_limit: c.creditLimit ?? c.credit_limit ?? 50000,
      current_balance: c.currentBalance ?? c.current_balance ?? 0,
      status: (c.status || 'ACTIVE').toUpperCase(),
    }));

    const { error } = await supabase.from('customers').upsert(payloads, { onConflict: 'id' });
    if (error) throw error;
    return payloads.length;
  } catch (err) {
    console.warn('[Supabase Sync] Batch customer sync error:', err);
    return 0;
  }
}

/**
 * Syncs a booked order to Supabase 'sales_orders' table
 */
export async function syncOrderToSupabase(order: Order, customer?: Customer) {
  try {
    // 1. Ensure customer exists in Supabase to fulfill foreign key constraint
    if (customer) {
      await syncCustomerToSupabase(customer);
    } else {
      const localCust = await db.customers.get(order.customerId);
      if (localCust) {
        await syncCustomerToSupabase(localCust);
      } else {
        // Fallback placeholder customer record
        await supabase.from('customers').upsert(
          {
            id: order.customerId,
            tenant_id: DEFAULT_TENANT_ID,
            shop_name: order.shopName || 'Unknown Shop',
            route: order.route || 'General Route',
            status: 'ACTIVE',
          },
          { onConflict: 'id' }
        );
      }
    }

    // 2. Format order payload
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      order.id
    );

    const payload: any = {
      tenant_id: DEFAULT_TENANT_ID,
      customer_id: order.customerId,
      order_date: order.date ? order.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      items: order.items || [],
      total_amount: order.grossBill || 0,
      discount_amount: order.totalDiscount || 0,
      net_amount: order.netBill || 0,
    };

    if (isUuid) {
      payload.id = order.id;
    }

    const { error } = await supabase.from('sales_orders').insert(payload);
    if (error) throw error;

    // Mark as synced in Dexie
    await db.orders.update(order.id, { synced: true });
    return true;
  } catch (err) {
    console.warn(`[Supabase Sync] Failed to sync order ${order.id}:`, err);
    return false;
  }
}

/**
 * Syncs a Roznamcha entry to Supabase 'financial_roznamcha' table
 */
export async function syncRoznamchaEntryToSupabase(entry: RoznamchaEntry) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      entry.id
    );
    const typeEnum = entry.type === 'cash_in' ? 'CASH_IN' : 'CASH_OUT';

    const payload: any = {
      tenant_id: DEFAULT_TENANT_ID,
      entry_date: entry.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      type: typeEnum,
      category: entry.category || 'General',
      account_name: entry.customerName || 'Main Cash In Hand',
      amount: entry.amount || 0,
      description: `${entry.entryNo || ''} - ${entry.narration || ''}`.trim(),
    };

    if (isUuid) {
      payload.id = entry.id;
    }

    const { error } = await supabase.from('financial_roznamcha').insert(payload);
    if (error) throw error;

    // Mark as synced in Dexie
    await db.roznamcha.update(entry.id, { synced: true });
    return true;
  } catch (err) {
    console.warn(`[Supabase Sync] Failed to sync roznamcha entry ${entry.id}:`, err);
    return false;
  }
}

/**
 * Full Sync Engine:
 * 1. Synchronizes all Products & Customers
 * 2. Processes all unsynced Orders
 * 3. Processes all unsynced Roznamcha cash entries
 * 4. Clears local Dexie sync queue
 */
export async function syncAllToSupabase(): Promise<{
  success: boolean;
  ordersSynced: number;
  roznamchaSynced: number;
  productsSynced: number;
  customersSynced: number;
  error?: string;
}> {
  try {
    // 1. Fetch all local records
    const [allProducts, allCustomers, allOrders, allRoznamcha] = await Promise.all([
      db.products.toArray(),
      db.customers.toArray(),
      db.orders.toArray(),
      db.roznamcha.toArray(),
    ]);

    // 2. Sync Products and Customers first
    const [productsCount, customersCount] = await Promise.all([
      syncProductsToSupabase(allProducts),
      syncCustomersToSupabase(allCustomers),
    ]);

    // 3. Find unsynced orders
    const unsyncedOrders = allOrders.filter((o) => !o.synced);
    let ordersSynced = 0;
    for (const order of unsyncedOrders) {
      const ok = await syncOrderToSupabase(order);
      if (ok) ordersSynced++;
    }

    // 4. Find unsynced roznamcha entries
    const unsyncedRoz = allRoznamcha.filter((r) => !r.synced);
    let roznamchaSynced = 0;
    for (const entry of unsyncedRoz) {
      const ok = await syncRoznamchaEntryToSupabase(entry);
      if (ok) roznamchaSynced++;
    }

    // 5. Clear syncQueue
    await db.syncQueue.clear();

    return {
      success: true,
      ordersSynced,
      roznamchaSynced,
      productsSynced: productsCount,
      customersSynced: customersCount,
    };
  } catch (err: any) {
    console.error('[Supabase Sync All] Error during sync:', err);
    return {
      success: false,
      ordersSynced: 0,
      roznamchaSynced: 0,
      productsSynced: 0,
      customersSynced: 0,
      error: err?.message || 'Sync failed',
    };
  }
}

/**
 * Pulls all records from Supabase tables ('products', 'customers', 'sales_orders', 'financial_roznamcha')
 * and merges them into Dexie.js (IndexedDB).
 * Does NOT clear local tables. Merges by ID:
 * - If record doesn't exist locally, adds it.
 * - If record already exists locally, updates or preserves local details.
 */
export async function pullAndMergeFromSupabase(): Promise<{
  productsRestored: number;
  customersRestored: number;
  ordersRestored: number;
  roznamchaRestored: number;
}> {
  let productsRestored = 0;
  let customersRestored = 0;
  let ordersRestored = 0;
  let roznamchaRestored = 0;

  try {
    // 1. Fetch Remote Products
    const { data: remoteProducts, error: pErr } = await supabase.from('products').select('*');
    if (!pErr && Array.isArray(remoteProducts)) {
      for (const rp of remoteProducts) {
        if (!rp.id) continue;
        const existing = await db.products.get(rp.id);
        const productData: Product = {
          id: rp.id,
          sku: rp.sku || existing?.sku || `SKU-${rp.id.slice(-4)}`,
          name: rp.title || existing?.name || 'Product',
          brand: rp.company || existing?.brand || 'FMCG',
          category: existing?.category || 'General FMCG',
          packSize: Number(rp.pack_size) || existing?.packSize || 1,
          tradePrice: Number(rp.trade_price) || existing?.tradePrice || 0,
          retailPrice: Number(rp.retail_price) || existing?.retailPrice || 0,
          cartonStock: Number(rp.stock_cartons) || existing?.cartonStock || 0,
          piecesStock: existing?.piecesStock || 0,
          minStockAlert: existing?.minStockAlert || 10,
          barcode: existing?.barcode,
          taxSchedule: existing?.taxSchedule,
        };
        await db.products.put(productData);
        productsRestored++;
      }
    }

    // 2. Fetch Remote Customers
    const { data: remoteCustomers, error: cErr } = await supabase.from('customers').select('*');
    if (!cErr && Array.isArray(remoteCustomers)) {
      for (const rc of remoteCustomers) {
        if (!rc.id) continue;
        const existing = await db.customers.get(rc.id);
        const customerData: Customer = {
          id: rc.id,
          tenant_id: rc.tenant_id || existing?.tenant_id || DEFAULT_TENANT_ID,
          shopName: rc.shop_name || existing?.shopName || 'Retail Store',
          name: rc.owner_name || existing?.name || 'Owner',
          phone: rc.phone || existing?.phone || '',
          whatsapp_number: rc.whatsapp_number || existing?.whatsapp_number || rc.phone || '',
          route: rc.route || existing?.route || 'Main Bazaar Route',
          address: existing?.address || rc.shop_name || 'Outlet Address',
          zone: existing?.zone || 'Zone 1',
          creditLimit: Number(rc.credit_limit ?? existing?.creditLimit ?? 100000),
          currentBalance: Number(rc.current_balance ?? existing?.currentBalance ?? 0),
          status: (rc.status?.toLowerCase() === 'credit_locked' ? 'credit_locked' : 'active') as any,
          atlStatus: existing?.atlStatus || 'filer',
          cnic: existing?.cnic,
          ntn: existing?.ntn,
          strn: existing?.strn,
        };
        await db.customers.put(customerData);
        customersRestored++;
      }
    }

    // 3. Fetch Remote Orders
    const { data: remoteOrders, error: oErr } = await supabase.from('sales_orders').select('*');
    if (!oErr && Array.isArray(remoteOrders)) {
      for (const ro of remoteOrders) {
        if (!ro.id) continue;
        const existing = await db.orders.get(ro.id);
        if (!existing) {
          const itemsList: OrderItem[] = Array.isArray(ro.items) ? ro.items : [];
          const totalCartons = itemsList.reduce((acc, it) => acc + (Number(it.cartons) || 0), 0);
          const totalPieces = itemsList.reduce((acc, it) => acc + (Number(it.pieces) || 0), 0);
          const totalUnits = itemsList.reduce((acc, it) => acc + (Number(it.totalUnits) || 0), 0);
          const grossBill = Number(ro.total_amount) || 0;
          const totalDiscount = Number(ro.discount_amount) || 0;
          const netBill = Number(ro.net_amount) || 0;
          const matchedCust = await db.customers.get(ro.customer_id);

          const orderData: Order = {
            id: ro.id,
            orderNo: `ORD-${ro.id.slice(0, 6).toUpperCase()}`,
            customerId: ro.customer_id,
            customerName: matchedCust ? matchedCust.name : 'Valued Customer',
            shopName: matchedCust ? matchedCust.shopName : 'Retail Shop',
            route: matchedCust ? matchedCust.route : 'Main Route',
            date: ro.order_date ? `${ro.order_date}T10:00:00.000Z` : new Date().toISOString(),
            items: itemsList,
            totalCartons,
            totalPieces,
            totalUnits,
            grossBill,
            totalDiscount,
            netBill,
            paymentType: 'credit',
            cashPaid: 0,
            remainingBalance: netBill,
            status: 'booked',
            synced: true,
          };
          await db.orders.put(orderData);
          ordersRestored++;
        }
      }
    }

    // 4. Fetch Remote Roznamcha Entries
    const { data: remoteRoz, error: rErr } = await supabase.from('financial_roznamcha').select('*');
    if (!rErr && Array.isArray(remoteRoz)) {
      for (const rr of remoteRoz) {
        if (!rr.id) continue;
        const existing = await db.roznamcha.get(rr.id);
        if (!existing) {
          const isCashIn = rr.type === 'CASH_IN';
          const rozData: RoznamchaEntry = {
            id: rr.id,
            entryNo: rr.description?.split(' - ')[0] || (isCashIn ? `RCP-${rr.id.slice(0, 4)}` : `VCH-${rr.id.slice(0, 4)}`),
            date: rr.entry_date ? `${rr.entry_date}T10:00:00.000Z` : new Date().toISOString(),
            type: isCashIn ? 'cash_in' : 'cash_out',
            category: rr.category || (isCashIn ? 'Customer Recovery' : 'General Expense'),
            amount: Number(rr.amount) || 0,
            customerName: rr.account_name || 'Cash Counter',
            narration: rr.description || '',
            recordedBy: 'Admin / Sync',
            synced: true,
          };
          await db.roznamcha.put(rozData);
          roznamchaRestored++;
        }
      }
    }
  } catch (err) {
    console.error('[Supabase Pull & Merge] Error:', err);
  }

  return {
    productsRestored,
    customersRestored,
    ordersRestored,
    roznamchaRestored,
  };
}

/**
 * Bidirectional Sync:
 * 1. Pushes local records/queue to Supabase
 * 2. Pulls remote records from Supabase and merges them into Dexie
 * Returns detailed sync summary
 */
export async function syncBidirectional(): Promise<{
  success: boolean;
  pushed: { orders: number; roznamcha: number; products: number; customers: number };
  pulled: { products: number; customers: number; orders: number; roznamcha: number };
  error?: string;
}> {
  // Push local to Supabase first
  const pushRes = await syncAllToSupabase();
  // Pull from Supabase to local Dexie
  const pullRes = await pullAndMergeFromSupabase();

  return {
    success: pushRes.success,
    pushed: {
      orders: pushRes.ordersSynced,
      roznamcha: pushRes.roznamchaSynced,
      products: pushRes.productsSynced,
      customers: pushRes.customersSynced,
    },
    pulled: {
      products: pullRes.productsRestored,
      customers: pullRes.customersRestored,
      orders: pullRes.ordersRestored,
      roznamcha: pullRes.roznamchaRestored,
    },
    error: pushRes.error,
  };
}

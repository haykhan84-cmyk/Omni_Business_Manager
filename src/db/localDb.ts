import { db, OmniSalesDB } from './index';
import {
  Employee,
  StaffAttendance,
  SalaryAdvance,
  PayrollRecord,
  SalesRoute,
  RouteStop,
  ZeroSaleCall,
  Customer,
  CustomerNote,
  Order,
  RoznamchaEntry,
  RouteDeliverySummary,
} from '../types';

export const ACTIVE_TENANT_ID = 'tenant_pk_swat_1042';

/**
 * Tenant-isolated query helpers for OmniBusiness Manager SaaS (CRM & Retailer 360)
 */
export async function getTenantCustomers(tenantId: string = ACTIVE_TENANT_ID): Promise<Customer[]> {
  const list = await db.customers.toArray();
  // Filter by tenant_id, treating unassigned legacy records as default active tenant
  return list.filter((c) => !c.tenant_id || c.tenant_id === tenantId);
}

export async function getTenantCustomerById(
  customerId: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<Customer | undefined> {
  const customer = await db.customers.get(customerId);
  if (!customer) return undefined;
  if (customer.tenant_id && customer.tenant_id !== tenantId) return undefined;
  return customer;
}

export async function createTenantCustomer(
  customer: Omit<Customer, 'id'> & { id?: string },
  tenantId: string = ACTIVE_TENANT_ID
): Promise<string> {
  const id = customer.id || `cust-pk-${Date.now()}`;
  const record: Customer = {
    ...customer,
    id,
    tenant_id: tenantId,
    shop_name: customer.shop_name || customer.shopName,
    owner_name: customer.owner_name || customer.name,
    credit_limit: customer.credit_limit ?? customer.creditLimit,
    current_balance: customer.current_balance ?? customer.currentBalance ?? 0,
    creditLimit: customer.creditLimit ?? customer.credit_limit ?? 1000000,
    currentBalance: customer.currentBalance ?? customer.current_balance ?? 0,
    status: customer.status || 'active',
  };
  await db.customers.put(record);
  return id;
}

export async function updateTenantCustomer(
  customer: Customer,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  const existing = await db.customers.get(customer.id);
  const updated: Customer = {
    ...existing,
    ...customer,
    tenant_id: tenantId,
    shop_name: customer.shop_name || customer.shopName,
    owner_name: customer.owner_name || customer.name,
    credit_limit: customer.credit_limit ?? customer.creditLimit,
    current_balance: customer.current_balance ?? customer.currentBalance,
  };
  await db.customers.put(updated);
}

export async function toggleCustomerCreditLock(
  customerId: string,
  lockState: boolean,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  const cust = await db.customers.get(customerId);
  if (cust && (!cust.tenant_id || cust.tenant_id === tenantId)) {
    const newStatus = lockState ? 'credit_locked' : 'active';
    await db.customers.update(customerId, {
      status: newStatus,
    });
  }
}

export async function adjustCustomerCreditLimit(
  customerId: string,
  newLimit: number,
  creditDays: number = 15,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  const cust = await db.customers.get(customerId);
  if (cust && (!cust.tenant_id || cust.tenant_id === tenantId)) {
    await db.customers.update(customerId, {
      creditLimit: newLimit,
      credit_limit: newLimit,
      credit_days: creditDays,
    });
  }
}

export async function getTenantCustomerNotes(
  customerId: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<CustomerNote[]> {
  try {
    return await db.customer_notes
      .where('tenant_id')
      .equals(tenantId)
      .and((n) => n.customer_id === customerId)
      .reverse()
      .toArray();
  } catch (err) {
    console.error('Failed to get customer notes:', err);
    return [];
  }
}

export async function addTenantCustomerNote(
  note: Omit<CustomerNote, 'id'>,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<number> {
  return await db.customer_notes.add({
    ...note,
    tenant_id: tenantId,
    note_date: note.note_date || new Date().toISOString(),
  });
}

/**
 * Tenant-isolated query helpers for OmniBusiness Manager SaaS
 */
export async function getTenantEmployees(tenantId: string = ACTIVE_TENANT_ID): Promise<Employee[]> {
  return await db.employees.where('tenant_id').equals(tenantId).toArray();
}

export async function getTenantAttendance(
  date?: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<StaffAttendance[]> {
  const collection = db.staff_attendance.where('tenant_id').equals(tenantId);
  if (date) {
    return await collection.filter((a) => a.date === date).toArray();
  }
  return await collection.toArray();
}

export async function getTenantSalaryAdvances(
  isSettled?: boolean,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<SalaryAdvance[]> {
  const collection = db.salary_advances.where('tenant_id').equals(tenantId);
  if (typeof isSettled === 'boolean') {
    return await collection.filter((a) => a.is_settled === isSettled).toArray();
  }
  return await collection.toArray();
}

export async function getTenantPayrollRecords(
  month?: string,
  year?: number,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<PayrollRecord[]> {
  const collection = db.payroll_records.where('tenant_id').equals(tenantId);
  if (month && year) {
    return await collection.filter((p) => p.month === month && p.year === year).toArray();
  }
  return await collection.toArray();
}

/**
 * Route & Beat Management Query Helpers (Multi-Tenant SaaS)
 */
export async function getTenantRoutes(tenantId: string = ACTIVE_TENANT_ID): Promise<SalesRoute[]> {
  return await db.routes.where('tenant_id').equals(tenantId).toArray();
}

export async function getTenantRouteStops(
  routeId?: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<RouteStop[]> {
  const collection = db.route_stops.where('tenant_id').equals(tenantId);
  if (routeId) {
    const stops = await collection.filter((s) => s.route_id === routeId).toArray();
    return stops.sort((a, b) => a.stop_sequence - b.stop_sequence);
  }
  const allStops = await collection.toArray();
  return allStops.sort((a, b) => a.stop_sequence - b.stop_sequence);
}

export async function getTenantZeroSales(
  routeId?: string,
  date?: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<ZeroSaleCall[]> {
  let collection = db.zero_sales.where('tenant_id').equals(tenantId);
  let results = await collection.toArray();
  if (routeId) {
    results = results.filter((z) => z.route_id === routeId);
  }
  if (date) {
    results = results.filter((z) => z.date === date);
  }
  return results;
}

export async function addTenantRoute(route: SalesRoute): Promise<void> {
  await db.routes.put(route);
}

export async function updateTenantRoute(
  routeId: string,
  updates: Partial<SalesRoute>,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  const existing = await db.routes.get(routeId);
  if (existing && existing.tenant_id === tenantId) {
    await db.routes.update(routeId, updates);
  }
}

export async function deleteTenantRoute(
  routeId: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  await db.routes.where('id').equals(routeId).and((r) => r.tenant_id === tenantId).delete();
  await db.route_stops.where('route_id').equals(routeId).and((s) => s.tenant_id === tenantId).delete();
}

export async function reorderTenantRouteStops(
  routeId: string,
  customerIdsInOrder: string[],
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  // Clear existing stops for this route and recreate with new sequence
  await db.route_stops.where('route_id').equals(routeId).and((s) => s.tenant_id === tenantId).delete();
  const newStops: RouteStop[] = customerIdsInOrder.map((custId, index) => ({
    tenant_id: tenantId,
    route_id: routeId,
    customer_id: custId,
    stop_sequence: index + 1,
    notes: `Stop #${index + 1}`,
  }));
  await db.route_stops.bulkAdd(newStops);
}

export async function assignCustomerToRoute(
  routeId: string,
  customerId: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  const existingStops = await getTenantRouteStops(routeId, tenantId);
  const alreadyAssigned = existingStops.some((s) => s.customer_id === customerId);
  if (!alreadyAssigned) {
    const nextSeq = existingStops.length + 1;
    await db.route_stops.add({
      tenant_id: tenantId,
      route_id: routeId,
      customer_id: customerId,
      stop_sequence: nextSeq,
      notes: `Stop #${nextSeq}`,
    });
  }

  // Also update customer.route in customers table to keep synced
  const route = await db.routes.get(routeId);
  if (route) {
    await db.customers.update(customerId, { route: route.route_name });
  }
}

export async function removeCustomerFromRoute(
  routeId: string,
  customerId: string,
  tenantId: string = ACTIVE_TENANT_ID
): Promise<void> {
  await db.route_stops
    .where('route_id')
    .equals(routeId)
    .and((s) => s.tenant_id === tenantId && s.customer_id === customerId)
    .delete();

  // Renumber remaining stops
  const remaining = await getTenantRouteStops(routeId, tenantId);
  const remainingCustomerIds = remaining.map((s) => s.customer_id);
  await reorderTenantRouteStops(routeId, remainingCustomerIds, tenantId);
}

export async function logZeroSaleCall(zeroSale: ZeroSaleCall): Promise<void> {
  await db.zero_sales.add(zeroSale);
}

/**
 * Route Delivery & Recovery Summary (Summary #1, #2...) Persistence
 */
export async function getTenantRouteSummaries(): Promise<RouteDeliverySummary[]> {
  try {
    const list = await db.route_summaries.toArray();
    return list.sort((a, b) => b.summaryNumber - a.summaryNumber);
  } catch (err) {
    console.warn('Failed to get route summaries:', err);
    return [];
  }
}

export async function saveRouteSummary(summary: RouteDeliverySummary): Promise<void> {
  await db.route_summaries.put(summary);
}

export async function updateRouteSummary(summary: RouteDeliverySummary): Promise<void> {
  await db.route_summaries.put(summary);
}

export async function deleteRouteSummary(summaryId: string): Promise<void> {
  await db.route_summaries.delete(summaryId);
}

export { db, OmniSalesDB };


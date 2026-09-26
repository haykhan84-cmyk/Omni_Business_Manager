import { UserAccount, UserRole, UserSession, Employee } from '../types';
import { ACTIVE_TENANT_ID } from '../db/localDb';
import { db, INITIAL_EMPLOYEES, seedInitialEmployeesIfEmpty } from '../db';
import { queryEmployeeFromSupabase } from '../db/supabase';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'EMP-001',
    employeeId: 'EMP-001',
    name: 'Haji Noor Mohammad (Managing Director)',
    phone: '0300-9821450',
    pin: '1234',
    role: 'ADMIN',
    roleTitle: 'Owner & Managing Director',
    assignedRoute: 'Headquarters / All Routes',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'EMP-101',
    employeeId: 'EMP-101',
    name: 'Bilal Swati (Order Booker)',
    phone: '0300-1122334',
    pin: '1122',
    role: 'ORDER_BOOKER',
    roleTitle: 'Senior Field Order Booker',
    assignedRoute: 'Swat Valley - Route A',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'EMP-201',
    employeeId: 'EMP-201',
    name: 'Tariq Driver (Dispatch Van 04)',
    phone: '0300-5566778',
    pin: '3344',
    role: 'DELIVERY_DRIVER',
    roleTitle: 'Van Delivery Driver',
    assignedRoute: 'Mingora Central Sector',
    vanAssigned: 'Suzuki Bolan (SWT-8821)',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'EMP-301',
    employeeId: 'EMP-301',
    name: 'Rashid Jan (Depot Supervisor)',
    phone: '0300-7788990',
    pin: '5566',
    role: 'WAREHOUSE_SUPERVISOR',
    roleTitle: 'Depot & GRN Supervisor',
    assignedRoute: 'Depot & Central Warehouse',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'EMP-401',
    employeeId: 'EMP-401',
    name: 'Kamran Cashier (Head Cashier)',
    phone: '0300-3344556',
    pin: '7788',
    role: 'ACCOUNTANT',
    roleTitle: 'Head Cashier & Accountant',
    assignedRoute: 'Finance & Roznamcha Desk',
    tenant_id: ACTIVE_TENANT_ID,
  },
];

const SESSION_STORAGE_KEY = 'omnisales_auth_session';

/**
 * Normalizes phone numbers for matching (removes hyphens, spaces, leading 0 or +92)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Maps human-readable Employee designation to system RBAC UserRole
 */
export function mapEmployeeRoleToUserRole(role: string): UserRole {
  if (!role) return 'ORDER_BOOKER';
  const r = role.toLowerCase();
  if (r.includes('admin') || r.includes('owner') || r.includes('director') || r.includes('manager') || r.includes('office manager')) {
    return 'ADMIN';
  }
  if (r.includes('booker') || r.includes('sales') || r.includes('order')) {
    return 'ORDER_BOOKER';
  }
  if (r.includes('driver') || r.includes('delivery') || r.includes('van helper') || r.includes('loader') || r.includes('mazdoor') || r.includes('office boy')) {
    return 'DELIVERY_DRIVER';
  }
  if (r.includes('warehouse') || r.includes('depot') || r.includes('grn') || r.includes('supervisor')) {
    return 'WAREHOUSE_SUPERVISOR';
  }
  if (r.includes('cashier') || r.includes('accountant') || r.includes('recovery')) {
    return 'ACCOUNTANT';
  }
  return 'ORDER_BOOKER';
}

/**
 * Converts an Employee record to an authenticated UserAccount
 */
export function employeeToUserAccount(emp: Employee): UserAccount {
  const role = mapEmployeeRoleToUserRole(emp.role);
  return {
    id: emp.id,
    employeeId: emp.id,
    name: emp.name,
    phone: emp.phone,
    pin: emp.pin || '1234',
    role,
    roleTitle: emp.role,
    assignedRoute: emp.assigned_route || 'General Market Beat',
    vanAssigned: emp.van_assigned,
    tenant_id: emp.tenant_id || ACTIVE_TENANT_ID,
  };
}

/**
 * Authenticates user credentials against the real database (db.employees in Dexie & Supabase)
 * Queries by ID OR Phone + 4-digit PIN
 */
export async function authenticateUser(
  identifier: string,
  pin: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanId = identifier.trim();
  const cleanPin = pin.trim();

  if (!cleanId) {
    return { success: false, error: 'Please enter your Employee ID or Mobile Number.' };
  }
  if (!cleanPin) {
    return { success: false, error: 'Please enter your 4-digit Security PIN.' };
  }

  // 1. Ensure initial staff exist in local Dexie if empty
  await seedInitialEmployeesIfEmpty();

  // 2. Fetch employees from local Dexie database
  let allEmployees: Employee[] = [];
  try {
    allEmployees = await db.employees.toArray();
  } catch (err) {
    console.warn('Could not read db.employees from Dexie:', err);
  }

  const normInput = cleanId.toLowerCase();
  const normInputPhone = normalizePhone(cleanId);
  const cleanDigits = normInputPhone.slice(-7); // Last 7 digits for phone matching

  // Match in local Dexie database by id OR phone
  let matchedEmp = allEmployees.find((e) => {
    // Exact or case-insensitive ID match (e.g. EMP-101, emp-101, 101)
    if (e.id.toLowerCase() === normInput) return true;
    if (e.id.toLowerCase().replace(/[^a-z0-9]/g, '') === normInput.replace(/[^a-z0-9]/g, '')) return true;

    // Phone match
    if (e.phone) {
      const p = normalizePhone(e.phone);
      if (p && cleanDigits.length >= 7 && p.includes(cleanDigits)) return true;
    }

    // Quick role aliases for testing
    if (normInput === 'admin' && (e.role.includes('Admin') || e.role.includes('Owner'))) return true;
    if (normInput === 'sales' && e.role.includes('Order Booker')) return true;
    if (normInput === 'driver' && e.role.includes('Driver')) return true;
    if (normInput === 'warehouse' && (e.role.includes('Warehouse') || e.role.includes('Supervisor'))) return true;
    if (normInput === 'cashier' && (e.role.includes('Cashier') || e.role.includes('Accountant'))) return true;

    return false;
  });

  // 3. If not found locally in Dexie, query remote Supabase
  if (!matchedEmp) {
    try {
      const remoteEmp = await queryEmployeeFromSupabase(cleanId);
      if (remoteEmp) {
        matchedEmp = remoteEmp;
        // Cache to Dexie for offline login next time
        await db.employees.put(remoteEmp);
      }
    } catch (err) {
      console.warn('Supabase employee lookup notice:', err);
    }
  }

  // 4. Fallback check against DEFAULT_USERS if not in employees table
  if (!matchedEmp) {
    const defaultUser = DEFAULT_USERS.find((u) => {
      if (u.employeeId.toLowerCase() === normInput) return true;
      if (u.phone && cleanDigits.length >= 7 && normalizePhone(u.phone).includes(cleanDigits)) return true;
      if (normInput === 'admin' && u.role === 'ADMIN') return true;
      if (normInput === 'sales' && u.role === 'ORDER_BOOKER') return true;
      if (normInput === 'driver' && u.role === 'DELIVERY_DRIVER') return true;
      if (normInput === 'warehouse' && u.role === 'WAREHOUSE_SUPERVISOR') return true;
      if (normInput === 'cashier' && u.role === 'ACCOUNTANT') return true;
      return false;
    });

    if (defaultUser) {
      if (defaultUser.pin !== cleanPin) {
        return {
          success: false,
          error: `Invalid PIN for ${defaultUser.name}. Please enter your 4-digit PIN.`,
        };
      }
      const session: UserSession = {
        user: defaultUser,
        loginTime: new Date().toISOString(),
        rememberMe,
      };
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch (e) {
        console.warn('Failed to store session:', e);
      }
      return { success: true, user: defaultUser };
    }

    return {
      success: false,
      error: `Employee record not found for "${cleanId}". Please check Employee ID or Mobile Number.`,
    };
  }

  // 5. Check PIN
  const expectedPin = (matchedEmp.pin || '1234').trim();
  if (expectedPin !== cleanPin) {
    return {
      success: false,
      error: `Invalid Security PIN for ${matchedEmp.name}. Please enter your 4-digit PIN.`,
    };
  }

  // 6. Build authenticated user and link their real name & assigned route!
  const userAccount = employeeToUserAccount(matchedEmp);

  const session: UserSession = {
    user: userAccount,
    loginTime: new Date().toISOString(),
    rememberMe,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }

  return { success: true, user: userAccount };
}

/**
 * Returns currently active user session, if any
 */
export function getStoredSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UserSession;
    if (!session || !session.user) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Clears current session
 */
export function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}

/**
 * Returns all active users from db.employees for the login screen quick selector
 */
export async function getLiveUsersForQuickLogin(): Promise<UserAccount[]> {
  try {
    await seedInitialEmployeesIfEmpty();
    const emps = await db.employees.toArray();
    if (emps.length > 0) {
      return emps.map(employeeToUserAccount);
    }
  } catch (err) {
    console.warn('Could not load live employees:', err);
  }
  return DEFAULT_USERS;
}

/**
 * RBAC Permission Check Utility
 */
export const Permissions = {
  canSwitchMode: (role: UserRole) => role === 'ADMIN',
  canAccessConsole: (role: UserRole) => role === 'ADMIN' || role === 'ACCOUNTANT' || role === 'WAREHOUSE_SUPERVISOR',
  canViewCostPrice: (role: UserRole) => role === 'ADMIN' || role === 'ACCOUNTANT',
  canEditCatalog: (role: UserRole) => role === 'ADMIN',
  canManageHR: (role: UserRole) => role === 'ADMIN',
  canViewCompanyRoznamcha: (role: UserRole) => role === 'ADMIN' || role === 'ACCOUNTANT',
  canBookOrders: (role: UserRole) => role === 'ADMIN' || role === 'ORDER_BOOKER',
  canDeliverOrders: (role: UserRole) => role === 'ADMIN' || role === 'DELIVERY_DRIVER',
  canReceiveGRN: (role: UserRole) => role === 'ADMIN' || role === 'WAREHOUSE_SUPERVISOR',
  canManageSettings: (role: UserRole) => role === 'ADMIN',
};

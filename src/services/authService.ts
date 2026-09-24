import { UserAccount, UserRole, UserSession } from '../types';
import { ACTIVE_TENANT_ID } from '../db/localDb';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-emp-001',
    employeeId: 'EMP-001',
    name: 'Haji Noor Mohammad (Managing Director)',
    phone: '0300-9821450',
    pin: '1234',
    role: 'ADMIN',
    roleTitle: 'Owner & Managing Director',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'user-emp-101',
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
    id: 'user-emp-201',
    employeeId: 'EMP-201',
    name: 'Tariq Driver (Dispatch Van 04)',
    phone: '0300-5566778',
    pin: '3344',
    role: 'DELIVERY_DRIVER',
    roleTitle: 'Van Delivery Driver',
    vanAssigned: 'Suzuki Bolan (SWT-8821)',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'user-emp-301',
    employeeId: 'EMP-301',
    name: 'Rashid Jan (Depot Supervisor)',
    phone: '0300-7788990',
    pin: '5566',
    role: 'WAREHOUSE_SUPERVISOR',
    roleTitle: 'Depot & GRN Supervisor',
    tenant_id: ACTIVE_TENANT_ID,
  },
  {
    id: 'user-emp-401',
    employeeId: 'EMP-401',
    name: 'Kamran Cashier (Head Cashier)',
    phone: '0300-3344556',
    pin: '7788',
    role: 'ACCOUNTANT',
    roleTitle: 'Head Cashier & Accountant',
    tenant_id: ACTIVE_TENANT_ID,
  },
];

const SESSION_STORAGE_KEY = 'omnisales_auth_session';
const USERS_STORAGE_KEY = 'omnisales_custom_users';

/**
 * Normalizes phone numbers for matching (removes hyphens, spaces, leading 0 or +92)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Returns all available users (default pre-seeded + any custom created users)
 */
export function getAllUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return DEFAULT_USERS;
    const custom = JSON.parse(raw);
    if (!Array.isArray(custom)) return DEFAULT_USERS;

    // Merge custom users with default users by id or employeeId
    const mergedMap = new Map<string, UserAccount>();
    DEFAULT_USERS.forEach((u) => mergedMap.set(u.employeeId.toUpperCase(), u));
    custom.forEach((u) => mergedMap.set(u.employeeId.toUpperCase(), u));
    return Array.from(mergedMap.values());
  } catch {
    return DEFAULT_USERS;
  }
}

/**
 * Authenticates user credentials (offline-first from local Dexie / storage)
 */
export function authenticateUser(
  identifier: string,
  pin: string,
  rememberMe: boolean = true
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanId = identifier.trim();
  const cleanPin = pin.trim();

  if (!cleanId) {
    return { success: false, error: 'Please enter your Employee ID or Mobile Number.' };
  }
  if (!cleanPin) {
    return { success: false, error: 'Please enter your 4-digit PIN or password.' };
  }

  const users = getAllUsers();
  const normId = cleanId.toLowerCase();
  const normInputPhone = normalizePhone(cleanId);

  // Match by Employee ID, Phone, Name snippet, or quick role alias (admin, sales, driver, warehouse, cashier)
  const matchedUser = users.find((u) => {
    if (u.employeeId.toLowerCase() === normId) return true;
    if (u.phone && normalizePhone(u.phone).includes(normInputPhone) && normInputPhone.length >= 7) return true;
    if (normId === 'admin' && u.role === 'ADMIN') return true;
    if (normId === 'sales' && u.role === 'ORDER_BOOKER') return true;
    if (normId === 'driver' && u.role === 'DELIVERY_DRIVER') return true;
    if (normId === 'warehouse' && u.role === 'WAREHOUSE_SUPERVISOR') return true;
    if (normId === 'cashier' && u.role === 'ACCOUNTANT') return true;
    return false;
  });

  if (!matchedUser) {
    return {
      success: false,
      error: `Employee record not found for "${cleanId}". Check ID or tap a Demo user below.`,
    };
  }

  if (matchedUser.pin !== cleanPin) {
    return {
      success: false,
      error: 'Invalid 4-digit PIN. Try default PIN (1234 for Admin, 1122 for Booker, 3344 for Driver).',
    };
  }

  const session: UserSession = {
    user: matchedUser,
    loginTime: new Date().toISOString(),
    rememberMe,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }

  return { success: true, user: matchedUser };
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

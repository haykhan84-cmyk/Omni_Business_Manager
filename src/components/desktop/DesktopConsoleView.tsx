import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Wallet,
  Users,
  Printer,
  Truck,
  BarChart3,
  Navigation,
  Settings,
  Landmark,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { BankAccount, CompanyProfile, Customer, GRNDocket, Order, Product, RoznamchaEntry, UserAccount } from '../../types';
import { DesktopOverview } from './DesktopOverview';
import { DesktopProductCatalog } from './DesktopProductCatalog';
import { DesktopRoznamcha } from './DesktopRoznamcha';
import { DesktopCustomer360 } from './DesktopCustomer360';
import { DesktopPrintStudio } from './DesktopPrintStudio';
import { DesktopInventoryGRN } from './DesktopInventoryGRN';
import { DesktopReportsEngine } from './DesktopReportsEngine';
import { DesktopStaffAttendance } from './DesktopStaffAttendance';
import { DesktopSalesRoutes } from './DesktopSalesRoutes';
import { DesktopConsoleSettings } from './DesktopConsoleSettings';

interface DesktopConsoleViewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  grnDockets: GRNDocket[];
  cashInHand: number;
  openingCash: number;
  isOnline: boolean;
  bankAccount: BankAccount;
  companyProfile: CompanyProfile;
  currentUser?: UserAccount;
  calculatedBankBalance?: number;
  syncQueueCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => Promise<void>;
  onSwitchToMobile?: () => void;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAddRoznamchaEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'currentBalance'>) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
  onDeleteRoznamchaEntry: (entryId: string) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onReceiveStock: (docket: GRNDocket, lineUpdates: { productId: string; addedCartons: number }[]) => Promise<void>;
  onAddCustomGRN: (docket: Omit<GRNDocket, 'id'>, lineUpdates: { productId: string; addedCartons: number }[]) => Promise<void>;
  onUpdateOpeningCash: (amount: number) => void;
  onUpdateBankAccount: (account: BankAccount) => Promise<void> | void;
  onUpdateCompanyProfile: (profile: CompanyProfile) => Promise<void> | void;
  onClearAllData: () => Promise<void>;
  onLoadSampleData?: () => Promise<void>;
}

export const DesktopConsoleView: React.FC<DesktopConsoleViewProps> = ({
  products,
  customers,
  orders,
  roznamcha,
  grnDockets,
  cashInHand,
  openingCash,
  isOnline,
  bankAccount,
  companyProfile,
  currentUser,
  calculatedBankBalance = 0,
  syncQueueCount = 0,
  isSyncing = false,
  onSyncNow,
  onSwitchToMobile,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddRoznamchaEntry,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onDeleteRoznamchaEntry,
  onDeleteOrder,
  onReceiveStock,
  onAddCustomGRN,
  onUpdateOpeningCash,
  onUpdateBankAccount,
  onUpdateCompanyProfile,
  onClearAllData,
  onLoadSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'sales_routes'
    | 'reports'
    | 'inventory_grn'
    | 'catalog'
    | 'roznamcha'
    | 'customers'
    | 'staff_attendance'
    | 'print'
    | 'settings'
  >('overview');

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const rawNavItems = [
    { id: 'overview' as const, label: 'Executive Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'ACCOUNTANT', 'WAREHOUSE_SUPERVISOR'] },
    { id: 'catalog' as const, label: 'Master Product Catalog', shortLabel: 'Catalog', icon: Package, roles: ['ADMIN', 'WAREHOUSE_SUPERVISOR'] },
    { id: 'inventory_grn' as const, label: 'Inventory & GRN', shortLabel: 'Inventory', icon: Truck, roles: ['ADMIN', 'WAREHOUSE_SUPERVISOR'] },
    { id: 'roznamcha' as const, label: 'Financial Roznamcha & Banks', shortLabel: 'Roznamcha', icon: Wallet, roles: ['ADMIN', 'ACCOUNTANT'] },
    { id: 'customers' as const, label: 'Customer 360 & Credit', shortLabel: 'Clients 360', icon: Users, roles: ['ADMIN', 'ACCOUNTANT'] },
    { id: 'staff_attendance' as const, label: 'HR & Staff Payroll', shortLabel: 'HR & Payroll', icon: Users, roles: ['ADMIN'] },
    { id: 'print' as const, label: 'Print Studio (A4 / Thermal)', shortLabel: 'Print Studio', icon: Printer, roles: ['ADMIN', 'ACCOUNTANT'] },
    { id: 'sales_routes' as const, label: 'Sales Routes & Beat', shortLabel: 'Routes', icon: Navigation, roles: ['ADMIN'] },
    { id: 'reports' as const, label: 'Reports & Analytics', shortLabel: 'Reports', icon: BarChart3, roles: ['ADMIN', 'ACCOUNTANT'] },
    { id: 'settings' as const, label: 'System Settings & Data', shortLabel: 'Settings', icon: Settings, roles: ['ADMIN'] },
  ];

  // Filter based on user role permissions (if admin or no user defined, show all)
  const navItems = rawNavItems.filter((item) => {
    if (!currentUser || currentUser.role === 'ADMIN') return true;
    return item.roles.includes(currentUser.role);
  });

  const activeNavItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  const handleSelectTab = (tabId: any) => {
    setActiveTab(tabId);
    setIsMobileDrawerOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col space-y-4 sm:space-y-6 py-3 sm:py-6 px-3 sm:px-6">
      {/* Mobile Drawer Navigation Header (< 768px / md:hidden) */}
      <div className="md:hidden bg-white rounded-2xl p-3 border border-slate-200 shadow-sm print:hidden flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Section</div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>{activeNavItem.label}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <span>Sections</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide-over Mobile Drawer Backdrop & Panel */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-xs bg-slate-900 text-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-black text-white text-xs shadow-sm">
                  OS
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight text-white">Console Menu</div>
                  <div className="text-[10px] text-amber-400">PrimeLink Distribution</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical Sections List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Console Modules
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>

            {/* User Role Card at bottom */}
            {currentUser && (
              <div className="p-3 border-t border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-amber-400 font-bold shrink-0">
                    {currentUser.role[0]}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Role: {currentUser.role}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Horizontal Utility Bar Navigation (Visible >= 768px / md:flex) */}
      <div className="hidden md:flex bg-white rounded-2xl p-2 border border-slate-200 shadow-sm print:hidden items-center justify-between overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Tab Panels */}
      <div className="w-full">
        {activeTab === 'overview' && (
          <DesktopOverview
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            grnDockets={grnDockets}
            cashInHand={cashInHand}
            openingCash={openingCash}
            isOnline={isOnline}
            syncQueueCount={syncQueueCount}
            isSyncing={isSyncing}
            onSyncNow={onSyncNow}
            onSwitchToMobile={onSwitchToMobile}
            onNavigateTab={(tab) => {
              setActiveTab(tab as any);
            }}
            onAddRoznamchaEntry={onAddRoznamchaEntry}
            onAddProduct={onAddProduct}
            onDeleteOrder={onDeleteOrder}
          />
        )}

        {activeTab === 'sales_routes' && (
          <DesktopSalesRoutes
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
          />
        )}

        {activeTab === 'reports' && (
          <DesktopReportsEngine
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            grnDockets={grnDockets}
            cashInHand={cashInHand}
            openingCash={openingCash}
          />
        )}

        {activeTab === 'staff_attendance' && (
          <DesktopStaffAttendance
            roznamcha={roznamcha}
            orders={orders}
            cashInHand={cashInHand}
            onAddRoznamchaEntry={onAddRoznamchaEntry}
          />
        )}

        {activeTab === 'inventory_grn' && (
          <DesktopInventoryGRN
            products={products}
            grnDockets={grnDockets}
            onReceiveStock={onReceiveStock}
            onAddCustomGRN={onAddCustomGRN}
          />
        )}

        {activeTab === 'catalog' && (
          <DesktopProductCatalog
            products={products}
            onAddProduct={onAddProduct}
            onUpdateProduct={onUpdateProduct}
            onDeleteProduct={onDeleteProduct}
          />
        )}

        {activeTab === 'roznamcha' && (
          <DesktopRoznamcha
            entries={roznamcha}
            customers={customers}
            orders={orders}
            grnDockets={grnDockets}
            openingCash={openingCash}
            bankAccount={bankAccount}
            companyProfile={companyProfile}
            calculatedBankBalance={calculatedBankBalance}
            onAddEntry={onAddRoznamchaEntry}
            onDeleteRoznamchaEntry={onDeleteRoznamchaEntry}
            onUpdateOpeningCash={onUpdateOpeningCash}
            onUpdateBankAccount={onUpdateBankAccount}
            onUpdateCompanyProfile={onUpdateCompanyProfile}
          />
        )}

        {activeTab === 'customers' && (
          <DesktopCustomer360
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            onAddCustomer={onAddCustomer}
            onUpdateCustomer={onUpdateCustomer}
            onDeleteCustomer={onDeleteCustomer}
            onDeleteOrder={onDeleteOrder}
          />
        )}

        {activeTab === 'print' && (
          <DesktopPrintStudio
            orders={orders}
            customers={customers}
            bankAccount={bankAccount}
            companyProfile={companyProfile}
          />
        )}

        {activeTab === 'settings' && (
          <DesktopConsoleSettings
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            grnDockets={grnDockets}
            cashInHand={cashInHand}
            openingCash={openingCash}
            isOnline={isOnline}
            syncQueueCount={syncQueueCount}
            bankAccount={bankAccount}
            companyProfile={companyProfile}
            calculatedBankBalance={calculatedBankBalance}
            onUpdateOpeningCash={onUpdateOpeningCash}
            onUpdateBankAccount={onUpdateBankAccount}
            onUpdateCompanyProfile={onUpdateCompanyProfile}
            onClearAllData={onClearAllData}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onLoadSampleData={onLoadSampleData}
          />
        )}
      </div>
    </div>
  );
};

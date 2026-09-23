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
} from 'lucide-react';
import { Customer, GRNDocket, Order, Product, RoznamchaEntry } from '../../types';
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
  onReceiveStock: (docket: GRNDocket, lineUpdates: { productId: string; addedCartons: number }[]) => Promise<void>;
  onAddCustomGRN: (docket: Omit<GRNDocket, 'id'>, lineUpdates: { productId: string; addedCartons: number }[]) => Promise<void>;
  onUpdateOpeningCash: (amount: number) => void;
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
  onReceiveStock,
  onAddCustomGRN,
  onUpdateOpeningCash,
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

  const navItems = [
    { id: 'overview' as const, label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'sales_routes' as const, label: 'SALES & ROUTES', icon: Navigation },
    { id: 'reports' as const, label: 'REPORTS & ANALYTICS', icon: BarChart3 },
    { id: 'staff_attendance' as const, label: 'HR & PAYROLL', icon: Users },
    { id: 'inventory_grn' as const, label: 'INVENTORY & GRN', icon: Truck },
    { id: 'catalog' as const, label: 'MASTER CATALOG', icon: Package },
    { id: 'roznamcha' as const, label: 'FINANCIAL ROZNAMCHA', icon: Wallet },
    { id: 'customers' as const, label: 'CRM & CLIENT 360', icon: Users },
    { id: 'print' as const, label: 'PRINT STUDIO', icon: Printer },
    { id: 'settings' as const, label: 'SETTINGS & DATA', icon: Settings },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col space-y-6 py-6 px-4 sm:px-6">
      {/* Utility Bar Navigation (Matching Desktop ERP prototype) */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm print:hidden flex items-center justify-between overflow-x-auto no-scrollbar">
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
      <div>
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
          />
        )}

        {activeTab === 'sales_routes' && (
          <DesktopSalesRoutes
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            onRefreshData={onSyncNow}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
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
            openingCash={openingCash}
            onAddEntry={onAddRoznamchaEntry}
            onUpdateOpeningCash={onUpdateOpeningCash}
          />
        )}

        {activeTab === 'customers' && (
          <DesktopCustomer360
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            onAddCustomer={onAddCustomer}
            onUpdateCustomer={onUpdateCustomer}
          />
        )}

        {activeTab === 'print' && (
          <DesktopPrintStudio orders={orders} customers={customers} />
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
            onUpdateOpeningCash={onUpdateOpeningCash}
            onClearAllData={onClearAllData}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onLoadSampleData={onLoadSampleData}
          />
        )}
      </div>
    </div>
  );
};

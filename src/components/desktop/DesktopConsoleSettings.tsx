import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Package,
  Users,
  Database,
  Download,
  Upload,
  RefreshCw,
  Plus,
  ShieldAlert,
  Server,
  Cloud,
  Check,
  Landmark,
  Building2,
} from 'lucide-react';
import { BankAccount, CompanyProfile, Customer, GRNDocket, Order, Product, RoznamchaEntry } from '../../types';
import { formatPKR } from '../../utils/calculations';
import { BankAccountsManagement } from './BankAccountsManagement';

interface DesktopConsoleSettingsProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  grnDockets: GRNDocket[];
  cashInHand: number;
  openingCash: number;
  isOnline: boolean;
  syncQueueCount?: number;
  bankAccount: BankAccount;
  companyProfile: CompanyProfile;
  calculatedBankBalance?: number;
  onUpdateOpeningCash: (amount: number) => void;
  onUpdateBankAccount: (account: BankAccount) => Promise<void> | void;
  onUpdateCompanyProfile: (profile: CompanyProfile) => Promise<void> | void;
  onClearAllData: () => Promise<void>;
  onNavigateTab: (tab: string) => void;
  onLoadSampleData?: () => Promise<void>;
  initialSettingsSubTab?: 'general' | 'banking';
}

export const DesktopConsoleSettings: React.FC<DesktopConsoleSettingsProps> = ({
  products,
  customers,
  orders,
  roznamcha,
  grnDockets,
  cashInHand,
  openingCash,
  isOnline,
  syncQueueCount = 0,
  bankAccount,
  companyProfile,
  calculatedBankBalance = 0,
  onUpdateOpeningCash,
  onUpdateBankAccount,
  onUpdateCompanyProfile,
  onClearAllData,
  onNavigateTab,
  onLoadSampleData,
  initialSettingsSubTab = 'general',
}) => {
  // Sub-tab selection within settings
  const [activeSettingsSection, setActiveSettingsSection] = useState<'general' | 'banking'>(initialSettingsSubTab);

  // Opening Cash editing state
  const [openingCashInput, setOpeningCashInput] = useState<string>(openingCash.toString());
  const [cashSaveSuccess, setCashSaveSuccess] = useState<boolean>(false);

  // Clear DB confirmation modal state
  const [showConfirmResetModal, setShowConfirmResetModal] = useState<boolean>(false);
  const [isWiping, setIsWiping] = useState<boolean>(false);
  const [wipeSuccessMsg, setWipeSuccessMsg] = useState<string | null>(null);

  // Backup / Export state
  const [backupExportSuccess, setBackupExportSuccess] = useState<boolean>(false);

  const handleSaveOpeningCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingCashInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateOpeningCash(val);
      setCashSaveSuccess(true);
      setTimeout(() => setCashSaveSuccess(false), 3000);
    }
  };

  const handleExecuteWipe = async () => {
    setIsWiping(true);
    try {
      await onClearAllData();
      setShowConfirmResetModal(false);
      setOpeningCashInput('0');
      setWipeSuccessMsg('Database wiped successfully! You are now on a 100% clean slate.');
      setTimeout(() => setWipeSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to clear database:', err);
      alert('Error clearing database. Please try again.');
    } finally {
      setIsWiping(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      app: 'OmniSales ERP',
      version: '2.0.0',
      openingCash,
      products,
      customers,
      orders,
      roznamcha,
      grnDockets,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `omnisales-erp-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupExportSuccess(true);
    setTimeout(() => setBackupExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {wipeSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900 text-sm">{wipeSuccessMsg}</p>
              <p className="text-xs text-emerald-700">All tables are clean and ready for real operations.</p>
            </div>
          </div>
          <button
            onClick={() => setWipeSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Navigation Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold w-fit">
        <button
          onClick={() => setActiveSettingsSection('general')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'general'
              ? 'bg-white shadow-xs text-slate-900 font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-amber-600" />
          <span>General Database &amp; Vault Cash</span>
        </button>

        <button
          onClick={() => setActiveSettingsSection('banking')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'banking'
              ? 'bg-white shadow-xs text-cyan-900 font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4 text-cyan-600" />
          <span>Bank Accounts &amp; Company Profile</span>
          <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 text-[10px] rounded-full font-mono">
            Raast
          </span>
        </button>
      </div>

      {/* Render Banking Management Section */}
      {activeSettingsSection === 'banking' && (
        <BankAccountsManagement
          bankAccount={bankAccount}
          companyProfile={companyProfile}
          onUpdateBankAccount={onUpdateBankAccount}
          onUpdateCompanyProfile={onUpdateCompanyProfile}
          calculatedBankBalance={calculatedBankBalance}
        />
      )}

      {/* Render General Database & Vault Cash Section */}
      {activeSettingsSection === 'general' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Console Governance</span>
                <span>/</span>
                <span className="text-slate-800">Database &amp; System Settings</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">Console Settings &amp; Data Control</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Manage your local Dexie.js (IndexedDB) database, configure start-of-day Vault Cash, onboard real FMCG/Pharma items, or reset to a 100% clean slate.
              </p>
            </div>

            {/* Database Quick Health */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>IndexedDB Status:</span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Total Records: {products.length + customers.length + orders.length + roznamcha.length} items
                </div>
              </div>
            </div>
          </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Vault Cash & Quick Launch (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Vault Cash / Opening Cash Configuration */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Vault Cash / Opening Cash In Hand
                  </h2>
                  <p className="text-xs text-slate-500">
                    Set your physical morning cash balance before deliveries &amp; recoveries start.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                Current: {formatPKR(openingCash)}
              </span>
            </div>

            <form onSubmit={handleSaveOpeningCash} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Opening Cash Balance (PKR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(e.target.value)}
                    placeholder="Enter starting cash in hand (e.g. 0 or 50000)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Formula: <strong className="text-slate-700">Roznamcha Cash Balance = Opening Cash + Cash In (Recovery) - Cash Out (Expenses)</strong>.
                  Current calculated live cash in hand is <strong className="text-slate-900 font-mono">{formatPKR(cashInHand)}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpeningCashInput('0');
                      onUpdateOpeningCash(0);
                      setCashSaveSuccess(true);
                      setTimeout(() => setCashSaveSuccess(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Reset to Rs. 0
                  </button>
                  {cashSaveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Opening Cash Balance</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Quick Onboarding Shortcuts for Clean Slate */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-700">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Clean Slate Onboarding Shortcuts
                  </h2>
                  <p className="text-xs text-slate-500">
                    Quickly launch forms to add your real SKUs and retail accounts.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-900 text-xs">Master Product SKU</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-600">
                    {products.length} SKUs
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Add real FMCG products with SKU code, pack size, trade price, MSRP, and carton stock.
                </p>
                <button
                  onClick={() => onNavigateTab('catalog')}
                  className="w-full py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Go to + Add Product / SKU</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs">Retailer / Customer</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-600">
                    {customers.length} Shops
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Onboard real shops with shop name, proprietor, phone, route, credit limit, and ATL tax status.
                </p>
                <button
                  onClick={() => onNavigateTab('customers')}
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Go to + Add Customer / Shop</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Database Reset & Purge (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Database Reset & Clear All Data */}
          <div className="bg-rose-50/60 rounded-2xl p-6 border-2 border-rose-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-rose-950 text-sm sm:text-base">
                  Clear All Data / Reset Database
                </h2>
                <p className="text-xs text-rose-700">
                  Wipe all test entries and restore a 100% clean slate.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-rose-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                This action will wipe the following:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                <li>All products and Master SKU catalog items</li>
                <li>All retail customers and ledger balances</li>
                <li>All booked sales orders and dispatch records</li>
                <li>All Roznamcha daybook cash in/out entries</li>
                <li>All inbound GRN warehouse dockets</li>
                <li>Reset Opening Cash to Rs. 0</li>
              </ul>
            </div>

            <button
              onClick={() => setShowConfirmResetModal(true)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Data / Reset Database</span>
            </button>
            <p className="text-center text-[10px] text-rose-600 font-semibold">
              Instant 1-click purge. Use anytime you want to clear test data.
            </p>
          </div>

          {/* Card 4: Backup & Export JSON */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">
                  Database Backup &amp; Export
                </h2>
                <p className="text-xs text-slate-500">
                  Export your database state before purging or transferring.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Download a complete JSON snapshot of all products, customers, orders, and Roznamcha entries stored in your local IndexedDB.
            </p>

            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{backupExportSuccess ? 'Backup Downloaded ✓' : 'Export Full Backup (.json)'}</span>
            </button>
          </div>

          {/* Optional Sample Data Loader (clearly secondary) */}
          {onLoadSampleData && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-slate-800">Need Demo Data for Testing?</div>
                <p className="text-[11px] text-slate-500 truncate">
                  Load 2 sample FMCG SKUs and 1 test shop anytime.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Load sample test FMCG SKUs and demo retailer?')) {
                    await onLoadSampleData();
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                Load Sample
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

      {/* CONFIRMATION MODAL FOR CLEAR DATABASE */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Confirm Complete Database Wipe
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Are you sure you want to permanently clear all test records?
                  This will wipe all products, dummy customers, demo booked orders, and roznamcha vouchers, and reset opening cash in hand to Rs. 0.
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Warning:
                </div>
                <div className="text-[11px] text-rose-700">
                  This operation cannot be undone unless you have exported a JSON backup.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isWiping}
                  onClick={() => setShowConfirmResetModal(false)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isWiping}
                  onClick={handleExecuteWipe}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isWiping ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Wiping...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Wipe Everything</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

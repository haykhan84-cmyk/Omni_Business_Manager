import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  db,
  seedDatabaseIfEmpty,
  INITIAL_OPENING_CASH,
  INITIAL_BANK_ACCOUNT,
  DEFAULT_COMPANY_PROFILE,
  clearAllDatabaseData,
  loadSampleTestingData,
} from './db';
import { BankAccount, CompanyProfile, Customer, GRNDocket, Order, Product, RoznamchaEntry } from './types';
import { Header } from './components/Header';
import { MobileFieldView } from './components/mobile/MobileFieldView';
import { DesktopConsoleView } from './components/desktop/DesktopConsoleView';
import { SupabaseSyncModal } from './components/shared/SupabaseSyncModal';
import {
  checkSupabaseConnection,
  fetchSupabaseLiveCounts,
  syncOrderToSupabase,
  syncRoznamchaEntryToSupabase,
  syncProductToSupabase,
  syncCustomerToSupabase,
  syncAllToSupabase,
  syncBidirectional,
  pullAndMergeFromSupabase,
} from './db/supabase';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'mobile' | 'desktop'>('mobile');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);

  // Supabase Telemetry State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(true);
  const [supabaseCounts, setSupabaseCounts] = useState<{
    products: number;
    customers: number;
    orders: number;
    roznamcha: number;
  }>({ products: 0, customers: 0, orders: 0, roznamcha: 0 });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // App Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [roznamcha, setRoznamcha] = useState<RoznamchaEntry[]>([]);
  const [grnDockets, setGrnDockets] = useState<GRNDocket[]>([]);
  const [openingCash, setOpeningCash] = useState<number>(() => {
    const saved = localStorage.getItem('omnisales_opening_cash');
    return saved !== null ? Number(saved) : INITIAL_OPENING_CASH;
  });
  const [bankAccount, setBankAccount] = useState<BankAccount>(() => {
    try {
      const saved = localStorage.getItem('omnisales_bank_account');
      return saved ? JSON.parse(saved) : INITIAL_BANK_ACCOUNT;
    } catch {
      return INITIAL_BANK_ACCOUNT;
    }
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('omnisales_company_profile');
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY_PROFILE;
    } catch {
      return DEFAULT_COMPANY_PROFILE;
    }
  });
  const [isDbReady, setIsDbReady] = useState(false);

  // Refresh all state from Dexie IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [prods, custs, ords, roz, queue, grn, banks] = await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.orders.toArray(),
        db.roznamcha.toArray(),
        db.syncQueue.toArray(),
        db.grn.toArray(),
        db.bank_accounts.toArray(),
      ]);

      setProducts(prods);
      setCustomers(custs);
      setOrders(ords);
      setRoznamcha(roz);
      setSyncQueueCount(queue.length);
      setGrnDockets(grn);

      if (banks && banks.length > 0) {
        setBankAccount(banks[0]);
      }
    } catch (err) {
      console.error('Failed to load data from Dexie IndexedDB:', err);
    }
  }, []);

  // Initialize DB, restore records, and listen to online status
  useEffect(() => {
    async function init() {
      // 1. Immediately restore all local records from Dexie IndexedDB
      await refreshData();
      setIsDbReady(true);

      // 2. If online, connect to Supabase and perform bidirectional sync (pull remote records + push local changes)
      if (navigator.onLine) {
        try {
          const conn = await checkSupabaseConnection();
          setSupabaseConnected(conn.connected);

          if (conn.connected) {
            await syncBidirectional();
            const counts = await fetchSupabaseLiveCounts();
            setSupabaseCounts(counts);
            setLastSyncedAt(new Date().toISOString());
            // Refresh with all merged records
            await refreshData();
          }
        } catch (cloudErr) {
          console.warn('Initial Supabase sync check failed:', cloudErr);
        }
      }
    }
    init();

    // Listen to real browser online events
    const handleOnline = () => {
      setIsOnline(true);
      syncBidirectional()
        .then(() => fetchSupabaseLiveCounts())
        .then((counts) => setSupabaseCounts(counts))
        .then(() => refreshData())
        .catch((err) => console.warn('Online event sync error:', err));
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Responsive default mode: mobile on small screens, desktop on wide screens
    if (window.innerWidth >= 1024) {
      setCurrentMode('desktop');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData]);

  // Roznamcha Cash Balance calculation rule:
  // Roznamcha Cash Balance = Opening Cash + Cash In (Recovery) - Cash Out (Expenses)
  const cashInHand = useMemo(() => {
    const totalCashIn = roznamcha
      .filter((r) => r.type === 'cash_in')
      .reduce((acc, r) => acc + r.amount, 0);

    const totalCashOut = roznamcha
      .filter((r) => r.type === 'cash_out')
      .reduce((acc, r) => acc + r.amount, 0);

    return openingCash + totalCashIn - totalCashOut;
  }, [roznamcha, openingCash]);

  // Live Bank Balance calculation:
  // Starting/Opening Bank Balance + Bank Cash Deposits/Raast recoveries - Bank/Cheque supplier disbursements
  const bankBalance = useMemo(() => {
    const opening = bankAccount.openingBalance || 0;

    const bankInflows = roznamcha
      .filter(
        (r) =>
          r.type === 'cash_in' &&
          (r.category === 'Bank Cash Deposit' ||
            r.paymentMethod === 'Bank AL Habib / Raast' ||
            r.narration.toLowerCase().includes('bank') ||
            r.narration.toLowerCase().includes('raast'))
      )
      .reduce((acc, r) => acc + r.amount, 0);

    const bankOutflows = roznamcha
      .filter(
        (r) =>
          r.type === 'cash_out' &&
          (r.paymentMethod === 'Bank AL Habib / Raast' ||
            r.paymentMethod === 'Cheque' ||
            r.category === 'Bank Cash Deposit' ||
            r.narration.toLowerCase().includes('bank') ||
            r.narration.toLowerCase().includes('cheque'))
      )
      .reduce((acc, r) => acc + r.amount, 0);

    return opening + bankInflows - bankOutflows;
  }, [bankAccount.openingBalance, roznamcha]);

  // Toggle Online/Offline simulation
  const handleToggleOnline = () => {
    setIsOnline((prev) => !prev);
  };

  // Sync Trigger: Bidirectional sync between IndexedDB (Dexie) and Supabase Cloud
  // Safe: Re-fetches remote data, pushes local changes, NEVER clears tables
  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      if (isOnline) {
        // 1. Bidirectional sync: push local to Supabase, pull cloud records to Dexie
        await syncBidirectional();

        // 2. Mark local orders and roznamcha as synced
        await db.orders.toCollection().modify({ synced: true });
        await db.roznamcha.toCollection().modify({ synced: true });
        await db.syncQueue.clear();

        const counts = await fetchSupabaseLiveCounts();
        setSupabaseCounts(counts);
        setLastSyncedAt(new Date().toISOString());
      } else {
        // In offline mode, simulate quick pause
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 3. Refresh React state with updated local and merged cloud data
      await refreshData();
    } catch (err) {
      console.error('Error during cloud sync & refresh:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Start-of-Day Physical Vault Cash
  const handleUpdateOpeningCash = (amount: number) => {
    setOpeningCash(amount);
    localStorage.setItem('omnisales_opening_cash', String(amount));
  };

  // Update Bank Account Setup
  const handleUpdateBankAccount = async (account: BankAccount) => {
    setBankAccount(account);
    localStorage.setItem('omnisales_bank_account', JSON.stringify(account));
    try {
      await db.bank_accounts.put(account);
    } catch (err) {
      console.warn('Failed saving bank account to Dexie:', err);
    }
  };

  // Update Company Profile Setup
  const handleUpdateCompanyProfile = (profile: CompanyProfile) => {
    setCompanyProfile(profile);
    localStorage.setItem('omnisales_company_profile', JSON.stringify(profile));
  };

  // 1-Click Clear All Data / Reset Database to 100% Clean Slate
  const handleClearAllData = async () => {
    await clearAllDatabaseData();
    setOpeningCash(0);
    localStorage.removeItem('omnisales_opening_cash');
    localStorage.setItem('omnisales_clean_slate_applied_v2', 'true');
    await refreshData();
  };

  // Load optional FMCG sample test data on user demand
  const handleLoadSampleData = async () => {
    await loadSampleTestingData();
    await refreshData();
    if (isOnline) {
      await syncAllToSupabase();
      const counts = await fetchSupabaseLiveCounts();
      setSupabaseCounts(counts);
      setLastSyncedAt(new Date().toISOString());
    }
  };

  // 1. Order Booking Handler
  const handleSaveOrder = async (order: Order, cashCollected: number) => {
    const isOrderSynced = isOnline;

    // Save order to Dexie
    const localOrder = { ...order, synced: isOrderSynced };
    await db.orders.add(localOrder);

    // Update customer's outstanding balance
    const customer = await db.customers.get(order.customerId);
    let updatedCustomer: Customer | undefined;
    if (customer) {
      const newBal = customer.currentBalance + order.remainingBalance;
      updatedCustomer = { ...customer, currentBalance: newBal };
      await db.customers.update(order.customerId, { currentBalance: newBal });
    }

    // Decrement product inventory (cartons & pieces)
    const affectedProducts: Product[] = [];
    for (const item of order.items) {
      const prod = await db.products.get(item.productId);
      if (prod) {
        let newCarton = Math.max(0, prod.cartonStock - item.cartons);
        let newPieces = prod.piecesStock - item.pieces;
        if (newPieces < 0) {
          if (newCarton > 0) {
            newCarton -= 1;
            newPieces += prod.packSize;
          } else {
            newPieces = 0;
          }
        }
        await db.products.update(item.productId, {
          cartonStock: newCarton,
          piecesStock: newPieces,
        });
        affectedProducts.push({
          ...prod,
          cartonStock: newCarton,
          piecesStock: newPieces,
        });
      }
    }

    // If cash was collected on the spot, automatically log a Roznamcha Cash In entry!
    let rozEntry: RoznamchaEntry | null = null;
    if (cashCollected > 0) {
      rozEntry = {
        id: `roz-${Date.now()}`,
        entryNo: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        type: 'cash_in',
        category: 'Customer Recovery',
        amount: cashCollected,
        customerId: order.customerId,
        customerName: order.shopName,
        slipNo: order.orderNo,
        narration: `Spot order partial/full cash receipt (${order.orderNo})`,
        recordedBy: 'Tariq Khan (OB-04)',
        synced: isOnline,
      };
      await db.roznamcha.add(rozEntry);
    }

    // ONLINE SUPABASE SYNC:
    if (isOnline) {
      try {
        // 1. Sync updated customer record
        if (updatedCustomer) {
          await syncCustomerToSupabase(updatedCustomer);
        }

        // 2. Sync order to sales_orders
        await syncOrderToSupabase(localOrder, updatedCustomer || customer);

        // 3. Sync roznamcha entry to financial_roznamcha
        if (rozEntry) {
          await syncRoznamchaEntryToSupabase(rozEntry);
        }

        // 4. Sync updated product stock to products
        for (const p of affectedProducts) {
          await syncProductToSupabase(p);
        }

        // Refresh remote telemetry
        fetchSupabaseLiveCounts().then(setSupabaseCounts);
        setLastSyncedAt(new Date().toISOString());
      } catch (syncErr) {
        console.warn('Realtime Supabase sync notice:', syncErr);
      }
    } else {
      // If offline, queue for sync
      await db.syncQueue.add({
        id: `queue-${Date.now()}`,
        type: 'order',
        action: 'create',
        payload: order,
        timestamp: Date.now(),
      });
    }

    await refreshData();
  };

  // 2. Roznamcha Cash Entry Handler
  const handleAddRoznamchaEntry = async (
    entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>
  ) => {
    const entryNo =
      entry.type === 'cash_in'
        ? `RCP-${Math.floor(1000 + Math.random() * 9000)}`
        : `VCH-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEntry: RoznamchaEntry = {
      ...entry,
      id: `roz-${Date.now()}`,
      entryNo: entry.slipNo || entryNo,
      tenant_id: entry.tenant_id || 'tenant_pk_swat_1042',
      synced: isOnline,
    };

    await db.roznamcha.add(newEntry);

    // If debt recovery from customer, decrement customer balance!
    let updatedCust: Customer | undefined;
    if (entry.type === 'cash_in' && entry.customerId) {
      const cust = await db.customers.get(entry.customerId);
      if (cust) {
        const nextBal = Math.max(0, cust.currentBalance - entry.amount);
        updatedCust = { ...cust, currentBalance: nextBal };
        await db.customers.update(entry.customerId, { currentBalance: nextBal });
      }
    }

    // ONLINE SUPABASE SYNC:
    if (isOnline) {
      try {
        await syncRoznamchaEntryToSupabase(newEntry);
        if (updatedCust) {
          await syncCustomerToSupabase(updatedCust);
        }
        fetchSupabaseLiveCounts().then(setSupabaseCounts);
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        console.warn('Realtime Roznamcha Supabase sync notice:', err);
      }
    } else {
      // If offline, queue for sync
      await db.syncQueue.add({
        id: `queue-${Date.now()}`,
        type: 'roznamcha',
        action: 'create',
        payload: newEntry,
        timestamp: Date.now(),
      });
    }

    await refreshData();
  };

  // 3. Customer Handlers
  const handleAddCustomer = async (
    cust: Omit<Customer, 'id' | 'currentBalance'>
  ) => {
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      currentBalance: 0,
    };
    await db.customers.add(newCust);

    if (isOnline) {
      await syncCustomerToSupabase(newCust);
      fetchSupabaseLiveCounts().then(setSupabaseCounts);
      setLastSyncedAt(new Date().toISOString());
    }

    await refreshData();
  };

  const handleUpdateCustomer = async (cust: Customer) => {
    await db.customers.put(cust);

    if (isOnline) {
      await syncCustomerToSupabase(cust);
      fetchSupabaseLiveCounts().then(setSupabaseCounts);
      setLastSyncedAt(new Date().toISOString());
    }

    await refreshData();
  };

  // 4. Product Handlers
  const handleAddProduct = async (prod: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prod,
      id: `prod-${Date.now()}`,
    };
    await db.products.add(newProd);

    if (isOnline) {
      await syncProductToSupabase(newProd);
      fetchSupabaseLiveCounts().then(setSupabaseCounts);
      setLastSyncedAt(new Date().toISOString());
    }

    await refreshData();
  };

  const handleUpdateProduct = async (prod: Product) => {
    await db.products.put(prod);

    if (isOnline) {
      await syncProductToSupabase(prod);
      fetchSupabaseLiveCounts().then(setSupabaseCounts);
      setLastSyncedAt(new Date().toISOString());
    }

    await refreshData();
  };

  const handleDeleteProduct = async (productId: string) => {
    await db.products.delete(productId);
    await refreshData();
  };

  // 5. Warehouse Receiving & GRN Handler
  const handleReceiveStock = async (
    docket: GRNDocket,
    lineUpdates: { productId: string; addedCartons: number }[]
  ) => {
    // 1. Update the GRN docket in Dexie
    await db.grn.put(docket);

    // 2. Increment carton stock in Master Product Catalog for each accepted line item
    for (const update of lineUpdates) {
      if (update.addedCartons > 0) {
        const product = await db.products.get(update.productId);
        if (product) {
          const updatedCartonStock = product.cartonStock + update.addedCartons;
          await db.products.update(update.productId, {
            cartonStock: updatedCartonStock,
          });

          // Sync updated stock to Supabase
          if (isOnline) {
            syncProductToSupabase({
              ...product,
              cartonStock: updatedCartonStock,
            });
          }
        }
      }
    }

    if (isOnline) {
      fetchSupabaseLiveCounts().then(setSupabaseCounts);
      setLastSyncedAt(new Date().toISOString());
    } else {
      await db.syncQueue.add({
        id: `queue-${Date.now()}`,
        type: 'grn',
        action: 'update',
        payload: docket,
        timestamp: Date.now(),
      });
    }

    await refreshData();
  };

  const handleAddCustomGRN = async (
    docket: Omit<GRNDocket, 'id'>,
    lineUpdates: { productId: string; addedCartons: number }[]
  ) => {
    const newDocket: GRNDocket = {
      ...docket,
      id: `grn-${Date.now()}`,
    };
    await db.grn.add(newDocket);

    // Increase product carton count
    for (const update of lineUpdates) {
      if (update.addedCartons > 0) {
        const product = await db.products.get(update.productId);
        if (product) {
          const updatedCartonStock = product.cartonStock + update.addedCartons;
          await db.products.update(update.productId, {
            cartonStock: updatedCartonStock,
          });

          if (isOnline) {
            syncProductToSupabase({
              ...product,
              cartonStock: updatedCartonStock,
            });
          }
        }
      }
    }

    if (isOnline) {
      fetchSupabaseLiveCounts().then(setSupabaseCounts);
      setLastSyncedAt(new Date().toISOString());
    } else {
      await db.syncQueue.add({
        id: `queue-${Date.now()}`,
        type: 'grn',
        action: 'create',
        payload: newDocket,
        timestamp: Date.now(),
      });
    }

    await refreshData();
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-amber-600 animate-spin flex items-center justify-center font-black text-xl mb-4">
          OS
        </div>
        <div className="text-base font-bold">Initializing OmniSales ERP...</div>
        <div className="text-xs text-slate-400 mt-1">
          Booting Dexie.js (IndexedDB) &amp; Connecting to Supabase
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Universal Header with Supabase Telemetry & Live Bank Badge */}
      <Header
        currentMode={currentMode}
        onModeChange={(mode) => setCurrentMode(mode)}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        syncQueueCount={syncQueueCount}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        cashInHand={cashInHand}
        bankBalance={bankBalance}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        supabaseConnected={supabaseConnected}
      />

      {/* Supabase Cloud Live Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        syncQueueCount={syncQueueCount}
        supabaseCounts={supabaseCounts}
        lastSyncedAt={lastSyncedAt}
        connectionStatus={
          !isOnline ? 'offline' : supabaseConnected ? 'connected' : 'error'
        }
      />

      {/* Main Viewport Content */}
      <main className="flex-1 w-full">
        {currentMode === 'mobile' ? (
          <MobileFieldView
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            cashInHand={cashInHand}
            openingCash={openingCash}
            isOnline={isOnline}
            onSaveOrder={handleSaveOrder}
            onAddRoznamchaEntry={handleAddRoznamchaEntry}
            onAddCustomer={handleAddCustomer}
          />
        ) : (
          <DesktopConsoleView
            products={products}
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            grnDockets={grnDockets}
            cashInHand={cashInHand}
            openingCash={openingCash}
            isOnline={isOnline}
            bankAccount={bankAccount}
            companyProfile={companyProfile}
            calculatedBankBalance={bankBalance}
            syncQueueCount={syncQueueCount}
            isSyncing={isSyncing}
            onSyncNow={handleSyncNow}
            onSwitchToMobile={() => setCurrentMode('mobile')}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddRoznamchaEntry={handleAddRoznamchaEntry}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onReceiveStock={handleReceiveStock}
            onAddCustomGRN={handleAddCustomGRN}
            onUpdateOpeningCash={handleUpdateOpeningCash}
            onUpdateBankAccount={handleUpdateBankAccount}
            onUpdateCompanyProfile={handleUpdateCompanyProfile}
            onClearAllData={handleClearAllData}
            onLoadSampleData={handleLoadSampleData}
          />
        )}
      </main>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  Search,
  Phone,
  MessageSquare,
  Lock,
  CheckCircle,
  Plus,
  ShoppingCart,
  Receipt,
  FileText,
  UserPlus,
  Share2,
  X,
  CreditCard,
} from 'lucide-react';
import { Customer, Order, RoznamchaEntry } from '../../types';
import { formatPKR, formatDateTime } from '../../utils/calculations';

interface MobileClientLedgerProps {
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  onSelectCustomerForOrder: (customer: Customer) => void;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'currentBalance'>) => Promise<void>;
}

export const MobileClientLedger: React.FC<MobileClientLedgerProps> = ({
  customers,
  orders,
  roznamcha,
  onSelectCustomerForOrder,
  onAddCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('All');
  const [activeLedgerCustomer, setActiveLedgerCustomer] = useState<Customer | null>(null);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);

  // New Customer Form State
  const [newShopName, setNewShopName] = useState('');
  const [newProprietor, setNewProprietor] = useState('');
  const [newRoute, setNewRoute] = useState('Main Bazaar Route');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCnic, setNewCnic] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState(100000);
  const [newAtlStatus, setNewAtlStatus] = useState<'filer' | 'non_filer'>('filer');

  const routes = useMemo(() => {
    const set = new Set(customers.map((c) => c.route));
    return ['All', ...Array.from(set)];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchRoute = selectedRoute === 'All' || c.route === selectedRoute;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.shopName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.cnic && c.cnic.includes(q));
      return matchRoute && matchSearch;
    });
  }, [customers, selectedRoute, searchQuery]);

  // Customer Transaction History for active ledger drawer
  const customerHistory = useMemo(() => {
    if (!activeLedgerCustomer) return [];

    const custOrders = orders
      .filter((o) => o.customerId === activeLedgerCustomer.id)
      .map((o) => ({
        id: o.id,
        date: o.date,
        type: 'debit' as const,
        ref: o.orderNo,
        description: `Spot Order: ${o.totalCartons}c + ${o.totalPieces}p`,
        amount: o.netBill,
      }));

    const custRecoveries = roznamcha
      .filter((r) => r.customerId === activeLedgerCustomer.id && r.type === 'cash_in')
      .map((r) => ({
        id: r.id,
        date: r.date,
        type: 'credit' as const,
        ref: r.slipNo || r.entryNo,
        description: `Cash Recovery (${r.narration})`,
        amount: r.amount,
      }));

    return [...custOrders, ...custRecoveries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [activeLedgerCustomer, orders, roznamcha]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newProprietor.trim()) return;

    await onAddCustomer({
      name: newProprietor.trim(),
      shopName: newShopName.trim(),
      route: newRoute,
      phone: newPhone.trim() || '0300-0000000',
      address: newAddress.trim() || 'Main Bazaar',
      creditLimit: Number(newCreditLimit) || 500000,
      status: 'active',
      atlStatus: newAtlStatus,
      cnic: newCnic.trim(),
    });

    setIsOnboardOpen(false);
    // Reset form
    setNewShopName('');
    setNewProprietor('');
    setNewPhone('');
    setNewAddress('');
    setNewCnic('');
  };

  const handleShareWhatsApp = (customer: Customer) => {
    const text = encodeURIComponent(
      `Assalam-o-Alaikum ${customer.name} Sahab,\nYour current ledger balance with OmniSales Distribution is ${formatPKR(
        customer.currentBalance
      )} against authorized credit limit of ${formatPKR(
        customer.creditLimit
      )}.\nPlease arrange recovery payment. JazakAllah.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col space-y-4 pb-20">
      {/* Top Action & Search Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Shop, Owner, CNIC, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
          />
        </div>
        <button
          onClick={() => setIsOnboardOpen(true)}
          className="min-h-[40px] px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Onboard Shop</span>
          <span className="sm:hidden">+ Shop</span>
        </button>
      </div>

      {/* Route Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {routes.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRoute(r)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold cursor-pointer transition-colors ${
              selectedRoute === r
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Customer List Cards */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="text-slate-900 font-bold text-sm">No Retailers Registered</div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Onboard your first real retail shop to start booking orders and recording cash recoveries.
            </p>
            <button
              onClick={() => setIsOnboardOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm mx-auto cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Customer / Retailer</span>
            </button>
          </div>
        )}

        {filteredCustomers.map((cust) => {
          const utilPct =
            cust.creditLimit > 0
              ? Math.min(100, Math.round((cust.currentBalance / cust.creditLimit) * 100))
              : 0;
          const isOverdue = cust.status === 'credit_locked' || utilPct >= 95;

          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {cust.route}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        cust.atlStatus === 'filer'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cust.atlStatus === 'filer' ? 'ATL Active' : 'Non-Filer'}
                    </span>
                    {cust.status === 'credit_locked' && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 mt-1 truncate">
                    {cust.shopName}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Proprietor: <strong className="text-slate-700">{cust.name}</strong>
                  </div>
                </div>

                {/* Quick Call / WhatsApp */}
                <div className="flex items-center gap-1 shrink-0">
                  {cust.phone && (
                    <a
                      href={`tel:${cust.phone}`}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                      title="Call Shopkeeper"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleShareWhatsApp(cust)}
                    className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Send WhatsApp Balance Statement"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Financial Exposure Meter */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Credit Utilization ({utilPct}%)</span>
                  <span className="font-mono text-slate-700">
                    Limit: {formatPKR(cust.creditLimit)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      utilPct >= 90
                        ? 'bg-rose-500'
                        : utilPct >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${utilPct}%` }}
                  />
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-xs text-slate-500">Outstanding Balance:</span>
                  <span
                    className={`font-mono font-black text-base ${
                      isOverdue ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {formatPKR(cust.currentBalance)}
                  </span>
                </div>
              </div>

              {/* Action Buttons (48px targets) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onSelectCustomerForOrder(cust)}
                  className="min-h-[44px] bg-amber-600 hover:bg-amber-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Book Spot Order</span>
                </button>
                <button
                  onClick={() => setActiveLedgerCustomer(cust)}
                  className="min-h-[44px] bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Receipt className="w-4 h-4 text-slate-600" />
                  <span>View Statement</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Statement / Transaction History Drawer Modal */}
      {activeLedgerCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Client Ledger Statement
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {activeLedgerCustomer.shopName}
                </h3>
                <span className="text-xs text-slate-500">
                  {activeLedgerCustomer.name} • {activeLedgerCustomer.phone}
                </span>
              </div>
              <button
                onClick={() => setActiveLedgerCustomer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Summary Box */}
            <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Net Outstanding Due:</span>
                <span className="font-mono text-xl font-bold text-amber-400">
                  {formatPKR(activeLedgerCustomer.currentBalance)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Credit Line:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatPKR(activeLedgerCustomer.creditLimit)}
                </span>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Transaction History
              </span>
              {customerHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No transaction history recorded yet for this client.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {customerHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-[10px] font-bold px-1 rounded ${
                              item.type === 'debit'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {item.ref}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {item.description}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          {formatDateTime(item.date)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold ${
                            item.type === 'debit' ? 'text-slate-900' : 'text-emerald-600'
                          }`}
                        >
                          {item.type === 'debit' ? '+' : '-'}
                          {formatPKR(item.amount)}
                        </span>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                          {item.type === 'debit' ? 'Invoice Bill' : 'Cash Cleared'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => handleShareWhatsApp(activeLedgerCustomer)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Send WhatsApp Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Shop Onboard Modal */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Field Registration
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  Fast Onboard New Shop
                </h3>
              </div>
              <button
                onClick={() => setIsOnboardOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Shop / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Swat Super Store"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Proprietor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProprietor}
                    onChange={(e) => setNewProprietor(e.target.value)}
                    placeholder="e.g. Bilal Khan"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    WhatsApp Phone
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Salesman Beat / Route *
                </label>
                <input
                  type="text"
                  required
                  list="mobile-route-suggestions"
                  value={newRoute}
                  onChange={(e) => setNewRoute(e.target.value)}
                  placeholder="e.g. Main Bazaar Route"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                />
                <datalist id="mobile-route-suggestions">
                  {routes
                    .filter((r) => r !== 'All')
                    .map((r) => (
                      <option key={r} value={r} />
                    ))}
                  <option value="Main Bazaar Route" />
                  <option value="Bypass & GT Road Beat" />
                  <option value="City Wholesale Route" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    CNIC (13 Digits)
                  </label>
                  <input
                    type="text"
                    value={newCnic}
                    onChange={(e) => setNewCnic(e.target.value)}
                    placeholder="15602-XXXXXXX-X"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Initial Credit Limit (PKR)
                  </label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(parseFloat(e.target.value) || 0)}
                    placeholder="500000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  FBR ATL Tax Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAtlStatus('filer')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                      newAtlStatus === 'filer'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Active Filer (0.5% WHT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAtlStatus('non_filer')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                      newAtlStatus === 'non_filer'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Non-Filer (1% WHT)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Shop Address / Landmark
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Main Chowk, Mingora"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md text-sm mt-2 cursor-pointer transition-colors"
              >
                Register Shop to IndexedDB
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

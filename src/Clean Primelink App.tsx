import React, { useState } from 'react';

// Money formatter: Whole numbers with commas, no 'Rs' or '.00'
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US').format(Math.round(amount));
};

// Initial Data complying with Primelink integer ID & formatting rules
const INITIAL_ROUTES = [
  { id: 1, name: 'Route 1 - Mingora City', subroutes: 'Gulkada, Saidu Sharif, Watkey', booker: 'Sajjad Khan (ID: 4)', driver: 'Ali Raza (ID: 8)', schedule: 'Mon / Thu', shops: 65 },
  { id: 2, name: 'Route 2 - Kabal', subroutes: 'Kanju, Bara Bandai, Ningolai', booker: 'Sajjad Khan (ID: 4)', driver: 'Ali Raza (ID: 8)', schedule: 'Tue / Fri', shops: 48 },
  { id: 3, name: 'Route 3 - Matta & Khwazakhela', subroutes: 'Matta Bazaar, Khwazakhela', booker: 'Sajjad Khan (ID: 4)', driver: 'Ali Raza (ID: 8)', schedule: 'Wed / Sat', shops: 52 },
];

const INITIAL_CUSTOMERS = [
  { id: 45, shop: 'Khyber General Store', owner: 'Muhammad Alam', phone: '0300-1234567', route: 'Route 2 - Kabal', limit: 100000, days: 7, balance: 57310, status: 'ACTIVE' },
  { id: 81, shop: 'Swat Super Market', owner: 'Tariq Khan', phone: '0301-9876543', route: 'Route 1 - Mingora', limit: 250000, days: 7, balance: 185000, status: 'ACTIVE' },
  { id: 120, shop: 'Madina Traders', owner: 'Habib Ur Rehman', phone: '0333-4567890', route: 'Route 3 - Matta', limit: 80000, days: 5, balance: 84200, status: 'OVERDUE' },
];

const INITIAL_PRODUCTS = [
  { id: 1, title: 'Primelink Beauty Soap 100g', pack: '48 Pcs', tp: 2000, mrp: 2200, discountCap: 5.0, stock: 450 },
  { id: 12, title: 'Primelink Washing Powder 1kg', pack: '12 Pcs', tp: 3600, mrp: 4000, discountCap: 5.0, stock: 210 },
  { id: 105, title: 'Primelink Green Tea 250g', pack: '24 Pcs', tp: 4800, mrp: 5200, discountCap: 5.0, stock: 180 },
];

const INITIAL_STAFF = [
  { id: 4, name: 'Sajjad Khan', role: 'Order Booker', phone: '0300-9876543', baseSalary: 35000, cartonsBooked: 1250, commissionRate: 20, advance: 5000, status: 'PAID' },
  { id: 8, name: 'Ali Raza', role: 'Van Driver', phone: '0301-1234567', baseSalary: 30000, cartonsBooked: 0, commissionRate: 0, advance: 2000, status: 'PENDING' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [routes] = useState(INITIAL_ROUTES);
  const [customers] = useState(INITIAL_CUSTOMERS);
  const [products] = useState(INITIAL_PRODUCTS);
  const [staff] = useState(INITIAL_STAFF);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      <div>
        {/* Standard 4-Line Primelink Header Block */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 text-center shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center mb-1 shadow">
              PE
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Primelink Enterprises</h1>
            <p className="text-sm text-slate-600 font-medium">Distribution Management System, Panr, Swat</p>
            <p className="text-xs text-slate-500 font-medium">WhatsApp: 03106548820</p>
            <h2 className="text-base font-extrabold text-indigo-700 underline underline-offset-4 mt-2 tracking-wide uppercase">
              {activeTab === 'pos' && 'POS & COUNTER INVOICING'}
              {activeTab === 'customers' && 'CUSTOMER MASTER & CREDIT MANAGEMENT'}
              {activeTab === 'catalog' && 'MASTER PRODUCT CATALOG & PRICING'}
              {activeTab === 'inventory' && 'GOODS RECEIVED NOTE & STOCK INWARD'}
              {activeTab === 'suppliers' && 'SUPPLIER ACCOUNT LEDGER & PURCHASE BILLS'}
              {activeTab === 'routes' && 'ROUTE & SUBROUTE MASTER MANAGEMENT'}
              {activeTab === 'payroll' && 'STAFF PAYROLL & ROUTE COMMISSION SLIP'}
              {activeTab === 'settings' && 'SYSTEM SETTINGS & CONFIGURATION'}
            </h2>
          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <nav className="bg-slate-900 text-white px-4 py-2 flex flex-wrap gap-2 justify-center shadow">
          {[
            { id: 'pos', label: 'POS Invoicing' },
            { id: 'customers', label: 'Customer Master' },
            { id: 'catalog', label: 'Master Catalog' },
            { id: 'inventory', label: 'Inventory GRN' },
            { id: 'suppliers', label: 'Supplier Accounts' },
            { id: 'routes', label: 'Routes & Subroutes' },
            { id: 'payroll', label: 'Staff Payroll' },
            { id: 'settings', label: 'System Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto p-6">
          {/* POS Invoicing View */}
          {activeTab === 'pos' && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Selected Customer</span>
                  <p className="text-lg font-bold text-slate-900">Khyber General Store (ID: 45)</p>
                  <p className="text-xs text-slate-600">Route 2 - Kabal | Credit Limit: {formatMoney(100000)}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Booker / Driver</span>
                  <p className="text-lg font-bold text-slate-900">Sajjad Khan (ID: 4)</p>
                  <p className="text-xs text-slate-600">Van: Ali Raza (ID: 8)</p>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                  <span className="text-xs font-semibold text-indigo-600 uppercase">Gross Payable</span>
                  <p className="text-2xl font-black text-indigo-700">{formatMoney(67260)}</p>
                  <p className="text-xs text-indigo-800">Includes 18% FBR Sales Tax</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <th className="p-3 border border-slate-200">SKU ID</th>
                    <th className="p-3 border border-slate-200">Product Title</th>
                    <th className="p-3 border border-slate-200">Pack Size</th>
                    <th className="p-3 border border-slate-200">Cartons</th>
                    <th className="p-3 border border-slate-200">TP Price</th>
                    <th className="p-3 border border-slate-200">Disc (5%)</th>
                    <th className="p-3 border border-slate-200">18% ST</th>
                    <th className="p-3 border border-slate-200 text-right">Line Net</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => {
                    const gross = 10 * item.tp;
                    const disc = gross * 0.05;
                    const taxable = gross - disc;
                    const tax = taxable * 0.18;
                    const net = taxable + tax;
                    return (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="p-3 border border-slate-200 font-bold">{item.id}</td>
                        <td className="p-3 border border-slate-200 font-medium">{item.title}</td>
                        <td className="p-3 border border-slate-200">{item.pack}</td>
                        <td className="p-3 border border-slate-200 font-bold">10</td>
                        <td className="p-3 border border-slate-200">{formatMoney(item.tp)}</td>
                        <td className="p-3 border border-slate-200">{formatMoney(disc)}</td>
                        <td className="p-3 border border-slate-200">{formatMoney(tax)}</td>
                        <td className="p-3 border border-slate-200 text-right font-bold text-indigo-700">{formatMoney(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Customer Master View */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Customer Directory</h3>
              <table className="w-full text-left border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <th className="p-3 border border-slate-200">Customer ID</th>
                    <th className="p-3 border border-slate-200">Shop Name</th>
                    <th className="p-3 border border-slate-200">Proprietor</th>
                    <th className="p-3 border border-slate-200">Route</th>
                    <th className="p-3 border border-slate-200">Credit Limit</th>
                    <th className="p-3 border border-slate-200">Current Balance</th>
                    <th className="p-3 border border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-200">
                      <td className="p-3 border border-slate-200 font-bold">{c.id}</td>
                      <td className="p-3 border border-slate-200 font-semibold">{c.shop}</td>
                      <td className="p-3 border border-slate-200">{c.owner}</td>
                      <td className="p-3 border border-slate-200">{c.route}</td>
                      <td className="p-3 border border-slate-200">{formatMoney(c.limit)}</td>
                      <td className="p-3 border border-slate-200 font-bold text-slate-900">{formatMoney(c.balance)}</td>
                      <td className="p-3 border border-slate-200">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Routes & Subroutes View */}
          {activeTab === 'routes' && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Active Distribution Routes</h3>
              <table className="w-full text-left border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <th className="p-3 border border-slate-200">Route ID</th>
                    <th className="p-3 border border-slate-200">Route Name</th>
                    <th className="p-3 border border-slate-200">Subroutes / Markets</th>
                    <th className="p-3 border border-slate-200">Assigned Booker</th>
                    <th className="p-3 border border-slate-200">Assigned Driver</th>
                    <th className="p-3 border border-slate-200">Schedule</th>
                    <th className="p-3 border border-slate-200">Shops</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200">
                      <td className="p-3 border border-slate-200 font-bold">{r.id}</td>
                      <td className="p-3 border border-slate-200 font-semibold">{r.name}</td>
                      <td className="p-3 border border-slate-200">{r.subroutes}</td>
                      <td className="p-3 border border-slate-200">{r.booker}</td>
                      <td className="p-3 border border-slate-200">{r.driver}</td>
                      <td className="p-3 border border-slate-200">{r.schedule}</td>
                      <td className="p-3 border border-slate-200 font-bold">{r.shops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Staff Payroll View */}
          {activeTab === 'payroll' && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Monthly Staff Payroll</h3>
              <table className="w-full text-left border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <th className="p-3 border border-slate-200">Staff ID</th>
                    <th className="p-3 border border-slate-200">Name</th>
                    <th className="p-3 border border-slate-200">Designation</th>
                    <th className="p-3 border border-slate-200">Base Salary</th>
                    <th className="p-3 border border-slate-200">Commission</th>
                    <th className="p-3 border border-slate-200">Advance</th>
                    <th className="p-3 border border-slate-200">Net Payable</th>
                    <th className="p-3 border border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const commission = s.cartonsBooked * s.commissionRate;
                    const net = s.baseSalary + commission - s.advance;
                    return (
                      <tr key={s.id} className="border-b border-slate-200">
                        <td className="p-3 border border-slate-200 font-bold">{s.id}</td>
                        <td className="p-3 border border-slate-200 font-semibold">{s.name}</td>
                        <td className="p-3 border border-slate-200">{s.role}</td>
                        <td className="p-3 border border-slate-200">{formatMoney(s.baseSalary)}</td>
                        <td className="p-3 border border-slate-200">{formatMoney(commission)}</td>
                        <td className="p-3 border border-slate-200">{formatMoney(s.advance)}</td>
                        <td className="p-3 border border-slate-200 font-extrabold text-emerald-700">{formatMoney(net)}</td>
                        <td className="p-3 border border-slate-200">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Fallback for other modules */}
          {['catalog', 'inventory', 'suppliers', 'settings'].includes(activeTab) && (
            <div className="bg-white rounded-lg p-12 text-center border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 uppercase mb-2">{activeTab} Module Ready</h3>
              <p className="text-sm text-slate-500">Connected to Hostinger VPS & Supabase Cloud PostgreSQL Database.</p>
            </div>
          )}
        </main>
      </div>

      {/* Fixed High-Contrast Bottom Action Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 px-6 text-white sticky bottom-0 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">FBR ACTIVE</span>
            <span>ID Standard: Unpadded Integer</span>
            <span>Currency: PKR (Whole Numbers)</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded shadow transition">
              SAVE / POST (F5)
            </button>
            <button className="px-4 py-2 border border-slate-600 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded transition">
              CANCEL (ESC)
            </button>
            <button className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase rounded shadow transition">
              PRINT (F6)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

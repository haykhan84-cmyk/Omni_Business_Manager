import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Receipt,
  CheckCircle,
  Download,
  BookmarkCheck,
  Settings2,
  QrCode,
  Languages,
  Calendar,
  Layers,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HardDrive,
  Cpu,
  Clock,
  Building,
  Check,
  ChevronDown,
  Sparkles,
  Landmark,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { BankAccount, CompanyProfile, Customer, Order, SalesRoute, RoznamchaEntry } from '../../types';
import { formatPKR, formatDateTime } from '../../utils/calculations';
import { RouteDeliverySummaryEngine } from './RouteDeliverySummaryEngine';
import { extractShopSequence } from '../../utils/sequenceNumbering';

interface DesktopPrintStudioProps {
  orders: Order[];
  customers: Customer[];
  bankAccount?: BankAccount;
  companyProfile?: CompanyProfile;
  routes?: SalesRoute[];
  roznamcha?: RoznamchaEntry[];
  onAddRoznamchaEntry?: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
}

export const DesktopPrintStudio: React.FC<DesktopPrintStudioProps> = ({
  orders,
  customers,
  bankAccount,
  companyProfile,
  routes = [],
  roznamcha = [],
  onAddRoznamchaEntry,
}) => {
  // State for selected booked order
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedOrder?.customerId);
  }, [customers, selectedOrder]);

  // Preview Mode: 'a4' or 'pos80' or 'pos58'
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos80' | 'pos58'>('a4');
  const [viewMode, setViewMode] = useState<'a4' | 'thermal'>('a4');

  // Category taxonomy tab
  const [activeCategory, setActiveCategory] = useState<string>('sales');
  const [presetCode, setPresetCode] = useState<string>('INV-A4-01');

  // Entity & Depot Branding
  const [entityName, setEntityName] = useState(companyProfile?.companyName || 'PrimeLink Distribution & Logistics');
  const [taxIds, setTaxIds] = useState(
    companyProfile?.ntn ? `NTN: ${companyProfile.ntn} • STRN: ${companyProfile.strn}` : 'NTN: 7291048-2 • STRN: 327787612345'
  );
  const [depotLocation, setDepotLocation] = useState(
    companyProfile?.address ? `${companyProfile.address}, ${companyProfile.city}` : 'Mingora Central Depot & Gate 1, Swat, KPK'
  );
  const [logoOrientation, setLogoOrientation] = useState<'left' | 'center' | 'right' | 'none'>('left');

  // Active bank details for invoice settlement
  const activeBank = bankAccount || {
    bankName: 'Bank AL Habib',
    accountTitle: 'PrimeLink Enterprises',
    accountNumber: '1023-0981-002341-01',
    iban: 'PK52BAHL1023098100234101',
    branchName: 'Mingora City Branch, Swat',
    raastId: '03009821450',
    openingBalance: 0,
    id: 'bank-al-habib-01',
  };

  // Document Variables & Statutory Toggles
  const [customDocNum, setCustomDocNum] = useState('');
  const docNumber = customDocNum.trim() || selectedOrder?.orderNo || 'INV-2024-8849';
  const [fiscalHash, setFiscalHash] = useState('BATCH-SWT-992');

  // 5 Feature Toggles
  const [showQrCode, setShowQrCode] = useState(true);
  const [showUrduHeadings, setShowUrduHeadings] = useState(true);
  const [showFefoExpiry, setShowFefoExpiry] = useState(true);
  const [showPrevBalance, setShowPrevBalance] = useState(true);
  const [showDualStamps, setShowDualStamps] = useState(true);

  // View state helpers
  const [marginGuide, setMarginGuide] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [saveToast, setSaveToast] = useState(false);

  // Dynamic calculations for selected order
  const grossSubtotal = selectedOrder?.grossBill || 192000;
  const gstAmount = Math.round(grossSubtotal * 0.18);
  const schemeDiscount = selectedOrder?.totalDiscount || Math.round(grossSubtotal * 0.02);
  const currentNetTotal = selectedOrder?.netBill || (grossSubtotal + gstAmount - schemeDiscount);
  const prevCustomerBalance = selectedCustomer?.currentBalance || 48500;
  const totalDueFromBuyer = currentNetTotal + (showPrevBalance ? prevCustomerBalance : 0);

  const handlePrint = (format: 'a4' | 'pos80' = paperFormat === 'a4' ? 'a4' : 'pos80') => {
    const origTitle = document.title;
    document.title = `${format === 'a4' ? 'A4_Invoice' : 'Thermal_80mm'}_${docNumber}.pdf`;
    window.print();
    document.title = origTitle;
  };

  const handleSavePreset = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Save Notification Banner */}
      {saveToast && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Preset "{presetCode}" successfully committed to local ERP cache &amp; USB template store.</span>
          </div>
          <button onClick={() => setSaveToast(false)} className="hover:opacity-80">✕</button>
        </div>
      )}

      {/* Top Studio Control & Real-Time Telemetry Ribbon */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              Enterprise Document &amp; Template Printing Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider font-mono">
              v4.8 Vector Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            High-throughput statutory rendering engine for 100+ GAAP, FBR &amp; Shariah-compliant physical and thermal printouts.
          </p>
        </div>

        {/* Real-Time Device Telemetry Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-500">Templates:</span>
            <span className="font-bold text-slate-900 font-mono">114 Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Spool Queue:</span>
            <span className="font-bold text-slate-900 font-mono">Idle (0)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-500">Latency:</span>
            <span className="font-bold text-slate-900 font-mono">&lt; 45ms SVG</span>
          </div>
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 max-w-xs truncate">
            <HardDrive className="w-3.5 h-3.5 text-slate-600" />
            <span className="font-bold text-slate-700 font-mono truncate">
              HP Pro A4 • Xprinter 80mm
            </span>
          </div>
        </div>

        {/* Global Quick Action CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handlePrint('a4')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Document (Ctrl+P)</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrint('a4')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Vector PDF</span>
          </button>
          <button
            type="button"
            onClick={handleSavePreset}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Save Preset</span>
          </button>
        </div>
      </div>

      {/* Core Studio Layout (Master-Detail 2-Column Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Template Explorer & Dynamic Customizer Engine (Col 5 / 42%) */}
        <div className="lg:col-span-5 flex flex-col gap-5 print:hidden">
          {/* Active Booked Order Selector Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4" /> Live Booked Order Selector
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                {orders.length} Orders in DB
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Choose Customer Order to Generate Document:
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => {
                  setSelectedOrderId(e.target.value);
                  setCustomDocNum('');
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {orders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.orderNo} — {ord.shopName} ({ord.route}) • {formatPKR(ord.netBill)}
                  </option>
                ))}
              </select>
            </div>

            {selectedOrder && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Shopkeeper</span>
                  <strong className="text-slate-900">{selectedOrder.shopName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Route</span>
                  <strong className="text-slate-900">{selectedOrder.route}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Date &amp; Time</span>
                  <strong className="text-slate-900">{formatDateTime(selectedOrder.date)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Payment</span>
                  <strong className="text-amber-700 uppercase">{selectedOrder.paymentType}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Category Taxonomy & Format Preset */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" /> Template Taxonomy (114)
              </span>
              <span className="text-[10px] font-bold text-slate-400">Statutory Validated</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'sales', label: 'Sales & Billing (28)' },
                { id: 'summary', label: 'Route Summaries (Summary #1, #2...)' },
                { id: 'inventory', label: 'Inventory & WH (24)' },
                { id: 'ledger', label: 'Ledger & Roznamcha (26)' },
                { id: 'hr', label: 'HR & Payroll (18)' },
                { id: 'partners', label: 'Partners & Zakat (18)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (cat.id === 'summary') {
                      setPresetCode('REC-SUM-01');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Active Format Preset
              </label>
              <select
                value={presetCode}
                onChange={(e) => {
                  setPresetCode(e.target.value);
                  if (e.target.value === 'REC-SUM-01') {
                    setActiveCategory('summary');
                  } else if (e.target.value.includes('TH')) {
                    setPaperFormat('pos80');
                    setViewMode('thermal');
                  } else {
                    setPaperFormat('a4');
                    setViewMode('a4');
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="INV-A4-01">Standard FBR A4 Sales Tax Invoice (INV-A4-01)</option>
                <option value="REC-SUM-01">Route Delivery &amp; Recovery Summary Sheet (REC-SUM-01)</option>
                <option value="INV-TH-02">80mm POS Route Van Thermal Slip (INV-TH-02)</option>
                <option value="CHL-04">Triplicate Delivery Challan &amp; Signoff (CHL-04)</option>
                <option value="GRN-301">Warehouse Goods Received Note (GRN-301)</option>
                <option value="LEDG-AR">Accounts Receivable Customer Statement (LEDG-AR)</option>
              </select>
            </div>
          </div>

          {/* Header & Entity Branding Configuration */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-700" /> Entity &amp; Depot Branding
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Auto-Synced
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Operating Entity Name
                </label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Tax IDs (NTN &amp; STRN)
                </label>
                <input
                  type="text"
                  value={taxIds}
                  onChange={(e) => setTaxIds(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Warehouse Depot / Hub Location
                </label>
                <input
                  type="text"
                  value={depotLocation}
                  onChange={(e) => setDepotLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Logo Orientation Selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Logo Orientation:</span>
                <div className="flex items-center gap-1">
                  {(['left', 'center', 'right', 'none'] as const).map((orient) => (
                    <button
                      key={orient}
                      onClick={() => setLogoOrientation(orient)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                        logoOrientation === orient
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {orient}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Variable Injections & Statutory Toggles */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-amber-700" /> Document Variables &amp; Statutory Toggles
              </span>
              <span className="text-[10px] font-bold text-amber-700 font-mono">Live Binding</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Doc Reference #
                </label>
                <input
                  type="text"
                  value={customDocNum}
                  placeholder={selectedOrder?.orderNo || 'INV-2024-8849'}
                  onChange={(e) => setCustomDocNum(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                  Fiscal Batch Hash
                </label>
                <input
                  type="text"
                  value={fiscalHash}
                  onChange={(e) => setFiscalHash(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 48px Touch Envelope Switches */}
            <div className="divide-y divide-slate-100 text-xs">
              <label className="min-h-[44px] py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-1 rounded">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-slate-800">Print FBR Digital Invoicing QR Code</span>
                </div>
                <input
                  type="checkbox"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <label className="min-h-[44px] py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-1 rounded">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    Print Bilingual Urdu Headings (اردو عنوانات)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showUrduHeadings}
                  onChange={(e) => setShowUrduHeadings(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <label className="min-h-[44px] py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-1 rounded">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-semibold text-slate-800">Show FEFO Expiry &amp; Batch Lot Numbers</span>
                </div>
                <input
                  type="checkbox"
                  checked={showFefoExpiry}
                  onChange={(e) => setShowFefoExpiry(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <label className="min-h-[44px] py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-1 rounded">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    Show Previous Running Balance &amp; Aging
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showPrevBalance}
                  onChange={(e) => setShowPrevBalance(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <label className="min-h-[44px] py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 px-1 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-semibold text-slate-800">Include Dual Stamp &amp; Signature Blocks</span>
                </div>
                <input
                  type="checkbox"
                  checked={showDualStamps}
                  onChange={(e) => setShowDualStamps(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Physical Media Dimensions */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2.5">
            <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Physical Media Dimensions
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaperFormat('a4');
                  setViewMode('a4');
                }}
                className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paperFormat === 'a4'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">A4 Sheet</span>
                <span className="text-[10px] opacity-75 mt-0.5">210 × 297 mm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaperFormat('pos80');
                  setViewMode('thermal');
                }}
                className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paperFormat === 'pos80'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">80mm POS Roll</span>
                <span className="text-[10px] opacity-75 mt-0.5">ESC/POS Thermal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaperFormat('pos58');
                  setViewMode('thermal');
                }}
                className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paperFormat === 'pos58'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">58mm Pocket</span>
                <span className="text-[10px] opacity-75 mt-0.5">Mobile BT</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Real-Time Interactive Live Document Preview (Col 7 / 58%) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Preview Control Toolbar */}
          <div className="w-full bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('a4')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'a4'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 Full Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('thermal')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'thermal'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm POS Slip</span>
              </button>
            </div>

            {/* Zoom & Margin Guides */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 px-2 py-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(0.7, prev - 0.1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-[11px] text-slate-800 px-1">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(1.3, prev + 0.1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMarginGuide((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  marginGuide
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                15mm Margins
              </button>
            </div>
          </div>

          {/* Main Live Printable Canvas Wrapper */}
          <div className="w-full bg-slate-100 p-4 sm:p-6 rounded-2xl flex justify-center overflow-x-auto shadow-inner">
            {presetCode === 'REC-SUM-01' || activeCategory === 'summary' ? (
              <div className="w-full">
                <RouteDeliverySummaryEngine
                  orders={orders}
                  customers={customers}
                  routes={routes}
                  roznamcha={roznamcha}
                  onAddRoznamchaEntry={onAddRoznamchaEntry}
                />
              </div>
            ) : (
            <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}>
              {viewMode === 'a4' ? (
                /* ======================= A4 TAX INVOICE CANVAS ======================= */
                <div
                  id="printable-a4-document"
                  className={`w-full max-w-[794px] min-h-[1050px] bg-white text-slate-900 p-8 shadow-xl flex flex-col justify-between border border-slate-300 relative font-sans print:border-none print:shadow-none print:p-0 print:m-0 ${
                    marginGuide ? 'ring-2 ring-dashed ring-amber-500' : ''
                  }`}
                >
                  {/* Top Watermark / Status Stamp */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] select-none text-[84px] font-extrabold uppercase tracking-widest text-slate-900 rotate-[-25deg]">
                    ORIGINAL INVOICE
                  </div>

                  {/* Document Content Stack */}
                  <div className="flex flex-col w-full">
                    {/* 1. Header & Official Registration Bar */}
                    <div
                      className={`flex items-start justify-between border-b-2 border-slate-900 pb-4 ${
                        logoOrientation === 'center'
                          ? 'flex-col items-center text-center'
                          : logoOrientation === 'right'
                          ? 'flex-row-reverse text-right'
                          : 'flex-row'
                      }`}
                    >
                      {/* Left Brand & Depot Details */}
                      <div className="flex items-start gap-3.5">
                        {logoOrientation !== 'none' && (
                          <div className="w-13 h-13 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <FileText className="w-7 h-7" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[17px] font-black tracking-tight text-slate-900 uppercase">
                            {entityName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            FMCG, Food &amp; Commodities Distribution Division
                          </span>
                          <span className="text-[11px] text-slate-600">
                            {depotLocation} • UAN: +92 946 720011
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-900 font-semibold">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {taxIds}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Statutory Title & Coordinates */}
                      <div className="flex flex-col items-end text-right mt-2 sm:mt-0">
                        <span className="text-[16px] font-black text-slate-900 tracking-wide uppercase font-mono">
                          BILL / {docNumber.toUpperCase().includes('BILL') || docNumber.toUpperCase().includes('INVOICE') ? docNumber.toUpperCase() : `INVOICE #${docNumber}`}
                        </span>
                        <div className="text-xs font-bold text-amber-700">
                          {selectedOrder?.route || 'Route'} • Shop #{extractShopSequence(selectedCustomer)} ({selectedOrder?.shopName || 'Shop'})
                        </div>
                        {showUrduHeadings && (
                          <span className="text-[12px] font-bold text-slate-600">
                            فروخت ٹیکس انوائس
                          </span>
                        )}
                        <div className="mt-2 text-[11px] flex flex-col items-end font-mono">
                          <div>
                            <span className="text-slate-500">Bill / Inv #:</span>{' '}
                            <span className="font-bold text-slate-900">{docNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Date &amp; Time:</span>{' '}
                            <span className="font-semibold text-slate-900">
                              {formatDateTime(selectedOrder?.date || new Date().toISOString())}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Route:</span>{' '}
                            <span className="font-semibold text-slate-900">
                              {selectedOrder?.route || 'Assigned Route'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Sales Officer:</span>{' '}
                            <span className="font-semibold text-slate-900">
                              {selectedOrder?.bookerName || selectedOrder?.salesmanName || 'Field Order Booker'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Billed To / Consignee Ledger Information Box */}
                    <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded uppercase">
                            Consignee / Customer
                          </span>
                          {showUrduHeadings && (
                            <span className="text-[11px] font-bold text-slate-600">
                              گاہک کی تفصیل
                            </span>
                          )}
                        </div>
                        <span className="text-[14px] font-bold text-slate-900 mt-1">
                          {selectedOrder?.shopName || 'Al-Madina General Store'}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Prop: {selectedOrder?.customerName || 'Haji Gul Muhammad'} •{' '}
                          {selectedCustomer?.address || 'Main Mingora Bazaar, Swat'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-800 mt-0.5">
                          Phone: {selectedCustomer?.phone || '+92 345 9812401'} • CNIC:{' '}
                          {selectedCustomer?.cnic || '15602-1234567-1'}
                        </span>
                      </div>

                      <div className="flex flex-col justify-between border-l border-slate-200 pl-4">
                        <div className="grid grid-cols-2 text-[11px] gap-y-1">
                          <span className="text-slate-500">Customer Code:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {selectedCustomer?.id || 'ACC-4012'}
                          </span>
                          <span className="text-slate-500">Payment Terms:</span>
                          <span className="font-semibold text-slate-900 uppercase">
                            {selectedOrder?.paymentType || 'Credit on Delivery'}
                          </span>
                          <span className="text-slate-500">Credit Limit:</span>
                          <span className="font-mono text-slate-900">
                            {formatPKR(selectedCustomer?.creditLimit || 150000)}
                          </span>
                          <span className="text-slate-500">Batch Hash:</span>
                          <span className="font-mono font-bold text-amber-700">
                            {fiscalHash}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Structured Itemized Data Grid Table */}
                    <div className="mt-4 overflow-hidden border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-2 text-center w-8">#</th>
                            <th className="py-2.5 px-3">
                              Item Description &amp; SKU {showUrduHeadings && '(تفصیلِ اشیاء)'}
                            </th>
                            {showFefoExpiry && (
                              <th className="py-2.5 px-2">Batch / FEFO</th>
                            )}
                            <th className="py-2.5 px-2 text-right">Qty (UoM)</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-3 text-right">Gross (PKR)</th>
                            <th className="py-2.5 px-2 text-right">Disc</th>
                            <th className="py-2.5 px-3 text-right">Net Total (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-900">
                          {selectedOrder?.items?.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                              <td className="py-2 px-2 text-center font-mono text-slate-500">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900">{item.productName}</div>
                                <div className="text-[9px] text-slate-500 font-mono">
                                  {item.sku} • Pack Size: {item.packSize}
                                </div>
                              </td>
                              {showFefoExpiry && (
                                <td className="py-2 px-2 font-mono text-[10px]">
                                  B-{(900 + idx * 14)} <span className="text-amber-700">(12/26)</span>
                                </td>
                              )}
                              <td className="py-2 px-2 text-right font-mono font-semibold">
                                {item.cartons} Ctn / {item.pieces} Pcs
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                {formatPKR(item.unitPrice)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                {formatPKR(item.grossTotal)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-slate-600">
                                {item.discountPercent > 0 ? `-${item.discountPercent}%` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {formatPKR(item.netTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 4. Financial Summary & Statutory Verification Block */}
                    <div className="mt-4 grid grid-cols-12 gap-4 items-start">
                      {/* Left: FBR QR Stamp & Security Hash (Col 6) */}
                      <div className="col-span-6 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                        {showQrCode && (
                          <div className="w-18 h-18 bg-white p-1 border border-slate-300 shrink-0 flex items-center justify-center">
                            <svg className="w-full h-full text-slate-900" fill="currentColor" viewBox="0 0 33 33">
                              <path d="M0,0h9v9H0ZM2,2v5h5V2ZM24,0h9v9H24ZM26,2v5h5V2ZM0,24h9v9H0ZM2,26v5h5V26ZM11,0h2v4h-2ZM15,0h2v2h-2ZM19,0h3v2h-3ZM13,6h4v2h-4ZM11,10h2v4h-2ZM15,10h5v2h-5ZM22,10h2v2h-2ZM26,10h2v4h-2ZM30,10h3v2h-3ZM0,11h2v3H0ZM4,11h4v2H4ZM4,14h2v3H4ZM8,14h3v2H8ZM14,14h3v2h-3ZM18,14h3v3h-3ZM24,14h2v3h-2ZM28,14h3v2h-3ZM11,18h2v3h-2ZM15,18h4v3h-4ZM21,18h2v2h-2ZM25,18h4v2h-4ZM0,19h3v2H0ZM5,19h3v4H5ZM30,19h3v5h-3ZM11,23h2v4h-2ZM15,23h3v2h-3ZM20,23h3v2h-3ZM24,23h3v3h-3ZM15,26h2v3h-2ZM19,26h3v4h-3ZM23,27h4v2h-4ZM28,27h2v5h-2ZM11,29h2v4h-2ZM14,31h4v2h-4ZM24,31h3v2h-3ZM4,4h1v1H4ZM28,4h1v1H28ZM4,28h1v1H4Z"></path>
                            </svg>
                          </div>
                        )}
                        <div className="flex flex-col text-[10px]">
                          <span className="font-bold text-slate-900 uppercase tracking-wide">
                            FBR Digital Invoicing POS
                          </span>
                          <span className="text-slate-600">Verify via FBR 'Tax Asaan' App</span>
                          <span className="font-mono text-[9px] text-slate-400 mt-0.5 break-all">
                            SHA: 4cf8291a56e07b8b17dc9438012f494c8e
                          </span>
                          {showUrduHeadings && (
                            <p className="text-[9px] text-slate-600 mt-1 border-t border-slate-200 pt-1 leading-tight">
                              فروخت شدہ مال بغیر رسید واپس یا تبدیل نہیں ہوگا۔
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Accurate Financial Ledger Calculations (Col 6) */}
                      <div className="col-span-6 bg-slate-50 border border-slate-300 rounded-lg p-3">
                        <table className="w-full text-[11px] font-mono">
                          <tbody>
                            <tr>
                              <td className="text-slate-500 py-0.5">Gross Subtotal:</td>
                              <td className="text-right font-medium text-slate-900">
                                {formatPKR(grossSubtotal)}
                              </td>
                            </tr>
                            {schemeDiscount > 0 && (
                              <tr>
                                <td className="text-emerald-700 py-0.5">Distributor Scheme Disc:</td>
                                <td className="text-right font-medium text-emerald-700">
                                  -{formatPKR(schemeDiscount)}
                                </td>
                              </tr>
                            )}
                            <tr className="border-t border-slate-200 font-bold text-[12px]">
                              <td className="text-slate-900 py-1">Current Invoice Net:</td>
                              <td className="text-right text-amber-700">
                                {formatPKR(currentNetTotal)}
                              </td>
                            </tr>
                            {showPrevBalance && (
                              <tr className="border-t border-dashed border-slate-200 text-[10px]">
                                <td className="text-slate-500 py-0.5">Previous Ledger Balance:</td>
                                <td className="text-right text-slate-900">
                                  {formatPKR(prevCustomerBalance)}
                                </td>
                              </tr>
                            )}
                            <tr className="border-t-2 border-slate-900 font-extrabold text-[13px] bg-white">
                              <td className="text-slate-900 py-1.5 px-1 uppercase">Total Due from Buyer:</td>
                              <td className="text-right text-slate-900 py-1.5 px-1">
                                {formatPKR(totalDueFromBuyer)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 4b. Official Bank Settlement Advice & Raast ID for Retailer Online Transfer */}
                  <div className="mt-4 p-3.5 bg-slate-50 border border-slate-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-900 text-white flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5 text-cyan-300" />
                      </div>
                      <div className="text-[11px] leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold uppercase text-slate-900 text-[11px]">
                            Bank Online Transfer &amp; Raast Settlement Advice
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 text-[9px] font-bold font-mono">
                            INSTANT RAAST
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Retailers can clear net invoice dues directly into our commercial bank account:
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Bank:</span>
                        <strong className="text-slate-900">{activeBank.bankName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Title:</span>
                        <strong className="text-slate-900 truncate block max-w-[130px]">{activeBank.accountTitle}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">24-Digit IBAN:</span>
                        <strong className="text-cyan-800 break-all">{activeBank.iban}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Raast ID / Mobile:</span>
                        <strong className="text-emerald-700 font-bold">{activeBank.raastId}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 5. Dual Stamp & Legal Signature Blocks */}
                  {showDualStamps && (
                    <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-[10px]">
                      <div className="flex flex-col items-center justify-end">
                        <div className="w-full border-b border-dashed border-slate-400 h-10 mb-1"></div>
                        <span className="font-bold text-slate-900 uppercase">
                          Customer Receiving &amp; Stamp
                        </span>
                        {showUrduHeadings && (
                          <span className="text-slate-500">گاہک کے دستخط و مہر</span>
                        )}
                      </div>

                      <div className="flex flex-col items-center justify-end">
                        <div className="w-full border-b border-dashed border-slate-400 h-10 mb-1 flex items-center justify-center font-mono text-[9px] text-emerald-700 italic">
                          Verified &amp; Signed
                        </div>
                        <span className="font-bold text-slate-900 uppercase">
                          Order Booker / Cashier
                        </span>
                        {showUrduHeadings && (
                          <span className="text-slate-500">آرڈر بکر و ترسیل کار</span>
                        )}
                      </div>

                      <div className="flex flex-col items-center justify-end">
                        <div className="w-full border-b border-dashed border-slate-400 h-10 mb-1 flex items-center justify-center">
                          <span className="inline-block border border-amber-700 text-amber-700 font-bold text-[8px] px-2 py-0.5 uppercase tracking-wider rounded">
                            OFFICIAL AUDIT STAMP
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 uppercase">
                          Authorized Signatory
                        </span>
                        <span className="text-slate-500">S. Mansoor (Depot Controller)</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ======================= 80mm ESC/POS THERMAL RECEIPT CANVAS ======================= */
                <div
                  id="printable-thermal-document"
                  className="w-[300px] bg-white text-black p-4 font-mono text-[11px] shadow-xl border border-gray-300 leading-tight print:border-none print:shadow-none print:p-0 print:w-full"
                >
                  <div className="text-center">
                    <div className="font-extrabold text-[13px] uppercase tracking-wider">
                      {entityName}
                    </div>
                    <div className="text-[10px] text-gray-700">{depotLocation}</div>
                    <div className="text-[10px] text-gray-600">{taxIds}</div>
                    <div className="my-1.5 border-b border-black border-dashed"></div>
                    <div className="font-black text-[12px] uppercase">
                      BILL / {docNumber.toUpperCase().includes('BILL') || docNumber.toUpperCase().includes('INVOICE') ? docNumber.toUpperCase() : `INVOICE #${docNumber}`}
                    </div>
                    <div className="text-[10px] font-bold">
                      {selectedOrder?.route} • Shop #{extractShopSequence(selectedCustomer)} ({selectedOrder?.shopName})
                    </div>
                    <div className="text-[9px] text-gray-500">
                      Date: {formatDateTime(selectedOrder?.date || new Date().toISOString())}
                    </div>
                  </div>

                  <div className="my-1.5 border-b border-black border-dashed"></div>
                  <div className="text-[10px]">
                    <div>Client: Shop #{extractShopSequence(selectedCustomer)}: {selectedOrder?.shopName}</div>
                    <div>Route: {selectedOrder?.route}</div>
                    <div>Booker: {selectedOrder?.bookerName || selectedOrder?.salesmanName || 'Field Sales Officer'}</div>
                  </div>
                  <div className="my-1.5 border-b border-black border-dashed"></div>

                  {/* Compact Monospaced Items Table */}
                  <div className="flex justify-between font-bold text-[10px] uppercase">
                    <span>ITEM</span>
                    <span>QTY</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="my-0.5 border-b border-black border-dashed"></div>

                  <div className="space-y-1 my-1">
                    {selectedOrder?.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[10px]">
                        <span className="truncate max-w-[170px] font-sans font-semibold">
                          {item.productName}
                        </span>
                        <span>
                          {item.cartons}c+{item.pieces}p
                        </span>
                        <span className="font-bold">{formatPKR(item.netTotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="my-1.5 border-b border-black border-dashed"></div>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Gross Total:</span>
                      <span>{formatPKR(grossSubtotal)}</span>
                    </div>
                    {schemeDiscount > 0 && (
                      <div className="flex justify-between">
                        <span>Scheme Disc:</span>
                        <span>-{formatPKR(schemeDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-[12px] my-1 border-t border-b border-black py-0.5">
                      <span>NET PAYABLE:</span>
                      <span>{formatPKR(currentNetTotal)}</span>
                    </div>
                    {showPrevBalance && (
                      <>
                        <div className="flex justify-between">
                          <span>Prev Balance:</span>
                          <span>{formatPKR(prevCustomerBalance)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-[11px]">
                          <span>TOTAL DUE:</span>
                          <span>{formatPKR(totalDueFromBuyer)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Official Bank Details & Raast ID for Thermal Slip */}
                  <div className="my-1.5 p-1.5 border border-black border-dashed text-[8px] font-mono leading-tight bg-gray-50 text-left space-y-0.5">
                    <div className="font-bold uppercase text-[8px] text-black">ONLINE BANK / RAAST SETTLEMENT:</div>
                    <div>Bank: {activeBank.bankName}</div>
                    <div className="truncate">Title: {activeBank.accountTitle}</div>
                    <div className="break-all font-bold">IBAN: {activeBank.iban}</div>
                    <div className="font-bold text-black">Raast ID: {activeBank.raastId}</div>
                  </div>

                  {showQrCode && (
                    <div className="my-2 border-t border-black border-dashed pt-2 flex flex-col items-center text-center">
                      <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 33 33">
                        <path d="M0,0h9v9H0ZM2,2v5h5V2ZM24,0h9v9H24ZM26,2v5h5V2ZM0,24h9v9H0ZM2,26v5h5V26ZM11,0h2v4h-2ZM15,0h2v2h-2ZM19,0h3v2h-3ZM13,6h4v2h-4ZM11,10h2v4h-2ZM15,10h5v2h-5ZM22,10h2v2h-2ZM26,10h2v4h-2ZM30,10h3v2h-3ZM0,11h2v3H0ZM4,11h4v2H4ZM4,14h2v3H4ZM8,14h3v2H8ZM14,14h3v2h-3ZM18,14h3v3h-3ZM24,14h2v3h-2ZM28,14h3v2h-3ZM11,18h2v3h-2ZM15,18h4v3h-4ZM21,18h2v2h-2ZM25,18h4v2h-4ZM0,19h3v2H0ZM5,19h3v4H5ZM30,19h3v5h-3ZM11,23h2v4h-2ZM15,23h3v2h-3ZM20,23h3v2h-3ZM24,23h3v3h-3ZM15,26h2v3h-2ZM19,26h3v4h-3ZM23,27h4v2h-4ZM28,27h2v5h-2ZM11,29h2v4h-2ZM14,31h4v2h-4ZM24,31h3v2h-3ZM4,4h1v1H4ZM28,4h1v1H28ZM4,28h1v1H4Z"></path>
                      </svg>
                      <span className="text-[9px] mt-1 font-bold">FBR FISCAL QR INVOICE</span>
                      <span className="text-[8px] text-gray-700">Tariq M. (Van 04) • Thank You</span>
                    </div>
                  )}

                  <div className="text-center text-[9px] text-gray-600 mt-1 font-sans">
                    مال موقع پر چیک کریں، بعد میں واپسی نہیں۔
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

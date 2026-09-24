import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Plus,
  QrCode,
  Layers,
  Thermometer,
  ShieldCheck,
  FileText,
  ArrowRight,
  X,
  ExternalLink,
  Barcode,
  Calendar,
  Warehouse,
  Flame,
  Check,
} from 'lucide-react';
import { GRNDocket, GRNLineItem, Product } from '../../types';
import { formatPKR, formatDateTime, formatDate } from '../../utils/calculations';

interface DesktopInventoryGRNProps {
  products: Product[];
  grnDockets: GRNDocket[];
  onReceiveStock: (docket: GRNDocket, lineUpdates: { productId: string; addedCartons: number }[]) => Promise<void>;
  onAddCustomGRN: (docket: Omit<GRNDocket, 'id'>, lineUpdates: { productId: string; addedCartons: number }[]) => Promise<void>;
}

export const DesktopInventoryGRN: React.FC<DesktopInventoryGRNProps> = ({
  products,
  grnDockets,
  onReceiveStock,
  onAddCustomGRN,
}) => {
  const [selectedDocketId, setSelectedDocketId] = useState<string>(
    grnDockets[0]?.id || ''
  );
  const [docketSearch, setDocketSearch] = useState('');
  const [docketFilterStatus, setDocketFilterStatus] = useState<string>('all');

  // FEFO Table Filter States
  const [fefoSearch, setFefoSearch] = useState('');
  const [fefoBayFilter, setFefoBayFilter] = useState('ALL');
  const [fefoExpiryFilter, setFefoExpiryFilter] = useState('ALL');

  // Active Docket state
  const activeDocket = useMemo(() => {
    return grnDockets.find((d) => d.id === selectedDocketId) || grnDockets[0];
  }, [grnDockets, selectedDocketId]);

  // Checklist state for active docket
  const [debitNoteAck, setDebitNoteAck] = useState(false);
  const [sealCheck, setSealCheck] = useState(true);
  const [tempCheck, setTempCheck] = useState(true);
  const [fefoCheck, setFefoCheck] = useState(true);
  const [inspectorNotes, setInspectorNotes] = useState(activeDocket?.notes || '');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  // Manual Fast Intake Modal State
  const [isFastIntakeOpen, setIsFastIntakeOpen] = useState(false);
  const [intakeProductId, setIntakeProductId] = useState<string>(products[0]?.id || '');
  const [intakeVendor, setIntakeVendor] = useState(products[0]?.brand || 'PrimeLink Distribution');
  const [intakePoNo, setIntakePoNo] = useState(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [intakeGrnNo, setIntakeGrnNo] = useState(`GRN-SWT-${Math.floor(100 + Math.random() * 900)}`);
  const [intakeCartons, setIntakeCartons] = useState(100);
  const [intakeBatchLot, setIntakeBatchLot] = useState('LOT-2026-ENG-901');
  const [intakeExpiryDate, setIntakeExpiryDate] = useState('2027-12-31');
  const [intakeTargetBay, setIntakeTargetBay] = useState('Bay A • Dry Goods Rack 04');

  // Filtered dockets in left master panel
  const filteredDockets = useMemo(() => {
    return grnDockets.filter((d) => {
      const q = docketSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.poNo.toLowerCase().includes(q) ||
        d.grnNo.toLowerCase().includes(q) ||
        d.vendorName.toLowerCase().includes(q) ||
        d.challanNo.toLowerCase().includes(q);

      const matchStatus =
        docketFilterStatus === 'all' || d.status === docketFilterStatus;

      return matchSearch && matchStatus;
    });
  }, [grnDockets, docketSearch, docketFilterStatus]);

  // Aggregate stats
  const totalPalletsReceived = useMemo(() => {
    return (
      grnDockets.reduce((acc, d) => acc + d.totalReceivedCartons, 0) / 20
    ).toFixed(1);
  }, [grnDockets]);

  const criticalShortagesCount = useMemo(() => {
    return products.filter((p) => p.cartonStock <= p.minStockAlert).length;
  }, [products]);

  // Handle Approving and Receiving Stock from the Active Docket
  const handleApproveVoucher = async () => {
    if (!activeDocket) return;

    if (activeDocket.status === 'discrepancy' && !debitNoteAck) {
      alert('Action required: Please acknowledge the Debit Note checklist before approving the inbound stock voucher.');
      return;
    }

    if (activeDocket.status === 'posted_received') {
      alert('This GRN docket has already been approved and its cartons have already been added to your Master Catalog.');
      return;
    }

    setIsPosting(true);

    try {
      // Build list of products to update
      const lineUpdates = activeDocket.items.map((item) => ({
        productId: item.productId,
        addedCartons: item.acceptedCartons,
      }));

      const totalAdded = lineUpdates.reduce((sum, item) => sum + item.addedCartons, 0);

      await onReceiveStock(
        {
          ...activeDocket,
          status: 'posted_received',
          notes: inspectorNotes,
          receivedAt: new Date().toISOString(),
        },
        lineUpdates
      );

      setPostSuccessMessage(
        `✓ GRN ${activeDocket.grnNo} posted successfully! +${totalAdded} Cartons have been credited to your Master Product Catalog.`
      );

      setTimeout(() => {
        setPostSuccessMessage(null);
      }, 5000);
    } finally {
      setIsPosting(false);
    }
  };

  // Handle Fast Restock / Manual GRN
  const handleFastIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeCartons || intakeCartons <= 0) return;

    const prod = products.find((p) => p.id === intakeProductId) || products[0];
    if (!prod) return;

    const newDocket: Omit<GRNDocket, 'id'> = {
      grnNo: intakeGrnNo.trim(),
      poNo: intakePoNo.trim(),
      vendorId: `V-${prod.brand.slice(0, 3).toUpperCase()}`,
      vendorName: intakeVendor.trim(),
      date: new Date().toISOString(),
      challanNo: `CH-${Date.now().toString().slice(-4)}`,
      gatePassNo: `GP-${Math.floor(1000 + Math.random() * 9000)}-SWT`,
      depotLocation: 'Mingora Central WH',
      receivingInspector: 'S. Mansoor (QC-II)',
      truckRegNo: 'SWT-2026-X',
      consignmentWeightKg: intakeCartons * 12.5,
      status: 'posted_received',
      totalOrderedCartons: intakeCartons,
      totalReceivedCartons: intakeCartons,
      totalShortageCartons: 0,
      totalAmount: intakeCartons * prod.tradePrice,
      varianceAmount: 0,
      sealVerified: true,
      notes: `Direct manual warehouse intake at ${intakeTargetBay}`,
      receivedAt: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}`,
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          batchLot: intakeBatchLot,
          mfgDate: new Date().toISOString().slice(0, 10),
          expiryDate: intakeExpiryDate,
          orderedCartons: intakeCartons,
          unloadedCartons: intakeCartons,
          acceptedCartons: intakeCartons,
          rejectedCartons: 0,
          poRate: prod.tradePrice,
          invRate: prod.tradePrice,
          lineTotal: intakeCartons * prod.tradePrice,
          targetBay: intakeTargetBay,
        },
      ],
    };

    await onAddCustomGRN(newDocket, [
      {
        productId: prod.id,
        addedCartons: intakeCartons,
      },
    ]);

    setIsFastIntakeOpen(false);
    setPostSuccessMessage(
      `✓ Restocked ${intakeCartons} cartons of "${prod.name}" into Master Product Catalog!`
    );
    setTimeout(() => {
      setPostSuccessMessage(null);
    }, 4500);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Notification Toast */}
      {postSuccessMessage && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{postSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPostSuccessMessage(null)}
            className="p-1 rounded hover:bg-emerald-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Command & Action Toolbar */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Warehouse Central Intake &amp; FEFO Control
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-mono text-[11px] text-slate-700 font-semibold uppercase">
                Bay Node 09 (Mingora)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase">
                FEFO Engine v4.2 Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Three-way PO/GRN matching, cold-chain verification, and automatic carton restock into Master Catalog.
            </p>
          </div>
        </div>

        {/* Quick Operational Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Batch Print QR Tags</span>
          </button>
          <button
            onClick={() => alert('Warehouse handheld scanners synchronized with Bay Node 09.')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Scanners</span>
          </button>
          <button
            onClick={() => setIsFastIntakeOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Restock Intake</span>
          </button>
        </div>
      </div>

      {/* Section 1: Real-Time KPI Summary Bar (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        {/* KPI 1: Today's GRN Volume */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold block">
                Today's GRN Intake
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-slate-900">
                  {totalPalletsReceived}
                </span>
                <span className="text-xs font-bold text-amber-700">Pallets</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-slate-700">
                {grnDockets.reduce((a, b) => a + b.totalReceivedCartons, 0)} Cartons Inward
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span> Live
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {grnDockets.length} Inbound Vendor Dockets Loaded
            </span>
          </div>
        </div>

        {/* KPI 2: Critical Stock Shortages */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/20 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[11px] text-rose-700 uppercase tracking-wider font-bold block">
                Low Stock Buffer Warning
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-rose-600">
                  {criticalShortagesCount} SKU
                </span>
                <span className="text-xs font-bold text-rose-700">Critical</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-rose-100 pt-2 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-slate-700">Threshold: &lt; Buffer Alert</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                Urgent Intake
              </span>
            </div>
            <span className="text-[11px] text-slate-500 truncate">
              Buffer shortages flagged in catalog
            </span>
          </div>
        </div>

        {/* KPI 3: FEFO Approaching Expiry Batches */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/20 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[11px] text-amber-800 uppercase tracking-wider font-bold block">
                FEFO Expiry Alert
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-amber-700">14</span>
                <span className="text-xs font-bold text-amber-800">Batches &lt; 30d</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-amber-100 pt-2 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-slate-700">Risk Protected: Rs. 418,500</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                Priority Flush
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Auto-assigned to Morning Outbound Fleet</span>
          </div>
        </div>

        {/* KPI 4: Staging Capacity */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold block">
                Total Staging Capacity
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-slate-900">84.6%</span>
                <span className="text-xs font-bold text-slate-500">Occupied</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-xs">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="h-full bg-amber-600" style={{ width: '55%' }}></div>
              <div className="h-full bg-blue-600" style={{ width: '20%' }}></div>
              <div className="h-full bg-emerald-600" style={{ width: '9.6%' }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Bay A: 92%</span>
              <span>Bay B: 78%</span>
              <span className="text-emerald-700 font-bold">Cold: 81%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Master-Detail Core Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT MASTER PANEL: Inward Docket Queue (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">Inward Docket Queue</h2>
              <p className="text-[11px] text-slate-500">
                Inbound shipments requiring 3-way reconciliation
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono">
              {filteredDockets.length} Dockets
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={docketSearch}
              onChange={(e) => setDocketSearch(e.target.value)}
              placeholder="Filter PO, Vendor, GRN..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setDocketFilterStatus('all')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap cursor-pointer transition-colors ${
                docketFilterStatus === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Dockets
            </button>
            <button
              onClick={() => setDocketFilterStatus('discrepancy')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap cursor-pointer transition-colors ${
                docketFilterStatus === 'discrepancy'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-rose-700 hover:bg-slate-200'
              }`}
            >
              Discrepancy
            </button>
            <button
              onClick={() => setDocketFilterStatus('fully_matched')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap cursor-pointer transition-colors ${
                docketFilterStatus === 'fully_matched'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-emerald-800 hover:bg-slate-200'
              }`}
            >
              Matched
            </button>
            <button
              onClick={() => setDocketFilterStatus('posted_received')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap cursor-pointer transition-colors ${
                docketFilterStatus === 'posted_received'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Stock Received
            </button>
          </div>

          {/* Docket Cards List */}
          <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-0.5">
            {filteredDockets.map((docket) => {
              const isSelected = activeDocket?.id === docket.id;
              const isReceived = docket.status === 'posted_received';
              const isDiscrepancy = docket.status === 'discrepancy';
              const isMatched = docket.status === 'fully_matched';

              return (
                <div
                  key={docket.id}
                  onClick={() => {
                    setSelectedDocketId(docket.id);
                    setInspectorNotes(docket.notes || '');
                    setDebitNoteAck(false);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-500 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-600"></div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {docket.poNo}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                          {docket.grnNo}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 truncate">
                        {docket.vendorName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {docket.depotLocation} • Challan #{docket.challanNo}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      {isReceived ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Received
                        </span>
                      ) : isDiscrepancy ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Discrepancy
                        </span>
                      ) : isMatched ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Matched
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                          Review
                        </span>
                      )}

                      <span className="font-mono font-bold text-xs text-slate-900 mt-2">
                        {formatPKR(docket.totalAmount)}
                      </span>

                      {docket.varianceAmount > 0 && !isReceived && (
                        <span className="text-[10px] font-bold text-rose-600">
                          -Rs. {docket.varianceAmount.toLocaleString()} Var.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 flex items-center justify-between text-slate-500 text-[10px] border-t border-slate-200/60">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {formatDateTime(docket.date)}
                    </span>
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        isSelected ? 'text-amber-700' : 'text-slate-400'
                      }`}
                    >
                      {isSelected ? 'Active Focus' : 'Select Docket'}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT DETAIL PANE: Inbound Shipment Verification & 3-Way Match (8 cols) */}
        {activeDocket ? (
          <div className="xl:col-span-8 flex flex-col gap-5">
            {/* Header Verification Strip */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {activeDocket.poNo}
                    </span>
                    <span className="text-slate-400 font-bold">⇄</span>
                    <span className="text-xl font-extrabold text-amber-700 font-mono">
                      {activeDocket.grnNo}
                    </span>

                    {activeDocket.status === 'posted_received' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        STOCK POSTED TO MASTER CATALOG
                      </span>
                    ) : activeDocket.status === 'discrepancy' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        VARIANCE FLAGGED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        READY TO RECEIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Vendor:{' '}
                    <strong className="text-slate-900 font-bold">{activeDocket.vendorName}</strong>{' '}
                    ({activeDocket.vendorId})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Print Challan</span>
                  </button>
                </div>
              </div>

              {/* 6-Point Metadata Alignment Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Gate Pass ID
                  </span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {activeDocket.gatePassNo}
                  </span>
                  <span className="text-[10px] text-slate-500">Gate-01 (Inward)</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Receiving Depot
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5 truncate">
                    {activeDocket.depotLocation}
                  </span>
                  <span className="text-[10px] text-slate-500">Central Storage</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Challan Ref
                  </span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5 truncate">
                    {activeDocket.challanNo}
                  </span>
                  <span className="text-[10px] text-slate-500">Dated Today</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    QC Inspector
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5 truncate">
                    {activeDocket.receivingInspector}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">Badge Verified</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Consignment WT
                  </span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {activeDocket.consignmentWeightKg} KG
                  </span>
                  <span className="text-[10px] text-slate-500">Truck: {activeDocket.truckRegNo}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Invoice Subtotal
                  </span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {formatPKR(activeDocket.totalAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {activeDocket.totalReceivedCartons} Ctns
                  </span>
                </div>
              </div>

              {/* Discrepancy Alert Banner */}
              {activeDocket.status === 'discrepancy' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Variance / Shortage Detected During Unloading</span>
                      <span className="bg-rose-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-extrabold">
                        Resolution Required
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed text-[11px]">
                      {activeDocket.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3-Way Line Match Verification Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider">
                    3-Way Line Match Verification
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 font-mono text-[11px] font-bold text-slate-700">
                    {activeDocket.items.length} Line Items
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Ordered: {activeDocket.totalOrderedCartons} Ctn
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    Received: {activeDocket.totalReceivedCartons} Ctn
                  </span>
                  {activeDocket.totalShortageCartons > 0 && (
                    <span className="flex items-center gap-1 text-rose-600 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      Short: {activeDocket.totalShortageCartons} Ctn
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 min-w-[200px]">Item SKU &amp; Description</th>
                      <th className="p-3 text-right">Ordered</th>
                      <th className="p-3 text-right">Unloaded</th>
                      <th className="p-3 text-right text-emerald-700 font-bold">Accepted</th>
                      <th className="p-3 text-right text-rose-700 font-bold">Short/Rej</th>
                      <th className="p-3 text-right">PO Rate</th>
                      <th className="p-3 text-right">Inv Rate</th>
                      <th className="p-3 text-right">Line Total</th>
                      <th className="p-3 text-center">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeDocket.items.map((item, idx) => {
                      const isShort = item.rejectedCartons > 0;
                      const isPriceVar = item.poRate !== item.invRate;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isShort || isPriceVar ? 'bg-rose-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 text-center text-slate-400 font-sans">
                            {idx + 1}
                          </td>

                          <td className="p-3 font-sans">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {item.sku} • Batch: {item.batchLot} • Exp: {item.expiryDate}
                            </div>
                            {item.varianceNote && (
                              <div className="text-[10px] font-bold text-rose-600 mt-0.5">
                                ⚠ {item.varianceNote}
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right text-slate-700 font-bold">
                            {item.orderedCartons} Ctn
                          </td>

                          <td className="p-3 text-right text-slate-700 font-bold">
                            {item.unloadedCartons} Ctn
                          </td>

                          <td className="p-3 text-right text-emerald-700 font-black">
                            {item.acceptedCartons} Ctn
                          </td>

                          <td className="p-3 text-right text-rose-700 font-black">
                            {item.rejectedCartons > 0 ? `-${item.rejectedCartons} Ctn` : '-'}
                          </td>

                          <td className="p-3 text-right text-slate-600">
                            {formatPKR(item.poRate)}
                          </td>

                          <td
                            className={`p-3 text-right font-bold ${
                              isPriceVar ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {formatPKR(item.invRate)}
                          </td>

                          <td className="p-3 text-right font-bold text-slate-900 font-sans">
                            {formatPKR(item.lineTotal)}
                          </td>

                          <td className="p-3 text-center whitespace-nowrap font-sans">
                            {isShort ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Shortage
                              </span>
                            ) : isPriceVar ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Price Var.
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Exact Match
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                      <td colSpan={2} className="p-3 uppercase font-sans">
                        Reconciliation Totals:
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        {activeDocket.totalOrderedCartons} Ctn
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        {activeDocket.totalReceivedCartons} Ctn
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700">
                        {activeDocket.totalReceivedCartons} Ctn
                      </td>
                      <td className="p-3 text-right font-mono font-black text-rose-600">
                        {activeDocket.totalShortageCartons > 0
                          ? `-${activeDocket.totalShortageCartons} Ctn`
                          : '0'}
                      </td>
                      <td colSpan={2} className="p-3 text-right font-sans text-slate-500">
                        Net Inward:
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        {formatPKR(activeDocket.totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Inline Audit Checklist & Inspector Notes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Checklist Card */}
              <div className="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Dock Receiving Checklist
                  </h3>
                  <span className="text-emerald-700 text-[11px] font-bold">3 of 4 Passed</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fefoCheck}
                      onChange={(e) => setFefoCheck(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">FEFO Expiry Batch Validation</p>
                      <p className="text-[11px] text-slate-500">
                        All expiry dates exceed 18-month retail requirement
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempCheck}
                      onChange={(e) => setTempCheck(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">Temperature &amp; Moisture Logs</p>
                      <p className="text-[11px] text-slate-500">
                        Dry cargo cabin check: 22°C, 48% RH (Pass)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sealCheck}
                      onChange={(e) => setSealCheck(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">Physical Seal &amp; Tamper Check</p>
                      <p className="text-[11px] text-slate-500">
                        Container seal verified intact before dock unsealing
                      </p>
                    </div>
                  </label>

                  {activeDocket.status === 'discrepancy' && (
                    <label className="flex items-center gap-3 p-2 rounded-xl bg-rose-50 border border-rose-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={debitNoteAck}
                        onChange={(e) => setDebitNoteAck(e.target.checked)}
                        className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-rose-700">
                          Debit Note Acknowledgment (DN-2024-904)
                        </p>
                        <p className="text-[11px] text-rose-600">
                          Requires vendor sign-off on driver copy for shortage
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Inspector Notes */}
              <div className="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">Receiving Inspector Findings</h3>
                  <span className="text-slate-400 font-mono text-[10px]">
                    ID: {activeDocket.receivingInspector}
                  </span>
                </div>
                <textarea
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Enter inspector findings, driver notes, or adjustment instructions..."
                />
                <span className="text-[10px] text-slate-400 font-mono">
                  All approvals credit carton stock directly into Dexie IndexedDB.
                </span>
              </div>
            </div>

            {/* Sticky Action Resolution Bar */}
            <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Recommended Action
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {activeDocket.status === 'posted_received'
                      ? 'Stock Already Credited to Catalog'
                      : activeDocket.status === 'discrepancy'
                      ? 'Approve with Discrepancy Debit Note'
                      : 'Approve & Credit Inward Cartons to Catalog'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => alert(`Hold audit applied to docket ${activeDocket.poNo}.`)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hold for Audit
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Export PDF
                </button>

                <button
                  type="button"
                  disabled={activeDocket.status === 'posted_received' || isPosting}
                  onClick={handleApproveVoucher}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                    activeDocket.status === 'posted_received'
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white active:scale-98'
                  }`}
                >
                  {isPosting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Posting to Master Catalog...</span>
                    </>
                  ) : activeDocket.status === 'posted_received' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Stock Posted ✓</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Post GRN &amp; Restock Catalog</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-8 bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            Select an inbound docket from the left queue to inspect.
          </div>
        )}
      </div>

      {/* Manual Restock Intake Modal */}
      {isFastIntakeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Inbound Intake
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Manual Goods Received Note (GRN)
                </h3>
              </div>
              <button
                onClick={() => setIsFastIntakeOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFastIntakeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Target Product in Master Catalog *
                </label>
                <select
                  value={intakeProductId}
                  onChange={(e) => setIntakeProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Current Stock: {p.cartonStock} Ctns
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    PO Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={intakePoNo}
                    onChange={(e) => setIntakePoNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    GRN Slip # *
                  </label>
                  <input
                    type="text"
                    required
                    value={intakeGrnNo}
                    onChange={(e) => setIntakeGrnNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Vendor / Manufacturer *
                </label>
                <input
                  type="text"
                  required
                  value={intakeVendor}
                  onChange={(e) => setIntakeVendor(e.target.value)}
                  placeholder="e.g. Zams Group / Principal Supplier"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Inward Cartons To Add *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={intakeCartons}
                    onChange={(e) => setIntakeCartons(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-bold text-amber-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Batch / Lot Code
                  </label>
                  <input
                    type="text"
                    value={intakeBatchLot}
                    onChange={(e) => setIntakeBatchLot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Expiry Date (FEFO)
                  </label>
                  <input
                    type="date"
                    value={intakeExpiryDate}
                    onChange={(e) => setIntakeExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Warehouse Bin Location
                  </label>
                  <select
                    value={intakeTargetBay}
                    onChange={(e) => setIntakeTargetBay(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="Bay A • Dry Goods Rack 04">Bay A • Dry Goods Rack 04</option>
                    <option value="Bay B • Cold Room 02 (Refrigerated)">
                      Bay B • Cold Room 02 (Refrigerated)
                    </option>
                    <option value="Bay B • Ambient Pallet 14">Bay B • Ambient Pallet 14</option>
                    <option value="Quarantine Holding">Quarantine Holding</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <strong>Inventory Impact:</strong> This action will credit{' '}
                <span className="font-bold underline font-mono">+{intakeCartons} Cartons</span> directly
                into your Master Product Catalog.
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow cursor-pointer transition-colors"
                >
                  Post Inward Stock &amp; Credit Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

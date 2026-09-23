import React from 'react';
import { Customer, Order } from '../../types';
import { formatPKR, formatDateTime } from '../../utils/calculations';

interface ThermalReceiptProps {
  order: Order;
  customer?: Customer;
  showPrintButton?: boolean;
}

export const Thermal80mmReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  customer,
  showPrintButton = true,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center">
      {showPrintButton && (
        <div className="mb-4 flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm shadow cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print 80mm Receipt
          </button>
        </div>
      )}

      {/* 80mm thermal receipt container: ~72-80mm width (approx 300px) */}
      <div
        id="thermal-receipt-container"
        className="w-[300px] bg-white text-black p-4 font-mono text-xs border border-gray-300 shadow-sm print:shadow-none print:border-none print:w-full print:p-0 leading-relaxed"
      >
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="font-extrabold text-base tracking-wider uppercase">
            PRIMELINK DMS
          </div>
          <div className="text-[10px] text-gray-700 font-sans">
            OmniSales Distribution Ltd.
          </div>
          <div className="text-[10px] text-gray-600">
            Mingora Main Depot, Swat • 0946-721088
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">
            GST Reg: 17-00-9821-001 • NTN: 3948210
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2 space-y-0.5 text-[11px]">
          <div className="flex justify-between font-bold">
            <span>INV NO:</span>
            <span>{order.orderNo}</span>
          </div>
          <div className="flex justify-between">
            <span>DATE:</span>
            <span>{formatDateTime(order.date)}</span>
          </div>
          <div className="flex justify-between">
            <span>ROUTE:</span>
            <span className="font-semibold truncate max-w-[170px]">{order.route}</span>
          </div>
          <div className="flex justify-between">
            <span>CLIENT:</span>
            <span className="font-bold truncate max-w-[170px]">{order.shopName}</span>
          </div>
          {customer?.phone && (
            <div className="flex justify-between text-[10px]">
              <span>PHONE:</span>
              <span>{customer.phone}</span>
            </div>
          )}
        </div>

        {/* Item Table */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="grid grid-cols-12 font-bold border-b border-gray-300 pb-1 mb-1 text-[10px] uppercase">
            <span className="col-span-6">ITEM</span>
            <span className="col-span-3 text-center">CTN/PCS</span>
            <span className="col-span-3 text-right">TOTAL</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            {order.items.map((item, idx) => (
              <div key={idx} className="border-b border-dotted border-gray-200 pb-1">
                <div className="font-semibold truncate">{item.productName}</div>
                <div className="grid grid-cols-12 text-[10px] text-gray-700">
                  <span className="col-span-6">
                    {item.cartons} Ctn + {item.pieces} Pcs ({item.totalUnits} Units)
                  </span>
                  <span className="col-span-3 text-center">
                    @{Math.round(item.unitPrice)}
                  </span>
                  <span className="col-span-3 text-right font-mono font-bold text-black">
                    {Math.round(item.netTotal).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-gray-400">
          <div className="flex justify-between">
            <span>Total Cartons:</span>
            <span className="font-bold">{order.totalCartons} Ctn / {order.totalPieces} Pcs</span>
          </div>
          <div className="flex justify-between">
            <span>Gross Bill:</span>
            <span>{formatPKR(order.grossBill)}</span>
          </div>
          {order.totalDiscount > 0 && (
            <div className="flex justify-between text-red-700 font-semibold">
              <span>Trade Scheme Discount:</span>
              <span>-{formatPKR(order.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
            <span>NET PAYABLE:</span>
            <span className="font-mono">{formatPKR(order.netBill)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Cash Paid:</span>
            <span>{formatPKR(order.cashPaid)}</span>
          </div>
          <div className="flex justify-between font-bold text-[11px]">
            <span>Balance Added to Ledger:</span>
            <span>{formatPKR(order.remainingBalance)}</span>
          </div>
        </div>

        {/* Customer Ledger Snapshot */}
        {customer && (
          <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
            <div className="flex justify-between font-semibold">
              <span>Current Shop Balance:</span>
              <span>{formatPKR(customer.currentBalance)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Allowed Credit Limit:</span>
              <span>{formatPKR(customer.creditLimit)}</span>
            </div>
          </div>
        )}

        {/* Urdu & English Disclaimer / Footer */}
        <div className="pt-2 text-center text-[10px] space-y-1 text-gray-700 font-sans">
          <div className="font-bold">
            مال موقع پر چیک کریں، بعد میں واپسی قابل قبول نہیں۔
          </div>
          <div className="text-[9px]">
            Goods once sold will not be returned without warranty seal.
          </div>
          <div className="pt-2 font-mono text-[9px] text-gray-500 tracking-widest">
            * * * THANK YOU FOR YOUR BUSINESS * * *
          </div>
        </div>
      </div>
    </div>
  );
};

interface A4DeliveryInvoiceProps {
  order: Order;
  customer?: Customer;
  showPrintButton?: boolean;
}

export const A4DeliveryInvoice: React.FC<A4DeliveryInvoiceProps> = ({
  order,
  customer,
  showPrintButton = true,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full">
      {showPrintButton && (
        <div className="mb-4 flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-sm shadow cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print A4 Delivery Invoice
          </button>
        </div>
      )}

      {/* A4 Sheet standard layout (approx 800px max on screen, 100% on print) */}
      <div
        id="a4-invoice-container"
        className="w-full max-w-[820px] bg-white text-gray-900 p-8 border border-gray-200 shadow-lg print:shadow-none print:border-none print:p-0 print:max-w-none text-sm font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
              PRIMELINK DISTRIBUTION MANAGEMENT
            </h1>
            <p className="text-xs font-semibold text-gray-600">
              OmniSales FMCG &amp; Pharma Authorized Regional Distributor
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Main GT Road Industrial Depot, Mingora, Swat, KP
            </p>
            <p className="text-xs text-gray-500">
              Phone: +92 946 721088 • WhatsApp Support: +92 300 9821450
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-gray-900 text-white font-mono font-bold px-3 py-1 text-xs rounded mb-2 uppercase">
              Commercial Delivery Invoice
            </span>
            <div className="text-sm font-bold font-mono">
              INVOICE #: {order.orderNo}
            </div>
            <div className="text-xs text-gray-600">
              Date: {formatDateTime(order.date)}
            </div>
            <div className="text-xs text-gray-600">
              Payment Terms: <span className="font-semibold uppercase">{order.paymentType}</span>
            </div>
          </div>
        </div>

        {/* Customer & Route Details */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Bill To &amp; Delivery Destination:
            </h3>
            <div className="text-base font-bold text-gray-900">{order.shopName}</div>
            <div className="text-xs text-gray-700 font-medium">Attn: {order.customerName}</div>
            <div className="text-xs text-gray-600">{customer?.address || 'Mingora Bazaar'}</div>
            <div className="text-xs text-gray-600 mt-1">
              Phone: <span className="font-mono">{customer?.phone || 'N/A'}</span>
            </div>
            {customer?.cnic && (
              <div className="text-xs text-gray-500 font-mono">CNIC: {customer.cnic}</div>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Dispatch &amp; Van Logistics:
            </h3>
            <div className="text-sm font-semibold text-gray-800">
              Assigned Route: <span className="font-bold text-blue-800">{order.route}</span>
            </div>
            <div className="text-xs text-gray-600">Dispatch Van: #12 (Toyota Hilux)</div>
            <div className="text-xs text-gray-600">Sales Officer: Tariq Khan (OB-04)</div>
            <div className="mt-2 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-200">
              FBR SRO Tax Compliant
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left border-collapse border border-gray-200 mb-6 text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[11px] border-b border-gray-300">
              <th className="p-2 border-r border-gray-200 w-8 text-center">#</th>
              <th className="p-2 border-r border-gray-200">Product SKU &amp; Name</th>
              <th className="p-2 border-r border-gray-200 text-center">Pack</th>
              <th className="p-2 border-r border-gray-200 text-center">Cartons</th>
              <th className="p-2 border-r border-gray-200 text-center">Pieces</th>
              <th className="p-2 border-r border-gray-200 text-center font-bold">Total Units</th>
              <th className="p-2 border-r border-gray-200 text-right">TP / Ctn</th>
              <th className="p-2 border-r border-gray-200 text-right">Unit Rate</th>
              <th className="p-2 border-r border-gray-200 text-right">Gross Total</th>
              <th className="p-2 border-r border-gray-200 text-right">Disc %</th>
              <th className="p-2 text-right font-bold">Net Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-2 border-r border-gray-200 text-center text-gray-500">{idx + 1}</td>
                <td className="p-2 border-r border-gray-200">
                  <div className="font-semibold text-gray-900">{item.productName}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{item.sku}</div>
                </td>
                <td className="p-2 border-r border-gray-200 text-center font-mono">{item.packSize}</td>
                <td className="p-2 border-r border-gray-200 text-center font-mono font-semibold">{item.cartons}</td>
                <td className="p-2 border-r border-gray-200 text-center font-mono">{item.pieces}</td>
                <td className="p-2 border-r border-gray-200 text-center font-mono font-bold text-gray-900">{item.totalUnits}</td>
                <td className="p-2 border-r border-gray-200 text-right font-mono">{item.tradePrice.toLocaleString()}</td>
                <td className="p-2 border-r border-gray-200 text-right font-mono">{item.unitPrice.toFixed(2)}</td>
                <td className="p-2 border-r border-gray-200 text-right font-mono">{item.grossTotal.toLocaleString()}</td>
                <td className="p-2 border-r border-gray-200 text-right font-mono">{item.discountPercent}%</td>
                <td className="p-2 text-right font-mono font-bold text-gray-900">{item.netTotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
              <td colSpan={3} className="p-2 text-right uppercase">Totals:</td>
              <td className="p-2 text-center font-mono">{order.totalCartons}</td>
              <td className="p-2 text-center font-mono">{order.totalPieces}</td>
              <td className="p-2 text-center font-mono">{order.totalUnits}</td>
              <td colSpan={2} className="p-2"></td>
              <td className="p-2 text-right font-mono">{order.grossBill.toLocaleString()}</td>
              <td className="p-2 text-right font-mono text-red-600">-{order.totalDiscount.toLocaleString()}</td>
              <td className="p-2 text-right font-mono text-base text-gray-900">{order.netBill.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        {/* Summary & Signatures */}
        <div className="grid grid-cols-2 gap-8 items-start mb-8">
          <div className="bg-gray-50 p-4 rounded border border-gray-200 text-xs space-y-1">
            <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-2">
              Payment &amp; Ledger Reconciliation:
            </h4>
            <div className="flex justify-between">
              <span className="text-gray-600">Net Invoice Amount:</span>
              <span className="font-mono font-bold">{formatPKR(order.netBill)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Immediate Cash Collected:</span>
              <span className="font-mono text-emerald-700 font-bold">{formatPKR(order.cashPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1">
              <span className="text-gray-700 font-bold">Carried to Customer Ledger:</span>
              <span className="font-mono font-bold text-blue-900">{formatPKR(order.remainingBalance)}</span>
            </div>
            {customer && (
              <div className="flex justify-between pt-1 border-t border-gray-200 text-gray-600">
                <span>Total Shop Balance Outstanding:</span>
                <span className="font-mono font-bold text-red-700">{formatPKR(customer.currentBalance)}</span>
              </div>
            )}
          </div>

          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="h-12 border-b border-gray-400"></div>
                <div className="text-[11px] font-bold text-gray-700 mt-1 uppercase">
                  Delivery Agent / Van Driver
                </div>
              </div>
              <div>
                <div className="h-12 border-b border-gray-400"></div>
                <div className="text-[11px] font-bold text-gray-700 mt-1 uppercase">
                  Shopkeeper Stamp &amp; Signature
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 text-center italic">
              All claims subject to Mingora Swat jurisdiction. Electronic copy generated via OmniSales ERP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

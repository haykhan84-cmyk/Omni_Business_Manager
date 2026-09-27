import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Download,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  CheckCircle,
  X,
  FileSpreadsheet,
  Check,
  Eye,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Maximize2,
  Minimize2,
  TrendingUp,
  ShieldAlert,
  Calendar,
  DollarSign,
  Warehouse,
  Tag,
  Percent,
} from 'lucide-react';
import { Product } from '../../types';
import { getNextSequenceNumber, formatSkuId } from '../../utils/sequenceNumbering';

interface DesktopProductCatalogProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}

// Clean number formatting without "Rs." (comma separated, single line)
const formatNumber = (val: number, decimals: number = 0): string => {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

type SortField = 'sku' | 'name' | 'stock' | 'tp' | 'retail' | 'margin';
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
  required?: boolean;
}

const ALL_COLUMNS: ColumnConfig[] = [
  { key: 'sku', label: '1. SKU / Code', defaultVisible: true, required: true },
  { key: 'name', label: '2. Product & Brand', defaultVisible: true, required: true },
  { key: 'packSize', label: '3. Pack Size', defaultVisible: true, required: true },
  { key: 'stock', label: '4. Stock on Hand', defaultVisible: true, required: true },
  { key: 'batch', label: '5. Batches (FEFO)', defaultVisible: true },
  { key: 'cartonTp', label: '6. Carton TP', defaultVisible: true },
  { key: 'unitRate', label: '7. Unit Rate', defaultVisible: true },
  { key: 'retailPrice', label: '8. Retail Price', defaultVisible: true },
  { key: 'profitMargin', label: '9. Profit Margin', defaultVisible: true },
  { key: 'supplierScheme', label: '10. Supplier Scheme / Discount', defaultVisible: true },
  { key: 'actions', label: '11. Actions', defaultVisible: true },
];

export const DesktopProductCatalog: React.FC<DesktopProductCatalogProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Dedicated Product 360 Popup Modal
  const [selectedProduct360, setSelectedProduct360] = useState<Product | null>(null);
  const [isProduct360ModalOpen, setIsProduct360ModalOpen] = useState(false);

  // Table Controls: Sorting
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Table Controls: Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ALL_COLUMNS.forEach((col) => {
      initial[col.key] = col.defaultVisible;
    });
    return initial;
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement | null>(null);

  // Table Controls: Compact Density Mode
  const [isCompactDensity, setIsCompactDensity] = useState(false);

  // Table Controls: Column Widths & Drag-To-Resize
  const defaultStandardWidths = useMemo<Record<string, number>>(
    () => ({
      sku: 95,
      name: 240,
      packSize: 120,
      stock: 160,
      batch: 165,
      cartonTp: 110,
      unitRate: 100,
      retailPrice: 110,
      profitMargin: 135,
      supplierScheme: 120,
      actions: 100,
    }),
    []
  );

  const defaultCompactWidths = useMemo<Record<string, number>>(
    () => ({
      sku: 75,
      name: 180,
      packSize: 95,
      stock: 120,
      batch: 130,
      cartonTp: 90,
      unitRate: 85,
      retailPrice: 90,
      profitMargin: 110,
      supplierScheme: 95,
      actions: 85,
    }),
    []
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => defaultStandardWidths);
  const resizingColumnRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Handle Compact Density Toggle
  const toggleCompactDensity = () => {
    setIsCompactDensity((prev) => {
      const next = !prev;
      setColumnWidths(next ? defaultCompactWidths : defaultStandardWidths);
      return next;
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
    };
    if (isColumnDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isColumnDropdownOpen]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isProduct360ModalOpen) {
          setIsProduct360ModalOpen(false);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else if (productToDelete) {
          setProductToDelete(null);
        } else if (isColumnDropdownOpen) {
          setIsColumnDropdownOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProduct360ModalOpen, isAddModalOpen, productToDelete, isColumnDropdownOpen]);

  // Drag-to-resize handlers
  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = columnWidths[colKey] || 100;
    resizingColumnRef.current = {
      colKey,
      startX: e.clientX,
      startWidth,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColumnRef.current) return;
      const { colKey: key, startX, startWidth: sw } = resizingColumnRef.current;
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(45, Math.min(600, sw + diff));
      setColumnWidths((prev) => ({
        ...prev,
        [key]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingColumnRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleColumnVisibility = (key: string) => {
    // Columns 1 through 4 are mandatory
    if (key === 'sku' || key === 'name' || key === 'packSize' || key === 'stock') {
      return;
    }
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Helper to extract clean sequential or code representation
  const getCleanSkuCode = (p: Product, index: number): string => {
    if (p.skuNumber) return `${p.skuNumber}`;
    // Check if sku is numeric or has format SKU-001
    const numericMatch = p.sku.match(/\d+/);
    if (numericMatch) {
      return `${parseInt(numericMatch[0], 10)}`;
    }
    return p.sku || `${index + 1}`;
  };

  // Helper for batch & expiry calculation
  const getBatchInfo = (p: Product, index: number) => {
    const batchLot = p.batchNumber || `B-${100 + (p.skuNumber || index + 1)}`;
    const expiryDateStr = p.expiryDate || '2026-11-30';
    const expiryDisplay = p.expiryDate || 'Nov 2026';

    // Calculate shelf life days
    let daysRemaining = 240;
    try {
      const expTime = new Date(expiryDateStr).getTime();
      const nowTime = new Date('2026-09-27').getTime();
      if (!isNaN(expTime)) {
        daysRemaining = Math.round((expTime - nowTime) / (1000 * 60 * 60 * 24));
      }
    } catch {
      daysRemaining = 240;
    }

    const isNearExpiry = daysRemaining <= 90;
    const isExpired = daysRemaining <= 0;

    return {
      batchLot,
      expiryDisplay,
      daysRemaining,
      isNearExpiry,
      isExpired,
    };
  };

  // Helper for Supplier Scheme
  const getSupplierScheme = (p: Product, index: number): string => {
    if (p.supplierScheme) return p.supplierScheme;
    if (p.taxSchedule?.includes('18%')) return '2.5%';
    if (index % 3 === 0) return '5%';
    return 'Nil';
  };

  // Categories & Brands
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set), 'Low Stock Alert'];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  // 1. LIVE STOCK VALUATION KPI CALCULATIONS
  const valuationMetrics = useMemo(() => {
    let totalValuationTP = 0;
    let totalValuationRetail = 0;
    let totalPhysicalCartons = 0;
    let totalPhysicalPieces = 0;

    products.forEach((p) => {
      const ctn = Number(p.cartonStock) || 0;
      const tp = Number(p.tradePrice) || 0;
      const retail = Number(p.retailPrice) || 0;
      const pieces = Number(p.piecesStock) || 0;

      // Sum of (stock_cartons * trade_price)
      totalValuationTP += ctn * tp;
      // Sum of (stock_cartons * retail_price)
      totalValuationRetail += ctn * retail;
      totalPhysicalCartons += ctn;
      totalPhysicalPieces += pieces;
    });

    const projectedMargin = totalValuationRetail - totalValuationTP;
    const marginPercent =
      totalValuationRetail > 0 ? (projectedMargin / totalValuationRetail) * 100 : 0;

    return {
      totalValuationTP,
      totalValuationRetail,
      projectedMargin,
      marginPercent,
      totalPhysicalCartons,
      totalPhysicalPieces,
    };
  }, [products]);

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter & Sort Products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      let matchesCat = true;
      if (selectedCategory === 'Low Stock Alert') {
        matchesCat = p.cartonStock <= p.minStockAlert;
      } else if (selectedCategory !== 'All') {
        matchesCat = p.category === selectedCategory;
      }

      const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(q));

      return matchesCat && matchesBrand && matchesSearch;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'sku') {
        const skuA = parseInt(a.sku.replace(/\D/g, '') || '0', 10);
        const skuB = parseInt(b.sku.replace(/\D/g, '') || '0', 10);
        comparison = skuA - skuB;
        if (comparison === 0) {
          comparison = a.sku.localeCompare(b.sku);
        }
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'stock') {
        comparison = (a.cartonStock || 0) - (b.cartonStock || 0);
      } else if (sortField === 'tp') {
        comparison = (a.tradePrice || 0) - (b.tradePrice || 0);
      } else if (sortField === 'retail') {
        comparison = (a.retailPrice || 0) - (b.retailPrice || 0);
      } else if (sortField === 'margin') {
        const marginA = (a.retailPrice || 0) - (a.tradePrice || 0);
        const marginB = (b.retailPrice || 0) - (b.tradePrice || 0);
        comparison = marginA - marginB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [products, selectedCategory, selectedBrand, searchQuery, sortField, sortDirection]);

  // Form State for Add / Edit
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('General FMCG');
  const [formPackSize, setFormPackSize] = useState<number | string>(12);
  const [formTradePrice, setFormTradePrice] = useState<number | string>('');
  const [formRetailPrice, setFormRetailPrice] = useState<number | string>('');
  const [formCartonStock, setFormCartonStock] = useState<number | string>('');
  const [formPiecesStock, setFormPiecesStock] = useState<number | string>('');
  const [formMinStockAlert, setFormMinStockAlert] = useState<number | string>(10);
  const [formBarcode, setFormBarcode] = useState('');
  const [formTaxSchedule, setFormTaxSchedule] = useState('3rd Sch (MRP)');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('Nov 2026');
  const [formSupplierScheme, setFormSupplierScheme] = useState('Nil');
  const [formWarehouseLocation, setFormWarehouseLocation] = useState('Mingora Central - Bay 4A');

  const openAddModal = () => {
    const nextSkuNum = getNextSequenceNumber(products, (p) => p.sku || p.id);
    setFormSku(formatSkuId(nextSkuNum));
    setFormName('');
    setFormBrand('');
    setFormCategory('General FMCG');
    setFormPackSize(12);
    setFormTradePrice('');
    setFormRetailPrice('');
    setFormCartonStock('');
    setFormPiecesStock('');
    setFormMinStockAlert(10);
    setFormBarcode('');
    setFormTaxSchedule('3rd Sch (MRP)');
    setFormBatchNumber(`B-${100 + nextSkuNum}`);
    setFormExpiryDate('Nov 2026');
    setFormSupplierScheme('Nil');
    setFormWarehouseLocation('Mingora Central - Bay 4A');
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormCategory(p.category);
    setFormPackSize(p.packSize);
    setFormTradePrice(p.tradePrice);
    setFormRetailPrice(p.retailPrice);
    setFormCartonStock(p.cartonStock);
    setFormPiecesStock(p.piecesStock);
    setFormMinStockAlert(p.minStockAlert);
    setFormBarcode(p.barcode || '');
    setFormTaxSchedule(p.taxSchedule || '3rd Sch (MRP)');
    setFormBatchNumber(p.batchNumber || `B-${104}`);
    setFormExpiryDate(p.expiryDate || 'Nov 2026');
    setFormSupplierScheme(p.supplierScheme || 'Nil');
    setFormWarehouseLocation(p.warehouseLocation || 'Mingora Central - Bay 4A');
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) return;

    if (editingProduct) {
      await onUpdateProduct({
        ...editingProduct,
        sku: formSku.trim(),
        name: formName.trim(),
        brand: formBrand.trim(),
        category: formCategory,
        packSize: Number(formPackSize) || 1,
        tradePrice: Number(formTradePrice) || 0,
        retailPrice: Number(formRetailPrice) || 0,
        cartonStock: Number(formCartonStock) || 0,
        piecesStock: Number(formPiecesStock) || 0,
        minStockAlert: Number(formMinStockAlert) || 0,
        barcode: formBarcode.trim(),
        taxSchedule: formTaxSchedule,
        batchNumber: formBatchNumber.trim(),
        expiryDate: formExpiryDate.trim(),
        supplierScheme: formSupplierScheme.trim(),
        warehouseLocation: formWarehouseLocation.trim(),
      });
      // Also update selectedProduct360 if open
      if (selectedProduct360?.id === editingProduct.id) {
        setSelectedProduct360({
          ...editingProduct,
          sku: formSku.trim(),
          name: formName.trim(),
          brand: formBrand.trim(),
          category: formCategory,
          packSize: Number(formPackSize) || 1,
          tradePrice: Number(formTradePrice) || 0,
          retailPrice: Number(formRetailPrice) || 0,
          cartonStock: Number(formCartonStock) || 0,
          piecesStock: Number(formPiecesStock) || 0,
          minStockAlert: Number(formMinStockAlert) || 0,
          barcode: formBarcode.trim(),
          taxSchedule: formTaxSchedule,
          batchNumber: formBatchNumber.trim(),
          expiryDate: formExpiryDate.trim(),
          supplierScheme: formSupplierScheme.trim(),
          warehouseLocation: formWarehouseLocation.trim(),
        });
      }
    } else {
      await onAddProduct({
        sku: formSku.trim(),
        name: formName.trim(),
        brand: formBrand.trim(),
        category: formCategory,
        packSize: Number(formPackSize) || 1,
        tradePrice: Number(formTradePrice) || 0,
        retailPrice: Number(formRetailPrice) || 0,
        cartonStock: Number(formCartonStock) || 0,
        piecesStock: Number(formPiecesStock) || 0,
        minStockAlert: Number(formMinStockAlert) || 0,
        barcode: formBarcode.trim(),
        taxSchedule: formTaxSchedule,
        batchNumber: formBatchNumber.trim(),
        expiryDate: formExpiryDate.trim(),
        supplierScheme: formSupplierScheme.trim(),
        warehouseLocation: formWarehouseLocation.trim(),
      });
    }

    setIsAddModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers =
      'SKU,Name,Brand,Category,PackSize,TradePrice,RetailPrice,CartonStock,PiecesStock,BatchLot,ExpiryDate,SupplierScheme,TaxSchedule\n';
    const rows = products
      .map((p, idx) => {
        const batch = getBatchInfo(p, idx);
        const scheme = getSupplierScheme(p, idx);
        return `"${p.sku}","${p.name}","${p.brand}","${p.category}",${p.packSize},${p.tradePrice},${p.retailPrice},${p.cartonStock},${p.piecesStock},"${batch.batchLot}","${batch.expiryDisplay}","${scheme}","${p.taxSchedule || ''}"`;
      })
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OmniSales_SKU_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Open Product 360 Popup Modal
  const openProduct360Modal = (product: Product) => {
    setSelectedProduct360(product);
    setIsProduct360ModalOpen(true);
  };

  return (
    <div className="space-y-5 w-full">
      {/* ========================================================================= */}
      {/* 1. STOCK VALUATION KPI HEADER (At Top of Product Matrix)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock Valuation (by TP / Cost) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Stock Valuation (TP)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white tracking-tight truncate whitespace-nowrap">
              {formatNumber(valuationMetrics.totalValuationTP)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            Trade purchase cost basis across all active SKUs
          </p>
        </div>

        {/* Card 2: Total Stock Valuation (by Retail) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Stock Valuation (Retail)
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white tracking-tight truncate whitespace-nowrap">
              {formatNumber(valuationMetrics.totalValuationRetail)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            Consumer MSRP retail value in warehouse
          </p>
        </div>

        {/* Card 3: Projected Gross Distribution Margin */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Projected Gross Margin
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2 truncate">
            <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight truncate whitespace-nowrap">
              {formatNumber(valuationMetrics.projectedMargin)}
            </span>
            <span className="text-xs font-bold text-emerald-400/90 font-mono shrink-0 whitespace-nowrap">
              ({valuationMetrics.marginPercent.toFixed(1)}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            Total Retail Value − Total TP Cost
          </p>
        </div>

        {/* Card 4: Total Available Physical Cartons */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Physical Cartons
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white tracking-tight truncate whitespace-nowrap">
              {formatNumber(valuationMetrics.totalPhysicalCartons)} Ctn
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
            {valuationMetrics.totalPhysicalPieces > 0
              ? `+ ${valuationMetrics.totalPhysicalPieces} loose pcs in warehouse`
              : `On-hand stock across ${products.length} SKUs`}
          </p>
        </div>
      </div>

      {/* Top SKU Registry Command Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <span>Primary Operating Unit</span>
              <span>/</span>
              <span className="text-slate-500">Master Product Catalog (SKU Matrix)</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Master Product Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              100% full-width dual-UOM Carton and Piece inventory with live stock valuation and FEFO batch intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Master Catalog as CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New SKU</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search, Brand Filter, and Table Controls Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-100">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Scan Barcode (EAN-13), SKU Code, Batch Lot, or Product Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  Brand: {b}
                </option>
              ))}
            </select>
          </div>

          {/* Table Controls: Compact Density & Columns Dropdown */}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            {/* Compact Density Toggle */}
            <button
              onClick={toggleCompactDensity}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isCompactDensity
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Toggle Compact Density View"
            >
              {isCompactDensity ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Standard View</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Compact Density</span>
                </>
              )}
            </button>

            {/* Columns Dropdown */}
            <div className="relative" ref={columnDropdownRef}>
              <button
                onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Toggle Table Columns"
              >
                <Columns className="w-3.5 h-3.5 text-slate-600" />
                <span>Columns ▾</span>
              </button>

              {/* Columns Dropdown Menu (Guaranteed No Left/Right Clipping) */}
              {isColumnDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-slate-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Display Columns
                    </span>
                    <button
                      onClick={() => {
                        const reset: Record<string, boolean> = {};
                        ALL_COLUMNS.forEach((c) => (reset[c.key] = true));
                        setVisibleColumns(reset);
                      }}
                      className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {ALL_COLUMNS.map((col) => {
                      const isChecked = visibleColumns[col.key] !== false;
                      const isRequired = col.required;
                      return (
                        <label
                          key={col.key}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            isRequired
                              ? 'opacity-80 cursor-not-allowed bg-slate-800/40 text-slate-400'
                              : 'hover:bg-slate-800 cursor-pointer text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isRequired}
                              onChange={() => toggleColumnVisibility(col.key)}
                              className="rounded border-slate-600 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="truncate">{col.label}</span>
                          </div>
                          {isRequired && (
                            <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">
                              Locked
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 100% FULL-WIDTH TABLE LAYOUT (SKU Repository Grid)                     */}
      {/* ========================================================================= */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Sub-header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              SKU Repository Grid ({filteredAndSortedProducts.length} Items)
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 text-[11px]">
              Click any row to open full <strong>Product 360° Inspector</strong>
            </span>
          </div>
          <span className="text-slate-500 text-[11px] font-mono">
            Total Units = (Cartons * PackSize) + Pieces
          </span>
        </div>

        {/* Scrollable Container with Resizable Columns */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 select-none">
                {/* 1. SKU / Code */}
                {visibleColumns.sku && (
                  <th
                    style={{ width: `${columnWidths.sku}px`, minWidth: '60px' }}
                    className="p-3 relative group"
                  >
                    <div
                      onClick={() => handleSort('sku')}
                      className="flex items-center gap-1 cursor-pointer hover:text-amber-700"
                    >
                      <span className="truncate">SKU / Code</span>
                      {sortField === 'sku' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    {/* Drag Handle */}
                    <div
                      onMouseDown={(e) => handleResizeStart('sku', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 2. Product & Brand */}
                {visibleColumns.name && (
                  <th
                    style={{ width: `${columnWidths.name}px`, minWidth: '140px' }}
                    className="p-3 relative group"
                  >
                    <div
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 cursor-pointer hover:text-amber-700"
                    >
                      <span className="truncate">Product &amp; Brand</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('name', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 3. Pack Size */}
                {visibleColumns.packSize && (
                  <th
                    style={{ width: `${columnWidths.packSize}px`, minWidth: '80px' }}
                    className="p-3 relative group"
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate">Pack Size</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('packSize', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 4. Stock on Hand */}
                {visibleColumns.stock && (
                  <th
                    style={{ width: `${columnWidths.stock}px`, minWidth: '100px' }}
                    className="p-3 text-right relative group"
                  >
                    <div
                      onClick={() => handleSort('stock')}
                      className="flex items-center justify-end gap-1 cursor-pointer hover:text-amber-700"
                    >
                      <span className="truncate">Stock on Hand</span>
                      {sortField === 'stock' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('stock', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 5. Batches (FEFO) */}
                {visibleColumns.batch && (
                  <th
                    style={{ width: `${columnWidths.batch}px`, minWidth: '110px' }}
                    className="p-3 relative group"
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate">Batches (FEFO)</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('batch', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 6. Carton TP */}
                {visibleColumns.cartonTp && (
                  <th
                    style={{ width: `${columnWidths.cartonTp}px`, minWidth: '85px' }}
                    className="p-3 text-right relative group"
                  >
                    <div
                      onClick={() => handleSort('tp')}
                      className="flex items-center justify-end gap-1 cursor-pointer hover:text-amber-700"
                    >
                      <span className="truncate">Carton TP</span>
                      {sortField === 'tp' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('cartonTp', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 7. Unit Rate */}
                {visibleColumns.unitRate && (
                  <th
                    style={{ width: `${columnWidths.unitRate}px`, minWidth: '80px' }}
                    className="p-3 text-right relative group"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span className="truncate">Unit Rate</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('unitRate', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 8. Retail Price */}
                {visibleColumns.retailPrice && (
                  <th
                    style={{ width: `${columnWidths.retailPrice}px`, minWidth: '85px' }}
                    className="p-3 text-right relative group"
                  >
                    <div
                      onClick={() => handleSort('retail')}
                      className="flex items-center justify-end gap-1 cursor-pointer hover:text-amber-700"
                    >
                      <span className="truncate">Retail Price</span>
                      {sortField === 'retail' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('retailPrice', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 9. Profit Margin */}
                {visibleColumns.profitMargin && (
                  <th
                    style={{ width: `${columnWidths.profitMargin}px`, minWidth: '95px' }}
                    className="p-3 text-right relative group"
                  >
                    <div
                      onClick={() => handleSort('margin')}
                      className="flex items-center justify-end gap-1 cursor-pointer hover:text-amber-700"
                    >
                      <span className="truncate">Profit Margin</span>
                      {sortField === 'margin' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('profitMargin', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 10. Supplier Scheme / Discount */}
                {visibleColumns.supplierScheme && (
                  <th
                    style={{ width: `${columnWidths.supplierScheme}px`, minWidth: '95px' }}
                    className="p-3 text-center relative group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate">Supplier Scheme</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart('supplierScheme', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-300 hover:border-amber-500"
                    />
                  </th>
                )}

                {/* 11. Actions */}
                {visibleColumns.actions && (
                  <th
                    style={{ width: `${columnWidths.actions}px`, minWidth: '80px' }}
                    className="p-3 text-center"
                  >
                    <span className="truncate">Actions</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedProducts.map((p, index) => {
                const skuCode = getCleanSkuCode(p, index);
                const packMultiplier = p.packSize || 1;
                const totalUnits = p.cartonStock * packMultiplier + (p.piecesStock || 0);
                const unitRate = p.tradePrice / packMultiplier;
                const isLowStock = p.cartonStock <= p.minStockAlert;
                const batch = getBatchInfo(p, index);
                const scheme = getSupplierScheme(p, index);
                const marginValue = p.retailPrice - p.tradePrice;
                const marginPct = p.retailPrice > 0 ? (marginValue / p.retailPrice) * 100 : 0;

                const pyClass = isCompactDensity ? 'py-1.5 px-3' : 'py-3 px-3';

                return (
                  <tr
                    key={p.id}
                    onClick={() => openProduct360Modal(p)}
                    className="hover:bg-amber-50/60 cursor-pointer transition-colors group"
                  >
                    {/* 1. SKU / Code */}
                    {visibleColumns.sku && (
                      <td className={`${pyClass} whitespace-nowrap`}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                            {skuCode}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* 2. Product & Brand */}
                    {visibleColumns.name && (
                      <td className={pyClass}>
                        <div className="font-bold text-slate-900 leading-snug group-hover:text-amber-800 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-medium text-slate-700">{p.brand}</span>
                          <span>•</span>
                          <span className="text-amber-700">{p.category}</span>
                        </div>
                      </td>
                    )}

                    {/* 3. Pack Size */}
                    {visibleColumns.packSize && (
                      <td className={`${pyClass} whitespace-nowrap font-mono text-slate-700`}>
                        1 Ctn = <strong>{p.packSize}</strong> Pcs
                      </td>
                    )}

                    {/* 4. Stock on Hand */}
                    {visibleColumns.stock && (
                      <td className={`${pyClass} text-right whitespace-nowrap font-mono`}>
                        <div
                          className={`font-bold ${
                            isLowStock ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {p.cartonStock} Ctn{' '}
                          <span className="text-slate-500 font-normal">
                            ({totalUnits} Pcs)
                          </span>
                        </div>
                        {isLowStock && (
                          <span className="inline-block text-[9px] font-bold text-rose-600 uppercase bg-rose-50 px-1 rounded border border-rose-200">
                            Low Buffer
                          </span>
                        )}
                      </td>
                    )}

                    {/* 5. Batches (FEFO) */}
                    {visibleColumns.batch && (
                      <td className={`${pyClass} whitespace-nowrap`}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {batch.batchLot}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              batch.isExpired
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : batch.isNearExpiry
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {batch.expiryDisplay}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* 6. Carton TP */}
                    {visibleColumns.cartonTp && (
                      <td className={`${pyClass} text-right font-mono font-bold text-slate-900 whitespace-nowrap`}>
                        {formatNumber(p.tradePrice)}
                      </td>
                    )}

                    {/* 7. Unit Rate */}
                    {visibleColumns.unitRate && (
                      <td className={`${pyClass} text-right font-mono text-slate-600 whitespace-nowrap`}>
                        {formatNumber(unitRate, 1)}
                      </td>
                    )}

                    {/* 8. Retail Price */}
                    {visibleColumns.retailPrice && (
                      <td className={`${pyClass} text-right font-mono font-bold text-slate-900 whitespace-nowrap`}>
                        {formatNumber(p.retailPrice)}
                      </td>
                    )}

                    {/* 9. Profit Margin */}
                    {visibleColumns.profitMargin && (
                      <td className={`${pyClass} text-right font-mono whitespace-nowrap`}>
                        <span className="font-bold text-emerald-700">
                          {formatNumber(marginValue)}
                        </span>{' '}
                        <span className="text-[11px] text-emerald-600">
                          ({marginPct.toFixed(1)}%)
                        </span>
                      </td>
                    )}

                    {/* 10. Supplier Scheme / Discount */}
                    {visibleColumns.supplierScheme && (
                      <td className={`${pyClass} text-center whitespace-nowrap`}>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            scheme === 'Nil'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {scheme}
                        </span>
                      </td>
                    )}

                    {/* 11. Actions */}
                    {visibleColumns.actions && (
                      <td className={`${pyClass} text-center whitespace-nowrap`}>
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openProduct360Modal(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                            title="Inspect Product 360"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-600 hover:text-amber-800 cursor-pointer transition-colors"
                            title="Edit SKU"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
                            title="Delete SKU"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredAndSortedProducts.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="text-slate-900 font-bold text-sm">No Products Found</div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchQuery || selectedCategory !== 'All' || selectedBrand !== 'All'
                          ? 'No products match the selected filters or search keywords. Try adjusting your query.'
                          : 'Your master product catalog is ready for real items. Click below to add your first SKU.'}
                      </p>
                      <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add Product / SKU</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DEDICATED POPUP MODAL FOR PRODUCT 360° INSPECTOR                        */}
      {/* ========================================================================= */}
      {isProduct360ModalOpen && selectedProduct360 && (
        <div
          onClick={() => setIsProduct360ModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 my-8 space-y-5 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                    SKU #{selectedProduct360.sku}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {selectedProduct360.brand}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-amber-400 font-semibold">
                    {selectedProduct360.category}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white">
                  {selectedProduct360.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openEditModal(selectedProduct360);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Product</span>
                </button>
                <button
                  onClick={() => {
                    setProductToDelete(selectedProduct360);
                  }}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setIsProduct360ModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-2 border border-slate-700"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1. Full Product Specifications */}
            <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Full Product Specifications
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    SKU Code
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedProduct360.sku}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    EAN-13 Barcode
                  </span>
                  <span className="font-mono font-bold text-slate-300 text-sm">
                    {selectedProduct360.barcode || '8964000105210'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Category Channel
                  </span>
                  <span className="font-semibold text-amber-400 text-sm">
                    {selectedProduct360.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    FBR Tax Classification
                  </span>
                  <span className="font-semibold text-slate-200 text-sm">
                    {selectedProduct360.taxSchedule || '3rd Sch (MRP)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Complete Multi-Tier Pricing Matrix */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Complete Multi-Tier Pricing Matrix
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {/* Carton TP */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Carton TP
                  </span>
                  <span className="font-mono font-bold text-white text-base block mt-0.5 whitespace-nowrap">
                    {formatNumber(selectedProduct360.tradePrice)}
                  </span>
                  <span className="text-[10px] text-slate-400">Trade Cost</span>
                </div>

                {/* Unit Piece Rate */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Unit Piece Rate
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-base block mt-0.5 whitespace-nowrap">
                    {formatNumber(
                      selectedProduct360.tradePrice / (selectedProduct360.packSize || 1),
                      1
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">Cost / Piece</span>
                </div>

                {/* Retail MSRP */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Retail MSRP
                  </span>
                  <span className="font-mono font-bold text-sky-400 text-base block mt-0.5 whitespace-nowrap">
                    {formatNumber(selectedProduct360.retailPrice)}
                  </span>
                  <span className="text-[10px] text-slate-400">Selling Price</span>
                </div>

                {/* Pack Multiplier */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Pack Multiplier
                  </span>
                  <span className="font-mono font-bold text-white text-base block mt-0.5 whitespace-nowrap">
                    {selectedProduct360.packSize} Pcs
                  </span>
                  <span className="text-[10px] text-slate-400">Units / Carton</span>
                </div>

                {/* Profit Margin */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Gross Margin
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-base block mt-0.5 whitespace-nowrap">
                    {formatNumber(
                      selectedProduct360.retailPrice - selectedProduct360.tradePrice
                    )}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {selectedProduct360.retailPrice > 0
                      ? `${(
                          ((selectedProduct360.retailPrice - selectedProduct360.tradePrice) /
                            selectedProduct360.retailPrice) *
                          100
                        ).toFixed(1)}% Spread`
                      : '0% Spread'}
                  </span>
                </div>

                {/* Supplier Scheme */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Trade Scheme
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-base block mt-0.5 whitespace-nowrap">
                    {selectedProduct360.supplierScheme || '5%'}
                  </span>
                  <span className="text-[10px] text-slate-400">Distributor Margin</span>
                </div>
              </div>
            </div>

            {/* 3. Batch & Expiry Timeline (FEFO) */}
            {(() => {
              const batch = getBatchInfo(selectedProduct360, 0);
              const progressPct = Math.max(10, Math.min(100, Math.round((batch.daysRemaining / 365) * 100)));
              return (
                <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Batch &amp; Expiry Timeline (FEFO Priority)
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        batch.isExpired
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : batch.isNearExpiry
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {batch.isExpired
                        ? 'EXPIRED LOT'
                        : batch.isNearExpiry
                        ? 'NEAR EXPIRY WARNING'
                        : 'HEALTHY LOT (OPTIMAL FEFO)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                      <span className="text-slate-400 block text-[10px] uppercase">Active FEFO Batch</span>
                      <span className="font-mono font-bold text-white text-sm">{batch.batchLot}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                      <span className="text-slate-400 block text-[10px] uppercase">Expiry Milestone</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">{batch.expiryDisplay}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                      <span className="text-slate-400 block text-[10px] uppercase">Shelf-Life Remaining</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {batch.daysRemaining > 0 ? `${batch.daysRemaining} Days` : 'Expired'}
                      </span>
                    </div>
                  </div>

                  {/* Visual Timeline Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Production Lot</span>
                      <span>{batch.daysRemaining} days remaining ({progressPct}% shelf life)</span>
                      <span>Expiry Date</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                      <div
                        className={`h-full rounded-full transition-all ${
                          batch.isExpired
                            ? 'bg-rose-500'
                            : batch.isNearExpiry
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Warehouse Stock Location & Safety Alert Thresholds */}
            <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-amber-400" />
                  Warehouse Stock Location &amp; Buffer Thresholds
                </span>
                <span className="font-mono text-slate-300 text-xs">
                  {selectedProduct360.warehouseLocation || 'Mingora Central - Bay 4A'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Physical Cartons</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedProduct360.cartonStock} Ctn
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Loose Pieces</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {selectedProduct360.piecesStock || 0} Pcs
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Total Units</span>
                  <span className="font-mono font-bold text-sky-400 text-sm">
                    {selectedProduct360.cartonStock * selectedProduct360.packSize +
                      (selectedProduct360.piecesStock || 0)}{' '}
                    Pcs
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Safety Alert Threshold</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {selectedProduct360.minStockAlert} Ctn
                  </span>
                </div>
              </div>

              {/* Warehouse Buffer Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Stock Buffer Status</span>
                  <span>
                    {selectedProduct360.cartonStock <= selectedProduct360.minStockAlert
                      ? '⚠️ Below Minimum Safety Buffer'
                      : '✅ Healthy Inventory Buffer'}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedProduct360.cartonStock <= selectedProduct360.minStockAlert
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selectedProduct360.cartonStock /
                            Math.max(selectedProduct360.minStockAlert * 3, 100)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Esc</kbd> to close modal
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProduct360ModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(selectedProduct360);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit SKU</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADD / EDIT SKU MODAL                                                   */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Product Master
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editingProduct ? 'Edit Master SKU' : 'Add New FMCG SKU'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">EAN-13 Barcode</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="8964000105210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Softo Slim 50 x 2 Ply"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Brand Principal</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Zams Group"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="Cooking Oil & Ghee">Cooking Oil &amp; Ghee</option>
                    <option value="Tea & Confectionery">Tea &amp; Confectionery</option>
                    <option value="Beverages & Dairy">Beverages &amp; Dairy</option>
                    <option value="Personal & Home Care">Personal &amp; Home Care</option>
                    <option value="Spices & Recipe Mixes">Spices &amp; Recipe Mixes</option>
                    <option value="General FMCG">General FMCG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Pack Size (Pcs/Ctn)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formPackSize}
                    onChange={(e) => setFormPackSize(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Carton TP (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formTradePrice}
                    onChange={(e) => setFormTradePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Retail MSRP</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Carton Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formCartonStock}
                    onChange={(e) => setFormCartonStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Loose Pieces</label>
                  <input
                    type="number"
                    min="0"
                    value={formPiecesStock}
                    onChange={(e) => setFormPiecesStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Min Buffer Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Batch Number (FEFO)</label>
                  <input
                    type="text"
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    placeholder="e.g. B-104"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Expiry Date / Tag</label>
                  <input
                    type="text"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    placeholder="e.g. Nov 2026 or 2026-11-30"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Supplier Scheme</label>
                  <input
                    type="text"
                    value={formSupplierScheme}
                    onChange={(e) => setFormSupplierScheme(e.target.value)}
                    placeholder="e.g. 5% or Nil"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Warehouse Location</label>
                  <input
                    type="text"
                    value={formWarehouseLocation}
                    onChange={(e) => setFormWarehouseLocation(e.target.value)}
                    placeholder="e.g. Mingora Central - Bay 4A"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tax Schedule (FBR)</label>
                <select
                  value={formTaxSchedule}
                  onChange={(e) => setFormTaxSchedule(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                >
                  <option value="3rd Sch (MRP)">3rd Schedule (MRP Taxed)</option>
                  <option value="18% GST (FBR)">Standard 18% Sales Tax (GST)</option>
                  <option value="Zero-Rated / Exempt">Zero-Rated / Exempt</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow cursor-pointer transition-colors"
                >
                  {editingProduct ? 'Save Changes' : 'Commit SKU to IndexedDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ACCIDENTAL DELETE PROTECTION MODAL DIALOG                              */}
      {/* ========================================================================= */}
      {productToDelete && (
        <div
          onClick={() => setProductToDelete(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">
                  Confirm Deletion
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete &apos;{productToDelete.name}&apos; (SKU: {productToDelete.sku})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Brand / Company:</span>
                <span className="font-semibold text-slate-900">{productToDelete.brand}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Warehouse Stock:</span>
                <span className="font-semibold text-slate-900">
                  {productToDelete.cartonStock} Ctns ({productToDelete.packSize} pcs/ctn)
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Trade Price:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatNumber(productToDelete.tradePrice)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={async () => {
                  if (!productToDelete) return;
                  setIsDeletingProduct(true);
                  try {
                    await onDeleteProduct(productToDelete.id);
                    if (selectedProduct360?.id === productToDelete.id) {
                      setIsProduct360ModalOpen(false);
                      setSelectedProduct360(null);
                    }
                  } finally {
                    setIsDeletingProduct(false);
                    setProductToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProduct ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

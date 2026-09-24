import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Product } from '../../types';
import { formatPKR } from '../../utils/calculations';

interface DesktopProductCatalogProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}

export const DesktopProductCatalog: React.FC<DesktopProductCatalogProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [activeSelectedProductId, setActiveSelectedProductId] = useState<string>(
    products[0]?.id || ''
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set), 'Low Stock Alert'];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
        (p.barcode && p.barcode.includes(q));

      return matchesCat && matchesBrand && matchesSearch;
    });
  }, [products, selectedCategory, selectedBrand, searchQuery]);

  const activeProduct = products.find((p) => p.id === activeSelectedProductId) || products[0];

  // Add/Edit Form State
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

  const openAddModal = () => {
    setFormSku(`SKU-${Date.now().toString().slice(-4)}`);
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
      });
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
      });
    }

    setIsAddModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = 'SKU,Name,Brand,Category,PackSize,TradePrice,RetailPrice,CartonStock,PiecesStock,TaxSchedule\n';
    const rows = products
      .map(
        (p) =>
          `"${p.sku}","${p.name}","${p.brand}","${p.category}",${p.packSize},${p.tradePrice},${p.retailPrice},${p.cartonStock},${p.piecesStock},"${p.taxSchedule}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OmniSales_Catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* Top SKU Registry Command Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <span>Primary Operating Unit</span>
              <span>/</span>
              <span className="text-slate-500">Master Catalog &amp; SKU Matrix</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Master Product Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dual-UOM Carton and Piece inventory with FBR sales tax calculation rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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

        {/* Search & Brand Filter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 border-t border-slate-100">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Scan Barcode (EAN-13), SKU Code, or Product Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
            />
          </div>

          <div className="md:col-span-4">
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
        </div>
      </div>

      {/* Split Workspace: SKU Data Grid (Left 8 cols) + 360 Deep Inspector (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left SKU Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              SKU Repository Grid ({filteredProducts.length} Items)
            </span>
            <span className="text-slate-500 text-[11px] font-mono">
              Total Units = (Cartons * PackSize) + Pieces
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3 whitespace-nowrap">SKU / Barcode</th>
                  <th className="p-3 whitespace-nowrap min-w-[200px]">Product &amp; Brand</th>
                  <th className="p-3 whitespace-nowrap">Pack Size</th>
                  <th className="p-3 text-right whitespace-nowrap">Stock On Hand</th>
                  <th className="p-3 text-right whitespace-nowrap">Carton TP</th>
                  <th className="p-3 text-right whitespace-nowrap">Unit Rate</th>
                  <th className="p-3 text-right whitespace-nowrap">Retail MSRP</th>
                  <th className="p-3 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isSelected = activeProduct?.id === p.id;
                  const unitRate = p.tradePrice / p.packSize;
                  const isLowStock = p.cartonStock <= p.minStockAlert;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setActiveSelectedProductId(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/80 border-l-4 border-amber-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{p.sku}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.barcode || 'N/A'}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.brand} • <span className="text-amber-700">{p.category}</span>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap font-mono text-slate-700">
                        1 Ctn = <strong>{p.packSize}</strong> Pcs
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div
                          className={`font-mono font-bold text-sm ${
                            isLowStock ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {p.cartonStock} Ctn
                          {p.piecesStock > 0 && <span className="text-xs font-normal"> + {p.piecesStock}p</span>}
                        </div>
                        {isLowStock && (
                          <span className="text-[9px] font-bold text-rose-600 uppercase bg-rose-50 px-1 rounded">
                            Low Buffer
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatPKR(p.tradePrice)}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatPKR(unitRate)}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-900 whitespace-nowrap">
                        {formatPKR(p.retailPrice)}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(p);
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                            title="Edit SKU"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(p);
                            }}
                            className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
                            title="Delete SKU"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                          <Package className="w-6 h-6" />
                        </div>
                        <div className="text-slate-900 font-bold text-sm">No Products Found</div>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Your master product catalog is ready for real items. Click below to add your first SKU.
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

        {/* Right Product 360 Deep Inspector Drawer */}
        {activeProduct ? (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Product 360° Inspector
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(activeProduct)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setProductToDelete(activeProduct)}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Delete Product"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Product Card Details */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    {activeProduct.sku}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-1 leading-snug">
                    {activeProduct.name}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {activeProduct.brand} • {activeProduct.category}
                  </div>
                </div>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                EAN: {activeProduct.barcode || '8964000105210'} • Tax: {activeProduct.taxSchedule}
              </div>
            </div>

            {/* Multi-Tier Pricing Matrix */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Trade &amp; Retail Pricing
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Trade Price (Ctn)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatPKR(activeProduct.tradePrice)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Unit Piece Rate
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatPKR(activeProduct.tradePrice / activeProduct.packSize)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Retail MSRP / Unit
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatPKR(activeProduct.retailPrice)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Pack Multiplier
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeProduct.packSize} Units/Ctn
                  </span>
                </div>
              </div>
            </div>

            {/* Depot Buffer Calibration */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-700 uppercase">Warehouse Stock</span>
                <span className="font-mono text-slate-900">
                  {activeProduct.cartonStock} Ctns ({activeProduct.cartonStock * activeProduct.packSize + activeProduct.piecesStock} Units)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    activeProduct.cartonStock <= activeProduct.minStockAlert
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((activeProduct.cartonStock / 200) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Safety Alert: {activeProduct.minStockAlert} Ctns</span>
                <span>Depot: Mingora Central</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">No Product Selected</div>
            <p className="text-xs text-slate-500 max-w-xs">
              Select an item from your catalog or click below to onboard a new FMCG/Pharma product.
            </p>
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product / SKU</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit SKU Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">EAN-13 Barcode</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Loose Pieces Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formPiecesStock}
                    onChange={(e) => setFormPiecesStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Min Buffer Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
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

      {/* Accidental Delete Protection Modal Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
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
                  {formatPKR(productToDelete.tradePrice)}
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

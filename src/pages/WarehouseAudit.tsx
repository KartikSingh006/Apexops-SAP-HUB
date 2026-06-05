import React, { useState, useCallback } from 'react';
import {
  ScanBarcode,
  Plus,
  Minus,
  Package,
  MapPin,
  Hash,
  Layers,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Search,
  X,
  Boxes,
  Truck,
  ClipboardCheck,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';
import type { SAPMaterial } from '@/context/SapContext';

interface ScanHistoryEntry {
  materialId: string;
  oldStock: number;
  newStock: number;
  timestamp: Date;
}

type SortField = 'materialId' | 'description' | 'plantId' | 'storageLocation' | 'materialType' | 'stockQuantity' | 'reorderPoint';
type SortDirection = 'asc' | 'desc';

const WarehouseAudit: React.FC = () => {
  const { materials, updateStock } = useSap();

  const [scannedMaterial, setScannedMaterial] = useState<SAPMaterial | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [filterPlant, setFilterPlant] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('materialId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [historyExpanded, setHistoryExpanded] = useState<boolean>(true);

  // Extract unique plants for filter dropdown
  const uniquePlants = Array.from(new Set(materials.map((m) => m.plantId))).sort();

  // Handle barcode scan simulation
  const handleScan = useCallback(() => {
    if (isScanning || materials.length === 0) return;
    setIsScanning(true);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * materials.length);
      const material = materials[randomIndex];
      setScannedMaterial(material);
      setAdjustmentQuantity(material.stockQuantity);
      setIsScanning(false);
    }, 800);
  }, [isScanning, materials]);

  // Stock adjustment handlers
  const incrementQuantity = useCallback(() => {
    setAdjustmentQuantity((prev) => prev + 1);
  }, []);

  const decrementQuantity = useCallback(() => {
    setAdjustmentQuantity((prev) => Math.max(0, prev - 1));
  }, []);

  const applyQuickAdjustment = useCallback((delta: number) => {
    setAdjustmentQuantity((prev) => Math.max(0, prev + delta));
  }, []);

  // Confirm stock adjustment
  const confirmAdjustment = useCallback(() => {
    if (!scannedMaterial) return;

    const oldStock = scannedMaterial.stockQuantity;
    updateStock(scannedMaterial.materialId, adjustmentQuantity);

    setScanHistory((prev) => [
      {
        materialId: scannedMaterial.materialId,
        oldStock,
        newStock: adjustmentQuantity,
        timestamp: new Date(),
      },
      ...prev,
    ]);

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setScannedMaterial(null);
      setAdjustmentQuantity(0);
    }, 1200);
  }, [scannedMaterial, adjustmentQuantity, updateStock]);

  // Select a row from inventory table
  const selectMaterial = useCallback((material: SAPMaterial) => {
    setScannedMaterial(material);
    setAdjustmentQuantity(material.stockQuantity);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sort handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  // Get stock status
  const getStockStatus = (stock: number, reorderPoint: number) => {
    if (stock < reorderPoint) return 'critical';
    if (stock <= reorderPoint * 1.2) return 'warning';
    return 'healthy';
  };

  // Filter and sort materials
  const filteredMaterials = materials
    .filter((m) => {
      const matchesPlant = filterPlant === '' || m.plantId === filterPlant;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === '' ||
        m.materialId.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query);
      return matchesPlant && matchesSearch;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier;
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });

  // Format time for history
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="page-container max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/20">
            <Boxes className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Warehouse Audit</h1>
            <p className="text-sm text-slate-500">Material scanning & stock reconciliation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-badge-info">
            <Package className="w-3.5 h-3.5" />
            {materials.length} Materials
          </span>
          <span className="status-badge-success">
            <ClipboardCheck className="w-3.5 h-3.5" />
            {scanHistory.length} Audited
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Scanner */}
        <div className="space-y-6">
          {/* Scan Barcode Section */}
          <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Scanner Viewport */}
            <div
              className={`relative w-48 h-48 rounded-2xl border-2 border-slate-200 mb-6 flex items-center justify-center ${
                isScanning ? 'scanner-overlay' : ''
              }`}
              style={{
                background: '#f8fafc',
              }}
            >
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl-md" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br-md" />

              {isScanning ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                  <span className="text-xs text-emerald-600 font-mono tracking-widest uppercase">
                    Scanning...
                  </span>
                </div>
              ) : (
                <ScanBarcode
                  className="w-16 h-16 text-emerald-600 animate-pulse"
                  strokeWidth={1.5}
                />
              )}

              {/* Scan line animation when scanning */}
              {isScanning && (
                <div
                  className="absolute left-2 right-2 h-0.5 bg-emerald-500 animate-scan-line"
                  style={{
                    boxShadow: '0 0 8px #10b981, 0 0 20px rgba(16, 185, 129, 0.4)',
                  }}
                />
              )}
            </div>

            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {isScanning ? 'Scanning Barcode...' : 'Ready to Scan'}
            </h2>
            <p className="text-sm text-slate-500 mb-5 max-w-xs">
              Position barcode within the scanning viewport and tap to begin material identification.
            </p>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className="btn-neon flex items-center gap-2 px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ScanBarcode className="w-5 h-5" />
              {isScanning ? 'Scanning...' : 'Scan Barcode'}
            </button>
          </div>

          {/* Scanned Material Detail Card */}
          {scannedMaterial && !showSuccess && (
            <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Material Details
                </h3>
                <button
                  onClick={() => {
                    setScannedMaterial(null);
                    setAdjustmentQuantity(0);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Material ID prominently */}
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Hash className="w-5 h-5 text-sap-600" />
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Material ID</span>
                  <p className="text-lg font-mono font-bold text-slate-900 tracking-wide">
                    {scannedMaterial.materialId}
                  </p>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <DetailItem
                  icon={<Package className="w-4 h-4" />}
                  label="Description"
                  value={scannedMaterial.description}
                  span2
                />
                <DetailItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Plant"
                  value={scannedMaterial.plantId}
                />
                <DetailItem
                  icon={<Layers className="w-4 h-4" />}
                  label="Storage Location"
                  value={scannedMaterial.storageLocation}
                />
                <DetailItem
                  icon={<Boxes className="w-4 h-4" />}
                  label="Material Type"
                  value={scannedMaterial.materialType}
                />
                <DetailItem
                  icon={<Truck className="w-4 h-4" />}
                  label="Batch Number"
                  value={scannedMaterial.batchNumber || 'N/A'}
                />
                <DetailItem
                  icon={<Hash className="w-4 h-4" />}
                  label="Base Unit"
                  value={scannedMaterial.baseUnit}
                />
              </div>

              {/* Stock vs Reorder Point comparison bar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    Stock vs Reorder Point
                  </span>
                  {scannedMaterial.stockQuantity < scannedMaterial.reorderPoint && (
                    <span className="status-badge-danger">
                      <AlertTriangle className="w-3 h-3" />
                      Below Reorder
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">
                        Current: <span className="font-bold text-slate-900">{scannedMaterial.stockQuantity}</span>
                      </span>
                      <span className="text-slate-500">
                        Reorder: <span className="font-semibold text-orange-600">{scannedMaterial.reorderPoint}</span>
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
                      {/* Reorder point marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10"
                        style={{
                          left: `${Math.min(
                            (scannedMaterial.reorderPoint /
                              Math.max(scannedMaterial.stockQuantity, scannedMaterial.reorderPoint, 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                      {/* Stock bar */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ${
                          scannedMaterial.stockQuantity < scannedMaterial.reorderPoint
                            ? 'bg-gradient-to-r from-red-500 to-orange-500'
                            : scannedMaterial.stockQuantity <= scannedMaterial.reorderPoint * 1.2
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                            : 'bg-gradient-to-r from-emerald-500 to-sap-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            (scannedMaterial.stockQuantity /
                              Math.max(scannedMaterial.stockQuantity, scannedMaterial.reorderPoint, 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Flash */}
          {showSuccess && (
            <div className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center animate-slide-up bg-white border border-slate-200 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 animate-pulse">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Stock Updated</h3>
              <p className="text-sm text-slate-500">Adjustment confirmed and synced.</p>
            </div>
          )}
        </div>

        {/* Right Column: Adjustment Console */}
        <div className="space-y-6">
          {scannedMaterial && !showSuccess && (
            <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-sap-600" />
                Stock Adjustment Console
              </h3>

              {/* Large quantity display */}
              <div className="flex items-center justify-center gap-6 mb-6">
                {/* Minus Button */}
                <button
                  onClick={decrementQuantity}
                  disabled={adjustmentQuantity <= 0}
                  className="btn-secondary h-12 w-12 flex items-center justify-center rounded-xl hover:bg-red-50 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Minus className="w-6 h-6" />
                </button>

                {/* Quantity Display */}
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
                    {adjustmentQuantity}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
                    {scannedMaterial.baseUnit}
                  </span>
                </div>

                {/* Plus Button */}
                <button
                  onClick={incrementQuantity}
                  className="btn-secondary h-12 w-12 flex items-center justify-center rounded-xl hover:bg-green-50 hover:border-green-300 transition-all"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Delta indicator */}
              {scannedMaterial && (
                <div className="text-center mb-5">
                  <span
                    className={`text-sm font-mono font-semibold ${
                      adjustmentQuantity - scannedMaterial.stockQuantity > 0
                        ? 'text-emerald-600'
                        : adjustmentQuantity - scannedMaterial.stockQuantity < 0
                        ? 'text-rose-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {adjustmentQuantity - scannedMaterial.stockQuantity >= 0 ? '+' : ''}
                    {adjustmentQuantity - scannedMaterial.stockQuantity} from current (
                    {scannedMaterial.stockQuantity})
                  </span>
                </div>
              )}

              {/* Quick adjustment buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                {[
                  { label: '-10', delta: -10 },
                  { label: '-5', delta: -5 },
                  { label: '+5', delta: 5 },
                  { label: '+10', delta: 10 },
                  { label: '+50', delta: 50 },
                  { label: '+100', delta: 100 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => applyQuickAdjustment(btn.delta)}
                    className={`py-2 px-3 rounded-lg text-sm font-mono font-semibold transition-all border ${
                      btn.delta < 0
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Confirm Button */}
              <button
                onClick={confirmAdjustment}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm Adjustment
              </button>
            </div>
          )}

          {/* Placeholder when nothing is scanned */}
          {!scannedMaterial && !showSuccess && (
            <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <ScanBarcode className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Material Selected</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Scan a barcode or select a material from the inventory table below to begin auditing.
              </p>
            </div>
          )}

          {/* Scan History Log */}
          {scanHistory.length > 0 && (
            <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <button
                onClick={() => setHistoryExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-sap-600" />
                  Scan History
                  <span className="text-xs text-slate-400 font-normal">
                    ({scanHistory.length} entries)
                  </span>
                </h3>
                <ArrowUpDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    historyExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {historyExpanded && (
                <div className="overflow-x-auto">
                  <table className="data-grid">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Material ID</th>
                        <th>Old Stock</th>
                        <th>New Stock</th>
                        <th>Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanHistory.map((entry, idx) => {
                        const delta = entry.newStock - entry.oldStock;
                        return (
                          <tr key={`${entry.materialId}-${idx}`}>
                            <td className="font-mono text-xs text-slate-600">
                              {formatTime(entry.timestamp)}
                            </td>
                            <td className="font-mono text-xs text-sap-600 font-semibold">
                              {entry.materialId}
                            </td>
                            <td className="font-mono text-xs text-slate-600">{entry.oldStock}</td>
                            <td className="font-mono text-xs text-slate-900 font-semibold">{entry.newStock}</td>
                            <td>
                              <span
                                className={`font-mono text-xs font-bold ${
                                  delta > 0
                                    ? 'text-emerald-600'
                                    : delta < 0
                                    ? 'text-rose-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {delta > 0 ? '+' : ''}
                                {delta}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table Section */}
      <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-6">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sap-600" />
            Material Inventory
          </h3>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID or description..."
                className="input-field w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Plant Filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={filterPlant}
                onChange={(e) => setFilterPlant(e.target.value)}
                className="input-field pl-8 pr-8 py-2 text-xs rounded-lg appearance-none cursor-pointer border border-slate-200 bg-slate-50 focus:bg-white"
              >
                <option value="">All Plants</option>
                {uniquePlants.map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                {([
                  { key: 'materialId', label: 'Material ID' },
                  { key: 'description', label: 'Description' },
                  { key: 'plantId', label: 'Plant' },
                  { key: 'storageLocation', label: 'SLoc' },
                  { key: 'materialType', label: 'Type' },
                  { key: 'stockQuantity', label: 'Stock' },
                  { key: 'reorderPoint', label: 'Reorder Pt' },
                ] as { key: SortField; label: string }[]).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="cursor-pointer select-none hover:text-slate-900 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      <ArrowUpDown
                        className={`w-3 h-3 transition-colors ${
                          sortField === col.key ? 'text-sap-600' : 'text-slate-400'
                        }`}
                      />
                    </span>
                  </th>
                ))}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                    No materials found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => {
                  const status = getStockStatus(material.stockQuantity, material.reorderPoint);
                  return (
                    <tr
                      key={material.materialId}
                      onClick={() => selectMaterial(material)}
                      className={`cursor-pointer ${
                        scannedMaterial?.materialId === material.materialId
                          ? 'bg-sap-50 border-l-2 border-l-sap-600'
                          : ''
                      }`}
                    >
                      <td className="font-mono text-xs text-sap-600 font-semibold">
                        {material.materialId}
                      </td>
                      <td className="text-xs text-slate-800 max-w-[200px] truncate">
                        {material.description}
                      </td>
                      <td className="text-xs text-slate-600">{material.plantId}</td>
                      <td className="text-xs text-slate-600">{material.storageLocation}</td>
                      <td className="text-xs text-slate-500">{material.materialType}</td>
                      <td className="font-mono text-xs text-slate-900 font-semibold">
                        {material.stockQuantity}
                      </td>
                      <td className="font-mono text-xs text-slate-600">{material.reorderPoint}</td>
                      <td>
                        {status === 'healthy' && (
                          <span className="status-badge-success">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </span>
                        )}
                        {status === 'warning' && (
                          <span className="status-badge-warning">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                        {status === 'critical' && (
                          <span className="status-badge-danger">
                            <AlertTriangle className="w-3 h-3" />
                            Critical
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {filteredMaterials.length} of {materials.length} materials
          </span>
          {(filterPlant || searchQuery) && (
            <button
              onClick={() => {
                setFilterPlant('');
                setSearchQuery('');
              }}
              className="text-xs text-sap-600 hover:text-sap-800 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* Detail item sub-component for material card */
interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  span2?: boolean;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value, span2 }) => (
  <div
    className={`flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/50 border border-slate-150 ${
      span2 ? 'col-span-2' : ''
    }`}
  >
    <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{label}</span>
      <span className="text-xs text-slate-800 font-medium truncate block">{value}</span>
    </div>
  </div>
);

export default WarehouseAudit;

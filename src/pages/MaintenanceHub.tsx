import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Send,
  Sparkles,
  FileText,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Tag,
  Activity,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';

// ─── Fault Code Dictionary ───────────────────────────────────────────────────

const FAULT_CODE_MAP: Record<string, { code: string; label: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }> = {
  'hydraulic': { code: 'HYD-ERR-02', label: 'Hydraulic System Failure', severity: 'HIGH' },
  'leak': { code: 'HYD-ERR-01', label: 'Fluid Leak Detected', severity: 'CRITICAL' },
  'pump': { code: 'HYD-ERR-02', label: 'Pump Malfunction', severity: 'HIGH' },
  'electrical': { code: 'ELEC-FAIL-01', label: 'Electrical System Error', severity: 'HIGH' },
  'overheat': { code: 'THERM-OVR-01', label: 'Thermal Overload Alert', severity: 'CRITICAL' },
  'overheating': { code: 'THERM-OVR-01', label: 'Thermal Overload Alert', severity: 'CRITICAL' },
  'motor': { code: 'ELEC-FAIL-03', label: 'Motor Drive Failure', severity: 'HIGH' },
  'vibration': { code: 'MECH-WEAR-01', label: 'Abnormal Vibration Pattern', severity: 'MEDIUM' },
  'bearing': { code: 'MECH-WEAR-02', label: 'Bearing Degradation', severity: 'HIGH' },
  'pressure': { code: 'PNEU-LEAK-01', label: 'Pressure Anomaly', severity: 'MEDIUM' },
  'sensor': { code: 'CTRL-SYS-01', label: 'Sensor Calibration Drift', severity: 'LOW' },
  'cooling': { code: 'THERM-OVR-02', label: 'Cooling System Malfunction', severity: 'HIGH' },
  'wiring': { code: 'ELEC-FAIL-02', label: 'Wiring Harness Fault', severity: 'MEDIUM' },
  'circuit': { code: 'ELEC-FAIL-04', label: 'Circuit Board Failure', severity: 'CRITICAL' },
  'corrosion': { code: 'MECH-WEAR-01', label: 'Corrosion Damage', severity: 'MEDIUM' },
  'alignment': { code: 'MECH-WEAR-02', label: 'Misalignment Detected', severity: 'LOW' },
  'fluid': { code: 'HYD-ERR-01', label: 'Fluid System Issue', severity: 'HIGH' },
  'temperature': { code: 'THERM-OVR-01', label: 'Temperature Exceedance', severity: 'HIGH' },
  'pneumatic': { code: 'PNEU-LEAK-01', label: 'Pneumatic System Leak', severity: 'MEDIUM' },
  'control': { code: 'CTRL-SYS-01', label: 'Control System Fault', severity: 'MEDIUM' },
};

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// ─── AI Parser Engine ────────────────────────────────────────────────────────

function parseDescription(description: string): { code: string; label: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }[] {
  if (!description.trim()) return [];

  const lowerDesc = description.toLowerCase();
  const tokens = lowerDesc.split(/\s+/);
  const matched = new Map<string, { code: string; label: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }>();

  for (const [keyword, entry] of Object.entries(FAULT_CODE_MAP)) {
    const isMatch = tokens.some(token => token.includes(keyword)) || lowerDesc.includes(keyword);
    if (isMatch && !matched.has(entry.code)) {
      matched.set(entry.code, entry);
    }
  }

  const results = Array.from(matched.values());
  results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'HIGH': return 'bg-orange-50 text-orange-700 border border-orange-200';
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'LOW': return 'bg-blue-50 text-blue-700 border border-blue-200';
    default: return 'bg-slate-50 text-slate-750 border border-slate-200';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'OPEN': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'IN_PROGRESS': return 'bg-orange-50 text-orange-700 border border-orange-200';
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'CLOSED': return 'bg-slate-100 text-slate-700 border border-slate-200';
    default: return 'bg-slate-50 text-slate-600 border border-slate-200';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    case 'OPEN': return 'Open';
    case 'COMPLETED': return 'Completed';
    case 'CLOSED': return 'Closed';
    default: return status;
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'HIGH': return 'bg-red-50 text-red-700 border border-red-200';
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'LOW': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    default: return 'bg-slate-50 text-slate-600 border border-slate-200';
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

function getFaultCodeDetails(code: string) {
  const found = Object.values(FAULT_CODE_MAP).find(item => item.code === code);
  return found || { code, label: 'Unknown Fault', severity: 'LOW' as const };
}

type SortKey = 'id' | 'description' | 'location' | 'priority' | 'status' | 'type' | 'responsible' | 'cost';
type SortDir = 'asc' | 'desc';

// ─── Component ───────────────────────────────────────────────────────────────

const MaintenanceHub: React.FC = () => {
  const { workOrders, createWorkOrder, updateWorkOrderStatus } = useSap();

  // ── Form state ──────────────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [functionalLocation, setFunctionalLocation] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [orderType, setOrderType] = useState<'PM01' | 'PM02' | 'PM03'>('PM01');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
  const [parsedCodes, setParsedCodes] = useState<{ code: string; label: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Grid state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── AI Parser debounce ──────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParsedCodes(parseDescription(description));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description]);

  // ── Statistics ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter(wo => wo.status === 'OPEN').length;
    const inProgress = workOrders.filter(wo => wo.status === 'IN_PROGRESS').length;
    const completed = workOrders.filter(wo => wo.status === 'COMPLETED').length;
    return { total, open, inProgress, completed };
  }, [workOrders]);

  // ── Filtered & sorted work orders ───────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let items = [...workOrders];

    if (statusFilter !== 'ALL') {
      items = items.filter(wo => wo.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        wo =>
          wo.workOrderId.toLowerCase().includes(q) ||
          wo.description.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortKey) {
        case 'id': aVal = a.workOrderId; bVal = b.workOrderId; break;
        case 'description': aVal = a.description; bVal = b.description; break;
        case 'location': aVal = a.functionalLocation || ''; bVal = b.functionalLocation || ''; break;
        case 'priority': {
          const prio: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          aVal = prio[a.priority] ?? 9;
          bVal = prio[b.priority] ?? 9;
          break;
        }
        case 'status': {
          const sts: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, COMPLETED: 2, CLOSED: 3 };
          aVal = sts[a.status] ?? 9;
          bVal = sts[b.status] ?? 9;
          break;
        }
        case 'type': aVal = a.orderType || ''; bVal = b.orderType || ''; break;
        case 'responsible': aVal = a.responsiblePerson || ''; bVal = b.responsiblePerson || ''; break;
        case 'cost': aVal = a.estimatedCost ?? 0; bVal = b.estimatedCost ?? 0; break;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [workOrders, statusFilter, searchQuery, sortKey, sortDir]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!description.trim()) return;

      createWorkOrder({
        description: description.trim(),
        functionalLocation: functionalLocation.trim(),
        equipmentId: equipmentId.trim(),
        priority,
        orderType,
        responsiblePerson: responsiblePerson.trim(),
        estimatedCost: estimatedCost === '' ? 0 : Number(estimatedCost),
        functionalCodes: parsedCodes.map(pc => pc.code),
      });

      setDescription('');
      setFunctionalLocation('');
      setEquipmentId('');
      setPriority('MEDIUM');
      setOrderType('PM01');
      setResponsiblePerson('');
      setEstimatedCost('');
      setParsedCodes([]);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2500);
    },
    [description, functionalLocation, equipmentId, priority, orderType, responsiblePerson, estimatedCost, parsedCodes, createWorkOrder]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  const SortIcon: React.FC<{ column: SortKey }> = ({ column }) => {
    if (sortKey !== column) return <ChevronDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-sap-600" /> : <ChevronDown className="w-3 h-3 text-sap-600" />;
  };

  return (
    <div className="page-container">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-md">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Maintenance Hub</h1>
            <p className="text-xs text-slate-500">SAP PM Work Order Management</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close Form' : 'New Work Order'}
        </button>
      </div>

      {/* ── Statistics Cards ────────────────────────────────────────────── */}
      <div className="card-grid">
        <div className="metric-card bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Total WOs</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sap-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sap-600" />
            </div>
          </div>
        </div>

        <div className="metric-card bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Open</p>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="metric-card bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">In Progress</p>
              <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="metric-card bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      /* ── Create Work Order Form ──────────────────────────────────────── */
      {showForm && (
        <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl p-6 animate-slide-down">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* AI Parser Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100">
                <Brain className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-semibold text-violet-700 tracking-wide uppercase">AI Parser Engine</span>
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <span className="text-xs text-slate-500">Real-time fault code detection</span>
            </div>

            {/* Description textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-sap-500" />
                  Description
                </div>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the maintenance issue in natural language… e.g. 'Hydraulic pump is leaking fluid and overheating'"
                rows={4}
                className="input-field resize-none border border-slate-200 bg-slate-50 focus:bg-white"
              />

              {/* Parsed codes display */}
              {parsedCodes.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-205">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      Detected Fault Codes ({parsedCodes.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parsedCodes.map(pc => (
                      <span
                        key={pc.code}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${severityColor(pc.severity)}`}
                      >
                        {pc.code} — {pc.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sap-500" />
                    Functional Location
                  </div>
                </label>
                <input
                  type="text"
                  value={functionalLocation}
                  onChange={e => setFunctionalLocation(e.target.value)}
                  placeholder="e.g. PLANT-A/LINE-03/UNIT-12"
                  className="input-field border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-sap-500" />
                    Equipment ID
                  </div>
                </label>
                <input
                  type="text"
                  value={equipmentId}
                  onChange={e => setEquipmentId(e.target.value)}
                  placeholder="e.g. EQ-2024-0491"
                  className="input-field border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-sap-500" />
                    Priority
                  </div>
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                  className="input-field cursor-pointer border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-sap-500" />
                    Order Type
                  </div>
                </label>
                <select
                  value={orderType}
                  onChange={e => setOrderType(e.target.value as 'PM01' | 'PM02' | 'PM03')}
                  className="input-field cursor-pointer border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="PM01">PM01 — Corrective Maintenance</option>
                  <option value="PM02">PM02 — Preventive Maintenance</option>
                  <option value="PM03">PM03 — Condition-Based Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-sap-500" />
                    Responsible Person
                  </div>
                </label>
                <input
                  type="text"
                  value={responsiblePerson}
                  onChange={e => setResponsiblePerson(e.target.value)}
                  placeholder="e.g. John Martinez"
                  className="input-field border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-sap-500" />
                    Estimated Cost (USD)
                  </div>
                </label>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={e => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="input-field border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Send className="w-4 h-4" />
                Create Work Order
              </button>

              {submitSuccess && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Work order created successfully!</span>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Work Order Data Grid ────────────────────────────────────────── */}
      <div className="glass-panel bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        {/* Grid toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ID or description…"
              className="input-field pl-10 border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field w-auto min-w-[140px] cursor-pointer border border-slate-200 bg-slate-50 focus:bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <span className="ml-auto text-xs text-slate-500">
            {filteredOrders.length} of {workOrders.length} work orders
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                {([
                  ['id', 'WO ID'],
                  ['description', 'Description'],
                  ['location', 'Location'],
                  ['priority', 'Priority'],
                  ['status', 'Status'],
                  ['type', 'Type'],
                  ['responsible', 'Responsible'],
                  ['cost', 'Cost'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="cursor-pointer select-none hover:text-sap-600 transition-colors"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon column={key} />
                    </div>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <XCircle className="w-8 h-8 text-slate-300" />
                      <p className="text-sm text-slate-500">No work orders found</p>
                      <p className="text-xs text-slate-400">
                        {workOrders.length === 0
                           ? 'Create your first work order to get started'
                           : 'Try adjusting your search or filter criteria'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {filteredOrders.map(wo => (
                <React.Fragment key={wo.workOrderId}>
                  <tr
                    className="cursor-pointer"
                    onClick={() => toggleExpand(wo.workOrderId)}
                  >
                    <td>
                      <span className="font-mono text-xs text-sap-600 font-semibold">{wo.workOrderId}</span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-800">{truncate(wo.description, 40)}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">{wo.functionalLocation || '—'}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${priorityColor(wo.priority)}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${statusColor(wo.status)}`}>
                        {statusLabel(wo.status)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500 font-mono">{wo.orderType || '—'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-650">{wo.responsiblePerson || '—'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-650 font-mono">
                        {wo.estimatedCost != null ? `$${Number(wo.estimatedCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {wo.status === 'OPEN' && (
                          <button
                            onClick={() => updateWorkOrderStatus(wo.workOrderId, 'IN_PROGRESS')}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {wo.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => updateWorkOrderStatus(wo.workOrderId, 'COMPLETED')}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {wo.status === 'COMPLETED' && (
                          <button
                            onClick={() => updateWorkOrderStatus(wo.workOrderId, 'CLOSED')}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                          >
                            Close
                          </button>
                        )}
                        {wo.status === 'CLOSED' && (
                          <span className="text-xs text-slate-400 italic">Archived</span>
                        )}
                        <button
                          onClick={() => toggleExpand(wo.workOrderId)}
                          className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          {expandedRow === wo.workOrderId ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedRow === wo.workOrderId && (
                    <tr className="animate-slide-down">
                      <td colSpan={9} className="!p-0">
                        <div className="p-5 bg-slate-50/70 border-t border-b border-slate-150">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {/* Full description */}
                            <div className="xl:col-span-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Description</p>
                              <p className="text-sm text-slate-800 leading-relaxed">{wo.description}</p>
                            </div>

                            {/* Details column */}
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  <span className="inline-flex items-center gap-1 text-slate-500"><Tag className="w-3 h-3 text-slate-400" /> Equipment ID</span>
                                </p>
                                <p className="text-sm text-slate-800 font-mono">{wo.equipmentId || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  <span className="inline-flex items-center gap-1 text-slate-500"><MapPin className="w-3 h-3 text-slate-400" /> Location</span>
                                </p>
                                <p className="text-sm text-slate-800">{wo.functionalLocation || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  <span className="inline-flex items-center gap-1 text-slate-500"><Calendar className="w-3 h-3 text-slate-400" /> Planned Start</span>
                                </p>
                                <p className="text-sm text-slate-800">
                                  {wo.plannedStartDate
                                    ? new Date(wo.plannedStartDate).toLocaleString('en-US', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })
                                    : '—'}
                                </p>
                              </div>
                            </div>

                            {/* Functional codes */}
                            {wo.functionalCodes && wo.functionalCodes.length > 0 && (
                              <div className="xl:col-span-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                  <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-600" /> Detected Fault Codes</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {wo.functionalCodes.map((code: string) => {
                                    const details = getFaultCodeDetails(code);
                                    return (
                                      <span
                                        key={code}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${severityColor(details.severity)}`}
                                      >
                                        {details.code} — {details.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {wo.notes && (
                              <div className="xl:col-span-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-sm text-slate-650 leading-relaxed">{wo.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceHub;

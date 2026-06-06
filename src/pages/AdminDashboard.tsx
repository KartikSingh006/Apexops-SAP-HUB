import React, { useState, useMemo, FormEvent } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  Wrench,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Users,
  Zap,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';

/* ---------- COLOR PALETTES ---------- */
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#8b5cf6',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#f97316',
  DELIVERED: '#10b981',
};

const WO_STATUS_COLORS: Record<string, string> = {
  CREATED: '#3b82f6',
  'IN PROGRESS': '#f97316',
  IN_PROGRESS: '#f97316',
  COMPLETED: '#10b981',
  CLOSED: '#64748b',
};

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/* ---------- TOOLTIP ---------- */
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

const LightTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-lg border border-slate-200/80">
      <p className="text-xs text-slate-500 mb-2 font-semibold">{label}</p>
      {payload.map((entry: TooltipPayloadEntry, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-semibold text-slate-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------- HELPERS ---------- */
function formatRevenue(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function relativeTime(dateVal: string | Date): string {
  const now = Date.now();
  const then = new Date(dateVal).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function methodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'POST':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'PATCH':
    case 'PUT':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'DELETE':
      return 'bg-red-50 text-red-700 border border-red-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

function statusCodeColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-green-600';
  if (code >= 300 && code < 400) return 'text-blue-600';
  if (code >= 400 && code < 500) return 'text-orange-600';
  return 'text-red-600';
}

const MicroSparkline = ({ color }: { color: string }) => {
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 8; i++) {
      pts.push({ x: i * 12.5, y: 20 + Math.sin(i * 0.9 + 1) * 14 + Math.cos(i * 1.7) * 6 });
    }
    return pts;
  }, []);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg
      viewBox="0 0 100 40"
      className="absolute bottom-0 left-0 w-full h-8 opacity-20"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${pathD} L100,40 L0,40 Z`} fill={`url(#spark-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

const TrendIndicator = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {isPositive ? '+' : ''}{value}%
    </span>
  );
};

/* ---------- ADMIN DASHBOARD COMPONENT ---------- */
const AdminDashboard: React.FC = () => {
  const {
    materials,
    salesOrders,
    workOrders,
    metrics,
    odataLogs,
    projects,
    tickets,
    employees,
    emails,
    createProject,
    assignEmployee,
    toggleApexJoule,
    isJouleEnabledForProject,
  } = useSap();

  // Create Project states
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState('');

  // Assign Employee states
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Form handlers
  const handleCreateProjectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newClientEmail.trim()) return;
    setProjLoading(true);
    setProjError('');
    try {
      await createProject(newProjectName.trim(), newClientEmail.trim());
      setNewProjectName('');
      setNewClientEmail('');
    } catch (err: any) {
      setProjError(err?.message ?? 'Failed to establish project entry.');
    } finally {
      setProjLoading(false);
    }
  };

  const handleAssignEmployeeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignProjectId || !assignEmployeeId) return;
    setAssignError('');
    setAssignSuccess(false);
    try {
      await assignEmployee(assignProjectId, assignEmployeeId);
      setAssignProjectId('');
      setAssignEmployeeId('');
      setAssignSuccess(true);
      setTimeout(() => setAssignSuccess(false), 2500);
    } catch (err: any) {
      setAssignError(err?.message ?? 'Failed to create employee project mapping.');
    }
  };

  /* ---------- CHART DATA PREPARATION ---------- */
  const pipelineData = useMemo(() => {
    const buckets: Record<string, Record<string, number>> = {};
    salesOrders.forEach((order) => {
      const d = new Date(order.orderDate ?? Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) buckets[key] = { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0 };
      const status = (order.status ?? 'PENDING').toUpperCase();
      if (buckets[key][status] !== undefined) {
        buckets[key][status] += 1;
      }
    });
    return Object.keys(buckets)
      .sort()
      .map((key) => {
        const [, m] = key.split('-');
        return {
          month: MONTH_LABELS[parseInt(m, 10) - 1] ?? m,
          ...buckets[key],
        };
      });
  }, [salesOrders]);

  const warehouseData = useMemo(() => {
    const plantMap: Record<string, number> = {};
    materials.forEach((mat) => {
      const plant = mat.plantId ?? 'UNKNOWN';
      plantMap[plant] = (plantMap[plant] ?? 0) + (mat.stockQuantity ?? 0);
    });
    return Object.entries(plantMap)
      .map(([plant, stock]) => ({ plant, stock }))
      .sort((a, b) => b.stock - a.stock);
  }, [materials]);

  const woStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    workOrders.forEach((wo) => {
      const status = (wo.status ?? 'CREATED').toUpperCase();
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: WO_STATUS_COLORS[name] ?? '#94a3b8',
    }));
  }, [workOrders]);

  const woTotal = useMemo(() => woStatusData.reduce((sum, d) => sum + d.value, 0), [woStatusData]);
  const recentLogs = useMemo(() => [...odataLogs].reverse().slice(0, 5), [odataLogs]);
  const highPriorityCount = useMemo(() => workOrders.filter((wo) => (wo.priority ?? '').toUpperCase() === 'HIGH').length, [workOrders]);

  return (
    <div className="page-container space-y-6">
      
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold gradient-text">
            Executive Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time SAP operations overview · ApexOps Command Center
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
          <Activity className="w-4 h-4 text-green-600 animate-pulse" />
          <span className="font-mono">LIVE SYSTEMS ACTIVE</span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="card-grid">
        {/* Total Inventory Units */}
        <div className="metric-card bg-white shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sap-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-sap-600" />
            </div>
            <TrendIndicator value={12.5} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{(metrics.totalStock ?? 0).toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Total Inventory Units</p>
          <MicroSparkline color="#2563eb" />
        </div>

        {/* Active Work Orders */}
        <div className="metric-card bg-white shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
            <TrendIndicator value={-3.2} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{metrics.openWorkOrders ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Active Work Orders</p>
          <span className="inline-block mt-1.5 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
            {highPriorityCount} HIGH Priority
          </span>
          <MicroSparkline color="#ea580c" />
        </div>

        {/* Pending Sales Orders */}
        <div className="metric-card bg-white shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-violet-600" />
            </div>
            <TrendIndicator value={8.1} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{metrics.pendingOrders ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Pending Sales Orders</p>
          <MicroSparkline color="#8b5cf6" />
        </div>

        {/* Total Revenue (Delivered) */}
        <div className="metric-card bg-white shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <TrendIndicator value={22.4} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{formatRevenue(metrics.totalRevenue ?? 0)}</p>
          <p className="text-sm text-slate-500 mt-1">Total Revenue (Delivered)</p>
          <MicroSparkline color="#16a34a" />
        </div>
      </div>

      {/* ALERT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical Stock Alerts */}
        <div className="metric-card bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-600">{metrics.criticalAlerts ?? 0}</p>
              <p className="text-sm text-slate-600">Critical Stock Alerts</p>
            </div>
            <div className="ml-auto">
              <TrendIndicator value={-5.7} />
            </div>
          </div>
        </div>

        {/* Avg. Fulfillment Time */}
        <div className="metric-card bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-100">
              <Clock className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-600">{(metrics.avgFulfillmentDays ?? 0).toFixed(1)} days</p>
              <p className="text-sm text-slate-600">Avg. Fulfillment Time</p>
            </div>
            <div className="ml-auto">
              <TrendIndicator value={-1.8} />
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN WORKSPACE PANELS & TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Project Creation & Employee Allocation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add New Project */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <PlusCircle className="w-5 h-5 text-sap-600" />
              Establish Project & Onboard Client
            </h3>
            {projError && <p className="text-xs text-red-500 font-semibold">{projError}</p>}
            <form onSubmit={handleCreateProjectSubmit} className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
                className="text-xs px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Client Email Address"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                required
                className="text-xs px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={projLoading}
                className="py-2 px-4 text-xs font-bold bg-sap-600 text-white rounded-xl hover:bg-sap-500 transition-colors disabled:opacity-55 active:scale-98"
              >
                {projLoading ? 'Provisioning...' : 'Deploy Project'}
              </button>
            </form>
          </div>

          {/* Employee Allocation */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 text-indigo-600" />
              Allocate Employees to Workspaces (Max 3 Projects)
            </h3>
            {assignError && <p className="text-xs text-red-500 font-semibold">{assignError}</p>}
            {assignSuccess && (
              <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
                Allocation completed successfully.
              </div>
            )}
            <form onSubmit={handleAssignEmployeeSubmit} className="grid md:grid-cols-3 gap-3">
              <select
                value={assignProjectId}
                onChange={(e) => setAssignProjectId(e.target.value)}
                required
                className="text-xs px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none font-semibold text-slate-700"
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unique_project_id})</option>
                ))}
              </select>
              <select
                value={assignEmployeeId}
                onChange={(e) => setAssignEmployeeId(e.target.value)}
                required
                className="text-xs px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none font-semibold text-slate-700"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>
                ))}
              </select>
              <button
                type="submit"
                className="py-2 px-4 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors active:scale-98"
              >
                Create Assignment
              </button>
            </form>
          </div>
        </div>

        {/* Feature toggles */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            ApexJoule Assitant Gatekeeper
          </h3>
          <div className="divide-y divide-slate-150 max-h-56 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No active projects found.</p>
            ) : (
              projects.map(proj => {
                const isJouleEnabled = isJouleEnabledForProject(proj.id);
                return (
                  <div key={proj.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{proj.name}</p>
                      <p className="text-[9px] text-slate-400">ID: {proj.unique_project_id} · Client: {proj.client_email}</p>
                    </div>
                    <button
                      onClick={() => toggleApexJoule(proj.id, !isJouleEnabled)}
                      className="flex items-center gap-1 text-xs font-semibold text-sap-600 hover:text-sap-800"
                    >
                      {isJouleEnabled ? (
                        <ToggleRight className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RECHARTS PLOTS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <TrendingUp className="w-5 h-5 text-sap-600" />
          <h2 className="text-lg font-bold text-slate-800">Order Pipeline Trends</h2>
        </div>
        {pipelineData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
            <Layers className="w-8 h-8 opacity-40" />
            <span className="text-sm">No sales order data available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={pipelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradConfirmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradShipped" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<LightTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#475569' }} iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="PENDING" stackId="1" stroke="#8b5cf6" fill="url(#gradPending)" strokeWidth={2} />
              <Area type="monotone" dataKey="CONFIRMED" stackId="1" stroke="#3b82f6" fill="url(#gradConfirmed)" strokeWidth={2} />
              <Area type="monotone" dataKey="SHIPPED" stackId="1" stroke="#f97316" fill="url(#gradShipped)" strokeWidth={2} />
              <Area type="monotone" dataKey="DELIVERED" stackId="1" stroke="#10b981" fill="url(#gradDelivered)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* BAR & PIE CHART ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Asset Capacity by Plant */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart3 className="w-5 h-5 text-sap-600" />
            <h2 className="text-lg font-bold text-slate-800 font-sans">Warehouse Asset Capacity by Plant</h2>
          </div>
          {warehouseData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <Layers className="w-8 h-8 opacity-40" />
              <span className="text-sm">No material data available</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, warehouseData.length * 48)}>
              <BarChart data={warehouseData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis type="category" dataKey="plant" tick={{ fill: '#475569', fontSize: 12, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<LightTooltip />} />
                <Bar dataKey="stock" name="Stock Qty" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Work Order Status Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-5 h-5 text-sap-600" />
            <h2 className="text-lg font-bold text-slate-800">Work Order Status Distribution</h2>
          </div>
          {woStatusData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <Layers className="w-8 h-8 opacity-40" />
              <span className="text-sm">No work order data available</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={woStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                    nameKey="name"
                    stroke="#ffffff"
                    strokeWidth={3}
                    paddingAngle={3}
                  >
                    {woStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<LightTooltip />} />
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 28, fontWeight: 700, fill: '#0f172a' }}>
                    {woTotal}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fill: '#64748b' }}>
                    Total
                  </text>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {woStatusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                    {entry.name}
                    <span className="text-slate-500 font-semibold">({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Activity className="w-5 h-5 text-sap-600" />
          <h2 className="text-lg font-bold text-slate-800">Recent OData Activity</h2>
        </div>
        {recentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Activity className="w-10 h-10 opacity-30" />
            <p className="text-sm">No OData requests logged yet</p>
            <p className="text-xs text-slate-500">Activity will appear here as SAP API calls are made.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="text-slate-500 font-mono text-xs whitespace-nowrap">{relativeTime(log.timestamp)}</td>
                    <td>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${methodBadgeClass(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-700 max-w-[280px] truncate">{log.endpoint}</td>
                    <td>
                      <span className={`font-mono text-xs font-semibold ${statusCodeColor(log.statusCode)}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="text-slate-500 font-mono text-xs whitespace-nowrap">{log.duration ?? '—'} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;

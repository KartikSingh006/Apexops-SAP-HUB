import React, { useState, useMemo, FormEvent } from 'react';
import {
  Building2, Users, Activity, Database, TrendingUp, BarChart3, Zap,
  PlusCircle, ChevronRight, CheckCircle2, AlertCircle, Loader2, ToggleLeft,
  ToggleRight, Trash2, RefreshCw, Globe, Shield, Cpu, Package, Wrench,
  ShoppingCart, DollarSign, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const INDUSTRY_CATEGORIES = [
  'Healthcare & Medical Devices',
  'High-Tech Manufacturing',
  'Supply Chain & Logistics',
  'Financial Services',
  'Global Retail & E-Commerce',
  'Aerospace & Defense',
  'Energy & Utilities',
  'Pharmaceuticals & Life Sciences',
];

const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-bright rounded-xl px-4 py-3 border border-white/10 shadow-xl">
      <p className="text-slate-400 text-xs mb-2 font-semibold">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="text-white font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const TrendBadge = ({ value }: { value: number }) => (
  <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${ value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
    {value >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
    {value >= 0 ? '+' : ''}{value}%
  </span>
);

const AdminDashboard: React.FC = () => {
  const {
    userProfile, projects, employees, assignments, tickets, emails,
    materials, workOrders, salesOrders, metrics, odataLogs,
    createProject, assignEmployee, removeEmployee, toggleApexJoule,
    isJouleEnabledForProject, renameProject,
  } = useSap();

  // --- Project Deployment ---
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newIndustry, setNewIndustry] = useState(INDUSTRY_CATEGORIES[0]);
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState('');
  const [projSuccess, setProjSuccess] = useState('');

  // --- Employee Allocation ---
  const [assignProjId, setAssignProjId] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Active tab
  const [activePanel, setActivePanel] = useState<'overview' | 'deploy' | 'allocate' | 'operations'>('overview');

  const handleDeployProject = async (e: FormEvent) => {
    e.preventDefault();
    setProjError(''); setProjSuccess('');
    setProjLoading(true);
    try {
      const project = await createProject(newProjectName.trim(), newClientEmail.trim());
      setProjSuccess(`✓ Tenant ${project.unique_project_id} deployed. Client invitation dispatched to ${newClientEmail}.`);
      setNewProjectName(''); setNewClientEmail('');
    } catch (err: any) {
      setProjError(err?.message ?? 'Deployment failed.');
    } finally { setProjLoading(false); }
  };

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    setAssignError(''); setAssignSuccess('');
    setAssignLoading(true);
    try {
      await assignEmployee(assignProjId, assignEmpId);
      const emp = employees.find(e => e.id === assignEmpId);
      const proj = projects.find(p => p.id === assignProjId);
      setAssignSuccess(`✓ ${emp?.full_name || emp?.email} allocated to ${proj?.name || 'project'}.`);
      setAssignProjId(''); setAssignEmpId('');
    } catch (err: any) {
      setAssignError(err?.message ?? 'Allocation failed.');
    } finally { setAssignLoading(false); }
  };

  // Chart data
  const revenueData = useMemo(() => [
    { month: 'Jan', revenue: 42000, tenants: 28 },
    { month: 'Feb', revenue: 58000, tenants: 34 },
    { month: 'Mar', revenue: 51000, tenants: 31 },
    { month: 'Apr', revenue: 73000, tenants: 42 },
    { month: 'May', revenue: 89000, tenants: 51 },
    { month: 'Jun', revenue: 96000, tenants: 58 },
  ], []);

  const woStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    workOrders.forEach(wo => { counts[wo.status] = (counts[wo.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [workOrders]);

  const kpis = [
    { label: 'Live Sub-Tenants', value: projects.length, icon: Globe, color: 'indigo', trend: 12.4, sub: 'Active deployments' },
    { label: 'Specialist Headcount', value: employees.filter(e => e.role === 'employee').length, icon: Users, color: 'violet', trend: 8.2, sub: 'Active allocations' },
    { label: 'Open Tickets', value: tickets.filter(t => t.status !== 'resolved').length, icon: Activity, color: 'amber', trend: -3.1, sub: 'Awaiting resolution' },
    { label: 'OData Dispatches', value: odataLogs.length, icon: Database, color: 'cyan', trend: 22.7, sub: 'Telemetry events' },
    { label: 'Total Inventory', value: (metrics.totalStock ?? 0).toLocaleString(), icon: Package, color: 'emerald', trend: 5.8, sub: 'SAP material units' },
    { label: 'Pipeline Revenue', value: `$${((metrics.totalRevenue ?? 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: 'green', trend: 18.3, sub: 'Delivered orders' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400',
    violet: 'bg-violet-500/15 border-violet-500/25 text-violet-400',
    amber: 'bg-amber-500/15 border-amber-500/25 text-amber-400',
    cyan: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
    green: 'bg-green-500/15 border-green-500/25 text-green-400',
  };

  return (
    <div className="min-h-screen bg-[#020818]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full bg-indigo-600/6 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-violet-600/6 blur-[120px]" />
      </div>

      <div className="relative page-container py-8">
        {/* Header */}
        <div className="section-header mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="status-dot status-dot-live" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Live Systems Active</span>
            </div>
            <h1 className="text-3xl font-black text-white">Enterprise <span className="gradient-text">Command Center</span></h1>
            <p className="text-slate-400 text-sm mt-1">{userProfile?.email} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-admin"><Shield className="w-3 h-3" /> System Administrator</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {kpis.map((k) => (
            <div key={k.label} className="metric-card">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorMap[k.color]}`}>
                  <k.icon className="w-4 h-4" />
                </div>
                <TrendBadge value={k.trend} />
              </div>
              <p className="text-2xl font-black text-white mb-0.5">{k.value}</p>
              <p className="text-slate-400 text-xs font-medium">{k.label}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Panel Tabs */}
        <div className="flex items-center gap-2 mb-6 glass-bright rounded-2xl p-1.5 w-fit">
          {(['overview', 'deploy', 'allocate', 'operations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActivePanel(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                activePanel === tab
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'deploy' ? 'Deploy Tenant' : tab === 'allocate' ? 'Allocate Specialist' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* === OVERVIEW PANEL === */}
        {activePanel === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="glass-card">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-white font-bold">Revenue Pipeline & Tenant Growth</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gTen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#6366f1" fill="url(#gRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="tenants" name="Tenants" stroke="#06b6d4" fill="url(#gTen)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Work Order Status */}
              <div className="glass-card">
                <div className="flex items-center gap-2 mb-5">
                  <Wrench className="w-4 h-4 text-violet-400" />
                  <h3 className="text-white font-bold">Work Order Status Distribution</h3>
                </div>
                {woStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={woStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={3} stroke="none">
                        {woStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-60 text-slate-500 text-sm">No work order data</div>
                )}
              </div>
            </div>

            {/* ApexJoule Feature Flags */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-bold">ApexJoule AI Compute Authorization</h3>
                <span className="ml-auto badge badge-pending">Admin Gate</span>
              </div>
              {projects.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No tenant deployments found. Deploy a project to manage AI compute access.</p>
              ) : (
                <div className="space-y-2">
                  {projects.map(proj => {
                    const enabled = isJouleEnabledForProject(proj.id);
                    return (
                      <div key={proj.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                        <div>
                          <p className="text-white text-sm font-semibold">{proj.name}</p>
                          <p className="text-slate-500 text-xs font-mono">{proj.unique_project_id} · {proj.client_email}</p>
                        </div>
                        <button
                          onClick={() => toggleApexJoule(proj.id, !enabled)}
                          className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                            enabled ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                          {enabled ? 'AUTHORIZED' : 'REVOKED'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === DEPLOY TENANT PANEL === */}
        {activePanel === 'deploy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass-card space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-white font-bold">Automated Tenant Deployment Hub</h3>
              </div>
              <p className="text-slate-400 text-sm">Provision a new client workspace, auto-generate a secure Project ID, and trigger an invitation workflow to the client email.</p>

              {projError && <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{projError}</div>}
              {projSuccess && <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />{projSuccess}</div>}

              <form onSubmit={handleDeployProject} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Project / Contract Name</label>
                  <input className="glass-input" placeholder="e.g. BHEL Manufacturing ERP Phase 2" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Industry Vertical</label>
                  <select className="glass-input" value={newIndustry} onChange={e => setNewIndustry(e.target.value)}>
                    {INDUSTRY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Client Corporate Email</label>
                  <input className="glass-input" type="email" placeholder="client@enterprise.com" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} required />
                </div>
                <button type="submit" disabled={projLoading} className="btn-primary w-full py-3">
                  {projLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Deploy Tenant & Dispatch Invite</>}
                </button>
              </form>
            </div>

            {/* Recent Deployments */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-white font-bold">Recent Tenant Deployments</h3>
              </div>
              {projects.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Globe className="w-10 h-10 opacity-20 mx-auto mb-3" />
                  <p className="text-sm">No tenants deployed yet</p>
                </div>
              ) : (
                <div className="space-y-3 scroll-area max-h-[400px]">
                  {projects.map(proj => {
                    const projAssignments = assignments.filter(a => a.project_id === proj.id);
                    const projTickets = tickets.filter(t => t.project_id === proj.id);
                    return (
                      <div key={proj.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-white text-sm font-bold">{proj.name}</p>
                            <p className="text-slate-500 text-xs font-mono">{proj.unique_project_id}</p>
                          </div>
                          <span className={`badge ${ proj.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{proj.status}</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-3">{proj.client_email}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span><Users className="w-3.5 h-3.5 inline mr-1" />{projAssignments.length} specialists</span>
                          <span><Activity className="w-3.5 h-3.5 inline mr-1" />{projTickets.length} tickets</span>
                          <span className="ml-auto">{new Date(proj.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ALLOCATE SPECIALIST PANEL === */}
        {activePanel === 'allocate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass-card space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                <Users className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-bold">Dynamic Specialist Allocator</h3>
              </div>
              <p className="text-slate-400 text-sm">Map specialist employees to deployed tenant workspaces. Maximum 3 active project allocations per specialist enforced at database level.</p>

              {assignError && <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{assignError}</div>}
              {assignSuccess && <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />{assignSuccess}</div>}

              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Target Project Workspace</label>
                  <select className="glass-input" value={assignProjId} onChange={e => setAssignProjId(e.target.value)} required>
                    <option value="">Select Deployed Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unique_project_id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Specialist Employee</label>
                  <select className="glass-input" value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)} required>
                    <option value="">Select Specialist</option>
                    {employees.filter(e => e.role === 'employee').map(emp => <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={assignLoading} className="btn-primary w-full py-3" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ChevronRight className="w-4 h-4" /> Establish Allocation Mapping</>}
                </button>
              </form>
            </div>

            {/* Allocation Matrix */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <h3 className="text-white font-bold">Allocation Matrix</h3>
              </div>
              {assignments.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-10 h-10 opacity-20 mx-auto mb-3" />
                  <p className="text-sm">No allocations mapped yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-grid">
                    <thead><tr><th>Specialist</th><th>Project</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {assignments.map(a => {
                        const emp = employees.find(e => e.id === a.employee_id);
                        const proj = projects.find(p => p.id === a.project_id);
                        return (
                          <tr key={a.id}>
                            <td>
                              <p className="text-slate-200 text-xs font-semibold">{emp?.full_name || emp?.email || 'Unknown'}</p>
                              <p className="text-slate-500 text-[10px]">{emp?.email}</p>
                            </td>
                            <td>
                              <p className="text-slate-300 text-xs">{proj?.name || '—'}</p>
                              <p className="text-slate-500 text-[10px] font-mono">{proj?.unique_project_id}</p>
                            </td>
                            <td><span className="badge badge-active">ACTIVE</span></td>
                            <td>
                              <button onClick={() => removeEmployee(a.project_id, a.employee_id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === OPERATIONS TABLE === */}
        {activePanel === 'operations' && (
          <div className="space-y-6 animate-fade-in">
            {/* Master Operations Table */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Globe className="w-4 h-4 text-indigo-400" />
                <h3 className="text-white font-bold">Master Tenant Operations Registry</h3>
                <span className="ml-auto text-slate-500 text-xs">{projects.length} active deployments</span>
              </div>
              {projects.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Globe className="w-12 h-12 opacity-20 mx-auto mb-4" />
                  <p>No tenants deployed yet. Use the Deploy Tenant panel to create your first workspace.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-grid">
                    <thead><tr><th>Project</th><th>Client</th><th>Industry</th><th>Specialists</th><th>Tickets</th><th>Status</th><th>ApexJoule</th></tr></thead>
                    <tbody>
                      {projects.map(proj => {
                        const projAssignments = assignments.filter(a => a.project_id === proj.id);
                        const projTickets = tickets.filter(t => t.project_id === proj.id);
                        const joule = isJouleEnabledForProject(proj.id);
                        return (
                          <tr key={proj.id}>
                            <td>
                              <p className="text-white text-xs font-bold">{proj.name}</p>
                              <p className="text-slate-500 text-[10px] font-mono">{proj.unique_project_id}</p>
                            </td>
                            <td>
                              <p className="text-slate-300 text-xs">{proj.client_email}</p>
                            </td>
                            <td><p className="text-slate-400 text-xs">High-Tech Mfg.</p></td>
                            <td>
                              <span className="badge badge-employee"><Users className="w-3 h-3" />{projAssignments.length}</span>
                            </td>
                            <td>
                              <span className={`badge ${ projTickets.filter(t => t.status !== 'resolved').length > 0 ? 'badge-pending' : 'badge-active'}`}>
                                {projTickets.filter(t => t.status !== 'resolved').length} open
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${ proj.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{proj.status.toUpperCase()}</span>
                            </td>
                            <td>
                              <button onClick={() => toggleApexJoule(proj.id, !joule)} className={joule ? 'text-emerald-400' : 'text-slate-600'}>
                                {joule ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent email dispatch log */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-white font-bold">Transactional Email Dispatch Log</h3>
              </div>
              {emails.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No emails dispatched yet.</p>
              ) : (
                <div className="space-y-2 scroll-area max-h-[300px]">
                  {emails.slice(0, 10).map(email => (
                    <div key={email.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-xs font-semibold">{email.subject}</p>
                        <span className="badge badge-active text-[9px] flex-shrink-0">SENT</span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">→ {email.recipient}</p>
                      <p className="text-slate-600 text-[10px] mt-1">{new Date(email.sent_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

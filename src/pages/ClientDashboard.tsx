import React, { useState, useMemo, FormEvent } from 'react';
import {
  Building2, CheckCircle2, Clock, AlertCircle, User, Users, Wrench, PlusCircle,
  Cpu, Database, BarChart3, ChevronRight, Activity, Layers, Shield,
  Loader2, Bell, Star, Package, Globe, Zap, ArrowUpRight, Calendar,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';

const MILESTONE_STEPS = [
  { id: 'discovery', label: 'Discovery & Scoping', desc: 'Requirements captured, SOW signed', icon: Layers },
  { id: 'provisioning', label: 'Tenant Provisioning', desc: 'Workspace deployed, credentials issued', icon: Globe },
  { id: 'integration', label: 'SAP Integration', desc: 'OData connections validated, data mapped', icon: Database },
  { id: 'testing', label: 'UAT & Validation', desc: 'User acceptance testing, defect triaging', icon: CheckCircle2 },
  { id: 'production', label: 'Live Production', desc: 'System live, SLA monitoring active', icon: Activity },
];

const MODULE_REQUESTS = [
  { id: 'apex-joule', icon: Cpu, label: 'ApexJoule Core Framework', desc: 'Enterprise AI compute layer — predictive maintenance & incident triage', color: 'amber' },
  { id: 'storage-scale', icon: Database, label: 'Extended Storage Volume', desc: 'Scale your tenant database allocation from 10GB to 100GB', color: 'cyan' },
  { id: 'analytics', icon: BarChart3, label: 'Advanced Analytics Suite', desc: 'Custom KPI dashboards, export pipelines, and executive reporting', color: 'violet' },
  { id: 'priority-sla', icon: Star, label: 'Priority SLA Tier Upgrade', desc: 'Upgrade from Standard to Priority (4-hour response SLAs)', color: 'emerald' },
];

const colorMap: Record<string, string> = {
  amber: 'bg-amber-500/15 border-amber-500/25 text-amber-400',
  cyan: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400',
  violet: 'bg-violet-500/15 border-violet-500/25 text-violet-400',
  emerald: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
};

const ClientDashboard: React.FC = () => {
  const { userProfile, projects, employees, assignments, tickets, createHelpTicket, notifications, markNotificationRead } = useSap();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState('');
  const [requestedModules, setRequestedModules] = useState<Set<string>>(new Set());
  const [requestLoading, setRequestLoading] = useState<string | null>(null);

  // Client's single project
  const clientProject = useMemo(() => {
    if (!userProfile) return null;
    return projects.find(p => p.client_email === userProfile.email) ?? null;
  }, [userProfile, projects]);

  // Assigned specialist team
  const specialistTeam = useMemo(() => {
    if (!clientProject) return [];
    const projAssigns = assignments.filter(a => a.project_id === clientProject.id);
    return employees.filter(e => projAssigns.some(a => a.employee_id === e.id));
  }, [clientProject, assignments, employees]);

  // Client's own tickets
  const myTickets = useMemo(() => {
    if (!userProfile) return [];
    return tickets.filter(t => t.client_id === userProfile.id);
  }, [userProfile, tickets]);

  // Progress: determine milestone index based on project state and specialist/ticket counts
  const milestoneIndex = useMemo(() => {
    if (!clientProject) return 0;
    if (specialistTeam.length === 0) return 1;
    if (myTickets.length === 0) return 2;
    if (myTickets.some(t => t.status === 'resolved')) return 3;
    return 4;
  }, [clientProject, specialistTeam, myTickets]);

  const handleSubmitTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientProject) { setTicketError('No active project found.'); return; }
    setTicketError(''); setTicketSuccess(''); setTicketLoading(true);
    try {
      await createHelpTicket(clientProject.id, ticketSubject.trim(), ticketDesc.trim());
      setTicketSuccess('Support ticket dispatched. Your specialist team has been notified.');
      setTicketSubject(''); setTicketDesc('');
    } catch (err: any) {
      setTicketError(err?.message ?? 'Failed to submit ticket.');
    } finally { setTicketLoading(false); }
  };

  const handleModuleRequest = async (moduleId: string, moduleLabel: string) => {
    if (!clientProject || requestedModules.has(moduleId)) return;
    setRequestLoading(moduleId);
    await new Promise(r => setTimeout(r, 900));
    setRequestedModules(prev => new Set([...prev, moduleId]));
    setRequestLoading(null);
  };

  if (!userProfile) {
    return <div className="min-h-screen bg-[#020818] flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#020818]">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-5%] right-[-10%] w-[700px] h-[700px] rounded-full bg-cyan-600/5 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      <div className="relative page-container py-8">
        {/* Header */}
        <div className="section-header mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="status-dot status-dot-live" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Project Scope Secured</span>
            </div>
            <h1 className="text-3xl font-black text-white">Client <span className="gradient-text">Command Portal</span></h1>
            <p className="text-slate-400 text-sm mt-1">{userProfile.email} · B2B Enterprise Client</p>
          </div>
          <span className="badge badge-client"><Shield className="w-3 h-3" /> Verified Client</span>
        </div>

        {/* Project Card */}
        {!clientProject ? (
          <div className="glass-card border border-amber-500/20 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">Project Allocation Pending</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Your account has not been linked to a project workspace yet. Please contact your designated ApexOps administrator to complete the tenant handshake workflow.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card border border-cyan-500/10 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <span className="badge badge-active mb-3 block w-fit">LIVE PROJECT</span>
                <h2 className="text-2xl font-black text-white mb-1">{clientProject.name}</h2>
                <p className="text-slate-400 text-sm">Client email: {clientProject.client_email}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-slate-400 text-xs">Project ID</span>
                <code className="text-cyan-300 font-mono font-bold text-lg">{clientProject.unique_project_id}</code>
                <span className="text-slate-500 text-xs">Deployed {new Date(clientProject.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Project Lifecycle Tracker */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-white font-bold">Project Lifecycle Tracker</h3>
              </div>
              <div className="relative">
                {/* Connector line */}
                <div className="absolute left-4 top-5 bottom-5 w-[2px] bg-gradient-to-b from-cyan-500/40 via-indigo-500/20 to-white/5" />
                <div className="space-y-5">
                  {MILESTONE_STEPS.map((step, idx) => {
                    const isComplete = idx < milestoneIndex;
                    const isActive = idx === milestoneIndex;
                    return (
                      <div key={step.id} className="flex items-start gap-5">
                        <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isComplete
                            ? 'bg-emerald-500/30 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                            : isActive
                            ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse-slow'
                            : 'bg-white/[0.03] border-white/10'
                        }`}>
                          {isComplete
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            : <step.icon className={`w-4 h-4 ${ isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
                          }
                        </div>
                        <div className="flex-1 pb-5">
                          <p className={`text-sm font-bold ${ isComplete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-slate-500'}`}>{step.label}</p>
                          <p className={`text-xs mt-0.5 ${ isComplete || isActive ? 'text-slate-400' : 'text-slate-600'}`}>{step.desc}</p>
                          {isActive && <span className="mt-2 inline-block badge badge-pending">IN PROGRESS</span>}
                          {isComplete && <span className="mt-2 inline-block badge badge-active">COMPLETE</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Support Ticketing */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Wrench className="w-4 h-4 text-violet-400" />
                <h3 className="text-white font-bold">Support & Incident Requests</h3>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 mb-5">
                <p className="text-slate-400 text-xs font-semibold mb-3 flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" /> File New Incident Ticket</p>
                {ticketError && <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3"><AlertCircle className="w-3.5 h-3.5" />{ticketError}</div>}
                {ticketSuccess && <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-3"><CheckCircle2 className="w-3.5 h-3.5" />{ticketSuccess}</div>}
                <form onSubmit={handleSubmitTicket} className="space-y-3">
                  <input className="glass-input text-xs" placeholder="Ticket subject — e.g. Material sync timeout on PLNT-DEL1" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} required />
                  <textarea className="glass-input text-xs resize-none" placeholder="Detailed description of the issue, error codes, affected modules..." rows={3} value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} required />
                  <button type="submit" disabled={ticketLoading || !clientProject} className="btn-primary w-full py-2.5 text-xs" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                    {ticketLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Zap className="w-3.5 h-3.5" /> Dispatch Ticket to Specialist Team</>}
                  </button>
                </form>
              </div>

              {myTickets.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wider">Submitted Tickets</p>
                  <div className="space-y-2">
                    {myTickets.map(ticket => (
                      <div key={ticket.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{ticket.subject}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{new Date(ticket.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`badge flex-shrink-0 ${
                          ticket.status === 'open' ? 'badge-pending' :
                          ticket.status === 'in_progress' ? 'badge-admin' : 'badge-active'
                        }`}>{ticket.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Specialist Team */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-indigo-400" />
                <h3 className="text-white font-bold text-sm">Assigned Specialist Team</h3>
              </div>
              {specialistTeam.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-xs">No specialists assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {specialistTeam.map((emp, i) => (
                    <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 border border-indigo-500/25 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(emp.full_name || emp.email)?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{emp.full_name || emp.email}</p>
                        <p className="text-slate-500 text-[10px] truncate">{emp.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge badge-employee text-[9px]">Specialist</span>
                        <span className="status-dot status-dot-live" style={{ width: 6, height: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Module Provisioning Center */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-bold text-sm">Module Provisioning Center</h3>
              </div>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">Request advanced platform modules. Your administrator will review and authorize each request.</p>
              <div className="space-y-3">
                {MODULE_REQUESTS.map(mod => {
                  const isRequested = requestedModules.has(mod.id);
                  const isLoading = requestLoading === mod.id;
                  return (
                    <div key={mod.id} className={`p-3.5 rounded-xl border transition-all ${
                      isRequested
                        ? 'bg-emerald-500/8 border-emerald-500/20'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorMap[mod.color]}`}>
                          <mod.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold">{mod.label}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{mod.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleModuleRequest(mod.id, mod.label)}
                        disabled={isRequested || isLoading || !clientProject}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          isRequested
                            ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 cursor-default'
                            : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                          isRequested ? <><CheckCircle2 className="w-3.5 h-3.5" /> Request Dispatched</> :
                          <><Bell className="w-3.5 h-3.5" /> Request Access</>
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;

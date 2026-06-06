import React, { useState, useMemo } from 'react';
import {
  Briefcase, Activity, CheckCircle2, Clock, AlertTriangle, MessageSquare,
  ChevronRight, Users, Shield, Cpu, BarChart3, Loader2, Send, Hash,
  Calendar, Tag, FileText, Zap,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';

// Simulated SLA compliance calculation
function calcSLA(resolved: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((resolved / total) * 100);
}

const EmployeeDashboard: React.FC = () => {
  const { userProfile, projects, assignments, tickets, updateTicketStatus } = useSap();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ from: 'me' | 'client'; text: string; time: string }[]>([
    { from: 'client', text: 'Hello, the SAP data ingestion pipeline is throwing a 504 timeout on the material master sync.', time: '09:14' },
    { from: 'me', text: 'Acknowledged. I am reviewing the OData endpoint configuration now. Can you share the request correlation ID?', time: '09:17' },
  ]);

  // Filter to only THIS employee's assignments
  const myAssignments = useMemo(() => {
    if (!userProfile) return [];
    return assignments.filter(a => a.employee_id === userProfile.id);
  }, [userProfile, assignments]);

  // Projects assigned to this employee
  const myProjects = useMemo(() => {
    const projIds = myAssignments.map(a => a.project_id);
    return projects.filter(p => projIds.includes(p.id));
  }, [myAssignments, projects]);

  // Tickets for this employee's projects
  const myTickets = useMemo(() => {
    const projIds = myProjects.map(p => p.id);
    return tickets.filter(t => projIds.includes(t.project_id));
  }, [myProjects, tickets]);

  const openTickets = myTickets.filter(t => t.status !== 'resolved');
  const resolvedTickets = myTickets.filter(t => t.status === 'resolved');
  const slaRate = calcSLA(resolvedTickets.length, myTickets.length);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setChatMessages(prev => [...prev, { from: 'me', text: chatInput.trim(), time }]);
    setChatInput('');
    // Simulate client response after 1.5s
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        from: 'client',
        text: 'Thank you. The correlation ID is COR-2026-88441. Please check the SAP gateway log for timeout events.',
        time: `${now.getHours().toString().padStart(2, '0')}:${(now.getMinutes() + 1).toString().padStart(2, '0')}`,
      }]);
    }, 1500);
  };

  if (!userProfile) {
    return <div className="min-h-screen bg-[#020818] flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#020818]">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-600/6 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      <div className="relative page-container py-8">
        {/* Header */}
        <div className="section-header mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="status-dot status-dot-live" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Operations Active</span>
            </div>
            <h1 className="text-3xl font-black text-white">Specialist <span className="gradient-text">Operations Hub</span></h1>
            <p className="text-slate-400 text-sm mt-1">{userProfile.full_name || userProfile.email} · SAP Integration Specialist</p>
          </div>
          <span className="badge badge-employee"><Briefcase className="w-3 h-3" /> Specialist</span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-slate-500 text-[10px] font-mono">MAX: 3</span>
            </div>
            <p className="text-3xl font-black text-white mb-0.5">{myProjects.length}</p>
            <p className="text-slate-400 text-xs font-medium">Active Project Allocations</p>
            <div className="progress-track mt-3">
              <div className="progress-fill" style={{ width: `${(myProjects.length / 3) * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #6366f1)' }} />
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <span className={`badge text-[10px] ${ openTickets.length > 0 ? 'badge-pending' : 'badge-active'}`}>{openTickets.length > 0 ? 'ACTION NEEDED' : 'CLEAR'}</span>
            </div>
            <p className="text-3xl font-black text-white mb-0.5">{openTickets.length}</p>
            <p className="text-slate-400 text-xs font-medium">Open Incident Tickets</p>
            <p className="text-slate-600 text-[10px] mt-1">{resolvedTickets.length} resolved this cycle</p>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className={`badge text-[10px] ${ slaRate >= 90 ? 'badge-active' : slaRate >= 70 ? 'badge-pending' : 'badge-inactive'}`}>{slaRate >= 90 ? 'COMPLIANT' : slaRate >= 70 ? 'AT RISK' : 'BREACHED'}</span>
            </div>
            <p className="text-3xl font-black text-white mb-0.5">{slaRate}%</p>
            <p className="text-slate-400 text-xs font-medium">SLA Compliance Rate</p>
            <div className="progress-track mt-3">
              <div className="progress-fill" style={{ width: `${slaRate}%`, background: slaRate >= 90 ? 'linear-gradient(90deg,#10b981,#06b6d4)' : slaRate >= 70 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assigned Projects */}
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <Briefcase className="w-4 h-4 text-violet-400" />
                <h3 className="text-white font-bold">Active Workspace Allocations</h3>
                <span className="ml-auto text-slate-500 text-xs">{myProjects.length} / 3 slots filled</span>
              </div>
              {myProjects.length === 0 ? (
                <div className="text-center py-14">
                  <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm font-semibold">No project allocations yet</p>
                  <p className="text-slate-600 text-xs mt-1">Contact your administrator to be assigned to a workspace.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myProjects.map(proj => {
                    const projTickets = myTickets.filter(t => t.project_id === proj.id);
                    const openCount = projTickets.filter(t => t.status !== 'resolved').length;
                    return (
                      <div key={proj.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/20 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <span className="badge badge-active">ACTIVE</span>
                          <span className="text-slate-600 text-[10px] font-mono">{proj.unique_project_id}</span>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1">{proj.name}</h4>
                        <p className="text-slate-500 text-xs mb-3">Client: {proj.client_email}</p>
                        <div className="flex items-center gap-3 pt-3 border-t border-white/5 text-xs">
                          <span className="flex items-center gap-1 text-slate-400"><Activity className="w-3.5 h-3.5" />{projTickets.length} tickets</span>
                          {openCount > 0 && <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />{openCount} open</span>}
                          <button onClick={() => setActiveTicketId(projTickets[0]?.id || null)} className="ml-auto text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1">
                            View <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Incident Ticket Board */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-bold">Incident Resolution Board</h3>
              </div>
              {myTickets.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No incidents to resolve</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTickets.map(ticket => {
                    const proj = myProjects.find(p => p.id === ticket.project_id);
                    return (
                      <div
                        key={ticket.id}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          activeTicketId === ticket.id
                            ? 'bg-violet-500/10 border-violet-500/30'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        }`}
                        onClick={() => setActiveTicketId(activeTicketId === ticket.id ? null : ticket.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{ticket.subject}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{proj?.name} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`badge ${
                              ticket.status === 'open' ? 'badge-pending' :
                              ticket.status === 'in_progress' ? 'badge-admin' : 'badge-active'
                            }`}>{ticket.status.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </div>
                        {activeTicketId === ticket.id && (
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-slate-300 text-xs leading-relaxed mb-4">{ticket.description}</p>
                            <div className="flex gap-2">
                              {ticket.status === 'open' && (
                                <button onClick={(e) => { e.stopPropagation(); updateTicketStatus(ticket.id, 'in_progress'); }} className="btn-primary text-xs py-1.5 px-3">
                                  Begin Resolution
                                </button>
                              )}
                              {ticket.status === 'in_progress' && (
                                <button onClick={(e) => { e.stopPropagation(); updateTicketStatus(ticket.id, 'resolved'); }} className="btn-primary text-xs py-1.5 px-3" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                                </button>
                              )}
                              {ticket.status === 'resolved' && (
                                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="glass-card flex flex-col" style={{ height: 'calc(100vh - 14rem)', minHeight: '520px' }}>
            <div className="flex items-center gap-2 pb-4 border-b border-white/5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-sm font-bold">Encrypted Client Channel</p>
                <div className="flex items-center gap-1">
                  <span className="status-dot status-dot-live" style={{ width: 6, height: 6 }} />
                  <p className="text-emerald-400 text-[10px] font-semibold">E2E SECURED · ONLINE</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 scroll-area mb-4 pr-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${ msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.from === 'me'
                      ? 'bg-indigo-500/20 border border-indigo-500/25 text-indigo-100 rounded-br-md'
                      : 'bg-white/[0.05] border border-white/10 text-slate-300 rounded-bl-md'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${ msg.from === 'me' ? 'text-indigo-400' : 'text-slate-500'}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="glass-input flex-1 text-xs"
                placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              />
              <button onClick={handleSendChat} className="btn-primary px-3 py-2 flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

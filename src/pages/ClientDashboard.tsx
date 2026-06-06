import React, { useState, useMemo, FormEvent } from 'react';
import {
  Building,
  CheckCircle2,
  ShieldAlert,
  User,
  Wrench,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';

const ClientDashboard: React.FC = () => {
  const {
    userProfile,
    projects,
    tickets,
    employees,
    assignments,
    createHelpTicket,
  } = useSap();

  // B2B configurations state
  const [targetCapacity, setTargetCapacity] = useState(85);
  const [standardPriority, setStandardPriority] = useState('MEDIUM');
  const [emailNotificationSwitch, setEmailNotificationSwitch] = useState(true);
  const [systemAlertSwitch, setSystemAlertSwitch] = useState(true);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Client Help Ticket state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Client project and assignments lookup
  const clientProj = useMemo(() => {
    if (!userProfile) return null;
    return projects.find(p => p.client_email === userProfile.email) || null;
  }, [userProfile, projects]);

  const clientAssignedEmployees = useMemo(() => {
    if (!clientProj) return [];
    const projAssigns = assignments.filter(a => a.project_id === clientProj.id);
    return employees.filter(emp => projAssigns.some(a => a.employee_id === emp.id));
  }, [clientProj, assignments, employees]);

  // Handle client ticket dispatch
  const handleClientTicketSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;

    if (!clientProj) {
      setTicketError('Could not find active project allocation mapping.');
      return;
    }

    setTicketLoading(true);
    setTicketError('');
    setTicketSuccess(false);
    try {
      await createHelpTicket(clientProj.id, ticketSubject.trim(), ticketDesc.trim());
      setTicketSubject('');
      setTicketDesc('');
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 2000);
    } catch (err: any) {
      setTicketError(err?.message ?? 'Failed to file support ticket.');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleApplyConfig = (e: React.MouseEvent) => {
    e.preventDefault();
    setConfigSuccess(true);
    setTimeout(() => setConfigSuccess(false), 2000);
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
        <p className="text-slate-500 font-semibold">Loading client portal...</p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold gradient-text">
            B2B Client Portal
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Collaborative ERP workspace & project configuration panel
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Project Scope Secured</span>
        </div>
      </div>

      {/* Client Project Card */}
      {clientProj ? (
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                Allocated Project Scope
              </span>
              <h2 className="text-2xl font-bold text-slate-800 mt-2">{clientProj.name}</h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Registered email: {clientProj.client_email}</p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <span className="text-xs font-mono font-bold text-slate-600">ID: {clientProj.unique_project_id}</span>
              <span className="text-xs font-bold text-slate-500">Status: <strong className="text-indigo-600 uppercase">{clientProj.status}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-700 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold">Project Allocation Missing</h4>
            <p className="text-xs mt-1">
              Your account email has not been assigned to a live project mapping yet. Please contact the platform Admin to complete the client handshake workflow.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration & Specialists */}
        <div className="space-y-6">
          
          {/* Business Process Parameters Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-5 h-5 text-sap-600" />
              Configure Business Process Parameters
            </h3>
            <p className="text-xs text-slate-500">
              Adjust key parameters and toggle system behaviors for your custom ERP module tracking.
            </p>

            {configSuccess && (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                ERP Parameters updated successfully.
              </div>
            )}

            {/* Slider input */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Target Operational Capacity</span>
                <span>{targetCapacity}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sap-600"
              />
            </div>

            {/* Dropdown select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Default Maintenance Priority Trigger</label>
              <select
                value={standardPriority}
                onChange={(e) => setStandardPriority(e.target.value)}
                className="w-full text-xs px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none font-semibold"
              >
                <option value="HIGH">HIGH (Urgent Dispatch)</option>
                <option value="MEDIUM">MEDIUM (Standard Queue)</option>
                <option value="LOW">LOW (Deferred maintenance)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Email Notification Sync</h4>
                  <p className="text-[10px] text-slate-400">Receive alerts when new specialists are assigned to tickets.</p>
                </div>
                <button onClick={() => setEmailNotificationSwitch(!emailNotificationSwitch)} className="text-sap-600">
                  {emailNotificationSwitch ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Push Alerts Broadcast</h4>
                  <p className="text-[10px] text-slate-400">Enable audio notifications on ticket status modifications.</p>
                </div>
                <button onClick={() => setSystemAlertSwitch(!systemAlertSwitch)} className="text-sap-600">
                  {systemAlertSwitch ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleApplyConfig}
              className="w-full py-2.5 bg-gradient-to-r from-sap-600 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:from-sap-500 hover:to-indigo-500 transition-colors shadow-sm active:scale-98"
            >
              Apply Configuration Parameters
            </button>
          </div>

          {/* Assigned Specialist Team */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-5 h-5 text-indigo-600" />
              Assigned Specialist Team
            </h3>
            <p className="text-xs text-slate-500">
              These employee experts are assigned to manage your corporate ERP instance and resolve tickets.
            </p>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {clientAssignedEmployees.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No employee specialists assigned yet.</p>
              ) : (
                clientAssignedEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {emp.full_name ? emp.full_name[0].toUpperCase() : 'E'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{emp.full_name || emp.email}</p>
                      <p className="text-[10px] text-slate-400">{emp.email}</p>
                    </div>
                    <span className="ml-auto text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      Specialist
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right: Ticketing Center */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
            <Wrench className="w-5 h-5 text-emerald-600" />
            Support & Ticketing Center
          </h3>

          {/* Ticket form */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
              <PlusCircle className="w-4 h-4 text-emerald-600" /> File Support Ticket
            </h4>
            {ticketError && <p className="text-xs text-red-500 mb-2">{ticketError}</p>}
            {ticketSuccess && (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Support ticket submitted successfully.
              </div>
            )}
            <form onSubmit={handleClientTicketSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Ticket Subject"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2 border border-slate-200 bg-white rounded-xl focus:border-sap-500 focus:outline-none"
              />
              <textarea
                placeholder="Describe the issue or parameter configuration request..."
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                required
                rows={3}
                className="w-full text-xs px-3.5 py-2 border border-slate-200 bg-white rounded-xl focus:border-sap-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={ticketLoading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-55 active:scale-98"
              >
                {ticketLoading ? 'Submitting...' : 'Dispatch Ticket'}
              </button>
            </form>
          </div>

          {/* Tickets list */}
          <h4 className="text-xs font-bold text-slate-700 mb-3">Recent Filed Tickets</h4>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[16rem]">
            {tickets.filter(t => t.client_id === userProfile.id).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No help tickets filed yet.</p>
            ) : (
              tickets.filter(t => t.client_id === userProfile.id).map(ticket => (
                <div key={ticket.id} className="py-3.5 first:pt-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-bold text-slate-800">{ticket.subject}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      ticket.status === 'open' ? 'bg-red-50 text-red-600 border border-red-200' :
                      ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-green-50 text-green-600 border border-green-200'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ticket.description}</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-2">
                    Filed on: {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;

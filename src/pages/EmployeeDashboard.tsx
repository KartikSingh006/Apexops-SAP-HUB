import React, { useMemo } from 'react';
import {
  Briefcase,
  Layers,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  FileSpreadsheet,
} from 'lucide-react';
import { useSap } from '@/context/SapContext';

const EmployeeDashboard: React.FC = () => {
  const {
    userProfile,
    projects,
    tickets,
    assignments,
  } = useSap();

  // Employee assigned projects list lookup
  const employeeAssignedProjects = useMemo(() => {
    if (!userProfile || userProfile.role !== 'employee') return [];
    const empAssigns = assignments.filter(a => a.employee_id === userProfile.id);
    return projects.filter(p => empAssigns.some(a => a.project_id === p.id));
  }, [userProfile, assignments, projects]);

  // Tickets for assigned projects
  const assignedTickets = useMemo(() => {
    const projectIds = employeeAssignedProjects.map(p => p.id);
    return tickets.filter(t => projectIds.includes(t.project_id));
  }, [employeeAssignedProjects, tickets]);

  const openTicketsCount = useMemo(() => {
    return assignedTickets.filter(t => t.status !== 'resolved').length;
  }, [assignedTickets]);

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
        <p className="text-slate-500 font-semibold">Loading employee operations center...</p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold gradient-text">
            Employee Operations Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Task allocations & assigned corporate ERP workspace dashboards
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
          <FolderKanban className="w-4 h-4" />
          <span>Specialist Workspaces Active</span>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace Allocations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">{employeeAssignedProjects.length}</p>
          <span className="text-[10px] font-bold text-slate-400 block mt-1">Maximum allocation limit: 3</span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Project Tickets</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">{openTicketsCount}</p>
          <span className="text-[10px] font-bold text-slate-400 block mt-1">Requires immediate response</span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Task Completion</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">
            {assignedTickets.length > 0 
              ? `${Math.round(((assignedTickets.length - openTicketsCount) / assignedTickets.length) * 100)}%`
              : '100%'}
          </p>
          <span className="text-[10px] font-bold text-slate-400 block mt-1">Based on resolved tickets</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Assigned Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              Allocated ERP Workspace Modules
            </h3>

            {employeeAssignedProjects.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-150">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-bold">No active project allocations mapped to this account.</p>
                <p className="text-[10px] text-slate-400 mt-1">Please contact the system administrator to link your specialist profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employeeAssignedProjects.map(proj => {
                  const projectTickets = tickets.filter(t => t.project_id === proj.id);
                  return (
                    <div key={proj.id} className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          ID: {proj.unique_project_id}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-2">{proj.name}</h4>
                        <p className="text-2xs text-slate-400 mt-0.5">Client contact: {proj.client_email}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-150 flex items-center justify-between text-2xs text-slate-500 font-bold">
                        <span>STATUS: <strong className="text-indigo-600 uppercase">{proj.status}</strong></span>
                        <span>TICKETS: {projectTickets.length}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Assigned Tickets */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm flex flex-col h-full">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
              <Wrench className="w-5 h-5 text-amber-500" />
              Assigned Tickets Board
            </h3>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[28rem] space-y-3.5">
              {assignedTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 gap-1 flex flex-col items-center">
                  <Clock className="w-8 h-8 opacity-30" />
                  <p className="text-xs">No active help tickets assigned</p>
                </div>
              ) : (
                assignedTickets.map(ticket => (
                  <div key={ticket.id} className="py-2.5 first:pt-0">
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
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mt-2.5">
                      <span>Project: {projects.find(p => p.id === ticket.project_id)?.name || 'Unknown'}</span>
                      <span>Filed: {new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;

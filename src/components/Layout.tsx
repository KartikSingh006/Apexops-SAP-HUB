import React, { useState, useCallback, useMemo, useEffect, FormEvent } from 'react';
import {
  LayoutDashboard,
  Warehouse,
  Wrench,
  Search,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Activity,
  Database,
  Bell,
  User,
  Settings as SettingsIcon,
  Zap,
  Terminal,
  Building,
  Mail,
  PlusCircle,
  Clock,
  CheckCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Trash2,
  FileText,
  Shield,
  Sparkles,
  Users,
  Briefcase,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSap, HelpTicket, Project } from '@/context/SapContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge: string | null;
}

interface SearchResultItem {
  type: 'material' | 'workOrder' | 'salesOrder' | 'project' | 'ticket';
  id: string;
  label: string;
  page: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const {
    materials,
    workOrders,
    salesOrders,
    searchAll,
    odataLogs,
    telemetry,
    toggleODataDebugger,
    odataDebuggerEnabled,
    
    // Live multi-tenant states & actions
    userProfile,
    projects,
    employees,
    assignments,
    tickets,
    emails,
    notifications,
    companyName,
    createProject,
    renameProject,
    assignEmployee,
    removeEmployee,
    toggleApexJoule,
    createHelpTicket,
    updateTicketStatus,
    markNotificationRead,
    isJouleEnabledForProject,
    featureFlags
  } = useSap();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // App-wide user settings states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [metricInterval, setMetricInterval] = useState('10'); // seconds

  // Project forms state
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState('');

  // Ticket filing state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');

  // Employee assignment form state
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignError, setAssignError] = useState('');

  // Dynamic badge counts
  const lowStockCount = useMemo(() => {
    if (!materials || materials.length === 0) return null;
    const count = materials.filter(
      (m: any) => m.stockQuantity < (m.reorderPoint ?? 10)
    ).length;
    return count > 0 ? String(count) : null;
  }, [materials]);

  const openWorkOrdersCount = useMemo(() => {
    if (!workOrders || workOrders.length === 0) return null;
    const count = workOrders.filter(
      (wo: any) =>
        wo.status?.toLowerCase() !== 'completed' &&
        wo.status?.toLowerCase() !== 'closed'
    ).length;
    return count > 0 ? String(count) : null;
  }, [workOrders]);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { id: 'dashboard', label: 'Analytics Hub', icon: LayoutDashboard, badge: null },
      { id: 'warehouse', label: 'Warehouse Audit', icon: Warehouse, badge: lowStockCount },
      { id: 'maintenance', label: 'Maintenance Hub', icon: Wrench, badge: openWorkOrdersCount },
    ];
    return items;
  }, [lowStockCount, openWorkOrdersCount]);

  const currentPageLabel = useMemo(() => {
    const found = navItems.find((item) => item.id === currentPage);
    return found ? found.label : 'Dashboard';
  }, [currentPage, navItems]);

  // Keyboard shortcut for search (Ctrl+K / ⌘K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const el = document.getElementById('global-search-input');
        if (el) el.focus();
      }
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setSettingsOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#search-container')) {
        setShowSearchResults(false);
      }
      if (!target.closest('#notifications-container')) {
        setNotificationsOpen(false);
      }
      if (!target.closest('#user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Unified global search indexing projects, tickets, and SAP items
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      setShowSearchResults(true);
      
      const q = query.toLowerCase();
      const mapped: SearchResultItem[] = [];

      // 1. Index database projects
      projects.filter(p => p.name.toLowerCase().includes(q) || p.unique_project_id.toLowerCase().includes(q)).slice(0, 3).forEach(p => {
        mapped.push({
          type: 'project',
          id: p.id,
          label: `${p.name} (${p.unique_project_id})`,
          page: 'dashboard'
        });
      });

      // 2. Index database help tickets
      tickets.filter(t => t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)).slice(0, 3).forEach(t => {
        mapped.push({
          type: 'ticket',
          id: t.id,
          label: `Help Ticket: ${t.subject} [${t.status.toUpperCase()}]`,
          page: 'dashboard'
        });
      });

      // 3. Index standard SAP context items
      const results = searchAll(query);
      if (results.materials) {
        results.materials.slice(0, 3).forEach((m: any) => {
          mapped.push({
            type: 'material',
            id: m.materialId || m.id || '',
            label: m.description || m.materialId || '',
            page: 'warehouse',
          });
        });
      }
      if (results.workOrders) {
        results.workOrders.slice(0, 3).forEach((wo: any) => {
          mapped.push({
            type: 'workOrder',
            id: wo.workOrderId || wo.id || '',
            label: wo.description || wo.workOrderId || '',
            page: 'maintenance',
          });
        });
      }
      if (results.salesOrders) {
        results.salesOrders.slice(0, 3).forEach((so: any) => {
          mapped.push({
            type: 'salesOrder',
            id: so.salesOrderId || so.id || '',
            label: `Sales: ${so.customerName} (${so.salesOrderId})`,
            page: 'dashboard',
          });
        });
      }

      setSearchResults(mapped);
    },
    [searchAll, projects, tickets]
  );

  const handleResultClick = useCallback(
    (result: SearchResultItem) => {
      onNavigate(result.page);
      setShowSearchResults(false);
      setSearchQuery('');
      setSearchResults([]);
    },
    [onNavigate]
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const handleNavClick = useCallback(
    (pageId: string) => {
      onNavigate(pageId);
      setSidebarOpen(false);
    },
    [onNavigate]
  );

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Project forms actions
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
    try {
      await assignEmployee(assignProjectId, assignEmployeeId);
      setAssignProjectId('');
      setAssignEmployeeId('');
    } catch (err: any) {
      setAssignError(err?.message ?? 'Failed to create employee project mapping.');
    }
  };

  // Ticket filing action
  const handleFileTicketSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    
    // Find client's project
    const clientProj = projects.find(p => p.client_email === userProfile?.email);
    if (!clientProj) {
      setTicketError('Client project mapping missing. Contact admin.');
      return;
    }

    setTicketLoading(true);
    setTicketError('');
    try {
      await createHelpTicket(clientProj.id, ticketSubject.trim(), ticketDesc.trim());
      setTicketSubject('');
      setTicketDesc('');
    } catch (err: any) {
      setTicketError(err?.message ?? 'Failed to file support ticket.');
    } finally {
      setTicketLoading(false);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Building className="w-4 h-4 text-indigo-500" />;
      case 'ticket':
        return <HelpCircle className="w-4 h-4 text-emerald-500" />;
      case 'material':
        return <Database className="w-4 h-4 text-sap-500" />;
      case 'workOrder':
        return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'salesOrder':
        return <Zap className="w-4 h-4 text-sky-500" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  // Client assigned employees list lookup
  const clientAssignedEmployees = useMemo(() => {
    if (userProfile?.role !== 'client') return [];
    const clientProj = projects.find(p => p.client_email === userProfile.email);
    if (!clientProj) return [];

    const projAssigns = assignments.filter(a => a.project_id === clientProj.id);
    // Find matching employee profiles
    // In standard Supabase context we might load profiles or show default, let's look up matching employees
    return employees.filter(emp => projAssigns.some(a => a.employee_id === emp.id));
  }, [userProfile, projects, assignments, employees]);

  // Employee assigned projects list lookup
  const employeeAssignedProjects = useMemo(() => {
    if (userProfile?.role !== 'employee') return [];
    const empAssigns = assignments.filter(a => a.employee_id === userProfile.id);
    return projects.filter(p => empAssigns.some(a => a.project_id === p.id));
  }, [userProfile, assignments, projects]);

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      
      {/* ──────────────── DESKTOP SIDEBAR ──────────────── */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-30 shadow-sm">
        {/* Top Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sap-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1">
              ApexOps <Sparkles className="w-3.5 h-3.5 text-sap-500" />
            </h1>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Enterprise Suite v4.2.1</span>
          </div>
        </div>

        {/* Company Title */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Workspace</p>
          <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{companyName}</p>
          {userProfile && (
            <span className="inline-block text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-2">
              Role: {userProfile.role}
            </span>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-sap-50 border-l-4 border-sap-600 text-sap-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sap-600' : 'text-slate-400'}`} />
                {item.label}
                {item.badge && (
                  <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Dev Console Indicator */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40">
          <button
            onClick={toggleODataDebugger}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-200 ${
              odataDebuggerEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            OData Debugger
            <span className={`w-2 h-2 rounded-full ml-auto ${odataDebuggerEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          </button>
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
            <span>OData Logs: {odataLogs.length}</span>
            <span>Events: {telemetry.length}</span>
          </div>
        </div>
      </aside>

      {/* ──────────────── MOBILE TOP NAVBAR ──────────────── */}
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-lg font-black text-slate-800 tracking-tight">ApexOps</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──────────────── MOBILE SIDEBAR SLIDE-OUT OVERLAY ──────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          {/* Menu Card */}
          <div className="relative flex flex-col w-72 max-w-xs bg-white h-full shadow-2xl z-10 p-5">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
              <span className="text-lg font-black text-slate-800">ApexOps Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-sap-50 text-sap-700 font-bold border-l-4 border-sap-600'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-slate-100 pt-5">
              <button
                onClick={toggleODataDebugger}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold bg-white text-slate-600"
              >
                <Terminal className="w-3.5 h-3.5" />
                OData Middleware Log
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 mt-2.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MAIN CONTAINER ──────────────── */}
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen pt-14 md:pt-0 pb-16 md:pb-0">
        
        {/* Header Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ApexOps ERP</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-sm font-bold text-slate-700">{currentPageLabel}</span>
          </div>

          {/* Search bar & Icons */}
          <div className="flex items-center gap-6">
            
            {/* Unified Search Header */}
            <div id="search-container" className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSearchResults(searchResults.length > 0)}
                placeholder="Search materials, orders, projects... (⌘K)"
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-sap-500 focus:outline-none bg-slate-50 focus:bg-white transition-all font-medium"
              />
              
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 max-h-[30rem] overflow-y-auto animate-slide-down">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    UNIFIED INDEX SEARCH RESULTS
                  </div>
                  <div className="divide-y divide-slate-100">
                    {searchResults.map((result, idx) => (
                      <button
                        key={`${result.id}-${idx}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {getResultIcon(result.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{result.label}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            ID: {result.id} · Section: {result.page}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notification bell */}
            <div id="notifications-container" className="relative">
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }}
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-slide-down">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-700">Notifications Log</span>
                    {unreadNotifications.length > 0 && (
                      <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {unreadNotifications.length} New
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No recent transactional alerts.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className={`p-3.5 hover:bg-slate-50/50 transition-colors ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-bold text-slate-800">{n.title}</p>
                            {!n.read && (
                              <button
                                onClick={() => markNotificationRead(n.id)}
                                className="text-[9px] font-bold text-sap-600 hover:underline"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-2">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div id="user-menu-container" className="relative">
              <button
                onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-sap-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:shadow-md transition-shadow"
              >
                <User className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-slide-down">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{userProfile?.full_name || 'SAP Specialist'}</p>
                    <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{userProfile?.email}</p>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile Workspace
                  </button>
                  <button
                    onClick={() => { setSettingsOpen(true); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400" />
                    System Settings
                  </button>
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ──────────────── COMPREHENSIVE SETTINGS MODAL ──────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-800 text-lg">System Configuration Panel</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Push notifications switch */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Browser Push Alerts</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Toggle browser desktop notifications on critical anomalies.</p>
                </div>
                <button
                  onClick={() => setPushEnabled(!pushEnabled)}
                  className="text-sap-600 hover:scale-110 transition-transform"
                >
                  {pushEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                </button>
              </div>

              {/* Sound Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Acoustic Warning Signals</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Sound alerts on critical low stocks or HIGH priority work orders.</p>
                </div>
                <button
                  onClick={() => setSoundAlerts(!soundAlerts)}
                  className="text-sap-600 hover:scale-110 transition-transform"
                >
                  {soundAlerts ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                </button>
              </div>

              {/* Refresh interval config */}
              <div>
                <label className="text-sm font-bold text-slate-800 block">SAP Metric Polling Frequency</label>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">Adjust auto-refresh polling duration of telemetry streams.</p>
                <select
                  value={metricInterval}
                  onChange={(e) => setMetricInterval(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none font-semibold"
                >
                  <option value="5">Every 5 Seconds (Optimized)</option>
                  <option value="10">Every 10 Seconds (Standard)</option>
                  <option value="30">Every 30 Seconds</option>
                  <option value="60">Every 60 Seconds</option>
                </select>
              </div>

              {/* Dark mode lock message */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-sap-500 mt-0.5 flex-shrink-0" />
                <p className="text-2xs text-slate-500 leading-relaxed">
                  <strong>Light Mode Enforced:</strong> App-wide visual styles are locked to Google Light-Mode aesthetics under strict corporate design guidelines. Re-theming is restricted by organizational administrators.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                Close Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── DYNAMIC CONTEXT-AWARE PROFILE MODAL ──────────────── */}
      {profileOpen && userProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sap-50 flex items-center justify-center text-sap-600">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Corporate Identity Overview</h3>
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Gateway profile: {userProfile.role.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* Profile Meta Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered Name</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{userProfile.full_name || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Communication Email</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{userProfile.email}</p>
                </div>
              </div>

              {/* ──────────────── ADMIN SCOPE VIEW ──────────────── */}
              {userProfile.role === 'admin' && (
                <div className="space-y-6">
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-sap-600" />
                      Global Administrative Overview
                    </h4>
                    
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 text-center">
                        <span className="text-lg font-black text-indigo-700">{projects.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mt-1">Projects</span>
                      </div>
                      <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 text-center">
                        <span className="text-lg font-black text-purple-700">{employees.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mt-1">Employees</span>
                      </div>
                      <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-center">
                        <span className="text-lg font-black text-emerald-700">{tickets.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mt-1">Tickets</span>
                      </div>
                      <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100 text-center">
                        <span className="text-lg font-black text-sky-700">{emails.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mt-1">Emails Log</span>
                      </div>
                    </div>
                  </div>

                  {/* Add New Project Section */}
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-sap-600" />
                      Establish Project & Onboard Client
                    </h4>
                    {projError && <p className="text-xs text-red-500 mb-2">{projError}</p>}
                    <form onSubmit={handleCreateProjectSubmit} className="grid md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                        className="text-xs px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="Client Email Address"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        required
                        className="text-xs px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={projLoading}
                        className="py-2 px-4 text-xs font-bold bg-sap-600 text-white rounded-xl hover:bg-sap-500 transition-colors disabled:opacity-55"
                      >
                        {projLoading ? 'Provisioning...' : 'Deploy Project'}
                      </button>
                    </form>
                  </div>

                  {/* Employee Allocations Panel */}
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Allocate Employees to Workspaces (Max 3 Projects)
                    </h4>
                    {assignError && <p className="text-xs text-red-500 mb-2">{assignError}</p>}
                    <form onSubmit={handleAssignEmployeeSubmit} className="grid md:grid-cols-3 gap-3">
                      <select
                        value={assignProjectId}
                        onChange={(e) => setAssignProjectId(e.target.value)}
                        required
                        className="text-xs px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none"
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
                        className="text-xs px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:border-sap-500 focus:outline-none"
                      >
                        <option value="">Select Employee</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="py-2 px-4 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                      >
                        Create Assignment
                      </button>
                    </form>
                  </div>

                  {/* Add-On Gatekeeper System: Toggle permissions per project */}
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Granular Feature Toggle: ApexJoule Assistant Add-On
                    </h4>
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {projects.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No active projects found.</p>
                      ) : (
                        projects.map(proj => {
                          const isJouleEnabled = isJouleEnabledForProject(proj.id);
                          return (
                            <div key={proj.id} className="flex items-center justify-between py-2">
                              <div>
                                <p className="text-xs font-bold text-slate-700">{proj.name}</p>
                                <p className="text-[10px] text-slate-400">ID: {proj.unique_project_id} · Client: {proj.client_email}</p>
                              </div>
                              <button
                                onClick={() => toggleApexJoule(proj.id, !isJouleEnabled)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-sap-600 hover:text-sap-800"
                              >
                                {isJouleEnabled ? (
                                  <>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">ADD-ON ACTIVE</span>
                                    <ToggleRight className="w-7 h-7 text-emerald-600" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">INACTIVE</span>
                                    <ToggleLeft className="w-7 h-7 text-slate-300" />
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────── EMPLOYEE SCOPE VIEW ──────────────── */}
              {userProfile.role === 'employee' && (
                <div className="space-y-5">
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Assigned Projects Dashboard (Maximum 3 Active Allocations)
                    </h4>

                    {employeeAssignedProjects.length === 0 ? (
                      <p className="text-xs text-slate-400 bg-slate-50 border p-4 rounded-xl text-center">
                        No active project allocations mapped to this specialist.
                      </p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {employeeAssignedProjects.map(proj => {
                          const clientTickets = tickets.filter(t => t.project_id === proj.id);
                          return (
                            <div key={proj.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                              <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                ID: {proj.unique_project_id}
                              </span>
                              <h5 className="font-bold text-slate-800 text-sm mt-2">{proj.name}</h5>
                              <p className="text-xs text-slate-500 mt-1">Client: {proj.client_email}</p>
                              
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                                <span>Status: <strong className="text-indigo-600 uppercase">{proj.status}</strong></span>
                                <span>Tickets: {clientTickets.length}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────── CLIENT SCOPE VIEW ──────────────── */}
              {userProfile.role === 'client' && (
                <div className="space-y-6">
                  {/* Project overview parameters */}
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-sap-600" />
                      B2B Collaboration Workspace Details
                    </h4>
                    {projects.filter(p => p.client_email === userProfile.email).map(proj => (
                      <div key={proj.id} className="p-4 bg-sap-50/50 border border-sap-200 rounded-2xl">
                        <div className="flex justify-between items-center">
                          <h5 className="font-bold text-slate-800 text-base">{proj.name}</h5>
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-sap-600 text-white">
                            ID: {proj.unique_project_id}
                          </span>
                        </div>
                        <div className="mt-3.5 grid grid-cols-2 gap-3 text-xs text-slate-600 font-semibold">
                          <p>Project Status: <strong className="text-sap-700 uppercase">{proj.status}</strong></p>
                          <p>Created Date: {new Date(proj.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Help Tickets list & filing */}
                  <div className="border-t border-slate-150 pt-5">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      Support Center & Assistance Tickets
                    </h4>

                    {/* Create Help Ticket Form */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 mb-4">
                      <h5 className="text-xs font-bold text-slate-700 mb-3">Submit Help Ticket to Assigned Employees</h5>
                      {ticketError && <p className="text-xs text-red-500 mb-2">{ticketError}</p>}
                      <form onSubmit={handleFileTicketSubmit} className="space-y-3">
                        <input
                          type="text"
                          placeholder="Subject"
                          value={ticketSubject}
                          onChange={(e) => setTicketSubject(e.target.value)}
                          required
                          className="w-full text-xs px-3.5 py-2 border border-slate-200 bg-white rounded-xl focus:border-sap-500 focus:outline-none"
                        />
                        <textarea
                          placeholder="Detailed description of issue..."
                          value={ticketDesc}
                          onChange={(e) => setTicketDesc(e.target.value)}
                          required
                          rows={3}
                          className="w-full text-xs px-3.5 py-2 border border-slate-200 bg-white rounded-xl focus:border-sap-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={ticketLoading}
                          className="py-1.5 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-55"
                        >
                          {ticketLoading ? 'Submitting...' : 'Dispatch Ticket'}
                        </button>
                      </form>
                    </div>

                    {/* Tickets list */}
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {tickets.filter(t => t.client_id === userProfile.id).length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No help tickets filed yet.</p>
                      ) : (
                        tickets.filter(t => t.client_id === userProfile.id).map(ticket => (
                          <div key={ticket.id} className="py-3">
                            <div className="flex justify-between items-start">
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
                            <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                              Filed on: {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setProfileOpen(false)}
                className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                Close Profile Workspace
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Settings,
  Zap,
  Terminal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSap } from '@/context/SapContext';

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
  type: 'material' | 'workOrder' | 'salesOrder';
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
  } = useSap();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Analytics Hub', icon: LayoutDashboard, badge: null },
      { id: 'warehouse', label: 'Warehouse Audit', icon: Warehouse, badge: lowStockCount },
      { id: 'maintenance', label: 'Maintenance Hub', icon: Wrench, badge: openWorkOrdersCount },
    ],
    [lowStockCount, openWorkOrdersCount]
  );

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

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      setShowSearchResults(true);
      const results = searchAll(query);
      const mapped: SearchResultItem[] = [];

      if (results.materials) {
        results.materials.slice(0, 5).forEach((m: any) => {
          mapped.push({
            type: 'material',
            id: m.materialId || m.id || '',
            label: m.description || m.materialDescription || m.materialId || '',
            page: 'warehouse',
          });
        });
      }
      if (results.workOrders) {
        results.workOrders.slice(0, 5).forEach((wo: any) => {
          mapped.push({
            type: 'workOrder',
            id: wo.workOrderId || wo.orderId || wo.id || '',
            label: wo.description || wo.shortText || wo.workOrderId || '',
            page: 'maintenance',
          });
        });
      }
      if (results.salesOrders) {
        results.salesOrders.slice(0, 5).forEach((so: any) => {
          mapped.push({
            type: 'salesOrder',
            id: so.salesOrderId || so.orderId || so.id || '',
            label: so.customerName || so.description || so.salesOrderId || '',
            page: 'dashboard',
          });
        });
      }

      setSearchResults(mapped);
    },
    [searchAll]
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

  const notificationCount = useMemo(() => {
    let count = 0;
    if (lowStockCount) count += parseInt(lowStockCount, 10);
    if (openWorkOrdersCount) count += parseInt(openWorkOrdersCount, 10);
    return count;
  }, [lowStockCount, openWorkOrdersCount]);

  const notifications = useMemo(() => {
    const items: { id: string; text: string; type: string; time: string }[] = [];
    if (lowStockCount) {
      items.push({
        id: 'low-stock',
        text: `${lowStockCount} materials below reorder point`,
        type: 'warning',
        time: 'Now',
      });
    }
    if (openWorkOrdersCount) {
      items.push({
        id: 'open-wo',
        text: `${openWorkOrdersCount} work orders pending action`,
        type: 'info',
        time: 'Now',
      });
    }
    items.push({
      id: 'system-ok',
      text: 'OData connection stable',
      type: 'success',
      time: '2m ago',
    });
    return items;
  }, [lowStockCount, openWorkOrdersCount]);

  // ─── SEARCH RESULT ICON ────────────────────────────────────────────
  const getResultIcon = (type: string) => {
    switch (type) {
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

  const getResultSectionLabel = (type: string) => {
    switch (type) {
      case 'material':
        return 'Materials';
      case 'workOrder':
        return 'Work Orders';
      case 'salesOrder':
        return 'Sales Orders';
      default:
        return 'Results';
    }
  };

  // Group search results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResultItem[]> = {};
    searchResults.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [searchResults]);

  // ─── NOTIFICATION TYPE COLORS ──────────────────────────────────────
  const getNotificationDot = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-500';
      case 'info':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-slate-400';
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  //  SIDEBAR CONTENT (shared between desktop & mobile overlay)
  // ═══════════════════════════════════════════════════════════════════
  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Branding ─────────────────────────────────────────────── */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sap-600 to-sap-800 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">ApexOps</h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">SAP Hub</p>
          </div>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-sap-500/10 text-sap-600 border border-sap-500/20 font-mono">
            v4.2.1
          </span>
        </div>

        {/* System Status */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-green-700 font-medium">All Systems Operational</span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${
                  isActive
                    ? 'bg-sap-50 text-sap-600 border-l-2 border-sap-600 ml-0 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 border-l-2 border-transparent'
                }
              `}
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-sap-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="status-badge-warning text-[10px] px-2 py-0.5 min-w-[1.5rem] text-center">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight className="w-4 h-4 text-sap-600/60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom Section ───────────────────────────────────────── */}
      <div className="p-4 mt-auto space-y-3 border-t border-slate-200">
        {/* OData Debugger Toggle */}
        <button
          onClick={toggleODataDebugger}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            transition-all duration-200 group border
            ${
              odataDebuggerEnabled
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/80 hover:text-slate-950'
            }
          `}
        >
          <Terminal
            className={`w-4 h-4 ${
              odataDebuggerEnabled ? 'text-green-600' : 'text-slate-500 group-hover:text-slate-700'
            }`}
          />
          <span className="flex-1 text-left">OData Debugger</span>
          <span className="relative flex h-2.5 w-2.5">
            {odataDebuggerEnabled && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-50" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                odataDebuggerEnabled ? 'bg-green-500' : 'bg-slate-400'
              }`}
            />
          </span>
        </button>

        {/* Connection Stats */}
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-slate-400" />
            Logs: {odataLogs?.length ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-slate-400" />
            Telemetry: {telemetry?.length ?? 0}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (md+)
      ═══════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 bottom-0 w-72 bg-slate-50 border-r border-slate-200 z-40">
        {sidebarContent}
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE SIDEBAR OVERLAY
      ═══════════════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="relative w-72 h-full bg-slate-50 border-r border-slate-200 animate-slide-up flex flex-col"
            style={{ animation: 'slideInLeft 0.3s ease-out' }}
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HEADER BAR
      ═══════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 right-0 left-0 md:left-72 h-16 bg-white/95 backdrop-blur border-b border-slate-200 z-30 flex items-center px-4 md:px-6 gap-4">
        {/* Left: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-500 font-medium">ApexOps</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-slate-800 font-semibold truncate">{currentPageLabel}</span>
          </div>
        </div>

        {/* Center: Global Search */}
        <div id="search-container" className="flex-1 flex justify-center max-w-lg mx-auto relative">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Search materials, orders, work orders..."
              className="input-field w-full pl-10 pr-16 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </kbd>
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-slide-down z-50">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-150">
                    {getResultSectionLabel(type)}
                  </div>
                  {items.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-sap-50 transition-colors text-left"
                    >
                      {getResultIcon(result.type)}
                      <span className="font-mono text-xs text-slate-500 min-w-[5rem]">{result.id}</span>
                      <span className="text-slate-800 truncate flex-1">{result.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {showSearchResults && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-2xl p-6 text-center animate-slide-down z-50">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Right: Activity, Notifications, User, Logout */}
        <div className="flex items-center gap-2">
          {/* Activity Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] text-green-700 font-medium">LIVE</span>
          </div>

          {/* Notification Bell */}
          <div id="notifications-container" className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setUserMenuOpen(false);
              }}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-slide-down z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  {notificationCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 font-medium">
                      {notificationCount} new
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${getNotificationDot(n.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{n.text}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div id="user-menu-container" className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setNotificationsOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-sap-600 to-sap-800 flex items-center justify-center text-white text-xs font-bold shadow-md hover:shadow-lg transition-shadow"
            >
              <User className="w-4 h-4" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-slide-down z-50">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <User className="w-4 h-4 text-slate-500" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <Settings className="w-4 h-4 text-slate-500" />
                  Settings
                </button>
                <div className="border-t border-slate-200" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Logout Button (visible on desktop) */}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════════ */}
      <main className="md:ml-72 pt-16 pb-20 md:pb-6 min-h-screen bg-slate-100/50">
        {children}
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV (md:hidden)
      ═══════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl
                  transition-all duration-200 relative
                  ${isActive ? 'scale-110' : 'scale-100'}
                `}
              >
                {/* Active glow */}
                {isActive && (
                  <span className="absolute inset-0 bg-sap-50 rounded-xl" />
                )}
                <span className="relative">
                  <Icon
                     className={`w-5 h-5 transition-colors duration-200 ${
                       isActive ? 'text-sap-600' : 'text-slate-400'
                     }`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[0.95rem] h-[0.95rem] flex items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white px-0.5">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 relative ${
                    isActive ? 'text-sap-600' : 'text-slate-500'
                  }`}
                >
                  {item.label.split(' ')[0]}
                </span>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-sap-600 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Inline keyframes for mobile sidebar slide-in ──────────── */}
      <style>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;

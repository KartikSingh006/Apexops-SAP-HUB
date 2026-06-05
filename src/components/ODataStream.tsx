import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Download,
  ChevronUp,
  ChevronDown,
  Filter,
  Copy,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useSap, type ODataLogEntry } from '@/context/SapContext';

type PanelState = 'collapsed' | 'normal' | 'expanded';
type MethodFilter = 'ALL' | 'GET' | 'POST' | 'PATCH' | 'DELETE';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-600',
  POST: 'text-blue-600',
  PATCH: 'text-amber-600',
  DELETE: 'text-rose-600',
};

const METHOD_BG_COLORS: Record<string, string> = {
  GET: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  POST: 'bg-blue-50 border-blue-200 text-blue-700',
  PATCH: 'bg-amber-50 border-amber-200 text-amber-700',
  DELETE: 'bg-rose-50 border-rose-200 text-rose-700',
};

function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-emerald-600';
  if (code >= 400 && code < 500) return 'text-orange-600';
  if (code >= 500) return 'text-rose-600';
  return 'text-slate-500';
}

function getStatusBg(code: number): string {
  if (code >= 200 && code < 300) return 'bg-emerald-50 border border-emerald-100';
  if (code >= 400 && code < 500) return 'bg-orange-50 border border-orange-100';
  if (code >= 500) return 'bg-rose-50 border border-rose-100';
  return 'bg-slate-100 border border-slate-200';
}

function generateMockLogs(): ODataLogEntry[] {
  const methods: ODataLogEntry['method'][] = ['GET', 'POST', 'PATCH', 'DELETE'];
  const endpoints = [
    '/sap/opu/odata4/sap/api_material/srvd_a2x/sap/material/0001/Material',
    '/sap/opu/odata4/sap/api_business_partner/srvd_a2x/sap/businesspartner/0001/A_BusinessPartner',
    '/sap/opu/odata4/sap/api_sales_order/srvd_a2x/sap/salesorder/0001/A_SalesOrder',
    '/sap/opu/odata4/sap/api_purchaseorder/srvd_a2x/sap/purchaseorder/0001/A_PurchaseOrder',
    '/sap/opu/odata4/sap/api_plant/srvd_a2x/sap/plant/0001/A_Plant',
    '/sap/opu/odata4/sap/api_warehouse/srvd_a2x/sap/warehouse/0001/WarehouseTask',
  ];
  const statusCodes = [200, 201, 204, 400, 401, 404, 500, 503];
  const logs: ODataLogEntry[] = [];

  for (let i = 0; i < 15; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    logs.push({
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
      method,
      statusCode: statusCodes[Math.floor(Math.random() * statusCodes.length)],
      duration: Math.floor(Math.random() * 2000) + 50,
      correlationId: crypto.randomUUID(),
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      payload:
        method === 'GET'
          ? null
          : {
              d: {
                results: [
                  {
                    MaterialNumber: `MAT-${1000 + i}`,
                    Description: `Sample material entry ${i}`,
                    Quantity: Math.floor(Math.random() * 500),
                    Unit: 'EA',
                    LastModified: new Date().toISOString(),
                  },
                ],
                __count: String(Math.floor(Math.random() * 100)),
              },
            },
    });
  }

  return logs.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

const SEPARATOR = '──────────────────────────────────────────────────';
const MAX_DISPLAY_ENTRIES = 200;

const ODataStream: React.FC = () => {
  const { odataDebuggerEnabled, toggleODataDebugger, odataLogs: contextLogs } = useSap();

  const [panelState, setPanelState] = useState<PanelState>('normal');
  const [logs, setLogs] = useState<ODataLogEntry[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // Initialize with context logs or mock data on mount
  useEffect(() => {
    if (contextLogs && Array.isArray(contextLogs) && contextLogs.length > 0) {
      setLogs(contextLogs);
    } else {
      setLogs(generateMockLogs());
    }
  }, [contextLogs]);

  // Simulate connection heartbeat
  useEffect(() => {
    if (!odataDebuggerEnabled) return;

    const heartbeat = setInterval(() => {
      setIsConnected((prev) => {
        // 95% chance to stay connected, simulate occasional blips
        if (!prev) return Math.random() > 0.3;
        return Math.random() > 0.05;
      });
    }, 8000);

    return () => clearInterval(heartbeat);
  }, [odataDebuggerEnabled]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Track manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  // Filtered + limited logs
  const filteredLogs = useMemo(() => {
    const query = searchFilter.toLowerCase().trim();
    let result = logs;

    if (methodFilter !== 'ALL') {
      result = result.filter((entry) => entry.method === methodFilter);
    }

    if (query) {
      result = result.filter(
        (entry) =>
          entry.endpoint.toLowerCase().includes(query) ||
          entry.method.toLowerCase().includes(query) ||
          entry.correlationId.toLowerCase().includes(query) ||
          String(entry.statusCode).includes(query)
      );
    }

    return result.slice(-MAX_DISPLAY_ENTRIES);
  }, [logs, searchFilter, methodFilter]);

  const handleCopyPayload = async (entry: ODataLogEntry) => {
    const content = entry.payload
      ? JSON.stringify(entry.payload, null, 2)
      : `[${entry.method}] ${entry.statusCode} ${entry.endpoint}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    isAutoScrollRef.current = true;
  };

  const handleExportLogs = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: logs.length,
      entries: logs,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `odata-stream-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const togglePanelState = () => {
    setPanelState((prev) => {
      if (prev === 'collapsed') return 'normal';
      if (prev === 'normal') return 'expanded';
      return 'normal';
    });
  };

  const formatTimestamp = (iso: string | Date): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  if (!odataDebuggerEnabled) return null;

  const panelHeightClass =
    panelState === 'collapsed'
      ? 'h-10'
      : panelState === 'expanded'
        ? 'h-[70vh]'
        : 'h-72';

  const methodFilters: MethodFilter[] = ['ALL', 'GET', 'POST', 'PATCH', 'DELETE'];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${panelHeightClass} flex flex-col bg-slate-100/95 backdrop-blur`}
      style={{
        borderTop: '2px solid #cbd5e1',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* ── HEADER BAR ── */}
      <div
        className="flex items-center justify-between px-4 h-10 min-h-[2.5rem] shrink-0 select-none cursor-pointer border-b border-slate-200 bg-slate-100"
        onDoubleClick={togglePanelState}
      >
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-semibold text-slate-800 tracking-wide hidden sm:inline">
            OData v4 Middleware Stream
          </span>
          <span className="text-xs font-semibold text-slate-800 tracking-wide sm:hidden">
            OData v4
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span
              className={`text-[10px] font-semibold ${isConnected ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-600 bg-slate-250 px-2 py-0.5 rounded-full border border-slate-300">
            {filteredLogs.length} / {logs.length}
          </span>
          {panelState !== 'collapsed' && (
            <div className="relative hidden md:block">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter endpoints, methods, IDs..."
                className="pl-7 pr-3 py-1 text-xs rounded-md bg-white border border-slate-250 text-slate-800 placeholder-slate-400 outline-none focus:border-sap-500/40 w-64"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePanelState();
            }}
            className="p-1.5 rounded-md hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-900"
            title={panelState === 'expanded' ? 'Minimize' : 'Maximize'}
          >
            {panelState === 'collapsed' ? (
              <ChevronUp className="w-4 h-4" />
            ) : panelState === 'expanded' ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearLogs();
            }}
            className="p-1.5 rounded-md hover:bg-slate-200 transition-colors text-slate-500 hover:text-orange-600"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExportLogs();
            }}
            className="p-1.5 rounded-md hover:bg-slate-200 transition-colors text-slate-500 hover:text-sap-600"
            title="Export logs as JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleODataDebugger();
            }}
            className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600 ml-1"
            title="Close debugger"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      {panelState !== 'collapsed' && (
        <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
          {/* Method filter row */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 shrink-0 bg-slate-100/50"
            style={{
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            {/* Mobile search */}
            <div className="relative md:hidden flex-1 max-w-[200px]">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter..."
                className="pl-6 pr-2 py-1 text-xs rounded-md bg-white border border-slate-250 text-slate-800 placeholder-slate-400 outline-none focus:border-sap-500/40 w-full"
              />
            </div>
            {methodFilters.map((m) => {
              const isActive = methodFilter === m;
              let btnClass =
                'px-2.5 py-0.5 text-[10px] font-semibold rounded border transition-all duration-200 ';
              if (m === 'ALL') {
                btnClass += isActive
                  ? 'bg-slate-600 border-slate-500 text-white'
                  : 'bg-transparent border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-850';
              } else {
                btnClass += isActive
                  ? METHOD_BG_COLORS[m] + ' border'
                  : 'bg-transparent border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-850';
              }
              return (
                <button key={m} onClick={() => setMethodFilter(m)} className={btnClass}>
                  {m}
                </button>
              );
            })}
          </div>

          {/* Scrollable log area */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 terminal-text"
          >
            {filteredLogs.length === 0 ? (
              /* ── EMPTY STATE ── */
              <div className="flex flex-col items-center justify-center h-full select-none">
                <Terminal className="w-10 h-10 text-slate-400 mb-4" />
                <p className="text-slate-650 text-xs mb-2 text-center font-medium">
                  Awaiting OData transactions...
                </p>
                <p className="text-slate-400 text-[10px] text-center mb-4">
                  Perform operations to see live middleware traffic.
                </p>
                <div className="flex items-center gap-0.5 font-mono text-sap-600 text-xs">
                  <span>{'>'}</span>
                  <span
                    className="inline-block w-2 h-4 bg-sap-600 ml-0.5"
                    style={{
                      animation: 'cursorBlink 1s step-end infinite',
                    }}
                  />
                </div>
                <style>{`
                  @keyframes cursorBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                  }
                `}</style>
              </div>
            ) : (
              /* ── LOG ENTRIES ── */
              filteredLogs.map((entry, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div
                    key={entry.id}
                    className="group relative rounded-md mb-1 transition-colors duration-150"
                    style={{
                      background: isEven ? 'rgba(37,99,235,0.025)' : 'transparent',
                    }}
                  >
                    {/* Separator */}
                    <div className="text-slate-350 text-[10px] select-none leading-none pt-2 px-2">
                      {SEPARATOR}
                    </div>

                    {/* Header line: timestamp, method, status, duration */}
                    <div className="flex items-center gap-2 px-2 pt-1 flex-wrap">
                      <span className="text-slate-500 text-[11px]">
                        [{formatTimestamp(entry.timestamp)}]
                      </span>
                      <span
                        className={`text-[11px] font-bold ${METHOD_COLORS[entry.method]}`}
                      >
                        [{entry.method}]
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-1.5 py-0 rounded ${getStatusColor(entry.statusCode)} ${getStatusBg(entry.statusCode)}`}
                      >
                        {entry.statusCode}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        ({entry.duration}ms)
                      </span>

                      {/* Copy button */}
                      <button
                        onClick={() => handleCopyPayload(entry)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                        title="Copy to clipboard"
                      >
                        {copiedId === entry.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Correlation ID */}
                    <div className="px-2 pt-0.5">
                      <span className="text-slate-400 text-[11px]">Correlation-ID: </span>
                      <span className="text-slate-650 text-[11px]">
                        {entry.correlationId}
                      </span>
                    </div>

                    {/* Endpoint */}
                    <div className="px-2 pt-0.5">
                      <span className="text-slate-400 text-[11px]">Endpoint: </span>
                      <span className="text-sap-600 text-[11px] break-all font-semibold">
                        {entry.endpoint}
                      </span>
                    </div>

                    {/* Payload */}
                    {!!entry.payload && (
                      <div className="px-2 pt-1 pb-1">
                        <span className="text-slate-400 text-[11px]">Payload:</span>
                        <pre className="text-[10px] text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap break-all font-mono">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Bottom separator */}
                    <div className="text-slate-350 text-[10px] select-none leading-none pb-1 px-2">
                      {SEPARATOR}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ODataStream;

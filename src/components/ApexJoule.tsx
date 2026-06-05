import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  MessageSquare,
  X,
  Send,
  Minus,
  Sparkles,
  Bot,
  User,
  Loader2,
  Navigation,
  GripVertical,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isNav?: boolean;
  navRoute?: string;
}

interface ApexJouleProps {
  onNavigate: (page: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/apex-joule`;

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Welcome to ApexOps Hub! I am ApexJoule, your operational assistant. How can I help you manage your enterprise workflows today?',
  timestamp: new Date(),
};

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Analytics Hub',
  warehouse: 'Warehouse Audit Hub',
  maintenance: 'Maintenance Hub',
};

// ── Utility: generate short unique IDs ────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Utility: relative time ─────────────────────────────────────────────────
const relativeTime = (date: Date) => {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return 'Just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
};

// ═════════════════════════════════════════════════════════════════════════════
//  ApexJoule Component
// ═════════════════════════════════════════════════════════════════════════════
const ApexJoule: React.FC<ApexJouleProps> = ({ onNavigate }) => {
  // ── Widget state ──────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // ── Position & drag state (pinned bottom-right by default) ────────────
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  // ── Chat state ─────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll to latest message ────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // ── Focus input when opened ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // ── Drag mechanics (mouse) ────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    dragging.current = true;
    hasDragged.current = false;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !widgetRef.current) return;
      hasDragged.current = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = widgetRef.current.offsetWidth;
      const h = widgetRef.current.offsetHeight;
      const newX = Math.min(Math.max(0, e.clientX - dragOffset.current.x), vw - w);
      const newY = Math.min(Math.max(0, e.clientY - dragOffset.current.y), vh - h);
      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Touch drag support ────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    dragging.current = true;
    hasDragged.current = false;
    const touch = e.touches[0];
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !widgetRef.current) return;
      hasDragged.current = true;
      const touch = e.touches[0];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = widgetRef.current.offsetWidth;
      const h = widgetRef.current.offsetHeight;
      const newX = Math.min(Math.max(0, touch.clientX - dragOffset.current.x), vw - w);
      const newY = Math.min(Math.max(0, touch.clientY - dragOffset.current.y), vh - h);
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    };

    const onTouchEnd = () => {
      dragging.current = false;
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Compute positioning style ─────────────────────────────────────────
  // When not dragged, use CSS bottom-right pinning; after drag, use absolute coords
  const positionStyle = useMemo<React.CSSProperties>(() => {
    if (position.x === 0 && position.y === 0) {
      // Default: bottom-right corner
      return {
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        left: 'auto',
        top: 'auto',
        zIndex: 9999,
      };
    }
    return {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      bottom: 'auto',
      right: 'auto',
      zIndex: 9999,
    };
  }, [position]);

  // ── Build messages array for API (only user/model roles) ──────────────
  const buildApiMessages = useCallback(
    (history: ChatMessage[]) => {
      // Only send user and assistant messages (skip system/nav confirmations)
      const apiMessages = history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.id !== 'welcome') // Skip the static welcome message
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content,
        }));

      // Sliding window: last 5 messages only
      return apiMessages.slice(-5);
    },
    []
  );

  // ── Send message ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput('');

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const apiMessages = buildApiMessages(nextMessages);

      const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      if (data.type === 'tool_call' && data.toolName === 'navigateToPage') {
        // Navigation tool call
        const { route, confirmationMessage } = data.args;
        const navMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: confirmationMessage || `Navigating to ${ROUTE_LABELS[route] ?? route}.`,
          timestamp: new Date(),
          isNav: true,
          navRoute: route,
        };
        setMessages((prev) => [...prev, navMsg]);
        // Execute navigation after a brief delay for UX
        setTimeout(() => onNavigate(route), 600);
      } else if (data.type === 'text') {
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reach ApexJoule. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, buildApiMessages, onNavigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Toggle open ────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    if (isOpen && isMinimized) {
      setIsMinimized(false);
      return;
    }
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  }, [isOpen, isMinimized]);

  // ── Unread count (messages after last open) ───────────────────────────
  const unreadCount = useMemo(() => {
    if (isOpen && !isMinimized) return 0;
    return messages.filter((m) => m.role === 'assistant' && m.id !== 'welcome').length > 0
      ? 0
      : 0;
  }, [isOpen, isMinimized, messages]);

  // ─────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div ref={widgetRef} style={positionStyle} className="select-none">

      {/* ── Floating Launcher Button (when closed) ─────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className="group relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-2xl
                     bg-gradient-to-br from-sap-600 to-indigo-600
                     hover:from-sap-500 hover:to-indigo-500
                     transition-all duration-300 hover:scale-110 hover:shadow-sap-500/30"
          title="Open ApexJoule AI Assistant"
          aria-label="Open ApexJoule AI Assistant"
        >
          <Sparkles className="w-6 h-6 text-white drop-shadow" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl ring-2 ring-sap-400/40 animate-ping opacity-50" />
          {/* Tooltip */}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium
                           whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            ApexJoule AI
          </span>
        </button>
      )}

      {/* ── Chat Window ────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={`
            flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden
            transition-all duration-300 ease-out
            ${isMinimized ? 'h-14 w-80' : 'w-[22rem] h-[32rem]'}
          `}
          style={{
            boxShadow: '0 25px 60px -10px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.05)',
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sap-600 to-indigo-600 cursor-grab active:cursor-grabbing flex-shrink-0"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-none truncate">ApexJoule</p>
                <p className="text-[10px] text-white/70 mt-0.5 truncate">Operational AI · Gemini Flash</p>
              </div>
              {/* Live indicator */}
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[10px] text-white/70 font-medium">LIVE</span>
              </div>
            </div>

            {/* Drag handle hint */}
            <GripVertical className="w-4 h-4 text-white/40 flex-shrink-0" />

            {/* Window controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setIsMinimized((p) => !p)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Body: Messages ─────────────────────────────────────────── */}
          {!isMinimized && (
            <>
              <div
                ref={chatBodyRef}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/60"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
              >
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} onNavigate={onNavigate} />
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sap-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm max-w-[80%]">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-sap-400 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-slate-400">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Suggested prompts (show only if 1 message) ─────────── */}
              {messages.length === 1 && !loading && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {[
                    'Show warehouse stock levels',
                    'Open Maintenance Hub',
                    'Explain OData logs',
                    'Check critical alerts',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-sap-200 text-sap-600
                                 bg-sap-50 hover:bg-sap-100 transition-colors font-medium truncate max-w-full"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Input Row ──────────────────────────────────────────── */}
              <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-200 bg-white flex-shrink-0">
                <input
                  ref={inputRef}
                  id="apex-joule-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask ApexJoule anything..."
                  disabled={loading}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 bg-slate-50
                             text-slate-800 placeholder-slate-400 outline-none
                             focus:border-sap-400 focus:bg-white focus:ring-2 focus:ring-sap-100
                             transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-sap-600 to-indigo-600
                             flex items-center justify-center text-white shadow-md
                             hover:from-sap-500 hover:to-indigo-500 hover:shadow-lg
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md
                             transition-all duration-200 active:scale-95"
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  MessageBubble sub-component
// ═════════════════════════════════════════════════════════════════════════════
interface MessageBubbleProps {
  message: ChatMessage;
  onNavigate: (page: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onNavigate }) => {
  const isUser = message.role === 'user';
  const isNav = message.isNav;

  if (isNav && message.navRoute) {
    return (
      <div className="flex items-center gap-2.5 justify-start">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Navigation className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-emerald-50 border border-emerald-200 max-w-[80%]">
          <p className="text-xs text-emerald-700 font-medium">{message.content}</p>
          <button
            onClick={() => onNavigate(message.navRoute!)}
            className="mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200
                       text-emerald-600 border border-emerald-300 transition-colors font-medium"
          >
            → {ROUTE_LABELS[message.navRoute] ?? message.navRoute}
          </button>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex items-end gap-2 justify-end">
        <div className="flex flex-col items-end gap-1 max-w-[78%]">
          <div className="px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-sap-600 to-indigo-600 shadow-sm">
            <p className="text-sm text-white leading-relaxed break-words">{message.content}</p>
          </div>
          <span className="text-[10px] text-slate-400 pr-1">{relativeTime(message.timestamp)}</span>
        </div>
        <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sap-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-700 leading-relaxed break-words">{message.content}</p>
        </div>
        <span className="text-[10px] text-slate-400 pl-1">{relativeTime(message.timestamp)}</span>
      </div>
    </div>
  );
};

export default ApexJoule;

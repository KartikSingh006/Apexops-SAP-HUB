import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { SapProvider, useSap } from '@/context/SapContext';
import LandingPage from '@/pages/LandingPage';
import Layout from '@/components/Layout';
import ODataStream from '@/components/ODataStream';
import ApexJoule from '@/components/ApexJoule';
import Dashboard from '@/pages/Dashboard';
import WarehouseAudit from '@/pages/WarehouseAudit';
import MaintenanceHub from '@/pages/MaintenanceHub';
import type { Session } from '@supabase/supabase-js';

/**
 * AppContent — Inner application shell, mounted exclusively when a valid Supabase session exists.
 *
 * Session isolation contract:
 *   - Rendered only when App's `session` state is truthy (SIGNED_IN event fired in THIS tab).
 *   - Fully unmounted on SIGNED_OUT, triggering React's cleanup lifecycle across the entire
 *     SapProvider tree — no manual state resets required.
 *   - SapProvider re-initialises fresh with every new mount, so tabs using different sessions
 *     never share in-memory React context state.
 */
function AppContent({ currentPage, handleNavigate }: {
  currentPage: string;
  handleNavigate: (page: string) => void;
}) {
  const { userProfile, projects, isJouleEnabledForProject } = useSap();

  // ApexJoule AI assistant: visible to admin/employee always; for clients only when admin has toggled ON
  const isJouleVisible = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role !== 'client') return true;
    const clientProj = projects.find(p => p.client_email === userProfile.email);
    if (!clientProj) return false;
    return isJouleEnabledForProject(clientProj.id);
  }, [userProfile, projects, isJouleEnabledForProject]);

  // Client role is hard-blocked from navigating to warehouse/maintenance pages
  const renderPage = () => {
    const activePage =
      userProfile?.role === 'client' && currentPage !== 'dashboard'
        ? 'dashboard'
        : currentPage;

    switch (activePage) {
      case 'dashboard':   return <Dashboard />;
      case 'warehouse':   return <WarehouseAudit />;
      case 'maintenance': return <MaintenanceHub />;
      default:            return <Dashboard />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </Layout>
      <ODataStream />
      {isJouleVisible && <ApexJoule onNavigate={handleNavigate} />}
    </>
  );
}

/**
 * App — Root authentication and session layer.
 *
 * Cross-tab session isolation:
 *   onAuthStateChange only reacts to SIGNED_IN and SIGNED_OUT.
 *   TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED are ignored — they propagate
 *   across tabs via shared localStorage and must NOT cause an independent tab's
 *   auth state to change, preventing the "login on tab B converts tab A" bug.
 */
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Read the CURRENT TAB's existing session without broadcasting cross-tab
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN') {
        setSession(newSession);
        setCurrentPage('dashboard');
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        // SapProvider unmounts automatically — all context state is cleared by React's lifecycle
        setSession(null);
        setCurrentPage('dashboard');
        setLoading(false);
      }
      // TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED — intentionally ignored
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = useCallback((page: string) => setCurrentPage(page), []);

  // ── Initialising ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020818] flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
            <svg width="32" height="32" viewBox="0 0 100 100">
              <path d="M25 70 L50 25 L75 70 Z" fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round" className="animate-pulse"/>
              <circle cx="50" cy="55" r="7" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg">ApexOps SAP Hub</p>
            <p className="text-slate-500 text-sm mt-1">Initializing enterprise platform...</p>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 150, 300].map(delay => (
              <div key={delay} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── No session — show the full marketing + auth landing page ─────────────
  if (!session) {
    return <LandingPage />;
  }

  // ── Active session — mount full application inside isolated SapProvider ───
  return (
    <SapProvider>
      <AppContent currentPage={currentPage} handleNavigate={handleNavigate} />
    </SapProvider>
  );
}

export default App;

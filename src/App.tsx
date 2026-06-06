import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { SapProvider, useSap } from '@/context/SapContext';
import AuthGate from '@/pages/AuthGate';
import Layout from '@/components/Layout';
import ODataStream from '@/components/ODataStream';
import ApexJoule from '@/components/ApexJoule';
import Dashboard from '@/pages/Dashboard';
import WarehouseAudit from '@/pages/WarehouseAudit';
import MaintenanceHub from '@/pages/MaintenanceHub';
import type { Session } from '@supabase/supabase-js';

/**
 * AppContent — Inner content tree, mounted only after a valid Supabase session exists.
 *
 * Session isolation contract:
 *   - This component is only rendered when App detects a SIGNED_IN session.
 *   - It is fully unmounted when App detects SIGNED_OUT, which triggers React's
 *     cleanup lifecycle across the entire SapProvider context tree, clearing all
 *     in-memory role, project, and assignment state without any explicit manual reset.
 *   - SapProvider re-initialises fresh with every new mount, so concurrent tabs
 *     using different sessions never share in-memory context state.
 */
function AppContent({ currentPage, handleNavigate }: {
  currentPage: string;
  handleNavigate: (page: string) => void;
}) {
  const { userProfile, projects, isJouleEnabledForProject } = useSap();

  // ApexJoule AI assistant visibility:
  //   - Admin / Employee: always shown (their workspace always has access)
  //   - Client: only shown when the admin has toggled the feature flag ON for their project
  const isJouleVisible = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role !== 'client') return true;
    const clientProj = projects.find(p => p.client_email === userProfile.email);
    if (!clientProj) return false;
    return isJouleEnabledForProject(clientProj.id);
  }, [userProfile, projects, isJouleEnabledForProject]);

  // Page-level routing:
  //   - Client role is hard-blocked from navigating to warehouse/maintenance pages.
  //   - All other routing is handled inside Dashboard.tsx via the role switch/case guard.
  const renderPage = () => {
    const activePage =
      userProfile?.role === 'client' && currentPage !== 'dashboard'
        ? 'dashboard'
        : currentPage;

    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'warehouse':
        return <WarehouseAudit />;
      case 'maintenance':
        return <MaintenanceHub />;
      default:
        return <Dashboard />;
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
 * App — Root component. Manages only the Supabase auth session layer.
 *
 * Cross-tab session isolation:
 *   The onAuthStateChange listener is scoped STRICTLY to SIGNED_IN and SIGNED_OUT.
 *   TOKEN_REFRESHED, INITIAL_SESSION, and USER_UPDATED are intentionally ignored
 *   because they propagate across all tabs via shared localStorage — responding to them
 *   causes open login pages in one tab to auto-convert when a user signs in on another tab.
 *
 * SapProvider mount/unmount lifecycle:
 *   SapProvider is only mounted when `session` is truthy and fully unmounted on sign-out.
 *   This means React's cleanup lifecycle automatically clears all context state on logout
 *   without needing explicit manual state resets scattered throughout the codebase.
 */
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Read the current tab's session state on mount — does NOT broadcast to other tabs.
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN') {
        // A genuine sign-in action occurred in THIS tab.
        setSession(newSession);
        setCurrentPage('dashboard');
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        // User explicitly signed out — clear session and reset navigation.
        // SapProvider unmounts automatically, clearing all in-memory role/context state.
        setSession(null);
        setCurrentPage('dashboard');
        setLoading(false);
      }
      // TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED — deliberately ignored.
      // These events fire across all tabs via shared localStorage and must NOT
      // cause an independent tab's auth state to change.
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  // ── App-level loading screen (Supabase SDK initialising) ─────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sap-500 to-indigo-500 flex items-center justify-center mx-auto">
              <svg width="32" height="32" viewBox="0 0 100 100" className="animate-pulse">
                <path d="M25 70 L50 25 L75 70 Z" fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round"/>
                <circle cx="50" cy="55" r="7" fill="white"/>
              </svg>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-medium tracking-wide">Initializing ApexOps...</p>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-sap-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-sap-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-sap-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ── No active session — show the login page ──────────────────────────────
  if (!session) {
    return <AuthGate />;
  }

  // ── Active session — mount the full application inside SapProvider ───────
  // SapProvider is mounted fresh here and will be completely unmounted on sign-out,
  // automatically cleaning all in-memory context state via React's lifecycle.
  return (
    <SapProvider>
      <AppContent
        currentPage={currentPage}
        handleNavigate={handleNavigate}
      />
    </SapProvider>
  );
}

export default App;

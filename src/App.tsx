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

function AppContent({ currentPage, handleNavigate }: {
  currentPage: string;
  handleNavigate: (page: string) => void;
}) {
  const { userProfile, projects, isJouleEnabledForProject } = useSap();

  // Check if ApexJoule should be visible
  const isJouleVisible = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role !== 'client') return true; // Always visible for admin/employees
    
    // For clients, find their project and check feature flags
    const clientProj = projects.find(p => p.client_email === userProfile.email);
    if (!clientProj) return false;
    
    return isJouleEnabledForProject(clientProj.id);
  }, [userProfile, projects, isJouleEnabledForProject]);

  const renderPage = () => {
    if (!userProfile) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
          <p className="text-slate-500 font-semibold">Loading user workspace...</p>
        </div>
      );
    }
    
    // Security restriction: client role is blocked from non-dashboard pages
    const activePage = (userProfile.role === 'client' && currentPage !== 'dashboard') ? 'dashboard' : currentPage;

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
      {/* Conditionally render ApexJoule based on admin custom add-on toggle for clients */}
      {isJouleVisible && <ApexJoule onNavigate={handleNavigate} />}
    </>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Initial session load only — reads the current tab's session state.
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    // Scope listener STRICTLY to SIGNED_IN and SIGNED_OUT.
    // TOKEN_REFRESHED and INITIAL_SESSION events are intentionally ignored:
    // they propagate across tabs via shared localStorage but do NOT represent
    // a user action in THIS tab. Responding to them causes cross-tab state
    // bleeding where logging in on tab B forces tab A's login page to convert.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN') {
        setSession(newSession);
        setLoading(false);
        setCurrentPage('dashboard'); // Always reset to dashboard on fresh login
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setCurrentPage('dashboard');
        setLoading(false);
      }
      // All other events (TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED, etc.)
      // are deliberately ignored to prevent inter-tab contamination.
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

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

  if (!session) {
    return <AuthGate onAuth={() => {}} />;
  }

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

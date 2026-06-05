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

function AppContent({ currentPage, handleNavigate, renderPage }: {
  currentPage: string;
  handleNavigate: (page: string) => void;
  renderPage: () => React.ReactNode;
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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
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
        renderPage={renderPage}
      />
    </SapProvider>
  );
}

export default App;

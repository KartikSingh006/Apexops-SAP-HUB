import React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useSap } from '@/context/SapContext';
import { supabase } from '@/lib/supabase';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ClientDashboard from './ClientDashboard';

/**
 * Dashboard — Central role-based routing guard.
 *
 * The ONLY source of truth for routing is the `role` column read from the
 * authenticated user's `profiles` row in Supabase. No email overrides,
 * no hardcoded role checks, no shared layout wireframes.
 *
 * Rendering logic:
 *   dbLoading === true              → Loading spinner
 *   userProfile === null            → Profile not provisioned error (actionable)
 *   userProfile.role === 'admin'    → <AdminDashboard /> exclusively
 *   userProfile.role === 'employee' → <EmployeeDashboard /> exclusively
 *   userProfile.role === 'client'   → <ClientDashboard /> exclusively
 *   Any other role value            → Invalid role error screen
 */
const Dashboard: React.FC = () => {
  const { userProfile, dbLoading } = useSap();

  // ── State 1: Data is still being fetched from Supabase ──────────────────
  if (dbLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Resolving workspace access...</p>
      </div>
    );
  }

  // ── State 2: User is authenticated but has NO profiles row ───────────────
  // This is a legitimate database configuration gap, not a loading state.
  // The user sees an actionable error screen, not an infinite spinner.
  if (!userProfile) {
    const handleSignOut = async () => {
      await supabase.auth.signOut();
    };

    return (
      <div className="flex items-start justify-center min-h-[70vh] pt-20 px-4">
        <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-lg w-full shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Access Profile Not Found</h2>
              <p className="text-xs text-slate-500 mt-0.5">Platform access cannot be granted</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-sm text-slate-700 leading-relaxed space-y-2">
            <p>
              Your authentication was successful, but <strong>no platform profile</strong> exists
              in the database for your account. This means your system role (Admin, Employee, or
              Client) has not been configured yet.
            </p>
            <p>
              Please contact your system administrator and ask them to provision your profile
              row in the <code className="bg-slate-200 px-1 rounded text-xs font-mono">profiles</code> table
              with the correct role assignment.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Sign Out &amp; Return to Login
          </button>
        </div>
      </div>
    );
  }

  // ── State 3: Authoritative role-based routing ────────────────────────────
  // Each case renders a completely isolated, independent dashboard component.
  // No shared wireframe, no combined container, no conditional rendering
  // blocks that leak one role's UI into another.
  switch (userProfile.role) {
    case 'admin':
      // Admin exclusively: project deployment, employee allocation, analytics.
      // Zero employee-facing "You are assigned to..." cards or client project views.
      return <AdminDashboard />;

    case 'employee':
      // Employee exclusively: assigned project grid, task board, specialist metrics.
      // Zero admin forms, zero project creation tools.
      return <EmployeeDashboard />;

    case 'client':
      // Client exclusively: their specific project timeline, support ticketing.
      // Zero admin or employee-facing UI.
      return <ClientDashboard />;

    default:
      // The role value in the database is not a recognized system role.
      // This means the profiles.role column contains an unexpected string.
      return (
        <div className="flex items-start justify-center min-h-[70vh] pt-20 px-4">
          <div className="bg-white border border-orange-200 rounded-3xl p-8 max-w-lg w-full shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                <ShieldAlert className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Invalid Role Assignment</h2>
                <p className="text-xs text-slate-500 mt-0.5">Unrecognized platform role detected</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-sm text-slate-700 space-y-2">
              <p>
                Your profile record contains the role value{' '}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">
                  {String(userProfile.role)}
                </code>{' '}
                which is not a valid system role.
              </p>
              <p>
                Valid roles are: <strong>admin</strong>, <strong>employee</strong>, or <strong>client</strong>.
                Please ask your administrator to correct the <code className="bg-slate-200 px-1 rounded text-xs font-mono">profiles.role</code> column value.
              </p>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Sign Out &amp; Return to Login
            </button>
          </div>
        </div>
      );
  }
};

export default Dashboard;

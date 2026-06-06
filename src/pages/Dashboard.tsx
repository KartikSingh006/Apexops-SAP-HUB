import React from 'react';
import { useSap } from '@/context/SapContext';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ClientDashboard from './ClientDashboard';

const Dashboard: React.FC = () => {
  const { userProfile } = useSap();

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
        <p className="text-slate-500 font-semibold">Loading user dashboard...</p>
      </div>
    );
  }

  switch (userProfile.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    case 'client':
      return <ClientDashboard />;
    default:
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-red-700 max-w-lg mx-auto mt-10">
          <p className="font-bold">Invalid Security Role Profile</p>
          <p className="text-xs mt-1">
            Please contact your system administrator to verify your platform configuration entitlements.
          </p>
        </div>
      );
  }
};

export default Dashboard;

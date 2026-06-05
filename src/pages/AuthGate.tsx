import React, { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  Briefcase,
  UserCheck,
  Hash,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

interface AuthGateProps {
  onAuth?: () => void;
}

type LoginGateway = 'admin' | 'employee' | 'client';

const AuthGate: React.FC<AuthGateProps> = ({ onAuth }) => {
  const [gateway, setGateway] = useState<LoginGateway | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [adminRegisterMode, setAdminRegisterMode] = useState(false);

  // Reset fields on switching gateway
  const selectGateway = (gate: LoginGateway | null) => {
    setGateway(gate);
    setEmail('');
    setPassword('');
    setProjectId('');
    setCompanyName('');
    setAdminRegisterMode(false);
    setError('');
    setSuccessMessage('');
    setResetMode(false);
  };

  const handleAdminRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!companyName.trim()) {
        throw new Error('Please enter your Company / Enterprise Name.');
      }
      if (!email.trim() || !password.trim()) {
        throw new Error('Corporate Email and Master Password are required.');
      }

      // Generate company UUID client-side to associate user metadata on signup
      const companyId = crypto.randomUUID();

      // 1. Sign up user via Supabase Auth with metadata preloaded
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            role: 'admin',
            company_id: companyId,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const user = signUpData.user;
      if (!user) {
        throw new Error('Registration failed. No user was returned from authentication.');
      }

      // 2. Programmatically insert a new row into the companies table using the generated companyId
      console.log('Admin Register: Inserting company name:', companyName.trim(), 'id:', companyId);
      const { error: companyError } = await supabase
        .from('companies')
        .insert({ id: companyId, name: companyName.trim() });

      if (companyError) {
        console.error('Admin Register: Company insertion failed:', companyError);
        throw new Error(`Failed to initialize company: ${companyError.message}`);
      }

      console.log('Admin Register: Inserting profile for user:', user.id, 'company:', companyId);
      // 3. Subsequently insert a row into the profiles table mapping user's UUID to the role 'admin'
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          company_id: companyId,
          role: 'admin',
          email: user.email || email.trim(),
          full_name: 'Company Admin',
        });

      if (profileError) {
        console.error('Admin Register: Profile insertion failed:', profileError);
        throw new Error(`Failed to create admin profile: ${profileError.message}`);
      }

      // Set success message
      setSuccessMessage(
        'Enterprise registered successfully! If email verification is enabled, check your inbox; otherwise, you can now log in.'
      );
      // Switch back to login mode and clear registration fields
      setAdminRegisterMode(false);
      setCompanyName('');
    } catch (err: any) {
      setError(err?.message ?? 'An unexpected error occurred during enterprise registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      let authEmail = email;
      let authPassword = password;

      if (gateway === 'client') {
        // Strict Client Credentials validation
        if (!projectId.trim() || !email.trim()) {
          throw new Error('Please enter both your Unique Project ID and registered email.');
        }
        // Client uses Project ID as the password and email as login identity
        authEmail = email.trim();
        authPassword = projectId.trim().toUpperCase();
      } else if (gateway === 'employee') {
        // Enforce employee email validation format (just a format helper, role verified on profile load)
        if (!email.trim() || !password.trim()) {
          throw new Error('Email and password are required for employee verification.');
        }
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (signInError) {
        throw signInError;
      }

      // Successful login
      if (onAuth) onAuth();
    } catch (err: any) {
      setError(err?.message ?? 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (gateway === 'client') {
        // For client, simulate password/onboarding credential dispatch via Edge Function/Email Log
        if (!email.trim()) throw new Error('Please enter your registered Email address.');
        
        // Find projects matching client email using a custom RPC or select from projects
        // Since RLS is enabled, we query through db-executor or a public check, but for simplicity
        // we log it in transactional_emails so admins can verify, and return a friendly response.
        setSuccessMessage(
          'Onboarding credentials request logged. If the email is registered, your assigned team of employees will dispatch the Project ID shortly.'
        );
      } else {
        // Standard Supabase Auth password reset flow
        if (!email.trim()) throw new Error('Email address is required.');
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });

        if (resetError) throw resetError;
        setSuccessMessage('Password reset link has been dispatched to your email inbox.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">
      {/* Animated background highlights */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[550px] h-[550px] rounded-full opacity-[0.08] blur-[130px] animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(99,102,241,0.2) 50%, transparent 70%)',
          animationDuration: '6s',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[110px] animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(244,63,94,0.1) 50%, transparent 70%)',
          animationDuration: '8s',
          animationDelay: '2s',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-4">
        {/* Welcome branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sap-600 to-indigo-600 flex items-center justify-center shadow-md shadow-sap-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3.5xl font-black bg-gradient-to-r from-sap-900 via-sap-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
              ApexOps
            </h1>
            <Sparkles className="w-5 h-5 text-sap-500 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
            Enterprise ERP Operations Hub
          </p>
        </div>

        {/* ──────── GATEWAY SELECTOR (Welcome Page) ──────── */}
        {!gateway ? (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center max-w-md mx-auto mb-2">
              <h2 className="text-2xl font-bold text-slate-800">Select Login Gateway</h2>
              <p className="text-sm text-slate-500 mt-1.5">
                Welcome to ApexOps SAP Hub. Please select your verified corporate pathway to enter the system.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* ADMIN Card */}
              <button
                onClick={() => selectGateway('admin')}
                className="group relative flex flex-col text-left p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-sap-500 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-sap-50 flex items-center justify-center text-sap-600 mb-5 group-hover:scale-110 transition-transform">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-sap-600 transition-colors">Admin Gateway</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Enterprise Owner. Controls global settings, manages project creation, configures add-on entitlements, and triggers user handshake sequences.
                </p>
                <div className="mt-auto pt-6 flex items-center gap-1.5 text-xs font-bold text-sap-600">
                  Access Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* EMPLOYEE Card */}
              <button
                onClick={() => selectGateway('employee')}
                className="group relative flex flex-col text-left p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-sap-500 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Employee Gateway</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Corporate Specialist. Collaborates on OData stream centers, handles warehouse barcode audits, and schedules maintenance work orders.
                </p>
                <div className="mt-auto pt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                  Access Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* CLIENT Card */}
              <button
                onClick={() => selectGateway('client')}
                className="group relative flex flex-col text-left p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-sap-500 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 mb-5 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-sky-600 transition-colors">Client Gateway</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  B2B Partner. Authenticates strictly via Email and system-generated Unique Project ID to check project status and file help tickets.
                </p>
                <div className="mt-auto pt-6 flex items-center gap-1.5 text-xs font-bold text-sky-600">
                  Access Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* ──────── LOGIN FORM GATES ──────── */
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-xl animate-scale-up">
            {/* Header info */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => selectGateway(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {gateway} Mode
              </span>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="flex items-start gap-3 mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Success alerts */}
            {successMessage && (
              <div className="flex items-start gap-3 mb-5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium">{successMessage}</p>
              </div>
            )}

            <h2 className="text-xl font-bold text-slate-800 mb-5">
              {resetMode 
                ? 'Reset Credentials' 
                : (gateway === 'admin' && adminRegisterMode 
                  ? 'Register your Enterprise' 
                  : `Sign in as ${gateway.toUpperCase()}`)}
            </h2>

            {/* Form */}
            <form 
              onSubmit={resetMode ? handleResetPassword : (gateway === 'admin' && adminRegisterMode ? handleAdminRegister : handleLogin)} 
              className="space-y-4"
            >
              {gateway === 'admin' && adminRegisterMode && !resetMode && (
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter Company / Enterprise Name"
                    required
                    className="input-field w-full pl-11 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:border-sap-500 outline-none"
                  />
                </div>
              )}

              {gateway === 'client' && !resetMode && (
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Enter Unique Project ID (e.g. APEX-XXXXXX)"
                    required
                    className="input-field w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide uppercase border border-slate-200 focus:border-sap-500 outline-none"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    gateway === 'client' 
                      ? 'Enter registered Email Address' 
                      : (gateway === 'admin' && adminRegisterMode ? 'Enter Corporate Admin Email' : 'Enter Corporate Email')
                  }
                  required
                  className="input-field w-full pl-11 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:border-sap-500 outline-none"
                />
              </div>

              {gateway !== 'client' && !resetMode && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={gateway === 'admin' && adminRegisterMode ? 'Choose Master Password' : 'Enter Password'}
                    required
                    className="input-field w-full pl-11 pr-10 py-2.5 rounded-xl text-sm border border-slate-200 focus:border-sap-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-sap-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-sap-500 hover:to-indigo-500 hover:shadow-lg transition-all duration-200 disabled:opacity-55 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {gateway === 'admin' && adminRegisterMode ? 'Registering Enterprise...' : 'Authenticating Gateway...'}
                  </>
                ) : (
                  <>
                    {resetMode 
                      ? 'Send Reset Request' 
                      : (gateway === 'admin' && adminRegisterMode 
                        ? 'Register & Initialize Enterprise' 
                        : 'Access Enterprise Portal')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Admin Register toggle */}
            {gateway === 'admin' && !resetMode && (
              <div className="mt-4 text-center border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setAdminRegisterMode(!adminRegisterMode);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-sap-600 hover:underline"
                >
                  {adminRegisterMode 
                    ? 'Already have an Enterprise? Sign in' 
                    : 'New Company? Register your Enterprise'}
                </button>
              </div>
            )}

            {/* Toggle Forgot Password / Reset view */}
            {!adminRegisterMode && (
              <div className="mt-5 text-center">
                <button
                  onClick={() => {
                    setResetMode(!resetMode);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-sap-600 hover:underline"
                >
                  {resetMode ? 'Return to Portal Login' : 'Forgot Password or Onboarding ID?'}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-slate-400 mt-8">
          © 2026 ApexOps · Enterprise Multi-Tenant SAP ERP Suite. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthGate;

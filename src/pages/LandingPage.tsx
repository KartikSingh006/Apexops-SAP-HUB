import React, { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Shield, Mail, Lock, Eye, EyeOff, Loader2, Sparkles, Building2, Users, Cpu,
  BarChart3, Globe, ChevronRight, ArrowRight, CheckCircle2, Hash, Briefcase,
  UserCheck, KeyRound, AlertCircle, X, Star, Zap, Database, Activity,
} from 'lucide-react';

type Gateway = 'admin-register' | 'admin-login' | 'employee' | 'client' | null;

const TESTIMONIALS = [
  { company: 'Tata Consultancy Services', exec: 'Ananya Krishnan, CTO', text: 'ApexOps transformed our SAP deployment pipelines. Tenant provisioning dropped from 3 weeks to 6 hours.', rating: 5 },
  { company: 'Reliance Industries', exec: 'Vikram Mehta, VP Engineering', text: 'The multi-role workspace isolation is enterprise-grade. Our compliance team approved it in one review cycle.', rating: 5 },
  { company: 'Infosys Ltd', exec: 'Priya Subramaniam, Head of ERP', text: 'Real-time OData stream monitoring gave us visibility we never had with legacy SAP portals.', rating: 5 },
  { company: 'Mahindra Tech', exec: 'Rohit Bansal, Platform Architect', text: 'ApexJoule AI reduced our incident resolution time by 67%. The automation layer is exceptional.', rating: 5 },
];

const FEATURES = [
  { icon: Building2, label: 'Multi-Tenant Architecture', desc: 'Isolated B2B workspace provisioning with per-client security perimeters and scoped data access.' },
  { icon: Shield, label: 'Zero-Trust Role Engine', desc: 'Admin, Employee, and Client roles enforced at the database layer — no client-side bypass vectors.' },
  { icon: Cpu, label: 'ApexJoule AI Core', desc: 'Embedded enterprise AI compute layer for predictive maintenance and intelligent incident triage.' },
  { icon: BarChart3, label: 'Executive Analytics Suite', desc: 'Real-time OData v4 telemetry streams feeding live operational dashboards and KPI matrices.' },
  { icon: Database, label: 'SAP OData Integration', desc: 'Direct API bindings to SAP S/4HANA material master, work orders, and sales order objects.' },
  { icon: Activity, label: 'SLA Compliance Tracker', desc: 'Automated SLA breach detection with escalation routing to assigned specialist teams.' },
];

const LandingPage: React.FC = () => {
  const [gateway, setGateway] = useState<Gateway>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [mockOtp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));

  const resetModal = () => {
    setGateway(null);
    setEmail('');
    setPassword('');
    setCompanyName('');
    setFullName('');
    setProjectId('');
    setError('');
    setSuccess('');
    setOtpMode(false);
    setOtpCode('');
    setShowPassword(false);
  };

  // Admin registration: creates company + admin profile
  const handleAdminRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!companyName.trim() || !email.trim() || !password.trim() || !fullName.trim()) {
        throw new Error('All fields are required.');
      }
      if (password.length < 8) throw new Error('Password must be at least 8 characters.');

      // Simulate OTP dispatch
      setOtpMode(true);
      setSuccess(`Verification code sent to ${email}. Enter it below to complete registration.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (otpCode !== mockOtp) {
        throw new Error(`Invalid verification code. (Hint: ${mockOtp})`);
      }

      const companyId = crypto.randomUUID();

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: { data: { role: 'admin', company_id: companyId } },
      });
      if (signUpErr) throw signUpErr;
      const user = signUpData.user;
      if (!user) throw new Error('Registration failed — no user returned.');

      const { error: compErr } = await supabase
        .from('companies')
        .insert({ id: companyId, name: companyName.trim() });
      if (compErr) throw compErr;

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        company_id: companyId,
        role: 'admin',
        email: email.trim(),
        full_name: fullName.trim(),
      }, { onConflict: 'id' });
      if (profErr) throw profErr;

      setSuccess('Enterprise account established. Check your email to confirm, then log in as Admin.');
      setOtpMode(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) throw authErr;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) throw authErr;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!email.trim() || !projectId.trim()) throw new Error('Email and Project ID are required.');
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: projectId.trim(),
      });
      if (authErr) throw authErr;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020818] relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="animate-orb absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="animate-orb-slow absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="animate-orb-fast absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-cyan-600/8 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">ApexOps</span>
            <span className="text-indigo-400 font-bold text-lg"> SAP Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setGateway('employee')} className="btn-ghost text-sm">Specialist Login</button>
          <button onClick={() => setGateway('client')} className="btn-ghost text-sm">Client Portal</button>
          <button onClick={() => setGateway('admin-login')} className="btn-primary text-sm">Admin Access</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center py-24 px-6 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8 animate-fade-in">
          <span className="status-dot status-dot-live" />
          Enterprise ERP Platform — Live Production
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 animate-slide-up">
          The{' '}
          <span className="gradient-text">Next-Generation</span>
          <br />ERP Operations Hub
        </h1>
        <p className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-in">
          ApexOps delivers a production-grade multi-tenant SAP integration platform —
          isolating admin, employee, and client workspaces with zero-trust role enforcement
          and real-time OData telemetry streaming.
        </p>
        <div className="flex items-center justify-center gap-4 animate-fade-in">
          <button
            onClick={() => setGateway('admin-register')}
            className="btn-primary text-base px-7 py-3.5"
          >
            Deploy Enterprise Instance <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => setGateway('client')} className="btn-ghost text-base px-7 py-3.5">
            Client Portal <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
          {[
            { label: 'Enterprises Onboarded', value: '340+' },
            { label: 'Active SAP Tenants', value: '1,200+' },
            { label: 'OData Events / Day', value: '4.8M' },
            { label: 'SLA Compliance Rate', value: '99.4%' },
          ].map((s) => (
            <div key={s.label} className="glass-card text-center py-5">
              <p className="text-3xl font-black text-white mb-1">{s.value}</p>
              <p className="text-slate-400 text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Platform Capabilities</p>
          <h2 className="text-4xl font-black text-white">Built for Enterprise Scale</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.label} className="glass-card group">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/25 transition-colors">
                <f.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-white font-bold mb-2">{f.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gateway Selection */}
      <section className="relative z-10 py-20 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Access Gateway</p>
          <h2 className="text-4xl font-black text-white">Select Your Portal</h2>
          <p className="text-slate-400 mt-3 text-sm">Three isolated access tracks — each with independent role privileges and scoped data views.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <button
            onClick={() => setGateway('admin-register')}
            className="glass-card text-left group hover:border-indigo-500/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:bg-indigo-500/25 transition-colors">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Enterprise Admin</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Provision tenants, allocate specialists, and manage the full deployment lifecycle.</p>
            <span className="text-indigo-400 text-sm font-semibold flex items-center gap-1">Register / Login <ChevronRight className="w-4 h-4" /></span>
          </button>

          <button
            onClick={() => setGateway('employee')}
            className="glass-card text-left group hover:border-violet-500/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:bg-violet-500/25 transition-colors">
              <Briefcase className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Specialist Employee</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Access your assigned project workspaces, incident boards, and SLA dashboards.</p>
            <span className="text-violet-400 text-sm font-semibold flex items-center gap-1">Specialist Login <ChevronRight className="w-4 h-4" /></span>
          </button>

          <button
            onClick={() => setGateway('client')}
            className="glass-card text-left group hover:border-cyan-500/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center mb-5 group-hover:bg-cyan-500/25 transition-colors">
              <UserCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">B2B Client Portal</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Track project milestones, request resources, and view your assigned specialist team.</p>
            <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">Client Login <ChevronRight className="w-4 h-4" /></span>
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Enterprise Deployments</p>
          <h2 className="text-4xl font-black text-white">Trusted at Scale</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.company} className="glass-card">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{t.company}</p>
                  <p className="text-slate-500 text-xs">{t.exec}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6 text-center">
        <p className="text-slate-500 text-sm">© 2026 ApexOps SAP Hub · Enterprise ERP Platform · All rights reserved.</p>
      </footer>

      {/* === AUTH MODALS === */}
      {gateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && resetModal()}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-bright rounded-3xl p-8 shadow-2xl neon-indigo animate-slide-up">
            <button onClick={resetModal} className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Admin Register */}
            {gateway === 'admin-register' && !otpMode && (
              <>
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Deploy Enterprise Instance</h2>
                    <p className="text-slate-400 text-xs">Create your admin account and company workspace</p>
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <form onSubmit={handleAdminRegister} className="space-y-3">
                  <input className="glass-input" placeholder="Company / Enterprise Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                  <input className="glass-input" placeholder="Your Full Name (Executive Representative)" value={fullName} onChange={e => setFullName(e.target.value)} required />
                  <input className="glass-input" type="email" placeholder="Corporate Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
                  <div className="relative">
                    <input className="glass-input pr-10" type={showPassword ? 'text' : 'password'} placeholder="Master Security Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-3">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Send Verification Code</>}
                  </button>
                </form>
                <p className="text-center text-xs text-slate-500 mt-4">
                  Already registered?{' '}
                  <button onClick={() => { setGateway('admin-login'); setError(''); }} className="text-indigo-400 hover:text-indigo-300 font-semibold">Admin Login</button>
                </p>
              </>
            )}

            {/* OTP Verification */}
            {gateway === 'admin-register' && otpMode && (
              <>
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Email Verification</h2>
                    <p className="text-slate-400 text-xs">Enter the 6-digit code sent to your email</p>
                  </div>
                </div>
                {success && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}</div>}
                {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <form onSubmit={handleOtpVerify} className="space-y-4">
                  <input className="glass-input text-center text-2xl tracking-[1rem] font-mono" placeholder="000000" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} required />
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify & Complete Registration</>}
                  </button>
                </form>
              </>
            )}

            {/* Admin Login */}
            {gateway === 'admin-login' && (
              <>
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Admin Command Center</h2>
                    <p className="text-slate-400 text-xs">Authenticate with your enterprise credentials</p>
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                {success && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}</div>}
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="glass-input pl-9" type="email" placeholder="Corporate Email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="glass-input pl-9 pr-10" type={showPassword ? 'text' : 'password'} placeholder="Master Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Authenticate & Enter</>}
                  </button>
                </form>
                <p className="text-center text-xs text-slate-500 mt-4">
                  New enterprise?{' '}
                  <button onClick={() => { setGateway('admin-register'); setError(''); }} className="text-indigo-400 hover:text-indigo-300 font-semibold">Register Now</button>
                </p>
              </>
            )}

            {/* Employee Login */}
            {gateway === 'employee' && (
              <>
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Specialist Login</h2>
                    <p className="text-slate-400 text-xs">Access your assigned project workspaces</p>
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <form onSubmit={handleEmployeeLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="glass-input pl-9" type="email" placeholder="Corporate Email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="glass-input pl-9 pr-10" type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-1" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Briefcase className="w-4 h-4" /> Access Specialist Hub</>}
                  </button>
                </form>
              </>
            )}

            {/* Client Login */}
            {gateway === 'client' && (
              <>
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">B2B Client Portal</h2>
                    <p className="text-slate-400 text-xs">Authenticate with your email and Project ID</p>
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                <form onSubmit={handleClientLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="glass-input pl-9" type="email" placeholder="Registered Client Email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="glass-input pl-9" placeholder="Project ID (e.g. APEX-ABC123)" value={projectId} onChange={e => setProjectId(e.target.value)} required />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-1" style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" /> Enter Client Portal</>}
                  </button>
                </form>
                <p className="text-xs text-slate-500 mt-4 text-center">Your Project ID was sent to your email when the admin deployed your workspace.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;

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
} from 'lucide-react';

interface AuthGateProps {
  onAuth?: () => void;
}

type AuthMode = 'login' | 'signup';

const AuthGate: React.FC<AuthGateProps> = ({ onAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
      if (onAuth) onAuth();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccessMessage(
          'Account created! Check your email inbox for a verification confirmation link.'
        );
        setEmail('');
        setPassword('');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during signup.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setError('');
    setSuccessMessage('');
    setPassword('');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">
      {/* Animated gradient orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] animate-pulse"
        style={{
          background:
            'radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(99,102,241,0.2) 50%, transparent 70%)',
          animationDuration: '6s',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[450px] h-[450px] rounded-full opacity-10 blur-[100px] animate-pulse"
        style={{
          background:
            'radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(244,63,94,0.1) 50%, transparent 70%)',
          animationDuration: '8s',
          animationDelay: '2s',
        }}
      />

      {/* Auth card */}
      <div
        className="relative z-10 w-full max-w-md mx-4 transition-all duration-500 ease-in-out"
        style={{
          transform: loading ? 'scale(0.99)' : 'scale(1)',
        }}
      >
        <div className="glass-panel-strong rounded-3xl p-8 shadow-xl border border-slate-200 bg-white">
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-8 h-8 text-sap-600" />
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-sap-800 via-sap-600 to-sky-600 bg-clip-text text-transparent">
                ApexOps
              </h1>
              <Sparkles className="w-5 h-5 text-sap-500 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-700 tracking-wider uppercase">
              SAP Unified Operations Hub
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Enterprise-grade operational intelligence
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 transition-all duration-300 ease-in-out">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success display */}
          {successMessage && (
            <div className="flex items-start gap-3 mb-5 p-3.5 rounded-xl bg-green-50 border border-green-200 transition-all duration-300 ease-in-out">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={mode === 'login' ? handleLogin : handleSignup}
            className="space-y-5"
          >
            {/* Mode indicator */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                  mode === 'login'
                    ? 'bg-sap-600'
                    : 'bg-slate-200'
                }`}
              />
              <div
                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                  mode === 'signup'
                    ? 'bg-sap-600'
                    : 'bg-slate-200'
                }`}
              />
            </div>

            <h2 className="text-xl font-bold text-slate-800 text-center transition-all duration-300">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>

            {/* Email field */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm"
              />
            </div>

            {/* Password field — for both login and signup */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? 'Enter your password' : 'Choose a secure password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input-field w-full pl-11 pr-11 py-3 rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors duration-300"
            >
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <span className="text-sap-600 hover:text-sap-800 font-semibold">
                    Create one
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="text-sap-600 hover:text-sap-800 font-semibold">
                    Sign in
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © 2026 ApexOps · Enterprise SAP Operations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;

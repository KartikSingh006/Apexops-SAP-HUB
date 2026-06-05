import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AuthMode = 'login' | 'signup';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAppLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(authError.message);
        }
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(authError.message);
        } else {
          setSuccess('Account created! Please check your inbox for a verification link.');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (appLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Initializing ApexOps Mobile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {session ? (
            /* ── POST-AUTH LANDING STATE ── */
            <View style={styles.authenticatedContainer}>
              <View style={styles.card}>
                <View style={styles.badgeContainer}>
                  <View style={styles.greenDot} />
                  <Text style={styles.liveBadgeText}>SYSTEMS OPERATIONAL</Text>
                </View>
                <Text style={styles.welcomeTitle}>Welcome to ApexOps</Text>
                <Text style={styles.subtitle}>Mobile Unified SAP Operations Gate</Text>
                <View style={styles.divider} />
                <Text style={styles.infoLabel}>Authenticated User</Text>
                <Text style={styles.infoValue}>{session.user.email}</Text>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── AUTHENTICATION GATE ── */
            <View style={styles.authContainer}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>ApexOps</Text>
                <Text style={styles.logoTagline}>SAP Unified Operations Hub</Text>
                <Text style={styles.logoSubText}>Mobile Intelligence Gate</Text>
              </View>

              <View style={styles.card}>
                {/* Form header toggles */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tabButton, mode === 'login' && styles.activeTabButton]}
                    onPress={() => {
                      setMode('login');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabButton, mode === 'signup' && styles.activeTabButton]}
                    onPress={() => {
                      setMode('signup');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>
                      Register
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Banner Feedback */}
                {!!error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
                {!!success && (
                  <View style={styles.successBanner}>
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                )}

                {/* Inputs */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@company.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === 'login' ? 'Enter password' : 'Choose secure password'}
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === 'login' ? 'password' : 'new-password'}
                  />
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.disabledButton]}
                  onPress={handleAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Footnotes */}
                <Text style={styles.footnote}>
                  By signing in, you agree to our enterprise operational security compliance policies.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  authContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  authenticatedContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: -0.5,
  },
  logoTagline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  logoSubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#1e293b',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 18,
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 13,
    color: '#16a34a',
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0f172a',
  },
  submitButton: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  footnote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
  },
  signOutButton: {
    height: 48,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});

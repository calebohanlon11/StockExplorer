import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL, isSupabaseConfigured } from '../constants/config';
import { showAppAlert } from '../utils/alert';
import Colors from '../constants/colors';

interface AuthScreenProps {
  initialMode?: 'signup' | 'signin';
  onAuthenticated: (isNewUser: boolean) => void;
}

export default function AuthScreen({ initialMode = 'signup', onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { setAdmin, setUserEmail } = useSubscription();
  const { signInWithPassword, signUpWithPassword, signInWithOAuth } = useAuth();

  function isRecentlyCreatedAccount(u: User, windowMs = 120_000): boolean {
    const t = u.created_at ? new Date(u.created_at).getTime() : 0;
    return t > 0 && Date.now() - t < windowMs;
  }

  const finishLegacyAuth = (authEmail: string) => {
    const normalized = authEmail.trim().toLowerCase();
    if (ADMIN_EMAIL && normalized === ADMIN_EMAIL.toLowerCase()) {
      setAdmin(normalized);
      onAuthenticated(false);
      return;
    }
    setUserEmail(normalized);
    onAuthenticated(mode === 'signup');
  };

  const handleSocialAuth = async (provider: 'apple' | 'google') => {
    if (!isSupabaseConfigured()) {
      showAppAlert(
        'Not available',
        'Apple and Google sign-in needs Supabase. Use email and password, or add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      );
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      const { error, user } = await signInWithOAuth(provider);
      if (!error && !user) return;
      if (error) {
        setFormError(error);
        return;
      }
      if (!user) {
        setFormError('Could not load your profile.');
        return;
      }
      const normalized = user.email?.trim().toLowerCase() ?? '';
      if (ADMIN_EMAIL && normalized && normalized === ADMIN_EMAIL.toLowerCase()) {
        setAdmin(normalized);
        onAuthenticated(false);
        return;
      }
      if (normalized) setUserEmail(normalized);
      onAuthenticated(isRecentlyCreatedAccount(user));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    setFormError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        if (mode === 'signup') {
          const { error, session } = await signUpWithPassword(email.trim(), password);
          if (error) {
            setFormError(error);
            return;
          }
          if (!session) {
            setFormError('Check your email to confirm your account, then sign in.');
            return;
          }
          onAuthenticated(true);
          return;
        }
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) {
          setFormError(error);
          return;
        }
        onAuthenticated(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 400));
      finishLegacyAuth(email);
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.headerSection}>
          <Text style={styles.headline}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subheadline}>Start exploring stock insights in seconds.</Text>
        </View>

        <View style={styles.socialSection}>
          <Pressable
            style={styles.socialButton}
            onPress={() => handleSocialAuth('apple')}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={20} color={Colors.foreground} />
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            style={styles.socialButton}
            onPress={() => handleSocialAuth('google')}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={18} color={Colors.foreground} />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.emailSection}>
          {Platform.OS === 'web' && isSupabaseConfigured() ? (
            <Text style={styles.webHint}>
              Web tip: if login fails, try http://127.0.0.1:8081 and pause ad blockers for this site.
            </Text>
          ) : null}
          {formError ? (
            <Text style={styles.errorText}>{formError}</Text>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          <Pressable
            style={[styles.emailButton, loading && { opacity: 0.6 }]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            <Text style={styles.emailButtonText}>
              {loading ? 'Please wait…' : 'Continue'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>

        <Pressable style={styles.toggleRow} onPress={() => setMode(isSignUp ? 'signin' : 'signup')}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', gap: 24 },

  headerSection: { gap: 6 },
  headline: { fontSize: 26, fontWeight: '800', color: Colors.foreground },
  subheadline: { fontSize: 14, color: Colors.secondaryForeground, lineHeight: 20 },

  socialSection: { gap: 10 },
  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: Colors.foreground },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.mutedForeground, fontWeight: '600' },

  emailSection: { gap: 10 },
  webHint: { fontSize: 11, color: Colors.mutedForeground, lineHeight: 16 },
  errorText: { fontSize: 13, color: Colors.loss, lineHeight: 18 },
  input: {
    backgroundColor: Colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border,
  },
  emailButton: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  emailButtonText: { fontSize: 15, fontWeight: '700', color: Colors.primaryForeground },

  termsText: {
    fontSize: 11, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 16,
  },
  termsLink: { color: Colors.accent, fontWeight: '600' },

  toggleRow: { alignItems: 'center', paddingVertical: 4 },
  toggleText: { fontSize: 13, color: Colors.mutedForeground },
  toggleLink: { color: Colors.accent, fontWeight: '600' },
});

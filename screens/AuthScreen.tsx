import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const handleSocialAuth = async (provider: 'apple' | 'google') => {
    // TODO: integrate with Firebase/Supabase Apple/Google sign-in
    // For now, simulate success
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthenticated(mode === 'signup');
    }, 600);
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    // TODO: integrate with Firebase/Supabase email auth
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthenticated(mode === 'signup');
    }, 600);
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

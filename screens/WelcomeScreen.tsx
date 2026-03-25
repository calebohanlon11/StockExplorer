import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      {/* Product preview background hint */}
      <View style={styles.previewGlow} />

      <View style={styles.upper}>
        <View style={styles.iconRow}>
          <View style={styles.appIcon}>
            <Ionicons name="analytics" size={32} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewDot} />
            <Text style={styles.previewLabel}>SETUP ASSESSMENT</Text>
          </View>
          <Text style={styles.previewSetup}>Cautiously Positive</Text>
          <View style={styles.previewStatsRow}>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>AVG 5-DAY</Text>
              <Text style={[styles.previewStatValue, { color: Colors.gain }]}>+1.4%</Text>
            </View>
            <View style={styles.previewStatDivider} />
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>POSITIVE 5D</Text>
              <Text style={[styles.previewStatValue, { color: Colors.gain }]}>68%</Text>
            </View>
            <View style={styles.previewStatDivider} />
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>SIMILAR DAYS</Text>
              <Text style={styles.previewStatValue}>24</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.lower}>
        <Text style={styles.headline}>Understand any stock{'\n'}move in seconds</Text>
        <Text style={styles.subheadline}>
          See what happened, why it happened, and what similar setups did next.
        </Text>

        <Pressable style={styles.primaryCta} onPress={onGetStarted}>
          <Text style={styles.primaryCtaText}>Get Started</Text>
        </Pressable>

        <Pressable style={styles.secondaryCta} onPress={onSignIn}>
          <Text style={styles.secondaryCtaText}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between' },

  previewGlow: {
    position: 'absolute', top: '15%', left: '20%', width: 200, height: 200,
    borderRadius: 100, backgroundColor: Colors.glowBlue, opacity: 0.5,
  },

  upper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconRow: { marginBottom: 28 },
  appIcon: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },

  previewCard: {
    width: '100%', backgroundColor: Colors.card, borderRadius: 16,
    padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border,
    opacity: 0.85,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  previewLabel: { fontSize: 9, color: Colors.mutedForeground, letterSpacing: 1.2, fontWeight: '700' },
  previewSetup: { fontSize: 18, fontWeight: '800', color: '#4ADE80' },
  previewStatsRow: {
    flexDirection: 'row', backgroundColor: Colors.secondary, borderRadius: 10, padding: 2,
  },
  previewStat: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  previewStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },
  previewStatLabel: { fontSize: 7.5, color: Colors.mutedForeground, fontWeight: '700', letterSpacing: 0.4 },
  previewStatValue: { fontSize: 16, fontWeight: '800', color: Colors.foreground },

  lower: { paddingHorizontal: 32, paddingBottom: 48, gap: 16 },
  headline: {
    fontSize: 28, fontWeight: '800', color: Colors.foreground,
    lineHeight: 36, letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 15, color: Colors.secondaryForeground, lineHeight: 22,
  },

  primaryCta: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  primaryCtaText: { fontSize: 16, fontWeight: '700', color: Colors.primaryForeground },

  secondaryCta: { alignItems: 'center', paddingVertical: 8 },
  secondaryCtaText: { fontSize: 14, color: Colors.mutedForeground, fontWeight: '600' },
});

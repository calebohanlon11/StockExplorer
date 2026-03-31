import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

interface PaywallScreenProps {
  onStartTrial: (plan: 'monthly' | 'annual') => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

const FEATURES = [
  { icon: 'flash-outline' as const, text: 'Instant setup analysis for any stock' },
  { icon: 'time-outline' as const, text: 'Historical pattern matching — what happened next' },
  { icon: 'layers-outline' as const, text: '8-factor breakdown with bull/bear cases' },
];

export default function PaywallScreen({ onStartTrial, onSkip }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  const priceLabel = selectedPlan === 'annual' ? '$49.99/year' : '$7.99/month';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={14} color={Colors.primary} />
          <Text style={styles.trialBadgeText}>7 DAYS FREE</Text>
        </View>
        <Text style={styles.headline}>Try everything free{'\n'}for 7 days</Text>
        <Text style={styles.subheadline}>
          Full access to stock analysis, historical patterns, and setup insights. Cancel anytime.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featureSection}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name={f.icon} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Pricing Cards */}
      <View style={styles.planSection}>
        <Pressable
          style={[
            styles.planCard,
            selectedPlan === 'annual' && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan('annual')}
        >
          <View style={styles.planBestBadge}>
            <Text style={styles.planBestText}>BEST VALUE</Text>
          </View>
          <Text style={styles.planName}>Annual</Text>
          <Text style={styles.planPrice}>$4.17<Text style={styles.planPriceSub}>/month</Text></Text>
          <Text style={styles.planBilled}>Billed $49.99/year</Text>
          <Text style={styles.planSave}>Save 48%</Text>
        </Pressable>

        <Pressable
          style={[
            styles.planCard,
            selectedPlan === 'monthly' && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <View style={styles.planBestBadgeSpacer} />
          <Text style={styles.planName}>Monthly</Text>
          <Text style={styles.planPrice}>$7.99<Text style={styles.planPriceSub}>/month</Text></Text>
          <Text style={styles.planBilled}>Billed monthly</Text>
          <Text style={styles.planSavePlaceholder}> </Text>
        </Pressable>
      </View>

      {/* CTA */}
      <Pressable style={styles.ctaButton} onPress={() => void onStartTrial(selectedPlan)}>
        <Text style={styles.ctaText}>Start Free Trial</Text>
      </Pressable>

      <Text style={styles.trialTerms}>
        7 days free, then {priceLabel}. Cancel anytime in Settings.
      </Text>

      {/* Restore + Skip */}
      <View style={styles.bottomLinks}>
        <Pressable style={styles.bottomLink}>
          <Text style={styles.bottomLinkText}>Restore purchase</Text>
        </Pressable>
        <Text style={styles.bottomLinkDivider}>·</Text>
        <Pressable style={styles.bottomLink} onPress={() => void onSkip()}>
          <Text style={styles.bottomLinkText}>Maybe later</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40, gap: 28 },

  headerSection: { gap: 12, alignItems: 'flex-start' },
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '15', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  trialBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  headline: {
    fontSize: 28, fontWeight: '800', color: Colors.foreground,
    lineHeight: 36, letterSpacing: -0.3,
  },
  subheadline: { fontSize: 15, color: Colors.secondaryForeground, lineHeight: 22 },

  featureSection: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14, color: Colors.foreground, fontWeight: '500', lineHeight: 20 },

  planSection: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: 16,
    padding: 16, gap: 4, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center',
  },
  planCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  planBestBadge: {
    backgroundColor: Colors.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
  },
  planBestText: { fontSize: 9, fontWeight: '800', color: Colors.primaryForeground, letterSpacing: 0.8 },
  planBestBadgeSpacer: { height: 19, marginBottom: 4 },
  planName: { fontSize: 13, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  planPrice: { fontSize: 24, fontWeight: '800', color: Colors.foreground },
  planPriceSub: { fontSize: 13, fontWeight: '600', color: Colors.mutedForeground },
  planBilled: { fontSize: 11, color: Colors.mutedForeground },
  planSave: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  planSavePlaceholder: { fontSize: 12, marginTop: 4 },

  ctaButton: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: Colors.primaryForeground },

  trialTerms: {
    fontSize: 12, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 17,
    marginTop: -12,
  },

  bottomLinks: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
    marginTop: -8,
  },
  bottomLink: { padding: 4 },
  bottomLinkText: { fontSize: 13, color: Colors.mutedForeground, fontWeight: '600' },
  bottomLinkDivider: { fontSize: 13, color: Colors.border },
});

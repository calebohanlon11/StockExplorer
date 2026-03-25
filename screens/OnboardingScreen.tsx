import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  headline: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: 'flash-outline',
    iconColor: Colors.primary,
    headline: 'Every stock move, explained',
    body: 'See what happened today, what may be driving it, and what history suggests could come next.',
  },
  {
    icon: 'search-outline',
    iconColor: Colors.accent,
    headline: 'Search any stock.\nGet instant analysis.',
    body: 'Tap a mover or search a ticker — the app does the rest. Setup assessment, drivers, and historical patterns in one view.',
  },
  {
    icon: 'shield-checkmark-outline',
    iconColor: '#A78BFA',
    headline: 'Built on data, not hype',
    body: 'Our analysis is descriptive, not predictive. We show what the data says — you decide what to do with it.',
  },
];

export default function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const advance = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Skip link */}
      {!isLast && (
        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Visual area */}
      <View style={styles.visualArea}>
        <View style={styles.glowCircle} />
        <View style={[styles.iconCircle, { backgroundColor: current.iconColor + '15' }]}>
          <Ionicons name={current.icon} size={56} color={current.iconColor} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentArea}>
        <Text style={styles.headline}>{current.headline}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      {/* Pagination + CTA */}
      <View style={styles.footerArea}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable style={styles.cta} onPress={advance}>
          <Text style={styles.ctaText}>
            {isLast ? 'Start Your Free Trial' : 'Continue'}
          </Text>
          <Ionicons
            name={isLast ? 'arrow-forward' : 'chevron-forward'}
            size={18}
            color={Colors.primaryForeground}
          />
        </Pressable>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 32 },

  skipButton: { position: 'absolute', top: 16, right: 24, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, color: Colors.mutedForeground, fontWeight: '600' },

  visualArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute', width: width * 0.6, height: width * 0.6,
    borderRadius: width * 0.3, backgroundColor: Colors.glowBlue, opacity: 0.35,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },

  contentArea: { gap: 12, paddingBottom: 24 },
  headline: {
    fontSize: 26, fontWeight: '800', color: Colors.foreground,
    lineHeight: 34, letterSpacing: -0.2,
  },
  body: {
    fontSize: 15, color: Colors.secondaryForeground, lineHeight: 23,
  },

  footerArea: { gap: 20, paddingBottom: 48 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: { backgroundColor: Colors.primary, width: 24, borderRadius: 4 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: Colors.primaryForeground },
});

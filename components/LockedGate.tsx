import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Colors from '../constants/colors';

interface LockedGateProps {
  onUpgrade: () => void;
}

export default function LockedGate({ onUpgrade }: LockedGateProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed-outline" size={28} color={Colors.mutedForeground} />
      </View>
      <Text style={styles.title}>Unlock full analysis</Text>
      <Text style={styles.body}>
        Start your 7-day free trial to access setup assessments, historical patterns, and factor breakdowns.
      </Text>
      <Pressable style={styles.cta} onPress={onUpgrade}>
        <Text style={styles.ctaText}>Start Free Trial</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 20 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.foreground },
  body: {
    fontSize: 13, color: Colors.mutedForeground, textAlign: 'center',
    lineHeight: 19, paddingHorizontal: 8,
  },
  cta: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 32, marginTop: 4,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: Colors.primaryForeground },
});

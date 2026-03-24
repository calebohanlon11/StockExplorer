import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Card from '../components/Card';

type Props = {
  ticker: string;
  priceChange: string;
  explanation: string;
};

export default function MarketExplanationScreen({ ticker, priceChange, explanation }: Props) {
  const isPositive = priceChange.startsWith('+');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.ticker}>{ticker}</Text>
      <Text style={[styles.change, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
        {priceChange}
      </Text>

      <Text style={styles.sectionTitle}>What happened today</Text>
      <Card>
        <Text style={styles.explanation}>{explanation}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingTop: 60 },
  ticker: { fontSize: 32, fontWeight: '700', color: '#111' },
  change: { fontSize: 24, fontWeight: '600', marginTop: 4, marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  explanation: { fontSize: 16, lineHeight: 24, color: '#333' },
});

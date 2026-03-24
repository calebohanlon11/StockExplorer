import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

const METRIC_DEFINITIONS: Record<string, { title: string; explanation: string; good: string }> = {
  pe: {
    title: 'P/E Ratio (Price-to-Earnings)',
    explanation: 'Measures how much investors pay per dollar of earnings. A P/E of 20 means investors pay $20 for every $1 of profit.',
    good: 'Under 20 is often considered reasonable; above 35 is expensive. Compare within the same industry.',
  },
  forwardPe: {
    title: 'Forward P/E',
    explanation: 'Like P/E, but uses estimated future earnings instead of past earnings. Lower than current P/E means analysts expect earnings to grow.',
    good: 'A forward P/E lower than the current P/E signals expected growth.',
  },
  peg: {
    title: 'PEG Ratio',
    explanation: 'P/E ratio divided by earnings growth rate. Accounts for growth — a high P/E might be justified if growth is fast.',
    good: 'Under 1.0 suggests the stock is undervalued relative to its growth.',
  },
  beta: {
    title: 'Beta',
    explanation: 'Measures how much a stock moves relative to the overall market. A beta of 1.0 means it moves with the market.',
    good: 'Under 1.0 = less volatile; above 1.5 = significantly more volatile than the market.',
  },
  roe: {
    title: 'ROE (Return on Equity)',
    explanation: 'Measures how efficiently a company turns shareholder equity into profit. Higher ROE means management is using capital effectively.',
    good: 'Above 15% is strong; above 25% is excellent.',
  },
  margin: {
    title: 'Net Profit Margin',
    explanation: 'The percentage of revenue that becomes actual profit after all expenses. Higher margins mean more profit per dollar of sales.',
    good: 'Varies by industry. Above 15% is generally strong for most sectors.',
  },
  dividend: {
    title: 'Dividend Yield',
    explanation: 'Annual dividend payment as a percentage of the stock price. Represents cash returned to shareholders each year.',
    good: '2-4% is typical for dividend-paying stocks. Very high yields (>8%) can signal risk.',
  },
  marketCap: {
    title: 'Market Capitalization',
    explanation: 'Total market value of all shares. Calculated as share price times the number of shares outstanding.',
    good: 'Large-cap (>$10B) are usually more stable; small-cap (<$2B) have higher growth potential but more risk.',
  },
  evEbitda: {
    title: 'EV/EBITDA',
    explanation: 'Enterprise Value divided by earnings before interest, taxes, depreciation, and amortization. A more complete valuation metric than P/E because it includes debt.',
    good: 'Under 10 is often considered cheap; above 20 is expensive.',
  },
  momentum: {
    title: 'Price Momentum',
    explanation: 'Measures the strength and direction of a stock\'s recent price movement across multiple timeframes (5 days, 3 months, 1 year).',
    good: 'Positive momentum across timeframes suggests an uptrend. Negative suggests a downtrend or correction.',
  },
  growth: {
    title: 'Growth Score',
    explanation: 'Evaluates earnings per share (EPS) and revenue growth rates on a year-over-year and 5-year basis.',
    good: 'EPS growth above 15% YoY and revenue growth above 10% are strong signals.',
  },
  risk: {
    title: 'Risk Score',
    explanation: 'Assesses downside risk using beta (volatility vs. market), debt-to-equity ratio (leverage), and recent price volatility.',
    good: 'Low beta, low debt, and low volatility produce a positive (safer) risk score.',
  },
};

interface MetricTooltipProps {
  metricKey: string;
}

export default function MetricTooltip({ metricKey }: MetricTooltipProps) {
  const [visible, setVisible] = useState(false);
  const def = METRIC_DEFINITIONS[metricKey];
  if (!def) return null;

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={8}>
        <Ionicons name="help-circle-outline" size={14} color={Colors.mutedForeground} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Ionicons name="school-outline" size={20} color={Colors.accent} />
              <Text style={styles.title}>{def.title}</Text>
            </View>
            <Text style={styles.explanation}>{def.explanation}</Text>
            <View style={styles.goodSection}>
              <Text style={styles.goodLabel}>What's good?</Text>
              <Text style={styles.goodText}>{def.good}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
              <Text style={styles.closeText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    flex: 1,
  },
  explanation: {
    fontSize: 14,
    color: Colors.secondaryForeground,
    lineHeight: 22,
  },
  goodSection: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  goodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gain,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goodText: {
    fontSize: 13,
    color: Colors.foreground,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

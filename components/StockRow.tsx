import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import MiniChart from './MiniChart';
import Colors from '../constants/colors';

interface StockRowProps {
  ticker: string;
  name: string;
  price: string;
  change: number;
  chartData: number[];
  onPress?: () => void;
  onChartPress?: () => void;
}

export default function StockRow({ ticker, name, price, change, chartData, onPress, onChartPress }: StockRowProps) {
  const positive = change >= 0;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.ticker}>{ticker}</Text>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
        </View>
        <MiniChart data={chartData} positive={positive} onPress={onChartPress} />
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${price}</Text>
          <Text style={[styles.change, { color: positive ? Colors.gain : Colors.loss }]}>
            {positive ? '+' : ''}{change.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  ticker: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  name: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  change: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});

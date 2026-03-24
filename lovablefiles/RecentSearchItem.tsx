import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  ticker: string;
  onPress: (ticker: string) => void;
};

export default function RecentSearchItem({ ticker, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.item} onPress={() => onPress(ticker)}>
      <Text style={styles.text}>{ticker}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  text: { fontSize: 16, fontWeight: '500', color: '#222' },
});

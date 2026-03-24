import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      <SkeletonLoader width="40%" height={12} />
      <SkeletonLoader width="60%" height={20} style={{ marginTop: 8 }} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLoader key={i} width={`${70 + Math.random() * 30}%`} height={12} style={{ marginTop: 6 }} />
      ))}
    </View>
  );
}

export function SkeletonStockRow() {
  return (
    <View style={styles.stockRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLoader width={60} height={14} />
        <SkeletonLoader width={100} height={10} />
      </View>
      <SkeletonLoader width={60} height={28} borderRadius={4} />
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <SkeletonLoader width={50} height={14} />
        <SkeletonLoader width={40} height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.secondary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
});

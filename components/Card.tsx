import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: 'green' | 'blue' | 'none';
  onPress?: () => void;
}

export default function Card({ children, style, glow = 'none', onPress }: CardProps) {
  const glowStyle =
    glow === 'green' ? styles.glowGreen : glow === 'blue' ? styles.glowBlue : undefined;

  if (onPress) {
    return (
      <Pressable style={[styles.card, glowStyle, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, glowStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  glowGreen: {
    shadowColor: Colors.gain,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
  glowBlue: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
});

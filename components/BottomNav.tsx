import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTap } from '../utils/haptics';
import Colors from '../constants/colors';

export type Tab = 'dashboard' | 'search' | 'compare' | 'watchlist' | 'portfolio';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'dashboard', label: 'Home', icon: 'home-outline' },
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'compare', label: 'Compare', icon: 'git-compare-outline' },
  { id: 'watchlist', label: 'Watchlist', icon: 'star-outline' },
  { id: 'portfolio', label: 'Portfolio', icon: 'briefcase-outline' },
];

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {tabs.map(({ id, label, icon }) => {
        const isActive = active === id;
        const filledIcon = icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
        return (
          <Pressable key={id} style={styles.tab} onPress={() => { onNavigate(id); lightTap(); }}>
            <Ionicons
              name={isActive ? filledIcon : icon}
              size={20}
              color={isActive ? Colors.primary : Colors.mutedForeground}
            />
            <Text style={[styles.label, { color: isActive ? Colors.primary : Colors.mutedForeground }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
  },
});

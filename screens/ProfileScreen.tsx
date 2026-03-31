import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { useSubscription, SubState } from '../context/SubscriptionContext';
import Colors from '../constants/colors';

interface ProfileScreenProps {
  onBack: () => void;
  onSignOut: () => void | Promise<void>;
  onUpgrade: () => void;
}

const STATUS_CONFIG: Record<SubState, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  admin: { label: 'Admin — Full Access', color: '#A78BFA', icon: 'shield-checkmark' },
  active: { label: 'Pro — Active', color: Colors.primary, icon: 'checkmark-circle' },
  trial: { label: 'Free Trial', color: Colors.accent, icon: 'time' },
  preview: { label: 'Free Preview', color: Colors.mutedForeground, icon: 'eye-outline' },
  expired: { label: 'Trial Expired', color: Colors.loss, icon: 'alert-circle-outline' },
  none: { label: 'Not signed in', color: Colors.mutedForeground, icon: 'person-outline' },
};

function formatTrialRemaining(end: Date | null): string | null {
  if (!end) return null;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? 's' : ''} remaining`;
}

export default function ProfileScreen({ onBack, onSignOut, onUpgrade }: ProfileScreenProps) {
  const { subState, userEmail, trialEndDate, isAdmin, isFullAccess } = useSubscription();
  const cfg = STATUS_CONFIG[subState];
  const trialText = subState === 'trial' ? formatTrialRemaining(trialEndDate) : null;

  const initial = userEmail
    ? userEmail.charAt(0).toUpperCase()
    : 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={Colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Avatar + email */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.emailText}>{userEmail ?? 'No email set'}</Text>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#A78BFA" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Subscription card */}
      <Card style={styles.subCard}>
        <View style={styles.subHeader}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          <Text style={[styles.subLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {trialText && (
          <Text style={styles.trialRemaining}>{trialText}</Text>
        )}

        {subState === 'expired' && (
          <Text style={styles.expiredText}>
            Your free trial has ended. Upgrade to continue using full analysis.
          </Text>
        )}

        {!isFullAccess && subState !== 'none' && (
          <Pressable style={styles.upgradeCta} onPress={onUpgrade}>
            <Text style={styles.upgradeCtaText}>Upgrade to Pro</Text>
          </Pressable>
        )}
      </Card>

      {/* Menu items */}
      <View style={styles.menuSection}>
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
        <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
        <MenuItem icon="shield-outline" label="Privacy Policy" onPress={() => {}} />
      </View>

      {/* Sign out */}
      <Pressable style={styles.signOutButton} onPress={() => void onSignOut()}>
        <Ionicons name="log-out-outline" size={18} color={Colors.loss} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* App version */}
      <Text style={styles.versionText}>StockExplorer v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={18} color={Colors.mutedForeground} />
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40, gap: 24 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.foreground },

  avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border,
  },
  avatarAdmin: { borderColor: '#A78BFA' },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.foreground },
  emailText: { fontSize: 14, color: Colors.secondaryForeground },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#A78BFA15', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 0.5 },

  subCard: { gap: 10 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subLabel: { fontSize: 15, fontWeight: '700' },
  trialRemaining: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  expiredText: { fontSize: 13, color: Colors.mutedForeground, lineHeight: 18 },
  upgradeCta: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center', marginTop: 4,
  },
  upgradeCtaText: { fontSize: 14, fontWeight: '700', color: Colors.primaryForeground },

  menuSection: {
    backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemLabel: { fontSize: 14, color: Colors.foreground, fontWeight: '500' },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.loss + '12', borderWidth: 1, borderColor: Colors.loss + '30',
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: Colors.loss },

  versionText: {
    fontSize: 11, color: Colors.mutedForeground, textAlign: 'center',
  },
});

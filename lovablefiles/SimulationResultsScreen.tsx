import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import Card from '../components/Card';
import StatRow from '../components/StatRow';

type Props = {
  avgReturn: string;
  winRate: string;
  worstCase: string;
};

export default function SimulationResultsScreen({ avgReturn, winRate, worstCase }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What usually happens next</Text>

      <Card>
        <StatRow label="Avg return after 5 days" value={avgReturn} />
        <StatRow label="Win rate" value={winRate} />
        <StatRow label="Worst case outcome" value={worstCase} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 16 },
});

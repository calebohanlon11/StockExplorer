import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import SearchBar from '../components/SearchBar';
import RecentSearchItem from '../components/RecentSearchItem';

type Props = {
  onSearch: (ticker: string) => void;
};

export default function StockSearchScreen({ onSearch }: Props) {
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>(['TSLA', 'AAPL', 'NVDA']);

  const handleSubmit = () => {
    const ticker = query.trim().toUpperCase();
    if (!ticker) return;
    if (!recents.includes(ticker)) {
      setRecents([ticker, ...recents].slice(0, 10));
    }
    onSearch(ticker);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stock Search</Text>
      <SearchBar value={query} onChangeText={setQuery} onSubmit={handleSubmit} />
      <Text style={styles.sectionTitle}>Recent Searches</Text>
      <FlatList
        data={recents}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <RecentSearchItem ticker={item} onPress={onSearch} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  title: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 60, color: '#111' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
});

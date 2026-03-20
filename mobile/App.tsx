import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>نظام الأمن</Text>
      <Text style={styles.subtitle}>Security OS</Text>
      <Text style={styles.loading}>جاري التحميل...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 4 },
  loading: { fontSize: 14, color: '#64748B', marginTop: 20 },
});

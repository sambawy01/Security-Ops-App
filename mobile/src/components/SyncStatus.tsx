import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getQueueCount } from '../lib/sync';

export function SyncStatus() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    getQueueCount().then(setCount);
    const interval = setInterval(() => {
      getQueueCount().then(setCount);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {t('common.pendingSync', { count })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  text: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500',
    writingDirection: 'rtl',
  },
});

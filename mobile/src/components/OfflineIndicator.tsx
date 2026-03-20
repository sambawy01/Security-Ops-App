import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueCount } from '../lib/sync';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isOnline) {
      getQueueCount().then(setPendingCount);
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('common.offline')}</Text>
      {pendingCount > 0 && (
        <Text style={styles.pendingText}>
          {t('common.pendingSync', { count: pendingCount })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#78350F',
    fontSize: 14,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  pendingText: {
    color: '#92400E',
    fontSize: 12,
    marginTop: 2,
    writingDirection: 'rtl',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#DBEAFE', text: '#1D4ED8' },
  assigned: { bg: '#E0E7FF', text: '#4338CA' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  escalated: { bg: '#FEE2E2', text: '#991B1B' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#E2E8F0', text: '#475569' },
  cancelled: { bg: '#F1F5F9', text: '#94A3B8' },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[status] || { bg: '#E2E8F0', text: '#475569' };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {t(`status.${status}` as any)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});

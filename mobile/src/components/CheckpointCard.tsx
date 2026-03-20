import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PatrolCheckpoint } from '../types';

type CheckpointStatus = 'pending' | 'confirmed' | 'skipped';

interface CheckpointCardProps {
  checkpoint: PatrolCheckpoint;
  index: number;
  status: CheckpointStatus;
  isCurrent: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  gate: '\u0628\u0648\u0627\u0628\u0629',
  patrol: '\u062F\u0648\u0631\u064A\u0629',
  fixed: '\u062B\u0627\u0628\u062A',
};

function getStatusIcon(status: CheckpointStatus, isCurrent: boolean): string {
  if (status === 'confirmed') return '\u2705';
  if (status === 'skipped') return '\u23ED\uFE0F';
  if (isCurrent) return '\u23F3';
  return '\u25CB';
}

export function CheckpointCard({
  checkpoint,
  index,
  status,
  isCurrent,
  onConfirm,
  onSkip,
}: CheckpointCardProps) {
  const { t } = useTranslation();
  const statusIcon = getStatusIcon(status, isCurrent);
  const typeLabel = TYPE_LABELS[checkpoint.type] || checkpoint.type;

  return (
    <View
      style={[
        styles.container,
        isCurrent && styles.currentContainer,
        status === 'confirmed' && styles.confirmedContainer,
        status === 'skipped' && styles.skippedContainer,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.leftSection}>
          <Text style={styles.statusIcon}>{statusIcon}</Text>
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>{index + 1}</Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.checkpointName}>{checkpoint.nameAr}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>
      </View>

      {isCurrent && status === 'pending' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>{t('patrol.skip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmButtonText}>{t('patrol.confirm')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentContainer: {
    borderColor: '#2563EB',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  confirmedContainer: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  skippedContainer: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE68A',
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sequenceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sequenceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusIcon: {
    fontSize: 20,
  },
  checkpointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCurrentLocation } from '../hooks/useLocation';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { apiFetch } from '../lib/api';
import { queueAction } from '../lib/sync';
import type { Shift } from '../types';

export function ShiftScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const shift: Shift = route.params?.shift;

  const { location, error: locationError, loading: locationLoading } = useCurrentLocation();
  const isOnline = useOnlineStatus();

  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCheckIn = shift?.status === 'scheduled';
  const isCheckOut = shift?.status === 'active';

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCheckIn = async () => {
    if (!location && !locationLoading) {
      Alert.alert(t('common.error'), locationError || 'Location unavailable');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
      };

      if (isOnline) {
        await apiFetch(`/api/v1/shifts/${shift.id}/check-in`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await queueAction('shift-check-in', {
          shiftId: shift.id,
          ...payload,
        });
      }

      Alert.alert('\u2705', t('shift.checkInSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!location && !locationLoading) {
      Alert.alert(t('common.error'), locationError || 'Location unavailable');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
        handoverNotes: handoverNotes.trim() || undefined,
      };

      if (isOnline) {
        await apiFetch(`/api/v1/shifts/${shift.id}/check-out`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await queueAction('shift-check-out', {
          shiftId: shift.id,
          ...payload,
        });
      }

      Alert.alert('\u2705', t('shift.checkOutSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!shift) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noData}>{t('home.noShift')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Shift info card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.shift')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            {shift.zone?.nameAr || shift.zoneId}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>
            {formatTime(shift.scheduledStart)} - {formatTime(shift.scheduledEnd)}
          </Text>
        </View>
        {isCheckOut && shift.actualCheckIn && (
          <View style={styles.infoRow}>
            <Text style={styles.checkInTime}>
              {t('home.checkIn')}: {formatTime(shift.actualCheckIn)}
            </Text>
          </View>
        )}
      </View>

      {/* GPS location display */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>GPS</Text>
        {locationLoading ? (
          <View style={styles.locationRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.locationLoading}>{t('common.loading')}</Text>
          </View>
        ) : locationError ? (
          <Text style={styles.locationError}>{locationError}</Text>
        ) : location ? (
          <View>
            <Text style={styles.locationText}>
              Lat: {location.lat.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Lng: {location.lng.toFixed(6)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Check-out: handover notes */}
      {isCheckOut && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('shift.handover')}</Text>
          <TextInput
            style={styles.textArea}
            value={handoverNotes}
            onChangeText={setHandoverNotes}
            placeholder={t('shift.handover')}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            textAlign="right"
          />
        </View>
      )}

      {/* Action button */}
      {isCheckIn && (
        <TouchableOpacity
          style={[styles.actionButton, styles.checkInButton]}
          onPress={handleCheckIn}
          disabled={submitting || locationLoading}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>{t('home.checkIn')}</Text>
          )}
        </TouchableOpacity>
      )}

      {isCheckOut && (
        <TouchableOpacity
          style={[styles.actionButton, styles.checkOutButton]}
          onPress={handleCheckOut}
          disabled={submitting || locationLoading}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>{t('home.checkOut')}</Text>
          )}
        </TouchableOpacity>
      )}

      {!isOnline && (
        <Text style={styles.offlineNote}>{t('common.offline')}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  noData: {
    fontSize: 16,
    color: '#94A3B8',
    writingDirection: 'rtl',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  infoValue: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  checkInTime: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLoading: {
    fontSize: 14,
    color: '#64748B',
    writingDirection: 'rtl',
  },
  locationError: {
    fontSize: 14,
    color: '#EF4444',
  },
  locationText: {
    fontSize: 14,
    color: '#334155',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 100,
    writingDirection: 'rtl',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  checkInButton: {
    backgroundColor: '#16A34A',
  },
  checkOutButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  offlineNote: {
    textAlign: 'center',
    color: '#F59E0B',
    fontSize: 13,
    marginTop: 12,
    writingDirection: 'rtl',
  },
});

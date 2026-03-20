import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { apiFetch } from '../lib/api';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { SyncStatus } from '../components/SyncStatus';
import { IncidentCard } from '../components/IncidentCard';
import type { Shift, Incident } from '../types';

export function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isOnline = useOnlineStatus();

  const [shift, setShift] = useState<Shift | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingShift, setLoadingShift] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  const fetchShift = useCallback(async () => {
    try {
      const data = await apiFetch<Shift>('/api/v1/shifts/my-current', {
        cacheKey: 'my-shift',
      });
      setShift(data);
    } catch {
      setShift(null);
    } finally {
      setLoadingShift(false);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<Incident[]>(
        `/api/v1/incidents?assignedOfficerId=${user.id}&status=open,assigned,in_progress`,
        { cacheKey: 'my-incidents' },
      );
      setIncidents(data);
    } catch {
      setIncidents([]);
    } finally {
      setLoadingIncidents(false);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    await Promise.all([fetchShift(), fetchIncidents()]);
  }, [fetchShift, fetchIncidents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleShiftAction = () => {
    if (shift) {
      navigation.navigate('Shift', { shift });
    }
  };

  const handleNewIncident = () => {
    navigation.navigate('IncidentsTab', {
      screen: 'NewIncident',
    });
  };

  const handleIncidentPress = (incident: Incident) => {
    navigation.navigate('IncidentsTab', {
      screen: 'IncidentDetail',
      params: { incidentId: incident.id },
    });
  };

  const formatTimeRange = (start: string, end: string) => {
    const fmt = (d: string) =>
      new Date(d).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const renderHeader = () => (
    <View>
      {/* Officer info bar */}
      <View style={styles.header}>
        <View style={styles.officerInfo}>
          <Text style={styles.officerName}>{user?.nameAr}</Text>
          <Text style={styles.officerBadge}>{user?.role}</Text>
        </View>
        <SyncStatus />
      </View>

      {/* Shift card */}
      <View style={styles.shiftCard}>
        <Text style={styles.sectionTitle}>{t('home.shift')}</Text>
        {shift ? (
          <View>
            <Text style={styles.shiftZone}>
              {shift.zone?.nameAr || shift.zoneId}
            </Text>
            <Text style={styles.shiftTime}>
              {formatTimeRange(shift.scheduledStart, shift.scheduledEnd)}
            </Text>
            {shift.status === 'scheduled' && (
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={handleShiftAction}
                activeOpacity={0.8}
              >
                <Text style={styles.checkInButtonText}>
                  {t('home.checkIn')}
                </Text>
              </TouchableOpacity>
            )}
            {shift.status === 'active' && (
              <View>
                <Text style={styles.onDutyLabel}>{t('home.onDuty')}</Text>
                <TouchableOpacity
                  style={[styles.checkInButton, styles.checkOutButton]}
                  onPress={handleShiftAction}
                  activeOpacity={0.8}
                >
                  <Text style={styles.checkInButtonText}>
                    {t('home.checkOut')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noShiftText}>{t('home.noShift')}</Text>
        )}
      </View>

      {/* Incidents section header */}
      <View style={styles.incidentsHeader}>
        <Text style={styles.sectionTitle}>
          {t('home.activeIncidents')} ({incidents.length})
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loadingIncidents) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('incident.noIncidents')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineIndicator />
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() => handleIncidentPress(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating action button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewIncident}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>{t('incident.new')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 8,
    marginBottom: 16,
  },
  officerInfo: {
    alignItems: 'flex-end',
  },
  officerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  officerBadge: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  shiftCard: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  shiftZone: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  onDutyLabel: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  checkInButton: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkOutButton: {
    backgroundColor: '#DC2626',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noShiftText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 16,
    writingDirection: 'rtl',
  },
  incidentsHeader: {
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    writingDirection: 'rtl',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    writingDirection: 'rtl',
  },
});

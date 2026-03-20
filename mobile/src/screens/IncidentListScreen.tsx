import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { IncidentCard } from '../components/IncidentCard';
import type { Incident } from '../types';

type FilterTab = 'active' | 'all';

export function IncidentListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('active');

  const fetchIncidents = useCallback(async () => {
    if (!user) return;
    try {
      const statusParam =
        filter === 'active'
          ? '&status=open,assigned,in_progress'
          : '';
      const data = await apiFetch<Incident[]>(
        `/api/v1/incidents?assignedOfficerId=${user.id}${statusParam}`,
        { cacheKey: `incidents:${filter}:${user.id}` },
      );
      setIncidents(data);
    } catch {
      // Keep existing data on error
    }
  }, [user, filter]);

  useEffect(() => {
    setLoading(true);
    fetchIncidents().finally(() => setLoading(false));
  }, [fetchIncidents]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIncidents();
    setRefreshing(false);
  }, [fetchIncidents]);

  const handlePress = (incident: Incident) => {
    navigation.navigate('IncidentDetail', { incidentId: incident.id });
  };

  const renderItem = useCallback(
    ({ item }: { item: Incident }) => (
      <IncidentCard incident={item} onPress={() => handlePress(item)} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Incident) => item.id, []);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{'\u26A0'}</Text>
        <Text style={styles.emptyText}>{t('incident.noIncidents')}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with new incident button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('NewIncident')}
          activeOpacity={0.7}
        >
          <Text style={styles.newButtonText}>+ {t('incident.new')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nav.incidents')}</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive,
            ]}
          >
            {t('incident.filterAll')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'active' && styles.filterTabActive,
          ]}
          onPress={() => setFilter('active')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'active' && styles.filterTabTextActive,
            ]}
          >
            {t('incident.filterActive')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Incident list */}
      {loading && incidents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={incidents}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    writingDirection: 'rtl',
  },
  newButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    writingDirection: 'rtl',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    writingDirection: 'rtl',
  },
});

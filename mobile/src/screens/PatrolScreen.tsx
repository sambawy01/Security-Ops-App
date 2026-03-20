import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { apiFetch } from '../lib/api';
import { queueAction } from '../lib/sync';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { CheckpointCard } from '../components/CheckpointCard';
import { CHECKPOINT_PROXIMITY_METERS } from '../config';
import type { PatrolRoute, PatrolCheckpoint, PatrolLog, Shift } from '../types';

type CheckpointStatus = 'pending' | 'confirmed' | 'skipped';

interface CheckpointState {
  status: CheckpointStatus;
  skipReason?: string;
}

export function PatrolScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  // Route selection state
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [errorRoutes, setErrorRoutes] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Active patrol state
  const [activePatrol, setActivePatrol] = useState<PatrolLog | null>(null);
  const [activeRoute, setActiveRoute] = useState<PatrolRoute | null>(null);
  const [checkpoints, setCheckpoints] = useState<PatrolCheckpoint[]>([]);
  const [checkpointStates, setCheckpointStates] = useState<Record<string, CheckpointState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startingPatrol, setStartingPatrol] = useState(false);
  const [confirmingCheckpoint, setConfirmingCheckpoint] = useState(false);
  const [patrolStartTime, setPatrolStartTime] = useState<number>(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Fetch patrol routes
  const fetchRoutes = useCallback(async () => {
    if (!user?.zoneId) {
      setLoadingRoutes(false);
      return;
    }
    setErrorRoutes(null);
    try {
      const data = await apiFetch<PatrolRoute[]>(
        `/api/v1/patrols/routes?zoneId=${user.zoneId}`,
        { cacheKey: 'patrol-routes' },
      );
      setRoutes(data);
    } catch {
      setErrorRoutes(t('common.error'));
    } finally {
      setLoadingRoutes(false);
    }
  }, [user?.zoneId, t]);

  useEffect(() => {
    if (!activePatrol) {
      fetchRoutes();
    }
  }, [fetchRoutes, activePatrol]);

  // Timer for elapsed minutes
  useEffect(() => {
    if (!activePatrol || completed) return;
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - patrolStartTime) / 60000));
    }, 10000);
    return () => clearInterval(interval);
  }, [activePatrol, patrolStartTime, completed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  }, [fetchRoutes]);

  // Start patrol
  const handleStartPatrol = async (route: PatrolRoute) => {
    setStartingPatrol(true);
    try {
      // Get current shift
      const shift = await apiFetch<Shift>('/api/v1/shifts/my-current', {
        cacheKey: 'my-shift',
      });

      let patrolLog: PatrolLog;

      if (isOnline) {
        patrolLog = await apiFetch<PatrolLog>('/api/v1/patrols/logs', {
          method: 'POST',
          body: JSON.stringify({ routeId: route.id, shiftId: shift.id }),
        });
      } else {
        const tempId = `temp-${Date.now()}`;
        await queueAction('patrol-start', {
          routeId: route.id,
          shiftId: shift.id,
        });
        patrolLog = {
          id: tempId,
          routeId: route.id,
          shiftId: shift.id,
          startedAt: new Date().toISOString(),
        };
      }

      // Fetch route detail with checkpoints
      let routeDetail: PatrolRoute;
      try {
        routeDetail = await apiFetch<PatrolRoute>(
          `/api/v1/patrols/routes/${route.id}`,
          { cacheKey: `patrol-route:${route.id}` },
        );
      } catch {
        // Fallback: use route without checkpoints detail
        routeDetail = route;
      }

      const sortedCheckpoints = (routeDetail.checkpoints || []).sort(
        (a, b) => a.sequenceOrder - b.sequenceOrder,
      );

      setActivePatrol(patrolLog);
      setActiveRoute(routeDetail);
      setCheckpoints(sortedCheckpoints);
      setCurrentIndex(0);
      setCheckpointStates({});
      setPatrolStartTime(Date.now());
      setElapsedMinutes(0);
      setCompleted(false);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setStartingPatrol(false);
    }
  };

  // Calculate distance between two GPS points (Haversine)
  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Advance to next checkpoint or complete patrol
  const advanceCheckpoint = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= checkpoints.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, checkpoints.length]);

  // Confirm checkpoint arrival
  const handleConfirmCheckpoint = async (checkpoint: PatrolCheckpoint) => {
    if (!activePatrol) return;
    setConfirmingCheckpoint(true);

    try {
      // Get current GPS position
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 0;
      let lng = 0;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;

        // GPS proximity check
        if (checkpoint.lat != null && checkpoint.lng != null) {
          const distance = getDistance(lat, lng, checkpoint.lat, checkpoint.lng);
          if (distance > CHECKPOINT_PROXIMITY_METERS) {
            await new Promise<void>((resolve) => {
              Alert.alert(
                t('patrol.proximityWarning'),
                t('patrol.proximityMessage', {
                  distance: Math.round(distance),
                }),
                [
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                    onPress: () => {
                      setConfirmingCheckpoint(false);
                      resolve();
                      return;
                    },
                  },
                  {
                    text: t('patrol.confirm'),
                    onPress: () => resolve(),
                  },
                ],
              );
            });
          }
        }
      }

      const payload = { confirmed: true, lat, lng };

      if (isOnline) {
        await apiFetch(
          `/api/v1/patrols/logs/${activePatrol.id}/checkpoints/${checkpoint.id}`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        );
      } else {
        await queueAction('patrol-checkpoint-confirm', {
          patrolLogId: activePatrol.id,
          checkpointId: checkpoint.id,
          ...payload,
        });
      }

      setCheckpointStates((prev) => ({
        ...prev,
        [checkpoint.id]: { status: 'confirmed' },
      }));

      advanceCheckpoint();
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setConfirmingCheckpoint(false);
    }
  };

  // Skip checkpoint
  const handleSkipCheckpoint = (checkpoint: PatrolCheckpoint) => {
    Alert.prompt
      ? // iOS has Alert.prompt
        Alert.prompt(
          t('patrol.skip'),
          t('patrol.skipReason'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.ok'),
              onPress: (reason?: string) =>
                performSkip(checkpoint, reason || ''),
            },
          ],
          'plain-text',
        )
      : // Android fallback: use simple alert then skip
        showSkipDialog(checkpoint);
  };

  const [skipDialogVisible, setSkipDialogVisible] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipCheckpoint, setSkipCheckpoint] = useState<PatrolCheckpoint | null>(null);

  const showSkipDialog = (checkpoint: PatrolCheckpoint) => {
    setSkipCheckpoint(checkpoint);
    setSkipReason('');
    setSkipDialogVisible(true);
  };

  const confirmSkipDialog = () => {
    if (skipCheckpoint) {
      performSkip(skipCheckpoint, skipReason);
    }
    setSkipDialogVisible(false);
    setSkipCheckpoint(null);
    setSkipReason('');
  };

  const cancelSkipDialog = () => {
    setSkipDialogVisible(false);
    setSkipCheckpoint(null);
    setSkipReason('');
  };

  const performSkip = async (
    checkpoint: PatrolCheckpoint,
    reason: string,
  ) => {
    if (!activePatrol) return;

    const payload = { confirmed: false, skipReason: reason };

    try {
      if (isOnline) {
        await apiFetch(
          `/api/v1/patrols/logs/${activePatrol.id}/checkpoints/${checkpoint.id}`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        );
      } else {
        await queueAction('patrol-checkpoint-skip', {
          patrolLogId: activePatrol.id,
          checkpointId: checkpoint.id,
          ...payload,
        });
      }

      setCheckpointStates((prev) => ({
        ...prev,
        [checkpoint.id]: { status: 'skipped', skipReason: reason },
      }));

      advanceCheckpoint();
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const getCheckpointStatus = (checkpointId: string): CheckpointStatus => {
    return checkpointStates[checkpointId]?.status || 'pending';
  };

  const confirmedCount = Object.values(checkpointStates).filter(
    (s) => s.status === 'confirmed' || s.status === 'skipped',
  ).length;

  // End patrol — go back to route selection
  const handleEndPatrol = () => {
    setActivePatrol(null);
    setActiveRoute(null);
    setCheckpoints([]);
    setCheckpointStates({});
    setCurrentIndex(0);
    setCompleted(false);
  };

  // ---- RENDER: Active Patrol ----
  if (activePatrol) {
    return (
      <SafeAreaView style={styles.container}>
        <OfflineIndicator />

        {/* Patrol header */}
        <View style={styles.patrolHeader}>
          <Text style={styles.patrolTitle}>
            {activeRoute?.name || t('nav.patrol')}
          </Text>
          <Text style={styles.patrolProgress}>
            {confirmedCount}/{checkpoints.length} {t('patrol.points')} {'\u2022'}{' '}
            {elapsedMinutes} {t('patrol.minutesLabel')}
          </Text>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    checkpoints.length > 0
                      ? `${(confirmedCount / checkpoints.length) * 100}%`
                      : '0%',
                },
              ]}
            />
          </View>
        </View>

        {/* Completion message */}
        {completed && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>
              {t('patrol.completed')} {'\u2705'}
            </Text>
            <TouchableOpacity
              style={styles.endPatrolButton}
              onPress={handleEndPatrol}
              activeOpacity={0.7}
            >
              <Text style={styles.endPatrolButtonText}>
                {t('common.ok')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Checkpoint list */}
        <FlatList
          data={checkpoints}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <CheckpointCard
              checkpoint={item}
              index={index}
              status={getCheckpointStatus(item.id)}
              isCurrent={index === currentIndex && !completed}
              onConfirm={() => handleConfirmCheckpoint(item)}
              onSkip={() => handleSkipCheckpoint(item)}
            />
          )}
          contentContainerStyle={styles.checkpointList}
          showsVerticalScrollIndicator={false}
        />

        {confirmingCheckpoint && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}

        {/* Skip reason dialog (Android fallback) */}
        {skipDialogVisible && (
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogBox}>
              <Text style={styles.dialogTitle}>{t('patrol.skipReason')}</Text>
              <TextInput
                style={styles.dialogInput}
                value={skipReason}
                onChangeText={setSkipReason}
                placeholder={t('patrol.skipReason')}
                placeholderTextColor="#94A3B8"
                textAlign="right"
                multiline
              />
              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={styles.dialogCancelButton}
                  onPress={cancelSkipDialog}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dialogCancelText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogConfirmButton}
                  onPress={confirmSkipDialog}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dialogConfirmText}>
                    {t('common.ok')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ---- RENDER: Route Selection ----
  return (
    <SafeAreaView style={styles.container}>
      <OfflineIndicator />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('patrol.selectRoute')}</Text>
      </View>

      {loadingRoutes ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : errorRoutes ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorRoutes}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoadingRoutes(true);
              fetchRoutes();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.routeCard}
              onPress={() => handleStartPatrol(item)}
              disabled={startingPatrol}
              activeOpacity={0.7}
            >
              <Text style={styles.routeName}>{item.name}</Text>
              <View style={styles.routeInfo}>
                <Text style={styles.routeDetail}>
                  {item.estimatedDurationMin} {t('patrol.minutesLabel')}
                </Text>
                {item.checkpoints && (
                  <Text style={styles.routeDetail}>
                    {item.checkpoints.length} {t('patrol.points')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.routeList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('patrol.noRoutes')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {startingPatrol && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    writingDirection: 'rtl',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  routeList: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  routeName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  routeInfo: {
    flexDirection: 'row-reverse',
    gap: 16,
  },
  routeDetail: {
    fontSize: 14,
    color: '#64748B',
    writingDirection: 'rtl',
  },

  // Active patrol styles
  patrolHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 56,
  },
  patrolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  patrolProgress: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#16A34A',
    borderRadius: 3,
  },
  checkpointList: {
    padding: 16,
    paddingBottom: 40,
  },
  completedBanner: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  completedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16A34A',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  endPatrolButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  endPatrolButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Skip dialog styles
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dialogBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    writingDirection: 'rtl',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  dialogButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  dialogConfirmButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dialogCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dialogCancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
});

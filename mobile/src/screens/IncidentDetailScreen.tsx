import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiFetch } from '../lib/api';
import { queueAction } from '../lib/sync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import type { Incident } from '../types';

interface IncidentUpdate {
  id: string;
  type: string;
  content: string | null;
  createdAt: string;
  officerNameAr?: string;
}

interface IncidentDetail extends Incident {
  updates?: IncidentUpdate[];
  zone?: { nameAr: string; nameEn: string };
  reporterType?: string;
  assignedOfficer?: { nameAr: string; nameEn: string };
}

export function IncidentDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isOnline = useOnlineStatus();

  const { incidentId } = route.params as { incidentId: string };

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  const fetchIncident = useCallback(async () => {
    try {
      const data = await apiFetch<IncidentDetail>(
        `/api/v1/incidents/${incidentId}`,
        { cacheKey: `incident:${incidentId}` },
      );
      setIncident(data);
    } catch {
      // Keep existing data
    }
  }, [incidentId]);

  useEffect(() => {
    setLoading(true);
    fetchIncident().finally(() => setLoading(false));
  }, [fetchIncident]);

  const handleStatusAction = async (
    newStatus: string,
    confirmMessage: string,
  ) => {
    Alert.alert(confirmMessage, '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          setActionLoading(true);
          try {
            if (isOnline) {
              await apiFetch(`/api/v1/incidents/${incidentId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
              });
            } else {
              await queueAction('incident-status-update', {
                incidentId,
                status: newStatus,
              });
            }
            // Refresh data
            await fetchIncident();
          } catch {
            Alert.alert(t('common.error'), t('common.error'));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSendNote = async () => {
    const content = noteText.trim();
    if (!content) return;

    setSendingNote(true);
    try {
      if (isOnline) {
        await apiFetch(`/api/v1/incidents/${incidentId}/updates`, {
          method: 'POST',
          body: JSON.stringify({ type: 'note', content }),
        });
      } else {
        await queueAction('incident-add-note', {
          incidentId,
          type: 'note',
          content,
        });
      }
      setNoteText('');
      await fetchIncident();
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSendingNote(false);
    }
  };

  const getRemainingTime = (deadline: string | null): { text: string; color: string } | null => {
    if (!deadline) return null;
    const now = new Date().getTime();
    const target = new Date(deadline).getTime();
    const diffMs = target - now;

    if (diffMs <= 0) {
      return { text: t('incident.slaExpired'), color: '#EF4444' };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) {
      return { text: `${minutes} ${t('incident.minutes')}`, color: '#EF4444' };
    }
    if (hours < 4) {
      return { text: `${hours}h ${minutes}m`, color: '#F59E0B' };
    }
    return { text: `${hours}h ${minutes}m`, color: '#22C55E' };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  const responseTimer = getRemainingTime(incident.slaResponseDeadline);
  const resolutionTimer = getRemainingTime(incident.slaResolutionDeadline);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.badgeRow}>
          <PriorityBadge priority={incident.priority} />
          <StatusBadge status={incident.status} />
        </View>
        <Text style={styles.title}>{incident.title}</Text>
        {incident.description ? (
          <Text style={styles.description}>{incident.description}</Text>
        ) : null}
      </View>

      {/* Info section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('incident.details')}</Text>
        {incident.zone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{incident.zone.nameAr}</Text>
            <Text style={styles.infoLabel}>{t('incident.zone')}</Text>
          </View>
        )}
        {incident.reporterType && (
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{incident.reporterType}</Text>
            <Text style={styles.infoLabel}>{t('incident.reporter')}</Text>
          </View>
        )}
        {incident.assignedOfficer && (
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>
              {incident.assignedOfficer.nameAr}
            </Text>
            <Text style={styles.infoLabel}>{t('incident.assigned')}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>
            {new Date(incident.createdAt).toLocaleDateString('ar-EG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={styles.infoLabel}>{t('incident.createdAt')}</Text>
        </View>
      </View>

      {/* SLA Timers */}
      {(responseTimer || resolutionTimer) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('incident.sla')}</Text>
          {responseTimer && (
            <View style={styles.slaRow}>
              <Text style={[styles.slaValue, { color: responseTimer.color }]}>
                {responseTimer.text}
              </Text>
              <Text style={styles.slaLabel}>{t('incident.slaResponse')}</Text>
            </View>
          )}
          {resolutionTimer && (
            <View style={styles.slaRow}>
              <Text
                style={[styles.slaValue, { color: resolutionTimer.color }]}
              >
                {resolutionTimer.text}
              </Text>
              <Text style={styles.slaLabel}>
                {t('incident.slaResolution')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      {actionLoading ? (
        <View style={styles.actionLoadingRow}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.actionsRow}>
          {incident.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acknowledgeButton]}
              onPress={() =>
                handleStatusAction('in_progress', t('incident.acknowledge'))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>
                {t('incident.acknowledge')}
              </Text>
            </TouchableOpacity>
          )}
          {incident.status === 'in_progress' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() =>
                  handleStatusAction('resolved', t('incident.resolve'))
                }
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>
                  {t('incident.resolve')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.escalateButton]}
                onPress={() =>
                  handleStatusAction('escalated', t('incident.escalate'))
                }
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>
                  {t('incident.escalate')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Timeline */}
      {incident.updates && incident.updates.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('incident.timeline')}</Text>
          {incident.updates.map((update) => (
            <View key={update.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineType}>{update.type}</Text>
                {update.content && (
                  <Text style={styles.timelineText}>{update.content}</Text>
                )}
                <Text style={styles.timelineTime}>
                  {new Date(update.createdAt).toLocaleDateString('ar-EG', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add note */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('incident.addNote')}</Text>
        <TextInput
          style={styles.noteInput}
          value={noteText}
          onChangeText={setNoteText}
          placeholder={t('incident.addNote')}
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          textAlign="right"
        />
        <TouchableOpacity
          style={[
            styles.sendNoteButton,
            (!noteText.trim() || sendingNote) && styles.sendNoteDisabled,
          ]}
          onPress={handleSendNote}
          disabled={!noteText.trim() || sendingNote}
          activeOpacity={0.7}
        >
          {sendingNote ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendNoteText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  headerCard: {
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
  badgeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  card: {
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#94A3B8',
    writingDirection: 'rtl',
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  slaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  slaLabel: {
    fontSize: 13,
    color: '#64748B',
    writingDirection: 'rtl',
  },
  slaValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 12,
  },
  actionLoadingRow: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: '#2563EB',
  },
  resolveButton: {
    backgroundColor: '#16A34A',
  },
  escalateButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timelineItem: {
    flexDirection: 'row-reverse',
    marginBottom: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    marginTop: 4,
    marginLeft: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  timelineText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  sendNoteButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendNoteDisabled: {
    opacity: 0.5,
  },
  sendNoteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineNote: {
    textAlign: 'center',
    color: '#F59E0B',
    fontSize: 13,
    marginTop: 8,
    writingDirection: 'rtl',
  },
});

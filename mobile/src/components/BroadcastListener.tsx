import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface Broadcast {
  id: string;
  message: string;
  priority: 'emergency' | 'urgent' | 'normal' | 'info';
  audience: string;
  zoneId: string | null;
  createdAt: string;
  sender: { nameEn: string; nameAr: string; badgeNumber: string } | null;
  ackedAt: string | null;
}

const POLL_MS = 10_000;

const priorityStyles: Record<Broadcast['priority'], { bg: string; ring: string; ar: string; en: string; emoji: string }> = {
  emergency: { bg: '#FEE2E2', ring: '#DC2626', ar: 'طوارئ', en: 'EMERGENCY', emoji: '🚨' },
  urgent:    { bg: '#FFEDD5', ring: '#EA580C', ar: 'عاجل',  en: 'URGENT',    emoji: '⚠️' },
  normal:    { bg: '#DBEAFE', ring: '#2563EB', ar: 'إعلان', en: 'BROADCAST', emoji: '📢' },
  info:      { bg: '#F1F5F9', ring: '#475569', ar: 'معلومات', en: 'INFO',     emoji: 'ℹ️' },
};

/**
 * Mounted at the root of the authenticated mobile shell. Polls
 * /api/v1/broadcasts every 10s and shows a modal-style popup for any
 * unacked broadcast targeted at the logged-in officer. The modal blocks
 * interaction until the officer taps "Acknowledged" — emergency
 * instructions are not optional reading.
 */
export function BroadcastListener() {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [acking, setAcking] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await apiFetch<Broadcast[]>('/api/v1/broadcasts?take=50');
        if (!cancelled) setBroadcasts(res ?? []);
      } catch {
        // network blip — try again next tick
      }
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAuthenticated]);

  const current = useMemo(() => {
    return [...broadcasts]
      .filter((b) => !b.ackedAt && b.id !== dismissedId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  }, [broadcasts, dismissedId]);

  if (!isAuthenticated || !current) return null;
  const cfg = priorityStyles[current.priority] ?? priorityStyles.normal;

  const onAck = async () => {
    setAcking(true);
    try {
      await apiFetch(`/api/v1/broadcasts/${current.id}/ack`, {
        method: 'POST',
        // Empty body + Content-Type: application/json trips Fastify's parser.
        body: JSON.stringify({}),
      });
      setDismissedId(current.id);
    } catch {
      // even on failure, dismiss locally so the officer isn't stuck —
      // server idempotency means a future ack still works.
      setDismissedId(current.id);
    } finally {
      setAcking(false);
    }
  };

  const senderLabel = current.sender
    ? `${isAr ? current.sender.nameAr : current.sender.nameEn} · ${current.sender.badgeNumber}`
    : '';

  return (
    <Modal visible animationType="fade" transparent onRequestClose={() => { /* block back-button dismiss */ }}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: cfg.ring }]}>
          <View style={[styles.header, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.headerEmoji]}>{cfg.emoji}</Text>
            <Text style={[styles.headerLabel, { color: cfg.ring }]}>{isAr ? cfg.ar : cfg.en}</Text>
          </View>
          <View style={styles.body}>
            <Text style={[styles.message, { writingDirection: isAr ? 'rtl' : 'ltr' }]}>
              {current.message}
            </Text>
            {senderLabel ? (
              <Text style={[styles.meta, { writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                {isAr ? 'من: ' : 'From: '}{senderLabel}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {new Date(current.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onAck}
            disabled={acking}
            activeOpacity={0.85}
            style={[styles.button, { backgroundColor: cfg.ring }]}
          >
            {acking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{isAr ? 'تم الاطلاع' : 'Acknowledged'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerEmoji: { fontSize: 22 },
  headerLabel: { fontWeight: '800', letterSpacing: 1, fontSize: 12, textTransform: 'uppercase' },
  body: { padding: 20, gap: 8 },
  message: { fontSize: 18, lineHeight: 26, color: '#0F172A', fontWeight: '500' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 4 },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

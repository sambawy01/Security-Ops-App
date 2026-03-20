import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueCount, processQueue } from '../lib/sync';
import { OfflineIndicator } from '../components/OfflineIndicator';
import i18n from '../lib/i18n';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
    AsyncStorage.getItem('lastSyncTime').then(setLastSyncTime);

    const interval = setInterval(refreshPendingCount, 10000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  const handleForceSync = async () => {
    if (!isOnline) {
      Alert.alert(t('common.error'), t('common.offline'));
      return;
    }

    setSyncing(true);
    try {
      const result = await processQueue();
      const now = new Date().toISOString();
      await AsyncStorage.setItem('lastSyncTime', now);
      setLastSyncTime(now);
      await refreshPendingCount();

      if (result.processed > 0) {
        Alert.alert(
          t('settings.sync'),
          t('settings.syncComplete', { count: result.processed }),
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    if (lang === currentLang) return;

    Alert.alert(t('settings.languageChangeTitle'), t('settings.languageChangeMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          await i18n.changeLanguage(lang);
          I18nManager.forceRTL(lang === 'ar');
          setCurrentLang(lang);

          try {
            await Updates.reloadAsync();
          } catch {
            // Updates.reloadAsync may fail in dev mode; that is acceptable
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            // Logout errors should not block the user
          }
        },
      },
    ]);
  };

  const formatSyncTime = (iso: string) => {
    return new Date(iso).toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        {/* Officer info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.officerInfo')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{user?.nameAr || '-'}</Text>
            <Text style={styles.infoLabel}>{t('settings.name')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{user?.role || '-'}</Text>
            <Text style={styles.infoLabel}>{t('settings.role')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{user?.zoneId || '-'}</Text>
            <Text style={styles.infoLabel}>{t('settings.zone')}</Text>
          </View>
        </View>

        {/* Language toggle */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[
                styles.langButton,
                currentLang === 'en' && styles.langButtonActive,
              ]}
              onPress={() => handleLanguageChange('en')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langButtonText,
                  currentLang === 'en' && styles.langButtonTextActive,
                ]}
              >
                {t('settings.english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langButton,
                currentLang === 'ar' && styles.langButtonActive,
              ]}
              onPress={() => handleLanguageChange('ar')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langButtonText,
                  currentLang === 'ar' && styles.langButtonTextActive,
                ]}
              >
                {t('settings.arabic')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.sync')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{pendingCount}</Text>
            <Text style={styles.infoLabel}>{t('settings.pendingActions')}</Text>
          </View>
          {lastSyncTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoValue}>
                {formatSyncTime(lastSyncTime)}
              </Text>
              <Text style={styles.infoLabel}>{t('settings.lastSync')}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleForceSync}
            disabled={syncing}
            activeOpacity={0.7}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.syncButtonText}>
                {t('settings.forceSync')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>1.0.0</Text>
            <Text style={styles.infoLabel}>{t('settings.version')}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
    paddingVertical: 8,
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
  languageRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  langButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  langButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  langButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  langButtonTextActive: {
    color: '#FFFFFF',
  },
  syncButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

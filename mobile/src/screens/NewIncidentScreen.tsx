import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useCurrentLocation } from '../hooks/useLocation';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { apiFetch } from '../lib/api';
import { queueAction } from '../lib/sync';
import type { Category } from '../types';

const PRIORITY_OPTIONS: {
  value: 'critical' | 'high' | 'medium' | 'low';
  color: string;
}[] = [
  { value: 'critical', color: '#EF4444' },
  { value: 'high', color: '#F97316' },
  { value: 'medium', color: '#F59E0B' },
  { value: 'low', color: '#22C55E' },
];

export function NewIncidentScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { location, loading: locationLoading } = useCurrentLocation();
  const isOnline = useOnlineStatus();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    apiFetch<Category[]>('/api/v1/categories', { cacheKey: 'categories' })
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Camera permission denied');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, [t]);

  const handleChoosePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Gallery permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, [t]);

  const handlePhotoPress = useCallback(() => {
    Alert.alert(t('incident.photo'), '', [
      { text: t('incident.takePhoto'), onPress: handleTakePhoto },
      { text: t('incident.choosePhoto'), onPress: handleChoosePhoto },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [t, handleTakePhoto, handleChoosePhoto]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('incident.titleRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        priority,
        reporterType: 'officer',
        lat: location?.lat ?? undefined,
        lng: location?.lng ?? undefined,
      };

      if (isOnline) {
        await apiFetch('/api/v1/incidents', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await queueAction('incident-create', {
          ...payload,
          photoUri: photoUri || undefined,
        });
      }

      Alert.alert(t('incident.submitted'), '', [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('incident.title')} *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('incident.title')}
          placeholderTextColor="#94A3B8"
          textAlign="right"
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('incident.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('incident.description')}
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          textAlign="right"
        />
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('incident.category')}</Text>
        {loadingCategories ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
            inverted
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && styles.categoryChipActive,
                ]}
                onPress={() =>
                  setCategoryId(categoryId === cat.id ? null : cat.id)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryId === cat.id && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.nameAr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Priority */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('incident.priority')}</Text>
        <View style={styles.priorityRow}>
          {PRIORITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.priorityButton,
                {
                  borderColor: opt.color,
                  backgroundColor:
                    priority === opt.value ? opt.color : 'transparent',
                },
              ]}
              onPress={() => setPriority(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.priorityText,
                  {
                    color: priority === opt.value ? '#FFFFFF' : opt.color,
                  },
                ]}
              >
                {t(`priority.${opt.value}` as any)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Photo */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('incident.photo')}</Text>
        {photoUri ? (
          <TouchableOpacity onPress={handlePhotoPress} activeOpacity={0.7}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePhotoPress}
            activeOpacity={0.7}
          >
            <Text style={styles.photoButtonIcon}>{'\uD83D\uDCF7'}</Text>
            <Text style={styles.photoButtonText}>{t('incident.photo')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* GPS */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('incident.location')}</Text>
        {locationLoading ? (
          <View style={styles.gpsRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.gpsLoading}>{t('common.loading')}</Text>
          </View>
        ) : location ? (
          <Text style={styles.gpsText}>
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.gpsError}>GPS unavailable</Text>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>{t('incident.submit')}</Text>
        )}
      </TouchableOpacity>

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
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    writingDirection: 'rtl',
  },
  textArea: {
    minHeight: 100,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  priorityRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  photoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  photoButtonIcon: {
    fontSize: 28,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#64748B',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsLoading: {
    fontSize: 13,
    color: '#64748B',
    writingDirection: 'rtl',
  },
  gpsText: {
    fontSize: 14,
    color: '#334155',
    fontFamily: 'monospace',
  },
  gpsError: {
    fontSize: 14,
    color: '#EF4444',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
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

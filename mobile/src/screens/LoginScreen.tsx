import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

I18nManager.forceRTL(true);

export function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [badge, setBadge] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!badge.trim() || !pin.trim()) {
      setError(t('login.error'));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(badge.trim(), pin);
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          {/* Shield icon */}
          <Text style={styles.shieldIcon}>{'\u{1F6E1}\uFE0F'}</Text>

          {/* Title */}
          <Text style={styles.title}>{t('app.title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{'\u0639\u0645\u0644\u064A\u0627\u062A \u0623\u0645\u0646 \u0627\u0644\u062C\u0648\u0646\u0629'}</Text>

          {/* Badge number input */}
          <TextInput
            style={styles.input}
            placeholder={'\u0645\u062B\u0627\u0644: MGR-001'}
            placeholderTextColor="#94A3B8"
            value={badge}
            onChangeText={setBadge}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="right"
            editable={!loading}
          />

          {/* PIN input */}
          <TextInput
            style={styles.input}
            placeholder={t('login.pin')}
            placeholderTextColor="#94A3B8"
            value={pin}
            onChangeText={(text) => setPin(text.slice(0, 8))}
            secureTextEntry
            keyboardType="numeric"
            maxLength={8}
            textAlign="right"
            editable={!loading}
          />

          {/* Login button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('login.submit')}</Text>
            )}
          </TouchableOpacity>

          {/* Error message */}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shieldIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

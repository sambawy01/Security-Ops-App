import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export function LoginScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}>{t('app.title')}</Text>
      <Text style={{ fontSize: 18, color: '#94A3B8', marginTop: 12 }}>{t('login.title')}</Text>
    </View>
  );
}

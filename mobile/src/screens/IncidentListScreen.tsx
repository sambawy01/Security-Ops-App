import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export function IncidentListScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{t('nav.incidents')}</Text>
    </View>
  );
}

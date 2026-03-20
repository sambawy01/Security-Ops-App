import { I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/hooks/useAuth';
import { AppNavigator } from './src/navigation/AppNavigator';
import './src/lib/i18n'; // Initialize i18n

// Force RTL for Arabic
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

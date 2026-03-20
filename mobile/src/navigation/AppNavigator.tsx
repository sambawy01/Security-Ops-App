import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { IncidentListScreen } from '../screens/IncidentListScreen';
import { IncidentDetailScreen } from '../screens/IncidentDetailScreen';
import { NewIncidentScreen } from '../screens/NewIncidentScreen';
import { PatrolScreen } from '../screens/PatrolScreen';
import { ShiftScreen } from '../screens/ShiftScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const AuthStack = createNativeStackNavigator();
const MainTab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const IncidentStack = createNativeStackNavigator();

function TabIcon({ label, color, size }: { label: string; color: string; size: number }) {
  return <Text style={{ fontSize: size, color }}>{label}</Text>;
}

function HomeStackNavigator() {
  const { t } = useTranslation();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen
        name="Shift"
        component={ShiftScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: t('home.shift'),
        }}
      />
    </HomeStack.Navigator>
  );
}

function IncidentStackNavigator() {
  const { t } = useTranslation();
  return (
    <IncidentStack.Navigator screenOptions={{ headerShown: false }}>
      <IncidentStack.Screen name="IncidentList" component={IncidentListScreen} />
      <IncidentStack.Screen
        name="IncidentDetail"
        component={IncidentDetailScreen}
        options={{ headerShown: true, title: t('incident.title') }}
      />
      <IncidentStack.Screen
        name="NewIncident"
        component={NewIncidentScreen}
        options={{ headerShown: true, title: t('incident.new') }}
      />
    </IncidentStack.Navigator>
  );
}

function MainTabNavigator() {
  const { t } = useTranslation();
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E8F0' },
      }}
    >
      <MainTab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ color, size }) => <TabIcon label={'\u{1F3E0}'} color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="IncidentsTab"
        component={IncidentStackNavigator}
        options={{
          tabBarLabel: t('nav.incidents'),
          tabBarIcon: ({ color, size }) => <TabIcon label={'\u26A0'} color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="PatrolTab"
        component={PatrolScreen}
        options={{
          tabBarLabel: t('nav.patrol'),
          tabBarIcon: ({ color, size }) => <TabIcon label={'\u{1F6E1}'} color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('nav.settings'),
          tabBarIcon: ({ color, size }) => <TabIcon label={'\u2699'} color={color} size={size} />,
        }}
      />
    </MainTab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  return <MainTabNavigator />;
}

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Incident } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface IncidentCardProps {
  incident: Incident;
  onPress: () => void;
}

export function IncidentCard({ incident, onPress }: IncidentCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <PriorityBadge priority={incident.priority} />
        <StatusBadge status={incident.status} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {incident.title}
      </Text>
      <Text style={styles.time}>
        {new Date(incident.createdAt).toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export interface User {
  id: string;
  nameEn: string;
  nameAr: string;
  role: string;
  zoneId: string | null;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  categoryId: string | null;
  zoneId: string | null;
  assignedOfficerId: string | null;
  createdAt: string;
  slaResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
}

export interface Shift {
  id: string;
  officerId: string;
  zoneId: string;
  status: 'scheduled' | 'active' | 'completed' | 'no_show' | 'called_off';
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  handoverNotes: string | null;
  zone?: { nameAr: string; nameEn: string };
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  defaultPriority: string;
  icon: string;
}

export interface PatrolRoute {
  id: string;
  name: string;
  zoneId: string;
  estimatedDurationMin: number;
}

export interface PatrolCheckpoint {
  id: string;
  nameAr: string;
  nameEn: string;
  type: string;
  sequenceOrder: number;
  expectedDwellMin: number;
  lat?: number;
  lng?: number;
}

export interface QueuedAction {
  id: string;
  actionType: string;
  payload: any;
  createdAtDevice: string;
}

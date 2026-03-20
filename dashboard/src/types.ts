export interface User {
  id: string;
  nameEn: string;
  nameAr: string;
  role: string;
  zoneId: string | null;
}

export interface Zone {
  id: string;
  nameAr: string;
  nameEn: string;
  color: string;
  supervisorId: string | null;
  _count?: { checkpoints: number; officers: number };
}

export interface Officer {
  id: string;
  nameAr: string;
  nameEn: string;
  badgeNumber: string;
  rank: string;
  role: string;
  zoneId: string | null;
  status: string;
  phone: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  priority: string;
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
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
}

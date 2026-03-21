import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useOfficerLocations } from '../../hooks/useOfficers';

const ROLE_COLORS: Record<string, string> = {
  supervisor: '#7c3aed',
  officer: '#16a34a',
  operator: '#2563eb',
  manager: '#dc2626',
  assistant_manager: '#ea580c',
};

const ROLE_AR: Record<string, string> = {
  supervisor: 'مشرف',
  officer: 'ضابط',
  operator: 'غرفة عمليات',
  manager: 'مدير الأمن',
  assistant_manager: 'نائب المدير',
};

export function OfficerMarkers() {
  const map = useMap();
  const { data: locations } = useOfficerLocations();
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const navigate = useNavigate();

  // Listen for action events from popup buttons
  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.action === 'profile') navigate('/personnel');
      else if (detail.action === 'broadcast') navigate('/broadcast');
      else if (detail.action === 'assign') navigate('/incidents');
    };
    window.addEventListener('map-officer-action', handleAction);
    return () => window.removeEventListener('map-officer-action', handleAction);
  }, [navigate]);

  useEffect(() => {
    if (!map) return;
    if (!locations || !Array.isArray(locations) || locations.length === 0) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const loc of locations as any[]) {
      if (loc.lat == null || loc.lng == null) continue;

      const name = loc.name_en || 'Officer';
      const nameAr = loc.name_ar || '';
      const role = loc.role || 'officer';
      const roleAr = ROLE_AR[role] || role;
      const badge = loc.badge_number || '';
      const rank = loc.rank || '';
      const parts = name.split(' ');
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      const color = ROLE_COLORS[role] || ROLE_COLORS.officer;
      const officerId = loc.officer_id || '';

      const el = document.createElement('div');
      el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;font-family:system-ui,sans-serif;line-height:1;`;
      el.textContent = initials;
      el.title = nameAr || name;

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '280px' }).setHTML(
        `<div style="font-size:12px;line-height:1.7;direction:rtl;text-align:right;padding:6px 2px;">
          <div style="font-size:15px;font-weight:800;color:#0f172a;">${nameAr || name}</div>
          ${nameAr ? `<div style="font-size:11px;color:#64748b;direction:ltr;text-align:left;">${name}</div>` : ''}
          <div style="font-family:monospace;font-size:11px;color:#64748b;margin-top:2px;">${badge}${rank ? ' · ' + rank : ''}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:6px;justify-content:flex-end;">
            <span style="font-size:10px;color:#16a34a;font-weight:600;">● في الخدمة</span>
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${color}">${roleAr}</span>
          </div>
          <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;">
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:6px;">⚡ إجراءات سريعة</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
              <button onclick="window.dispatchEvent(new CustomEvent('map-officer-action',{detail:{action:'profile',officerId:'${officerId}'}}))" style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;color:white;background:#0f172a;border:none;cursor:pointer;">👤 الملف الشخصي</button>
              <button onclick="window.dispatchEvent(new CustomEvent('map-officer-action',{detail:{action:'assign',officerId:'${officerId}'}}))" style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;color:white;background:#2563eb;border:none;cursor:pointer;">📋 تعيين بلاغ</button>
              <button onclick="window.dispatchEvent(new CustomEvent('map-officer-action',{detail:{action:'broadcast',officerId:'${officerId}'}}))" style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;color:white;background:#ea580c;border:none;cursor:pointer;">📢 إرسال تعليمات</button>
            </div>
          </div>
          <div style="margin-top:6px;padding-top:4px;border-top:1px solid #f1f5f9;font-size:9px;color:#94a3b8;">
            📍 ${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E · 🕐 ${new Date(loc.timestamp).toLocaleTimeString('ar-EG')}
          </div>
        </div>`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, locations]);

  return null;
}

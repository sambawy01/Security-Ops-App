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
      const officerId = loc.officer_id || '';
      const parts = name.split(' ');
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      const color = ROLE_COLORS[role] || ROLE_COLORS.officer;

      // Wrapper with hover tooltip
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;';

      // Circle marker
      const el = document.createElement('div');
      el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;font-family:system-ui,sans-serif;line-height:1;`;
      el.textContent = initials;

      // Hover tooltip card
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `position:absolute;bottom:30px;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:8px 12px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:100;box-shadow:0 4px 12px rgba(0,0,0,0.3);direction:rtl;text-align:right;min-width:160px;`;
      tooltip.innerHTML = `
        <div style="font-size:12px;font-weight:700;">${nameAr || name}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${badge} · ${roleAr}</div>
        <div style="margin-top:6px;padding-top:5px;border-top:1px solid #334155;">
          <span style="font-size:9px;color:#60a5fa;font-weight:600;cursor:pointer;">👤 اضغط لعرض الملف ←</span>
        </div>
      `;

      // Arrow
      const arrow = document.createElement('div');
      arrow.style.cssText = `position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#0f172a;pointer-events:none;`;
      tooltip.appendChild(arrow);

      wrapper.appendChild(el);
      wrapper.appendChild(tooltip);

      wrapper.addEventListener('mouseenter', () => { tooltip.style.opacity = '1'; });
      wrapper.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

      // Click → navigate
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`/personnel?selected=${officerId}`);
      });

      const marker = new maplibregl.Marker({ element: wrapper })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, locations, navigate]);

  return null;
}

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
      const badge = loc.badge_number || '';
      const officerId = loc.officer_id || '';
      const parts = name.split(' ');
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      const color = ROLE_COLORS[role] || ROLE_COLORS.officer;

      const el = document.createElement('div');
      el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;font-family:system-ui,sans-serif;line-height:1;`;
      el.textContent = initials;
      el.title = nameAr || name;

      // Click → navigate to personnel page with this officer expanded
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`/personnel?selected=${officerId}`);
      });

      const marker = new maplibregl.Marker({ element: el })
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

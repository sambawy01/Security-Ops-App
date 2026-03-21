import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!map) return;
    if (!locations || !Array.isArray(locations) || locations.length === 0) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const loc of locations as any[]) {
      if (loc.lat == null || loc.lng == null) continue;

      const name = loc.name_en || 'Officer';
      const role = loc.role || 'officer';
      const badge = loc.badge_number || '';
      const nameAr = loc.name_ar || '';
      const parts = name.split(' ');
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      const color = ROLE_COLORS[role] || ROLE_COLORS.officer;

      // Use exact same pattern as IncidentMarkers — simple div, no SVG
      const el = document.createElement('div');
      el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;font-family:system-ui,sans-serif;line-height:1;`;
      el.textContent = initials;
      el.title = name;

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="font-size:12px;padding:4px"><strong>${name}</strong>${nameAr ? '<br/>' + nameAr : ''}<br/><span style="font-family:monospace;color:#666">${badge}</span></div>`
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

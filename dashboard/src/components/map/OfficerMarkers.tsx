import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useOfficerLocations } from '../../hooks/useOfficers';

// Inject officer marker styles once
let styleInjected = false;
function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .officer-marker {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; cursor: pointer; position: relative;
    }
    .officer-marker svg {
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
    }
    .officer-marker .officer-label {
      position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
      background: #0f172a; color: #fff; padding: 3px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 600; white-space: nowrap; pointer-events: none;
      opacity: 0; transition: opacity 0.15s; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .officer-marker .officer-label::after {
      content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #0f172a;
    }
    .officer-marker:hover .officer-label { opacity: 1; }
  `;
  document.head.appendChild(style);
}

// SVG person icon — distinct from incident circle markers
function personSVG(color: string, initial: string): string {
  return `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="16" y="20.5" text-anchor="middle" fill="white" font-size="13" font-weight="700" font-family="system-ui,sans-serif">${initial}</text>
    </svg>
  `;
}

const ROLE_COLORS: Record<string, string> = {
  supervisor: '#7c3aed',  // Purple for supervisors
  officer: '#16a34a',     // Green for officers
  operator: '#2563eb',    // Blue for operators
  manager: '#dc2626',     // Red for managers
  assistant_manager: '#ea580c', // Orange for asst managers
};

export function OfficerMarkers() {
  const map = useMap();
  const { data: locations } = useOfficerLocations();
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!map || !locations) return;
    injectStyles();

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locations.forEach((loc: any) => {
      if (loc.lat == null || loc.lng == null) return;

      const name = loc.name_en || loc.nameEn || 'Officer';
      const nameAr = loc.name_ar || loc.nameAr || '';
      const badge = loc.badge_number || loc.badgeNumber || '';
      const role = loc.role || 'officer';
      const rank = loc.rank || '';

      // Get initial for the marker icon
      const parts = name.split(' ');
      const initial = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

      const color = ROLE_COLORS[role] ?? ROLE_COLORS.officer;

      // Create marker element with person icon
      const el = document.createElement('div');
      el.className = 'officer-marker';
      el.innerHTML = personSVG(color, initial);

      // Name label (shows on hover)
      const label = document.createElement('div');
      label.className = 'officer-label';
      label.textContent = name;
      el.appendChild(label);

      // Role label for popup
      const roleLabels: Record<string, string> = {
        supervisor: 'Supervisor',
        officer: 'Officer',
        operator: 'Operator',
        manager: 'Security Manager',
        assistant_manager: 'Asst. Manager',
        hr_admin: 'HR Admin',
        secretary: 'Secretary',
      };

      // Click popup
      const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setHTML(
        `<div style="font-size:12px;line-height:1.6;padding:4px 0">
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${name}</div>
          ${nameAr ? `<div style="font-size:12px;color:#64748b;direction:rtl;">${nameAr}</div>` : ''}
          <div style="font-family:monospace;font-size:11px;color:#64748b;margin-top:2px;">${badge}${rank ? ' • ' + rank : ''}</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${color}">${roleLabels[role] ?? role}</span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;"></span>
            <span style="font-size:10px;color:#16a34a;">On Duty</span>
          </div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <a href="/personnel" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">View Full Profile →</a>
          </div>
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, locations]);

  return null;
}

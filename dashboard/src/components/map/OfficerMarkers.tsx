import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useOfficerLocations } from '../../hooks/useOfficers';

export function OfficerMarkers() {
  const map = useMap();
  const { data: locations } = useOfficerLocations();
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!map || !locations) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locations.forEach((loc) => {
      if (loc.lat == null || loc.lng == null) return;

      const name = (loc as any).nameEn ?? 'Officer';
      const badge = (loc as any).badgeNumber ?? '';
      const status = (loc as any).status ?? 'active';
      const isOffline = status === 'device_offline';

      // Marker element
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.backgroundColor = isOffline ? '#eab308' : '#22c55e';
      el.style.position = 'relative';

      // Hover tooltip (name label) — shows on hover, not click
      const tooltip = document.createElement('div');
      tooltip.textContent = name;
      tooltip.style.cssText = `
        position:absolute; bottom:18px; left:50%; transform:translateX(-50%);
        background:#0f172a; color:white; padding:2px 8px; border-radius:4px;
        font-size:11px; font-weight:600; white-space:nowrap; pointer-events:none;
        opacity:0; transition:opacity 0.15s;
        box-shadow:0 2px 6px rgba(0,0,0,0.2);
      `;
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => { tooltip.style.opacity = '1'; });
      el.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

      // Click popup — detailed info
      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '220px' }).setHTML(
        `<div style="font-size:12px;line-height:1.6;padding:4px 0">
          <div style="font-weight:700;font-size:13px;color:#0f172a;">${name}</div>
          <div style="font-family:monospace;font-size:11px;color:#64748b;">${badge}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:4px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isOffline ? '#eab308' : '#22c55e'}"></span>
            <span style="font-size:11px;color:${isOffline ? '#a16207' : '#16a34a'}">${isOffline ? 'Device Offline' : 'Active'}</span>
          </div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <a href="/personnel" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">View Profile →</a>
          </div>
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el })
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

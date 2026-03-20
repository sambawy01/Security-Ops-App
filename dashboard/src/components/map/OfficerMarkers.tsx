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

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locations.forEach((loc) => {
      if (loc.lat == null || loc.lng == null) return;

      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      // Green for active, yellow for device_offline
      el.style.backgroundColor =
        (loc as any).status === 'device_offline' ? '#eab308' : '#22c55e';

      const popup = new maplibregl.Popup({ offset: 8, closeButton: false }).setHTML(
        `<div style="font-size:12px;line-height:1.4">
          <strong>${(loc as any).nameEn ?? 'Officer'}</strong><br/>
          ${(loc as any).badgeNumber ? `Badge: ${(loc as any).badgeNumber}<br/>` : ''}
          Status: <span style="color:${(loc as any).status === 'device_offline' ? '#ca8a04' : '#16a34a'}">${(loc as any).status ?? 'active'}</span>
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

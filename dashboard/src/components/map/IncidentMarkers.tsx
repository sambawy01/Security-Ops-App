import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useIncidentsGeoJSON } from '../../hooks/useIncidents';

const COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

export function IncidentMarkers() {
  const map = useMap();
  const { data } = useIncidentsGeoJSON();
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;
    if (!data || !data.features || data.features.length === 0) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const feature of data.features) {
      if (!feature.geometry || feature.geometry.type !== 'Point') continue;
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties || {};
      const priority = (props.priority || 'medium').toLowerCase();
      const color = COLORS[priority] || COLORS.medium;
      const title = props.title || 'Incident';

      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;`;
      el.title = title;

      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
        `<div style="font-size:12px;padding:4px;max-width:200px"><strong>${title}</strong>${props.category ? '<br/>' + props.category : ''}<br/><span style="color:${color};font-weight:bold">${priority}</span></div>`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, data]);

  return null;
}

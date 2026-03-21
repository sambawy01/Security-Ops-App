import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!map) return;
    if (!data || !data.features || data.features.length === 0) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const feature of data.features) {
      if (!feature.geometry || feature.geometry.type !== 'Point') continue;
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties || {};
      const priority = (props.priority || 'medium').toLowerCase();
      const color = COLORS[priority] || COLORS.medium;
      const title = props.title || 'بلاغ';
      const incidentId = props.id || '';

      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;`;
      el.title = title;

      // Click → navigate directly to incidents page with this incident selected
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`/incidents?selected=${incidentId}`);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, data, navigate]);

  return null;
}

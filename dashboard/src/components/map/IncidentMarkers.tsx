import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useIncidentsGeoJSON } from '../../hooks/useIncidents';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

// Inject pulsing animation CSS once
let styleInjected = false;
function injectPulseStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes incident-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
      70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .incident-pulse {
      animation: incident-pulse 1.5s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
}

export function IncidentMarkers() {
  const map = useMap();
  const { data } = useIncidentsGeoJSON();
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!map || !data) return;
    injectPulseStyle();

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const features = data.features ?? [];
    features.forEach((feature) => {
      const geom = feature.geometry;
      if (geom.type !== 'Point') return;
      const [lng, lat] = geom.coordinates;
      const props = feature.properties ?? {};
      const priority = (props.priority ?? 'medium').toLowerCase();
      const color = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;

      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      if (priority === 'critical') {
        el.classList.add('incident-pulse');
      }

      const slaHtml = props.slaResponseDeadline
        ? `<br/>SLA: ${new Date(props.slaResponseDeadline).toLocaleString()}`
        : '';

      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
        `<div style="font-size:12px;line-height:1.4;max-width:200px">
          <strong>${props.title ?? 'Incident'}</strong><br/>
          ${props.category ? `${props.category}<br/>` : ''}
          <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;color:white;background:${color}">${priority}</span>
          ${slaHtml}
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, data]);

  return null;
}

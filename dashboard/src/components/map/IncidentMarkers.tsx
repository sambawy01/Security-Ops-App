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

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
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
    .incident-pulse { animation: incident-pulse 1.5s ease-out infinite; }
    .incident-marker { transform-origin: center center; }
  `;
  document.head.appendChild(style);
}

export function IncidentMarkers() {
  const map = useMap();
  const { data } = useIncidentsGeoJSON();
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const prevDataRef = useRef<string>('');

  useEffect(() => {
    if (!map || !data) return;
    injectPulseStyle();

    const features = data.features ?? [];

    // Only rebuild if incident set changed
    const dataKey = features.map((f: any) => f.properties?.id).sort().join(',');
    if (dataKey === prevDataRef.current && markersRef.current.size > 0) return;
    prevDataRef.current = dataKey;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    features.forEach((feature) => {
      const geom = feature.geometry;
      if (geom.type !== 'Point') return;
      const [lng, lat] = geom.coordinates;
      const props = feature.properties ?? {};
      const priority = (props.priority ?? 'medium').toLowerCase();
      const color = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
      const title = props.title ?? 'Incident';
      const category = props.category ?? '';
      const status = props.status ?? 'open';
      const incidentId = props.id ?? '';

      const markerSize = 14;

      // Marker element
      const el = document.createElement('div');
      el.className = 'incident-marker';
      el.style.width = markerSize + 'px';
      el.style.height = markerSize + 'px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.position = 'relative';
      if (priority === 'critical') {
        el.classList.add('incident-pulse');
      }

      // Hover tooltip — shows title on hover
      const tooltip = document.createElement('div');
      tooltip.textContent = title;
      tooltip.style.cssText = `
        position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
        background:${color}; color:white; padding:2px 8px; border-radius:4px;
        font-size:11px; font-weight:600; white-space:nowrap; pointer-events:none;
        opacity:0; transition:opacity 0.15s; max-width:200px; overflow:hidden;
        text-overflow:ellipsis; box-shadow:0 2px 6px rgba(0,0,0,0.2);
      `;
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => { tooltip.style.opacity = '1'; });
      el.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

      // SLA display
      let slaHtml = '';
      if (props.slaResolutionDeadline) {
        const deadline = new Date(props.slaResolutionDeadline);
        const remaining = deadline.getTime() - Date.now();
        if (remaining > 0) {
          const mins = Math.floor(remaining / 60000);
          const hrs = Math.floor(mins / 60);
          const m = mins % 60;
          slaHtml = `<div style="font-size:10px;color:#16a34a;font-family:monospace;margin-top:2px;">⏱ ${hrs > 0 ? hrs + 'h ' : ''}${m}m remaining</div>`;
        } else {
          const overMins = Math.abs(Math.floor(remaining / 60000));
          slaHtml = `<div style="font-size:10px;color:#dc2626;font-weight:700;font-family:monospace;margin-top:2px;">⚠ OVERDUE +${overMins}m</div>`;
        }
      }

      // Click popup — detailed info with link to incidents page
      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '250px' }).setHTML(
        `<div style="font-size:12px;line-height:1.6;padding:4px 0">
          <div style="font-weight:700;font-size:13px;color:#0f172a;">${title}</div>
          ${category ? `<div style="font-size:11px;color:#64748b;">${category}</div>` : ''}
          <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;padding:1px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${color}">${PRIORITY_LABELS[priority] ?? priority}</span>
            <span style="font-size:10px;color:#64748b;background:#f1f5f9;padding:1px 6px;border-radius:4px;">${status}</span>
          </div>
          ${slaHtml}
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <a href="/incidents?selected=${incidentId}" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">View Incident Details →</a>
          </div>
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.set(incidentId || String(Math.random()), marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
    };
  }, [map, data]);

  return null;
}

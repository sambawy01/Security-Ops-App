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

const PRIORITY_AR: Record<string, string> = {
  critical: 'حرج',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

const STATUS_AR: Record<string, string> = {
  open: 'مفتوح',
  assigned: 'مكلف',
  in_progress: 'قيد التنفيذ',
  escalated: 'مصعّد',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

export function IncidentMarkers() {
  const map = useMap();
  const { data } = useIncidentsGeoJSON();
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Shared tooltip element
  useEffect(() => {
    if (!map) return;
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;background:white;color:#0f172a;padding:10px 14px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);border:1px solid #e2e8f0;direction:rtl;text-align:right;min-width:200px;max-width:260px;font-size:12px;';
    document.body.appendChild(tip);
    tooltipRef.current = tip;
    return () => { tip.remove(); tooltipRef.current = null; };
  }, [map]);

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
      const category = props.category || '';
      const status = props.status || 'open';
      const incidentId = props.id || '';
      const priorityAr = PRIORITY_AR[priority] || priority;
      const statusAr = STATUS_AR[status] || status;

      let slaBrief = '';
      if (props.slaResolutionDeadline) {
        const remaining = new Date(props.slaResolutionDeadline).getTime() - Date.now();
        if (remaining > 0) {
          const mins = Math.floor(remaining / 60000);
          slaBrief = `<div style="font-size:10px;margin-top:4px;font-family:monospace;color:#16a34a">⏱ متبقي ${Math.floor(mins/60)}س ${mins%60}د</div>`;
        } else {
          const overMins = Math.abs(Math.floor(remaining / 60000));
          slaBrief = `<div style="font-size:10px;margin-top:4px;font-family:monospace;color:#dc2626;font-weight:700">⚠ متجاوز +${Math.floor(overMins/60)}س ${overMins%60}د</div>`;
        }
      }

      const tipContent = `<div style="font-weight:700;margin-bottom:4px">${title}</div>${category ? `<div style="font-size:10px;color:#64748b">${category}</div>` : ''}<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end"><span style="padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;color:white;background:${color}">${priorityAr}</span><span style="padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;color:#475569;background:#f1f5f9">${statusAr}</span></div>${slaBrief}<div style="margin-top:5px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:9px;color:#2563eb;font-weight:600">📋 اضغط لعرض التفاصيل ←</div>`;

      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;`;

      el.addEventListener('mouseenter', () => {
        const tip = tooltipRef.current;
        if (!tip) return;
        tip.innerHTML = tipContent;
        const rect = el.getBoundingClientRect();
        tip.style.left = (rect.left + rect.width / 2 - 100) + 'px';
        tip.style.top = (rect.top - tip.offsetHeight - 8) + 'px';
        tip.style.opacity = '1';
      });

      el.addEventListener('mouseleave', () => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
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

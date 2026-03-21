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

      // SLA calculation
      let slaHtml = '';
      if (props.slaResolutionDeadline) {
        const deadline = new Date(props.slaResolutionDeadline);
        const remaining = deadline.getTime() - Date.now();
        if (remaining > 0) {
          const mins = Math.floor(remaining / 60000);
          const hrs = Math.floor(mins / 60);
          const m = mins % 60;
          slaHtml = `<div style="font-size:10px;color:#16a34a;font-family:monospace;margin-top:4px;">⏱ متبقي: ${hrs > 0 ? hrs + 'س ' : ''}${m}د</div>`;
        } else {
          const overMins = Math.abs(Math.floor(remaining / 60000));
          const overHrs = Math.floor(overMins / 60);
          const overM = overMins % 60;
          slaHtml = `<div style="font-size:10px;color:#dc2626;font-weight:700;font-family:monospace;margin-top:4px;">⚠ متجاوز: +${overHrs > 0 ? overHrs + 'س ' : ''}${overM}د</div>`;
        }
      }

      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);cursor:pointer;`;
      el.title = title;

      const popup = new maplibregl.Popup({ offset: 10, closeButton: true, maxWidth: '300px' }).setHTML(
        `<div style="font-size:12px;line-height:1.7;direction:rtl;text-align:right;padding:6px 2px;">
          <div style="font-size:14px;font-weight:800;color:#0f172a;">${title}</div>
          ${category ? `<div style="font-size:11px;color:#64748b;">${category}</div>` : ''}

          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;justify-content:flex-end;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${color}">${priorityAr}</span>
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;color:#475569;background:#f1f5f9;">${statusAr}</span>
          </div>

          ${slaHtml}

          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <div style="font-size:10px;color:#94a3b8;">📍 الموقع: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
            ${props.assignedOfficer ? `<div style="font-size:10px;color:#0f172a;margin-top:2px;">👮 المكلف: ${props.assignedOfficer}</div>` : `<div style="font-size:10px;color:#dc2626;margin-top:2px;">⚠ غير مكلف</div>`}
            ${props.createdAt ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px;">🕐 ${new Date(props.createdAt).toLocaleString('ar-EG')}</div>` : ''}
          </div>

          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:6px;">⚡ إجراءات</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
              <a href="/incidents?selected=${incidentId}" style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;color:white;background:#0f172a;text-decoration:none;">📋 عرض التفاصيل</a>
              <a href="/incidents" style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;color:white;background:#2563eb;text-decoration:none;">👮 تعيين ضابط</a>
              <a href="/broadcast" style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;color:white;background:#ea580c;text-decoration:none;">📢 إذاعة</a>
            </div>
          </div>
        </div>`
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

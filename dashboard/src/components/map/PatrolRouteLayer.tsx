import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useTranslation } from 'react-i18next';
import { useMap } from './MapContext';
import { usePatrolRoutesGeoJSON } from '../../hooks/useZones';

const SOURCE_ID = 'patrol-routes-src';
const LINE_LAYER_ID = 'patrol-routes-line';
const HALO_LAYER_ID = 'patrol-routes-halo';

/**
 * Renders all patrol routes on the map as colored LineStrings (one per zone).
 * Each route's color is the parent zone's color so officers see their patrol
 * loop in the same hue as the zone polygon. Hovering a segment shows the
 * route name + stop count + estimated duration.
 */
export function PatrolRouteLayer() {
  const map = useMap();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { data } = usePatrolRoutesGeoJSON();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if (!map.isStyleLoaded()) {
        map.once('styledata', apply);
        return;
      }

      const empty = { type: 'FeatureCollection' as const, features: [] };
      const fc = (visible ? data : null) ?? empty;

      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(fc as GeoJSON.FeatureCollection);
      } else {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc as GeoJSON.FeatureCollection });
        map.addLayer({
          id: HALO_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 7,
            'line-opacity': 0.55,
          },
        });
        map.addLayer({
          id: LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#3b82f6'],
            'line-width': 3.5,
            'line-opacity': 0.9,
            'line-dasharray': [2, 1.2],
          },
        });

        // Hover popup
        map.on('mousemove', LINE_LAYER_ID, (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as Record<string, string>;
          const zoneName = isAr ? p.zoneNameAr : p.zoneNameEn;
          const html = `<div style="font-size:12px;line-height:1.45;direction:${isAr ? 'rtl' : 'ltr'}">
            <div style="font-weight:700">${p.name}</div>
            <div style="color:#64748b">${zoneName}</div>
            <div style="color:#475569;margin-top:2px">${p.stops} ${isAr ? 'نقطة' : 'stops'} · ${p.durationMin} ${isAr ? 'دقيقة' : 'min'}</div>
          </div>`;
          if (!popupRef.current) {
            popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
          }
          popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });
        map.on('mouseleave', LINE_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
          popupRef.current?.remove();
        });
      }
    };

    apply();
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map, data, visible, isAr]);

  return (
    <div className="absolute bottom-4 left-32 z-10">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={`rounded px-2 py-1 text-xs font-medium shadow ${
          visible
            ? 'bg-white text-slate-700 border border-slate-300'
            : 'bg-slate-600 text-white'
        }`}
        aria-label={visible ? t('map.hideRoutes', 'Hide Routes') : t('map.showRoutes', 'Show Routes')}
      >
        {visible
          ? (isAr ? 'إخفاء المسارات' : 'Hide Routes')
          : (isAr ? 'إظهار المسارات' : 'Show Routes')}
      </button>
    </div>
  );
}

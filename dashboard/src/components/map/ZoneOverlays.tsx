import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useZonesGeoJSON } from '../../hooks/useZones';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SOURCE_ID = 'zones-geojson';
const FILL_LAYER_ID = 'zones-fill';
const LINE_LAYER_ID = 'zones-line';
const LABEL_LAYER_ID = 'zones-label';

export function ZoneOverlays() {
  const map = useMap();
  const { data } = useZonesGeoJSON();
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map || !data) return;

    // Clean up old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add or update source
    const source = map.getSource(SOURCE_ID) as any;
    if (source && typeof source.setData === 'function') {
      source.setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data: data as any });

      // Fill layer — semi-transparent zone fills
      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#6366f1'],
          'fill-opacity': 0.12,
        },
      });

      // Line layer — dashed boundaries matching the PDF style
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#6366f1'],
          'line-opacity': 0.8,
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      // Symbol layer — zone name labels
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['coalesce', ['get', 'nameAr'], ['get', 'nameEn']],
          'text-size': 11,
          'text-anchor': 'center',
          'text-offset': [0, 0],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#1e293b',
          'text-halo-width': 2,
          'text-halo-blur': 1,
        },
      });
    }

    // Add HTML markers for zone labels (better Arabic rendering)
    const fc = data as any;
    const features: any[] = fc.features || [];
    for (const feature of features) {
      const props = feature.properties || {};
      if (!props.nameEn && !props.nameAr) continue;

      const geom = feature.geometry;
      if (!geom || geom.type !== 'Polygon') continue;

      const coords: [number, number][] = geom.coordinates[0];
      let lngSum = 0, latSum = 0;
      for (const [lng, lat] of coords) {
        lngSum += lng;
        latSum += lat;
      }
      const centerLng = lngSum / coords.length;
      const centerLat = latSum / coords.length;

      const el = document.createElement('div');
      el.style.cssText = `
        background: rgba(30, 41, 59, 0.85);
        color: ${props.color || '#fff'};
        border: 1px solid ${props.color || '#6366f1'};
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      `;
      el.textContent = props.nameAr || props.nameEn || '';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([centerLng, centerLat])
        .addTo(map);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, data]);

  return null;
}
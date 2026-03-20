import { useEffect } from 'react';
import { useMap } from './MapContext';
import { useZonesGeoJSON } from '../../hooks/useZones';

const SOURCE_ID = 'zones-geojson';
const FILL_LAYER_ID = 'zones-fill';
const LINE_LAYER_ID = 'zones-line';

export function ZoneOverlays() {
  const map = useMap();
  const { data } = useZonesGeoJSON();

  useEffect(() => {
    if (!map || !data) return;

    // Add or update source
    const source = map.getSource(SOURCE_ID);
    if (source && 'setData' in source) {
      (source as { setData: (data: GeoJSON.GeoJSON) => void }).setData(data as GeoJSON.GeoJSON);
      return;
    }

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: data as GeoJSON.GeoJSON,
    });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], '#6366f1'],
        'fill-opacity': 0.15,
      },
    });

    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#6366f1'],
        'line-opacity': 0.6,
        'line-width': 2,
      },
    });

    return () => {
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, data]);

  return null;
}

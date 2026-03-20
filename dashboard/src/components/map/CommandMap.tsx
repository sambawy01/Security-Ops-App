import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRef, useEffect, useState } from 'react';
import { MapContext } from './MapContext';

export function CommandMap({ children }: { children?: React.ReactNode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [33.852, 27.182],
      zoom: 14.5,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setMapInstance(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          {children}
        </MapContext.Provider>
      )}
    </div>
  );
}

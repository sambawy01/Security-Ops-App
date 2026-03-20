import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRef, useEffect, useState } from 'react';
import { MapContext } from './MapContext';
import { Navigation } from 'lucide-react';

// El Gouna fallback center
const DEFAULT_CENTER: [number, number] = [33.852, 27.182];
const DEFAULT_ZOOM = 14.5;

export function CommandMap({ children }: { children?: React.ReactNode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

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
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'top-right');

    map.on('load', () => {
      setMapInstance(map);

      // Get user's actual location, fly there, and relocate personnel around them
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { longitude, latitude } = pos.coords;
            map.flyTo({ center: [longitude, latitude], zoom: 15, duration: 2000 });

            // Add "You are here" marker
            const el = document.createElement('div');
            el.style.width = '16px';
            el.style.height = '16px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#3b82f6';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 0 0 2px #3b82f6, 0 0 12px rgba(59,130,246,0.5)';

            const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
              .setHTML('<div style="font-size:11px;font-weight:600;color:#1e40af;">📍 You are here</div>');

            userMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([longitude, latitude])
              .setPopup(popup)
              .addTo(map);

            // Auto-relocate personnel around current position
            try {
              const token = localStorage.getItem('accessToken');
              await fetch(`${import.meta.env.VITE_API_URL}/api/v1/dashboard/relocate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ lat: latitude, lng: longitude }),
              });
              console.log(`[map] Personnel relocated around ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            } catch {
              // Best-effort — if it fails, officers stay where they were
            }
          },
          () => {
            // Geolocation denied or failed — stay at El Gouna default
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    });

    mapRef.current = map;

    return () => {
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Button to fly back to El Gouna
  const flyToElGouna = () => {
    mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 1500 });
  };

  // Button to fly to user location
  const flyToMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15, duration: 1500 });
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Quick navigation buttons */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2 pointer-events-auto">
        <button
          onClick={flyToElGouna}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg text-xs font-medium text-slate-700 hover:bg-white transition-colors"
          title="Go to El Gouna"
        >
          🏖️ El Gouna
        </button>
        <button
          onClick={flyToMe}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 border border-blue-700 shadow-lg text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          title="Go to my location"
        >
          <Navigation className="h-3 w-3" />
          My Location
        </button>
      </div>

      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          {children}
        </MapContext.Provider>
      )}
    </div>
  );
}

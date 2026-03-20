import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';
import { useCheckpointsGeoJSON } from '../../hooks/useZones';

const TYPE_COLORS: Record<string, string> = {
  gate: '#3b82f6',
  patrol: '#22c55e',
  fixed: '#94a3b8',
};

export function CheckpointMarkers() {
  const map = useMap();
  const { data } = useCheckpointsGeoJSON();
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!map || !data) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!visible) return;

    const features = data.features ?? [];
    features.forEach((feature) => {
      const geom = feature.geometry;
      if (geom.type !== 'Point') return;
      const [lng, lat] = geom.coordinates;
      const props = feature.properties ?? {};
      const cpType = (props.type ?? 'fixed').toLowerCase();
      const color = TYPE_COLORS[cpType] ?? TYPE_COLORS.fixed;

      // Diamond-shaped marker via rotated square
      const el = document.createElement('div');
      el.style.width = '8px';
      el.style.height = '8px';
      el.style.backgroundColor = color;
      el.style.transform = 'rotate(45deg)';
      el.style.border = '1px solid white';
      el.style.opacity = '0.7';
      el.style.cursor = 'pointer';

      const popup = new maplibregl.Popup({ offset: 6, closeButton: false }).setHTML(
        `<div style="font-size:11px;line-height:1.4">
          <strong>${props.nameEn ?? props.name ?? 'Checkpoint'}</strong><br/>
          Type: ${cpType}<br/>
          ${props.zoneName ? `Zone: ${props.zoneName}` : ''}
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
  }, [map, data, visible]);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={`rounded px-2 py-1 text-xs font-medium shadow ${
          visible
            ? 'bg-white text-slate-700 border border-slate-300'
            : 'bg-slate-600 text-white'
        }`}
        aria-label={visible ? 'Hide checkpoints' : 'Show checkpoints'}
      >
        {visible ? 'Hide Checkpoints' : 'Show Checkpoints'}
      </button>
    </div>
  );
}

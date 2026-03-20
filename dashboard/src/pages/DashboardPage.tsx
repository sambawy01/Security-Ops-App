import { CommandMap } from '../components/map/CommandMap';
import { ZoneOverlays } from '../components/map/ZoneOverlays';
import { OfficerMarkers } from '../components/map/OfficerMarkers';
import { IncidentMarkers } from '../components/map/IncidentMarkers';
import { CheckpointMarkers } from '../components/map/CheckpointMarkers';

export function DashboardPage() {
  return (
    <div className="-m-6 h-[calc(100vh-4rem)]">
      <CommandMap>
        <ZoneOverlays />
        <OfficerMarkers />
        <IncidentMarkers />
        <CheckpointMarkers />
      </CommandMap>
    </div>
  );
}

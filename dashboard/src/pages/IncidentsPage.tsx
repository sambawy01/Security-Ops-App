import { useState } from 'react';
import { IncidentQueue } from '../components/incidents/IncidentQueue';
import { IncidentDetail } from '../components/incidents/IncidentDetail';
import { Inbox } from 'lucide-react';

export function IncidentsPage() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel: Incident Queue */}
      <div className="w-[45%] flex-shrink-0 border-r border-slate-200 bg-slate-50/50 overflow-hidden">
        <IncidentQueue
          onSelectIncident={setSelectedIncidentId}
          selectedId={selectedIncidentId}
        />
      </div>

      {/* Right panel: Incident Detail or Placeholder */}
      <div className="flex-1 bg-white overflow-hidden">
        {selectedIncidentId ? (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <Inbox className="h-12 w-12 stroke-1" />
            <p className="text-sm font-medium">
              Select an incident from the list
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

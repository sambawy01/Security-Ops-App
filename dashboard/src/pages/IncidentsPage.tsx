import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { IncidentQueue } from '../components/incidents/IncidentQueue';
import { IncidentDetail } from '../components/incidents/IncidentDetail';
import { Inbox } from 'lucide-react';

export function IncidentsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    searchParams.get('selected')
  );

  // Sync URL param → state (when navigating from map)
  useEffect(() => {
    const fromUrl = searchParams.get('selected');
    if (fromUrl && fromUrl !== selectedIncidentId) {
      setSelectedIncidentId(fromUrl);
    }
  }, [searchParams]);

  // When user selects an incident from the queue, update URL too
  const handleSelect = (id: string | null) => {
    setSelectedIncidentId(id);
    if (id) {
      setSearchParams({ selected: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel: Incident Queue */}
      <div className="w-[45%] flex-shrink-0 border-e border-slate-200 bg-slate-50/50 overflow-hidden">
        <IncidentQueue
          onSelectIncident={handleSelect}
          selectedId={selectedIncidentId}
        />
      </div>

      {/* Right panel: Incident Detail or Placeholder */}
      <div className="flex-1 bg-white overflow-hidden">
        {selectedIncidentId ? (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onClose={() => handleSelect(null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <Inbox className="h-12 w-12 stroke-1" />
            <p className="text-sm font-medium">
              {t('incident.selectIncident')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { SlaTimer } from './SlaTimer';
import { AssignOfficerDialog } from './AssignOfficerDialog';
import {
  useIncidentDetail,
  useUpdateIncident,
  useAddIncidentUpdate,
} from '../../hooks/useIncidents';

interface IncidentDetailProps {
  incidentId: string | null;
  onClose: () => void;
}

const priorityVariant: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

const priorityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

interface IncidentDetailData {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  categoryId: string | null;
  zoneId: string | null;
  assignedOfficerId: string | null;
  createdAt: string;
  slaResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
  reporterPhone?: string;
  reporterChannel?: string;
  assignedOfficer?: { id: string; nameEn: string; badgeNumber: string } | null;
  zone?: { id: string; nameEn: string } | null;
  category?: { id: string; nameEn: string } | null;
  updates?: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: string;
    author?: { nameEn: string } | null;
  }>;
}

function getAvailableActions(status: string): Array<{ action: string; label: string; variant: 'default' | 'destructive' | 'outline'; newStatus?: string }> {
  switch (status) {
    case 'open':
      return [{ action: 'assign', label: 'Assign Officer', variant: 'default' }];
    case 'assigned':
      return [
        { action: 'acknowledge', label: 'Acknowledge', variant: 'default' as const, newStatus: 'in_progress' },
      ];
    case 'in_progress':
      return [
        { action: 'resolve', label: 'Resolve', variant: 'default' as const, newStatus: 'resolved' },
        { action: 'escalate', label: 'Escalate', variant: 'destructive' as const, newStatus: 'escalated' },
      ];
    case 'escalated':
      return [
        { action: 'deescalate', label: 'De-escalate', variant: 'outline' as const, newStatus: 'in_progress' },
      ];
    case 'resolved':
      return [
        { action: 'close', label: 'Close', variant: 'default' as const, newStatus: 'closed' },
      ];
    default:
      return [];
  }
}

const updateTypeIcon: Record<string, typeof Clock> = {
  status_change: AlertTriangle,
  assignment: User,
  note: MessageSquare,
  creation: Clock,
};

export function IncidentDetail({ incidentId, onClose }: IncidentDetailProps) {
  const { data, isLoading } = useIncidentDetail(incidentId);
  const updateMutation = useUpdateIncident();
  const addNoteMutation = useAddIncidentUpdate();
  const [noteText, setNoteText] = useState('');
  const [noteRecipient, setNoteRecipient] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Cast to extended type that may include relations from the API
  const incident = data as IncidentDetailData | undefined;

  if (!incidentId) return null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">Incident not found</p>
      </div>
    );
  }

  const actions = getAvailableActions(incident.status);
  const canCancel = !['closed', 'cancelled'].includes(incident.status);

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({
      incidentId: incident.id,
      data: { status: newStatus },
    });
  };

  const handleSendNote = () => {
    if (!noteText.trim()) return;
    const recipientLabel = noteRecipient === 'all' ? 'Broadcast' :
      noteRecipient === 'assistant_manager' ? 'To: Asst. Managers' :
      noteRecipient === 'supervisor' ? 'To: Supervisors' :
      noteRecipient === 'officer' ? 'To: Officers' : 'To: All Personnel';
    addNoteMutation.mutate(
      {
        incidentId: incident.id,
        data: {
          type: 'note',
          content: `[${recipientLabel}] ${noteText.trim()}`,
        },
      },
      {
        onSuccess: () => {
          setNoteText('');
          setNoteRecipient('all');
        },
      }
    );
  };

  const timeline = incident.updates
    ? [...incident.updates].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Close detail panel"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 font-mono">
            Incident #{incident.id.slice(0, 8)}
          </p>
          <h2 className="text-base font-semibold text-slate-900 truncate">
            {incident.title}
          </h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Priority & Category */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              priorityDot[incident.priority] ?? 'bg-slate-400'
            )}
          />
          <Badge variant={priorityVariant[incident.priority] ?? 'default'}>
            {incident.priority}
          </Badge>
          {incident.category && (
            <>
              <span className="text-slate-300">&middot;</span>
              <span className="text-sm text-slate-600">
                {incident.category.nameEn}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {incident.description && (
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>
        )}

        {/* SLA Timers */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
          <SlaTimer
            deadline={incident.slaResponseDeadline}
            label="Response"
          />
          <SlaTimer
            deadline={incident.slaResolutionDeadline}
            label="Resolution"
          />
        </div>

        {/* Details */}
        <div className="space-y-3 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-500">Zone:</span>
            <span className="text-slate-900 font-medium">
              {incident.zone?.nameEn ?? incident.zoneId?.slice(0, 8) ?? 'N/A'}
            </span>
          </div>

          {(incident.reporterPhone || incident.reporterChannel) && (
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Reporter:</span>
              <span className="text-slate-900">
                {incident.reporterChannel ?? 'Unknown'}{' '}
                {incident.reporterPhone && (
                  <span className="font-mono text-xs text-slate-500">
                    ({incident.reporterPhone})
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-500">Assigned:</span>
            {incident.assignedOfficer ? (
              <span className="text-slate-900 font-medium">
                {incident.assignedOfficer.nameEn}
                <button
                  onClick={() => setAssignDialogOpen(true)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  [Reassign]
                </button>
              </span>
            ) : (
              <span className="text-slate-400 italic">
                Unassigned
                <button
                  onClick={() => setAssignDialogOpen(true)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium not-italic"
                >
                  [Assign Officer]
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-500">Created:</span>
            <span className="text-slate-900 font-mono text-xs">
              {formatDate(incident.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Actions
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) =>
              a.action === 'assign' ? (
                <Button
                  key={a.action}
                  size="sm"
                  variant={a.variant}
                  onClick={() => setAssignDialogOpen(true)}
                  disabled={updateMutation.isPending}
                >
                  {a.label}
                </Button>
              ) : (
                <Button
                  key={a.action}
                  size="sm"
                  variant={a.variant}
                  onClick={() => handleStatusChange(a.newStatus!)}
                  disabled={updateMutation.isPending}
                >
                  {a.label}
                </Button>
              )
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusChange('cancelled')}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            )}
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 self-center" />
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Timeline
          </p>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No updates yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((update) => {
                const IconComponent =
                  updateTypeIcon[update.type] ?? Clock;
                return (
                  <div
                    key={update.id}
                    className="flex items-start gap-2.5"
                  >
                    <IconComponent className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">
                        {update.content}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {formatDate(update.createdAt)}
                        {update.author && (
                          <span> &mdash; {update.author.nameEn}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Note with Recipient Selection */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Send Note
          </p>

          {/* Recipient selector */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { value: 'all', label: 'Broadcast All', icon: '📢' },
              { value: 'assistant_manager', label: 'Asst. Managers', icon: '👔' },
              { value: 'supervisor', label: 'Supervisors', icon: '🎖️' },
              { value: 'officer', label: 'Officers', icon: '👮' },
              { value: 'personnel', label: 'All Personnel', icon: '👥' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setNoteRecipient(r.value)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors border',
                  noteRecipient === r.value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                )}
              >
                <span>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>

          {/* Note input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendNote();
                  }
                }}
                placeholder={
                  noteRecipient === 'all'
                    ? 'Broadcast to all personnel...'
                    : noteRecipient === 'assistant_manager'
                    ? 'Note to assistant managers...'
                    : noteRecipient === 'supervisor'
                    ? 'Note to supervisors...'
                    : noteRecipient === 'officer'
                    ? 'Note to officers...'
                    : 'Note to all personnel...'
                }
                rows={2}
                className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 resize-none"
                aria-label="Note content"
              />
              <span className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-mono">
                To: {noteRecipient === 'all' ? 'Everyone' :
                     noteRecipient === 'assistant_manager' ? 'Asst. Managers' :
                     noteRecipient === 'supervisor' ? 'Supervisors' :
                     noteRecipient === 'officer' ? 'Officers' : 'All Personnel'}
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleSendNote}
              disabled={!noteText.trim() || addNoteMutation.isPending}
              className="self-end"
            >
              {addNoteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Assign Dialog */}
      <AssignOfficerDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        incidentId={incident.id}
        zoneId={incident.zoneId}
      />
    </div>
  );
}

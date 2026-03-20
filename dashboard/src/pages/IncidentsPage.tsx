import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function IncidentsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Incident Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 font-mono">
            Active incidents and SLA tracking -- coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

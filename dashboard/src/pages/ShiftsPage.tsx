import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function ShiftsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shift Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 font-mono">
            Shift planning and coverage management -- coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

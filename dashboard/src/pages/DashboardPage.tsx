import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Command Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 font-mono">
            Real-time zone overview and officer positions -- coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

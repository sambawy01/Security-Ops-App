import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function PersonnelPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 font-mono">
            Officer roster and zone assignments -- coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

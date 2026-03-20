import { OfficerRoster } from '../components/personnel/OfficerRoster';

export function PersonnelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Personnel</h1>
        <p className="text-slate-500 mt-1">Officer roster and status overview</p>
      </div>
      <OfficerRoster />
    </div>
  );
}

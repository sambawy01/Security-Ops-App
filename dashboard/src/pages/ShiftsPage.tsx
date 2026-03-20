import { ShiftSchedule } from '../components/personnel/ShiftSchedule';

export function ShiftsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shift Schedule</h1>
        <p className="text-slate-500 mt-1">Weekly shift assignments and attendance</p>
      </div>
      <ShiftSchedule />
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { ShiftSchedule } from '../components/personnel/ShiftSchedule';

export function ShiftsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('shift.title')}</h1>
        <p className="text-slate-500 mt-1">{t('shift.subtitle')}</p>
      </div>
      <ShiftSchedule />
    </div>
  );
}

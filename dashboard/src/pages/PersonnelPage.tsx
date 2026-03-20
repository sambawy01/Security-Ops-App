import { useTranslation } from 'react-i18next';
import { OfficerRoster } from '../components/personnel/OfficerRoster';

export function PersonnelPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('personnel.title')}</h1>
        <p className="text-slate-500 mt-1">{t('personnel.subtitle')}</p>
      </div>
      <OfficerRoster />
    </div>
  );
}

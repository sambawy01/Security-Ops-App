import { useTranslation } from 'react-i18next';
import { WorkforceManagement } from '../components/personnel/WorkforceManagement';

export function WorkforcePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('workforce.title')}</h1>
        <p className="text-slate-500 mt-1">{t('workforce.subtitle')}</p>
      </div>
      <WorkforceManagement />
    </div>
  );
}
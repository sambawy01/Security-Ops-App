import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Badge } from './ui/badge';

const pageTitleKeys: Record<string, string> = {
  '/': 'dashboard',
  '/incidents': 'incidents',
  '/personnel': 'personnel',
  '/shifts': 'shifts',
  '/reports': 'reports',
};

const roleLabels: Record<string, string> = {
  manager: 'Manager',
  assistant_manager: 'Asst. Manager',
  supervisor: 'Supervisor',
};

const roleVariant: Record<string, 'default' | 'success' | 'medium'> = {
  manager: 'success',
  assistant_manager: 'medium',
  supervisor: 'default',
};

export function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const titleKey = pageTitleKeys[location.pathname] ?? 'dashboard';
  const title = t(titleKey);
  const isSupervisor = user?.role === 'supervisor';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        {isSupervisor && user?.zoneId && (
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Zone {user.zoneId.slice(0, 8)}
          </span>
        )}
        <span className="text-sm font-medium text-slate-700">
          {user?.nameEn}
        </span>
        <Badge variant={roleVariant[user?.role ?? ''] ?? 'default'}>
          {roleLabels[user?.role ?? ''] ?? user?.role}
        </Badge>
      </div>
    </header>
  );
}

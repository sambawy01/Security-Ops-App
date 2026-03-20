import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Clock,
  LogOut,
  Shield,
  FileText,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle, badge: true },
  { name: 'Personnel', href: '/personnel', icon: Users },
  { name: 'Shifts', href: '/shifts', icon: Clock },
  { name: 'Reports', href: '/reports', icon: FileText },
];

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

// Supervisors only see Dashboard and Incidents
const supervisorPaths = new Set(['/', '/incidents']);

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isSupervisor = user?.role === 'supervisor';

  const items = isSupervisor
    ? navigation.filter((item) => supervisorPaths.has(item.href))
    : navigation;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
          <Shield className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-wide font-mono">
            SECURITY OS
          </p>
          <p className="text-xs text-slate-500 font-mono">El Gouna</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-mono font-bold text-white">
                  0
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-slate-300">
            {user?.nameEn?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.nameEn ?? 'Unknown'}
            </p>
            <Badge
              variant={roleVariant[user?.role ?? ''] ?? 'default'}
              className="mt-0.5"
            >
              {roleLabels[user?.role ?? ''] ?? user?.role}
            </Badge>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

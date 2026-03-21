import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useOfficers } from '../../hooks/useOfficers';
import { useZones } from '../../hooks/useZones';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabList, Tab, TabPanel } from '../ui/tabs';
import { OfficerCard } from './OfficerCard';

const roleOptionsEn = [
  { value: '', label: 'All Roles' },
  { value: 'officer', label: 'Officer' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'commander', label: 'Commander' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'admin', label: 'Admin' },
  { value: 'trainee', label: 'Trainee' },
];

const roleOptionsAr = [
  { value: '', label: 'جميع الرتب' },
  { value: 'officer', label: 'ضابط' },
  { value: 'supervisor', label: 'مشرف' },
  { value: 'commander', label: 'قائد' },
  { value: 'dispatcher', label: 'مرسل' },
  { value: 'analyst', label: 'محلل' },
  { value: 'admin', label: 'مسؤول' },
  { value: 'trainee', label: 'متدرب' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function OfficerRoster({ autoExpandId }: { autoExpandId?: string | null }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [searchInput, setSearchInput] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const debouncedSearch = useDebounce(searchInput, 300);

  const roleOptions = isAr ? roleOptionsAr : roleOptionsEn;

  // Fetch all officers (we filter client-side for tabs + search)
  const apiFilters = useMemo(
    () => ({
      ...(zoneFilter ? { zoneId: zoneFilter } : {}),
    }),
    [zoneFilter]
  );

  const { data: officers, isLoading } = useOfficers(apiFilters);
  const { data: zones } = useZones();

  const zoneOptions = useMemo(() => {
    const base = [{ value: '', label: isAr ? 'جميع المناطق' : 'All Zones' }];
    if (!zones) return base;
    return [...base, ...zones.map((z) => ({ value: z.id, label: isAr ? (z.nameAr || z.nameEn) : z.nameEn }))];
  }, [zones, isAr]);

  // Client-side filtering for role and search
  const filtered = useMemo(() => {
    if (!officers) return [];
    return officers.filter((o) => {
      if (roleFilter && o.role !== roleFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const nameMatch = o.nameEn.toLowerCase().includes(q) || ((o as any).nameAr ?? '').includes(q);
        const badgeMatch = o.badgeNumber.toLowerCase().includes(q);
        if (!nameMatch && !badgeMatch) return false;
      }
      return true;
    });
  }, [officers, roleFilter, debouncedSearch]);

  // Split by status
  const onDuty = useMemo(() => filtered.filter((o) => o.status === 'active'), [filtered]);
  const offDuty = useMemo(() => filtered.filter((o) => o.status === 'off_duty'), [filtered]);

  const renderList = (list: typeof filtered) => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-slate-500">{isAr ? 'لا يوجد ضباط مطابقين للبحث' : 'No officers match your filters'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2" role="list">
        {list.map((officer) => (
          <OfficerCard key={officer.id} officer={officer} autoExpand={officer.id === autoExpandId} />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <Tabs defaultValue="on_duty">
        <div className="border-b border-slate-200 px-4 pt-2">
          <TabList className="border-b-0">
            <Tab value="on_duty">
              <span className="flex items-center gap-2">
                {t('personnel.onDuty')}
                <Badge variant="success">{onDuty.length}</Badge>
              </span>
            </Tab>
            <Tab value="off_duty">
              <span className="flex items-center gap-2">
                {t('personnel.offDuty')}
                <Badge variant="default">{offDuty.length}</Badge>
              </span>
            </Tab>
            <Tab value="all">
              <span className="flex items-center gap-2">
                {t('personnel.all')}
                <Badge variant="default">{filtered.length}</Badge>
              </span>
            </Tab>
          </TabList>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-slate-100">
          <div className="w-44">
            <Select
              options={zoneOptions}
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              aria-label={isAr ? 'تصفية حسب المنطقة' : 'Filter by zone'}
            />
          </div>
          <div className="w-44">
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label={isAr ? 'تصفية حسب الرتبة' : 'Filter by role'}
            />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو رقم الشارة...' : 'Search by name or badge...'}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
              aria-label={isAr ? 'بحث الضباط' : 'Search officers'}
            />
          </div>
        </div>

        {/* Tab panels */}
        <div className="p-4">
          <TabPanel value="on_duty">{renderList(onDuty)}</TabPanel>
          <TabPanel value="off_duty">{renderList(offDuty)}</TabPanel>
          <TabPanel value="all">{renderList(filtered)}</TabPanel>
        </div>
      </Tabs>
    </div>
  );
}

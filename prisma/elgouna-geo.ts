/**
 * Real El Gouna geography — 9 zones calibrated to actual OpenStreetMap coordinates.
 *
 * Zone coordinates derived from Nominatim geocoding of real El Gouna landmarks:
 *   North Bay          33.6496, 27.4299
 *   El Gouna Church     33.6581, 27.3633
 *   Sliders Cable Park  33.6608, 27.3774
 *   Ancient Sands Golf  33.6616, 27.4083
 *   Casa Cook           33.6673, 27.4250
 *   Three Corners       33.6730, 27.3995
 *   Abu Tig Marina      33.6767, 27.4080
 *   Kafr El Gouna       33.6771, 27.3961
 *   Steigenberger Golf  33.6773, 27.3903
 *   Sheraton Miramar    33.6780, 27.4048
 *   Movenpick Resort    33.6849, 27.3943
 *
 * El Gouna actual footprint:
 *   longitude ~33.648 → 33.690 (≈4.5 km west–east)
 *   latitude  ~27.360 → 27.430 (≈7.5 km north–south)
 */

export type CheckpointType = 'gate' | 'patrol' | 'fixed';

export interface ZoneGeo {
  nameEn: string;
  nameAr: string;
  color: string;
  previousNameEn?: string;
  polygon?: [number, number][];
  bbox?: [number, number, number, number];
  route: { name: string; checkpointOrder: string[]; estimatedMin: number };
  checkpoints: Array<{
    nameEn: string;
    nameAr: string;
    type: CheckpointType;
    lat: number;
    lng: number;
  }>;
}

export const EL_GOUNA_ZONES: ZoneGeo[] = [
  // 1. Al Bustan (البستان) — Western perimeter, entrance, church area
  //    Church at 33.658, 27.363 — entrance road from Hurghada
  {
    nameEn: 'Al Bustan',
    nameAr: 'البستان',
    color: '#9ca3af',
    previousNameEn: 'Bostan',
    polygon: [
      [33.6480, 27.4050],
      [33.6650, 27.4080],
      [33.6650, 27.3750],
      [33.6550, 27.3700],
      [33.6480, 27.3800],
      [33.6480, 27.4050],
    ],
    route: {
      name: 'Al Bustan Perimeter Patrol',
      estimatedMin: 45,
      checkpointOrder: [
        'El Gouna Entrance Gate',
        'Bustan North Checkpoint',
        'Church Crossing',
        'Bustan West Gate',
        'Bustan South Outpost',
      ],
    },
    checkpoints: [
      { nameEn: 'El Gouna Entrance Gate',  nameAr: 'بوابة دخول الجونة',          type: 'gate',   lat: 27.3950, lng: 33.6600 },
      { nameEn: 'Bustan North Checkpoint', nameAr: 'نقطة تفتيش البستان الشمالية', type: 'gate',   lat: 27.4020, lng: 33.6600 },
      { nameEn: 'Church Crossing',         nameAr: 'تقاطع الكنيسة',              type: 'fixed',  lat: 27.3650, lng: 33.6580 },
      { nameEn: 'Bustan West Gate',        nameAr: 'بوابة البستان الغربية',       type: 'gate',   lat: 27.3850, lng: 33.6500 },
      { nameEn: 'Bustan South Outpost',    nameAr: 'موقع البستان الجنوبي',        type: 'patrol', lat: 27.3750, lng: 33.6520 },
      { nameEn: 'Bustan Desert Trail',     nameAr: 'مسار البستان الصحراوي',       type: 'patrol', lat: 27.3900, lng: 33.6550 },
      { nameEn: 'Bustan Perimeter Road',   nameAr: 'طريق محيط البستان',          type: 'patrol', lat: 27.3980, lng: 33.6580 },
      { nameEn: 'Sliders Cable Park Gate', nameAr: 'بوابة سلادرز كابل بارك',      type: 'gate',   lat: 27.3780, lng: 33.6610 },
    ],
  },
  // 2. Golf (الجولف) — Central-west, Steigenberger Golf Resort at 33.677, 27.390
  {
    nameEn: 'Golf',
    nameAr: 'الجولف',
    color: '#eab308',
    previousNameEn: 'Golf',
    polygon: [
      [33.6650, 27.4020],
      [33.6770, 27.4020],
      [33.6770, 27.3820],
      [33.6680, 27.3800],
      [33.6650, 27.3850],
      [33.6650, 27.4020],
    ],
    route: {
      name: 'Golf Course Patrol Loop',
      estimatedMin: 40,
      checkpointOrder: [
        'Steigenberger Main Gate',
        'Golf Clubhouse',
        'Pro Shop',
        'Golf Course North Tee',
        'Fairway Mid Point',
        'Golf Course South Tee',
        'Golf Service Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Steigenberger Main Gate',  nameAr: 'بوابة شتايجنبرجر الرئيسية', type: 'gate',   lat: 27.3920, lng: 33.6760 },
      { nameEn: 'Golf Clubhouse',           nameAr: 'نادي الجولف',               type: 'fixed',  lat: 27.3900, lng: 33.6770 },
      { nameEn: 'Pro Shop',                 nameAr: 'متجر الجولف',               type: 'fixed',  lat: 27.3905, lng: 33.6775 },
      { nameEn: 'Golf Course North Tee',    nameAr: 'بداية ملعب الجولف الشمالية', type: 'patrol', lat: 27.3980, lng: 33.6720 },
      { nameEn: 'Fairway Mid Point',        nameAr: 'منتصف الفيرواي',            type: 'patrol', lat: 27.3880, lng: 33.6720 },
      { nameEn: 'Golf Course South Tee',    nameAr: 'بداية ملعب الجولف الجنوبية', type: 'patrol', lat: 27.3840, lng: 33.6700 },
      { nameEn: 'Golf Service Gate',        nameAr: 'بوابة خدمة الجولف',         type: 'gate',   lat: 27.3860, lng: 33.6680 },
      { nameEn: 'Golf Maintenance Yard',    nameAr: 'فناء صيانة الجولف',         type: 'fixed',  lat: 27.3870, lng: 33.6690 },
      { nameEn: 'Sheraton Lobby',           nameAr: 'لوبي شيراتون',              type: 'fixed',  lat: 27.4030, lng: 33.6760 },
      { nameEn: 'West Golf Entrance',       nameAr: 'مدخل الجولف الغربي',        type: 'gate',   lat: 27.3950, lng: 33.6660 },
    ],
  },
  // 3. Kafr El Gouna (كفر الجونة) — Central downtown, Kafr at 33.677, 27.396
  {
    nameEn: 'Kafr El Gouna',
    nameAr: 'كفر الجونة',
    color: '#22c55e',
    previousNameEn: 'Kafr El Gouna',
    polygon: [
      [33.6740, 27.4020],
      [33.6820, 27.4020],
      [33.6820, 27.3900],
      [33.6770, 27.3880],
      [33.6740, 27.3920],
      [33.6740, 27.4020],
    ],
    route: {
      name: 'Kafr El Gouna Patrol Loop',
      estimatedMin: 35,
      checkpointOrder: [
        'Tamr Henna North Gate',
        'Bank Plaza',
        'Restaurant Row East',
        'Three Corners Lobby',
        'Library Plaza',
        'Tamr Henna South Gate',
        'Mosque Entrance',
        'Kafr Souq Center',
      ],
    },
    checkpoints: [
      { nameEn: 'Tamr Henna North Gate',    nameAr: 'بوابة تمر حنة الشمالية',  type: 'gate',   lat: 27.4000, lng: 33.6770 },
      { nameEn: 'Tamr Henna Square Center', nameAr: 'وسط ميدان تمر حنة',       type: 'fixed',  lat: 27.3960, lng: 33.6770 },
      { nameEn: 'Tamr Henna South Gate',    nameAr: 'بوابة تمر حنة الجنوبية',  type: 'gate',   lat: 27.3920, lng: 33.6770 },
      { nameEn: 'Library Plaza',            nameAr: 'ساحة المكتبة',            type: 'patrol', lat: 27.3980, lng: 33.6760 },
      { nameEn: 'Restaurant Row East',      nameAr: 'صف المطاعم الشرقي',      type: 'patrol', lat: 27.3960, lng: 33.6800 },
      { nameEn: 'Bank Plaza',               nameAr: 'ساحة البنك',             type: 'patrol', lat: 27.3980, lng: 33.6780 },
      { nameEn: 'Mosque Entrance',          nameAr: 'مدخل المسجد',           type: 'fixed',  lat: 27.3950, lng: 33.6760 },
      { nameEn: 'Bus Terminal',             nameAr: 'محطة الأتوبيس',          type: 'gate',   lat: 27.4000, lng: 33.6750 },
      { nameEn: 'Downtown HQ Office',       nameAr: 'مكتب الأمن المركزي',     type: 'fixed',  lat: 27.3960, lng: 33.6770 },
      { nameEn: 'Kafr Souq Center',         nameAr: 'وسط سوق الكفر',          type: 'patrol', lat: 27.3940, lng: 33.6790 },
      { nameEn: 'Three Corners Lobby',      nameAr: 'لوبي ثري كورنرز',        type: 'fixed',  lat: 27.3990, lng: 33.6730 },
      { nameEn: 'School Gate',              nameAr: 'بوابة المدرسة',          type: 'gate',   lat: 27.3930, lng: 33.6780 },
    ],
  },
  // 4. Marina (مارينا) — Abu Tig Marina at 33.677, 27.408, Movenpick at 33.685, 27.394
  {
    nameEn: 'Marina',
    nameAr: 'مارينا',
    color: '#3b82f6',
    previousNameEn: 'Marina',
    polygon: [
      [33.6750, 27.4120],
      [33.6880, 27.4100],
      [33.6880, 27.3960],
      [33.6820, 27.3920],
      [33.6750, 27.4000],
      [33.6750, 27.4120],
    ],
    route: {
      name: 'Marina Patrol Loop',
      estimatedMin: 35,
      checkpointOrder: [
        'Marina Main Gate',
        'Movenpick Resort Lobby',
        'Yacht Club Entrance',
        'Marina Boardwalk North',
        'Marina Boardwalk South',
        'Marina Dock',
        'Marina Service Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Marina Main Gate',        nameAr: 'البوابة الرئيسية للمارينا', type: 'gate',   lat: 27.4060, lng: 33.6770 },
      { nameEn: 'Yacht Club Entrance',     nameAr: 'مدخل نادي اليخوت',         type: 'gate',   lat: 27.4080, lng: 33.6780 },
      { nameEn: 'Marina Boardwalk North',  nameAr: 'ممشى المارينا الشمالي',    type: 'patrol', lat: 27.4100, lng: 33.6800 },
      { nameEn: 'Marina Boardwalk South',  nameAr: 'ممشى المارينا الجنوبي',    type: 'patrol', lat: 27.4040, lng: 33.6800 },
      { nameEn: 'Marina Dock',            nameAr: 'رصيف المارينا',           type: 'fixed',  lat: 27.4070, lng: 33.6770 },
      { nameEn: 'Abu Tig Marina Entrance', nameAr: 'مدخل مارينا أبو تيج',      type: 'gate',   lat: 27.4080, lng: 33.6770 },
      { nameEn: 'New Marina Gate',         nameAr: 'بوابة المارينا الجديدة',    type: 'gate',   lat: 27.4020, lng: 33.6830 },
      { nameEn: 'Marina Service Gate',    nameAr: 'البوابة الخدمية للمارينا',  type: 'gate',   lat: 27.3990, lng: 33.6810 },
      { nameEn: 'Marina Commercial Strip',nameAr: 'المنطقة التجارية بالمارينا', type: 'patrol', lat: 27.4050, lng: 33.6790 },
      { nameEn: 'Movenpick Resort Lobby', nameAr: 'لوبي فندق موفنبيك',         type: 'fixed',  lat: 27.3940, lng: 33.6850 },
    ],
  },
  // 5. Shadwan (شدوان) — North-central inland, between Golf and coast
  {
    nameEn: 'Shadwan',
    nameAr: 'شدوان',
    color: '#38bdf8',
    previousNameEn: 'Shedwan',
    polygon: [
      [33.6650, 27.4200],
      [33.6750, 27.4180],
      [33.6750, 27.4080],
      [33.6650, 27.4080],
      [33.6650, 27.4200],
    ],
    route: {
      name: 'Shadwan Tuban Patrol Loop',
      estimatedMin: 35,
      checkpointOrder: [
        'Tuban Lagoon North',
        'Shadwan West Gate',
        'Tuban Bridge',
        'Shadwan Center',
        'Shadwan East Gate',
        'Waterside Condos',
      ],
    },
    checkpoints: [
      { nameEn: 'Tuban Lagoon North',  nameAr: 'لاجون طبان الشمالي',       type: 'patrol', lat: 27.4160, lng: 33.6680 },
      { nameEn: 'Shadwan West Gate',   nameAr: 'بوابة شدوان الغربية',      type: 'gate',   lat: 27.4140, lng: 33.6660 },
      { nameEn: 'Tuban Bridge',        nameAr: 'جسر طبان',                type: 'fixed',  lat: 27.4120, lng: 33.6700 },
      { nameEn: 'Shadwan Center',      nameAr: 'مركز شدوان',              type: 'fixed',  lat: 27.4130, lng: 33.6720 },
      { nameEn: 'Shadwan East Gate',   nameAr: 'بوابة شدوان الشرقية',      type: 'gate',   lat: 27.4120, lng: 33.6740 },
      { nameEn: 'Waterside Condos',    nameAr: 'ووترسايد كوندوز',          type: 'patrol', lat: 27.4150, lng: 33.6730 },
      { nameEn: 'Shadwan South Patrol',nameAr: 'دورية شدوان الجنوبية',      type: 'patrol', lat: 27.4100, lng: 33.6700 },
      { nameEn: 'Tuban Lagoon South',  nameAr: 'لاجون طبان الجنوبي',       type: 'patrol', lat: 27.4100, lng: 33.6680 },
    ],
  },
  // 6. Cyan (سيان) — North-central, Ancient Sands Golf at 33.662, 27.408
  {
    nameEn: 'Cyan',
    nameAr: 'سيان',
    color: '#1e293b',
    polygon: [
      [33.6600, 27.4180],
      [33.6750, 27.4180],
      [33.6750, 27.4080],
      [33.6600, 27.4100],
      [33.6600, 27.4180],
    ],
    route: {
      name: 'Cyan Sector Patrol',
      estimatedMin: 30,
      checkpointOrder: [
        'The Nines Gate',
        'Cyan North Patrol',
        'Cyan Center',
        'Cyan South Gate',
        'Cyan East Watch',
      ],
    },
    checkpoints: [
      { nameEn: 'The Nines Gate',     nameAr: 'بوابة ذا ناينز',         type: 'gate',   lat: 27.4140, lng: 33.6680 },
      { nameEn: 'Cyan North Patrol',  nameAr: 'دورية سيان الشمالية',     type: 'patrol', lat: 27.4140, lng: 33.6650 },
      { nameEn: 'Cyan Center',       nameAr: 'مركز سيان',              type: 'fixed',  lat: 27.4120, lng: 33.6680 },
      { nameEn: 'Cyan South Gate',   nameAr: 'بوابة سيان الجنوبية',     type: 'gate',   lat: 27.4100, lng: 33.6670 },
      { nameEn: 'Cyan East Watch',   nameAr: 'مرقب سيان الشرقي',        type: 'fixed',  lat: 27.4120, lng: 33.6730 },
      { nameEn: 'Cyan West Patrol',  nameAr: 'دورية سيان الغربية',      type: 'patrol', lat: 27.4110, lng: 33.6630 },
      { nameEn: 'Ancient Sands Gate', nameAr: 'بوابة أنشنت ساندز',       type: 'gate',   lat: 27.4080, lng: 33.6620 },
    ],
  },
  // 7. Al Marahil (المراحل) — Eastern residential phases
  {
    nameEn: 'Al Marahil',
    nameAr: 'المراحل',
    color: '#a855f7',
    previousNameEn: 'Phases',
    polygon: [
      [33.6880, 27.4060],
      [33.6980, 27.4040],
      [33.6980, 27.3850],
      [33.6880, 27.3850],
      [33.6880, 27.3960],
      [33.6880, 27.4060],
    ],
    route: {
      name: 'Al Marahil Patrol Loop',
      estimatedMin: 50,
      checkpointOrder: [
        'Phase 1 Main Gate',
        'Phase 2 Villa Cluster',
        'Phase 3 Villa Cluster',
        'Phases Service Road',
        'East Beach Access',
        'Phase 4 Villa Cluster',
        'Phases South Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Phase 1 Main Gate',      nameAr: 'بوابة المرحلة 1 الرئيسية', type: 'gate',   lat: 27.4020, lng: 33.6900 },
      { nameEn: 'Phase 2 Villa Cluster',  nameAr: 'مجمع فلل المرحلة 2',       type: 'patrol', lat: 27.3990, lng: 33.6930 },
      { nameEn: 'Phase 3 Villa Cluster',  nameAr: 'مجمع فلل المرحلة 3',       type: 'patrol', lat: 27.3940, lng: 33.6950 },
      { nameEn: 'Phase 4 Villa Cluster',  nameAr: 'مجمع فلل المرحلة 4',       type: 'patrol', lat: 27.3880, lng: 33.6950 },
      { nameEn: 'East Beach Access',      nameAr: 'مدخل الشاطئ الشرقي',       type: 'gate',   lat: 27.4000, lng: 33.6970 },
      { nameEn: 'Phases Service Road',    nameAr: 'طريق خدمة المراحل',        type: 'patrol', lat: 27.3920, lng: 33.6920 },
      { nameEn: 'Phases South Gate',      nameAr: 'بوابة المراحل الجنوبية',   type: 'gate',   lat: 27.3870, lng: 33.6900 },
      { nameEn: 'Phase 5 Villas',         nameAr: 'فلل المرحلة 5',            type: 'patrol', lat: 27.3960, lng: 33.6960 },
      { nameEn: 'Phases Pump Station',    nameAr: 'محطة ضخ المراحل',          type: 'fixed',  lat: 27.3900, lng: 33.6900 },
      { nameEn: 'Phase 1 Lobby',          nameAr: 'لوبي المرحلة 1',           type: 'fixed',  lat: 27.4010, lng: 33.6910 },
    ],
  },
  // 8. Fanadir 1 (فنادير 1) — South coastal strip (Movenpick south to Casa Cook)
  //    Casa Cook at 33.667, 27.425
  {
    nameEn: 'Fanadir 1',
    nameAr: 'فنادير 1',
    color: '#ef4444',
    polygon: [
      [33.6650, 27.4080],
      [33.6750, 27.4080],
      [33.6750, 27.3880],
      [33.6680, 27.3850],
      [33.6650, 27.3900],
      [33.6650, 27.4080],
    ],
    route: {
      name: 'Fanadir 1 Coastal Patrol',
      estimatedMin: 40,
      checkpointOrder: [
        'Mangroovy Beach Access',
        'Fanadir Seafront Gate',
        'Fanadir 1 Beach North',
        'Maison Bleue Entrance',
        'Fanadir 1 South Gate',
        'Casa Cook Access',
      ],
    },
    checkpoints: [
      { nameEn: 'Mangroovy Beach Access',  nameAr: 'مدخل شاطئ مانجروفي',      type: 'gate',   lat: 27.3920, lng: 33.6720 },
      { nameEn: 'Fanadir Seafront Gate',   nameAr: 'بوابة فنادير سيفرونت',    type: 'gate',   lat: 27.3940, lng: 33.6740 },
      { nameEn: 'Fanadir 1 Beach North',   nameAr: 'شاطئ فنادير 1 الشمالي',  type: 'patrol', lat: 27.4020, lng: 33.6720 },
      { nameEn: 'Maison Bleue Entrance',   nameAr: 'مدخل ميزون بلو',          type: 'fixed',  lat: 27.3960, lng: 33.6700 },
      { nameEn: 'Fanadir 1 South Gate',    nameAr: 'بوابة فنادير 1 الجنوبية', type: 'gate',   lat: 27.3900, lng: 33.6680 },
      { nameEn: 'Casa Cook Access',        nameAr: 'مدخل كازا كوك',           type: 'fixed',  lat: 27.4040, lng: 33.6670 },
      { nameEn: 'Fanadir 1 Lagoon Patrol', nameAr: 'دورية لاجون فنادير 1',    type: 'patrol', lat: 27.3980, lng: 33.6710 },
      { nameEn: 'Fanadir Bay Entrance',   nameAr: 'مدخل خليج فنادير',         type: 'gate',   lat: 27.4000, lng: 33.6730 },
    ],
  },
  // 9. Fanadir 2 (فنادير 2) — North coastal (North Bay at 33.650, 27.430)
  {
    nameEn: 'Fanadir 2',
    nameAr: 'فنادير 2',
    color: '#16a34a',
    previousNameEn: 'Fanadir',
    polygon: [
      [33.6480, 27.4220],
      [33.6670, 27.4250],
      [33.6670, 27.4120],
      [33.6480, 27.4120],
      [33.6480, 27.4220],
    ],
    route: {
      name: 'Fanadir 2 Coastal Patrol',
      estimatedMin: 40,
      checkpointOrder: [
        'North Bay Gate',
        'Ancient Sands Entrance',
        'Fanadir 2 Lagoon North',
        'Fanadir 2 Beach Access',
        'The Nines North Gate',
        'Fanadir 2 West Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'North Bay Gate',          nameAr: 'بوابة نورث باي',          type: 'gate',   lat: 27.4280, lng: 33.6510 },
      { nameEn: 'Ancient Sands Entrance',  nameAr: 'مدخل أنشنت ساندز',         type: 'gate',   lat: 27.4200, lng: 33.6620 },
      { nameEn: 'Fanadir 2 Lagoon North',   nameAr: 'لاجون فنادير 2 الشمالي',  type: 'patrol', lat: 27.4180, lng: 33.6600 },
      { nameEn: 'Fanadir 2 Beach Access',   nameAr: 'مدخل شاطئ فنادير 2',      type: 'gate',   lat: 27.4140, lng: 33.6650 },
      { nameEn: 'The Nines North Gate',     nameAr: 'بوابة ذا ناينز الشمالية',  type: 'gate',   lat: 27.4160, lng: 33.6680 },
      { nameEn: 'Fanadir 2 West Gate',      nameAr: 'بوابة فنادير 2 الغربية',  type: 'gate',   lat: 27.4200, lng: 33.6500 },
      { nameEn: 'Ancient Sands Golf',       nameAr: 'أنشنت ساندز جولف',        type: 'fixed',  lat: 27.4160, lng: 33.6630 },
      { nameEn: 'Fanadir 2 Coastal Patrol', nameAr: 'دورية فنادير 2 الساحلية', type: 'patrol', lat: 27.4160, lng: 33.6560 },
    ],
  },
];

export function bboxToRing(bbox: [number, number, number, number]): [number, number][] {
  const [w, s, e, n] = bbox;
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}

export function zoneRing(z: ZoneGeo): [number, number][] {
  if (z.polygon && z.polygon.length >= 4) return z.polygon;
  if (z.bbox) return bboxToRing(z.bbox);
  throw new Error('zone "' + z.nameEn + '" has neither polygon nor bbox');
}
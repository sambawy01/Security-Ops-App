/**
 * Real El Gouna geography — 9 zones per the proposed security sector division
 * (مقترح تقسيم القطاعات الأمنية).
 *
 * Zones match the colour-coded divisions on the official ODH/El Gouna security
 * map: Al Bustan, Al Marahil, Golf, Kafr El Gouna, Marina, Shadwan, Cyan,
 * Fanadir 1, and Fanadir 2. Boundaries are traced as polygons so the dashboard
 * map renders the actual irregular shapes officers and managers see.
 *
 * Zone colour mapping (from the PDF legend):
 *   Al Bustan     — Grey   (#9ca3af)  Western/NW desert perimeter
 *   Al Marahil    — Purple (#a855f7)  SW residential phases (Phase 3-5)
 *   Golf          — Yellow (#eab308)  Central-west golf course
 *   Kafr El Gouna — Green  (#22c55e)  Central downtown
 *   Marina        — Blue   (#3b82f6)  Central coast (Abu Tig)
 *   Shadwan       — LtBlue (#38bdf8)  North-central inland (Tuban)
 *   Cyan          — Black  (#1e293b)  North-central (between Shadwan & Fanadir 2)
 *   Fanadir 1     — Red    (#ef4444)  South coastal strip
 *   Fanadir 2     — DkGreen(#16a34a)  North coastal strip
 *
 * El Gouna footprint:
 *   longitude ~33.640 → 33.720 (≈7 km west–east)
 *   latitude  ~27.375 → 27.420 (≈5 km north–south)
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
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Al Bustan (البستان) — Western/NW desert perimeter, includes entrance
  //    Previous: Bostan (renamed + moved from far south to western perimeter)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Al Bustan',
    nameAr: 'البستان',
    color: '#9ca3af', // grey (matches PDF legend)
    previousNameEn: 'Bostan',
    polygon: [
      [33.6400, 27.4200],
      [33.6680, 27.4200],
      [33.6680, 27.4080],
      [33.6500, 27.3920],
      [33.6400, 27.3980],
      [33.6400, 27.4200],
    ],
    route: {
      name: 'Al Bustan Perimeter Patrol',
      estimatedMin: 45,
      checkpointOrder: [
        'El Gouna Entrance Gate',
        'Bustan North Checkpoint',
        'Church Crossing',
        'Khamsin Watchtower',
        'Bustan West Gate',
        'Bustan South Outpost',
      ],
    },
    checkpoints: [
      { nameEn: 'El Gouna Entrance Gate',  nameAr: 'بوابة دخول الجونة',          type: 'gate',   lat: 27.4150, lng: 33.6650 },
      { nameEn: 'Bustan North Checkpoint', nameAr: 'نقطة تفتيش البستان الشمالية', type: 'gate',   lat: 27.4180, lng: 33.6600 },
      { nameEn: 'Church Crossing',         nameAr: 'تقاطع الكنيسة',              type: 'fixed',  lat: 27.4120, lng: 33.6580 },
      { nameEn: 'Khamsin Watchtower',      nameAr: 'برج مراقبة الخمسين',         type: 'fixed',  lat: 27.4160, lng: 33.6480 },
      { nameEn: 'Bustan West Gate',        nameAr: 'بوابة البستان الغربية',       type: 'gate',   lat: 27.4050, lng: 33.6440 },
      { nameEn: 'Bustan South Outpost',    nameAr: 'موقع البستان الجنوبي',        type: 'patrol', lat: 27.3980, lng: 33.6460 },
      { nameEn: 'Bustan Desert Trail',     nameAr: 'مسار البستان الصحراوي',       type: 'patrol', lat: 27.4100, lng: 33.6500 },
      { nameEn: 'Bustan Perimeter Road',   nameAr: 'طريق محيط البستان',          type: 'patrol', lat: 27.4020, lng: 33.6520 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 2. Al Marahil (المراحل) — SW residential phases (Phase 3, 4, 5 Villas)
  //    Previous: Phases (renamed, same geographic position)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Al Marahil',
    nameAr: 'المراحل',
    color: '#a855f7', // purple (matches PDF legend)
    previousNameEn: 'Phases',
    polygon: [
      [33.6960, 27.4090],
      [33.7180, 27.4080],
      [33.7200, 27.3900],
      [33.7100, 27.3800],
      [33.6960, 27.3850],
      [33.6960, 27.3920],
      [33.6960, 27.4090],
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
      { nameEn: 'Phase 1 Main Gate',      nameAr: 'بوابة المرحلة 1 الرئيسية', type: 'gate',   lat: 27.4050, lng: 33.7000 },
      { nameEn: 'Phase 2 Villa Cluster',  nameAr: 'مجمع فلل المرحلة 2',       type: 'patrol', lat: 27.4020, lng: 33.7050 },
      { nameEn: 'Phase 3 Villa Cluster',  nameAr: 'مجمع فلل المرحلة 3',       type: 'patrol', lat: 27.3960, lng: 33.7080 },
      { nameEn: 'Phase 4 Villa Cluster',  nameAr: 'مجمع فلل المرحلة 4',       type: 'patrol', lat: 27.3880, lng: 33.7080 },
      { nameEn: 'East Beach Access',      nameAr: 'مدخل الشاطئ الشرقي',       type: 'gate',   lat: 27.4040, lng: 33.7120 },
      { nameEn: 'Phases Service Road',    nameAr: 'طريق خدمة المراحل',        type: 'patrol', lat: 27.3920, lng: 33.7020 },
      { nameEn: 'Phases South Gate',      nameAr: 'بوابة المراحل الجنوبية',   type: 'gate',   lat: 27.3820, lng: 33.7050 },
      { nameEn: 'Phase 5 Villas',         nameAr: 'فلل المرحلة 5',            type: 'patrol', lat: 27.3990, lng: 33.7100 },
      { nameEn: 'Phases Pump Station',    nameAr: 'محطة ضخ المراحل',          type: 'fixed',  lat: 27.3900, lng: 33.7000 },
      { nameEn: 'Phase 1 Lobby',          nameAr: 'لوبي المرحلة 1',           type: 'fixed',  lat: 27.4030, lng: 33.7010 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 3. Golf (الجولف) — Central-west golf course (Steigenberger, West Golf)
  //    Previous: Golf (same nameEn, recoloured to yellow)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Golf',
    nameAr: 'الجولف',
    color: '#eab308', // yellow (matches PDF legend)
    previousNameEn: 'Golf',
    polygon: [
      [33.6680, 27.4080],
      [33.6800, 27.4080],
      [33.6800, 27.3920],
      [33.6720, 27.3800],
      [33.6600, 27.3850],
      [33.6580, 27.3950],
      [33.6600, 27.4040],
      [33.6680, 27.4080],
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
      { nameEn: 'Steigenberger Main Gate',  nameAr: 'بوابة شتايجنبرجر الرئيسية', type: 'gate',   lat: 27.4000, lng: 33.6720 },
      { nameEn: 'Golf Clubhouse',           nameAr: 'نادي الجولف',               type: 'fixed',  lat: 27.3920, lng: 33.6680 },
      { nameEn: 'Pro Shop',                 nameAr: 'متجر الجولف',               type: 'fixed',  lat: 27.3915, lng: 33.6690 },
      { nameEn: 'Golf Course North Tee',    nameAr: 'بداية ملعب الجولف الشمالية', type: 'patrol', lat: 27.4040, lng: 33.6700 },
      { nameEn: 'Fairway Mid Point',        nameAr: 'منتصف الفيرواي',            type: 'patrol', lat: 27.3895, lng: 33.6720 },
      { nameEn: 'Golf Course South Tee',    nameAr: 'بداية ملعب الجولف الجنوبية', type: 'patrol', lat: 27.3850, lng: 33.6680 },
      { nameEn: 'Golf Service Gate',        nameAr: 'بوابة خدمة الجولف',         type: 'gate',   lat: 27.3870, lng: 33.6640 },
      { nameEn: 'Golf Maintenance Yard',    nameAr: 'فناء صيانة الجولف',         type: 'fixed',  lat: 27.3880, lng: 33.6620 },
      { nameEn: 'Sheraton Lobby',           nameAr: 'لوبي شيراتون',              type: 'fixed',  lat: 27.3905, lng: 33.6650 },
      { nameEn: 'West Golf Entrance',       nameAr: 'مدخل الجولف الغربي',        type: 'gate',   lat: 27.3960, lng: 33.6640 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 4. Kafr El Gouna (كفر الجونة) — Central downtown (Tamr Henna, Movenpick)
  //    Previous: Kafr El Gouna (same nameEn, same colour)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Kafr El Gouna',
    nameAr: 'كفر الجونة',
    color: '#22c55e', // bright green (matches PDF legend)
    previousNameEn: 'Kafr El Gouna',
    polygon: [
      [33.6800, 27.4080],
      [33.6920, 27.4080],
      [33.6920, 27.3960],
      [33.6850, 27.3920],
      [33.6800, 27.3920],
      [33.6760, 27.3960],
      [33.6760, 27.4040],
      [33.6800, 27.4080],
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
      { nameEn: 'Tamr Henna North Gate',    nameAr: 'بوابة تمر حنة الشمالية',  type: 'gate',   lat: 27.4060, lng: 33.6800 },
      { nameEn: 'Tamr Henna Square Center', nameAr: 'وسط ميدان تمر حنة',       type: 'fixed',  lat: 27.4020, lng: 33.6810 },
      { nameEn: 'Tamr Henna South Gate',    nameAr: 'بوابة تمر حنة الجنوبية',  type: 'gate',   lat: 27.3980, lng: 33.6810 },
      { nameEn: 'Library Plaza',            nameAr: 'ساحة المكتبة',            type: 'patrol', lat: 27.4030, lng: 33.6790 },
      { nameEn: 'Restaurant Row East',      nameAr: 'صف المطاعم الشرقي',      type: 'patrol', lat: 27.4015, lng: 33.6840 },
      { nameEn: 'Bank Plaza',               nameAr: 'ساحة البنك',             type: 'patrol', lat: 27.4040, lng: 33.6820 },
      { nameEn: 'Mosque Entrance',          nameAr: 'مدخل المسجد',           type: 'fixed',  lat: 27.4000, lng: 33.6790 },
      { nameEn: 'Bus Terminal',             nameAr: 'محطة الأتوبيس',          type: 'gate',   lat: 27.4050, lng: 33.6770 },
      { nameEn: 'Downtown HQ Office',       nameAr: 'مكتب الأمن المركزي',     type: 'fixed',  lat: 27.4020, lng: 33.6810 },
      { nameEn: 'Kafr Souq Center',         nameAr: 'وسط سوق الكفر',          type: 'patrol', lat: 27.3970, lng: 33.6840 },
      { nameEn: 'Three Corners Lobby',      nameAr: 'لوبي ثري كورنرز',        type: 'fixed',  lat: 27.3960, lng: 33.6850 },
      { nameEn: 'School Gate',              nameAr: 'بوابة المدرسة',          type: 'gate',   lat: 27.3990, lng: 33.6820 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 5. Shadwan (شدوان) — North-central inland (Tuban lagoon area)
  //    Previous: Shedwan (renamed + moved from south interior to north-central)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Shadwan',
    nameAr: 'شدوان',
    color: '#38bdf8', // light blue (matches PDF legend)
    previousNameEn: 'Shedwan',
    polygon: [
      [33.6680, 27.4200],
      [33.6800, 27.4180],
      [33.6800, 27.4080],
      [33.6680, 27.4080],
      [33.6680, 27.4200],
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
      { nameEn: 'Tuban Lagoon North',  nameAr: 'لاجون طبان الشمالي',       type: 'patrol', lat: 27.4160, lng: 33.6720 },
      { nameEn: 'Shadwan West Gate',   nameAr: 'بوابة شدوان الغربية',      type: 'gate',   lat: 27.4140, lng: 33.6700 },
      { nameEn: 'Tuban Bridge',        nameAr: 'جسر طبان',                type: 'fixed',  lat: 27.4120, lng: 33.6740 },
      { nameEn: 'Shadwan Center',      nameAr: 'مركز شدوان',              type: 'fixed',  lat: 27.4130, lng: 33.6760 },
      { nameEn: 'Shadwan East Gate',   nameAr: 'بوابة شدوان الشرقية',      type: 'gate',   lat: 27.4120, lng: 33.6790 },
      { nameEn: 'Waterside Condos',    nameAr: 'ووترسايد كوندوز',          type: 'patrol', lat: 27.4150, lng: 33.6770 },
      { nameEn: 'Shadwan South Patrol',nameAr: 'دورية شدوان الجنوبية',      type: 'patrol', lat: 27.4100, lng: 33.6750 },
      { nameEn: 'Tuban Lagoon South',  nameAr: 'لاجون طبان الجنوبي',       type: 'patrol', lat: 27.4100, lng: 33.6720 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 6. Cyan (سيان) — North-central, between Shadwan and Fanadir 2
  //    NEW zone — inserted on first apply (no previousNameEn)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Cyan',
    nameAr: 'سيان',
    color: '#1e293b', // black/dark (matches PDF legend)
    polygon: [
      [33.6800, 27.4180],
      [33.6920, 27.4150],
      [33.6920, 27.4080],
      [33.6800, 27.4080],
      [33.6800, 27.4180],
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
      { nameEn: 'The Nines Gate',     nameAr: 'بوابة ذا ناينز',         type: 'gate',   lat: 27.4140, lng: 33.6840 },
      { nameEn: 'Cyan North Patrol',  nameAr: 'دورية سيان الشمالية',     type: 'patrol', lat: 27.4140, lng: 33.6810 },
      { nameEn: 'Cyan Center',       nameAr: 'مركز سيان',              type: 'fixed',  lat: 27.4120, lng: 33.6850 },
      { nameEn: 'Cyan South Gate',   nameAr: 'بوابة سيان الجنوبية',     type: 'gate',   lat: 27.4100, lng: 33.6830 },
      { nameEn: 'Cyan East Watch',   nameAr: 'مرقب سيان الشرقي',        type: 'fixed',  lat: 27.4120, lng: 33.6900 },
      { nameEn: 'Cyan West Patrol',  nameAr: 'دورية سيان الغربية',      type: 'patrol', lat: 27.4110, lng: 33.6810 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 7. Marina (مارينا) — Central coast (Abu Tig Marina, New Marina)
  //    Previous: Marina (same nameEn, recoloured to blue)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Marina',
    nameAr: 'مارينا',
    color: '#3b82f6', // blue (matches PDF legend)
    previousNameEn: 'Marina',
    polygon: [
      [33.6920, 27.4080],
      [33.7050, 27.4060],
      [33.7020, 27.3960],
      [33.6920, 27.3960],
      [33.6920, 27.4080],
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
      { nameEn: 'Marina Main Gate',        nameAr: 'البوابة الرئيسية للمارينا', type: 'gate',   lat: 27.4040, lng: 33.6950 },
      { nameEn: 'Yacht Club Entrance',     nameAr: 'مدخل نادي اليخوت',         type: 'gate',   lat: 27.4050, lng: 33.6980 },
      { nameEn: 'Marina Boardwalk North',  nameAr: 'ممشى المارينا الشمالي',    type: 'patrol', lat: 27.4040, lng: 33.7000 },
      { nameEn: 'Marina Boardwalk South',  nameAr: 'ممشى المارينا الجنوبي',    type: 'patrol', lat: 27.4000, lng: 33.7000 },
      { nameEn: 'Marina Dock',            nameAr: 'رصيف المارينا',           type: 'fixed',  lat: 27.4020, lng: 33.7020 },
      { nameEn: 'Abu Tig Marina Entrance', nameAr: 'مدخل مارينا أبو تيج',      type: 'gate',   lat: 27.4030, lng: 33.6960 },
      { nameEn: 'New Marina Gate',         nameAr: 'بوابة المارينا الجديدة',    type: 'gate',   lat: 27.4010, lng: 33.6980 },
      { nameEn: 'Marina Service Gate',    nameAr: 'البوابة الخدمية للمارينا',  type: 'gate',   lat: 27.3990, lng: 33.6950 },
      { nameEn: 'Marina Commercial Strip',nameAr: 'المنطقة التجارية بالمارينا', type: 'patrol', lat: 27.4020, lng: 33.6990 },
      { nameEn: 'Sheraton Miramar Lobby', nameAr: 'لوبي شيراتون ميرامار',      type: 'fixed',  lat: 27.4040, lng: 33.6970 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 8. Fanadir 1 (فنادير 1) — South coastal strip (Mangroovy → Maison Bleue)
  //    NEW zone — inserted on first apply (no previousNameEn)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Fanadir 1',
    nameAr: 'فنادير 1',
    color: '#ef4444', // red (matches PDF legend)
    polygon: [
      [33.7050, 27.4060],
      [33.7180, 27.4040],
      [33.7150, 27.3880],
      [33.7020, 27.3880],
      [33.7020, 27.3960],
      [33.7050, 27.4060],
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
      { nameEn: 'Mangroovy Beach Access',  nameAr: 'مدخل شاطئ مانجروفي',      type: 'gate',   lat: 27.4000, lng: 33.7100 },
      { nameEn: 'Fanadir Seafront Gate',   nameAr: 'بوابة فنادير سيفرونت',    type: 'gate',   lat: 27.3980, lng: 33.7120 },
      { nameEn: 'Fanadir 1 Beach North',   nameAr: 'شاطئ فنادير 1 الشمالي',  type: 'patrol', lat: 27.4020, lng: 33.7130 },
      { nameEn: 'Maison Bleue Entrance',   nameAr: 'مدخل ميزون بلو',          type: 'fixed',  lat: 27.3950, lng: 33.7120 },
      { nameEn: 'Fanadir 1 South Gate',    nameAr: 'بوابة فنادير 1 الجنوبية', type: 'gate',   lat: 27.3920, lng: 33.7100 },
      { nameEn: 'Casa Cook Access',        nameAr: 'مدخل كازا كوك',           type: 'fixed',  lat: 27.3960, lng: 33.7140 },
      { nameEn: 'Fanadir 1 Lagoon Patrol', nameAr: 'دورية لاجون فنادير 1',    type: 'patrol', lat: 27.3990, lng: 33.7080 },
      { nameEn: 'Fanadir Bay Entrance',   nameAr: 'مدخل خليج فنادير',         type: 'gate',   lat: 27.4030, lng: 33.7120 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 9. Fanadir 2 (فنادير 2) — North coastal strip (North Bay, Ancient Sands)
  //    Previous: Fanadir (renamed + reshaped to the northernmost coastal area)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Fanadir 2',
    nameAr: 'فنادير 2',
    color: '#16a34a', // dark green (matches PDF legend)
    previousNameEn: 'Fanadir',
    polygon: [
      [33.6920, 27.4180],
      [33.7050, 27.4150],
      [33.7050, 27.4060],
      [33.6920, 27.4080],
      [33.6920, 27.4180],
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
      { nameEn: 'North Bay Gate',          nameAr: 'بوابة نورث باي',          type: 'gate',   lat: 27.4140, lng: 33.6980 },
      { nameEn: 'Ancient Sands Entrance',  nameAr: 'مدخل أنشنت ساندز',         type: 'gate',   lat: 27.4130, lng: 33.6950 },
      { nameEn: 'Fanadir 2 Lagoon North',   nameAr: 'لاجون فنادير 2 الشمالي',  type: 'patrol', lat: 27.4120, lng: 33.7000 },
      { nameEn: 'Fanadir 2 Beach Access',   nameAr: 'مدخل شاطئ فنادير 2',      type: 'gate',   lat: 27.4100, lng: 33.7020 },
      { nameEn: 'The Nines North Gate',     nameAr: 'بوابة ذا ناينز الشمالية',  type: 'gate',   lat: 27.4140, lng: 33.6930 },
      { nameEn: 'Fanadir 2 West Gate',      nameAr: 'بوابة فنادير 2 الغربية',  type: 'gate',   lat: 27.4120, lng: 33.6930 },
      { nameEn: 'Ancient Sands Golf',       nameAr: 'أنشنت ساندز جولف',        type: 'fixed',  lat: 27.4130, lng: 33.6990 },
      { nameEn: 'Fanadir 2 Coastal Patrol', nameAr: 'دورية فنادير 2 الساحلية', type: 'patrol', lat: 27.4110, lng: 33.7000 },
    ],
  },
];

/** Convert [W, S, E, N] bbox into a closed Polygon ring (5 points, CCW). */
export function bboxToRing(bbox: [number, number, number, number]): [number, number][] {
  const [w, s, e, n] = bbox;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

/**
 * Resolve a zone's polygon ring. Prefers an explicit `polygon` (PDF-traced
 * shapes); falls back to `bbox` for zones still on rectangle geometry.
 */
export function zoneRing(z: ZoneGeo): [number, number][] {
  if (z.polygon && z.polygon.length >= 4) return z.polygon;
  if (z.bbox) return bboxToRing(z.bbox);
  throw new Error(`zone "${z.nameEn}" has neither polygon nor bbox`);
}
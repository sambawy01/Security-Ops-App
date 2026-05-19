/**
 * Real El Gouna geography — 7 zones per the ODH operational map.
 *
 * The seven zones below match the colored divisions on the official ODH/El Gouna
 * security map (تقسيم الجونة): Fanadir, Marina, Kafr El Gouna, Golf, Phases,
 * Shedwan, and Bostan. Boundaries are traced as polygons (not bboxes) so the
 * dashboard map renders the actual irregular shapes officers and managers see.
 *
 * Each zone carries a `previousNameEn` pointer back to its incumbent row in the
 * v1 6-zone seed (Downtown / Marina / Kafr / West Golf / South Golf / Industrial)
 * so the apply script can rename in place without orphaning officer.zoneId,
 * patrol logs, incidents, or shifts. Bostan is net-new (no previous match) and
 * gets INSERTed.
 *
 * El Gouna footprint:
 *   longitude ~33.640 → 33.715 (≈7 km west–east, including south Bostan)
 *   latitude  ~27.340 → 27.420 (≈9 km north–south, including south Bostan)
 */

export type CheckpointType = 'gate' | 'patrol' | 'fixed';

export interface ZoneGeo {
  /** Current name. Match against existing zones by this OR previousNameEn. */
  nameEn: string;
  nameAr: string;
  color: string;
  /**
   * When this zone is a rename of a previously-seeded zone, set this to the
   * v1 nameEn. The apply script finds the existing row by either name so the
   * UPDATE preserves the zone UUID (and every FK that points at it).
   */
  previousNameEn?: string;
  /** Closed CCW ring of [lng, lat] vertices. Preferred over bbox if set. */
  polygon?: [number, number][];
  /** Fallback rectangle [W, S, E, N] — used when no polygon is provided. */
  bbox?: [number, number, number, number];
  /** patrol route name + the order checkpoints are visited */
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
  // 1. Fanadir (فنادير) — large NW area with the lagoon villas
  //    Previous: West Golf (renamed + reshaped to the NW footprint)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Fanadir',
    nameAr: 'فنادير',
    color: '#eab308', // yellow (matches PDF outline)
    previousNameEn: 'West Golf',
    polygon: [
      [33.6420, 27.4180],
      [33.6680, 27.4205],
      [33.6770, 27.4090],
      [33.6790, 27.4000],
      [33.6720, 27.3950],
      [33.6620, 27.3920],
      [33.6500, 27.3940],
      [33.6420, 27.4050],
      [33.6420, 27.4180],
    ],
    route: {
      name: 'Fanadir Patrol Loop',
      estimatedMin: 45,
      checkpointOrder: [
        'Fanadir Main Gate',
        'North Lagoon Villas',
        'Lagoon Bridge West',
        'Fanadir Beach Access',
        'West Villa Cluster A',
        'Fanadir Service Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Fanadir Main Gate',       nameAr: 'بوابة فنادير الرئيسية',    type: 'gate',   lat: 27.4150, lng: 33.6580 },
      { nameEn: 'North Lagoon Villas',     nameAr: 'فلل اللاجون الشمالية',     type: 'patrol', lat: 27.4170, lng: 33.6520 },
      { nameEn: 'Lagoon Bridge West',      nameAr: 'جسر اللاجون الغربي',       type: 'patrol', lat: 27.4100, lng: 33.6500 },
      { nameEn: 'Fanadir Beach Access',    nameAr: 'مدخل شاطئ فنادير',         type: 'gate',   lat: 27.4180, lng: 33.6640 },
      { nameEn: 'West Villa Cluster A',    nameAr: 'مجمع فلل غرب أ',           type: 'patrol', lat: 27.4060, lng: 33.6560 },
      { nameEn: 'West Villa Cluster B',    nameAr: 'مجمع فلل غرب ب',           type: 'patrol', lat: 27.4020, lng: 33.6620 },
      { nameEn: 'Fanadir Service Gate',    nameAr: 'بوابة خدمة فنادير',        type: 'gate',   lat: 27.4040, lng: 33.6480 },
      { nameEn: 'Fanadir Pump Station',    nameAr: 'محطة ضخ فنادير',           type: 'fixed',  lat: 27.3980, lng: 33.6540 },
      { nameEn: 'Fanadir Spa',             nameAr: 'سبا فنادير',               type: 'fixed',  lat: 27.4090, lng: 33.6600 },
      { nameEn: 'Lagoon Boardwalk North',  nameAr: 'ممشى اللاجون الشمالي',     type: 'patrol', lat: 27.4130, lng: 33.6560 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 2. Marina (مارينا) — Abu Tig basin (small zone north-center)
  //    Previous: Marina (same nameEn, just reshaped to PDF polygon)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Marina',
    nameAr: 'مارينا',
    color: '#a855f7', // purple (matches PDF outline)
    previousNameEn: 'Marina',
    polygon: [
      [33.6760, 27.4080],
      [33.6890, 27.4080],
      [33.6890, 27.3980],
      [33.6810, 27.3960],
      [33.6760, 27.3990],
      [33.6760, 27.4080],
    ],
    route: {
      name: 'Marina Patrol Loop',
      estimatedMin: 35,
      checkpointOrder: [
        'Marina Main Gate',
        'Movenpick Resort Lobby',
        'Yacht Club Entrance',
        'Marina Boardwalk North',
        'Marina Boardwalk Mid',
        'Marina Boardwalk South',
        'Marina Dock',
        'Marina Service Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Marina Main Gate',         nameAr: 'البوابة الرئيسية للمارينا', type: 'gate',   lat: 27.4005, lng: 33.6810 },
      { nameEn: 'Yacht Club Entrance',      nameAr: 'مدخل نادي اليخوت',         type: 'gate',   lat: 27.4030, lng: 33.6815 },
      { nameEn: 'Marina Boardwalk North',   nameAr: 'ممشى المارينا الشمالي',    type: 'patrol', lat: 27.4030, lng: 33.6832 },
      { nameEn: 'Marina Boardwalk Mid',     nameAr: 'منتصف ممشى المارينا',      type: 'patrol', lat: 27.4015, lng: 33.6832 },
      { nameEn: 'Marina Boardwalk South',   nameAr: 'ممشى المارينا الجنوبي',    type: 'patrol', lat: 27.4000, lng: 33.6832 },
      { nameEn: 'Restaurant Strip 1',       nameAr: 'صف المطاعم 1',             type: 'patrol', lat: 27.4012, lng: 33.6842 },
      { nameEn: 'Restaurant Strip 2',       nameAr: 'صف المطاعم 2',             type: 'patrol', lat: 27.4022, lng: 33.6842 },
      { nameEn: 'Marina Dock',              nameAr: 'رصيف المارينا',            type: 'fixed',  lat: 27.4020, lng: 33.6852 },
      { nameEn: 'Movenpick Resort Lobby',   nameAr: 'لوبي فندق موفنبيك',        type: 'fixed',  lat: 27.4042, lng: 33.6802 },
      { nameEn: 'Marina Pharmacy',          nameAr: 'صيدلية المارينا',          type: 'patrol', lat: 27.4010, lng: 33.6822 },
      { nameEn: 'Marina Service Gate',      nameAr: 'البوابة الخدمية للمارينا', type: 'gate',   lat: 27.3992, lng: 33.6810 },
      { nameEn: 'Captains Office',          nameAr: 'مكتب الكابتن',             type: 'fixed',  lat: 27.4022, lng: 33.6848 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 3. Kafr El Gouna (كفر الجونة) — central downtown (Tamr Henna, Movenpick gate)
  //    Previous: Downtown (renamed in place — Tamr Henna is in the PDF's Kafr El Gouna zone)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Kafr El Gouna',
    nameAr: 'كفر الجونة',
    color: '#22c55e', // green (matches PDF outline)
    previousNameEn: 'Downtown',
    polygon: [
      [33.6740, 27.4070],
      [33.6900, 27.4060],
      [33.6920, 27.3960],
      [33.6850, 27.3920],
      [33.6740, 27.3920],
      [33.6700, 27.3970],
      [33.6700, 27.4040],
      [33.6740, 27.4070],
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
      { nameEn: 'Tamr Henna North Gate',    nameAr: 'بوابة تمر حنة الشمالية',  type: 'gate',   lat: 27.4035, lng: 33.6785 },
      { nameEn: 'Tamr Henna Square Center', nameAr: 'وسط ميدان تمر حنة',       type: 'fixed',  lat: 27.4015, lng: 33.6790 },
      { nameEn: 'Tamr Henna South Gate',    nameAr: 'بوابة تمر حنة الجنوبية',  type: 'gate',   lat: 27.3995, lng: 33.6790 },
      { nameEn: 'Library Plaza',            nameAr: 'ساحة المكتبة',            type: 'patrol', lat: 27.4022, lng: 33.6770 },
      { nameEn: 'Restaurant Row East',      nameAr: 'صف المطاعم الشرقي',       type: 'patrol', lat: 27.4015, lng: 33.6810 },
      { nameEn: 'Bank Plaza',               nameAr: 'ساحة البنك',              type: 'patrol', lat: 27.4028, lng: 33.6798 },
      { nameEn: 'Mosque Entrance',          nameAr: 'مدخل المسجد',             type: 'fixed',  lat: 27.4010, lng: 33.6785 },
      { nameEn: 'Bus Terminal',             nameAr: 'محطة الأتوبيس',           type: 'gate',   lat: 27.4045, lng: 33.6762 },
      { nameEn: 'Downtown HQ Office',       nameAr: 'مكتب الأمن المركزي',      type: 'fixed',  lat: 27.4020, lng: 33.6790 },
      { nameEn: 'Kafr Souq Center',         nameAr: 'وسط سوق الكفر',           type: 'patrol', lat: 27.3970, lng: 33.6810 },
      { nameEn: 'Three Corners Lobby',      nameAr: 'لوبي ثري كورنرز',         type: 'fixed',  lat: 27.3960, lng: 33.6830 },
      { nameEn: 'Kafr Spa Entrance',        nameAr: 'مدخل سبا الكفر',          type: 'fixed',  lat: 27.3975, lng: 33.6825 },
      { nameEn: 'School Gate',              nameAr: 'بوابة المدرسة',           type: 'gate',   lat: 27.3998, lng: 33.6810 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 4. Golf (الجولف) — central golf course area
  //    Previous: Kafr (renamed + reshaped to the central golf footprint)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Golf',
    nameAr: 'الجولف',
    color: '#1e293b', // dark navy (matches PDF outline)
    previousNameEn: 'Kafr',
    polygon: [
      [33.6800, 27.3960],
      [33.6960, 27.3970],
      [33.6970, 27.3870],
      [33.6900, 27.3800],
      [33.6810, 27.3820],
      [33.6800, 27.3870],
      [33.6800, 27.3960],
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
      { nameEn: 'Steigenberger Main Gate',  nameAr: 'بوابة شتايجنبرجر الرئيسية', type: 'gate',   lat: 27.3940, lng: 33.6830 },
      { nameEn: 'Golf Clubhouse',           nameAr: 'نادي الجولف',                type: 'fixed',  lat: 27.3920, lng: 33.6870 },
      { nameEn: 'Pro Shop',                 nameAr: 'متجر الجولف',                type: 'fixed',  lat: 27.3915, lng: 33.6878 },
      { nameEn: 'Golf Course North Tee',    nameAr: 'بداية ملعب الجولف الشمالية', type: 'patrol', lat: 27.3940, lng: 33.6900 },
      { nameEn: 'Fairway Mid Point',        nameAr: 'منتصف الفيرواي',             type: 'patrol', lat: 27.3895, lng: 33.6900 },
      { nameEn: 'Golf Course South Tee',    nameAr: 'بداية ملعب الجولف الجنوبية', type: 'patrol', lat: 27.3855, lng: 33.6890 },
      { nameEn: 'Golf Service Gate',        nameAr: 'بوابة خدمة الجولف',          type: 'gate',   lat: 27.3870, lng: 33.6840 },
      { nameEn: 'Golf Maintenance Yard',    nameAr: 'فناء صيانة الجولف',          type: 'fixed',  lat: 27.3880, lng: 33.6820 },
      { nameEn: 'Sheraton Lobby',           nameAr: 'لوبي شيراتون',               type: 'fixed',  lat: 27.3905, lng: 33.6850 },
      { nameEn: 'Golf East Bridge',         nameAr: 'جسر الجولف الشرقي',          type: 'patrol', lat: 27.3895, lng: 33.6940 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 5. Phases / El Marahel (المراحل) — east residential phases
  //    Previous: Industrial (renamed + reshaped to the east residential footprint)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Phases',
    nameAr: 'المراحل',
    color: '#38bdf8', // light blue (matches PDF outline)
    previousNameEn: 'Industrial',
    polygon: [
      [33.6960, 27.4090],
      [33.7150, 27.4060],
      [33.7180, 27.3920],
      [33.7100, 27.3800],
      [33.6990, 27.3800],
      [33.6960, 27.3920],
      [33.6960, 27.4090],
    ],
    route: {
      name: 'Phases Patrol Loop',
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
      { nameEn: 'Phase 1 Main Gate',        nameAr: 'بوابة المرحلة 1 الرئيسية', type: 'gate',   lat: 27.4050, lng: 33.7000 },
      { nameEn: 'Phase 2 Villa Cluster',    nameAr: 'مجمع فلل المرحلة 2',       type: 'patrol', lat: 27.4020, lng: 33.7050 },
      { nameEn: 'Phase 3 Villa Cluster',    nameAr: 'مجمع فلل المرحلة 3',       type: 'patrol', lat: 27.3960, lng: 33.7080 },
      { nameEn: 'Phase 4 Villa Cluster',    nameAr: 'مجمع فلل المرحلة 4',       type: 'patrol', lat: 27.3880, lng: 33.7080 },
      { nameEn: 'East Beach Access',        nameAr: 'مدخل الشاطئ الشرقي',       type: 'gate',   lat: 27.4040, lng: 33.7120 },
      { nameEn: 'Phases Service Road',      nameAr: 'طريق خدمة المراحل',        type: 'patrol', lat: 27.3920, lng: 33.7020 },
      { nameEn: 'Phases South Gate',        nameAr: 'بوابة المراحل الجنوبية',   type: 'gate',   lat: 27.3820, lng: 33.7050 },
      { nameEn: 'Phases Spa',               nameAr: 'سبا المراحل',              type: 'fixed',  lat: 27.3990, lng: 33.7090 },
      { nameEn: 'Phase 1 Lobby',            nameAr: 'لوبي المرحلة 1',           type: 'fixed',  lat: 27.4030, lng: 33.7010 },
      { nameEn: 'Phases Pump Station',      nameAr: 'محطة ضخ المراحل',          type: 'fixed',  lat: 27.3900, lng: 33.7000 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 6. Shedwan (شدوان) — south interior / desert-side patrol perimeter
  //    Previous: South Golf (renamed + reshaped to the south interior)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Shedwan',
    nameAr: 'شدوان',
    color: '#ef4444', // red (matches PDF outline)
    previousNameEn: 'South Golf',
    polygon: [
      [33.6620, 27.3920],
      [33.6840, 27.3920],
      [33.6850, 27.3700],
      [33.6720, 27.3580],
      [33.6580, 27.3650],
      [33.6620, 27.3920],
    ],
    route: {
      name: 'Shedwan Desert Perimeter',
      estimatedMin: 60,
      checkpointOrder: [
        'Shedwan North Checkpoint',
        'Desert Watchtower West',
        'Shedwan Service Road',
        'Desert Watchtower South',
        'Shedwan Perimeter East',
        'Shedwan South Outpost',
      ],
    },
    checkpoints: [
      { nameEn: 'Shedwan North Checkpoint', nameAr: 'نقطة تفتيش شدوان الشمالية', type: 'gate',   lat: 27.3900, lng: 33.6720 },
      { nameEn: 'Desert Watchtower West',   nameAr: 'برج مراقبة الصحراء الغربي', type: 'fixed',  lat: 27.3800, lng: 33.6640 },
      { nameEn: 'Desert Watchtower South',  nameAr: 'برج مراقبة الصحراء الجنوبي', type: 'fixed',  lat: 27.3680, lng: 33.6700 },
      { nameEn: 'Shedwan Service Road',     nameAr: 'طريق خدمة شدوان',           type: 'patrol', lat: 27.3780, lng: 33.6720 },
      { nameEn: 'Shedwan Perimeter East',   nameAr: 'محيط شدوان الشرقي',         type: 'patrol', lat: 27.3750, lng: 33.6810 },
      { nameEn: 'Shedwan South Outpost',    nameAr: 'موقع شدوان الجنوبي',        type: 'gate',   lat: 27.3620, lng: 33.6720 },
      { nameEn: 'Sabina Lobby',             nameAr: 'لوبي سابينا',               type: 'fixed',  lat: 27.3845, lng: 33.6790 },
      { nameEn: 'Sabina Pool',              nameAr: 'مسبح سابينا',               type: 'fixed',  lat: 27.3848, lng: 33.6800 },
      { nameEn: 'Shedwan Pump Station',     nameAr: 'محطة ضخ شدوان',             type: 'fixed',  lat: 27.3720, lng: 33.6680 },
      { nameEn: 'Shedwan West Trail',       nameAr: 'مسار شدوان الغربي',         type: 'patrol', lat: 27.3700, lng: 33.6620 },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 7. Bostan (البستان) — far south staff housing community
  //    NEW zone — inserted on first apply (no previousNameEn)
  // ───────────────────────────────────────────────────────────────────────────
  {
    nameEn: 'Bostan',
    nameAr: 'البستان',
    color: '#f97316', // orange (matches PDF outline)
    polygon: [
      [33.6940, 27.3620],
      [33.7160, 27.3610],
      [33.7170, 27.3400],
      [33.6960, 27.3400],
      [33.6940, 27.3620],
    ],
    route: {
      name: 'Bostan Patrol Loop',
      estimatedMin: 30,
      checkpointOrder: [
        'Bostan Main Gate',
        'Staff Housing Block A',
        'Staff Housing Block B',
        'Bostan Mosque',
        'Bostan School',
        'Bostan Service Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Bostan Main Gate',         nameAr: 'بوابة البستان الرئيسية',   type: 'gate',   lat: 27.3590, lng: 33.7020 },
      { nameEn: 'Staff Housing Block A',    nameAr: 'مبنى سكن العاملين أ',      type: 'patrol', lat: 27.3540, lng: 33.7050 },
      { nameEn: 'Staff Housing Block B',    nameAr: 'مبنى سكن العاملين ب',      type: 'patrol', lat: 27.3500, lng: 33.7080 },
      { nameEn: 'Bostan Mosque',            nameAr: 'مسجد البستان',             type: 'fixed',  lat: 27.3520, lng: 33.7030 },
      { nameEn: 'Bostan School',            nameAr: 'مدرسة البستان',            type: 'fixed',  lat: 27.3480, lng: 33.7060 },
      { nameEn: 'Bostan Service Gate',      nameAr: 'بوابة خدمة البستان',       type: 'gate',   lat: 27.3460, lng: 33.7020 },
      { nameEn: 'Bostan Health Clinic',     nameAr: 'عيادة البستان',            type: 'fixed',  lat: 27.3510, lng: 33.7068 },
      { nameEn: 'Bostan Market',            nameAr: 'سوق البستان',              type: 'patrol', lat: 27.3530, lng: 33.7045 },
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

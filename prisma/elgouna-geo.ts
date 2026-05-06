/**
 * Real El Gouna geography — hand-curated zones, checkpoints, and patrol routes.
 *
 * Coordinates are approximate (±50m) but placed deliberately at named landmarks
 * along El Gouna's main road network. Zones are non-overlapping rectangles that
 * tile the resort footprint so PostGIS ST_Within point-in-polygon resolves
 * uniquely for incident location → zone resolution.
 *
 * El Gouna footprint:
 *   longitude ~33.658 → 33.690 (≈3 km)
 *   latitude  ~27.380 → 27.412 (≈3.5 km)
 */

export type CheckpointType = 'gate' | 'patrol' | 'fixed';

export interface ZoneGeo {
  /** matched against existing zones by nameEn so officer.zoneId stays valid */
  nameEn: string;
  nameAr: string;
  color: string;
  /** [W, S, E, N] bounding box for the zone polygon */
  bbox: [number, number, number, number];
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
  {
    nameEn: 'Downtown',
    nameAr: 'وسط البلد',
    color: '#ef4444',
    bbox: [33.6685, 27.3915, 33.6760, 27.3975],
    route: {
      name: 'Downtown Patrol Loop',
      estimatedMin: 30,
      checkpointOrder: [
        'Tamr Henna North Gate',
        'Bank Plaza',
        'Restaurant Row East',
        'Restaurant Row West',
        'Library Plaza',
        'Tamr Henna South Gate',
        'Mosque Entrance',
      ],
    },
    checkpoints: [
      { nameEn: 'Tamr Henna North Gate',  nameAr: 'بوابة تمر حنة الشمالية', type: 'gate',   lat: 27.3962, lng: 33.6720 },
      { nameEn: 'Tamr Henna Square Center', nameAr: 'وسط ميدان تمر حنة',    type: 'fixed',  lat: 27.3942, lng: 33.6722 },
      { nameEn: 'Tamr Henna South Gate',  nameAr: 'بوابة تمر حنة الجنوبية', type: 'gate',   lat: 27.3923, lng: 33.6722 },
      { nameEn: 'Library Plaza',          nameAr: 'ساحة المكتبة',           type: 'patrol', lat: 27.3950, lng: 33.6708 },
      { nameEn: 'Restaurant Row East',    nameAr: 'صف المطاعم الشرقي',      type: 'patrol', lat: 27.3942, lng: 33.6738 },
      { nameEn: 'Restaurant Row West',    nameAr: 'صف المطاعم الغربي',      type: 'patrol', lat: 27.3942, lng: 33.6702 },
      { nameEn: 'Mosque Entrance',        nameAr: 'مدخل المسجد',            type: 'fixed',  lat: 27.3936, lng: 33.6720 },
      { nameEn: 'Bank Plaza',             nameAr: 'ساحة البنك',             type: 'patrol', lat: 27.3955, lng: 33.6730 },
      { nameEn: 'Bus Terminal',           nameAr: 'محطة الأتوبيس',          type: 'gate',   lat: 27.3970, lng: 33.6698 },
      { nameEn: 'Downtown HQ Office',     nameAr: 'مكتب الأمن المركزي',     type: 'fixed',  lat: 27.3950, lng: 33.6722 },
      { nameEn: 'Pharmacy Corner',        nameAr: 'ركن الصيدلية',           type: 'patrol', lat: 27.3938, lng: 33.6712 },
      { nameEn: 'School Gate',            nameAr: 'بوابة المدرسة',          type: 'gate',   lat: 27.3925, lng: 33.6738 },
    ],
  },
  {
    nameEn: 'Marina',
    nameAr: 'المارينا',
    color: '#3b82f6',
    bbox: [33.6790, 27.3985, 33.6880, 27.4055],
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
  {
    nameEn: 'Kafr',
    nameAr: 'الكفر',
    color: '#22c55e',
    bbox: [33.6720, 27.3870, 33.6780, 27.3915],
    route: {
      name: 'Kafr Patrol Loop',
      estimatedMin: 30,
      checkpointOrder: [
        'Kafr Main Gate',
        'Kafr Mosque',
        'Kafr Souq Center',
        'Kafr North Alley',
        'Kafr Spa Entrance',
        'Three Corners Lobby',
        'Kafr South Alley',
      ],
    },
    checkpoints: [
      { nameEn: 'Kafr Main Gate',          nameAr: 'بوابة الكفر الرئيسية', type: 'gate',   lat: 27.3905, lng: 33.6730 },
      { nameEn: 'Kafr Souq Center',        nameAr: 'وسط سوق الكفر',        type: 'patrol', lat: 27.3895, lng: 33.6742 },
      { nameEn: 'Kafr North Alley',        nameAr: 'حارة الكفر الشمالية',  type: 'patrol', lat: 27.3905, lng: 33.6748 },
      { nameEn: 'Kafr South Alley',        nameAr: 'حارة الكفر الجنوبية',  type: 'patrol', lat: 27.3885, lng: 33.6748 },
      { nameEn: 'Kafr Spa Entrance',       nameAr: 'مدخل سبا الكفر',       type: 'fixed',  lat: 27.3900, lng: 33.6758 },
      { nameEn: 'Three Corners Lobby',     nameAr: 'لوبي ثري كورنرز',      type: 'fixed',  lat: 27.3885, lng: 33.6762 },
      { nameEn: 'Kafr Mosque',             nameAr: 'مسجد الكفر',           type: 'fixed',  lat: 27.3895, lng: 33.6735 },
      { nameEn: 'Souq East Gate',          nameAr: 'بوابة السوق الشرقية',  type: 'gate',   lat: 27.3895, lng: 33.6758 },
      { nameEn: 'Kafr Service Road',       nameAr: 'طريق خدمة الكفر',      type: 'patrol', lat: 27.3878, lng: 33.6738 },
      { nameEn: 'Kafr Restaurant Plaza',   nameAr: 'ساحة مطاعم الكفر',     type: 'patrol', lat: 27.3905, lng: 33.6752 },
    ],
  },
  {
    nameEn: 'West Golf',
    nameAr: 'جولف غرب',
    color: '#f59e0b',
    bbox: [33.6580, 27.3905, 33.6675, 27.3990],
    route: {
      name: 'West Golf Patrol Loop',
      estimatedMin: 40,
      checkpointOrder: [
        'Steigenberger Main Gate',
        'Golf Clubhouse',
        'Pro Shop',
        'Golf Course North Tee',
        'Golf Course South Tee',
        'Golf Service Gate',
        'West Villa Cluster A',
      ],
    },
    checkpoints: [
      { nameEn: 'Steigenberger Main Gate', nameAr: 'بوابة شتايجنبرجر الرئيسية', type: 'gate',   lat: 27.3955, lng: 33.6650 },
      { nameEn: 'Golf Clubhouse',          nameAr: 'نادي الجولف',                type: 'fixed',  lat: 27.3950, lng: 33.6635 },
      { nameEn: 'Golf Course North Tee',   nameAr: 'بداية ملعب الجولف الشمالية', type: 'patrol', lat: 27.3970, lng: 33.6630 },
      { nameEn: 'Golf Course South Tee',   nameAr: 'بداية ملعب الجولف الجنوبية', type: 'patrol', lat: 27.3925, lng: 33.6620 },
      { nameEn: 'Pro Shop',                nameAr: 'متجر الجولف',                type: 'fixed',  lat: 27.3945, lng: 33.6640 },
      { nameEn: 'Golf Service Gate',       nameAr: 'بوابة خدمة الجولف',          type: 'gate',   lat: 27.3938, lng: 33.6608 },
      { nameEn: 'West Villa Cluster A',    nameAr: 'مجمع فلل غرب أ',             type: 'patrol', lat: 27.3960, lng: 33.6618 },
      { nameEn: 'West Villa Cluster B',    nameAr: 'مجمع فلل غرب ب',             type: 'patrol', lat: 27.3935, lng: 33.6645 },
      { nameEn: 'West Spa',                nameAr: 'سبا غرب',                    type: 'fixed',  lat: 27.3958, lng: 33.6655 },
      { nameEn: 'West Pump Station',       nameAr: 'محطة ضخ غرب',                type: 'patrol', lat: 27.3922, lng: 33.6622 },
    ],
  },
  {
    nameEn: 'South Golf',
    nameAr: 'جولف جنوب',
    color: '#8b5cf6',
    bbox: [33.6700, 27.3795, 33.6810, 27.3865],
    route: {
      name: 'South Lagoons Patrol Loop',
      estimatedMin: 35,
      checkpointOrder: [
        'Sabina Main Gate',
        'Sabina Lobby',
        'Sabina Pool',
        'Lagoon East Boardwalk',
        'Lagoon Bridge North',
        'Lagoon West Boardwalk',
        'Lagoon Bridge South',
        'Lagoon Pump House',
      ],
    },
    checkpoints: [
      { nameEn: 'Sabina Main Gate',       nameAr: 'بوابة سابينا الرئيسية', type: 'gate',   lat: 27.3858, lng: 33.6770 },
      { nameEn: 'Sabina Lobby',           nameAr: 'لوبي سابينا',           type: 'fixed',  lat: 27.3845, lng: 33.6775 },
      { nameEn: 'Lagoon Bridge North',    nameAr: 'جسر اللاجون الشمالي',   type: 'patrol', lat: 27.3852, lng: 33.6760 },
      { nameEn: 'Lagoon Bridge South',    nameAr: 'جسر اللاجون الجنوبي',   type: 'patrol', lat: 27.3832, lng: 33.6760 },
      { nameEn: 'Sabina Pool',            nameAr: 'مسبح سابينا',           type: 'fixed',  lat: 27.3848, lng: 33.6782 },
      { nameEn: 'Lagoon East Boardwalk',  nameAr: 'ممشى اللاجون الشرقي',   type: 'patrol', lat: 27.3845, lng: 33.6795 },
      { nameEn: 'Lagoon West Boardwalk',  nameAr: 'ممشى اللاجون الغربي',   type: 'patrol', lat: 27.3845, lng: 33.6755 },
      { nameEn: 'Sabina Service Gate',    nameAr: 'بوابة خدمة سابينا',     type: 'gate',   lat: 27.3825, lng: 33.6775 },
      { nameEn: 'South Beach Access',     nameAr: 'مدخل الشاطئ الجنوبي',   type: 'gate',   lat: 27.3812, lng: 33.6792 },
      { nameEn: 'Lagoon Pump House',      nameAr: 'محطة ضخ اللاجون',       type: 'fixed',  lat: 27.3828, lng: 33.6770 },
    ],
  },
  {
    nameEn: 'Industrial',
    nameAr: 'المنطقة الصناعية',
    color: '#64748b',
    bbox: [33.6570, 27.4010, 33.6680, 27.4115],
    route: {
      name: 'Industrial Patrol Loop',
      estimatedMin: 30,
      checkpointOrder: [
        'Industrial Main Gate',
        'Workshop Row 1',
        'Cement Plant',
        'Truck Inspection Bay',
        'Industrial South Gate',
        'Industrial Cafeteria',
        'Warehouse Loading Dock',
        'Airport Access Gate',
      ],
    },
    checkpoints: [
      { nameEn: 'Industrial Main Gate',     nameAr: 'البوابة الرئيسية للصناعية', type: 'gate',   lat: 27.4060, lng: 33.6610 },
      { nameEn: 'Workshop Row 1',           nameAr: 'صف الورش 1',                type: 'patrol', lat: 27.4072, lng: 33.6608 },
      { nameEn: 'Workshop Row 2',           nameAr: 'صف الورش 2',                type: 'patrol', lat: 27.4072, lng: 33.6622 },
      { nameEn: 'Warehouse Loading Dock',   nameAr: 'رصيف تحميل المستودع',       type: 'fixed',  lat: 27.4082, lng: 33.6618 },
      { nameEn: 'Airport Access Gate',      nameAr: 'بوابة المطار',              type: 'gate',   lat: 27.4090, lng: 33.6630 },
      { nameEn: 'Industrial Service Yard',  nameAr: 'فناء الخدمة الصناعية',      type: 'fixed',  lat: 27.4055, lng: 33.6618 },
      { nameEn: 'Cement Plant',             nameAr: 'مصنع الأسمنت',              type: 'patrol', lat: 27.4078, lng: 33.6595 },
      { nameEn: 'Industrial Cafeteria',     nameAr: 'كافتيريا الصناعية',         type: 'fixed',  lat: 27.4065, lng: 33.6605 },
      { nameEn: 'Industrial South Gate',    nameAr: 'البوابة الجنوبية للصناعية', type: 'gate',   lat: 27.4045, lng: 33.6622 },
      { nameEn: 'Truck Inspection Bay',     nameAr: 'منطقة فحص الشاحنات',        type: 'patrol', lat: 27.4060, lng: 33.6595 },
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

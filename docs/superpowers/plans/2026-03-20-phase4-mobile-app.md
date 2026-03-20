# Phase 4: Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React Native officer field app — offline-first, GPS tracking, incident logging, patrol checkpoints, shift check-in/out, Arabic-primary UI.

**Architecture:** React Native + Expo in `mobile/` directory. WatermelonDB for offline-first local storage. Background GPS tracking. Sync queue for offline actions. Communicates with the existing Fastify API.

**Tech Stack:** React Native 0.76+, Expo SDK 52+, WatermelonDB, expo-location, expo-camera, i18next, React Navigation, TypeScript.

---

## Scope

### In Scope (Pilot-Ready)
- Login (badge + PIN)
- Shift check-in/out with GPS
- Incident list (assigned to me)
- Incident detail + status updates + notes
- New incident report (photo, text, GPS)
- Patrol mode (route + checkpoint confirmation)
- Background GPS tracking (30s interval)
- Offline queue (actions saved locally, sync when online)
- Arabic-primary UI with RTL layout
- Push notifications (via Expo)

### Deferred
- Voice note recording (Phase 5)
- Biometric unlock (Phase 5)
- iOS build (Android-only for pilot)

### Offline-First Strategy (Pilot Scope)

Full WatermelonDB is deferred. Instead, a two-layer offline approach:

**Read cache (`src/lib/cache.ts`):** AsyncStorage-based cache that stores the last-fetched response for each API endpoint. When offline, `apiFetch` serves cached data. When online, fetches fresh data and updates cache. Officers always see their last-known incidents, shifts, and patrol routes even without connectivity.

**Write queue (`src/lib/sync.ts`):** Queued actions stored in AsyncStorage. When online, the queue processes by POSTing batches to `/api/v1/sync` (the architecture's sync protocol with server-assigned sequence numbers and conflict resolution). This is a deliberate simplification vs full WatermelonDB — suitable for pilot where concurrent offline writes are rare.

**Constraint for pilot:** One officer per device. No concurrent offline edits to the same incident from different devices (enforced by device binding, not by the sync protocol).

## File Structure

```
mobile/
├── app.json                              # Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
├── eas.json                              # EAS Build config
├── src/
│   ├── App.tsx                           # Navigation + providers
│   ├── config.ts                         # API URL, constants
│   ├── lib/
│   │   ├── api.ts                        # API client with auth + offline cache
│   │   ├── auth.ts                       # Token storage (SecureStore)
│   │   ├── cache.ts                      # AsyncStorage read cache for offline data
│   │   ├── sync.ts                       # Offline write queue → POST /api/v1/sync
│   │   ├── location.ts                   # Background GPS tracking service
│   │   └── i18n.ts                       # Arabic/English i18next setup
│   ├── hooks/
│   │   ├── useAuth.ts                    # Auth context
│   │   ├── useLocation.ts               # Current GPS position
│   │   └── useOnlineStatus.ts           # Network connectivity status
│   ├── screens/
│   │   ├── LoginScreen.tsx               # Badge + PIN login
│   │   ├── HomeScreen.tsx                # Dashboard: shift status, assigned incidents, patrol
│   │   ├── IncidentListScreen.tsx        # My assigned incidents
│   │   ├── IncidentDetailScreen.tsx      # Full incident with updates, actions
│   │   ├── NewIncidentScreen.tsx         # Report form: photo, text, category, GPS
│   │   ├── PatrolScreen.tsx              # Active patrol: route map, checkpoints
│   │   ├── ShiftScreen.tsx               # Check-in/out, handover notes
│   │   └── SettingsScreen.tsx            # Language toggle, app info
│   ├── components/
│   │   ├── Header.tsx                    # Screen header with back button
│   │   ├── IncidentCard.tsx              # Compact incident row
│   │   ├── PriorityBadge.tsx             # Color-coded priority indicator
│   │   ├── StatusBadge.tsx               # Incident/shift status badge
│   │   ├── OfflineIndicator.tsx          # Banner when offline
│   │   ├── SyncStatus.tsx                # Pending sync count indicator
│   │   └── CheckpointCard.tsx            # Patrol checkpoint row
│   ├── navigation/
│   │   └── AppNavigator.tsx              # Stack + tab navigation
│   ├── locales/
│   │   ├── ar.json                       # Arabic translations
│   │   └── en.json                       # English translations
│   └── types.ts                          # TypeScript interfaces
```

---

## Task 0: Backend Enhancements for Mobile

**Files to modify/create in the backend** (`/Users/bistrocloud/Documents/Sec-Ops-OS/src/`):

These endpoints are required by the mobile app and must be built before mobile testing.

- [ ] **Step 1: Add GET /api/v1/categories**

Simple list endpoint returning all incident categories (needed for mobile incident form):
```typescript
app.get('/api/v1/categories', async () => {
  return prisma.category.findMany({ orderBy: { nameEn: 'asc' } });
});
```

Add to `src/routes/incidents.routes.ts` or a new `src/routes/categories.routes.ts`.

- [ ] **Step 2: Add GET /api/v1/shifts/my-current**

Returns the current or next shift for the authenticated officer:
```typescript
app.get('/api/v1/shifts/my-current', async (request) => {
  const now = new Date();
  const shift = await prisma.shift.findFirst({
    where: {
      officerId: request.user.officerId,
      status: { in: ['scheduled', 'active'] },
      scheduledStart: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    },
    orderBy: { scheduledStart: 'asc' },
    include: { zone: { select: { nameAr: true, nameEn: true } } },
  });
  return shift;
});
```

Add to `src/routes/shifts.routes.ts`.

- [ ] **Step 3: Add POST /api/v1/media/upload**

Media upload endpoint for incident photos:
```typescript
// Uses @fastify/multipart
app.post('/api/v1/media/upload', async (request) => {
  const data = await request.file();
  // Save to /data/media/incidents/{uuid}.jpg
  // Return { filePath, fileSize }
});
```

Install: `npm install @fastify/multipart`
Create: `src/routes/media.routes.ts`

- [ ] **Step 4: Add POST /api/v1/sync (placeholder)**

Sync endpoint that accepts batched offline actions:
```typescript
app.post('/api/v1/sync', async (request) => {
  const { actions } = request.body;
  // For pilot: process actions sequentially, replay to individual endpoints
  // Full conflict resolution in Phase 5
  const results = [];
  for (const action of actions) {
    // Process each action type...
  }
  return { processed: results, conflicts: [] };
});
```

- [ ] **Step 5: Run backend tests to verify no regressions**
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: backend endpoints for mobile — categories, my-current shift, media upload, sync"
```

---

## Task 1: Expo Project Scaffolding

**Files:**
- Create: `mobile/` directory with Expo + React Native + TypeScript

- [ ] **Step 1: Create Expo project**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

- [ ] **Step 2: Install dependencies**

```bash
npx expo install expo-location expo-camera expo-secure-store expo-image-picker expo-notifications expo-task-manager expo-device expo-updates
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npm install i18next react-i18next @react-native-async-storage/async-storage @react-native-community/netinfo
npm install react-native-maps
```

- [ ] **Step 3: Create config**

`src/config.ts`:
```typescript
export const API_URL = __DEV__ ? 'http://10.0.2.2:3000' : 'http://YOUR_SERVER_IP:3000';
// 10.0.2.2 = host machine from Android emulator
// For physical device testing, use actual LAN IP
export const GPS_INTERVAL_MS = 30000; // 30 seconds
export const SYNC_INTERVAL_MS = 30000; // 30 seconds
```

- [ ] **Step 4: Create types**

`src/types.ts` — copy/adapt from `dashboard/src/types.ts` with additions for mobile:
```typescript
export interface User { id: string; nameEn: string; nameAr: string; role: string; zoneId: string | null; }
export interface Incident { id: string; title: string; description: string; priority: string; status: string; categoryId: string | null; zoneId: string | null; assignedOfficerId: string | null; createdAt: string; slaResponseDeadline: string | null; slaResolutionDeadline: string | null; }
export interface Shift { id: string; officerId: string; zoneId: string; status: string; scheduledStart: string; scheduledEnd: string; actualCheckIn: string | null; actualCheckOut: string | null; handoverNotes: string | null; }
export interface PatrolRoute { id: string; name: string; zoneId: string; estimatedDurationMin: number; }
export interface Checkpoint { id: string; nameAr: string; nameEn: string; type: string; lat: number; lng: number; }
export interface QueuedAction { id: string; type: string; endpoint: string; method: string; body: any; createdAt: string; }
```

- [ ] **Step 5: Verify Expo starts**

```bash
npx expo start
# Press 'a' for Android emulator or scan QR for physical device
```

- [ ] **Step 6: Commit**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
git add mobile/
git commit -m "feat: mobile app scaffolding — Expo + React Native + TypeScript"
```

---

## Task 2: Auth + API Client + Offline Queue

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/api.ts`, `src/lib/cache.ts`, `src/lib/sync.ts`, `src/hooks/useAuth.ts`, `src/hooks/useOnlineStatus.ts`

### Auth (src/lib/auth.ts)

Token storage via `expo-secure-store` (encrypted, not plain AsyncStorage):
- `login(badgeNumber, pin, deviceId)` — calls API with device ID from `expo-device`, stores tokens + user in SecureStore
- `logout()` — calls API, clears SecureStore
- `getToken()` — returns access token
- `getUser()` — returns stored user
- `refreshToken()` — token rotation
- **Device binding:** Collect unique device ID via `expo-device` (Device.modelId + Device.osBuildId) and send with login request. Backend enforces one device per officer.

### Read Cache (src/lib/cache.ts)

AsyncStorage-based read cache for offline data access:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache:';

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
  return raw ? JSON.parse(raw) : null;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);
}
```

### API Client (src/lib/api.ts)

Fetch wrapper with offline awareness + read cache:
- If online: fetch with auth headers, update cache, return fresh data
- If offline READ: serve from cache
- If offline WRITE: queue the action in sync queue, return optimistic response
- `apiFetch(path, options, { cache?, offlineAction? })` — cache key for reads, queue config for writes

### Sync Queue (src/lib/sync.ts)

Write queue that batches to `/api/v1/sync` (architecture's sync protocol):
```typescript
// Queue structure in AsyncStorage
interface SyncAction {
  id: string;
  actionType: string;     // 'incident_update', 'location_batch', 'shift_checkin', etc.
  payload: any;
  createdAtDevice: string; // ISO timestamp from device
}

export async function queueAction(action: Omit<SyncAction, 'id'>): Promise<void> { ... }
export async function getQueue(): Promise<SyncAction[]> { ... }
export async function getQueueCount(): Promise<number> { ... }

export async function processQueue(): Promise<{ processed: number; conflicts: string[] }> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, conflicts: [] };

  // Batch max 500 actions per sync request
  const batch = queue.slice(0, 500);
  const response = await apiFetchDirect('/api/v1/sync', {
    method: 'POST',
    body: JSON.stringify({ actions: batch }),
  });

  // Remove processed, keep conflicts for user notification
  // Server returns { processed: [...ids], conflicts: [...] }
  ...
}
```

**Note:** The `/api/v1/sync` backend endpoint does not exist yet. Add it as a backend task (see "Backend Enhancements Needed" section). For pilot testing before sync endpoint is built, sync can fall back to replaying individual endpoints.

### Online Status Hook (src/hooks/useOnlineStatus.ts)

Uses `@react-native-community/netinfo` for instant connectivity detection:
```typescript
import NetInfo from '@react-native-community/netinfo';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);
  return isOnline;
}
```

### Auth Hook (src/hooks/useAuth.ts)

React context like dashboard version but using SecureStore:
```typescript
interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  login: (badge: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}
```

- [ ] **Step 1: Create cache.ts (read cache)**
- [ ] **Step 2: Create auth.ts (with device binding via expo-device)**
- [ ] **Step 3: Create api.ts (with cache integration and offline queue)**
- [ ] **Step 4: Create sync.ts (batch queue targeting /api/v1/sync)**
- [ ] **Step 5: Create useOnlineStatus.ts (NetInfo)**
- [ ] **Step 6: Create useAuth.ts (context provider)**
- [ ] **Step 7: Verify login works against running API**
- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: mobile auth — SecureStore, API client, offline sync queue"
```

---

## Task 3: Navigation + Arabic i18n

**Files:**
- Create: `src/navigation/AppNavigator.tsx`, `src/lib/i18n.ts`, `src/locales/ar.json`, `src/locales/en.json`, `src/App.tsx`

### Navigation Structure

```
Auth Stack (not logged in):
  └── LoginScreen

Main Stack (logged in):
  └── Bottom Tabs:
      ├── Home Tab → HomeScreen
      ├── Incidents Tab → IncidentListScreen
      │                    └── IncidentDetailScreen (push)
      │                    └── NewIncidentScreen (push)
      ├── Patrol Tab → PatrolScreen
      └── Settings Tab → SettingsScreen
  └── Modal:
      └── ShiftScreen (check-in/out)
```

### i18n Setup (src/lib/i18n.ts)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: 'ar', // Arabic default
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

### Arabic Translations (src/locales/ar.json)

```json
{
  "app": { "title": "نظام الأمن" },
  "nav": { "home": "الرئيسية", "incidents": "البلاغات", "patrol": "الدوريات", "settings": "الإعدادات" },
  "login": { "title": "تسجيل الدخول", "badge": "رقم الشارة", "pin": "الرقم السري", "submit": "دخول", "error": "بيانات غير صحيحة" },
  "home": { "shift": "الوردية", "checkIn": "تسجيل حضور", "checkOut": "تسجيل انصراف", "activeIncidents": "البلاغات النشطة", "onDuty": "على رأس العمل", "offDuty": "خارج الخدمة" },
  "incident": { "new": "بلاغ جديد", "title": "العنوان", "description": "الوصف", "category": "التصنيف", "priority": "الأولوية", "status": "الحالة", "assigned": "مكلف", "unassigned": "غير مكلف", "acknowledge": "تأكيد الاستلام", "resolve": "تم الحل", "escalate": "تصعيد", "addNote": "إضافة ملاحظة", "photo": "صورة", "submit": "إرسال" },
  "patrol": { "start": "بدء الدورية", "checkpoint": "نقطة تفتيش", "confirm": "تأكيد الوصول", "skip": "تخطي", "skipReason": "سبب التخطي", "completed": "اكتملت الدورية" },
  "shift": { "checkInSuccess": "تم تسجيل الحضور", "checkOutSuccess": "تم تسجيل الانصراف", "handover": "ملاحظات التسليم" },
  "common": { "save": "حفظ", "cancel": "إلغاء", "back": "رجوع", "loading": "جاري التحميل...", "error": "حدث خطأ", "offline": "أنت غير متصل بالإنترنت", "pendingSync": "{{count}} إجراء في الانتظار", "retry": "إعادة المحاولة" },
  "priority": { "critical": "حرج", "high": "عالي", "medium": "متوسط", "low": "منخفض" },
  "status": { "open": "مفتوح", "assigned": "مكلف", "in_progress": "قيد التنفيذ", "escalated": "مصعّد", "resolved": "تم الحل", "closed": "مغلق" },
  "category": { "security_threat": "تهديد أمني", "fire_safety": "حريق/سلامة", "accidents": "حوادث", "trespassing": "تعدي", "infrastructure": "بنية تحتية", "traffic_parking": "مرور/مواقف", "noise_complaint": "ضوضاء", "animal_control": "حيوانات", "general_complaint": "شكوى عامة" }
}
```

### RTL Support

In `App.tsx`, set RTL when Arabic is active:
```typescript
import { I18nManager } from 'react-native';
I18nManager.forceRTL(i18n.language === 'ar');
```

- [ ] **Step 1: Create i18n, locales, navigation, App.tsx**
- [ ] **Step 2: Verify navigation renders with Arabic text**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: mobile navigation + Arabic i18n with RTL support"
```

---

## Task 4: Login Screen

**Files:**
- Create: `src/screens/LoginScreen.tsx`

Design matching the dashboard login but mobile-optimized:
- Full screen, dark gradient background
- Shield icon + "نظام الأمن" (Security OS) title
- "عمليات أمن الجونة" (El Gouna Security Operations) subtitle
- Badge number input (numeric keyboard)
- PIN input (masked, numeric keyboard)
- Login button with loading spinner
- Error message in Arabic
- Offline indicator if no connectivity

- [ ] **Step 1: Create LoginScreen**
- [ ] **Step 2: Test login against API from emulator/device**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: mobile login screen — Arabic UI, badge + PIN"
```

---

## Task 5: Home Screen (Officer Dashboard)

**Files:**
- Create: `src/screens/HomeScreen.tsx`, `src/components/OfflineIndicator.tsx`, `src/components/SyncStatus.tsx`

The officer's main screen after login:

```
┌────────────────────────────────┐
│ ⚠️ أنت غير متصل (if offline)  │
├────────────────────────────────┤
│ 🛡️ نظام الأمن                 │
│ أحمد محمود  •  OFF-003        │
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ الوردية                    │ │
│ │ 06:00 - 18:00  وسط البلد   │ │
│ │ [تسجيل حضور]              │ │
│ └────────────────────────────┘ │
├────────────────────────────────┤
│ البلاغات النشطة (3)          │
│ ┌──────────────────────────┐  │
│ │ 🔴 بوابة معطلة - الكفر   │  │
│ │ 🟡 شكوى ضوضاء - المارينا │  │
│ │ 🔵 مركبة مخالفة - وسط    │  │
│ └──────────────────────────┘  │
├────────────────────────────────┤
│ [📋 بلاغ جديد]               │
└────────────────────────────────┘
```

Sections:
1. **Offline banner** (OfflineIndicator) — shows when no connectivity + pending sync count
2. **Officer info** — name, badge, from auth context
3. **Shift card** — current/next shift with check-in button (if not checked in) or shift status
4. **Assigned incidents** — compact list of active incidents assigned to this officer
5. **Quick action** — "New Incident" button

Data: fetch current shift (`GET /api/v1/shifts?officerId=me&status=scheduled,active&from=today`), assigned incidents (`GET /api/v1/incidents?assignedOfficerId=me&status=open,assigned,in_progress`)

- [ ] **Step 1: Create OfflineIndicator and SyncStatus components**
- [ ] **Step 2: Create HomeScreen**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: mobile home screen — shift card, assigned incidents, offline indicator"
```

---

## Task 6: Shift Check-in/Check-out

**Files:**
- Create: `src/screens/ShiftScreen.tsx`, `src/hooks/useLocation.ts`

### Location Hook (src/hooks/useLocation.ts)

```typescript
import * as Location from 'expo-location';

export function useCurrentLocation() {
  // Request permission, get current GPS position
  // Returns { lat, lng, accuracy } or null
}
```

### ShiftScreen

Modal/full screen for shift management:

**Check-in flow:**
1. Request GPS permission if not granted
2. Get current position
3. POST /api/v1/shifts/:id/check-in with { lat, lng }
4. Show success message in Arabic
5. Start background GPS tracking

**Check-out flow:**
1. Get current position
2. Show handover notes input (optional text field)
3. POST /api/v1/shifts/:id/check-out with { lat, lng, handoverNotes }
4. Stop background GPS tracking
5. Show success message

**Offline behavior:** Queue the check-in/out action, show optimistic success.

- [ ] **Step 1: Create useLocation hook**
- [ ] **Step 2: Create ShiftScreen with check-in/out**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: mobile shift check-in/out with GPS"
```

---

## Task 7: Background GPS Tracking

**Files:**
- Create: `src/lib/location.ts`

Background location tracking service:
- Starts on shift check-in, stops on check-out
- Gets position every 30 seconds
- Batches locations (stores locally, uploads every 30s when online)
- Uses `expo-location` TaskManager for background tracking

```typescript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  // Store locally, batch upload to POST /api/v1/officers/:id/location
});

export async function startTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopTracking() {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
```

(`expo-task-manager` already installed in Task 1)

- [ ] **Step 1: Create background location service**
- [ ] **Step 2: Wire into shift check-in (start) and check-out (stop)**
- [ ] **Step 3: Verify locations upload to API**
- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: mobile background GPS tracking — 30s interval, batch upload"
```

---

## Task 8: Incident List + Detail

**Files:**
- Create: `src/screens/IncidentListScreen.tsx`, `src/screens/IncidentDetailScreen.tsx`, `src/components/IncidentCard.tsx`, `src/components/PriorityBadge.tsx`, `src/components/StatusBadge.tsx`

### IncidentListScreen

List of incidents assigned to the current officer:
- FlatList of IncidentCards
- Pull-to-refresh
- Filter tabs: Active (assigned+in_progress) | All
- Each card: priority dot, title, category, SLA timer
- Tap → navigate to IncidentDetailScreen

### IncidentDetailScreen

Full incident view:
- Title, description, priority badge, status badge
- SLA timers (response + resolution)
- Zone, reporter info
- Action buttons based on status:
  - assigned → [تأكيد الاستلام (Acknowledge)]
  - in_progress → [تم الحل (Resolve)] [تصعيد (Escalate)]
- Update timeline (scrollable)
- Add note input + send button
- All text in Arabic

**Offline behavior:** Status changes and notes queue locally, shown optimistically.

- [ ] **Step 1: Create PriorityBadge and StatusBadge components**
- [ ] **Step 2: Create IncidentCard**
- [ ] **Step 3: Create IncidentListScreen**
- [ ] **Step 4: Create IncidentDetailScreen with actions**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: mobile incident list + detail — assigned incidents, status actions, notes"
```

---

## Task 9: New Incident Report

**Files:**
- Create: `src/screens/NewIncidentScreen.tsx`

Quick incident report form:

```
┌────────────────────────────────┐
│ بلاغ جديد                      │
├────────────────────────────────┤
│ العنوان: [____________]        │
│ الوصف: [______________]        │
│          [______________]      │
│ التصنيف: [أمن ▼]               │
│ الأولوية: [عالي ▼]             │
│ 📸 [إضافة صورة]               │
│ 📍 الموقع: 27.1825, 33.8580   │
│                                │
│ [إرسال البلاغ]                │
└────────────────────────────────┘
```

Features:
- Title (required)
- Description (optional)
- Category picker (dropdown with 9 categories in Arabic)
- Priority picker (defaults to category's default priority)
- Photo capture (expo-image-picker — camera or gallery)
- GPS auto-stamp (current location)
- Submit → POST /api/v1/incidents
- **Offline:** Queue the action, show success, sync later

- [ ] **Step 1: Create NewIncidentScreen with form**
- [ ] **Step 2: Add photo capture via expo-image-picker**
- [ ] **Step 3: Verify incident creation against API**
- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: mobile new incident report — photo, category, GPS auto-stamp"
```

---

## Task 10: Patrol Mode

**Files:**
- Create: `src/screens/PatrolScreen.tsx`, `src/components/CheckpointCard.tsx`

### PatrolScreen

Active patrol view:

```
┌────────────────────────────────┐
│ 🗺️ دورية المارينا             │
│ 5/8 نقاط  •  23 دقيقة         │
├────────────────────────────────┤
│ ✅ نقطة 1 — بوابة المارينا     │
│ ✅ نقطة 2 — ممشى الشاطئ       │
│ ✅ نقطة 3 — موقف المارينا     │
│ ✅ نقطة 4 — مدخل أبو تيج     │
│ ⏳ نقطة 5 — مطعم الرصيف   ← │
│ ○ نقطة 6 — بوابة الخدمة      │
│ ○ نقطة 7 — ساحة المارينا     │
│ ○ نقطة 8 — بوابة الخروج      │
├────────────────────────────────┤
│ [تأكيد الوصول]  [تخطي]       │
└────────────────────────────────┘
```

Flow:
1. Officer selects a patrol route (from their zone's routes)
2. POST /api/v1/patrols/logs to start patrol
3. Screen shows ordered checkpoint list
4. Current checkpoint highlighted
5. "Confirm Arrival" → checks GPS proximity (50m), confirms checkpoint
6. "Skip" → requires reason text, marks as skipped
7. Auto-advances to next checkpoint
8. When all done → patrol marked complete

**GPS proximity check:** Compare current GPS position to checkpoint lat/lng. If within 50m, allow confirmation. If not, show warning "أنت بعيد عن نقطة التفتيش" (You are far from the checkpoint) but still allow confirmation.

**Offline:** Checkpoint confirmations queue locally with GPS + timestamp.

- [ ] **Step 1: Create CheckpointCard component**
- [ ] **Step 2: Create PatrolScreen with route selection + checkpoint flow**
- [ ] **Step 3: Wire GPS proximity check**
- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: mobile patrol mode — route selection, checkpoint confirmation, GPS proximity"
```

---

## Task 11: Settings + Push Notifications

**Files:**
- Create: `src/screens/SettingsScreen.tsx`

### SettingsScreen

- Language toggle (Arabic ↔ English) — **Note:** switching language requires app restart via `Updates.reloadAsync()` from `expo-updates` because `I18nManager.forceRTL()` only takes effect after reload. Show confirmation dialog: "سيتم إعادة تشغيل التطبيق لتغيير اللغة" (App will restart to change language).
- App version
- Officer info (name, badge, zone)
- Logout button
- Sync status (X pending actions)
- Force sync button

### Push Notifications Setup

Register for Expo push notifications on login:
```typescript
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = await Notifications.getExpoPushTokenAsync();
  // Store token — will be sent to backend in future phase
  // For now, just register locally
}
```

**Note:** Full push notification delivery (backend sending push via Expo) is deferred to Phase 5. This task only sets up the client-side registration and permission handling.

- [ ] **Step 1: Create SettingsScreen**
- [ ] **Step 2: Set up push notification registration**
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: mobile settings — language toggle, push notification registration"
```

---

## Task 12: Polish + Build

- [ ] **Step 1: Visual polish**

- Consistent Arabic typography (use system Arabic fonts)
- RTL layout verification on all screens
- Loading spinners / skeleton loaders
- Empty states in Arabic
- Error states in Arabic
- Offline indicator visible on all screens when disconnected

- [ ] **Step 2: Test on physical Android device**

```bash
npx expo start
# Scan QR with Expo Go app on Android tablet
```

Verify:
1. Login works
2. Home screen shows shift + incidents
3. Shift check-in records GPS
4. Background GPS tracking sends locations
5. Incident list shows assigned incidents
6. Can create new incident with photo
7. Can acknowledge/resolve incidents
8. Patrol mode with checkpoint confirmation
9. Offline: actions queue and sync when back online
10. Arabic RTL displays correctly

- [ ] **Step 3: Create development build**

```bash
npx expo prebuild --platform android
npx expo run:android
# Or EAS Build:
eas build --platform android --profile development
```

- [ ] **Step 4: Commit and push**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
git add -A
git commit -m "feat: mobile app polish — RTL verification, loading states, dev build"
git push origin main
```

---

## Backend Enhancements

All required backend changes are tracked in **Task 0** above. The `/api/v1/patrols/routes?zoneId=X` endpoint already exists from Phase 1.

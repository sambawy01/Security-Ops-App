# Phase 2: Web Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the web dashboard for supervisors and managers — command map with officer positions, incident queue with SLA timers, personnel panel, and login. This IS the ODH demo.

**Architecture:** Separate Vite React app in `dashboard/` directory. Communicates with the existing Fastify API at localhost:3000. TanStack Query for data fetching. MapLibre GL for the command map. No SSR — pure SPA.

**Tech Stack:** React 19, Vite 6, TypeScript, TanStack Query v5, MapLibre GL JS, Tailwind CSS 4, shadcn/ui, Recharts, i18next, Socket.IO client (placeholder for Phase 3).

---

## Deferred to Later Phases

- **Socket.IO real-time updates** — Phase 3 (backend Socket.IO not built yet). Dashboard uses polling for now (TanStack Query refetchInterval).
- **AI Insights panel** — Phase 5 (AI backend not built). Shows placeholder UI.
- **Report generation/PDF export** — Phase 5.
- **Arabic RTL** — Phase 4 (mobile app). Dashboard is English-first for the ODH demo.
- **System configuration panel** (admin) — deferred. Not needed for demo.

## File Structure

```
dashboard/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env
├── .env.example
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Router + layout
│   ├── lib/
│   │   ├── api.ts                        # Fetch wrapper with auth headers
│   │   ├── auth.ts                       # Auth state management (token storage, login/logout)
│   │   └── utils.ts                      # cn() helper, date formatting
│   ├── hooks/
│   │   ├── useAuth.ts                    # Auth context hook
│   │   ├── useZones.ts                   # TanStack Query: zones + checkpoints
│   │   ├── useOfficers.ts               # TanStack Query: officers + locations
│   │   ├── useIncidents.ts              # TanStack Query: incidents
│   │   └── useShifts.ts                 # TanStack Query: shifts
│   ├── components/
│   │   ├── Layout.tsx                    # Sidebar + header + main content area
│   │   ├── Sidebar.tsx                   # Navigation sidebar with role-based menu
│   │   ├── Header.tsx                    # Top bar with user info, zone indicator
│   │   ├── ProtectedRoute.tsx            # Auth guard wrapper
│   │   ├── map/
│   │   │   ├── CommandMap.tsx            # MapLibre GL map container
│   │   │   ├── OfficerMarkers.tsx        # Officer position markers on map
│   │   │   ├── IncidentMarkers.tsx       # Incident markers on map
│   │   │   ├── ZoneOverlays.tsx          # Zone boundary polygons
│   │   │   └── CheckpointMarkers.tsx     # Checkpoint markers
│   │   ├── incidents/
│   │   │   ├── IncidentQueue.tsx         # Filterable incident list with SLA timers
│   │   │   ├── IncidentCard.tsx          # Single incident row/card
│   │   │   ├── IncidentDetail.tsx        # Full incident detail panel
│   │   │   ├── SlaTimer.tsx              # Countdown timer with color states
│   │   │   └── AssignOfficerDialog.tsx   # Officer assignment modal
│   │   ├── personnel/
│   │   │   ├── OfficerRoster.tsx         # On-duty/off-duty officer list
│   │   │   ├── OfficerCard.tsx           # Single officer row
│   │   │   └── ShiftSchedule.tsx         # Weekly shift calendar (simple table)
│   │   └── ui/                           # shadcn/ui components (badge, button, card, dialog, input, select, tabs, etc.)
│   ├── pages/
│   │   ├── LoginPage.tsx                 # Badge number + PIN login form
│   │   ├── DashboardPage.tsx             # Command map + sidebar panels
│   │   ├── IncidentsPage.tsx             # Full incident queue view
│   │   ├── PersonnelPage.tsx             # Full personnel/roster view
│   │   └── ShiftsPage.tsx                # Shift schedule view
│   └── styles/
│       └── globals.css                   # Tailwind imports + custom styles
```

---

## Task 1: Dashboard Scaffolding

**Files:**
- Create: `dashboard/` directory with Vite + React + TypeScript + Tailwind

- [ ] **Step 1: Create Vite React project**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
npm create vite@latest dashboard -- --template react-ts
cd dashboard
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @tanstack/react-query react-router-dom maplibre-gl recharts clsx tailwind-merge class-variance-authority lucide-react
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer
```

- [ ] **Step 3: Configure Tailwind**

Set up `tailwind.config.ts`, `postcss.config.mjs`, and `src/styles/globals.css` with Tailwind v4 imports.

- [ ] **Step 4: Create .env and .env.example**

```env
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 5: Create utility files**

Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge) and date formatting utilities.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
# Opens at http://localhost:5173
```

- [ ] **Step 7: Commit**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
git add dashboard/
git commit -m "feat: dashboard scaffolding — Vite + React + Tailwind"
```

---

## Task 2: Auth System + API Client

**Files:**
- Create: `dashboard/src/lib/api.ts`, `dashboard/src/lib/auth.ts`, `dashboard/src/hooks/useAuth.ts`, `dashboard/src/pages/LoginPage.tsx`, `dashboard/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create API client**

`src/lib/api.ts` — fetch wrapper that:
- Prepends `VITE_API_URL` to all paths
- Attaches `Authorization: Bearer <token>` header from localStorage
- Auto-refreshes token on 401 using the refresh token
- Throws typed errors

```typescript
const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    // Try refresh
    const refreshed = await tryRefreshToken();
    if (refreshed) return apiFetch(path, options); // Retry
    throw new AuthError('Session expired');
  }
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

- [ ] **Step 2: Create auth state management**

`src/lib/auth.ts` — login, logout, token storage in localStorage, refresh logic.

`src/hooks/useAuth.ts` — React context providing `{ user, login, logout, isAuthenticated }`. On mount, checks localStorage for valid token.

- [ ] **Step 3: Create LoginPage**

`src/pages/LoginPage.tsx`:
- Clean, minimal design matching the hi-tech modern aesthetic
- Badge number input + PIN input (masked)
- Login button, loading state, error display
- On success: stores tokens, redirects to dashboard
- Full-page centered form, dark background

- [ ] **Step 4: Create ProtectedRoute**

`src/components/ProtectedRoute.tsx` — wraps routes, redirects to /login if not authenticated.

- [ ] **Step 5: Set up router in App.tsx**

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/incidents" element={<IncidentsPage />} />
      <Route path="/personnel" element={<PersonnelPage />} />
      <Route path="/shifts" element={<ShiftsPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

- [ ] **Step 6: Verify login flow against live API**

Start the Fastify API (`cd .. && npm run dev`), seed the database, start the dashboard, and test login with MGR-001 / 1234.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: dashboard auth — login page, API client, protected routes"
```

---

## Task 3: Layout Shell (Sidebar + Header)

**Files:**
- Create: `dashboard/src/components/Layout.tsx`, `dashboard/src/components/Sidebar.tsx`, `dashboard/src/components/Header.tsx`
- Create: Basic shadcn/ui components needed: button, badge, card, dialog, input, select, tabs

- [ ] **Step 1: Install/create shadcn-style UI components**

Create minimal UI components in `src/components/ui/`:
- `button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `tabs.tsx`, `dropdown-menu.tsx`
- Follow shadcn/ui patterns with Tailwind + CVA

- [ ] **Step 2: Create Sidebar**

`src/components/Sidebar.tsx`:
- Logo/brand at top: "Security OS" with shield icon
- Navigation links: Dashboard (map icon), Incidents (alert icon), Personnel (users icon), Shifts (clock icon)
- Active link highlighted
- Role-based menu items (manager sees all, supervisor sees scoped items)
- Collapsible on mobile
- User info + logout at bottom
- Dark sidebar: `bg-slate-900 text-white`

- [ ] **Step 3: Create Header**

`src/components/Header.tsx`:
- Current page title
- Zone indicator (for supervisors)
- User name + role badge
- Notification bell (placeholder)

- [ ] **Step 4: Create Layout**

`src/components/Layout.tsx`:
- Sidebar on left (w-64, fixed)
- Header at top of content area
- Main content area (scrollable)
- Uses `<Outlet />` for nested routes

- [ ] **Step 5: Wire up layout in App.tsx**

Wrap protected routes with `<Layout />`:
```typescript
<Route element={<ProtectedRoute />}>
  <Route element={<Layout />}>
    <Route path="/" element={<DashboardPage />} />
    ...
  </Route>
</Route>
```

- [ ] **Step 6: Create placeholder pages**

Stub out `DashboardPage`, `IncidentsPage`, `PersonnelPage`, `ShiftsPage` with just a heading and the layout renders correctly.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: dashboard layout — sidebar, header, navigation"
```

---

## Task 4: Data Hooks (TanStack Query)

**Files:**
- Create: `dashboard/src/hooks/useZones.ts`, `dashboard/src/hooks/useOfficers.ts`, `dashboard/src/hooks/useIncidents.ts`, `dashboard/src/hooks/useShifts.ts`

- [ ] **Step 1: Set up TanStack Query provider**

Wrap app in `QueryClientProvider` in `main.tsx` or `App.tsx`.

- [ ] **Step 2: Create useZones hook**

```typescript
export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: () => apiFetch<Zone[]>('/api/v1/zones'),
  });
}

export function useZoneDetail(id: string) {
  return useQuery({
    queryKey: ['zones', id],
    queryFn: () => apiFetch<ZoneDetail>(`/api/v1/zones/${id}`),
    enabled: !!id,
  });
}
```

- [ ] **Step 3: Create useOfficers hook**

```typescript
export function useOfficers(filters?: { zoneId?: string; status?: string }) {
  return useQuery({
    queryKey: ['officers', filters],
    queryFn: () => apiFetch<Officer[]>('/api/v1/officers?' + new URLSearchParams(filters)),
    refetchInterval: 30000, // Poll every 30s for status updates
  });
}
```

- [ ] **Step 4: Create useIncidents hook**

```typescript
export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => apiFetch<Incident[]>('/api/v1/incidents?' + buildParams(filters)),
    refetchInterval: 10000, // Poll every 10s for real-time feel
  });
}

export function useIncidentDetail(id: string) { ... }
export function useAssignIncident() { return useMutation(...) }
export function useUpdateIncident() { return useMutation(...) }
```

- [ ] **Step 5: Create useShifts hook**

Similar pattern — list with filters, detail, mutations for check-in/out.

- [ ] **Step 6: Define TypeScript types**

Create `src/types.ts` with interfaces matching API responses: Zone, Checkpoint, Officer, Incident, Shift, etc.

- [ ] **Step 7: Verify hooks work by rendering data in placeholder pages**

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: dashboard data hooks — TanStack Query for all endpoints"
```

---

## Task 5: Backend API Enhancements for Dashboard

**Files:**
- Modify: `src/routes/zones.routes.ts` — add GeoJSON endpoint
- Modify: `src/routes/officers.routes.ts` — add bulk locations + status filter + incident count
- Modify: `src/routes/incidents.routes.ts` — add GeoJSON endpoint + search filter + categoryId filter
- Create: `src/routes/dashboard.routes.ts` — stats endpoint
- Modify: `src/server.ts` — register dashboard routes, update CORS

**This task MUST be done before any dashboard page that calls the API.**

- [ ] **Step 1: Update CORS in Fastify to allow dashboard origin**

In `src/server.ts`, ensure CORS allows `http://localhost:5173` (Vite dev server).

- [ ] **Step 2: Add GET /api/v1/zones/geojson**

Returns zones as GeoJSON FeatureCollection with boundaries for MapLibre:
```typescript
app.get('/api/v1/zones/geojson', async (request) => {
  const zones = await prisma.$queryRaw`
    SELECT id, name_en, name_ar, color,
      ST_AsGeoJSON(boundary)::json as geometry
    FROM zones WHERE boundary IS NOT NULL
  `;
  return {
    type: 'FeatureCollection',
    features: zones.map(z => ({
      type: 'Feature',
      properties: { id: z.id, nameEn: z.name_en, nameAr: z.name_ar, color: z.color },
      geometry: z.geometry,
    })),
  };
});
```

- [ ] **Step 3: Add GET /api/v1/officers/locations**

Returns latest location for all active officers (for command map). Uses `getAllActiveOfficerLocations()` from `src/lib/geo.ts`.

- [ ] **Step 4: Add `status` filter and `_count.assignedIncidents` to GET /api/v1/officers**

Update the officers list endpoint to:
- Accept `status` query param (filters by officer status)
- Include `_count: { assignedIncidents: { where: { status: { in: ['open', 'assigned', 'in_progress'] } } } }` for active incident count per officer

- [ ] **Step 5: Add GET /api/v1/incidents/geojson**

Returns open/active incidents as GeoJSON for MapLibre map markers:
```typescript
app.get('/api/v1/incidents/geojson', async (request) => {
  const incidents = await prisma.$queryRaw`
    SELECT i.id, i.title, i.priority, i.status, i.zone_id,
      c.name_en as category_name, ST_AsGeoJSON(i.location)::json as geometry
    FROM incidents i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.status IN ('open', 'assigned', 'in_progress', 'escalated')
    AND i.location IS NOT NULL
  `;
  return {
    type: 'FeatureCollection',
    features: incidents.map(i => ({
      type: 'Feature',
      properties: { id: i.id, title: i.title, priority: i.priority, status: i.status, category: i.category_name, zoneId: i.zone_id },
      geometry: i.geometry,
    })),
  };
});
```

- [ ] **Step 6: Add `search` and `categoryId` query params to GET /api/v1/incidents**

Update the incidents list schema and endpoint to support:
- `search` — ILIKE on title: `title: { contains: search, mode: 'insensitive' }`
- `categoryId` — filter by category

- [ ] **Step 7: Add GET /api/v1/checkpoints/geojson**

Returns all checkpoints as GeoJSON for MapLibre.

- [ ] **Step 8: Add GET /api/v1/dashboard/stats**

Returns summary stats: incidents grouped by priority, officers grouped by status.

- [ ] **Step 9: Run all backend tests to ensure no regressions**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS && npx vitest run
```

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: API enhancements for dashboard — GeoJSON, bulk locations, stats, search"
```

---

## Task 6: Command Map (was Task 5)

**Files:**
- Create: `dashboard/src/components/map/CommandMap.tsx`, `OfficerMarkers.tsx`, `IncidentMarkers.tsx`, `ZoneOverlays.tsx`, `CheckpointMarkers.tsx`

- [ ] **Step 1: Create CommandMap container**

`src/components/map/CommandMap.tsx`:
- MapLibre GL JS map centered on El Gouna (27.1825°N, 33.8580°E), zoom 14
- Use free OpenStreetMap raster tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Full height of content area
- Map controls: zoom, compass, fullscreen

- [ ] **Step 2: Create ZoneOverlays**

`src/components/map/ZoneOverlays.tsx`:
- Fetch zones with boundaries from API
- Render each zone as a filled polygon with zone color (semi-transparent)
- Zone name label at centroid
- Click zone to filter incidents/officers to that zone

**Note:** The API returns zone boundaries as PostGIS geometry. The zones endpoint needs to return GeoJSON format. If not available, add a new endpoint `GET /api/v1/zones/geojson` that returns zones as GeoJSON FeatureCollection, OR parse the raw geometry client-side. Check what the current zones API returns and adapt.

- [ ] **Step 3: Create OfficerMarkers**

`src/components/map/OfficerMarkers.tsx`:
- Fetch officer locations from API (poll every 30s)
- Render each on-duty officer as a marker:
  - Green dot for active
  - Yellow dot for device_offline
  - Marker shows officer initials
- Click marker shows popup: name, badge, zone, current status
- For demo: since officers aren't actually moving, seed some simulated location data

- [ ] **Step 4: Create IncidentMarkers**

`src/components/map/IncidentMarkers.tsx`:
- Fetch open/assigned/in_progress incidents
- Render as markers with priority color:
  - Critical: red pulsing
  - High: orange
  - Medium: yellow
  - Low: blue
- Click shows popup: title, category, priority, SLA countdown, assigned officer

- [ ] **Step 5: Create CheckpointMarkers**

`src/components/map/CheckpointMarkers.tsx`:
- Small diamond markers for checkpoints
- Color by type: gate=blue, patrol=green, fixed=gray
- Toggle visibility via map controls
- Click shows: name, type, zone

- [ ] **Step 6: Wire up DashboardPage with CommandMap**

`src/pages/DashboardPage.tsx`:
- Full-width map taking ~70% of the page
- Right sidebar panel (30%) with quick stats: open incidents count, on-duty officers count, zone health indicators
- Or: map takes full width with floating panels overlaid

- [ ] **Step 7: Verify map renders with seeded El Gouna data**

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: command map — MapLibre with zones, officers, incidents, checkpoints"
```

---

## Task 7: Incident Queue (was Task 6)

**Files:**
- Create: `dashboard/src/components/incidents/IncidentQueue.tsx`, `IncidentCard.tsx`, `IncidentDetail.tsx`, `SlaTimer.tsx`, `AssignOfficerDialog.tsx`
- Create: `dashboard/src/pages/IncidentsPage.tsx`

- [ ] **Step 1: Create SlaTimer component**

`src/components/incidents/SlaTimer.tsx`:
- Takes `deadline: Date` prop
- Calculates remaining time, updates every second
- Color states:
  - Green (>50% remaining)
  - Yellow (25-50%)
  - Red (<25%)
  - Flashing red (breached — negative time, shows "OVERDUE +Xm")
- Displays as: "4h 23m" or "12m 45s" (smart formatting)

- [ ] **Step 2: Create IncidentCard**

`src/components/incidents/IncidentCard.tsx`:
- Compact row showing: priority badge, title, category, zone, assigned officer, SLA timer
- Priority badge colors: critical=red, high=orange, medium=yellow, low=blue
- Status indicator
- Click opens detail panel

- [ ] **Step 3: Create IncidentQueue**

`src/components/incidents/IncidentQueue.tsx`:
- Filter bar: status dropdown, zone dropdown, priority dropdown, search text
- List of IncidentCards sorted by priority then createdAt
- Real-time feel via TanStack Query polling (10s)
- Count badge showing total open incidents

- [ ] **Step 4: Create AssignOfficerDialog**

`src/components/incidents/AssignOfficerDialog.tsx`:
- Modal triggered from incident detail or queue
- Shows available officers in the incident's zone
- Officer list with: name, badge, current workload (active incidents count), status
- Select officer → calls POST /incidents/:id/assign
- Refreshes incident data after assignment

- [ ] **Step 5: Create IncidentDetail**

`src/components/incidents/IncidentDetail.tsx`:
- Slide-over panel or modal showing full incident:
  - Header: title, priority, status, SLA timers (response + resolution)
  - Info: category, zone, reporter type, location (small map if coords available)
  - Assigned officer (or "Unassigned" with Assign button)
  - Timeline of updates (notes, status changes, assignments) — chronological
  - Action buttons: Change status, Add note, Assign, Cancel
- Status transition buttons based on VALID_TRANSITIONS

- [ ] **Step 6: Create IncidentsPage**

`src/pages/IncidentsPage.tsx`:
- Full-page incident queue
- Split view: list on left, detail on right (or overlay)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: incident queue — filterable list, SLA timers, assignment, detail panel"
```

---

## Task 8: Personnel Panel (was Task 7)

**Files:**
- Create: `dashboard/src/components/personnel/OfficerRoster.tsx`, `OfficerCard.tsx`, `ShiftSchedule.tsx`
- Create: `dashboard/src/pages/PersonnelPage.tsx`, `dashboard/src/pages/ShiftsPage.tsx`

- [ ] **Step 1: Create OfficerCard**

`src/components/personnel/OfficerCard.tsx`:
- Officer row: name, badge, role badge, zone, status indicator (green/yellow/red/gray)
- Active incidents count
- Last known location (if available)

- [ ] **Step 2: Create OfficerRoster**

`src/components/personnel/OfficerRoster.tsx`:
- Tab view: On Duty | Off Duty | All
- Filter by zone, role
- Search by name or badge number
- Count per tab
- Sortable columns

- [ ] **Step 3: Create ShiftSchedule**

`src/components/personnel/ShiftSchedule.tsx`:
- Simple table view: rows = officers, columns = days of the week
- Cells show: shift time (Day/Night), status (scheduled/active/completed/no_show)
- Color-coded: active=green, scheduled=blue, no_show=red, called_off=gray
- Week navigation (prev/next week)

- [ ] **Step 4: Create PersonnelPage**

`src/pages/PersonnelPage.tsx`:
- Tabs: Roster | Map View
- Roster tab: OfficerRoster component
- Map View tab: CommandMap filtered to show only officer markers (reuse map component)

- [ ] **Step 5: Create ShiftsPage**

`src/pages/ShiftsPage.tsx`:
- ShiftSchedule component
- Filter by zone
- Today highlighted

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: personnel panel — officer roster, shift schedule"
```

---

## Task 9: Dashboard Summary + Quick Stats (was Task 8)

**Files:**
- Modify: `dashboard/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create dashboard quick stats panel**

Add floating panels over the command map or a side panel:
- **Open Incidents:** count by priority (critical: X, high: X, medium: X, low: X)
- **On-Duty Officers:** count, percentage of total
- **Zone Health:** per-zone status indicator (green/yellow/red based on open incidents vs officers)
- **Recent Activity:** last 5 incident updates (scrolling feed)

- [ ] **Step 2: Create zone health calculation**

```typescript
function getZoneHealth(zone: Zone, incidents: Incident[], officers: Officer[]) {
  const openIncidents = incidents.filter(i => i.zoneId === zone.id && ['open', 'assigned', 'in_progress'].includes(i.status));
  const onDutyOfficers = officers.filter(o => o.zoneId === zone.id && o.status === 'active');
  const hasCritical = openIncidents.some(i => i.priority === 'critical');
  if (hasCritical) return 'red';
  if (openIncidents.length > onDutyOfficers.length) return 'yellow';
  return 'green';
}
```

- [ ] **Step 3: Wire everything together**

DashboardPage layout:
- Map takes full width
- Floating top-left: quick stats cards
- Floating bottom-left: recent activity feed
- Floating right: mini incident queue (top 5 by priority)
- All data from TanStack Query hooks with polling

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: dashboard summary — quick stats, zone health, activity feed"
```

---

## Task 10: Demo Data Simulation

**Files:**
- Create: `scripts/simulate-demo.ts` — generates realistic demo activity

For the ODH demo, we need the dashboard to look alive. This script simulates:

- [ ] **Step 1: Create simulation script**

`scripts/simulate-demo.ts`:
- Creates 10-15 sample incidents across zones (mix of priorities and statuses)
- Creates active shifts for 30+ officers
- Inserts simulated GPS locations for on-duty officers (spread across El Gouna)
- Creates some incident updates and assignments
- Makes the dashboard look like a live security operation

- [ ] **Step 2: Add script to package.json**

```json
"demo:seed": "tsx scripts/simulate-demo.ts"
```

- [ ] **Step 3: Run and verify dashboard shows live data**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
npm run demo:seed
cd dashboard && npm run dev
# Login as MGR-001, verify map shows officers, incidents, zone overlays
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: demo simulation script — realistic live dashboard data"
```

---

## Task 11: Polish + Final Verification

- [ ] **Step 1: Visual polish**

- Ensure consistent spacing, typography, color usage
- Loading states (skeleton loaders) for all data-dependent components
- Empty states ("No incidents" when filtered list is empty)
- Error states (API unreachable banner)

- [ ] **Step 2: Responsive checks**

- Dashboard works on 1920x1080 (desktop monitor)
- Dashboard works on 1024x768 (tablet landscape — supervisor use case)
- Sidebar collapses on smaller screens

- [ ] **Step 3: Full demo walkthrough**

1. Start API: `cd /Users/bistrocloud/Documents/Sec-Ops-OS && npm run dev`
2. Seed + simulate: `npm run db:seed && npm run demo:seed`
3. Start dashboard: `cd dashboard && npm run dev`
4. Login as MGR-001 / 1234
5. Verify: map shows El Gouna with zones, officers, incidents
6. Verify: incident queue shows incidents with SLA timers
7. Verify: can assign officer to incident
8. Verify: personnel page shows roster and shift schedule
9. Verify: clicking zones on map filters data

- [ ] **Step 4: Commit and push**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
git add -A
git commit -m "feat: dashboard polish — loading states, responsive, demo-ready"
git push origin main
```

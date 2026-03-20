# Security OS for El Gouna — Technical Architecture

**Date:** 2026-03-20
**Status:** Approved
**Session:** 2 of 5

## Summary

Technical architecture for the Security OS MVP (Tier 1): Incident/Complaint Management + Personnel Management + Basic Command Map. On-premise deployment at El Gouna. Offline-first mobile app for 584 field officers, web dashboard for 53 management staff, WhatsApp integration for resident complaints, and local AI for analysis/suggestions.

## Context

- **Community:** El Gouna, 25,000 residents, 10 km² coastline resort
- **Operator:** Orascom Development Holding (ODH)
- **Security force:** 637 personnel (584 field, 53 office-based management)
- **Checkpoints:** 180 across the community
- **Budget:** Allocated — build-and-deploy project
- **WhatsApp:** Existing Business account on El Gouna security number
- **Prior sessions:** Sessions 0-1 defined modules, tiers, personas, pain points (see SecurityOS_ElGouna_Handoff.docx)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deployment | On-premise | Security data sovereignty, no internet dependency for core ops |
| Backend | Node.js + Fastify | Fast, TypeScript-first, strong ecosystem for real-time + sync |
| Database | PostgreSQL 16 + PostGIS | Geospatial queries for 180 checkpoints, officer locations, zone boundaries |
| Mobile app | React Native + Expo | Offline-first, GPS tracking, push notifications, single codebase for Android |
| Web dashboard | React + Vite | Lightweight, fast builds, same language as backend (TypeScript) |
| AI | Ollama (local LLM) | On-premise, zero external dependency, full data sovereignty |
| Offline strategy | WatermelonDB + sync queue | SQLite-backed local DB, background sync on reconnect |
| Maps | MapLibre GL + local OSM tiles | No external tile server dependency |
| Language | Arabic-primary, English reports | Officers speak Arabic; ODH management expects English reports |
| Real-time | Socket.IO + Redis adapter | Officer location broadcasts, incident updates, scalable pub/sub |

## Architecture

### Deployment: On-Premise Docker Stack

Single rack-mount server at El Gouna data room.

**Minimum specs:** 32GB RAM, 8+ CPU cores, 1TB NVMe SSD. GPU optional (for faster AI inference — start with CPU).

**Docker Compose services:**

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| api | Custom Node.js | 3000 | Fastify REST API + Socket.IO |
| worker | Custom Node.js | — | BullMQ background job processors |
| postgres | postgres:16-postgis | 5432 | Primary database |
| redis | redis:7-alpine | 6379 | Cache, pub/sub, job queue |
| ollama | ollama/ollama | 11434 | Local LLM runtime |
| nginx | nginx:alpine | 80/443 | Reverse proxy, TLS, static files |
| tile-server | tileserver-gl | 8080 | Local OpenStreetMap tile server |
| prometheus | prom/prometheus | 9090 | Metrics collection |
| grafana | grafana/grafana | 3001 | Monitoring dashboards + alerting |
| loki | grafana/loki | 3100 | Log aggregation |
| uptime-kuma | louislam/uptime-kuma | 3002 | Service health monitoring |

**Networking:** All services on internal Docker network. Only Nginx exposed to El Gouna LAN. Officers connect via local Wi-Fi or cellular.

**TLS:** Self-signed certificate or internal CA. Mobile app pins the certificate.

**Backup:**
- Automated daily `pg_dump` to external NAS (retained 30 days)
- Weekly encrypted offsite backup (USB rotation or secure upload if internet available)
- Redis is ephemeral (reconstructable from PostgreSQL)

### Backend: Node.js + Fastify

**Stack:**
- Node.js 22 LTS
- Fastify 5 (REST API + WebSocket via Socket.IO plugin)
- Prisma ORM with PostGIS extensions
- BullMQ for background job processing
- Socket.IO with Redis adapter for real-time events

**API structure:**

```
/api/v1/auth          — login, refresh, logout
/api/v1/officers      — CRUD, status, location updates
/api/v1/shifts        — schedule, check-in/out, handover
/api/v1/patrols       — routes, checkpoint confirmations
/api/v1/incidents     — CRUD, assignment, status updates, media upload
/api/v1/zones         — boundaries, checkpoints, stats
/api/v1/ai            — suggestions, analysis queries, report generation
/api/v1/sync          — offline action queue upload/download
/api/v1/whatsapp      — webhook receiver for inbound messages
```

**Authentication & RBAC:**
- JWT access tokens (15 min) + refresh tokens (7 days) with rotation
- **Token revocation:** Redis-backed blacklist for immediate revocation (lost device, terminated officer)
- **Device binding:** Each officer bound to one device via `device_id`. Login from unregistered device rejected.
- **Failed attempt lockout:** 5 failed PINs → 15 min lockout. Supervisor notified.
- **Biometric unlock:** After initial PIN auth, subsequent sessions can use fingerprint/face (device-native)
- Four roles: `officer`, `supervisor`, `manager`, `admin`
- Supervisor scoped to their assigned zone(s)
- Manager sees all zones
- Admin configures system (zones, SLA rules, categories, shifts)

**API rate limiting:**
- Per-device: 60 req/min general, 120 req/min for location updates
- Per-officer: 30 req/min for auth endpoints
- Global: 10,000 req/min across all clients
- Enforced via Redis sliding window counters

**Sync engine (offline-first support):**
- Mobile devices store actions in local WatermelonDB
- On reconnect, device POSTs batch to `/api/v1/sync` with local timestamps
- **Server-assigned sequence numbers:** Each sync response includes a `server_seq` watermark. Devices use this (not local clock) for ordering, preventing clock drift issues on budget tablets.
- **Batch size limit:** Max 500 actions per sync request. Devices chunk larger queues across multiple requests.
- Server applies actions in order, resolving conflicts:
  - **Location updates:** last-write-wins (high frequency, no conflict)
  - **Incident status changes:** server-authority (prevents race conditions)
  - **Incident assignment conflicts:** first-write-wins. If offline supervisor assigns an already-assigned incident, sync returns conflict; offline assignment is rejected and supervisor is notified.
  - **Notes/media:** always append (no conflict possible)
- Server returns authoritative state + conflict list; device reconciles local DB and shows conflict notifications

### AI Layer: Local LLM via Ollama

**Model:** Qwen2.5:7B (or Llama 3 8B). Runs on CPU; ~5-10 second inference. GPU upgradeable.

**Capabilities:**

| Feature | Trigger | Output |
|---------|---------|--------|
| Smart Dispatch | New incident created | Deterministic scoring algorithm (distance + skill + workload). LLM generates human-readable explanation of recommendation. |
| Complaint Triage | WhatsApp message received | Category, priority, zone, suggested response |
| Pattern Detection | Hourly cron job | Hotspot identification, time-based trends, recurring issue alerts |
| Shift Optimization | Weekly analysis job | Staffing recommendations by zone and time slot based on incident density |
| Report Generation | Nightly/weekly/monthly cron | Structured summary of incidents, response times, trends, anomalies (English) |
| Anomaly Alerts | Continuous monitoring | Officer stationary too long, incident volume spike, missed checkpoints |
| Natural Language Query | Manager types question in dashboard | Structured answer from incident/personnel data. **Experimental in MVP** — pre-built query templates with LLM for interpretation. |

**Implementation approach:**
- Each AI feature is a distinct BullMQ job type with its own prompt template
- Prompts include relevant data context (recent incidents, officer roster, zone stats) — essentially RAG over PostgreSQL
- **Context window management:** Data is pre-aggregated via SQL before passing to LLM. Pattern detection summarizes per-zone stats rather than raw incident lists. Max prompt size capped at 4K tokens of data context.
- **Smart Dispatch** uses a deterministic scoring algorithm (PostGIS distance + officer skill tags + current workload count). LLM only generates the human-readable explanation, not the ranking itself.
- AI suggestions stored in `ai_suggestions` table, linked to incidents, with accept/reject tracking
- Generated reports are template-driven: SQL aggregates the numbers, LLM fills narrative sections
- **Fallback on AI failure:** Every AI-dependent workflow has a non-AI path. If Ollama is down or produces invalid output: triage defaults to "uncategorized/medium", dispatch falls back to manual assignment, reports show data-only (no narrative), anomaly detection pauses silently. No user-facing workflow is blocked by AI.

**Data stays on-premise.** Ollama runs locally. No external API calls for AI. The only external dependency is WhatsApp Cloud API for messaging.

### WhatsApp Business API Integration

Uses existing El Gouna security WhatsApp Business account.

**Inbound flow:**
1. Resident sends message to security number
2. WhatsApp Cloud API delivers webhook to `/api/v1/whatsapp`
3. System extracts: text, location (if shared), photo (if attached), sender phone
4. AI triage job classifies category, priority, zone from message content
5. Incident ticket created in PostgreSQL
6. Auto-reply in Arabic: "تم استلام شكواك. رقم البلاغ: #XXXX" (Complaint received. Ticket #XXXX)

**Outbound flow:**
- Status updates pushed to resident at key milestones: assigned, in-progress, escalated, resolved
- All messages in Arabic
- Rate-limited via BullMQ to comply with WhatsApp API limits

**Webhook routing:** WhatsApp Cloud API requires a publicly accessible HTTPS endpoint. Since the server is on-premise behind El Gouna LAN, use **Cloudflare Tunnel** (free tier) to expose only the `/api/v1/whatsapp` webhook endpoint to the internet. All other endpoints remain LAN-only. This is the only external infrastructure component.

**24-hour messaging window:** Meta restricts business-initiated messages to 24 hours after last customer message. For incidents exceeding 24 hours, use pre-approved template messages for status updates. Required templates to register with Meta: ticket_received, officer_assigned, incident_update, incident_resolved.

**Rate limits:** Meta starts new numbers at 1,000 business-initiated messages/day. For a 25,000-resident community during a crisis, this could bottleneck. Plan for tier progression (1K → 10K → 100K) by maintaining quality rating. BullMQ rate-limiter enforces daily caps.

**Offline handling:** If internet is down, inbound messages queue at Meta's servers (delivered when connection restores). Outbound messages queue in BullMQ and send when connection restores. Core security ops are unaffected — WhatsApp is a convenience channel, not the primary workflow.

### Frontend: Mobile App (Officers)

**Stack:** React Native + Expo (SDK 52+), WatermelonDB, react-native-maps, i18next

**Key screens:**
- **Login** — badge number + PIN
- **Dashboard** — current shift info, assigned incidents, patrol status
- **Incident List** — assigned and nearby incidents with priority badges
- **Incident Detail** — status, updates, photo/voice note capture, location
- **New Incident** — quick report form with photo, category picker, GPS auto-stamp
- **Patrol Mode** — route map with checkpoints, GPS proximity confirmation
- **Shift Check-in/Out** — GPS-stamped with handover notes

**Offline-first architecture:**
- WatermelonDB (SQLite-backed) stores: active incidents, shift data, patrol routes, officer profile, checkpoint list
- All write actions queue locally with timestamps
- Background sync service: checks connectivity every 30 seconds, uploads queued actions when online
- GPS tracking: background location service, 30-second interval, batched upload

**Language:** Arabic-primary with full RTL layout. English toggle in settings.

**Target devices:** Android 10+ tablets with rugged cases. iOS support possible but not MVP priority (field officers use Android).

### Frontend: Web Dashboard (Supervisors & Manager)

**Stack:** React 19 + Vite, TanStack Query, Socket.IO client, MapLibre GL JS, Recharts, i18next

**Key views:**

**Command Map (Module 6):**
- Live El Gouna map via MapLibre GL with locally-served OSM tiles
- Officer position markers (updated real-time via Socket.IO)
- Open incident markers with priority color-coding
- Zone boundary overlays
- Checkpoint markers with status indicators

**Incident Queue (Module 3):**
- Real-time ticket list, filterable by zone/category/priority/status
- SLA countdown timers with color escalation (green → yellow → red)
- One-click officer assignment with AI-suggested dispatch
- Incident detail panel with full history, media, resolution log

**Personnel Panel (Module 4):**
- On-duty/off-duty roster with zone assignments
- Live officer locations on map
- Shift schedule (weekly calendar view)
- Performance metrics: response time, incidents handled, patrol completion rate

**AI Insights Panel:**
- Pattern alerts with confidence scores
- Staffing recommendations
- Anomaly flags
- Natural language query interface ("Show me all noise complaints in Downtown this month")
- Generated report viewer with PDF export

**RBAC views:**
- Supervisor: sees their zone(s) only
- Manager: sees all zones, plus analytics and AI insights
- Admin: system configuration (zones, checkpoints, SLA rules, categories, user management)

**Language:** Arabic-primary for supervisor day-to-day. English for reports and management views.

### Database Schema

**Personnel & Zones:**

```
officers        — id, name_ar, name_en, badge_number, rank, role, zone_id, phone, device_id, status, photo_path, pin_hash, failed_login_attempts, locked_until
zones           — id, name_ar, name_en, boundary(PostGIS polygon), supervisor_id, color
checkpoints     — id, name_ar, name_en, zone_id, location(PostGIS point), type(gate|patrol|fixed), status
shifts          — id, officer_id, zone_id, status(scheduled|active|completed|no_show), scheduled_start, scheduled_end, actual_check_in, actual_check_out, check_in_location(PostGIS), check_out_location(PostGIS), handover_notes
patrol_routes   — id, name, zone_id, estimated_duration_min
patrol_route_checkpoints — id, route_id, checkpoint_id, sequence_order, expected_dwell_min
patrol_logs     — id, shift_id, route_id, started_at, completed_at
patrol_checkpoints — id, patrol_log_id, checkpoint_id, arrived_at, gps_location(PostGIS), confirmed(boolean)
officer_locations — id, officer_id, location(PostGIS point), timestamp, accuracy_meters
                   (partitioned by date, retained 90 days, indexed on officer_id + timestamp)
```

**Incidents & Complaints:**

```
categories       — id, name_ar, name_en, parent_id, default_priority, icon
incidents        — id, title, description, category_id, priority(critical|high|medium|low), status(open|assigned|in_progress|escalated|resolved|closed), zone_id, location(PostGIS), reporter_type(officer|resident|whatsapp), reporter_phone, created_by_officer_id, assigned_officer_id, created_at, assigned_at, sla_response_deadline, sla_resolution_deadline, resolved_at, closed_at
incident_updates — id, incident_id, author_id, type(note|photo|voice_note|status_change|escalation|assignment), content, metadata(jsonb), created_at
                   (metadata stores structured data per type: status_change={old,new}, assignment={old_officer,new_officer}, photo={file_path,size})
incident_media   — id, incident_id, type(photo|voice_note), file_path, file_size, created_at
sla_rules        — id, category_id, priority, response_minutes, resolution_minutes, escalation_chain(jsonb)
```

**AI:**

```
ai_analyses      — id, type(pattern|anomaly|staffing), scope(zone|shift|global), zone_id, content(jsonb), confidence, created_at
ai_suggestions   — id, incident_id, type(dispatch|resolution|triage), suggestion_text, accepted(boolean), accepted_by, created_at
generated_reports — id, type(daily|weekly|monthly), period_start, period_end, content(jsonb), pdf_path, created_at
ai_conversations — id, user_id, messages(jsonb), created_at, updated_at
```

**WhatsApp:**

```
whatsapp_messages — id, incident_id, direction(inbound|outbound), sender_phone, content, media_url, wa_message_id, template_name, status(sent|delivered|read|failed), created_at
```

**Audit & Sync:**

```
audit_logs       — id, actor_id, actor_role, action, entity_type, entity_id, old_value(jsonb), new_value(jsonb), ip_address, device_id, created_at
                   (immutable append-only table, retained indefinitely, indexed on entity_type + entity_id)
sync_queue       — id, device_id, officer_id, action_type, payload(jsonb), server_seq(bigint), created_at_device, received_at_server, processed_at, conflict_status(none|resolved|rejected)
```

**Indexes:**
- `officer_locations`: composite on (officer_id, timestamp DESC), spatial on location
- `incidents`: on (status, zone_id, priority), on (assigned_officer_id, status), spatial on location
- `checkpoints`: spatial on location
- `zones`: spatial on boundary

### Background Jobs (BullMQ)

| Queue | Schedule | Purpose |
|-------|----------|---------|
| sla-monitor | Every 60 seconds | Check open tickets against SLA deadlines, trigger escalations |
| ai-triage | On new WhatsApp message | Classify category, priority, zone |
| ai-dispatch | On new incident | Suggest optimal officer assignment |
| ai-patterns | Hourly | Analyze recent incidents for hotspots and trends |
| ai-anomalies | Every 5 minutes | Check officer movement, incident volume, missed checkpoints |
| ai-reports | Nightly (22:00) | Generate daily summary. Weekly on Sunday. Monthly on 1st. |
| ai-staffing | Weekly (Sunday 06:00) | Analyze incident density vs staffing, produce recommendations |
| sync-processor | On device reconnect | Process offline action queues from mobile devices |
| whatsapp-outbound | On status change | Queue and rate-limit outbound messages to residents |

### Incident Lifecycle (Example)

1. **Resident** WhatsApps: "Broken gate at Kafr entrance, cars can't get through"
2. **Webhook** receives → creates incident in PostgreSQL
3. **AI triage** classifies: Category=Infrastructure, Priority=High, Zone=Kafr
4. **Smart dispatch** identifies nearest available officer → push notification + Socket.IO
5. **WhatsApp auto-reply** (Arabic): "Complaint received. Officer assigned. Ticket #4521"
6. **Officer** receives on mobile (works offline). Navigates to location. GPS confirms arrival.
7. **Officer** documents: photo of broken gate, note "hinge broken, needs maintenance". Marks escalation.
8. **Supervisor** sees on dashboard → dispatches maintenance → updates ticket
9. **Maintenance** completes → supervisor closes ticket with resolution note
10. **WhatsApp auto-update** (Arabic): "Gate repaired. Thank you for your report."
11. **AI** logs incident for pattern analysis — adds to Kafr infrastructure trend data

### Media Storage

- **Location:** `/data/media/` on server, mounted as Docker volume
- **Structure:** `/data/media/{incidents|officers}/{id}/{filename}`
- **Served via:** Nginx static file serving with auth token validation
- **Limits:** Photos max 5MB, voice notes max 10MB. File type validation (JPEG/PNG/WebM only). Basic content-type verification.
- **Retention:** Incident media retained 2 years. Officer photos retained while active.
- **Disk monitoring:** Alert when `/data/media/` exceeds 80% of allocated space.

### Monitoring & Observability

| Component | Tool | Purpose |
|-----------|------|---------|
| Container health | Docker healthchecks + Uptime Kuma | Detect container failures, auto-restart |
| Metrics | Prometheus + node_exporter | CPU, RAM, disk, network per container |
| Dashboards | Grafana | Visual monitoring for ops team |
| Logs | Docker json-file driver + Loki | Centralized log collection, 30-day retention |
| Alerts | Grafana alerting → WhatsApp/SMS | Disk >80%, container down, PostgreSQL connections >80%, BullMQ failures |
| Database | pg_stat_statements | Query performance monitoring |

**Health checks per container:**
- API: `GET /health` returns DB + Redis + Ollama status
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Ollama: `GET /api/tags`
- Tile server: `GET /health`

### Deployment & Updates

- **Initial deployment:** Docker Compose on server. Images built locally or pulled from private registry.
- **Updates:** SSH → `git pull` → `docker compose build` → `docker compose up -d` with health check gates. Rollback: `docker compose up -d --force-recreate` with previous image tag.
- **Database migrations:** Prisma migrate deploy. Always forward-only in production. Test migrations on staging backup first.
- **RPO:** 1 hour (hourly WAL archiving to NAS, daily full pg_dump)
- **RTO:** 2 hours (restore from backup to spare server or rebuilt primary)

### Encryption

- **In transit:** TLS via Nginx (self-signed cert, pinned in mobile app)
- **At rest:** LUKS volume encryption on server's data partition (PostgreSQL data, media files)
- **Sensitive fields:** Officer PINs stored as bcrypt hashes. Resident phone numbers stored as-is (needed for WhatsApp replies) but access logged via audit_logs.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Server hardware failure | HIGH | Hourly WAL archiving + daily full backup to NAS. RPO 1hr, RTO 2hr. |
| WhatsApp API internet dependency | MEDIUM | Cloudflare Tunnel for webhook. Outbound queues locally. Core ops unaffected. |
| WhatsApp rate limits during crisis | MEDIUM | BullMQ rate limiter. Tier progression plan. Prioritize critical incident notifications. |
| Ollama CPU inference latency (5-10s) | LOW | AI is async (background jobs). Never blocks user actions. Graceful fallback if down. |
| AI produces bad output | LOW | Every AI workflow has non-AI fallback. Suggestions require human accept/reject. |
| 637 officers onboarding | MEDIUM | Phased rollout by zone. Train supervisors first, cascade to officers. |
| Device loss/compromise | MEDIUM | Device binding, remote token revocation, PIN lockout, audit logging. |
| WatermelonDB sync conflicts | LOW | Server-assigned sequence numbers, first-write-wins for assignments, append-only notes |
| Disk fill from media uploads | MEDIUM | Monitoring alerts at 80%. Retention policy with auto-cleanup of old media. |
| Arabic RTL complexity | MEDIUM | Use established i18next + react-native RTL support. Test with native speakers. |
| Single point of failure (one server) | HIGH | Hourly WAL archiving. Budget for secondary server with PostgreSQL streaming replication in Phase 2. |

## Out of Scope (MVP)

- Gate management module (Tier 2)
- Asset tracking (Tier 2)
- Full reporting & analytics (Tier 2)
- Surveillance/CCTV integration (Tier 3)
- Resident-facing app (Tier 3)
- Facial recognition (Tier 3)
- License plate recognition (Tier 2)

## Next Sessions

| Session | Topic | Builds on |
|---------|-------|-----------|
| 3 | Ops workflows, RBAC matrix, escalation logic, SLA design | This architecture |
| 4 | Resident-facing product, WhatsApp flows, app integration | Modules 3 & 8 |
| 5 | Go-to-market, pricing, ODH pitch | All sessions |

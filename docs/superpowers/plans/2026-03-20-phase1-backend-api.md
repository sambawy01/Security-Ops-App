# Phase 1: Backend API + Seed Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fastify REST API with PostgreSQL/PostGIS, auth system, core CRUD endpoints for the 3 MVP modules (Incidents, Personnel, Command Map), and seed El Gouna data.

**Architecture:** Fastify 5 + Prisma ORM + PostgreSQL 16 with PostGIS + Redis 7. Docker Compose for local dev. JWT auth with 7-role RBAC. TypeScript throughout.

**Tech Stack:** Node.js 22, Fastify 5, Prisma 6, PostgreSQL 16 + PostGIS, Redis 7, Docker Compose, Vitest, TypeScript 5.

---

## File Structure

```
/
├── docker-compose.yml                    # PostgreSQL + Redis for dev
├── package.json
├── tsconfig.json
├── .env                                  # Local dev env vars
├── .env.example
├── .gitignore
├── prisma/
│   ├── schema.prisma                     # Full database schema
│   └── seed.ts                           # El Gouna seed data
├── src/
│   ├── server.ts                         # Fastify app creation + plugin registration
│   ├── index.ts                          # Entry point — starts server
│   ├── config.ts                         # Env var loading + validation
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   ├── redis.ts                      # Redis client singleton
│   │   ├── auth.ts                       # JWT sign/verify, password hashing
│   │   └── errors.ts                     # Typed API error classes
│   ├── plugins/
│   │   ├── auth.plugin.ts                # Fastify auth decorator + JWT verification
│   │   └── rbac.plugin.ts                # Role-based route guard
│   ├── routes/
│   │   ├── auth.routes.ts                # POST /login, /refresh, /logout
│   │   ├── officers.routes.ts            # CRUD + status + location
│   │   ├── zones.routes.ts               # List zones + checkpoints + stats
│   │   ├── incidents.routes.ts           # CRUD + assignment + status transitions
│   │   ├── shifts.routes.ts              # Schedule + check-in/out
│   │   └── health.routes.ts              # GET /health
│   └── schemas/
│       ├── auth.schema.ts                # Zod schemas for auth endpoints
│       ├── officers.schema.ts            # Zod schemas for officer endpoints
│       ├── zones.schema.ts               # Zod schemas for zone endpoints
│       ├── incidents.schema.ts           # Zod schemas for incident endpoints
│       └── shifts.schema.ts              # Zod schemas for shift endpoints
│   ├── lib/
│   │   ├── geo.ts                        # PostGIS helper functions (raw SQL)
├── tests/
│   ├── setup.ts                          # Test DB setup/teardown
│   ├── helpers.ts                        # Auth helpers, factories
│   ├── auth.test.ts
│   ├── officers.test.ts
│   ├── zones.test.ts
│   ├── incidents.test.ts
│   ├── shifts.test.ts
│   └── patrols.test.ts
```

## Deferred to Later Phases

The following items from the architecture spec are **intentionally excluded** from Phase 1:

- **API routes:** `/api/v1/ai`, `/api/v1/sync`, `/api/v1/whatsapp` — these are Phase 5 (AI), Phase 4 (mobile sync), and Phase 6 (WhatsApp) respectively
- **Tables in schema but no API yet:** `ai_analyses`, `generated_reports`, `ai_conversations` — schema created now for forward compatibility, APIs built in Phase 5
- **`performance_metrics` materialized view** — built in Phase 5 alongside the BullMQ job that populates it
- **`officer_locations` partitioning** — deferred to production deployment prep; works fine unpartitioned for development and pilot scale
- **Rate limiting** — deferred to Phase 3 (pre-deployment hardening); not needed for development
- **Supervisor lockout notification** — TODO: requires notification infrastructure (Socket.IO) built in Phase 2

---

## Task 1: Project Scaffolding + Docker

**Files:**
- Create: `package.json`, `tsconfig.json`, `docker-compose.yml`, `.env`, `.env.example`, `.gitignore`, `src/index.ts`, `src/server.ts`, `src/config.ts`

- [ ] **Step 1: Initialize Node.js project**

```bash
cd /Users/bistrocloud/Documents/Sec-Ops-OS
npm init -y
npm install fastify @fastify/cors fastify-plugin jsonwebtoken @prisma/client ioredis zod bcrypt dotenv
npm install -D typescript @types/node @types/bcrypt @types/jsonwebtoken vitest tsx prisma
npx tsc --init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
node_modules
dist
.env
*.log
prisma/*.db
```

- [ ] **Step 3: Create .env.example and .env**

```env
DATABASE_URL=postgresql://secops:secops@localhost:5432/secops?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
PORT=3000
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: secops
      POSTGRES_PASSWORD: secops
      POSTGRES_DB: secops
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 6: Create src/config.ts**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql'),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3000),
});

export const config = envSchema.parse(process.env);
```

- [ ] **Step 7: Create src/server.ts**

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './lib/errors.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  // Global error handler — registered early so all routes benefit
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (error.validation) {
      return reply.status(400).send({ error: 'Validation error', details: error.validation });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  // Health check — placeholder, enhanced in Task 9
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
```

- [ ] **Step 8: Create src/index.ts**

```typescript
import 'dotenv/config';
import { config } from './config.js';
import { buildApp } from './server.js';

const app = buildApp();

app.listen({ port: config.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Security OS API running at ${address}`);
});
```

- [ ] **Step 9: Update package.json scripts**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force"
  }
}
```

- [ ] **Step 10: Start Docker and verify**

```bash
docker compose up -d
curl http://localhost:5432 # should refuse (postgres, not http)
npm run dev
# In another terminal:
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding — Fastify + Docker + TypeScript"
```

---

## Task 2: Prisma Schema + Database Migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write the full Prisma schema**

Create `prisma/schema.prisma` with all tables from the architecture spec:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

enum Role {
  officer
  supervisor
  operator
  hr_admin
  secretary
  assistant_manager
  manager
}

enum OfficerStatus {
  active
  device_offline
  off_duty
  suspended
}

enum ShiftStatus {
  scheduled
  active
  completed
  no_show
  called_off
}

enum CheckpointType {
  gate
  patrol
  fixed
}

enum Priority {
  critical
  high
  medium
  low
}

enum IncidentStatus {
  open
  assigned
  in_progress
  escalated
  resolved
  closed
  cancelled
}

enum ReporterType {
  officer
  resident
  whatsapp
}

enum IncidentUpdateType {
  note
  photo
  voice_note
  status_change
  escalation
  assignment
}

enum MediaType {
  photo
  voice_note
}

enum SyncConflictStatus {
  none
  resolved
  rejected
}

model Officer {
  id                   String         @id @default(uuid())
  nameAr               String         @map("name_ar")
  nameEn               String         @map("name_en")
  badgeNumber          String         @unique @map("badge_number")
  rank                 String         @default("")
  role                 Role           @default(officer)
  zoneId               String?        @map("zone_id")
  zone                 Zone?          @relation("OfficerZone", fields: [zoneId], references: [id])
  phone                String         @default("")
  deviceId             String?        @map("device_id")
  status               OfficerStatus  @default(off_duty)
  photoPath            String?        @map("photo_path")
  pinHash              String         @map("pin_hash")
  failedLoginAttempts  Int            @default(0) @map("failed_login_attempts")
  lockedUntil          DateTime?      @map("locked_until")
  skills               String[]       @default([])
  createdAt            DateTime       @default(now()) @map("created_at")
  updatedAt            DateTime       @updatedAt @map("updated_at")

  shifts               Shift[]
  assignedIncidents    Incident[]     @relation("AssignedOfficer")
  createdIncidents     Incident[]     @relation("CreatedByOfficer")
  incidentUpdates      IncidentUpdate[]
  locations            OfficerLocation[]
  patrolLogs           PatrolLog[]
  supervisedZone       Zone?          @relation("ZoneSupervisor")
  aiSuggestions        AiSuggestion[] @relation("AcceptedBy")

  @@map("officers")
}

model Zone {
  id           String       @id @default(uuid())
  nameAr       String       @map("name_ar")
  nameEn       String       @map("name_en")
  boundary     Unsupported("geometry(Polygon, 4326)")?
  supervisorId String?      @unique @map("supervisor_id")
  supervisor   Officer?     @relation("ZoneSupervisor", fields: [supervisorId], references: [id])
  color        String       @default("#3b82f6")
  createdAt    DateTime     @default(now()) @map("created_at")

  officers     Officer[]    @relation("OfficerZone")
  checkpoints  Checkpoint[]
  shifts       Shift[]
  incidents    Incident[]
  patrolRoutes PatrolRoute[]

  @@map("zones")
}

model Checkpoint {
  id       String         @id @default(uuid())
  nameAr   String         @map("name_ar")
  nameEn   String         @map("name_en")
  zoneId   String         @map("zone_id")
  zone     Zone           @relation(fields: [zoneId], references: [id])
  location Unsupported("geometry(Point, 4326)")
  type     CheckpointType
  status   String         @default("active")
  createdAt DateTime      @default(now()) @map("created_at")

  routeCheckpoints PatrolRouteCheckpoint[]
  patrolCheckpoints PatrolCheckpointLog[]

  @@map("checkpoints")
}

model Shift {
  id                String      @id @default(uuid())
  officerId         String      @map("officer_id")
  officer           Officer     @relation(fields: [officerId], references: [id])
  zoneId            String      @map("zone_id")
  zone              Zone        @relation(fields: [zoneId], references: [id])
  status            ShiftStatus @default(scheduled)
  scheduledStart    DateTime    @map("scheduled_start")
  scheduledEnd      DateTime    @map("scheduled_end")
  actualCheckIn     DateTime?   @map("actual_check_in")
  actualCheckOut    DateTime?   @map("actual_check_out")
  checkInLocation   Unsupported("geometry(Point, 4326)")?  @map("check_in_location")
  checkOutLocation  Unsupported("geometry(Point, 4326)")?  @map("check_out_location")
  handoverNotes     String?     @map("handover_notes")
  isOvertime        Boolean     @default(false) @map("is_overtime")
  parentShiftId     String?     @map("parent_shift_id")
  parentShift       Shift?      @relation("OvertimeShift", fields: [parentShiftId], references: [id])
  overtimeShifts    Shift[]     @relation("OvertimeShift")
  createdAt         DateTime    @default(now()) @map("created_at")

  patrolLogs PatrolLog[]

  @@index([officerId, scheduledStart])
  @@index([zoneId, status])
  @@map("shifts")
}

model PatrolRoute {
  id                 String                  @id @default(uuid())
  name               String
  zoneId             String                  @map("zone_id")
  zone               Zone                    @relation(fields: [zoneId], references: [id])
  estimatedDurationMin Int                   @map("estimated_duration_min")
  createdAt          DateTime                @default(now()) @map("created_at")

  checkpoints        PatrolRouteCheckpoint[]
  patrolLogs         PatrolLog[]

  @@map("patrol_routes")
}

model PatrolRouteCheckpoint {
  id              String      @id @default(uuid())
  routeId         String      @map("route_id")
  route           PatrolRoute @relation(fields: [routeId], references: [id])
  checkpointId    String      @map("checkpoint_id")
  checkpoint      Checkpoint  @relation(fields: [checkpointId], references: [id])
  sequenceOrder   Int         @map("sequence_order")
  expectedDwellMin Int        @default(0) @map("expected_dwell_min")

  @@unique([routeId, sequenceOrder])
  @@map("patrol_route_checkpoints")
}

model PatrolLog {
  id          String       @id @default(uuid())
  shiftId     String       @map("shift_id")
  shift       Shift        @relation(fields: [shiftId], references: [id])
  routeId     String       @map("route_id")
  route       PatrolRoute  @relation(fields: [routeId], references: [id])
  officerId   String       @map("officer_id")
  officer     Officer      @relation(fields: [officerId], references: [id])
  startedAt   DateTime?    @map("started_at")
  completedAt DateTime?    @map("completed_at")
  createdAt   DateTime     @default(now()) @map("created_at")

  checkpoints PatrolCheckpointLog[]

  @@map("patrol_logs")
}

model PatrolCheckpointLog {
  id           String     @id @default(uuid())
  patrolLogId  String     @map("patrol_log_id")
  patrolLog    PatrolLog  @relation(fields: [patrolLogId], references: [id])
  checkpointId String     @map("checkpoint_id")
  checkpoint   Checkpoint @relation(fields: [checkpointId], references: [id])
  arrivedAt    DateTime?  @map("arrived_at")
  gpsLocation  Unsupported("geometry(Point, 4326)")?  @map("gps_location")
  confirmed    Boolean    @default(false)
  skipReason   String?    @map("skip_reason")

  @@map("patrol_checkpoints")
}

model OfficerLocation {
  id             String   @id @default(uuid())
  officerId      String   @map("officer_id")
  officer        Officer  @relation(fields: [officerId], references: [id])
  location       Unsupported("geometry(Point, 4326)")
  timestamp      DateTime @default(now())
  accuracyMeters Float?   @map("accuracy_meters")

  @@index([officerId, timestamp(sort: Desc)])
  @@map("officer_locations")
}

model Category {
  id              String     @id @default(uuid())
  nameAr          String     @map("name_ar")
  nameEn          String     @map("name_en")
  parentId        String?    @map("parent_id")
  parent          Category?  @relation("CategoryParent", fields: [parentId], references: [id])
  children        Category[] @relation("CategoryParent")
  defaultPriority Priority   @default(medium) @map("default_priority")
  icon            String     @default("alert-circle")
  createdAt       DateTime   @default(now()) @map("created_at")

  incidents       Incident[]
  slaRules        SlaRule[]

  @@map("categories")
}

model Incident {
  id                    String         @id @default(uuid())
  title                 String
  description           String         @default("")
  categoryId            String?        @map("category_id")
  category              Category?      @relation(fields: [categoryId], references: [id])
  priority              Priority       @default(medium)
  status                IncidentStatus @default(open)
  zoneId                String?        @map("zone_id")
  zone                  Zone?          @relation(fields: [zoneId], references: [id])
  location              Unsupported("geometry(Point, 4326)")?
  reporterType          ReporterType   @default(officer) @map("reporter_type")
  reporterPhone         String?        @map("reporter_phone")
  createdByOfficerId    String?        @map("created_by_officer_id")
  createdByOfficer      Officer?       @relation("CreatedByOfficer", fields: [createdByOfficerId], references: [id])
  assignedOfficerId     String?        @map("assigned_officer_id")
  assignedOfficer       Officer?       @relation("AssignedOfficer", fields: [assignedOfficerId], references: [id])
  relatedIncidentId     String?        @map("related_incident_id")
  relatedIncident       Incident?      @relation("RelatedIncident", fields: [relatedIncidentId], references: [id])
  relatedIncidents      Incident[]     @relation("RelatedIncident")
  awaitingExternal      Boolean        @default(false) @map("awaiting_external")
  cancelReason          String?        @map("cancel_reason")
  createdAt             DateTime       @default(now()) @map("created_at")
  assignedAt            DateTime?      @map("assigned_at")
  slaResponseDeadline   DateTime?      @map("sla_response_deadline")
  slaResolutionDeadline DateTime?      @map("sla_resolution_deadline")
  resolvedAt            DateTime?      @map("resolved_at")
  closedAt              DateTime?      @map("closed_at")

  updates               IncidentUpdate[]
  media                 IncidentMedia[]
  aiSuggestions         AiSuggestion[]
  whatsappMessages      WhatsappMessage[]

  @@index([status, zoneId, priority])
  @@index([assignedOfficerId, status])
  @@map("incidents")
}

model IncidentUpdate {
  id         String             @id @default(uuid())
  incidentId String             @map("incident_id")
  incident   Incident           @relation(fields: [incidentId], references: [id])
  authorId   String?            @map("author_id")
  author     Officer?           @relation(fields: [authorId], references: [id])
  type       IncidentUpdateType
  content    String             @default("")
  metadata   Json?
  createdAt  DateTime           @default(now()) @map("created_at")

  @@index([incidentId, createdAt])
  @@map("incident_updates")
}

model IncidentMedia {
  id         String    @id @default(uuid())
  incidentId String    @map("incident_id")
  incident   Incident  @relation(fields: [incidentId], references: [id])
  type       MediaType
  filePath   String    @map("file_path")
  fileSize   Int       @default(0) @map("file_size")
  createdAt  DateTime  @default(now()) @map("created_at")

  @@map("incident_media")
}

model SlaRule {
  id                String   @id @default(uuid())
  categoryId        String   @map("category_id")
  category          Category @relation(fields: [categoryId], references: [id])
  priority          Priority
  responseMinutes   Int      @map("response_minutes")
  resolutionMinutes Int      @map("resolution_minutes")
  escalationChain   Json     @default("[]") @map("escalation_chain")

  @@unique([categoryId, priority])
  @@map("sla_rules")
}

model AiSuggestion {
  id             String   @id @default(uuid())
  incidentId     String?  @map("incident_id")
  incident       Incident? @relation(fields: [incidentId], references: [id])
  type           String
  suggestionText String   @map("suggestion_text")
  accepted       Boolean?
  acceptedById   String?  @map("accepted_by")
  acceptedBy     Officer? @relation("AcceptedBy", fields: [acceptedById], references: [id])
  createdAt      DateTime @default(now()) @map("created_at")

  @@map("ai_suggestions")
}

model WhatsappMessage {
  id           String   @id @default(uuid())
  incidentId   String?  @map("incident_id")
  incident     Incident? @relation(fields: [incidentId], references: [id])
  direction    String
  senderPhone  String   @map("sender_phone")
  content      String   @default("")
  mediaUrl     String?  @map("media_url")
  waMessageId  String?  @map("wa_message_id")
  templateName String?  @map("template_name")
  status       String   @default("sent")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("whatsapp_messages")
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String?  @map("actor_id")
  actorRole  String?  @map("actor_role")
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  oldValue   Json?    @map("old_value")
  newValue   Json?    @map("new_value")
  ipAddress  String?  @map("ip_address")
  deviceId   String?  @map("device_id")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@map("audit_logs")
}

// AI tables — schema created now, APIs built in Phase 5
model AiAnalysis {
  id         String   @id @default(uuid())
  type       String   // pattern, anomaly, staffing
  scope      String   // zone, shift, global
  zoneId     String?  @map("zone_id")
  content    Json
  confidence Float    @default(0)
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("ai_analyses")
}

model GeneratedReport {
  id          String   @id @default(uuid())
  type        String   // daily, weekly, monthly
  periodStart DateTime @map("period_start")
  periodEnd   DateTime @map("period_end")
  content     Json
  pdfPath     String?  @map("pdf_path")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("generated_reports")
}

model AiConversation {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  messages  Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("ai_conversations")
}

model SyncQueue {
  id               String             @id @default(uuid())
  deviceId         String             @map("device_id")
  officerId        String             @map("officer_id")
  actionType       String             @map("action_type")
  payload          Json
  serverSeq        BigInt?            @map("server_seq")
  createdAtDevice  DateTime           @map("created_at_device")
  receivedAtServer DateTime?          @map("received_at_server")
  processedAt      DateTime?          @map("processed_at")
  conflictStatus   SyncConflictStatus @default(none) @map("conflict_status")

  @@map("sync_queue")
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: Migration creates all tables. PostGIS extension enabled.

- [ ] **Step 4: Create Prisma client singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
```

- [ ] **Step 5: Create Redis client singleton**

Create `src/lib/redis.ts`:

```typescript
import Redis from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.REDIS_URL);
```

- [ ] **Step 6: Create PostGIS spatial indexes migration**

After the initial migration, create a custom SQL migration for spatial indexes that Prisma cannot generate:

```bash
mkdir -p prisma/migrations/spatial_indexes
```

Create `prisma/migrations/spatial_indexes/migration.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_checkpoints_location ON checkpoints USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_officer_locations_location ON officer_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
```

Run: `npx prisma migrate dev --name spatial_indexes`

- [ ] **Step 7: Create PostGIS helper module**

Create `src/lib/geo.ts`:

```typescript
import { prisma } from './prisma.js';

/**
 * PostGIS helper functions for geometry operations.
 * Prisma's Unsupported type requires raw SQL for all geometry read/write.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Insert a point geometry using ST_SetSRID(ST_MakePoint(lng, lat), 4326) */
export function makePointSQL(lng: number, lat: number): string {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
}

/** Insert an officer location record with PostGIS point */
export async function insertOfficerLocation(officerId: string, lat: number, lng: number, accuracy?: number) {
  await prisma.$executeRaw`
    INSERT INTO officer_locations (id, officer_id, location, timestamp, accuracy_meters)
    VALUES (gen_random_uuid(), ${officerId}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), NOW(), ${accuracy ?? null})
  `;
}

/** Get latest location for an officer as {lat, lng} */
export async function getOfficerLatestLocation(officerId: string): Promise<LatLng | null> {
  const result = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
    SELECT ST_Y(location) as lat, ST_X(location) as lng
    FROM officer_locations
    WHERE officer_id = ${officerId}
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  return result[0] ?? null;
}

/** Get all on-duty officer locations (for command map) */
export async function getAllActiveOfficerLocations() {
  return prisma.$queryRaw<{ officer_id: string; lat: number; lng: number; timestamp: Date }[]>`
    SELECT DISTINCT ON (ol.officer_id)
      ol.officer_id, ST_Y(ol.location) as lat, ST_X(ol.location) as lng, ol.timestamp
    FROM officer_locations ol
    JOIN officers o ON o.id = ol.officer_id
    WHERE o.status = 'active'
    ORDER BY ol.officer_id, ol.timestamp DESC
  `;
}

/** Calculate distance in meters between a point and an officer's last location */
export async function distanceToOfficer(officerId: string, lat: number, lng: number): Promise<number | null> {
  const result = await prisma.$queryRaw<{ distance: number }[]>`
    SELECT ST_Distance(
      location::geography,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) as distance
    FROM officer_locations
    WHERE officer_id = ${officerId}
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  return result[0]?.distance ?? null;
}

/** Insert a checkpoint with PostGIS point (for seed script) */
export async function insertCheckpointWithLocation(
  id: string, nameAr: string, nameEn: string, zoneId: string,
  type: string, lat: number, lng: number
) {
  await prisma.$executeRaw`
    INSERT INTO checkpoints (id, name_ar, name_en, zone_id, type, status, location, created_at)
    VALUES (${id}, ${nameAr}, ${nameEn}, ${zoneId}, ${type}::"CheckpointType", 'active',
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), NOW())
  `;
}

/** Insert a zone with PostGIS polygon boundary (for seed script) */
export async function insertZoneWithBoundary(
  id: string, nameAr: string, nameEn: string, color: string,
  boundaryCoords: [number, number][]  // [lng, lat] pairs forming a closed polygon
) {
  const coordsStr = boundaryCoords.map(([lng, lat]) => `${lng} ${lat}`).join(',');
  await prisma.$executeRaw`
    INSERT INTO zones (id, name_ar, name_en, color, boundary, created_at)
    VALUES (${id}, ${nameAr}, ${nameEn}, ${color},
            ST_SetSRID(ST_GeomFromText(${'POLYGON((' + coordsStr + '))'}, 4326), 4326), NOW())
  `;
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Prisma schema — full database with PostGIS + spatial indexes + geo helpers"
```

---

## Task 3: Auth System (JWT + RBAC)

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/errors.ts`, `src/plugins/auth.plugin.ts`, `src/plugins/rbac.plugin.ts`, `src/routes/auth.routes.ts`, `src/schemas/auth.schema.ts`, `tests/setup.ts`, `tests/helpers.ts`, `tests/auth.test.ts`

- [ ] **Step 1: Create error classes**

Create `src/lib/errors.ts`:

```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message); }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, message); }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(409, message); }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') { super(429, message); }
}
```

- [ ] **Step 2: Create auth utilities**

Create `src/lib/auth.ts`:

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { redis } from './redis.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export interface TokenPayload {
  officerId: string;
  role: string;
  zoneId: string | null;
  deviceId: string | null;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
}

export async function revokeToken(token: string, expiresInSec: number): Promise<void> {
  await redis.setex(`revoked:${token}`, expiresInSec, '1');
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  return (await redis.exists(`revoked:${token}`)) === 1;
}
```

- [ ] **Step 3: Create auth plugin**

Create `src/plugins/auth.plugin.ts`:

```typescript
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken, isTokenRevoked, TokenPayload } from '../lib/auth.js';
import { UnauthorizedError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes
    const publicPrefixes = ['/health', '/api/v1/auth/login', '/api/v1/auth/refresh'];
    if (publicPrefixes.some(p => request.url.startsWith(p))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError('Missing token');

    const token = authHeader.slice(7);
    if (await isTokenRevoked(token)) throw new UnauthorizedError('Token revoked');

    try {
      request.user = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  });
};

export default fp(authPlugin);
```

- [ ] **Step 4: Create RBAC plugin**

Create `src/plugins/rbac.plugin.ts`:

```typescript
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ForbiddenError } from '../lib/errors.js';
import { Role } from '@prisma/client';

type RoleCheck = Role[] | ((user: FastifyRequest['user']) => boolean);

declare module 'fastify' {
  interface FastifyContextConfig {
    allowedRoles?: RoleCheck;
  }
}

const rbacPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const allowedRoles = request.routeOptions.config?.allowedRoles;
    if (!allowedRoles || !request.user) return;

    if (Array.isArray(allowedRoles)) {
      if (!allowedRoles.includes(request.user.role as Role)) {
        throw new ForbiddenError(`Role '${request.user.role}' not permitted`);
      }
    } else if (!allowedRoles(request.user)) {
      throw new ForbiddenError('Access denied');
    }
  });
};

export default fp(rbacPlugin);
```

- [ ] **Step 5: Create auth schema**

Create `src/schemas/auth.schema.ts`:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  badgeNumber: z.string().min(1),
  pin: z.string().min(4).max(8),
  deviceId: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

- [ ] **Step 6: Create auth routes**

Create `src/routes/auth.routes.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { verifyPin, signAccessToken, signRefreshToken, verifyRefreshToken, revokeToken, isTokenRevoked } from '../lib/auth.js';
import { loginSchema, refreshSchema } from '../schemas/auth.schema.js';
import { UnauthorizedError, TooManyRequestsError } from '../lib/errors.js';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MIN = 15;

const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/auth/login
  app.post('/api/v1/auth/login', { config: {} }, async (request, reply) => {
    const { badgeNumber, pin, deviceId } = loginSchema.parse(request.body);

    const officer = await prisma.officer.findUnique({ where: { badgeNumber } });
    if (!officer) throw new UnauthorizedError('Invalid credentials');

    // Check lockout
    if (officer.lockedUntil && officer.lockedUntil > new Date()) {
      throw new TooManyRequestsError('Account locked. Try again later.');
    }

    // Check device binding (if officer has a bound device and caller provides a different one)
    if (officer.deviceId && deviceId && officer.deviceId !== deviceId) {
      throw new UnauthorizedError('Device not authorized. Contact supervisor.');
    }

    // Verify PIN
    const valid = await verifyPin(pin, officer.pinHash);
    if (!valid) {
      const attempts = officer.failedLoginAttempts + 1;
      const update: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
      if (attempts >= LOCKOUT_THRESHOLD) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MIN * 60 * 1000);
      }
      await prisma.officer.update({ where: { id: officer.id }, data: update });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed attempts, bind device if first login
    await prisma.officer.update({
      where: { id: officer.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(deviceId && !officer.deviceId ? { deviceId } : {}),
      },
    });

    const payload = { officerId: officer.id, role: officer.role, zoneId: officer.zoneId, deviceId: officer.deviceId || deviceId || null };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return { accessToken, refreshToken, officer: { id: officer.id, nameEn: officer.nameEn, nameAr: officer.nameAr, role: officer.role, zoneId: officer.zoneId } };
  });

  // POST /api/v1/auth/refresh
  app.post('/api/v1/auth/refresh', { config: {} }, async (request) => {
    const { refreshToken } = refreshSchema.parse(request.body);

    if (await isTokenRevoked(refreshToken)) throw new UnauthorizedError('Token revoked');

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Revoke old refresh token (rotation)
    await revokeToken(refreshToken, 7 * 24 * 60 * 60);

    const newPayload = { officerId: payload.officerId, role: payload.role, zoneId: payload.zoneId, deviceId: payload.deviceId };
    return {
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    };
  });

  // POST /api/v1/auth/logout
  app.post('/api/v1/auth/logout', async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await revokeToken(authHeader.slice(7), 15 * 60); // Revoke for access token lifetime
    }
    return { success: true };
  });
};

export default authRoutes;
```

- [ ] **Step 7: Register plugins and routes in server.ts**

Update `src/server.ts` to register auth plugin, RBAC plugin, error handler, and auth routes.

- [ ] **Step 8: Write auth tests**

Create `tests/setup.ts` (test DB lifecycle), `tests/helpers.ts` (create test officer, get auth token), and `tests/auth.test.ts` testing:
- Login with valid badge+PIN returns tokens
- Login with wrong PIN increments failed attempts
- Account locks after 5 failed attempts
- Refresh token rotation works
- Revoked token is rejected
- Device binding enforcement

- [ ] **Step 9: Run tests**

```bash
npm test
```

Expected: All auth tests pass.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: auth system — JWT, device binding, lockout, RBAC plugin"
```

---

## Task 4: Zone & Checkpoint Routes

**Files:**
- Create: `src/routes/zones.routes.ts`, `src/schemas/zones.schema.ts`, `tests/zones.test.ts`

- [ ] **Step 1: Write tests for zones endpoints**

Test cases:
- `GET /api/v1/zones` returns all zones with checkpoint counts (as manager)
- `GET /api/v1/zones` returns only assigned zone (as supervisor)
- `GET /api/v1/zones/:id` returns zone detail with checkpoints list
- `GET /api/v1/zones/:id` returns 403 for supervisor accessing different zone
- `GET /api/v1/zones/:id/checkpoints` returns checkpoints with lat/lng
- Unauthenticated request returns 401

- [ ] **Step 2: Create zone schemas and routes**

Endpoints:
- `GET /api/v1/zones` — list zones (supervisor: filtered to their zone)
- `GET /api/v1/zones/:id` — zone detail with checkpoints and stats (officer count, incident count)
- `GET /api/v1/zones/:id/checkpoints` — list checkpoints in zone

RBAC: All authenticated roles can read zones. Supervisor scoped to their zone(s).

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: zone and checkpoint API routes"
```

---

## Task 5: Officer Routes

**Files:**
- Create: `src/routes/officers.routes.ts`, `src/schemas/officers.schema.ts`, `tests/officers.test.ts`

- [ ] **Step 1: Write tests for officer endpoints**

Test cases:
- `GET /api/v1/officers` returns all officers (as manager)
- `GET /api/v1/officers` returns zone-scoped officers (as supervisor)
- `POST /api/v1/officers` creates officer (as hr_admin) — returns created officer
- `POST /api/v1/officers` returns 403 (as officer — insufficient role)
- `PATCH /api/v1/officers/:id` updates officer name and zone
- `POST /api/v1/officers/:id/location` records GPS location (uses geo helper)
- `POST /api/v1/officers/:id/location` returns 403 when officer updates another officer's location
- `PATCH /api/v1/officers/:id/status` changes status to device_offline (as supervisor)
- `GET /api/v1/officers/:id/locations` returns location history with lat/lng

- [ ] **Step 2: Create officer schemas and routes**

Endpoints:
- `GET /api/v1/officers` — list officers (supervisor: zone-scoped, hr_admin: all)
- `GET /api/v1/officers/:id` — officer detail
- `POST /api/v1/officers` — create officer (manager, assistant_manager, hr_admin)
- `PATCH /api/v1/officers/:id` — update officer (manager, assistant_manager, hr_admin)
- `POST /api/v1/officers/:id/location` — GPS location update (officer: self only)
- `PATCH /api/v1/officers/:id/status` — change status (supervisor+)
- `GET /api/v1/officers/:id/locations` — location history (supervisor+)

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: officer API routes — CRUD, location, status"
```

---

## Task 6: Incident Routes

**Files:**
- Create: `src/routes/incidents.routes.ts`, `src/schemas/incidents.schema.ts`, `tests/incidents.test.ts`

- [ ] **Step 1: Write tests for incident endpoints**

Test cases:
- `POST /api/v1/incidents` creates incident with category and auto-sets SLA deadlines
- `POST /api/v1/incidents` SLA deadline math: critical incident = created_at + 5min response, + 60min resolution
- `POST /api/v1/incidents/:id/assign` assigns officer, sets status to assigned, records assigned_at
- `PATCH /api/v1/incidents/:id` transitions open→assigned→in_progress→resolved→closed
- `PATCH /api/v1/incidents/:id` rejects invalid transitions (e.g., open→resolved)
- `POST /api/v1/incidents/:id/cancel` cancels with reason (as supervisor)
- `POST /api/v1/incidents/:id/cancel` returns 403 (as officer)
- `GET /api/v1/incidents` filters by status, zone, priority
- `GET /api/v1/incidents` supervisor sees only their zone's incidents
- `GET /api/v1/incidents/:id` returns full detail with updates and media
- `POST /api/v1/incidents/:id/updates` adds a note update

- [ ] **Step 2: Create incident schemas and routes**

Endpoints:
- `GET /api/v1/incidents` — list incidents (filterable by status, zone, priority, assigned officer)
- `GET /api/v1/incidents/:id` — incident detail with updates and media
- `POST /api/v1/incidents` — create incident (officer, supervisor, operator)
- `PATCH /api/v1/incidents/:id` — update incident (status, priority, awaiting_external)
- `POST /api/v1/incidents/:id/assign` — assign officer (supervisor, operator, manager)
- `POST /api/v1/incidents/:id/updates` — add update (note, status change, escalation)
- `POST /api/v1/incidents/:id/cancel` — cancel with reason (supervisor+)

SLA logic: On create, look up SLA rule by category+priority. Set `sla_response_deadline` and `sla_resolution_deadline` based on current time + SLA minutes.

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: incident API routes — CRUD, assignment, SLA, status transitions"
```

---

## Task 7: Shift Routes

**Files:**
- Create: `src/routes/shifts.routes.ts`, `src/schemas/shifts.schema.ts`, `tests/shifts.test.ts`

- [ ] **Step 1: Write tests for shift endpoints**

Test cases:
- `POST /api/v1/shifts` creates a scheduled shift (as hr_admin)
- `POST /api/v1/shifts` returns 403 (as officer)
- `GET /api/v1/shifts` filters by zone, officer, date range, status
- `POST /api/v1/shifts/:id/check-in` records GPS location and sets status to active
- `POST /api/v1/shifts/:id/check-in` returns 403 when different officer tries to check in
- `POST /api/v1/shifts/:id/check-out` records GPS, handover notes, sets status to completed
- `PATCH /api/v1/shifts/:id/status` sets called_off (as supervisor)
- `PATCH /api/v1/shifts/:id/status` sets no_show (as supervisor)
- `GET /api/v1/shifts` returns no_show shifts for officers who didn't check in

- [ ] **Step 2: Create shift schemas and routes**

Endpoints:
- `GET /api/v1/shifts` — list shifts (filterable by zone, officer, date range, status)
- `GET /api/v1/shifts/:id` — shift detail
- `POST /api/v1/shifts` — create shift (hr_admin, manager)
- `POST /api/v1/shifts/:id/check-in` — officer check-in with GPS (officer: self only)
- `POST /api/v1/shifts/:id/check-out` — officer check-out with GPS + handover notes
- `PATCH /api/v1/shifts/:id/status` — change status (supervisor+: called_off, no_show)

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: shift API routes — scheduling, check-in/out, status"
```

---

## Task 8: Patrol Routes

**Files:**
- Create: `src/routes/patrols.routes.ts`, `src/schemas/patrols.schema.ts`, `tests/patrols.test.ts`

- [ ] **Step 1: Write tests for patrol endpoints**

Test cases:
- `GET /api/v1/patrols/routes` lists patrol routes for a zone (as supervisor)
- `GET /api/v1/patrols/routes/:id` returns route with ordered checkpoints
- `POST /api/v1/patrols/routes` creates a patrol route with checkpoints (as supervisor)
- `POST /api/v1/patrols/logs` starts a patrol log for an active shift (as officer)
- `POST /api/v1/patrols/logs/:id/checkpoints/:checkpointId` confirms checkpoint arrival
- `POST /api/v1/patrols/logs/:id/checkpoints/:checkpointId` skips with reason
- `GET /api/v1/patrols/logs` lists patrol logs for a shift

- [ ] **Step 2: Create patrol schemas and routes**

Endpoints:
- `GET /api/v1/patrols/routes` — list routes (zone-scoped for supervisors)
- `GET /api/v1/patrols/routes/:id` — route detail with ordered checkpoints
- `POST /api/v1/patrols/routes` — create route with checkpoints (supervisor+)
- `POST /api/v1/patrols/logs` — start a patrol (officer, linked to active shift)
- `POST /api/v1/patrols/logs/:id/checkpoints/:checkpointId` — confirm or skip checkpoint
- `GET /api/v1/patrols/logs` — list patrol logs (filterable by shift, officer, date)
- `GET /api/v1/patrols/logs/:id` — patrol log detail with checkpoint confirmations

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: patrol API routes — routes, logs, checkpoint confirmation"
```

---

## Task 9: Seed Data — El Gouna

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create seed script with El Gouna data**

Seed data includes:
- **9 incident categories** with Arabic/English names and default priorities
- **SLA rules** for all 9 categories × 4 priorities (5min response, graduated resolution)
- **6 zones** representing El Gouna areas: Downtown, Marina, Kafr, West Golf, South Golf, Industrial
- **180 checkpoints** distributed across zones (30 per zone, with realistic Arabic/English names)
- **20 sample officers** across roles (1 manager, 2 assistant managers, 3 supervisors, 2 operators, 12 officers) with badge numbers and hashed PINs
- **Sample patrol routes** (2 per zone, 5 checkpoints each)

All officer PINs default to "1234" for testing (hashed via bcrypt).

**Important:** Zones (boundaries) and checkpoints (locations) must be inserted via raw SQL using the geo helper functions (`insertZoneWithBoundary`, `insertCheckpointWithLocation`) because Prisma cannot write `Unsupported` geometry types through the normal client API. Use realistic El Gouna coordinates (around 27.18°N, 33.83°E).

- [ ] **Step 2: Run seed**

```bash
npm run db:seed
```

Expected: All data created. Verify with `npx prisma studio`.

- [ ] **Step 3: Verify API returns seeded data**

```bash
curl http://localhost:3000/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"badgeNumber":"MGR-001","pin":"1234"}'
# Use returned token:
curl http://localhost:3000/api/v1/zones -H "Authorization: Bearer <token>"
curl http://localhost:3000/api/v1/officers -H "Authorization: Bearer <token>"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: El Gouna seed data — zones, checkpoints, officers, categories, SLA rules"
```

---

## Task 10: Enhanced Health Check

**Files:**
- Create: `src/routes/health.routes.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Replace placeholder health check with enhanced version**

```typescript
// GET /health — checks PostgreSQL + Redis connectivity
app.get('/health', async () => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(() => true).catch(() => false);
  return {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    services: { database: dbOk, redis: redisOk },
    timestamp: new Date().toISOString(),
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: enhanced health check with service status"
```

---

## Task 11: Final Verification + Push

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Verify Docker dev environment from scratch**

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Test all endpoints manually with curl.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 4: Verify GitHub repo has all commits**

```bash
git log --oneline
```

Expected: 8-10 commits covering scaffolding, schema, auth, zones, officers, incidents, shifts, seed data, health check.

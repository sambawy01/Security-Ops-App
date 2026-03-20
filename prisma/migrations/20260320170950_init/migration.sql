-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('officer', 'supervisor', 'operator', 'hr_admin', 'secretary', 'assistant_manager', 'manager');

-- CreateEnum
CREATE TYPE "OfficerStatus" AS ENUM ('active', 'device_offline', 'off_duty', 'suspended');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('scheduled', 'active', 'completed', 'no_show', 'called_off');

-- CreateEnum
CREATE TYPE "CheckpointType" AS ENUM ('gate', 'patrol', 'fixed');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ReporterType" AS ENUM ('officer', 'resident', 'whatsapp');

-- CreateEnum
CREATE TYPE "IncidentUpdateType" AS ENUM ('note', 'photo', 'voice_note', 'status_change', 'escalation', 'assignment');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('photo', 'voice_note');

-- CreateEnum
CREATE TYPE "SyncConflictStatus" AS ENUM ('none', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "officers" (
    "id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "badge_number" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT '',
    "role" "Role" NOT NULL DEFAULT 'officer',
    "zone_id" UUID,
    "phone" TEXT NOT NULL DEFAULT '',
    "device_id" TEXT,
    "status" "OfficerStatus" NOT NULL DEFAULT 'off_duty',
    "photo_path" TEXT,
    "pin_hash" TEXT NOT NULL,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "boundary" geometry(Polygon, 4326),
    "supervisor_id" UUID,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "zone_id" UUID NOT NULL,
    "location" geometry(Point, 4326) NOT NULL,
    "type" "CheckpointType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'scheduled',
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "actual_check_in" TIMESTAMP(3),
    "actual_check_out" TIMESTAMP(3),
    "check_in_location" geometry(Point, 4326),
    "check_out_location" geometry(Point, 4326),
    "handover_notes" TEXT,
    "is_overtime" BOOLEAN NOT NULL DEFAULT false,
    "parent_shift_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_routes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "zone_id" UUID NOT NULL,
    "estimated_duration_min" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrol_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_route_checkpoints" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "checkpoint_id" UUID NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "expected_dwell_min" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "patrol_route_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_logs" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrol_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_checkpoints" (
    "id" UUID NOT NULL,
    "patrol_log_id" UUID NOT NULL,
    "checkpoint_id" UUID NOT NULL,
    "arrived_at" TIMESTAMP(3),
    "gps_location" geometry(Point, 4326),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,

    CONSTRAINT "patrol_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_locations" (
    "id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "location" geometry(Point, 4326) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accuracy_meters" DOUBLE PRECISION,

    CONSTRAINT "officer_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "parent_id" UUID,
    "default_priority" "Priority" NOT NULL DEFAULT 'medium',
    "icon" TEXT NOT NULL DEFAULT 'alert-circle',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category_id" UUID,
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "zone_id" UUID,
    "location" geometry(Point, 4326),
    "reporter_type" "ReporterType" NOT NULL DEFAULT 'officer',
    "reporter_phone" TEXT,
    "created_by_officer_id" UUID,
    "assigned_officer_id" UUID,
    "related_incident_id" UUID,
    "awaiting_external" BOOLEAN NOT NULL DEFAULT false,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMP(3),
    "sla_response_deadline" TIMESTAMP(3),
    "sla_resolution_deadline" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "author_id" UUID,
    "type" "IncidentUpdateType" NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_media" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_rules" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "priority" "Priority" NOT NULL,
    "response_minutes" INTEGER NOT NULL,
    "resolution_minutes" INTEGER NOT NULL,
    "escalation_chain" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "type" TEXT NOT NULL,
    "suggestion_text" TEXT NOT NULL,
    "accepted" BOOLEAN,
    "accepted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "direction" TEXT NOT NULL,
    "sender_phone" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "media_url" TEXT,
    "wa_message_id" TEXT,
    "template_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "zone_id" TEXT,
    "content" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "pdf_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "officer_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "server_seq" BIGINT,
    "created_at_device" TIMESTAMP(3) NOT NULL,
    "received_at_server" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "conflict_status" "SyncConflictStatus" NOT NULL DEFAULT 'none',

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "officers_badge_number_key" ON "officers"("badge_number");

-- CreateIndex
CREATE UNIQUE INDEX "zones_supervisor_id_key" ON "zones"("supervisor_id");

-- CreateIndex
CREATE INDEX "shifts_officer_id_scheduled_start_idx" ON "shifts"("officer_id", "scheduled_start");

-- CreateIndex
CREATE INDEX "shifts_zone_id_status_idx" ON "shifts"("zone_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "patrol_route_checkpoints_route_id_sequence_order_key" ON "patrol_route_checkpoints"("route_id", "sequence_order");

-- CreateIndex
CREATE INDEX "officer_locations_officer_id_timestamp_idx" ON "officer_locations"("officer_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "incidents_status_zone_id_priority_idx" ON "incidents"("status", "zone_id", "priority");

-- CreateIndex
CREATE INDEX "incidents_assigned_officer_id_status_idx" ON "incidents"("assigned_officer_id", "status");

-- CreateIndex
CREATE INDEX "incident_updates_incident_id_created_at_idx" ON "incident_updates"("incident_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sla_rules_category_id_priority_key" ON "sla_rules"("category_id", "priority");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_parent_shift_id_fkey" FOREIGN KEY ("parent_shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_routes" ADD CONSTRAINT "patrol_routes_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_route_checkpoints" ADD CONSTRAINT "patrol_route_checkpoints_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "patrol_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_route_checkpoints" ADD CONSTRAINT "patrol_route_checkpoints_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_logs" ADD CONSTRAINT "patrol_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_logs" ADD CONSTRAINT "patrol_logs_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "patrol_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_logs" ADD CONSTRAINT "patrol_logs_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_checkpoints" ADD CONSTRAINT "patrol_checkpoints_patrol_log_id_fkey" FOREIGN KEY ("patrol_log_id") REFERENCES "patrol_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_checkpoints" ADD CONSTRAINT "patrol_checkpoints_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_locations" ADD CONSTRAINT "officer_locations_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "officers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_officer_id_fkey" FOREIGN KEY ("created_by_officer_id") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_officer_id_fkey" FOREIGN KEY ("assigned_officer_id") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_related_incident_id_fkey" FOREIGN KEY ("related_incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_media" ADD CONSTRAINT "incident_media_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_rules" ADD CONSTRAINT "sla_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "officers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

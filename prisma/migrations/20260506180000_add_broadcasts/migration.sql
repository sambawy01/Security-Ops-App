-- CreateEnum
CREATE TYPE "BroadcastPriority" AS ENUM ('emergency', 'urgent', 'normal', 'info');

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "BroadcastPriority" NOT NULL DEFAULT 'normal',
    "audience" TEXT NOT NULL DEFAULT 'all',
    "zone_id" UUID,
    "sender_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcasts_created_at_idx" ON "broadcasts"("created_at" DESC);

-- CreateTable
CREATE TABLE "broadcast_acks" (
    "id" UUID NOT NULL,
    "broadcast_id" UUID NOT NULL,
    "officer_id" UUID NOT NULL,
    "acked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "broadcast_acks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_acks_broadcast_id_officer_id_key" ON "broadcast_acks"("broadcast_id", "officer_id");

-- CreateIndex
CREATE INDEX "broadcast_acks_officer_id_acked_at_idx" ON "broadcast_acks"("officer_id", "acked_at" DESC);

-- AddForeignKey
ALTER TABLE "broadcast_acks" ADD CONSTRAINT "broadcast_acks_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

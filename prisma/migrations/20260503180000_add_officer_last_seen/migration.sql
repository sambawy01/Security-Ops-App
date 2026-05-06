-- AlterTable
ALTER TABLE "officers" ADD COLUMN "last_seen_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "officers_last_seen_at_idx" ON "officers" ("last_seen_at" DESC);

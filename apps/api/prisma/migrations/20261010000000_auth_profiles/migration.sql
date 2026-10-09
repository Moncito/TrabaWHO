-- Real auth + worker profiles.
-- Existing rows (the old seeded demo people) get an unusable login: a placeholder
-- email on the reserved .invalid TLD and a password hash bcrypt can never match.
-- They also lose the "verified" flag, which was never backed by a real ID check.

ALTER TABLE "User"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "bio" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "yearsExperience" INTEGER NOT NULL DEFAULT 0;

UPDATE "User"
SET "email" = 'legacy-' || "id" || '@trabawho.invalid',
    "passwordHash" = '!',
    "isVerified" = false
WHERE "email" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

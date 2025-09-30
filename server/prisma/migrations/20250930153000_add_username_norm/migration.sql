-- Add usernameNorm column matching Prisma schema (nullable unique)
ALTER TABLE "User" ADD COLUMN "usernameNorm" TEXT;
-- Create unique index if it doesn't already exist
CREATE UNIQUE INDEX IF NOT EXISTS "User_usernameNorm_key" ON "User"("usernameNorm");

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'STUDENT', 'STAFF', 'LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PermissionKey" AS ENUM (
    'ADMIN_ACCESS',
    'DASHBOARD_VIEW',
    'SCHOOLS_MANAGE',
    'MINISTRIES_MANAGE',
    'OPPORTUNITIES_MANAGE',
    'PUBLIC_CONTENT_MANAGE',
    'STAFF_READ',
    'STAFF_MANAGE',
    'STAFF_APPLICATIONS_READ',
    'STAFF_APPLICATIONS_REVIEW',
    'STAFF_ONBOARDING_MANAGE'
);

-- CreateEnum
CREATE TYPE "AccessScopeType" AS ENUM ('GLOBAL', 'BASE', 'MINISTRY', 'SCHOOL', 'TEAM');

-- AlterTable
ALTER TABLE "UserProfile"
ADD COLUMN "platformRole" "PlatformRole";

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "scopeType" "AccessScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeKey" TEXT NOT NULL DEFAULT 'global',
    "scopeLabel" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "PermissionKey" NOT NULL,
    "scopeType" "AccessScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeKey" TEXT NOT NULL DEFAULT 'global',
    "scopeLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_scopeType_scopeKey_key"
ON "UserRoleAssignment"("userId", "role", "scopeType", "scopeKey");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_isActive_idx"
ON "UserRoleAssignment"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_scopeType_scopeKey_idx"
ON "UserRoleAssignment"("scopeType", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionGrant_userId_permission_scopeType_scopeKey_key"
ON "UserPermissionGrant"("userId", "permission", "scopeType", "scopeKey");

-- CreateIndex
CREATE INDEX "UserPermissionGrant_userId_isActive_idx"
ON "UserPermissionGrant"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserPermissionGrant_scopeType_scopeKey_idx"
ON "UserPermissionGrant"("scopeType", "scopeKey");

-- AddForeignKey
ALTER TABLE "UserRoleAssignment"
ADD CONSTRAINT "UserRoleAssignment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGrant"
ADD CONSTRAINT "UserPermissionGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill primary product role from the legacy role field.
UPDATE "UserProfile"
SET "platformRole" = CASE
    WHEN "role" = 'ADMIN' THEN 'ADMIN'::"PlatformRole"
    WHEN "role" = 'STAFF' THEN 'STAFF'::"PlatformRole"
    WHEN "role" = 'STUDENT' THEN 'STUDENT'::"PlatformRole"
    ELSE 'USER'::"PlatformRole"
END
WHERE "platformRole" IS NULL;

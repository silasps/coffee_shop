-- CreateEnum
CREATE TYPE "CoffeeBillingInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "coffee_client_accounts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "ownerName" TEXT,
    "billingEmail" TEXT,
    "phone" TEXT,
    "monthlyFee" DECIMAL(10,2) NOT NULL DEFAULT 150,
    "billingDayOfMonth" INTEGER NOT NULL DEFAULT 10,
    "graceDays" INTEGER NOT NULL DEFAULT 4,
    "suspensionDays" INTEGER NOT NULL DEFAULT 12,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coffee_client_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coffee_billing_invoices" (
    "id" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "referenceMonth" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "finalNoticeSentAt" TIMESTAMP(3),
    "status" "CoffeeBillingInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coffee_billing_invoices_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "coffee_shop_stores"
ADD COLUMN "clientAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "coffee_client_accounts_slug_key"
ON "coffee_client_accounts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "coffee_billing_invoices_clientAccountId_referenceMonth_key"
ON "coffee_billing_invoices"("clientAccountId", "referenceMonth");

-- CreateIndex
CREATE INDEX "coffee_billing_invoices_clientAccountId_status_dueAt_idx"
ON "coffee_billing_invoices"("clientAccountId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "coffee_shop_stores_clientAccountId_isActive_idx"
ON "coffee_shop_stores"("clientAccountId", "isActive");

-- AddForeignKey
ALTER TABLE "coffee_shop_stores"
ADD CONSTRAINT "coffee_shop_stores_clientAccountId_fkey"
FOREIGN KEY ("clientAccountId") REFERENCES "coffee_client_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coffee_billing_invoices"
ADD CONSTRAINT "coffee_billing_invoices_clientAccountId_fkey"
FOREIGN KEY ("clientAccountId") REFERENCES "coffee_client_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill a default platform account so existing stores continue working.
INSERT INTO "coffee_client_accounts" (
    "id",
    "slug",
    "name",
    "legalName",
    "ownerName",
    "billingEmail",
    "monthlyFee",
    "billingDayOfMonth",
    "graceDays",
    "suspensionDays",
    "notes",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    'platform-default-client-account',
    'conta-principal',
    'Conta principal',
    'Conta principal da plataforma',
    'Equipe AT',
    'financeiro@cafeteria-at.local',
    150,
    10,
    4,
    12,
    'Conta criada automaticamente para sustentar a gestao multi-cafeteria.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "coffee_shop_stores"
SET "clientAccountId" = (
    SELECT "id"
    FROM "coffee_client_accounts"
    WHERE "slug" = 'conta-principal'
    LIMIT 1
)
WHERE "clientAccountId" IS NULL;

-- Create a current-month invoice for every existing client account.
INSERT INTO "coffee_billing_invoices" (
    "id",
    "clientAccountId",
    "referenceMonth",
    "amount",
    "dueAt",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('bootstrap-invoice-', cca."id", '-', TO_CHAR(DATE_TRUNC('month', CURRENT_TIMESTAMP), 'YYYYMM')),
    cca."id",
    DATE_TRUNC('month', CURRENT_TIMESTAMP),
    cca."monthlyFee",
    DATE_TRUNC('month', CURRENT_TIMESTAMP)
      + (
          LEAST(
            GREATEST(cca."billingDayOfMonth", 1),
            EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month - 1 day'))::INTEGER
          ) - 1
        ) * INTERVAL '1 day',
    'OPEN'::"CoffeeBillingInvoiceStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "coffee_client_accounts" cca
ON CONFLICT ("clientAccountId", "referenceMonth") DO NOTHING;

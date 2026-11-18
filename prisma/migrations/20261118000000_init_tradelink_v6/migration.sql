-- ============================================================================
-- TRADELINK V6.0 — MIGRATION SQL INITIALE NON DESTRUCTIVE (POSTGRESQL)
-- Conforme au Chapitre 8 & PROMPT 4 :
-- - Aucune instruction DROP TABLE ou TRUNCATE (migration non destructive)
-- - Tous les montants financiers et taux utilisent NUMERIC(18, 4) / NUMERIC(8, 4)
-- - Clés étrangères, contraintes uniques, suppressions logiques (deletedAt) et index
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "themePreference" TEXT NOT NULL DEFAULT 'system',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspensionReason" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecretEncrypted" TEXT,
    "activeSessionId" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_email_deletedAt_idx" ON "User"("email", "deletedAt");
CREATE INDEX IF NOT EXISTS "User_isActive_isSuspended_idx" ON "User"("isActive", "isSuspended");

-- 2. Role & 3. Permission & 4. UserRole & 5. RolePermission
CREATE TABLE IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Role_code_key" ON "Role"("code");

CREATE TABLE IF NOT EXISTS "Permission" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Permission_code_key" ON "Permission"("code");
CREATE INDEX IF NOT EXISTS "Permission_domain_idx" ON "Permission"("domain");

CREATE TABLE IF NOT EXISTS "UserRole" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");
CREATE INDEX IF NOT EXISTS "UserRole_roleId_idx" ON "UserRole"("roleId");

CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- 6. Device & 7. Session
CREATE TABLE IF NOT EXISTS "Device" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Device_userId_fingerprint_key" ON "Device"("userId", "fingerprint");

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_isRevoked_idx" ON "Session"("userId", "isRevoked");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- 8. EncryptionKey & 9. KYC & 10. KYCDocument
CREATE TABLE IF NOT EXISTS "EncryptionKey" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "keyAlias" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "kmsProvider" TEXT NOT NULL DEFAULT 'HASHICORP_VAULT_KMS',
    "kmsKeyArn" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRotationAt" TIMESTAMP(3) NOT NULL,
    "rotatedById" TEXT,
    CONSTRAINT "EncryptionKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EncryptionKey_keyAlias_key" ON "EncryptionKey"("keyAlias");
CREATE INDEX IF NOT EXISTS "EncryptionKey_status_keyType_idx" ON "EncryptionKey"("status", "keyType");

CREATE TABLE IF NOT EXISTS "KYC" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'MA',
    "status" TEXT NOT NULL DEFAULT 'PENDING_SUBMISSION',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "remindersSent" TEXT[],
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KYC_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "KYC_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "KYC_userId_key" ON "KYC"("userId");
CREATE INDEX IF NOT EXISTS "KYC_status_deadlineAt_idx" ON "KYC"("status", "deadlineAt");
CREATE INDEX IF NOT EXISTS "KYC_jurisdiction_actorType_idx" ON "KYC"("jurisdiction", "actorType");

CREATE TABLE IF NOT EXISTS "KYCDocument" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "kycId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3ObjectKey" TEXT NOT NULL,
    "encryptionKeyId" TEXT NOT NULL,
    "sha256Checksum" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "rejectionComment" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "KYCDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "KYCDocument_kycId_fkey" FOREIGN KEY ("kycId") REFERENCES "KYC"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KYCDocument_encryptionKeyId_fkey" FOREIGN KEY ("encryptionKeyId") REFERENCES "EncryptionKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "KYCDocument_kycId_docType_idx" ON "KYCDocument"("kycId", "docType");

-- 11. Client, Supplier, Carrier, Product, Order, Invoice, Payment, CalculationRule, CalculationPeriod, AuditLog, WorkflowTransitionLog, DualApprovalRequest
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "taxId" TEXT,
    "billingAddress" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "creditLimit" NUMERIC(18, 4) NOT NULL DEFAULT 50000.0000,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Client_userId_key" ON "Client"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_companyCode_key" ON "Client"("companyCode");
CREATE INDEX IF NOT EXISTS "Client_companyCode_deletedAt_idx" ON "Client"("companyCode", "deletedAt");

CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "taxId" TEXT,
    "warehouseAddr" TEXT NOT NULL,
    "rating" NUMERIC(4, 2) NOT NULL DEFAULT 5.00,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_userId_key" ON "Supplier"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_supplierCode_key" ON "Supplier"("supplierCode");
CREATE INDEX IF NOT EXISTS "Supplier_supplierCode_deletedAt_idx" ON "Supplier"("supplierCode", "deletedAt");

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "supplierId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitPrice" NUMERIC(18, 4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "taxRate" NUMERIC(6, 4) NOT NULL DEFAULT 20.0000,
    "unit" TEXT NOT NULL DEFAULT 'PALLET',
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "stockReserved" INTEGER NOT NULL DEFAULT 0,
    "minStockAlert" INTEGER NOT NULL DEFAULT 10,
    "icon3d" TEXT NOT NULL DEFAULT 'pallet-load',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE INDEX IF NOT EXISTS "Product_supplierId_isPublished_deletedAt_idx" ON "Product"("supplierId", "isPublished", "deletedAt");
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");

CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orderNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotalAmount" NUMERIC(18, 4) NOT NULL,
    "taxAmount" NUMERIC(18, 4) NOT NULL,
    "shippingAmount" NUMERIC(18, 4) NOT NULL,
    "totalAmount" NUMERIC(18, 4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "shippingAddress" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Order_clientId_status_deletedAt_idx" ON "Order"("clientId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_result_idx" ON "AuditLog"("action", "result");
CREATE INDEX IF NOT EXISTS "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

CREATE TABLE IF NOT EXISTS "WorkflowTransitionLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "nextState" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT,
    "correlationId" TEXT NOT NULL,
    "transitionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowTransitionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkflowTransitionLog_entityType_entityId_transitionAt_idx" ON "WorkflowTransitionLog"("entityType", "entityId", "transitionAt");

CREATE TABLE IF NOT EXISTS "DualApprovalRequest" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "operationType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "immutablePlanHash" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "secondApproverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SECOND_ADMIN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "DualApprovalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DualApprovalRequest_operationType_status_idx" ON "DualApprovalRequest"("operationType", "status");

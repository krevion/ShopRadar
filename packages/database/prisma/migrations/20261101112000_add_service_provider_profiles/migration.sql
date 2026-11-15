CREATE TYPE "SellerType" AS ENUM ('SHOP', 'SERVICE_PROVIDER');

ALTER TABLE "SellerProfile"
ADD COLUMN "providerType" "SellerType" NOT NULL DEFAULT 'SHOP',
ADD COLUMN "serviceCategory" TEXT,
ADD COLUMN "serviceArea" TEXT,
ADD COLUMN "contactPhone" TEXT;

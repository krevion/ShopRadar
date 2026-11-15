ALTER TABLE "SellerProfile"
ADD COLUMN "hasComplimentaryAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "complimentaryAccessGrantedAt" TIMESTAMP(3);

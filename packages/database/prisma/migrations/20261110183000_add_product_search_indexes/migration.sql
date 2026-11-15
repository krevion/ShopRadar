CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_category_trgm_idx" ON "Product" USING GIN ("category" gin_trgm_ops);
CREATE INDEX "Product_description_trgm_idx" ON "Product" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "Shop_name_trgm_idx" ON "Shop" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Shop_city_trgm_idx" ON "Shop" USING GIN ("city" gin_trgm_ops);
CREATE INDEX "Shop_description_trgm_idx" ON "Shop" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "SellerProfile_shopName_trgm_idx" ON "SellerProfile" USING GIN ("shopName" gin_trgm_ops);
CREATE INDEX "SellerProfile_serviceCategory_trgm_idx" ON "SellerProfile" USING GIN ("serviceCategory" gin_trgm_ops);
CREATE INDEX "SellerProfile_serviceArea_trgm_idx" ON "SellerProfile" USING GIN ("serviceArea" gin_trgm_ops);

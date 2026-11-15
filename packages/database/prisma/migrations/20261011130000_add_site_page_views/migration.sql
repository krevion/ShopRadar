CREATE TABLE "SitePageView" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SitePageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SitePageView_createdAt_idx" ON "SitePageView"("createdAt");

CREATE INDEX "SitePageView_path_createdAt_idx" ON "SitePageView"("path", "createdAt");

import { SiteShell } from '@/components/site-shell';
import { SellerLocationDirectory } from '@/components/seller-location-directory';

export default function ShopsPage() {
  return (
    <SiteShell title="Local shops" subtitle="Browse seller storefronts, compare how close they are, and see their saved locations on the map.">
      <SellerLocationDirectory />
    </SiteShell>
  );
}

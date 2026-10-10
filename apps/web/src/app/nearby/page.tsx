import { SiteShell } from '@/components/site-shell';
import { SellerLocationDirectory } from '@/components/seller-location-directory';

export default function NearbyPage() {
  return (
    <SiteShell title="Shops nearby" subtitle="Explore sellers on the map, see what is closest to you, and open a shop to view its location.">
      <SellerLocationDirectory />
    </SiteShell>
  );
}

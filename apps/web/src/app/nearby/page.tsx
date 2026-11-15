import { SiteShell } from '@/components/site-shell';
import { SellerLocationDirectory } from '@/components/seller-location-directory';

export default function NearbyPage() {
  return (
    <SiteShell title="Local shops and services" subtitle="Explore nearby shops and individual service providers, then open a profile to learn more.">
      <SellerLocationDirectory />
    </SiteShell>
  );
}

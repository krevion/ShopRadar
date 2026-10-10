import { SiteShell } from '@/components/site-shell';
import { SubscriptionPlanList } from '@/components/subscription-plan-list';

export default function SellerSubscriptionPage() {
  return (
    <SiteShell title="Seller plan" subtitle="Start with a one-month free trial, then KSh 1,000 for 30 days of the full ShopRadar seller experience. Shop approval is reviewed separately.">
      <SubscriptionPlanList />
    </SiteShell>
  );
}

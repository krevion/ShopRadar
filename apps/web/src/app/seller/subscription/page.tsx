import { SiteShell } from '@/components/site-shell';
import { SubscriptionPlanList } from '@/components/subscription-plan-list';

export default function SellerSubscriptionPage() {
  return (
    <SiteShell title="Seller plan" subtitle="Shops and individual service providers start with a one-month free trial, then pay KSh 1,000 for each 30-day subscription period. Profile approval is reviewed separately.">
      <SubscriptionPlanList />
    </SiteShell>
  );
}

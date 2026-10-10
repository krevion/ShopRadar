import { SiteShell } from '@/components/site-shell';
import { SubscriptionPlanList } from '@/components/subscription-plan-list';

export default function AdminSubscriptionsPage() {
  return (
    <SiteShell title="Seller plans" subtitle="View the plan currently served by the subscription API.">
      <SubscriptionPlanList />
    </SiteShell>
  );
}

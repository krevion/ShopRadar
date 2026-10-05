import { SiteShell } from '@/components/site-shell';
import { subscriptionPlans } from '@/lib/mock-data';

export default function AdminSubscriptionsPage() {
  return (
    <SiteShell title="Subscriptions" subtitle="Manage plans, upsells, and seller growth tiers.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {subscriptionPlans.map((plan) => (
          <div key={plan.name} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{plan.name}</div>
            <div style={{ marginTop: '0.5rem', color: 'var(--color-orange)', fontWeight: 700 }}>{plan.price}</div>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.2rem', color: '#475569' }}>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

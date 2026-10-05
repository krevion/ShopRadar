import { SiteShell } from '@/components/site-shell';
import { subscriptionPlans } from '@/lib/mock-data';

export default function SellerSubscriptionPage() {
  return (
    <SiteShell
      title="Subscription"
      subtitle="New sellers get a free first month. After that, all seller plans are KSh 1,000 per month."
      action={<button style={{ background: 'var(--color-navy)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}>Verify seller status</button>}
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem 1.2rem', color: '#334155' }}>
          All new sellers must complete national ID verification, business verification, and profile checks before activation. This reduces scam activity and helps maintain marketplace trust.
        </div>

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
      </div>
    </SiteShell>
  );
}

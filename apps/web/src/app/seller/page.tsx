import { SiteShell } from '@/components/site-shell';

export default function SellerPage() {
  return (
    <SiteShell
      title="Seller hub"
      subtitle="Manage listings, subscriptions, and customer engagement from one dashboard."
      action={
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/seller/register" style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 700, display: 'inline-block' }}>Register business</a>
          <a href="/seller/videos" style={{ background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 700, display: 'inline-block' }}>Create short video</a>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16, padding: '1rem 1.2rem', color: '#9a4d00', fontWeight: 700 }}>
          Free first month for new sellers. After that, the subscription is KSh 1,000 per month.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Listings', value: '128' },
            { label: 'Sales', value: 'KSh 52,000' },
            { label: 'Views', value: '4,600' },
            { label: 'Orders', value: '19' }
          ].map((item) => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.label}</div>
              <div style={{ marginTop: '0.45rem', fontSize: '1.5rem', fontWeight: 800 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

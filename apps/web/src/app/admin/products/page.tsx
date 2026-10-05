import { SiteShell } from '@/components/site-shell';

export default function AdminProductsPage() {
  return (
    <SiteShell title="Product approvals" subtitle="Review, approve, and flag listings before they go live.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {[
          { name: 'Mango bundles', status: 'Approved' },
          { name: 'LED desk lamp', status: 'Pending' },
          { name: 'Organic cereal', status: 'Needs review' }
        ].map((item) => (
          <div key={item.name} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>Seller listing</div>
            </div>
            <span style={{ background: '#ecfdf5', color: '#166534', borderRadius: 999, padding: '0.4rem 0.8rem', fontWeight: 700 }}>{item.status}</span>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

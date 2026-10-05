import { SiteShell } from '@/components/site-shell';

export default function AdminSellersPage() {
  return (
    <SiteShell title="Sellers" subtitle="Track seller quality and marketplace trust signals across the network.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem 1.2rem', color: '#334155' }}>
          Verification policy: national ID, business profile, phone confirmation, and risk review are required before activation.
        </div>

        {[
          { name: 'Patricia Wanjiku', business: 'Fresh Harvest', score: '4.9', status: 'Verified' },
          { name: 'Owen Kariuki', business: 'Smart Home Kenya', score: '4.7', status: 'Under review' },
          { name: 'Miriam Achieng', business: 'Mia Essentials', score: '4.5', status: 'Verified' }
        ].map((seller) => (
          <div key={seller.name} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{seller.name}</div>
              <div style={{ color: '#64748b', marginTop: '0.25rem' }}>{seller.business}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: seller.status === 'Verified' ? 'var(--color-success)' : '#b45309', fontWeight: 700 }}>{seller.status}</span>
              <span style={{ color: 'var(--color-orange)', fontWeight: 700 }}>⭐ {seller.score}</span>
            </div>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

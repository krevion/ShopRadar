import { SiteShell } from '@/components/site-shell';

export default function AdminDashboardPage() {
  return (
    <SiteShell title="Dashboard" subtitle="Operational overview and performance signals for ShopRadar.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'This week', value: 'KSh 2.3M' },
          { label: 'Conversion rate', value: '12.8%' },
          { label: 'Active sellers', value: '184' },
          { label: 'Returns', value: '2.4%' }
        ].map((item) => (
          <div key={item.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ color: '#64748b' }}>{item.label}</div>
            <div style={{ marginTop: '0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

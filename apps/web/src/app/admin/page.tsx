import { SiteShell } from '@/components/site-shell';
import { adminMetrics } from '@/lib/mock-data';

export default function AdminPage() {
  return (
    <SiteShell
      title="Admin overview"
      subtitle="Operations and platform health for the ShopRadar marketplace."
      action={<button style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 700 }}>New campaign</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {adminMetrics.map((metric) => (
          <div key={metric.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{metric.label}</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.5rem', fontWeight: 800 }}>{metric.value}</div>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

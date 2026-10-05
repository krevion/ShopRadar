import { SiteShell } from '@/components/site-shell';

export default function AdminReportsPage() {
  return (
    <SiteShell title="Reports" subtitle="Marketplace activity, seller performance, and revenue insights.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {[
          { title: 'Sales overview', value: 'KSh 128,400' },
          { title: 'Buyers acquired', value: '1,240' },
          { title: 'Conversion rate', value: '12.8%' }
        ].map((item) => (
          <div key={item.title} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ color: '#64748b' }}>{item.title}</div>
            <div style={{ marginTop: '0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

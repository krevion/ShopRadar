import { SiteShell } from '@/components/site-shell';

export default function AdminPaymentsPage() {
  return (
    <SiteShell title="Payments" subtitle="Track M-Pesa transactions and settlement health.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {[
          { label: 'Total collected', value: 'KSh 2.1M' },
          { label: 'Settlements', value: '86%' },
          { label: 'Failed payouts', value: '3' }
        ].map((item) => (
          <div key={item.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ color: '#64748b' }}>{item.label}</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.5rem', fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

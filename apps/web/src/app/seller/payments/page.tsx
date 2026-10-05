import { SiteShell } from '@/components/site-shell';

export default function SellerPaymentsPage() {
  return (
    <SiteShell title="Payments" subtitle="Track payout status and customer payments made through M-Pesa.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {[
          { label: 'Available balance', value: 'KSh 18,420' },
          { label: 'Pending payout', value: 'KSh 3,150' },
          { label: 'Next settlement', value: 'Tomorrow' }
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

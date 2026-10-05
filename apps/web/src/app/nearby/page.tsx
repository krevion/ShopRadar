import { SiteShell } from '@/components/site-shell';

export default function NearbyPage() {
  return (
    <SiteShell
      title="Nearby"
      subtitle="Find the fastest routes to nearby shops and the freshest offers in your area."
      action={<button style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.8rem 1.1rem', fontWeight: 700 }}>Show map</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#fff', border: '1px dashed var(--color-border)', borderRadius: 16, padding: '1.2rem', color: '#64748b' }}>
          Nearby listings will appear here once local shops are added.
        </div>
      </div>
    </SiteShell>
  );
}

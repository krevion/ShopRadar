import { SiteShell } from '@/components/site-shell';
import { searchResults } from '@/lib/mock-data';

export default function SearchPage() {
  return (
    <SiteShell
      title="Search"
      subtitle="Look for products, shops, and sellers using one simple discovery flow."
      action={<input placeholder="Search for products or shops" style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '0.8rem 1rem', minWidth: 250 }} />}
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        {searchResults.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed var(--color-border)', borderRadius: 16, padding: '1.2rem', color: '#64748b' }}>
            Search results will appear here once inventory is live.
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}

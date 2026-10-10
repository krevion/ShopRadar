import { SiteShell } from '@/components/site-shell';

export default function AdminProductsPage() {
  return (
    <SiteShell title="Product listings" subtitle="Products from verified, approved shops are published automatically.">
      <section style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', color: '#475569', lineHeight: 1.6 }}>
        ShopRadar does not have a separate product approval queue. Approve or reject a seller from the <a href="/admin/sellers" style={{ color: '#9a4d00', fontWeight: 800 }}>seller review page</a>; products from unapproved shops stay hidden from shoppers.
      </section>
    </SiteShell>
  );
}

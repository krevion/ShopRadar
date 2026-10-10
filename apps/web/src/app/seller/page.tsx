import { SiteShell } from '@/components/site-shell';

const sellerLinks = [
  { title: 'Register your business', detail: 'Create a seller profile and submit your shop location for review.', href: '/seller/register', action: 'Seller registration' },
  { title: 'Manage your shop', detail: 'Update your shop location and business information.', href: '/seller/shop', action: 'Shop settings' },
  { title: 'Manage products', detail: 'Add, update, and remove products from your shop.', href: '/seller/products', action: 'Product listings' },
  { title: 'Seller dashboard', detail: 'Review video engagement and shopper messages.', href: '/seller/dashboard', action: 'Open dashboard' },
  { title: 'Subscription', detail: 'Start with a one-month free trial, then continue the full ShopRadar seller experience for KSh 1,000 per month.', href: '/seller/subscription', action: 'Plan details' }
];

export default function SellerPage() {
  return (
    <SiteShell title="Seller hub" subtitle="Manage your business presence and customer discovery on ShopRadar.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        {sellerLinks.map((item) => (
          <a key={item.href} href={item.href} style={{ display: 'grid', alignContent: 'space-between', minHeight: 150, gap: '1rem', padding: '1.1rem', border: '1px solid var(--color-border)', borderRadius: 18, background: '#fff', color: 'inherit', textDecoration: 'none' }}>
            <div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>{item.title}</h2><p style={{ margin: '0.55rem 0 0', color: '#64748b', lineHeight: 1.5 }}>{item.detail}</p></div>
            <strong style={{ color: 'var(--color-orange)' }}>{item.action} ?</strong>
          </a>
        ))}
      </div>
    </SiteShell>
  );
}

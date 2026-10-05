import { SiteShell } from '@/components/site-shell';

const stores = [
  {
    name: 'Fresh Harvest',
    city: 'Nairobi',
    distance: '2.4 km',
    rating: '4.8',
    specialty: 'Groceries & produce',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Smart Home Kenya',
    city: 'Nairobi',
    distance: '6.1 km',
    rating: '4.7',
    specialty: 'Home & electronics',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Mia Essentials',
    city: 'Nairobi',
    distance: '3.2 km',
    rating: '4.9',
    specialty: 'Beauty & daily needs',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'
  }
];

const shopHighlights = [
  { label: 'Open today', value: '8:00 AM - 9:00 PM' },
  { label: 'Delivery', value: 'Within 30 min' },
  { label: 'Verified', value: 'Trusted seller' }
];

export default function ShopsPage() {
  return (
    <SiteShell
      title="Local shops"
      subtitle="Browse neighbourhood stores and discover the best deals around you."
      action={
        <button
          style={{
            background: 'var(--color-navy)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '0.8rem 1.2rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Filter shops
        </button>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {shopHighlights.map((item) => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
              <div style={{ color: '#64748b' }}>{item.label}</div>
              <div style={{ marginTop: '0.45rem', fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {stores.map((shop) => (
            <div key={shop.name} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1rem', display: 'grid', gap: '0.8rem' }}>
              <img
                src={shop.image}
                alt={shop.name}
                style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, display: 'block' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{shop.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{shop.city}</div>
                </div>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {shop.rating}</span>
              </div>
              <div style={{ color: '#475569' }}>{shop.specialty}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
                <span>{shop.distance}</span>
                <span style={{ background: '#ecfdf5', color: '#166534', borderRadius: 999, padding: '0.3rem 0.7rem', fontWeight: 700 }}>Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

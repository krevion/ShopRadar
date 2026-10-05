import { SiteShell } from '@/components/site-shell';
import { categories } from '@/lib/mock-data';

const catalog = [
  {
    name: 'Fresh mangoes',
    category: 'Groceries',
    price: 'KSh 180',
    shop: 'Fresh Harvest',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Smart LED bulb',
    category: 'Home',
    price: 'KSh 860',
    shop: 'Smart Home Kenya',
    rating: '4.6',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Organic rice',
    category: 'Groceries',
    price: 'KSh 520',
    shop: 'Fresh Harvest',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Bluetooth speaker',
    category: 'Electronics',
    price: 'KSh 4,300',
    shop: 'Mia Essentials',
    rating: '4.7',
    image: 'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80'
  }
];

export default function ProductsPage() {
  return (
    <SiteShell
      title="Products"
      subtitle="Compare prices across local shops and discover what is trending near you."
      action={<button style={{ background: '#e2e8f0', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}>Filter</button>}
    >
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {categories.map((category) => (
            <span
              key={category}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--color-border)',
                borderRadius: 999,
                padding: '0.5rem 0.9rem',
                fontWeight: 600,
                color: '#334155'
              }}
            >
              {category}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {catalog.map((product) => (
            <div key={product.name} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <img
                src={product.image}
                alt={product.name}
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 14, display: 'block' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{product.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{product.shop}</div>
                </div>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {product.rating}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#334155', fontWeight: 700 }}>{product.category}</span>
                <strong style={{ color: 'var(--color-orange)' }}>{product.price}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

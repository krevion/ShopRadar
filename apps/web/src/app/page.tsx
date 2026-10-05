import { SiteShell } from '@/components/site-shell';

const quickLinks = ['Electronics', 'Fashion', 'Home', 'Health', 'Beauty'];

const productCards = [
  {
    name: 'Nike Air Force 1',
    price: 'KSh 6,500',
    badge: 'Popular',
    tint: '#e7ebf5',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'SkyBuds Pro',
    price: 'KSh 15,000',
    badge: 'Top pick',
    tint: '#f7e9d3',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Urban Carry',
    price: 'KSh 8,200',
    badge: 'New',
    tint: '#dfe7ef',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Elite laptop',
    price: 'KSh 39,000',
    badge: 'Hot deal',
    tint: '#e9f0ea',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80'
  }
];

const dashboardRows = [
  { label: 'Apple Watch', amount: 'KSh 18,500', status: 'Paid', tone: 'green' },
  { label: 'Smart speaker', amount: 'KSh 12,200', status: 'Pending', tone: 'amber' },
  { label: 'Wireless mouse', amount: 'KSh 3,400', status: 'Completed', tone: 'blue' }
];

export default function HomePage() {
  return (
    <SiteShell
      title="Find it. Compare it. Get it."
      subtitle="Discover trusted products, nearby shops, and better prices in one place."
      action={
        <button className="shopradar-cta-button">Search products</button>
      }
    >
      <div className="shopradar-home-layout">
        <section className="shopradar-hero-panel">
          <div className="shopradar-hero-copy">
            <div className="shopradar-search-bar">
              <span>What are you looking for?</span>
              <div className="shopradar-search-meta">
                <span>Nairobi, Kenya</span>
                <button>Search</button>
              </div>
            </div>

            <div className="shopradar-pill-row">
              {quickLinks.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="shopradar-hero-visual">
            <div className="phone-card">
              <div className="phone-header">
                <span className="dot red" />
                <span className="dot amber" />
                <span className="dot green" />
              </div>
              <div className="phone-body">
                <div className="mini-product" />
              </div>
            </div>
          </div>
        </section>

        <section className="shopradar-product-section">
          <div className="shopradar-section-title-row">
            <h2>Popular products near you</h2>
            <button>View all</button>
          </div>

          <div className="shopradar-product-grid">
            {productCards.map((product) => (
              <article key={product.name} className="shopradar-product-card">
                <div className="shopradar-product-art" style={{ background: product.tint }}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div className="shopradar-product-info">
                  <div className="shopradar-product-head">
                    <span>{product.name}</span>
                    <button>♡</button>
                  </div>
                  <div className="shopradar-product-meta">
                    <strong>{product.price}</strong>
                    <span>{product.badge}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shopradar-highlight-panel">
          <div className="shopradar-highlight-copy">
            <h3>Better deals. Closer to you.</h3>
            <button>Start exploring</button>
          </div>

          <div className="shopradar-map-card">
            <div className="map-grid">
              <span className="pin pin-one" />
              <span className="pin pin-two" />
              <span className="pin pin-three" />
            </div>
          </div>
        </section>

        <section className="shopradar-dashboard-grid">
          <div className="shopradar-panel shopradar-analytics-panel">
            <div className="shopradar-panel-header">
              <div>
                <span className="shopradar-panel-label">ShopRadar</span>
                <h3>Seller dashboard</h3>
              </div>
              <button>Export</button>
            </div>

            <div className="shopradar-stat-row">
              <div>
                <span>Revenue</span>
                <strong>KSh 245k</strong>
              </div>
              <div>
                <span>Orders</span>
                <strong>2,184</strong>
              </div>
              <div>
                <span>Customers</span>
                <strong>1,290</strong>
              </div>
            </div>

            <div className="chart-bars">
              <span style={{ height: '30%' }} />
              <span style={{ height: '46%' }} />
              <span style={{ height: '36%' }} />
              <span style={{ height: '62%' }} />
              <span style={{ height: '82%' }} />
              <span style={{ height: '67%' }} />
              <span style={{ height: '91%' }} />
            </div>
          </div>

          <div className="shopradar-panel shopradar-payments-panel">
            <div className="shopradar-panel-header">
              <div>
                <span className="shopradar-panel-label">Payments</span>
                <h3>Settlement records</h3>
              </div>
            </div>

            <div className="shopradar-payment-list">
              {dashboardRows.map((row) => (
                <div key={row.label} className="shopradar-payment-row">
                  <div>
                    <strong>{row.label}</strong>
                    <span>{row.amount}</span>
                  </div>
                  <span className={`status-badge ${row.tone}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

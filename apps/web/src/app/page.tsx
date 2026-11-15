'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { CatalogImage } from '@/components/catalog-image';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Product = { id: string; name: string; category: string; price: number; shop: string; city: string | null; stock: number };
type Category = { id: string; name: string };

const discoveryCategories = [
  { title: 'Fresh from the market', detail: 'Everyday produce and pantry picks', query: 'groceries', image: '/images/catalog/groceries.jpg', alt: 'Fresh fruit and vegetables at a market' },
  { title: 'Everyday style', detail: 'Clothes, shoes and accessories', query: 'fashion', image: '/images/catalog/footwear.jpg', alt: 'A colorful everyday sneaker' },
  { title: 'Tech for daily life', detail: 'Phones, audio and useful gadgets', query: 'electronics', image: '/images/catalog/tech.jpg', alt: 'A laptop ready for everyday work' },
  { title: 'Make home yours', detail: 'Thoughtful finds for every room', query: 'home', image: '/images/catalog/interiors.jpg', alt: 'A warm, sunlit living room' },
  { title: 'A little self-care', detail: 'Beauty picks and personal essentials', query: 'beauty', image: '/images/catalog/skincare.jpg', alt: 'A simple skincare routine' },
  { title: 'Coffee and small treats', detail: 'Local flavors for a slower moment', query: 'coffee', image: '/images/catalog/coffee.jpg', alt: 'Coffee being prepared at a neighborhood cafe' }
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${API_URL}/api/products/featured`, { signal: controller.signal }).then(readResponse<Product[]>),
      fetch(`${API_URL}/api/categories`, { signal: controller.signal }).then(readResponse<Category[]>)
    ])
      .then(([featured, availableCategories]) => {
        setProducts(featured);
        setCategories(availableCategories);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'ShopRadar could not load live listings.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <SiteShell
      title="Find it. Compare it. Get it."
      subtitle="Discover trusted products, nearby shops, and better prices in one place."
      action={<a className="shopradar-cta-button" href="/products">Browse products</a>}
    >
      <div className="shopradar-home-layout">
        <section className="shopradar-hero-panel">
          <div className="shopradar-hero-copy">
            <form className="shopradar-search-bar" action="/search" method="get">
              <input name="q" aria-label="What are you looking for?" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you looking for?" maxLength={100} required />
              <div className="shopradar-search-meta">
                <span>Search shops across Kenya</span>
                <button type="submit">Search</button>
              </div>
            </form>

            <div className="shopradar-pill-row">
              {categories.slice(0, 6).map((category) => (
                <a key={category.id} href={`/search?q=${encodeURIComponent(category.name)}`}>{category.name}</a>
              ))}
              {!categories.length && !loading ? <span>Local shops</span> : null}
            </div>
          </div>

          <div className="shopradar-hero-visual">
            <div className="shopradar-hero-photo">
              <Image src="/images/catalog/groceries.jpg" alt="Fresh produce at a local market" fill priority sizes="(max-width: 760px) 100vw, 40vw" style={{ objectFit: 'cover' }} />
              <div className="shopradar-hero-photo-caption"><span>Shop local</span><strong>Find fresh picks nearby</strong></div>
            </div>
            <div className="shopradar-hero-float-photo"><Image src="/images/catalog/fashion.jpg" alt="" fill sizes="160px" style={{ objectFit: 'cover' }} /></div>
          </div>
        </section>

        <section className="shopradar-discovery-section" aria-labelledby="shopradar-discovery-title">
          <div className="shopradar-discovery-heading">
            <div>
              <span className="shopradar-discovery-kicker">A good place to start</span>
              <h2 id="shopradar-discovery-title">What are you in the mood for?</h2>
            </div>
            <p>Explore everyday finds from shops around you.</p>
          </div>
          <div className="shopradar-discovery-grid">
            {discoveryCategories.map((category) => (
              <a className="shopradar-discovery-card" key={category.query} href={`/search?q=${encodeURIComponent(category.query)}`}>
                <Image src={category.image} alt={category.alt} fill sizes="(max-width: 520px) 46vw, (max-width: 900px) 30vw, 16vw" />
                <span className="shopradar-discovery-card-copy">
                  <strong>{category.title}</strong>
                  <span>{category.detail}</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="shopradar-product-section">
          <div className="shopradar-section-title-row">
            <h2>Products from approved local shops</h2>
            <a href="/products">View all</a>
          </div>

          {loading ? <p>Finding the latest listings…</p> : null}
          {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
          {!loading && !error && products.length === 0 ? <p style={{ color: '#64748b' }}>No approved shops have listed products yet. Check back soon.</p> : null}
          <div className="shopradar-product-grid">
            {products.slice(0, 4).map((product) => (
              <article key={product.id} className="shopradar-product-card">
                <CatalogImage category={product.category} height={150} />
                <div className="shopradar-product-info">
                  <div className="shopradar-product-head">
                    <span>{product.name}</span>
                    <span aria-label={product.stock > 0 ? 'In stock' : 'Out of stock'}>{product.stock > 0 ? 'Available' : 'Sold out'}</span>
                  </div>
                  <div className="shopradar-product-meta">
                    <strong>{formatPrice(product.price)}</strong>
                    <span>{product.shop}{product.city ? ` · ${product.city}` : ''}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shopradar-highlight-panel">
          <div className="shopradar-highlight-copy">
            <h3>Better deals. Closer to you.</h3>
            <a href="/nearby">Explore nearby shops</a>
          </div>
          <div className="shopradar-map-card" aria-label="Illustration of nearby shop locations">
            <div className="map-grid"><span className="pin pin-one" /><span className="pin pin-two" /><span className="pin pin-three" /></div>
          </div>
        </section>

        <section className="shopradar-dashboard-grid">
          <a className="shopradar-panel shopradar-analytics-panel" href="/seller/register">
            <div className="shopradar-panel-header"><div><span className="shopradar-panel-label">For local businesses and professionals</span><h3>Bring your business online</h3></div><span aria-hidden="true">?</span></div>
            <p>Register a shop or offer a local service, then help nearby customers find and contact you.</p>
          </a>
          <a className="shopradar-panel shopradar-payments-panel" href="/videos">
            <div className="shopradar-panel-header"><div><span className="shopradar-panel-label">Shop discovery</span><h3>See products in motion</h3></div><span aria-hidden="true">?</span></div>
            <p>Browse videos and contact approved sellers about their products.</p>
          </a>
        </section>
      </div>
    </SiteShell>
  );
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Live catalog could not be loaded (${response.status}).`);
  return response.json() as Promise<T>;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(price);
}

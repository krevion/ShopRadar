'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Product = { id: string; name: string; category: string; price: number; shop: string; city: string | null; stock: number };
type Category = { id: string; name: string };

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

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
  };

  return (
    <SiteShell
      title="Find it. Compare it. Get it."
      subtitle="Discover trusted products, nearby shops, and better prices in one place."
      action={<a className="shopradar-cta-button" href="/products">Browse products</a>}
    >
      <div className="shopradar-home-layout">
        <section className="shopradar-hero-panel">
          <div className="shopradar-hero-copy">
            <form className="shopradar-search-bar" onSubmit={search}>
              <input aria-label="What are you looking for?" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you looking for?" maxLength={100} />
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

          <div className="shopradar-hero-visual" aria-hidden="true">
            <div className="phone-card">
              <div className="phone-header"><span className="dot red" /><span className="dot amber" /><span className="dot green" /></div>
              <div className="phone-body"><div className="mini-product" /></div>
            </div>
          </div>
        </section>

        <section className="shopradar-product-section">
          <div className="shopradar-section-title-row">
            <h2>Products from approved local shops</h2>
            <a href="/products">View all</a>
          </div>

          {loading ? <p>Loading live products?</p> : null}
          {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
          {!loading && !error && products.length === 0 ? <p style={{ color: '#64748b' }}>No approved shops have listed products yet. Check back soon.</p> : null}
          <div className="shopradar-product-grid">
            {products.slice(0, 4).map((product) => (
              <article key={product.id} className="shopradar-product-card">
                <div className="shopradar-product-art" aria-hidden="true">
                  <span>{product.category.slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="shopradar-product-info">
                  <div className="shopradar-product-head">
                    <span>{product.name}</span>
                    <span aria-label={product.stock > 0 ? 'In stock' : 'Out of stock'}>{product.stock > 0 ? 'Available' : 'Sold out'}</span>
                  </div>
                  <div className="shopradar-product-meta">
                    <strong>{formatPrice(product.price)}</strong>
                    <span>{product.shop}{product.city ? ` ? ${product.city}` : ''}</span>
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
            <div className="shopradar-panel-header"><div><span className="shopradar-panel-label">For business owners</span><h3>Bring your shop online</h3></div><span aria-hidden="true">?</span></div>
            <p>Register your business, add products, and help nearby customers find your shop.</p>
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

'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Product = { id: string; name: string; category: string; price: number; shop: string; city: string | null; stock: number };
type Category = { id: string; name: string };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${API_URL}/api/products`, { signal: controller.signal }).then(readResponse<Product[]>),
      fetch(`${API_URL}/api/categories`, { signal: controller.signal }).then(readResponse<Category[]>)
    ])
      .then(([productData, categoryData]) => { setProducts(productData); setCategories(categoryData); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The catalog could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const visibleProducts = useMemo(() => selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products, [products, selectedCategory]);

  return (
    <SiteShell title="Products" subtitle="Compare live listings from approved local shops.">
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button type="button" onClick={() => setSelectedCategory('')} style={categoryStyle(!selectedCategory)}>All products</button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => setSelectedCategory(category.name)} style={categoryStyle(selectedCategory === category.name)}>
              {category.name}
            </button>
          ))}
        </div>

        {loading ? <p>Loading live inventory…</p> : null}
        {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
        {!loading && !error && visibleProducts.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed var(--color-border)', borderRadius: 16, padding: '1.2rem', color: '#64748b' }}>
            {selectedCategory ? `No ${selectedCategory.toLowerCase()} listings are live yet.` : 'No products are live yet. Approved sellers will appear here when they add inventory.'}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {visibleProducts.map((product) => (
            <article key={product.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div aria-hidden="true" style={{ height: 160, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(140deg, #082f49, #0e7490 58%, #f97316)', color: 'white', fontSize: '3rem', fontWeight: 900 }}>
                {product.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{product.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{product.shop}{product.city ? ` · ${product.city}` : ''}</div>
                </div>
                <span aria-label="Verified shop" style={{ color: '#0f766e', fontWeight: 700 }}>✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#334155', fontWeight: 700 }}>{product.category}</span>
                <strong style={{ color: 'var(--color-orange)' }}>{formatPrice(product.price)}</strong>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.84rem' }}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
            </article>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(price);
}

function categoryStyle(active: boolean): CSSProperties {
  return {
    background: active ? '#0e7490' : '#f8fafc',
    color: active ? '#fff' : '#334155',
    border: `1px solid ${active ? '#0e7490' : 'var(--color-border)'}`,
    borderRadius: 999,
    padding: '0.5rem 0.9rem',
    fontWeight: 600,
    cursor: 'pointer'
  };
}

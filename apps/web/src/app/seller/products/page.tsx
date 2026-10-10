'use client';

import { type CSSProperties, type FormEvent, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string | null;
};

type ProductDraft = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
};

const emptyDraft: ProductDraft = { name: '', category: 'Groceries', price: '', stock: '', description: '' };
const tokenKey = 'shopradar-access-token';

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setError('Sign in with your seller account to manage products.');
      setLoading(false);
      return () => controller.abort();
    }
    fetch(`${API_URL}/api/products/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return response.json() as Promise<Product[]>;
      })
      .then(setProducts)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Products could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const handleFieldChange = (field: keyof ProductDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const token = localStorage.getItem(tokenKey);
      if (!token) throw new Error('Sign in with your seller account to publish a product.');
      const response = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: draft.name.trim(),
          category: draft.category,
          price: Number(draft.price),
          stock: Number(draft.stock),
          description: draft.description.trim()
        })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const created = await response.json() as Product;
      setProducts((current) => [created, ...current]);
      setDraft(emptyDraft);
      setStatus('Product saved to your shop. It appears publicly after seller approval.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The product could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async (id: string) => {
    setError('');
    setStatus('');
    try {
      const token = localStorage.getItem(tokenKey);
      if (!token) throw new Error('Sign in with your seller account to manage products.');
      const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setProducts((current) => current.filter((product) => product.id !== id));
      setStatus('Product removed from your shop.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The product could not be removed.');
    }
  };

  return (
    <SiteShell title="Products" subtitle="Update stock levels, pricing, and listing details for your store.">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Add product</div>

          <label style={labelStyle}>
            Product name
            <input required maxLength={120} value={draft.name} onChange={(event) => handleFieldChange('name', event.target.value)} style={inputStyle} placeholder="Fresh mangoes" />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={labelStyle}>
              Category
              <select value={draft.category} onChange={(event) => handleFieldChange('category', event.target.value)} style={inputStyle}>
                <option>Groceries</option><option>Electronics</option><option>Home</option><option>Beauty</option><option>Fashion</option>
              </select>
            </label>
            <label style={labelStyle}>
              Price (KSh)
              <input required type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => handleFieldChange('price', event.target.value)} style={inputStyle} placeholder="180" />
            </label>
          </div>

          <label style={labelStyle}>
            Stock
            <input required type="number" min="0" max="1000000" step="1" value={draft.stock} onChange={(event) => handleFieldChange('stock', event.target.value)} style={inputStyle} placeholder="24" />
          </label>

          <label style={labelStyle}>
            Description
            <textarea maxLength={2000} value={draft.description} onChange={(event) => handleFieldChange('description', event.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe the product" />
          </label>

          <button type="submit" disabled={busy} style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.9rem 1.2rem', fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Saving…' : 'Publish listing'}
          </button>
          {status ? <p role="status" style={{ margin: 0, color: '#166534', fontWeight: 600 }}>{status}</p> : null}
          {error ? <p role="alert" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{error}</p> : null}
        </form>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {loading ? <p>Loading your inventory…</p> : null}
          {!loading && products.length === 0 && !error ? <p style={{ color: '#64748b' }}>Your product list is empty. Add your first listing to get started.</p> : null}
          {products.map((product) => (
            <div key={product.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>{product.stock} in stock · {product.category}</div>
                {product.description ? <div style={{ color: '#475569', marginTop: '0.35rem' }}>{product.description}</div> : null}
              </div>
              <div style={{ display: 'grid', justifyItems: 'end', gap: '0.65rem' }}>
                <span style={{ color: 'var(--color-orange)', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(product.price)}</span>
                <button type="button" onClick={() => void removeProduct(product.id)} style={{ background: 'transparent', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(price);
}

const labelStyle: CSSProperties = { display: 'grid', gap: '0.45rem', fontWeight: 600 };
const inputStyle: CSSProperties = {
  width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '0.8rem 0.9rem',
  fontSize: '0.95rem', background: '#f8fafc', color: '#0f172a'
};

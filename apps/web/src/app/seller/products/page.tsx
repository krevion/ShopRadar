'use client';

import { type CSSProperties, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

type ProductDraft = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
};

const initialProducts = [
  { name: 'Fresh mangoes', category: 'Groceries', price: 'KSh 180', stock: '24 left', description: 'Locally sourced produce from trusted growers.' },
  { name: 'Smart LED bulb', category: 'Home', price: 'KSh 860', stock: '16 left', description: 'Energy-efficient lighting for modern homes.' },
  { name: 'Organic rice', category: 'Groceries', price: 'KSh 520', stock: '38 left', description: 'Premium rice packed for daily meals.' }
];

const emptyDraft: ProductDraft = {
  name: '',
  category: 'Groceries',
  price: '',
  stock: '',
  description: ''
};

export default function SellerProductsPage() {
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [saved, setSaved] = useState(false);

  const handleFieldChange = (field: keyof ProductDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    const trimmedName = draft.name.trim();
    const trimmedPrice = draft.price.trim();
    const trimmedStock = draft.stock.trim();

    if (!trimmedName || !trimmedPrice || !trimmedStock) {
      setSaved(false);
      return;
    }

    setProducts((current) => [{
      name: trimmedName,
      category: draft.category,
      price: trimmedPrice,
      stock: trimmedStock,
      description: draft.description.trim() || 'Fresh listing added to your storefront.'
    }, ...current]);

    setDraft(emptyDraft);
    setSaved(true);
  };

  return (
    <SiteShell title="Products" subtitle="Update stock levels, pricing, and listing details for your store.">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Add product</div>

          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
            Product name
            <input value={draft.name} onChange={(event) => handleFieldChange('name', event.target.value)} style={inputStyle} placeholder="Fresh mangoes" />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              Category
              <select value={draft.category} onChange={(event) => handleFieldChange('category', event.target.value)} style={inputStyle}>
                <option>Groceries</option>
                <option>Electronics</option>
                <option>Home</option>
                <option>Beauty</option>
                <option>Fashion</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              Price
              <input value={draft.price} onChange={(event) => handleFieldChange('price', event.target.value)} style={inputStyle} placeholder="KSh 180" />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
            Stock
            <input value={draft.stock} onChange={(event) => handleFieldChange('stock', event.target.value)} style={inputStyle} placeholder="24 left" />
          </label>

          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
            Description
            <textarea value={draft.description} onChange={(event) => handleFieldChange('description', event.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe the product and value proposition" />
          </label>

          <button type="button" onClick={handleSubmit} style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.9rem 1.2rem', fontWeight: 800, cursor: 'pointer' }}>
            Publish listing
          </button>

          {saved && (
            <div style={{ background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: '0.8rem 1rem', fontWeight: 700 }}>
              Product published to your store and search listings.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {products.map((product) => (
            <div key={`${product.name}-${product.price}`} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>{product.stock} • {product.category}</div>
                <div style={{ color: '#475569', marginTop: '0.35rem' }}>{product.description}</div>
              </div>
              <span style={{ color: 'var(--color-orange)', fontWeight: 700, whiteSpace: 'nowrap' }}>{product.price}</span>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: 12,
  padding: '0.8rem 0.9rem',
  fontSize: '0.95rem',
  background: '#f8fafc',
  color: '#0f172a'
};

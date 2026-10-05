'use client';

import { type CSSProperties, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

type ShopDraft = {
  shopName: string;
  city: string;
  address: string;
  description: string;
  category: string;
  hours: string;
};

const initialShop: ShopDraft = {
  shopName: 'Fresh Harvest',
  city: 'Nairobi',
  address: 'Westlands, Nairobi',
  description: 'Fresh produce, household essentials, and daily groceries delivered fast.',
  category: 'Groceries',
  hours: '8:00 AM - 8:00 PM'
};

export default function SellerShopPage() {
  const [shop, setShop] = useState<ShopDraft>(initialShop);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof ShopDraft, value: string) => {
    setShop((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    setSaved(true);
  };

  return (
    <SiteShell title="My shop" subtitle="Manage storefront branding, updates, and customer experience.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Shop name', value: shop.shopName },
            { label: 'Status', value: 'Live' },
            { label: 'Hours', value: shop.hours },
            { label: 'Location', value: shop.city }
          ].map((item) => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
              <div style={{ color: '#64748b' }}>{item.label}</div>
              <div style={{ marginTop: '0.45rem', fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Storefront settings</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              Shop name
              <input value={shop.shopName} onChange={(event) => handleChange('shopName', event.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              City
              <input value={shop.city} onChange={(event) => handleChange('city', event.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              Business category
              <select value={shop.category} onChange={(event) => handleChange('category', event.target.value)} style={inputStyle}>
                <option>Groceries</option>
                <option>Electronics</option>
                <option>Home</option>
                <option>Fashion</option>
                <option>Beauty</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
              Opening hours
              <input value={shop.hours} onChange={(event) => handleChange('hours', event.target.value)} style={inputStyle} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
            Address
            <input value={shop.address} onChange={(event) => handleChange('address', event.target.value)} style={inputStyle} />
          </label>

          <label style={{ display: 'grid', gap: '0.45rem', fontWeight: 600 }}>
            Description
            <textarea value={shop.description} onChange={(event) => handleChange('description', event.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

          <button type="button" onClick={handleSubmit} style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.9rem 1.2rem', fontWeight: 800, cursor: 'pointer' }}>
            Save storefront
          </button>

          {saved && (
            <div style={{ background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: '0.8rem 1rem', fontWeight: 700 }}>
              Storefront updates saved and published to your customer profile.
            </div>
          )}
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

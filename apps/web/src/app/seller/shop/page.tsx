'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { SellerAddressFields, type SellerAddressDetails } from '@/components/seller-address-fields';
import { ShopLocationMap, type ShopLocation } from '@/components/shop-location-map';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function SellerShopPage() {
  const [shopName, setShopName] = useState('My shop');
  const [location, setLocation] = useState<ShopLocation | null>(null);
  const [address, setAddress] = useState<SellerAddressDetails>({ buildingName: '', roomNumber: '', street: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setStatus('Sign in with your seller account to manage your shop location.');
      setStatusIsError(true);
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/sellers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { message?: string; shopName?: string; locationLabel?: string | null; buildingName?: string | null; roomNumber?: string | null; street?: string | null; latitude?: number | null; longitude?: number | null } | null;
        if (!response.ok) throw new Error(body?.message ?? `Could not load shop (${response.status}).`);
        return body!;
      })
      .then((profile) => {
        if (cancelled) return;
        setShopName(profile.shopName ?? 'My shop');
        setAddress({
          buildingName: profile.buildingName ?? '',
          roomNumber: profile.roomNumber ?? '',
          street: profile.street ?? ''
        });
        if (Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)) {
          setLocation({ latitude: profile.latitude!, longitude: profile.longitude!, locationLabel: profile.locationLabel });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) { setStatus(error instanceof Error ? error.message : 'Shop details could not be loaded.'); setStatusIsError(true); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const saveLocation = async () => {
    const token = localStorage.getItem('shopradar-access-token');
    if (!token || !location) return;
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch(`${API_URL}/api/sellers/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...location, ...address })
      });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? `Could not save location (${response.status}).`);
      setStatus('Shop location saved. Customers can now find your shop on the nearby map and seller page.');
      setStatusIsError(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Shop location could not be saved.');
      setStatusIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteShell title="My shop location" subtitle="Choose the place customers should visit. Your saved pin will appear on nearby maps and your public seller page.">
      <section style={{ display: 'grid', gap: '1rem', maxWidth: 860, margin: '0 auto', padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 20, background: '#fff' }}>
        <div><strong style={{ fontSize: '1.1rem' }}>{shopName}</strong><p style={{ color: '#64748b', marginBottom: 0 }}>{loading ? 'Loading saved shop details…' : 'Search for your area, then place the pin at your shop entrance.'}</p></div>
        <ShopLocationMap selectedLocation={location} onLocationSelect={setLocation} height={430} />
        {location ? <div style={{ color: '#334155', fontSize: 14 }}>{location.locationLabel ?? 'Selected shop location'} · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</div> : null}
        <SellerAddressFields value={address} onChange={setAddress} />
        <button type="button" onClick={saveLocation} disabled={loading || saving || !location} style={{ border: 0, borderRadius: 12, padding: '0.9rem 1.2rem', background: loading || saving || !location ? '#94a3b8' : 'var(--color-orange)', color: '#fff', fontWeight: 800, cursor: location ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving location…' : 'Save shop location'}
        </button>
        {status ? <p role="status" style={{ margin: 0, color: statusIsError ? '#b91c1c' : '#166534', lineHeight: 1.5 }}>{status}</p> : null}
      </section>
    </SiteShell>
  );
}

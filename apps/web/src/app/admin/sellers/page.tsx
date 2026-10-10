'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const tokenKey = 'shopradar-access-token';

type Seller = { id: string; email: string; business: string; locationLabel: string | null; buildingName: string | null; roomNumber: string | null; street: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'; verified: boolean; createdAt: string };

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSellers = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem(tokenKey);
    if (!token) throw new Error('Sign in with an admin account to review sellers.');
    const response = await fetch(`${API_URL}/api/admin/sellers`, { headers: { Authorization: `Bearer ${token}` }, signal });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    setSellers(await response.json() as Seller[]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSellers(controller.signal)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Seller records could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [loadSellers]);

  const updateStatus = async (seller: Seller, status: Seller['status']) => {
    setBusyId(seller.id);
    setError('');
    setNotice('');
    try {
      const token = localStorage.getItem(tokenKey);
      if (!token) throw new Error('Sign in with an admin account to review sellers.');
      const response = await fetch(`${API_URL}/api/admin/sellers/${encodeURIComponent(seller.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const updated = await response.json() as { status: Seller['status']; isVerified: boolean };
      setSellers((current) => current.map((entry) => entry.id === seller.id ? { ...entry, status: updated.status, verified: updated.isVerified } : entry));
      setNotice(`${seller.business} status changed to ${updated.status.toLowerCase()}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Seller status could not be updated.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <SiteShell title="Sellers" subtitle="Review seller registrations and manage marketplace approval.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem 1.2rem', color: '#334155' }}>
          Approved seller profiles become visible in shop discovery and product search. Status changes notify the seller.
        </div>
        {loading ? <p>Loading seller applications…</p> : null}
        {error ? <p role="alert" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{error}</p> : null}
        {notice ? <p role="status" style={{ margin: 0, color: '#166534', fontWeight: 600 }}>{notice}</p> : null}
        {!loading && !error && sellers.length === 0 ? <p style={{ color: '#64748b' }}>No seller applications yet.</p> : null}
        {sellers.map((seller) => (
          <article key={seller.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{seller.business}</div>
              <div style={{ color: '#64748b', marginTop: '0.25rem' }}>{seller.email}{formatSellerAddress(seller) ? ` · ${formatSellerAddress(seller)}` : ''}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>Submitted {new Date(seller.createdAt).toLocaleDateString()}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ color: seller.verified ? 'var(--color-success)' : '#b45309', fontWeight: 700 }}>{seller.status}</span>
              {seller.status !== 'APPROVED' ? <button type="button" disabled={Boolean(busyId)} onClick={() => void updateStatus(seller, 'APPROVED')} style={buttonStyle(busyId === seller.id, true)}>Approve</button> : null}
              {seller.status !== 'REJECTED' ? <button type="button" disabled={Boolean(busyId)} onClick={() => void updateStatus(seller, 'REJECTED')} style={buttonStyle(busyId === seller.id, false)}>Reject</button> : null}
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

function buttonStyle(disabled: boolean, approve: boolean): CSSProperties {
  return {
    border: approve ? 0 : '1px solid #fecaca',
    borderRadius: 10,
    padding: '0.55rem 0.8rem',
    fontWeight: 700,
    cursor: disabled ? 'wait' : 'pointer',
    color: approve ? '#fff' : '#b91c1c',
    background: approve ? (disabled ? '#94a3b8' : 'var(--color-orange)') : '#fff'
  };
}

function formatSellerAddress(seller: Seller) {
  return [
    seller.buildingName,
    seller.roomNumber ? `Room ${seller.roomNumber}` : null,
    seller.street,
    seller.locationLabel
  ].map((part) => part?.trim()).filter(Boolean).join(', ');
}

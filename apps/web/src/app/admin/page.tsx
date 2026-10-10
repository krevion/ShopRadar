'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const tokenKey = 'shopradar-access-token';

type Overview = { users: number; approvedSellers: number; pendingSellers: number; shops: number; products: number; confirmedRevenue: number };

export default function AdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setError('Sign in with an admin account to view marketplace operations.');
      return;
    }
    const controller = new AbortController();
    fetch(`${API_URL}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return response.json() as Promise<Overview>;
      })
      .then(setOverview)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Admin overview could not be loaded.'); });
    return () => controller.abort();
  }, []);

  const metrics = overview ? [
    { label: 'Accounts', value: overview.users.toLocaleString() },
    { label: 'Approved sellers', value: overview.approvedSellers.toLocaleString() },
    { label: 'Awaiting review', value: overview.pendingSellers.toLocaleString() },
    { label: 'Live shops', value: overview.shops.toLocaleString() },
    { label: 'Products', value: overview.products.toLocaleString() },
    { label: 'Confirmed payments', value: new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(overview.confirmedRevenue) }
  ] : [];

  return (
    <SiteShell title="Admin overview" subtitle="Live operations and marketplace health for ShopRadar.">
      {error ? <p role="alert" style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</p> : null}
      {!overview && !error ? <p>Loading marketplace totals…</p> : null}
      {overview ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{metric.label}</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.5rem', fontWeight: 800 }}>{metric.value}</div>
          </div>
        ))}
      </div> : null}
    </SiteShell>
  );
}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

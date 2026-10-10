'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const tokenKey = 'shopradar-access-token';
type Report = { id: string; title: string; value: string };

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setError('Sign in with an admin account to view marketplace reports.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch(`${API_URL}/api/reports`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return response.json() as Promise<Report[]>;
      })
      .then(setReports)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Reports could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <SiteShell title="Reports" subtitle="Marketplace activity and confirmed payment insights.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? <p>Loading reports…</p> : null}
        {error ? <p role="alert" style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</p> : null}
        {reports.map((item) => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
            <div style={{ color: '#64748b' }}>{item.title}</div>
            <div style={{ marginTop: '0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
        {!loading && !error && reports.length === 0 ? <p style={{ color: '#64748b' }}>No activity is available yet.</p> : null}
      </div>
    </SiteShell>
  );
}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

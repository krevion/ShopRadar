'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AdminVideosPage() {
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/payments/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Payment status could not be loaded (${response.status}).`);
        return response.json() as Promise<{ enabled: boolean }>;
      })
      .then((status) => setPaymentsEnabled(status.enabled))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Payment status is unavailable.'); });
    return () => controller.abort();
  }, []);

  return (
    <SiteShell title="Video content" subtitle="Video publishing is tied to an approved seller and a confirmed subscription payment.">
      {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
      {paymentsEnabled === null && !error ? <p>Checking seller access?</p> : null}
      {paymentsEnabled === false ? <section role="status" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 18, padding: '1.25rem', color: '#7c3d00', lineHeight: 1.6 }}>
        M-Pesa is disabled while Safaricom setup is pending, so sellers cannot publish paid videos yet.
      </section> : null}
      {paymentsEnabled === true ? <section style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 18, padding: '1.25rem', color: '#115e59', lineHeight: 1.6 }}>
        Paid video publishing is enabled for approved sellers. Admin video review and removal controls are not available in the API.
      </section> : null}
    </SiteShell>
  );
}

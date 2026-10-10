'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AdminPaymentsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/payments/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Payment status could not be loaded (${response.status}).`);
        return response.json() as Promise<{ enabled: boolean }>;
      })
      .then((status) => setEnabled(status.enabled))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Payment status is unavailable.'); });
    return () => controller.abort();
  }, []);

  return (
    <SiteShell title="Payments" subtitle="Payment operations and settlement reporting.">
      {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
      {enabled === null && !error ? <p>Checking payment configuration?</p> : null}
      {enabled === false ? <section role="status" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 18, padding: '1.25rem', color: '#7c3d00', lineHeight: 1.6 }}>
        <strong>M-Pesa payments are disabled.</strong> No payment requests or settlement totals are being reported. Add the Safaricom account details and callback URL before enabling checkout.
      </section> : null}
      {enabled === true ? <section style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 18, padding: '1.25rem', color: '#115e59', lineHeight: 1.6 }}>
        Payment requests are enabled. Admin transaction history, reconciliation, and settlement controls are not implemented yet.
      </section> : null}
    </SiteShell>
  );
}

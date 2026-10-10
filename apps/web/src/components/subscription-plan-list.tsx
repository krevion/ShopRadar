'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing: string;
  features: string[];
};

export function SubscriptionPlanList() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${API_URL}/api/subscriptions`, { signal: controller.signal }).then(readResponse<SubscriptionPlan[]>),
      fetch(`${API_URL}/api/payments/status`, { signal: controller.signal }).then(readResponse<{ enabled: boolean }>)
    ])
      .then(([availablePlans, paymentStatus]) => {
        setPlans(availablePlans);
        setPaymentsEnabled(paymentStatus.enabled);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Seller plan details could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {loading ? <p>Loading seller plan…</p> : null}
      {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
      {paymentsEnabled === false ? (
        <p role="status" style={{ margin: 0, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '1rem', color: '#7c3d00', lineHeight: 1.55 }}>
          M-Pesa checkout is paused while Safaricom setup is pending. New seller profiles still receive their one-month free trial; paid renewals will be available after checkout is configured.
        </p>
      ) : null}
      {!loading && !error && plans.length === 0 ? <p style={{ color: '#64748b' }}>No seller plans are configured.</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {plans.map((plan) => (
          <article key={plan.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{plan.name}</h2>
            <strong style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-orange)' }}>
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: plan.currency, maximumFractionDigits: 0 }).format(plan.price)}
            </strong>
            <div style={{ marginTop: '0.25rem', color: '#64748b' }}>{plan.billing}</div>
            <ul style={{ margin: '0.9rem 0 0', paddingLeft: '1.2rem', color: '#475569', lineHeight: 1.65 }}>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Seller plan request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

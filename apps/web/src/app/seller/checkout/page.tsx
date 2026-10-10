'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

async function getErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

export default function SellerCheckoutPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [paymentStatusError, setPaymentStatusError] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem('shopradar-access-token')));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/payments/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Payment availability could not be checked.');
        return response.json() as Promise<{ enabled: boolean }>;
      })
      .then((result) => setPaymentsEnabled(result.enabled))
      .catch(() => {
        if (!controller.signal.aborted) {
          setPaymentsEnabled(false);
          setPaymentStatusError(true);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!paymentId || paymentStatus === 'SUCCESSFUL' || paymentStatus === 'FAILED') return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const checkPayment = async () => {
      const token = localStorage.getItem('shopradar-access-token');
      if (!token) {
        setStatus('Your session expired. Sign in again to check payment status.');
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
        const payment = await response.json() as { status: PaymentStatus };
        if (cancelled) return;
        setPaymentStatus(payment.status);
        if (payment.status === 'SUCCESSFUL') {
          setStatus('Payment confirmed. Your full ShopRadar seller subscription is active for 30 days.');
        } else if (payment.status === 'FAILED') {
          setStatus('Payment was not completed. Please start another payment request.');
        } else {
          timeout = setTimeout(checkPayment, 4000);
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Could not check payment status.');
      }
    };

    void checkPayment();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [paymentId, paymentStatus]);

  const startPayment = async () => {
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setStatus('Register or sign in with a seller account before paying.');
      setHasToken(false);
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    const normalizedPhone = digits.startsWith('254') ? digits : digits.startsWith('0') ? `254${digits.slice(1)}` : `254${digits}`;
    if (!/^254\d{9}$/.test(normalizedPhone)) {
      setStatus('Enter a valid Kenyan phone number, for example 0712345678.');
      return;
    }

    setIsSubmitting(true);
    setStatus('');
    try {
      const response = await fetch(`${API_URL}/api/payments/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber: normalizedPhone })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const result = await response.json() as { id: string; status: PaymentStatus };
      setPaymentId(result.id);
      setPaymentStatus(result.status);
      setStatus('Check your phone and approve the M-Pesa prompt. This page will verify the result with the payment provider.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The payment request could not be started.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SiteShell
      title="Seller subscription"
      subtitle="Your first month is free. After the trial, a verified KSh 1,000 M-Pesa payment continues the full ShopRadar seller experience for 30 days."
      action={<a href="/seller/register" style={{ color: '#9a4d00', fontWeight: 800 }}>Seller sign in</a>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(260px, 0.85fr)', gap: '1.25rem', alignItems: 'start' }}>
        <section style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>M-Pesa payment</div>
          {!hasToken ? <p style={{ margin: 0, color: '#9a4d00' }}>Sign in with your seller account before starting checkout.</p> : null}
          {paymentsEnabled === true ? <>
            <label style={labelStyle}>
              M-Pesa phone number
              <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="0712345678" autoComplete="tel" style={inputStyle} />
            </label>
            <button
              type="button"
              onClick={() => void startPayment()}
              disabled={!hasToken || isSubmitting || paymentStatus === 'PENDING'}
              style={{ border: 0, borderRadius: 12, padding: '0.9rem 1.2rem', background: !hasToken || isSubmitting || paymentStatus === 'PENDING' ? '#94a3b8' : 'var(--color-orange)', color: '#fff', fontWeight: 800 }}
            >
              {isSubmitting ? 'Starting payment?' : paymentStatus === 'PENDING' ? 'Waiting for M-Pesa confirmation?' : 'Pay KSh 1,000'}
            </button>
          </> : paymentsEnabled === false ? <div role="status" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '0.9rem 1rem', color: '#9a4d00', lineHeight: 1.55 }}>
            {paymentStatusError
              ? 'Payment availability could not be verified. Checkout is unavailable right now; your seller account and business profile remain saved.'
              : 'M-Pesa checkout is paused while ShopRadar waits for Safaricom setup. Your one-month free trial is available now; paid renewals will be available after checkout is configured.'}
          </div> : <p>Checking payment availability…</p>}
          {status ? <div role="status" style={{ background: paymentStatus === 'FAILED' ? '#fef2f2' : '#f8fafc', borderRadius: 12, padding: '0.9rem 1rem', color: paymentStatus === 'FAILED' ? '#b91c1c' : '#334155', lineHeight: 1.55 }}>{status}</div> : null}
          {paymentStatus === 'SUCCESSFUL' ? <a href="/seller" style={{ color: '#166534', fontWeight: 800 }}>Open your seller hub →</a> : null}
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55 }}>
            ShopRadar never accepts a browser-side “payment complete” flag. Seller subscription activation follows verified payment confirmation from the provider.
          </p>
        </section>

        <aside style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <strong style={{ fontSize: '1.1rem' }}>Your full seller toolkit</strong>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1rem', display: 'grid', gap: '0.8rem' }}>
            <div><strong>Free trial</strong><div style={{ color: '#64748b', fontSize: '0.85rem' }}>First 30 days are free for new seller profiles</div></div>
            <div><strong>After the trial</strong><div style={{ color: '#64748b', fontSize: '0.85rem' }}>KSh 1,000 for each additional 30 days, paid through M-Pesa</div></div>
            <div><strong>Business tools</strong><div style={{ color: '#64748b', fontSize: '0.85rem' }}>Complete registration and manage your shop and products</div></div>
            <div><strong>Shopper reach</strong><div style={{ color: '#64748b', fontSize: '0.85rem' }}>Engage shoppers and promote with videos up to 2 minutes 30 seconds</div></div>
          </div>
          <p style={{ margin: 0, color: '#64748b', lineHeight: 1.55 }}>The subscription is for the complete seller experience. Your shop must still pass seller approval before it appears publicly.</p>
        </aside>
      </div>
    </SiteShell>
  );
}

const labelStyle: CSSProperties = { display: 'grid', gap: '0.45rem', fontWeight: 700, color: '#334155' };
const inputStyle: CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '0.8rem 0.9rem', fontSize: '0.95rem', background: '#f8fafc' };

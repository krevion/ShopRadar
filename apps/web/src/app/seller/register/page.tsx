'use client';

import { type CSSProperties, type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

export default function SellerRegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');

    try {
      const authResponse = await fetch(`${API_URL}/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { email, password, role: 'SELLER' } : { email, password })
      });
      if (!authResponse.ok) throw new Error(await getErrorMessage(authResponse));

      const auth = await authResponse.json() as {
        user: { id: string; role: string };
        accessToken: string;
      };
      if (auth.user.role !== 'SELLER') {
        throw new Error('This account is not a seller account. Sign in with a seller account.');
      }
      localStorage.setItem('shopradar-access-token', auth.accessToken);
      localStorage.setItem('shopradar-account', JSON.stringify(auth.user));

      if (mode === 'register') {
        const profileResponse = await fetch(`${API_URL}/api/sellers/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}`
          },
          body: JSON.stringify({ shopName, bio })
        });
        if (!profileResponse.ok) throw new Error(await getErrorMessage(profileResponse));
        router.push('/seller/checkout');
        return;
      }

      const accessResponse = await fetch(`${API_URL}/api/videos/access`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` }
      });
      if (!accessResponse.ok) throw new Error(await getErrorMessage(accessResponse));
      const access = await accessResponse.json() as { eligible: boolean; reason: string };
      if (access.eligible) {
        router.push('/seller/videos');
        return;
      }
      if (access.reason.startsWith('Register your seller profile')) {
        if (!shopName.trim()) throw new Error('Enter your business name to complete seller registration.');
        const profileResponse = await fetch(`${API_URL}/api/sellers/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}`
          },
          body: JSON.stringify({ shopName, bio })
        });
        if (!profileResponse.ok) throw new Error(await getErrorMessage(profileResponse));
      }
      router.push('/seller/checkout');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Seller account could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell
      title={mode === 'register' ? 'Register your business' : 'Seller sign in'}
      subtitle={mode === 'register' ? 'Create a seller account and submit your shop for verification.' : 'Sign in to check your seller subscription and video access.'}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16, padding: '1rem 1.2rem', color: '#9a4d00' }}>
          <strong>Video publishing access:</strong> seller accounts need a registered profile and a successful KSh 1,000 subscription payment from the last 30 days.
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" onClick={() => { setMode('register'); setStatus(''); }} style={modeButtonStyle(mode === 'register')}>Register</button>
            <button type="button" onClick={() => { setMode('login'); setStatus(''); }} style={modeButtonStyle(mode === 'login')}>Sign in</button>
          </div>

          <label style={labelStyle}>
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Password
            <input required type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Business name {mode === 'login' ? <span style={{ color: '#64748b', fontWeight: 400 }}>(only needed if you have not registered your shop)</span> : null}
            <input required={mode === 'register'} maxLength={120} value={shopName} onChange={(event) => setShopName(event.target.value)} placeholder="Your shop name" style={inputStyle} />
          </label>
          {mode === 'register' ? (
            <label style={labelStyle}>
              About your shop <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
              <textarea maxLength={500} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What do you sell?" style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
          ) : null}

          <button type="submit" disabled={busy} style={{ border: 0, borderRadius: 12, padding: '0.9rem 1.2rem', background: busy ? '#94a3b8' : 'var(--color-orange)', color: '#fff', fontWeight: 800 }}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create seller account' : 'Sign in'}
          </button>
          {status ? <p role="status" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{status}</p> : null}
        </form>

        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.55 }}>
          A submitted M-Pesa request is not treated as payment. The API grants video access only after Safaricom confirms the subscription payment.
        </p>
      </div>
    </SiteShell>
  );
}

const labelStyle: CSSProperties = { display: 'grid', gap: '0.45rem', fontWeight: 700, color: '#334155' };
const inputStyle: CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '0.8rem 0.9rem', fontSize: '0.95rem' };
const modeButtonStyle = (selected: boolean): CSSProperties => ({
  border: selected ? '1px solid #fed7aa' : '1px solid #e2e8f0',
  borderRadius: 999,
  background: selected ? '#fff7ed' : '#f8fafc',
  color: selected ? '#9a4d00' : '#475569',
  padding: '0.6rem 0.95rem',
  fontWeight: 800
});

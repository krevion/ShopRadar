'use client';

import { type CSSProperties, type FormEvent, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

export default function AccountPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('shopradar-account');
    if (stored) {
      try {
        const account = JSON.parse(stored) as { email?: string };
        setAccountEmail(account.email ?? '');
      } catch {
        localStorage.removeItem('shopradar-account');
      }
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch(`${API_URL}/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { email, password, role: 'CUSTOMER' } : { email, password })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const result = await response.json() as {
        user: { id: string; email: string; role: string };
        accessToken: string;
      };
      localStorage.setItem('shopradar-access-token', result.accessToken);
      localStorage.setItem('shopradar-account', JSON.stringify(result.user));
      setAccountEmail(result.user.email);
      setStatus('You are signed in. Likes, comments, seller favourites, and messages sync with your account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('shopradar-access-token');
    localStorage.removeItem('shopradar-account');
    localStorage.removeItem('shopradar-video-likes');
    localStorage.removeItem('shopradar-seller-favorites');
    setAccountEmail('');
    setStatus('You have signed out.');
  };

  return (
    <SiteShell title="My account" subtitle="Sign in to like and discuss videos, save favourite sellers, and message shops.">
      <section style={{ maxWidth: 640, margin: '0 auto', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
        {accountEmail ? (
          <>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Signed in as</div>
              <strong>{accountEmail}</strong>
            </div>
            <a href="/videos" style={buttonLinkStyle}>Browse videos</a>
            <button type="button" onClick={signOut} style={secondaryButtonStyle}>Sign out</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" onClick={() => { setMode('register'); setStatus(''); }} style={modeButtonStyle(mode === 'register')}>Create account</button>
              <button type="button" onClick={() => { setMode('login'); setStatus(''); }} style={modeButtonStyle(mode === 'login')}>Sign in</button>
            </div>
            <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
              <label style={labelStyle}>
                Email
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Password
                <input required type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" style={inputStyle} />
              </label>
              <button type="submit" disabled={busy} style={{ ...buttonLinkStyle, border: 0, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          </>
        )}
        {status ? <p role="status" style={{ margin: 0, color: '#475569', lineHeight: 1.55 }}>{status}</p> : null}
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.83rem', lineHeight: 1.5 }}>Seller accounts can be created from <a href="/seller/register" style={{ color: '#9a4d00', fontWeight: 800 }}>seller registration</a>.</p>
      </section>
    </SiteShell>
  );
}

const labelStyle: CSSProperties = { display: 'grid', gap: '0.45rem', fontWeight: 700, color: '#334155' };
const inputStyle: CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '0.8rem 0.9rem', fontSize: '0.95rem' };
const buttonLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: '0.85rem 1rem', background: 'var(--color-orange)', color: '#fff', fontWeight: 800, textDecoration: 'none' };
const secondaryButtonStyle: CSSProperties = { justifySelf: 'start', border: '1px solid #cbd5e1', borderRadius: 12, padding: '0.75rem 1rem', background: '#fff', color: '#334155', fontWeight: 800 };
const modeButtonStyle = (selected: boolean): CSSProperties => ({ border: selected ? '1px solid #fed7aa' : '1px solid #e2e8f0', borderRadius: 999, background: selected ? '#fff7ed' : '#f8fafc', color: selected ? '#9a4d00' : '#475569', padding: '0.6rem 0.95rem', fontWeight: 800 });

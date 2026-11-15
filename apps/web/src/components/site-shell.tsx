'use client';

import { useEffect, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MarketplaceImageStrip } from '@/components/marketplace-image-strip';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Shops', href: '/shops' },
  { label: 'Nearby', href: '/nearby' },
  { label: 'Search', href: '/search' },
  { label: 'Videos', href: '/videos' },
  { label: 'Seller', href: '/seller' },
  { label: 'Account', href: '/account' }
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const adminTokenKey = 'shopradar-admin-token';
const adminShortcut = 'krevion.lxgo';

type SiteShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  immersive?: boolean;
  children: ReactNode;
};

export function SiteShell({ title, subtitle, action, immersive = false, children }: SiteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [appNoticeOpen, setAppNoticeOpen] = useState(false);
  const [adminUnlockOpen, setAdminUnlockOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminUnlockBusy, setAdminUnlockBusy] = useState(false);
  const [adminUnlockError, setAdminUnlockError] = useState('');

  const closeAppNoticeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') setAppNoticeOpen(false);
  };

  const closeAppNoticeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setAppNoticeOpen(false);
  };

  const openAdminUnlock = () => {
    setAdminUnlockOpen(true);
    setAdminUnlockError('');
  };

  const checkAdminShortcut = (input: HTMLInputElement) => {
    if (!isSearchInput(input) || input.value.trim().toLowerCase() !== adminShortcut) return false;
    if (!adminUnlockOpen) openAdminUnlock();
    return true;
  };

  const handleSearchInputChange = (event: FormEvent<HTMLElement>) => {
    if (event.target instanceof HTMLInputElement) checkAdminShortcut(event.target);
  };

  const handleSearchInputKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
    if (checkAdminShortcut(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLElement>) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const inputs = Array.from(form.querySelectorAll('input'));
    if (!inputs.some(checkAdminShortcut)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const unlockAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminUnlockBusy(true);
    setAdminUnlockError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const result = await response.json() as { accessToken: string };
      sessionStorage.setItem(adminTokenKey, result.accessToken);
      setAdminPassword('');
      setAdminUnlockOpen(false);
      router.push('/admin');
    } catch (reason) {
      setAdminPassword('');
      setAdminUnlockError(reason instanceof Error ? reason.message : 'Admin sign-in failed.');
    } finally {
      setAdminUnlockBusy(false);
    }
  };

  useEffect(() => {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return;
    void fetch(`${API_URL}/api/analytics/page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true
    }).catch(() => undefined);
  }, [pathname]);

  return (
    <main
      className={`shopradar-page-shell${immersive ? ' shopradar-page-shell-immersive' : ''}`}
      style={{ minHeight: '100vh', padding: immersive ? 0 : '1.5rem' }}
      onChangeCapture={handleSearchInputChange}
      onKeyDownCapture={handleSearchInputKeyDown}
      onSubmitCapture={handleSearchSubmit}
    >
      <div className={`shopradar-shell${immersive ? ' shopradar-shell-immersive' : ''}`}>
        <div className="shopradar-shell-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <header className="shopradar-header">
          <div className="shopradar-brand">
            <span className="shopradar-brand-mark">S</span>
            <span>
              <strong>Shop</strong>Radar
            </span>
          </div>

          <nav className="shopradar-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`shopradar-nav-link${pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)) ? ' is-active' : ''}`}
                aria-current={pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)) ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <button
            className="shopradar-primary-button"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={appNoticeOpen}
            onClick={() => setAppNoticeOpen(true)}
          >
            Get app
          </button>
        </header>

        {appNoticeOpen ? (
          <div
            className="shopradar-app-notice-backdrop"
            role="presentation"
            onMouseDown={closeAppNoticeOnBackdrop}
            onKeyDown={closeAppNoticeOnEscape}
          >
            <section
              className="shopradar-app-notice"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shopradar-app-notice-title"
            >
              <button
                className="shopradar-app-notice-close"
                type="button"
                aria-label="Close app availability notice"
                autoFocus
                onClick={() => setAppNoticeOpen(false)}
              >
                ×
              </button>
              <div className="shopradar-app-notice-orbit" aria-hidden="true"><span /></div>
              <p className="shopradar-app-notice-kicker"><span /> Launch update</p>
              <h2 id="shopradar-app-notice-title">The ShopRadar app is coming soon</h2>
              <p className="shopradar-app-notice-copy">
                It is not available to download yet. You can keep discovering local shops and products here on the website.
              </p>
              <button className="shopradar-app-notice-action" type="button" onClick={() => setAppNoticeOpen(false)}>
                Continue exploring
              </button>
            </section>
          </div>
        ) : null}

        {adminUnlockOpen ? (
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !adminUnlockBusy) setAdminUnlockOpen(false);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(8px)' }}
          >
            <section role="dialog" aria-modal="true" aria-labelledby="admin-unlock-title" style={{ width: 'min(100%, 420px)', display: 'grid', gap: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 20, background: '#fff', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.3)' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-orange)', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Restricted access</p>
                <h2 id="admin-unlock-title" style={{ margin: '0.35rem 0 0', fontSize: '1.4rem' }}>Administrator sign-in</h2>
                <p style={{ margin: '0.45rem 0 0', color: '#64748b' }}>Enter your admin password to open the private dashboard.</p>
              </div>
              <form onSubmit={unlockAdmin} style={{ display: 'grid', gap: '0.75rem' }}>
                <label htmlFor="shopradar-admin-password" style={{ color: '#334155', fontWeight: 700 }}>Admin password</label>
                <input
                  id="shopradar-admin-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  maxLength={72}
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.8rem', font: 'inherit' }}
                />
                <button type="submit" disabled={adminUnlockBusy} style={{ border: 0, borderRadius: 10, padding: '0.85rem', background: 'var(--color-orange)', color: '#fff', fontWeight: 800, cursor: adminUnlockBusy ? 'wait' : 'pointer' }}>
                  {adminUnlockBusy ? 'Verifying…' : 'Unlock dashboard'}
                </button>
                {adminUnlockError ? <p role="alert" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{adminUnlockError}</p> : null}
                <button type="button" disabled={adminUnlockBusy} onClick={() => setAdminUnlockOpen(false)} style={{ justifySelf: 'center', border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              </form>
            </section>
          </div>
        ) : null}

        <section className="shopradar-content">
          <div className="shopradar-hero-heading">
            <div className="shopradar-page-heading-copy">
              <div className="shopradar-kicker">Local discovery</div>
              <h1 className="shopradar-page-title">{title}</h1>
              {subtitle ? <p className="shopradar-page-subtitle">{subtitle}</p> : null}
            </div>
            {action ? <div className="shopradar-page-action">{action}</div> : null}
          </div>

          {!immersive ? <MarketplaceImageStrip /> : null}
          {children}
        </section>
        <footer className="shopradar-support-footer">
          <span>Need help?</span>
          <a href="https://wa.me/254710961554" target="_blank" rel="noopener noreferrer">
            WhatsApp support: 0710961554
          </a>
        </footer>
      </div>
    </main>
  );
}

function isSearchInput(input: HTMLInputElement) {
  const label = input.getAttribute('aria-label')?.toLowerCase() ?? '';
  const placeholder = input.placeholder.toLowerCase();
  const name = input.name.toLowerCase();
  return input.type === 'search'
    || name === 'q'
    || name === 'query'
    || name === 'search'
    || label.includes('search')
    || placeholder.includes('search')
    || placeholder.includes('looking for')
    || input.closest('.shopradar-search-bar') !== null;
}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

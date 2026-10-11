'use client';

import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Shops', href: '/shops' },
  { label: 'Nearby', href: '/nearby' },
  { label: 'Search', href: '/search' },
  { label: 'Videos', href: '/videos' },
  { label: 'Seller', href: '/seller' },
  { label: 'Admin', href: '/admin' },
  { label: 'Account', href: '/account' }
];

type SiteShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  immersive?: boolean;
  children: ReactNode;
};

export function SiteShell({ title, subtitle, action, immersive = false, children }: SiteShellProps) {
  const pathname = usePathname();
  const [appNoticeOpen, setAppNoticeOpen] = useState(false);

  const closeAppNoticeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') setAppNoticeOpen(false);
  };

  const closeAppNoticeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setAppNoticeOpen(false);
  };

  return (
    <main className={`shopradar-page-shell${immersive ? ' shopradar-page-shell-immersive' : ''}`} style={{ minHeight: '100vh', padding: immersive ? 0 : '1.5rem' }}>
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

        <section className="shopradar-content">
          <div className="shopradar-hero-heading">
            <div className="shopradar-page-heading-copy">
              <div className="shopradar-kicker">Local discovery</div>
              <h1 className="shopradar-page-title">{title}</h1>
              {subtitle ? <p className="shopradar-page-subtitle">{subtitle}</p> : null}
            </div>
            {action ? <div className="shopradar-page-action">{action}</div> : null}
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}

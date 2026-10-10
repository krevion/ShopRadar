'use client';

import type { ReactNode } from 'react';
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

          <button className="shopradar-primary-button">Get app</button>
        </header>

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

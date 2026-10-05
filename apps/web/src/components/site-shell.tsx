import type { ReactNode } from 'react';
import { navItems } from '@/lib/mock-data';

type SiteShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SiteShell({ title, subtitle, action, children }: SiteShellProps) {
  return (
    <main className="shopradar-page-shell" style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <div className="shopradar-shell">
        <header className="shopradar-header">
          <div className="shopradar-brand">
            <span className="shopradar-brand-mark">S</span>
            <span>
              <strong>Shop</strong>Radar
            </span>
          </div>

          <nav className="shopradar-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="shopradar-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <button className="shopradar-primary-button">Get app</button>
        </header>

        <section className="shopradar-content">
          <div className="shopradar-hero-heading">
            <div className="shopradar-kicker">Local discovery</div>
            <h1 className="shopradar-page-title">{title}</h1>
            {subtitle ? <p className="shopradar-page-subtitle">{subtitle}</p> : null}
            {action ? <div className="shopradar-page-action">{action}</div> : null}
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}

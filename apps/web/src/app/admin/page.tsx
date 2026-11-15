'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const tokenKey = 'shopradar-admin-token';

type DailyGrowth = { date: string; pageViews: number; customers: number; sellers: number };
type TopPage = { path: string; views: number };
type Overview = {
  generatedAt: string;
  users: number;
  customers: number;
  sellerAccounts: number;
  activeUsers: number;
  sellers: number;
  approvedSellers: number;
  pendingSellers: number;
  shops: number;
  products: number;
  orders: number;
  completedOrders: number;
  confirmedRevenue: number;
  pageViews: number;
  pageViews30d: number;
  newUsers30d: number;
  newCustomers30d: number;
  newSellers30d: number;
  newShops30d: number;
  newProducts30d: number;
  newOrders30d: number;
  videoViews: number;
  videoLikes: number;
  videoComments: number;
  sellerFavorites: number;
  sellerMessages: number;
  likes30d: number;
  comments30d: number;
  favorites30d: number;
  messages30d: number;
  dailyGrowth: DailyGrowth[];
  topPages: TopPage[];
};

const numberFormat = new Intl.NumberFormat();
const currencyFormat = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = sessionStorage.getItem(tokenKey) ?? '';
    if (!storedToken) {
      router.replace('/');
    } else {
      setToken(storedToken);
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!token) {
      setOverview(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await getErrorMessage(response);
          if (response.status === 401) {
            sessionStorage.removeItem(tokenKey);
            setToken('');
            router.replace('/');
          }
          throw new Error(message);
        }
        return response.json() as Promise<Overview>;
      })
      .then(setOverview)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Site analytics could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [router, token]);

  const signOut = () => {
    sessionStorage.removeItem(tokenKey);
    setToken('');
    setOverview(null);
    setError('');
    router.replace('/');
  };

  const refresh = () => {
    if (!token) return;
    setOverview(null);
    setLoading(true);
    setError('');
    void fetch(`${API_URL}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return response.json() as Promise<Overview>;
      })
      .then(setOverview)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Site analytics could not be refreshed.'))
      .finally(() => setLoading(false));
  };

  if (!authChecked) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Checking admin access…</main>;
  }

  if (!token) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Returning to ShopRadar…</main>;
  }

  const metrics = overview ? [
    { label: 'Customers', value: numberFormat.format(overview.customers), detail: `+${numberFormat.format(overview.newCustomers30d)} in 30 days`, accent: 'cyan' },
    { label: 'Seller profiles', value: numberFormat.format(overview.sellers), detail: `${numberFormat.format(overview.approvedSellers)} approved · ${numberFormat.format(overview.pendingSellers)} pending`, accent: 'orange' },
    { label: 'All accounts', value: numberFormat.format(overview.users), detail: `${numberFormat.format(overview.activeUsers)} active · +${numberFormat.format(overview.newUsers30d)} in 30 days`, accent: 'violet' },
    { label: 'Page views', value: numberFormat.format(overview.pageViews30d), detail: `${numberFormat.format(overview.pageViews)} recorded total`, accent: 'cyan' },
    { label: 'Live shops', value: numberFormat.format(overview.shops), detail: `+${numberFormat.format(overview.newShops30d)} in 30 days`, accent: 'orange' },
    { label: 'Products', value: numberFormat.format(overview.products), detail: `+${numberFormat.format(overview.newProducts30d)} in 30 days`, accent: 'violet' },
    { label: 'Orders', value: numberFormat.format(overview.orders), detail: `${numberFormat.format(overview.completedOrders)} completed · +${numberFormat.format(overview.newOrders30d)} in 30 days`, accent: 'cyan' },
    { label: 'Confirmed revenue', value: currencyFormat.format(overview.confirmedRevenue), detail: 'Payments confirmed by the provider', accent: 'orange' }
  ] : [];

  const maxActivity = Math.max(1, ...(overview?.dailyGrowth.map((day) => Math.max(day.pageViews, day.customers, day.sellers)) ?? [1]));

  return (
    <SiteShell
      title="Site analytics"
      subtitle="Growth, customer activity, seller performance, and marketplace health."
      action={(
        <div className="shopradar-admin-actions">
          <button type="button" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      )}
    >
      {error ? <div role="alert" className="shopradar-admin-error-panel"><strong>Analytics unavailable</strong><span>{error}</span></div> : null}
      {loading && !overview ? <p className="shopradar-admin-muted">Loading live site analytics…</p> : null}
      {overview ? (
        <div className="shopradar-admin-dashboard">
          <section className="shopradar-admin-metrics" aria-label="Marketplace totals">
            {metrics.map((metric) => (
              <article key={metric.label} className={`shopradar-admin-metric is-${metric.accent}`}>
                <div className="shopradar-admin-metric-label">{metric.label}</div>
                <strong>{metric.value}</strong>
                <span>{metric.detail}</span>
              </article>
            ))}
          </section>

          <section className="shopradar-admin-panel">
            <div className="shopradar-admin-panel-heading">
              <div><p className="shopradar-admin-eyebrow">Last 30 days</p><h2>Growth and traffic</h2></div>
              <span className="shopradar-admin-updated">Updated {new Date(overview.generatedAt).toLocaleString()}</span>
            </div>
            <div className="shopradar-admin-legend" aria-hidden="true">
              <span><i className="is-page-view" /> Page views</span>
              <span><i className="is-customer" /> New customers</span>
              <span><i className="is-seller" /> New sellers</span>
            </div>
            <div className="shopradar-admin-growth-chart" role="img" aria-label="Daily page views, customer registrations, and seller registrations over the last 30 days">
              {overview.dailyGrowth.map((day, index) => (
                <div className="shopradar-admin-growth-day" key={day.date} title={`${day.date}: ${day.pageViews} page views, ${day.customers} customers, ${day.sellers} sellers`}>
                  <div className="shopradar-admin-growth-bars">
                    <i className="is-page-view" style={{ height: `${Math.max(day.pageViews ? 5 : 2, day.pageViews / maxActivity * 100)}%` }} />
                    <i className="is-customer" style={{ height: `${Math.max(day.customers ? 5 : 2, day.customers / maxActivity * 100)}%` }} />
                    <i className="is-seller" style={{ height: `${Math.max(day.sellers ? 5 : 2, day.sellers / maxActivity * 100)}%` }} />
                  </div>
                  {index % 5 === 0 || index === 29 ? <small>{new Date(`${day.date}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</small> : <small aria-hidden="true">&nbsp;</small>}
                </div>
              ))}
            </div>
            <p className="shopradar-admin-footnote">Page visits are recorded without visitor IDs or IP addresses. Admin pages are excluded.</p>
          </section>

          <div className="shopradar-admin-lower-grid">
            <section className="shopradar-admin-panel">
              <div className="shopradar-admin-panel-heading"><div><p className="shopradar-admin-eyebrow">Shopper engagement</p><h2>Usage signals</h2></div></div>
              <div className="shopradar-admin-usage-grid">
                <UsageMetric label="Video plays" total={overview.videoViews} recent={null} />
                <UsageMetric label="Video likes" total={overview.videoLikes} recent={overview.likes30d} />
                <UsageMetric label="Video comments" total={overview.videoComments} recent={overview.comments30d} />
                <UsageMetric label="Seller favorites" total={overview.sellerFavorites} recent={overview.favorites30d} />
                <UsageMetric label="Shopper messages" total={overview.sellerMessages} recent={overview.messages30d} />
                <UsageMetric label="Seller accounts" total={overview.sellerAccounts} recent={overview.newSellers30d} />
              </div>
            </section>

            <section className="shopradar-admin-panel">
              <div className="shopradar-admin-panel-heading"><div><p className="shopradar-admin-eyebrow">Most visited</p><h2>Popular pages</h2></div></div>
              {overview.topPages.length ? (
                <ol className="shopradar-admin-top-pages">
                  {overview.topPages.map((page) => <li key={page.path}><code>{page.path}</code><strong>{numberFormat.format(page.views)}</strong></li>)}
                </ol>
              ) : <p className="shopradar-admin-muted">Page view data will appear as visitors explore the site.</p>}
            </section>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}

function UsageMetric({ label, total, recent }: { label: string; total: number; recent: number | null }) {
  return (
    <div className="shopradar-admin-usage-item">
      <span>{label}</span>
      <strong>{numberFormat.format(total)}</strong>
      {recent !== null ? <small>{numberFormat.format(recent)} in 30 days</small> : <small>all time</small>}
    </div>
  );
}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(body?.message) ? body.message.join(' ') : body?.message ?? `Request failed (${response.status}).`;
}

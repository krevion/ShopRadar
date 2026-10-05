'use client';

import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

type VideoAnalytics = {
  videoCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  messages: Array<{ id: string; body: string; sender: string; createdAt: string }>;
  videos: Array<{
    id: string;
    title: string;
    category: string;
    views: number;
    likes: number;
    comments: number;
    createdAt: string;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const numberFormat = new Intl.NumberFormat();

export default function SellerDashboardPage() {
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setError('Sign in with your seller account to view video analytics.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/sellers/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { message?: string | string[] } | VideoAnalytics | null;
        if (!response.ok) {
          const message = payload && 'message' in payload
            ? Array.isArray(payload.message) ? payload.message.join(' ') : payload.message
            : `Analytics could not be loaded (${response.status}).`;
          throw new Error(message);
        }
        return payload as VideoAnalytics;
      })
      .then(setAnalytics)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Analytics could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = analytics ? [
    { label: 'Video plays', value: numberFormat.format(analytics.totalViews), hint: 'Total plays across your videos' },
    { label: 'Published videos', value: numberFormat.format(analytics.videoCount), hint: 'Live in the public Reels feed' },
    { label: 'Likes', value: numberFormat.format(analytics.totalLikes), hint: 'On your published videos' },
    { label: 'Comments', value: numberFormat.format(analytics.totalComments), hint: 'On your published videos' }
  ] : [];

  return (
    <SiteShell
      title="Seller dashboard"
      subtitle="Track the traffic your videos bring to your shop."
      action={<a href="/seller/videos" style={{ background: 'var(--color-orange)', color: '#fff', borderRadius: 12, padding: '0.8rem 1.1rem', fontWeight: 800 }}>Create a video</a>}
    >
      {loading ? <p style={{ color: '#64748b' }}>Loading your video analytics…</p> : null}
      {error ? (
        <section style={{ display: 'grid', justifyItems: 'start', gap: '0.8rem', padding: '1.25rem', border: '1px solid #fed7aa', borderRadius: 16, background: '#fff7ed' }}>
          <strong style={{ color: '#9a4d00' }}>Video analytics unavailable</strong>
          <span style={{ color: '#475569' }}>{error}</span>
          <a href="/seller/register" style={{ color: '#9a4d00', fontWeight: 800 }}>Seller sign in →</a>
        </section>
      ) : null}
      {analytics ? (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {metrics.map((metric) => (
              <article key={metric.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{metric.label}</div>
                <div style={{ marginTop: '0.45rem', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em' }}>{metric.value}</div>
                <div style={{ marginTop: '0.35rem', color: '#64748b', fontSize: '0.78rem' }}>{metric.hint}</div>
              </article>
            ))}
          </section>

          <section style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: 'var(--color-orange)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Audience reach</div>
                <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.25rem' }}>Traffic by video</h2>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Live play counts</span>
            </div>
            {analytics.videos.length ? (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {analytics.videos.map((video) => {
                  const largestViewCount = Math.max(1, ...analytics.videos.map((item) => item.views));
                  return (
                    <article key={video.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.45rem 1rem', alignItems: 'center', borderBottom: '1px solid #edf1f5', paddingBottom: '0.8rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</strong>
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{video.category} · {new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                      <strong>{numberFormat.format(video.views)} plays</strong>
                      <div style={{ gridColumn: '1 / -1', height: 7, overflow: 'hidden', borderRadius: 99, background: '#edf1f5' }}>
                        <div style={{ width: `${Math.max(2, (video.views / largestViewCount) * 100)}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--color-orange), #ffb26e)' }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>Publish a short video to start seeing its play count here.</p>
            )}
          </section>
          <section style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.1rem' }}>
            <div style={{ color: 'var(--color-orange)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Inbox</div>
            <h2 style={{ margin: '0.25rem 0 1rem', fontSize: '1.25rem' }}>Shopper messages</h2>
            {analytics.messages.length ? (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {analytics.messages.map((message) => (
                  <article key={message.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <strong>{message.sender}</strong>
                      <small style={{ color: '#64748b' }}>{new Date(message.createdAt).toLocaleString()}</small>
                    </div>
                    <p style={{ margin: '0.45rem 0 0', color: '#475569', whiteSpace: 'pre-wrap' }}>{message.body}</p>
                  </article>
                ))}
              </div>
            ) : <p style={{ margin: 0, color: '#64748b' }}>Shopper messages will show up here.</p>}
          </section>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Video plays are recorded by the API when a viewer starts playback. Counts update when this dashboard is refreshed.</p>
        </div>
      ) : null}
    </SiteShell>
  );
}

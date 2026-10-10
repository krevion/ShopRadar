'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type SearchResult = { id: string; type: 'product' | 'shop' | 'seller'; name: string; match: number; category?: string; city?: string | null; shop?: string };

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get('q')?.slice(0, 100) ?? '';
    if (initialQuery) {
      setQuery(initialQuery);
      setSubmittedQuery(initialQuery);
    }
  }, []);

  useEffect(() => {
    const normalized = submittedQuery.trim();
    if (!normalized) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: normalized });
      fetch(`${API_URL}/api/search?${params}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Search failed (${response.status}).`);
          return response.json() as Promise<SearchResult[]>;
        })
        .then(setResults)
        .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Search could not be completed.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [submittedQuery]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query);
  };

  return (
    <SiteShell
      title="Search"
      subtitle="Search live products, approved shops, and sellers in one place."
      action={
        <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            aria-label="Search products, shops, and sellers"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products or shops"
            maxLength={100}
            style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '0.8rem 1rem', minWidth: 250 }}
          />
          <button type="submit" style={{ background: 'var(--color-orange)', color: '#fff', border: 0, borderRadius: 12, padding: '0.8rem 1rem', fontWeight: 700 }}>Search</button>
        </form>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? <p>Searching ShopRadar…</p> : null}
        {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
        {!loading && !error && submittedQuery && results.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed var(--color-border)', borderRadius: 16, padding: '1.2rem', color: '#64748b' }}>
            No live listings matched “{submittedQuery}”. Try a different product or shop name.
          </div>
        ) : null}
        {results.map((result) => (
          <article key={`${result.type}-${result.id}`} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#0e7490', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase' }}>{result.type}</span>
              <h2 style={{ margin: '0.2rem 0', fontSize: '1.1rem' }}>{result.name}</h2>
              <span style={{ color: '#64748b', fontSize: '0.88rem' }}>{[result.category, result.shop, result.city].filter(Boolean).join(' · ')}</span>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.82rem' }}>{result.match}% match</span>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}

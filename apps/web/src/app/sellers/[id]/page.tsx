'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { ShopLocationMap, type ShopMapPoint } from '@/components/shop-location-map';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type SellerProfile = {
  id: string;
  shopName: string;
  name: string;
  providerType: 'SHOP' | 'SERVICE_PROVIDER';
  serviceCategory?: string | null;
  serviceArea?: string | null;
  contactPhone?: string | null;
  bio?: string | null;
  locationLabel?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  street?: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  jobs: Array<{
    id: string;
    title: string;
    description: string;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
    location: string | null;
    salaryRange: string | null;
    requirements: string | null;
    createdAt: string;
  }>;
};

export default function PublicSellerPage() {
  const params = useParams<{ id: string }>();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/sellers/${encodeURIComponent(params.id)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        if (!response.ok) throw new Error(payload?.message ?? 'This seller could not be found.');
        return payload as SellerProfile;
      })
      .then((profile) => { if (!cancelled) setSeller(profile); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'This seller could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  const mapMarkers = useMemo<ShopMapPoint[]>(() => seller && Number.isFinite(seller.latitude) && Number.isFinite(seller.longitude)
    ? [{ id: seller.id, name: seller.shopName, latitude: seller.latitude!, longitude: seller.longitude!, locationLabel: seller.locationLabel, buildingName: seller.buildingName, roomNumber: seller.roomNumber, street: seller.street }]
    : [], [seller]);

  return (
    <SiteShell title={seller?.shopName ?? (loading ? 'Seller profile' : 'Seller not found')} subtitle={seller ? `${seller.providerType === 'SERVICE_PROVIDER' ? 'Service provider' : 'Shop'}${seller.verified ? ' · Verified' : ''}` : undefined}>
      {error ? <section role="status" style={panelStyle}><strong>Seller unavailable</strong><p style={{ marginBottom: 0, color: '#64748b' }}>{error}</p></section> : null}
      {seller ? <div style={{ display: 'grid', gap: '1rem' }}>
        <section style={panelStyle}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{seller.shopName}</strong>
            {seller.verified ? <span style={verifiedStyle}>Verified seller</span> : null}
          </div>
          {seller.providerType === 'SERVICE_PROVIDER' && seller.serviceCategory ? <p style={{ margin: 0, color: '#475569' }}><strong>Service:</strong> {seller.serviceCategory}</p> : null}
          {seller.providerType === 'SERVICE_PROVIDER' && seller.serviceArea ? <p style={{ margin: 0, color: '#475569' }}><strong>Service area:</strong> {seller.serviceArea}</p> : null}
          {seller.bio ? <p style={{ color: '#475569', lineHeight: 1.6 }}>{seller.bio}</p> : null}
          {seller.contactPhone ? <a href={`https://wa.me/${whatsappNumber(seller.contactPhone)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#166534', fontWeight: 800, width: 'fit-content' }}>WhatsApp {seller.shopName}</a> : null}
          {seller.buildingName ? <p style={{ margin: 0, color: '#475569' }}><strong>Building:</strong> {seller.buildingName}</p> : null}
          {seller.roomNumber ? <p style={{ margin: 0, color: '#475569' }}><strong>Room / unit:</strong> {seller.roomNumber}</p> : null}
          {seller.street ? <p style={{ margin: 0, color: '#475569' }}><strong>Street:</strong> {seller.street}</p> : null}
          <p style={{ margin: 0, color: '#64748b' }}>{seller.locationLabel ?? (mapMarkers.length ? `${seller.latitude?.toFixed(5)}, ${seller.longitude?.toFixed(5)}` : 'This seller has not added a shop location yet.')}</p>
        </section>
        {mapMarkers.length ? <section style={{ ...panelStyle, display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{seller.providerType === 'SERVICE_PROVIDER' ? 'Service area map' : 'Find this shop'}</h2>
          <ShopLocationMap markers={mapMarkers} height={420} />
          <a href={`https://www.google.com/maps/search/?api=1&query=${seller.latitude},${seller.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#9a4d00', fontWeight: 800, width: 'fit-content' }}>Get directions ↗</a>
        </section> : null}
        {seller.jobs.length ? <section style={{ ...panelStyle, gap: 14 }}>
          <div>
            <div style={{ color: 'var(--color-orange)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>We&apos;re hiring</div>
            <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.3rem' }}>Open positions</h2>
          </div>
          {seller.jobs.map((job) => (
            <article key={job.id} style={{ display: 'grid', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{job.title}</h3>
              <p style={{ margin: 0, color: '#64748b' }}>{formatEmploymentType(job.employmentType)}{job.location ? ` · ${job.location}` : ''}{job.salaryRange ? ` · ${job.salaryRange}` : ''}</p>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.description}</p>
              {job.requirements ? <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}><strong>Requirements:</strong> {job.requirements}</p> : null}
              {seller.contactPhone ? <a href={`https://wa.me/${whatsappNumber(seller.contactPhone)}?text=${encodeURIComponent(`Hello ${seller.shopName}, I am interested in the ${job.title} position.`)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#166534', fontWeight: 800, width: 'fit-content' }}>Apply via WhatsApp →</a> : <p style={{ margin: 0, color: '#64748b' }}>Contact the business to apply.</p>}
            </article>
          ))}
        </section> : null}
      </div> : null}
    </SiteShell>
  );
}

function whatsappNumber(phone: string) {
  return phone.replace(/\D/g, '');
}

function formatEmploymentType(type: SellerProfile['jobs'][number]['employmentType']) {
  return type.toLowerCase().replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const panelStyle: React.CSSProperties = { display: 'grid', gap: 10, border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.2rem', background: '#fff' };
const verifiedStyle: React.CSSProperties = { borderRadius: 999, padding: '0.3rem 0.7rem', background: '#ecfdf5', color: '#166534', fontWeight: 700, fontSize: 13 };

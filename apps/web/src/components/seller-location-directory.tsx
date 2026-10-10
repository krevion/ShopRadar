'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ShopLocationMap, type ShopMapPoint } from '@/components/shop-location-map';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const NEARBY_RADIUS_KM = 10;

type Seller = ShopMapPoint & {
  business: string;
  verified: boolean;
  status: string;
};

export function SellerLocationDirectory() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number; heading: number | null } | null>(null);
  const [locating, setLocating] = useState(false);
  const watchId = useRef<number | null>(null);

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/sellers`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Shop locations could not be loaded.');
        return response.json() as Promise<Seller[]>;
      })
      .then((data) => { if (!cancelled) setSellers(data); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Shop locations could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const mappedSellers = useMemo(() => sellers
    .filter((seller) => Number.isFinite(seller.latitude) && Number.isFinite(seller.longitude))
    .map((seller) => ({ ...seller, href: `/sellers/${encodeURIComponent(seller.id)}` })), [sellers]);

  const sortedSellers = useMemo(() => {
    if (!userLocation) return sellers;
    const distance = (seller: Seller) => Number.isFinite(seller.latitude) && Number.isFinite(seller.longitude)
      ? distanceKm(userLocation.latitude, userLocation.longitude, seller.latitude, seller.longitude)
      : Number.POSITIVE_INFINITY;
    return [...sellers].sort((a, b) => distance(a) - distance(b));
  }, [sellers, userLocation]);

  const nearbySellers = useMemo(() => userLocation
    ? mappedSellers.filter((seller) => distanceKm(userLocation.latitude, userLocation.longitude, seller.latitude, seller.longitude) <= NEARBY_RADIUS_KM)
    : mappedSellers,
  [mappedSellers, userLocation]);

  const findNearby = () => {
    if (!navigator.geolocation) {
      setError('This browser does not support location sharing. You can still browse the map.');
      return;
    }
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setLocating(true);
    setError('');
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading
        });
        setLocating(false);
        setError('');
      },
      (reason) => {
        setLocating(false);
        setError(reason.code === reason.PERMISSION_DENIED
          ? 'Location permission was not granted. Allow location access in your browser to see your position.'
          : 'Your current location could not be determined. Check device location settings and try again.');
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  };

  const mapPoints: ShopMapPoint[] = userLocation
    ? [
      ...nearbySellers.map((seller) => ({ ...seller, kind: 'shop' as const })),
      { id: 'your-location', name: 'You are here', latitude: userLocation.latitude, longitude: userLocation.longitude, kind: 'user', accuracyMeters: userLocation.accuracy, heading: userLocation.heading }
    ]
    : mappedSellers.map((seller) => ({ ...seller, kind: 'shop' as const }));

  return (
    <div className="radar-explorer">
      <section className="radar-intro" aria-labelledby="radar-intro-title">
        <div className="radar-intro-copy">
          <div className="radar-live-label"><span /> ShopRadar / local discovery</div>
          <h2 id="radar-intro-title">Find your next favorite <em>around the corner.</em></h2>
          <p>Explore local storefronts, see what is nearby, and get a direct route to the shops you want to visit.</p>
          <div className="radar-feature-pills" aria-label="Map features">
            <span><i className="radar-pill-dot radar-pill-orange" />Live shop map</span>
            <span><i className="radar-pill-dot radar-pill-cyan" />Direct directions</span>
          </div>
        </div>
        <div className="radar-orbit-art" aria-hidden="true">
          <div className="radar-orbit-grid" />
          <div className="radar-orbit radar-orbit-outer"><span className="radar-orbit-satellite satellite-one" /><span className="radar-orbit-satellite satellite-two" /></div>
          <div className="radar-orbit radar-orbit-inner"><span className="radar-orbit-satellite satellite-three" /></div>
          <div className="radar-orbit-core"><span className="radar-core-pulse" /><svg viewBox="0 0 48 48" fill="none"><path d="M24 42s14-13.4 14-25a14 14 0 1 0-28 0c0 11.6 14 25 14 25Z" stroke="currentColor" strokeWidth="2.5"/><circle cx="24" cy="17" r="5" stroke="currentColor" strokeWidth="2.5"/><path d="M30.5 31.5 39 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></div>
          <div className="radar-float-tag radar-float-tag-top"><span className="radar-float-icon">+</span><span><strong>LOCAL SIGNAL</strong><small>Shops in your orbit</small></span></div>
          <div className="radar-float-tag radar-float-tag-bottom"><span className="radar-wave-icon"><i /><i /><i /></span><span><strong>DISCOVER MORE</strong><small>Your city, mapped</small></span></div>
        </div>
      </section>

      <div className="radar-toolbar">
        <div className="radar-location-status">
          <span className={`radar-status-beacon${userLocation ? ' is-active' : ''}`} />
          <span>{loading ? 'Scanning for local shops...' : userLocation
            ? `${nearbySellers.length} shop${nearbySellers.length === 1 ? '' : 's'} within ${NEARBY_RADIUS_KM} km`
            : `${mappedSellers.length} shop${mappedSellers.length === 1 ? '' : 's'} mapped and ready to explore`}</span>
        </div>
        <button type="button" onClick={findNearby} disabled={locating} className="radar-locate-button">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          {locating ? 'Locating you...' : userLocation ? 'Refresh my location' : 'Find shops near me'}
        </button>
      </div>
      {error ? <p role="status" className="radar-alert">{error}</p> : null}

      <section className="radar-map-panel" aria-labelledby="radar-map-title">
        <div className="radar-map-heading">
          <div><span className="radar-section-kicker">Explore the area</span><h2 id="radar-map-title">Shop map</h2></div>
          <span className={`radar-map-state${userLocation ? ' is-active' : ''}`}><i />{userLocation ? 'Location synced' : 'Map online'}</span>
        </div>
        {userLocation ? <div className="radar-map-legend" role="status"><span><i className="radar-legend-blue" />You are here <small>+/- {Math.round(userLocation.accuracy)} m</small></span><span><i className="radar-legend-orange" />Nearby shops</span></div> : null}
        <div className="radar-map-frame"><ShopLocationMap markers={mapPoints} height={480} /></div>
      </section>

      <section className="radar-shops-section" aria-labelledby="radar-shops-title">
        <div className="radar-shops-heading">
          <div><span className="radar-section-kicker">Curated around you</span><h2 id="radar-shops-title">Shops in your orbit</h2></div>
          {!loading ? <span className="radar-results-count">{sortedSellers.length} {sortedSellers.length === 1 ? 'place' : 'places'}</span> : null}
        </div>
        {loading ? <div className="radar-empty-state"><span className="radar-loading-orbit" /><strong>Scanning the neighborhood</strong><span>Finding shops to put on your map.</span></div> : sortedSellers.length ? <div className="radar-shop-grid">
          {sortedSellers.map((seller, index) => {
            const hasLocation = Number.isFinite(seller.latitude) && Number.isFinite(seller.longitude);
            const distance = hasLocation && userLocation
              ? distanceKm(userLocation.latitude, userLocation.longitude, seller.latitude, seller.longitude)
              : null;
            return <article key={seller.id} className="radar-shop-card" style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
              <div className="radar-shop-card-top"><span className="radar-shop-glyph"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M4 10.5h16v10H4zM3 10.5 5 4h14l2 6.5M8 10.5v10m8-10v10M3 10.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg></span>{seller.verified ? <span className="radar-verified"><i />Verified</span> : null}</div>
              <h3>{seller.business}</h3>
              <p className="radar-shop-address"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M10 18s6-5.7 6-10.5a6 6 0 1 0-12 0C4 12.3 10 18 10 18Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>{formatSellerAddress(seller) || (hasLocation ? `${seller.latitude.toFixed(5)}, ${seller.longitude.toFixed(5)}` : 'Location not added yet')}</p>
              <div className="radar-shop-card-footer">
                {distance !== null ? <span className="radar-distance"><i />{distance.toFixed(1)} km away</span> : <span className="radar-distance radar-distance-muted">{hasLocation ? 'Map location available' : 'Location pending'}</span>}
                <div className="radar-shop-actions"><a className="radar-shop-view" href={`/sellers/${encodeURIComponent(seller.id)}`}>View shop <span aria-hidden="true">&#8599;</span></a>{hasLocation ? <a className="radar-shop-directions" href={directionsUrl(seller.latitude, seller.longitude)} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${seller.business}`} title="Get directions"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M10 18s6-5.7 6-10.5a6 6 0 1 0-12 0C4 12.3 10 18 10 18Z" stroke="currentColor" strokeWidth="1.7"/><circle cx="10" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.7"/></svg></a> : null}</div>
              </div>
            </article>;
          })}
        </div> : <div className="radar-empty-state"><span className="radar-empty-glyph">+</span><strong>No shops detected yet</strong><span>Local storefronts will appear here as they join ShopRadar.</span></div>}
        {!loading && sellers.length > mappedSellers.length ? <p className="radar-map-note">Some shops have not added a precise map location, so they cannot appear as pins or provide directions yet.</p> : null}
      </section>
    </div>
  );
}

function directionsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function formatSellerAddress(seller: Seller) {
  return [
    seller.buildingName,
    seller.roomNumber ? `Room ${seller.roomNumber}` : null,
    seller.street,
    seller.locationLabel
  ].map((part) => part?.trim()).filter(Boolean).join(', ');
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lon2 - lon1);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

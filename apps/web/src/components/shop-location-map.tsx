'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { type CSSProperties, type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

export type ShopLocation = {
  latitude: number;
  longitude: number;
  locationLabel?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  street?: string | null;
};

export type ShopMapPoint = ShopLocation & {
  id: string;
  name: string;
  href?: string;
  kind?: 'shop' | 'user';
  accuracyMeters?: number;
  heading?: number | null;
};

type ShopLocationMapProps = {
  markers?: ShopMapPoint[];
  selectedLocation?: ShopLocation | null;
  onLocationSelect?: (location: ShopLocation) => void;
  height?: number;
};

type SearchFeature = {
  id: string;
  name: string;
  place_formatted?: string;
  properties?: { full_address?: string; name?: string };
  geometry: { coordinates: [number, number] };
};

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const nairobi: [number, number] = [36.8219, -1.2921];

export function ShopLocationMap({ markers = [], selectedLocation, onLocationSelect, height = 440 }: ShopLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackViewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof import('mapbox-gl').default | null>(null);
  const pickerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const shopMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const markersRef = useRef(markers);
  const drawMarkersRef = useRef<() => void>(() => undefined);
  const selectedRef = useRef(selectedLocation);
  const onSelectRef = useRef(onLocationSelect);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchFeature[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapError, setMapError] = useState('');
  const [useFallbackMap, setUseFallbackMap] = useState(!token);
  const [fallbackZoom, setFallbackZoom] = useState(13);
  const [fallbackWidth, setFallbackWidth] = useState(800);

  const fallbackCenter: [number, number] = selectedLocation
    ? [selectedLocation.longitude, selectedLocation.latitude]
    : markers.length
      ? [markers[0].longitude, markers[0].latitude]
      : nairobi;
  const fallbackBounds = getFallbackBounds(fallbackCenter, fallbackZoom, fallbackWidth, height);
  const fallbackMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${fallbackBounds}&layer=mapnik${selectedLocation ? `&marker=${selectedLocation.latitude}%2C${selectedLocation.longitude}` : ''}`;

  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => {
    const viewport = fallbackViewportRef.current;
    if (!viewport) return;
    const resizeObserver = new ResizeObserver(([entry]) => setFallbackWidth(entry.contentRect.width));
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [useFallbackMap]);
  markersRef.current = markers;
  selectedRef.current = selectedLocation;

  const selectPoint = useCallback((longitude: number, latitude: number, locationLabel?: string) => {
    const map = mapRef.current;
    if (!onSelectRef.current) return;
    pickerMarkerRef.current?.remove();
    const marker = mapboxRef.current;
    if (map && marker) {
      pickerMarkerRef.current = new marker.Marker({ color: '#ff7a1a', draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);
      pickerMarkerRef.current.on('dragend', () => {
        const point = pickerMarkerRef.current?.getLngLat();
        if (point) onSelectRef.current?.({ longitude: point.lng, latitude: point.lat, locationLabel });
      });
      map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 14) });
    }
    onSelectRef.current({ longitude, latitude, locationLabel });
  }, []);

  const selectFallbackPoint = (event: MouseEvent<HTMLButtonElement>) => {
    if (!onLocationSelect || !fallbackViewportRef.current) return;
    const rect = fallbackViewportRef.current.getBoundingClientRect();
    const [longitude, latitude] = unprojectMapPoint(
      fallbackCenter,
      fallbackZoom,
      event.clientX - rect.left - rect.width / 2,
      event.clientY - rect.top - rect.height / 2
    );
    selectPoint(longitude, latitude);
  };

  useEffect(() => {
    let disposed = false;
    if (!token || !containerRef.current) {
      setUseFallbackMap(true);
      setMapError('Using OpenStreetMap because a Mapbox token is not configured.');
      return;
    }

    void import('mapbox-gl').then((module) => {
      if (disposed || !containerRef.current) return;
      const mapbox = module.default;
      mapboxRef.current = mapbox;
      const initialCenter: [number, number] = selectedRef.current
        ? [selectedRef.current.longitude, selectedRef.current.latitude]
        : markersRef.current.length
          ? [markersRef.current[0].longitude, markersRef.current[0].latitude]
          : nairobi;
      const map = new mapbox.Map({
        accessToken: token,
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: selectedRef.current ? 14 : markersRef.current.length ? 11 : 11,
        attributionControl: true
      });
      mapRef.current = map;
      map.addControl(new mapbox.NavigationControl(), 'top-right');

      if (onSelectRef.current) {
        map.on('click', (event) => selectPoint(event.lngLat.lng, event.lngLat.lat));
      }

      map.on('error', (event) => {
        const message = event.error?.message ?? '';
        if (/401|403|unauthori[sz]ed|access token|not authorized/i.test(message)) {
          map.remove();
          mapRef.current = null;
          if (!disposed) {
            setUseFallbackMap(true);
            setMapError('Mapbox could not authorize its token, so the map is using OpenStreetMap.');
          }
        }
      });

      map.on('load', () => drawMarkersRef.current());
    }).catch(() => {
      if (!disposed) setMapError('The map could not load. Check your Mapbox token and network connection.');
    });

    return () => {
      disposed = true;
      pickerMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [selectPoint]);

  useEffect(() => {
    drawMarkersRef.current = () => {
      const map = mapRef.current;
      const mapbox = mapboxRef.current;
      if (!map || !mapbox || !map.isStyleLoaded()) return;
      shopMarkersRef.current.forEach((marker) => marker.remove());
      shopMarkersRef.current = markers.map((point) => {
        const isUser = point.kind === 'user';
        const directions = directionsUrl(point.latitude, point.longitude);
        const popupContent = isUser
          ? `<strong>Your location</strong>${point.accuracyMeters ? `<br>Accuracy: about ${Math.round(point.accuracyMeters)} m` : ''}`
          : `<strong>${escapeHtml(point.name)}</strong>${formatLocationAddress(point) ? `<br>${escapeHtml(formatLocationAddress(point))}` : ''}${point.href ? `<br><a href="${escapeAttribute(point.href)}">View shop</a>` : ''}<br><a href="${directions}" target="_blank" rel="noopener noreferrer">Get directions</a>`;
        const popup = new mapbox.Popup({ offset: isUser ? 30 : 22 }).setHTML(popupContent);
        return new mapbox.Marker({
          element: createMapMarker(point),
          anchor: isUser ? 'bottom' : 'center'
        })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(popup)
          .addTo(map);
      });
      if (markers.length > 1) {
        const bounds = new mapbox.LngLatBounds();
        markers.forEach((point) => bounds.extend([point.longitude, point.latitude]));
        map.fitBounds(bounds, { padding: 64, maxZoom: 14 });
      } else if (markers.length === 1) {
        map.flyTo({ center: [markers[0].longitude, markers[0].latitude], zoom: Math.max(map.getZoom(), 14) });
      }
    };
    if (mapRef.current?.isStyleLoaded()) drawMarkersRef.current();
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    const mapbox = mapboxRef.current;
    if (!map || !mapbox || !selectedLocation || !onLocationSelect) return;
      pickerMarkerRef.current?.remove();
      shopMarkersRef.current.forEach((marker) => marker.remove());
    pickerMarkerRef.current = new mapbox.Marker({ color: '#ff7a1a', draggable: true })
      .setLngLat([selectedLocation.longitude, selectedLocation.latitude])
      .addTo(map);
    pickerMarkerRef.current.on('dragend', () => {
      const point = pickerMarkerRef.current?.getLngLat();
      if (point) onSelectRef.current?.({ ...selectedLocation, longitude: point.lng, latitude: point.lat });
    });
  }, [selectedLocation?.latitude, selectedLocation?.longitude, onLocationSelect]);

  const searchPlaces = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setMapError('');
    try {
      if (token && !useFallbackMap) {
        const params = new URLSearchParams({ q: query.trim(), country: 'ke', limit: '5', permanent: 'true', access_token: token });
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
        if (response.ok) {
          const payload = await response.json() as { features?: SearchFeature[] };
          setResults(payload.features ?? []);
          if (payload.features?.length) return;
        }
        setUseFallbackMap(true);
      }

      const params = new URLSearchParams({ q: `${query.trim()}, Kenya`, format: 'jsonv2', limit: '5' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Location search failed. Please try again.');
      const places = await response.json() as Array<{ place_id: number; display_name: string; lat: string; lon: string }>;
      setResults(places.map((place) => ({
        id: String(place.place_id),
        name: place.display_name.split(',')[0],
        place_formatted: place.display_name,
        properties: { full_address: place.display_name, name: place.display_name.split(',')[0] },
        geometry: { coordinates: [Number(place.lon), Number(place.lat)] }
      })));
      if (!places.length) setMapError('No locations found. Try a nearby landmark or neighborhood.');
    } catch (error) {
      setMapError(error instanceof Error ? error.message : 'Location search failed.');
    } finally {
      setSearching(false);
    }
  };

  const chooseResult = (feature: SearchFeature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const locationLabel = feature.properties?.full_address ?? feature.place_formatted ?? feature.name;
    setResults([]);
    setQuery(locationLabel);
    selectPoint(longitude, latitude, locationLabel);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {onLocationSelect ? <div>
        <div role="search" style={{ display: 'flex', gap: 8 }}>
          <input aria-label="Search Kenyan locations" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchPlaces(); } }} placeholder="Search a Kenyan address, area, or landmark" style={inputStyle} />
          <button type="button" onClick={() => void searchPlaces()} disabled={searching} style={searchButtonStyle}>{searching ? 'Searching…' : 'Search'}</button>
        </div>
        {results.length > 0 ? <div role="listbox" aria-label="Location search results" style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {results.map((feature) => <button key={feature.id} type="button" role="option" onClick={() => chooseResult(feature)} style={resultStyle}>
            <strong>{feature.properties?.name ?? feature.name}</strong><span style={{ color: '#64748b' }}>{feature.properties?.full_address ?? feature.place_formatted}</span>
          </button>)}
        </div> : null}
      </div> : null}
      {useFallbackMap ? (
        <div ref={fallbackViewportRef} style={{ position: 'relative', width: '100%', height, borderRadius: 16, overflow: 'hidden', background: '#e7edf4' }}>
          <iframe
            title={onLocationSelect ? 'OpenStreetMap for choosing your shop location' : 'OpenStreetMap showing shop locations'}
            src={fallbackMapUrl}
            style={{ width: '100%', height: '100%', border: 0, background: '#e7edf4', pointerEvents: onLocationSelect ? 'none' : 'auto' }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {markers.map((point) => {
            const [centerX, centerY] = projectMapPoint(fallbackCenter[0], fallbackCenter[1], fallbackZoom);
            const [pointX, pointY] = projectMapPoint(point.longitude, point.latitude, fallbackZoom);
            const left = fallbackWidth / 2 + pointX - centerX;
            const top = height / 2 + pointY - centerY;
            if (left < -20 || left > fallbackWidth + 20 || top < -20 || top > height + 20) return null;
            return <span
              key={point.id}
              className={point.kind === 'user' ? 'radar-map-user-pin' : 'radar-map-shop-pin'}
              aria-label={point.kind === 'user' ? 'Your current location' : point.name}
              title={point.kind === 'user' ? 'Your current location' : point.name}
              style={{ ...fallbackMarkerStyle(point), left, top }}
            >{point.kind === 'user' ? <span aria-hidden="true" style={{ transform: `rotate(${point.heading ?? 0}deg)`, color: '#fff', fontSize: 12, lineHeight: 1, fontWeight: 900 }}>{point.heading == null ? '•' : '↑'}</span> : null}</span>;
          })}
          {onLocationSelect ? <>
            <button type="button" aria-label="Place shop pin at this map location" title="Click the map to place your shop pin" onClick={selectFallbackPoint} style={mapClickLayerStyle} />
            <div style={fallbackControlsStyle}>
              <button type="button" aria-label="Zoom in" onClick={() => setFallbackZoom((zoom) => Math.min(zoom + 1, 18))} style={zoomButtonStyle}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => setFallbackZoom((zoom) => Math.max(zoom - 1, 3))} style={zoomButtonStyle}>−</button>
            </div>
          </> : null}
        </div>
      ) : (
        <div ref={containerRef} role="img" aria-label={onLocationSelect ? 'Map for selecting your shop location' : 'Map showing shop locations'} style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden', background: '#e7edf4' }} />
      )}
      {onLocationSelect ? <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>{useFallbackMap ? 'Search for your shop or click the map to place its pin. Use the + and − buttons to zoom.' : 'Search for your shop, select a result, then click or drag the orange pin to its exact location.'}</p> : null}
      {useFallbackMap && !onLocationSelect && markers.some((point) => point.kind !== 'user') ? (
        <ul aria-label="Shops on the map" style={{ display: 'grid', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
          {markers.filter((point) => point.kind !== 'user').map((point) => <li key={point.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
            {point.href ? <a href={point.href} style={{ color: '#102a43', fontWeight: 700 }}>{point.name}</a> : <strong>{point.name}</strong>}
            {formatLocationAddress(point) ? <div style={{ color: '#64748b', fontSize: 14 }}>{formatLocationAddress(point)}</div> : null}
            <a href={directionsUrl(point.latitude, point.longitude)} target="_blank" rel="noopener noreferrer" style={{ color: '#9a4d00', fontSize: 14, fontWeight: 700 }}>Get directions</a>
          </li>)}
        </ul>
      ) : null}
      {mapError ? <p role="status" style={{ margin: 0, color: '#9a4d00', fontSize: 14 }}>{mapError}</p> : null}
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function escapeAttribute(value: string) { return escapeHtml(value); }

function directionsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function formatLocationAddress(location: ShopLocation) {
  return [
    location.buildingName,
    location.roomNumber ? `Room ${location.roomNumber}` : null,
    location.street,
    location.locationLabel
  ].map((part) => part?.trim()).filter(Boolean).join(', ');
}

function createMapMarker(point: ShopMapPoint) {
  const element = document.createElement('div');
  element.classList.add(point.kind === 'user' ? 'radar-map-user-pin' : 'radar-map-shop-pin');
  element.setAttribute('aria-label', point.kind === 'user' ? 'Your current location' : point.name);
  if (point.kind === 'user') {
    element.style.cssText = 'position:relative;width:34px;height:32px;display:grid;place-items:start center;filter:drop-shadow(0 2px 4px #0f172a55);';
    const halo = document.createElement('span');
    halo.style.cssText = 'position:absolute;top:2px;width:28px;height:28px;border-radius:50%;background:#3b82f633;border:1px solid #3b82f688;';
    const dot = document.createElement('span');
    dot.style.cssText = 'position:absolute;top:8px;width:16px;height:16px;border:3px solid #fff;border-radius:50%;background:#2563eb;';
    const pointTip = document.createElement('span');
    pointTip.style.cssText = 'position:absolute;top:21px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #2563eb;';
    const heading = document.createElement('span');
    heading.textContent = '↑';
    heading.style.cssText = `position:absolute;top:4px;color:#fff;font-size:10px;line-height:12px;font-weight:900;transform:rotate(${point.heading ?? 0}deg);`;
    element.append(halo, pointTip, dot, heading);
    return element;
  }
  element.style.cssText = 'position:relative;width:15px;height:15px;border:3px solid #fff;border-radius:50%;background:#ff7a1a;box-shadow:0 1px 5px #102a4380;';
  return element;
}

function fallbackMarkerStyle(point: ShopMapPoint): CSSProperties {
  return point.kind === 'user'
    ? { position: 'absolute', zIndex: 1, display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', border: '3px solid #fff', background: '#2563eb', boxShadow: '0 1px 6px #102a4380', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }
    : { position: 'absolute', zIndex: 1, width: 14, height: 14, border: '3px solid #fff', borderRadius: '50%', background: '#ff7a1a', boxShadow: '0 1px 5px #102a4380', transform: 'translate(-50%, -50%)', pointerEvents: 'none' };
}

function projectMapPoint(longitude: number, latitude: number, zoom: number): [number, number] {
  const world = 256 * 2 ** zoom;
  const clampedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin(clampedLatitude * Math.PI / 180);
  return [(longitude + 180) / 360 * world, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world];
}

function unprojectMapPoint(center: [number, number], zoom: number, dx: number, dy: number): [number, number] {
  const world = 256 * 2 ** zoom;
  const [centerX, centerY] = projectMapPoint(center[0], center[1], zoom);
  const x = centerX + dx;
  const y = centerY + dy;
  const longitude = x / world * 360 - 180;
  const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / world))) * 180 / Math.PI;
  return [longitude, latitude];
}

function getFallbackBounds(center: [number, number], zoom: number, width: number, height: number) {
  const [west, north] = unprojectMapPoint(center, zoom, -width / 2, -height / 2);
  const [east, south] = unprojectMapPoint(center, zoom, width / 2, height / 2);
  return `${west}%2C${south}%2C${east}%2C${north}`;
}

const inputStyle: CSSProperties = { flex: 1, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.8rem 0.9rem', background: '#fff' };
const searchButtonStyle: CSSProperties = { border: 0, borderRadius: 10, padding: '0 1rem', color: '#fff', background: '#102a43', fontWeight: 700 };
const resultStyle: CSSProperties = { display: 'grid', gap: 3, textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.7rem 0.85rem', background: '#fff' };
const mapClickLayerStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 1, width: '100%', height: '100%', border: 0, padding: 0, background: 'transparent', cursor: 'crosshair' };
const fallbackControlsStyle: CSSProperties = { position: 'absolute', zIndex: 2, top: 12, right: 12, display: 'grid', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px #0002' };
const zoomButtonStyle: CSSProperties = { width: 42, height: 42, border: 0, borderBottom: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 24, fontWeight: 700, cursor: 'pointer' };

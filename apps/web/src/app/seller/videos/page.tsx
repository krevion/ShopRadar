'use client';

import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

type VideoItem = {
  id: string;
  title: string;
  seller: string;
  category: string;
  duration: string;
  description: string;
  videoUrl: string;
  views: number;
  likes: number;
  comments: number;
};

type SellerAccess = {
  eligible: boolean;
  reason: string;
  sellerName?: string;
};

const MAX_VIDEO_SECONDS = 150;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const initialForm = { title: '', category: 'Groceries', duration: '', description: '' };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const parseDurationSeconds = (value: string): number | null => {
  const seconds = /^(\d{1,3})s$/i.exec(value.trim());
  if (seconds) return Number(seconds[1]);
  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  return clock ? Number(clock[1]) * 60 + Number(clock[2]) : null;
};

async function responseMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  return Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message ?? `Request failed (${response.status}).`;
}

export default function SellerVideosPage() {
  const [form, setForm] = useState(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [access, setAccess] = useState<SellerAccess | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputs = useRef<{ camera: HTMLInputElement | null; gallery: HTMLInputElement | null; files: HTMLInputElement | null }>({
    camera: null,
    gallery: null,
    files: null
  });

  const previewUrl = useMemo(
    () => selectedFile ? URL.createObjectURL(selectedFile) : '',
    [selectedFile]
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setAccess({ eligible: false, reason: 'Sign in with your seller account to check upload access.' });
      setCheckingAccess(false);
      return;
    }

    fetch(`${apiUrl}/api/videos/access`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<SellerAccess>;
      })
      .then((result) => {
        if (!cancelled) setAccess(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAccess({
            eligible: false,
            reason: error instanceof Error ? error.message : 'Seller access could not be checked.'
          });
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingAccess(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch(`${apiUrl}/api/videos`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<VideoItem[]>;
      })
      .then(setVideos)
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Unable to load your published videos.'));
  }, []);

  const updateForm = (field: keyof typeof initialForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleMediaSelect = (event: ChangeEvent<HTMLInputElement>, source: string) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
      setStatus('Choose an MP4, WebM, or MOV video file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus('Video files must be 100 MB or smaller.');
      return;
    }
    setSelectedFile(file);
    setForm((current) => ({ ...current, duration: '' }));
    setStatus(`${file.name} selected from ${source}.`);
  };

  const updateDurationFromMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const duration = event.currentTarget.duration;
    if (!Number.isFinite(duration)) return;
    setForm((current) => ({ ...current, duration: `${Math.ceil(duration)}s` }));
  };

  const publishVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!access?.eligible) {
      setStatus(access?.reason ?? 'Seller upload access is not available.');
      return;
    }
    if (!selectedFile) {
      setStatus('Choose a video from your camera, gallery, or files before publishing.');
      return;
    }
    if (!form.title.trim()) {
      setStatus('Add a title before publishing.');
      return;
    }
    const durationSeconds = parseDurationSeconds(form.duration);
    if (durationSeconds === null || durationSeconds < 1 || durationSeconds > MAX_VIDEO_SECONDS) {
      setStatus('Video length must be 2 minutes 30 seconds or less.');
      return;
    }

    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setStatus('Your seller session has expired. Sign in again to publish.');
      return;
    }

    const payload = new FormData();
    payload.set('video', selectedFile);
    payload.set('title', form.title.trim());
    payload.set('category', form.category);
    payload.set('duration', form.duration);
    payload.set('description', form.description.trim());

    setUploading(true);
    setStatus('');
    try {
      const response = await fetch(`${apiUrl}/api/videos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const created = await response.json() as VideoItem;
      setVideos((current) => [created, ...current]);
      setForm(initialForm);
      setSelectedFile(null);
      setStatus('Your video was published to the Reels feed.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Video upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '0.8rem 0.9rem',
    fontSize: '0.95rem',
    background: '#f8fafc',
    color: '#0f172a'
  };

  return (
    <SiteShell
      title="Seller video studio"
      subtitle="Upload or record a short video to introduce your shop and products."
      action={<a href="/videos" style={{ color: '#9a4d00', fontWeight: 800 }}>← Back to videos</a>}
    >
      {checkingAccess ? (
        <div style={{ padding: '1rem', color: '#64748b' }}>Checking seller access…</div>
      ) : access?.eligible ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
          <form onSubmit={publishVideo} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 20, padding: '1.1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create a seller clip</div>
              <div style={{ marginTop: '0.35rem', color: '#64748b', fontSize: '0.92rem' }}>Signed in as {access.sellerName}. Clips can be up to 2:30 and 100 MB.</div>
            </div>

            <label style={{ display: 'grid', gap: '0.35rem', color: '#475569', fontWeight: 700 }}>
              Video title
              <input required maxLength={120} value={form.title} onChange={updateForm('title')} placeholder="Fresh produce haul" style={inputStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem', color: '#475569', fontWeight: 700 }}>
              Category
              <select value={form.category} onChange={updateForm('category')} style={inputStyle}>
                <option>Groceries</option><option>Home</option><option>Electronics</option><option>Fashion</option><option>Beauty</option><option>Food</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: '0.35rem', color: '#475569', fontWeight: 700 }}>
              Description
              <textarea value={form.description} onChange={updateForm('description')} rows={3} maxLength={1000} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe your video so shoppers can find it." />
            </label>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <strong>Choose where to get your video</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.55rem' }}>
                <button type="button" onClick={() => fileInputs.current.camera?.click()} style={sourceButtonStyle}>Record video</button>
                <button type="button" onClick={() => fileInputs.current.gallery?.click()} style={sourceButtonStyle}>Camera roll</button>
                <button type="button" onClick={() => fileInputs.current.files?.click()} style={sourceButtonStyle}>Browse files</button>
              </div>
              <input ref={(node) => { fileInputs.current.camera = node; }} type="file" accept="video/mp4,video/webm,video/quicktime" capture="environment" hidden onChange={(event) => handleMediaSelect(event, 'camera')} />
              <input ref={(node) => { fileInputs.current.gallery = node; }} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => handleMediaSelect(event, 'camera roll')} />
              <input ref={(node) => { fileInputs.current.files = node; }} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => handleMediaSelect(event, 'files')} />
              {selectedFile ? (
                <div style={{ display: 'grid', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: 14, padding: '0.8rem', background: '#f8fafc' }}>
                  <video src={previewUrl} controls muted playsInline onLoadedMetadata={updateDurationFromMetadata} style={{ width: '100%', maxHeight: 250, borderRadius: 10, background: '#0f172a' }} />
                  <span style={{ color: '#475569', fontSize: '0.82rem' }}>{selectedFile.name} · {form.duration ? `${form.duration} detected` : 'Reading video length…'}</span>
                </div>
              ) : <div style={{ color: '#64748b', fontSize: '0.85rem' }}>MP4, WebM, or MOV · up to 2:30 · max 100 MB</div>}
            </div>

            <button type="submit" disabled={uploading} style={{ background: uploading ? '#94a3b8' : 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.9rem 1.2rem', fontWeight: 800, cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? 'Uploading…' : 'Publish video'}
            </button>
            {status ? <div role="status" style={{ color: status.includes('failed') ? '#b91c1c' : '#0f766e', fontWeight: 600 }}>{status}</div> : null}
          </form>

          <section style={{ display: 'grid', gap: '0.8rem' }}>
            <h2 style={{ margin: 0 }}>Your published videos</h2>
            {videos.filter((video) => video.seller === access.sellerName).map((video) => (
              <article key={video.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.8rem', alignItems: 'center', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '0.75rem' }}>
                <video src={video.videoUrl} controls muted playsInline style={{ width: 120, height: 100, objectFit: 'cover', borderRadius: 10, background: '#0f172a' }} />
                <div><strong>{video.title}</strong><p style={{ margin: '0.35rem 0', color: '#64748b' }}>{video.category} · {video.duration}</p><small>{video.views} views</small></div>
              </article>
            ))}
            {!videos.some((video) => video.seller === access.sellerName) ? <p style={{ color: '#64748b' }}>Your published clips will appear here.</p> : null}
          </section>
        </div>
      ) : (
        <section style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 20 }}>
          <div style={{ color: 'var(--color-orange)', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Seller access required</div>
          <h2 style={{ margin: '0.5rem 0', color: '#10213f' }}>Your video studio is locked</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>{access?.reason ?? 'Sign in and complete seller activation to publish videos.'}</p>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Publishing requires a registered seller account and a successful KSh 1,000 subscription payment within the last 30 days. The API checks both conditions on every upload.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '1rem' }}>
            <a href="/seller/register" style={linkButtonStyle}>Register / sign in</a>
            <a href="/seller/checkout" style={{ ...linkButtonStyle, background: '#0d2246' }}>Subscription checkout</a>
          </div>
        </section>
      )}
    </SiteShell>
  );
}

const sourceButtonStyle: CSSProperties = {
  minHeight: 48,
  border: '1px solid #fed7aa',
  borderRadius: 12,
  background: '#fff7ed',
  color: '#9a4d00',
  fontWeight: 800
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 10,
  background: 'var(--color-orange)',
  color: '#fff',
  padding: '0.75rem 1rem',
  fontWeight: 800
};

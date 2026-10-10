'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import './videos.css';

type VideoItem = {
  id: string;
  title: string;
  seller: string;
  category: string;
  duration: string;
  description: string;
  videoUrl?: string;
  views: number;
  likes: number;
  comments: number;
  sellerProfileId?: string;
  sellerBio?: string | null;
  sellerCity?: string | null;
  sellerVerified?: boolean;
};

type Tab = 'discover' | 'reels' | 'upload';

const shuffle = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export default function VideosPage() {
  const [tab, setTab] = useState<Tab>('discover');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [profileVideo, setProfileVideo] = useState<VideoItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState('');
  const [focusVideoId, setFocusVideoId] = useState<string | null>(null);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [reelPlaying, setReelPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const reelsFeedRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const recordedViews = useRef<Set<string>>(new Set());
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  useEffect(() => {
    fetch(`${api}/api/videos`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Video feed returned ${response.status}.`);
        }
        const data = (await response.json()) as unknown;
        if (!Array.isArray(data)) {
          throw new Error('The video feed returned an invalid response.');
        }
        setVideos(shuffle(data as VideoItem[]));
      })
      .catch((error: unknown) => {
        setApiError(error instanceof Error ? error.message : 'Unable to load the video feed.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) return;
    Promise.all([
      fetch(`${api}/api/videos/likes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${api}/api/sellers/favorites`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([likesResponse, favoritesResponse]) => {
        if (!likesResponse.ok || !favoritesResponse.ok) throw new Error('Your saved video actions could not be loaded.');
        const [videoIds, sellerNames] = await Promise.all([
          likesResponse.json() as Promise<string[]>,
          favoritesResponse.json() as Promise<string[]>
        ]);
        setLiked(new Set(videoIds));
        setFavorites(new Set(sellerNames));
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Your saved video actions could not be loaded.'));
  }, []);

  const visibleVideos = videos;
  const filteredVideos = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) {
      return visibleVideos;
    }
    return visibleVideos.filter((video) =>
      `${video.description} ${video.title} ${video.category} ${video.seller}`.toLocaleLowerCase().includes(term)
    );
  }, [search, visibleVideos]);

  useEffect(() => {
    if (tab !== 'reels' || !focusVideoId) {
      return;
    }
    document.getElementById(`reel-${focusVideoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusVideoId(null);
  }, [focusVideoId, tab]);

  useEffect(() => {
    if (tab !== 'reels') return;
    const feed = reelsFeedRef.current;
    if (!feed) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const row = entry.target as HTMLElement;
        const video = row.querySelector('video');
        if (!video) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          const videoId = row.dataset.reelId;
          if (videoId) setActiveReelId(videoId);
          video.muted = muted;
          void video.play().then(() => setReelPlaying(true)).catch(() => setReelPlaying(false));
        } else {
          video.pause();
        }
      });
    }, { root: feed, threshold: [0, 0.7, 1] });
    const rows = feed.querySelectorAll<HTMLElement>('.reel-row');
    rows.forEach((row) => observer.observe(row));
    return () => {
      observer.disconnect();
      rows.forEach((row) => row.querySelector('video')?.pause());
      setReelPlaying(false);
    };
  }, [tab, visibleVideos.length, muted]);

  const toggleLike = async (video: VideoItem) => {
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setStatus('Sign in to like videos.');
      window.location.href = '/account';
      return;
    }
    try {
      const response = await fetch(`${api}/api/videos/${encodeURIComponent(video.id)}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Like could not be saved (${response.status}).`);
      const result = await response.json() as { liked: boolean; likes: number };
      setLiked((current) => {
        const next = new Set(current);
        if (result.liked) next.add(video.id);
        else next.delete(video.id);
        return next;
      });
      setLikeCounts((current) => ({ ...current, [video.id]: result.likes }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Like could not be saved.');
    }
  };

  const toggleFavorite = async (video: VideoItem) => {
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setStatus('Sign in to favourite sellers.');
      window.location.href = '/account';
      return;
    }
    if (!video.sellerProfileId) {
      setStatus('This seller profile is unavailable.');
      return;
    }
    try {
      const response = await fetch(`${api}/api/sellers/${encodeURIComponent(video.sellerProfileId)}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Seller favourite could not be saved (${response.status}).`);
      const result = await response.json() as { favorited: boolean };
      setFavorites((current) => {
        const next = new Set(current);
        if (result.favorited) next.add(video.seller);
        else next.delete(video.seller);
        return next;
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Seller favourite could not be saved.');
    }
  };

  const openComments = async (video: VideoItem) => {
    if (commentingOn === video.id) {
      setCommentingOn(null);
      return;
    }
    setCommentingOn(video.id);
    try {
      const response = await fetch(`${api}/api/videos/${encodeURIComponent(video.id)}/comments`);
      if (!response.ok) throw new Error(`Comments could not be loaded (${response.status}).`);
      const rows = await response.json() as Array<{ body: string; author: string }>;
      setComments((current) => ({ ...current, [video.id]: rows.map((row) => `${row.author}: ${row.body}`) }));
      setCommentCounts((current) => ({ ...current, [video.id]: rows.length }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Comments could not be loaded.');
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>, video: VideoItem) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    const token = localStorage.getItem('shopradar-access-token');
    if (!token) {
      setStatus('Sign in to comment on videos.');
      window.location.href = '/account';
      return;
    }
    try {
      const response = await fetch(`${api}/api/videos/${encodeURIComponent(video.id)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: text })
      });
      if (!response.ok) throw new Error(`Comment could not be posted (${response.status}).`);
      const created = await response.json() as { author: string; body: string };
      setComments((current) => ({ ...current, [video.id]: [...(current[video.id] ?? []), `${created.author}: ${created.body}`] }));
      setCommentCounts((current) => ({ ...current, [video.id]: (current[video.id] ?? video.comments) + 1 }));
      setCommentText('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Comment could not be posted.');
    }
  };

  const downloadVideo = async (video: VideoItem) => {
    if (!video.videoUrl) {
      setStatus('This video does not have a downloadable file yet.');
      return;
    }
    try {
      const response = await fetch(video.videoUrl);
      if (!response.ok) throw new Error(`Download returned ${response.status}.`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      const extension = /\.(mp4|webm|mov)(?:$|[?#])/i.exec(video.videoUrl)?.[1] ?? 'mp4';
      anchor.download = `${video.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'shopradar-video'}.${extension}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setStatus('Video download started.');
    } catch {
      setStatus('This video source does not allow downloading from your browser.');
    }
  };

  const shareVideo = async (video: VideoItem) => {
    const url = `${window.location.origin}/videos#reel-${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, text: video.description, url });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${video.title} ${url}`)}`, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setStatus('Unable to open the share sheet. You can copy the video link from your browser.');
    }
  };

  const recordView = async (video: VideoItem) => {
    if (recordedViews.current.has(video.id)) return;
    try {
      const response = await fetch(`${api}/api/videos/${encodeURIComponent(video.id)}/view`, { method: 'POST' });
      if (!response.ok) {
        setStatus(`Could not record the view (${response.status}).`);
        return;
      }
      recordedViews.current.add(video.id);
    } catch {
      setStatus('Could not record the view. Check your connection and try again.');
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>, video: VideoItem) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text) return;
    if (video.sellerProfileId) {
      const token = localStorage.getItem('shopradar-access-token');
      if (!token) {
        setStatus('Sign in to message sellers.');
        window.location.href = '/account';
        return;
      }
      try {
        const response = await fetch(`${api}/api/sellers/${encodeURIComponent(video.sellerProfileId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ body: text })
        });
        if (!response.ok) throw new Error(`Message could not be sent (${response.status}).`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Message could not be sent.');
        return;
      }
      const next = { ...messages, [video.seller]: [...(messages[video.seller] ?? []), text] };
      setMessages(next);
      setMessageText('');
      setStatus('Your message was sent to the seller.');
      return;
    }
    setStatus('This seller profile is unavailable.');
    return;
  };

  const openSellerProfile = async (video: VideoItem) => {
    setProfileVideo(video);
    const token = localStorage.getItem('shopradar-access-token');
    if (!token || !video.sellerProfileId) return;
    try {
      const response = await fetch(`${api}/api/sellers/${encodeURIComponent(video.sellerProfileId)}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Seller messages could not be loaded (${response.status}).`);
      const rows = await response.json() as Array<{ body: string }>;
      setMessages((current) => ({ ...current, [video.seller]: rows.map((row) => row.body) }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Seller messages could not be loaded.');
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>, video: VideoItem) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) void openSellerProfile(video);
      else setProfileVideo(null);
    }
    touchStart.current = null;
  };

  const openReel = (videoId: string) => {
    setFocusVideoId(videoId);
    setTab('reels');
  };

  const toggleReelPlayback = (videoId: string) => {
    const video = document.getElementById(`reel-${videoId}`)?.querySelector('video');
    if (!video) return;
    if (video.paused) {
      video.muted = muted;
      void video.play().catch(() => setStatus('This video could not be played.'));
    } else {
      video.pause();
    }
  };

  const renderReel = (video: VideoItem, index: number) => (
    <article
      className="reel-row"
      id={`reel-${video.id}`}
      data-reel-id={video.id}
      key={video.id}
      onTouchStart={handleTouchStart}
      onTouchEnd={(event) => handleTouchEnd(event, video)}
    >
      <div className="reel-card">
        {video.videoUrl ? (
          <video
            className="reel-video"
            src={video.videoUrl}
            muted={muted}
            playsInline
            loop
            preload={index < 2 ? 'metadata' : 'none'}
            onClick={() => toggleReelPlayback(video.id)}
            onPlay={() => { setActiveReelId(video.id); setReelPlaying(true); void recordView(video); }}
            onPause={() => { if (activeReelId === video.id) setReelPlaying(false); }}
          />
        ) : (
          <div className="reel-no-video">Video preview unavailable</div>
        )}
        <div className="reel-gradient" />
        {video.videoUrl ? <button type="button" className="reel-play-toggle" onClick={() => toggleReelPlayback(video.id)} aria-label={activeReelId === video.id && reelPlaying ? 'Pause video' : 'Play video'}>{activeReelId === video.id && reelPlaying ? 'Ⅱ' : '▶'}</button> : null}

        <div className="reel-copy">
          <button type="button" className="reel-seller" onClick={() => void openSellerProfile(video)}>
            <span className="reel-avatar">{video.seller.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{video.seller}</strong>
              <small>{video.sellerVerified ? 'Verified seller' : 'Seller'} · {video.category}</small>
            </span>
            <span className="reel-profile-hint">View profile →</span>
          </button>
          <h2>{video.title}</h2>
          <p>{video.description}</p>
          <div className="reel-meta"><span>{video.duration}</span><span>{video.views.toLocaleString()} views</span><span>Swipe left for seller</span></div>
        </div>
      </div>
      <div className="reel-actions" aria-label={`Actions for ${video.title}`}>
        <button type="button" className={liked.has(video.id) ? 'reel-action active' : 'reel-action'} onClick={() => void toggleLike(video)} aria-label="Like video">
          <span>♥</span><small>{(likeCounts[video.id] ?? video.likes).toLocaleString()}</small>
        </button>
        <button type="button" className="reel-action" onClick={() => void openComments(video)} aria-label="Comment on video">
          <span>▤</span><small>{(commentCounts[video.id] ?? video.comments).toLocaleString()}</small>
        </button>
        <button type="button" className="reel-action" onClick={() => void downloadVideo(video)} aria-label="Save video to device">
          <span>↓</span><small>Save</small>
        </button>
        <button type="button" className="reel-action" onClick={() => void shareVideo(video)} aria-label="Share video">
          <span>↗</span><small>Share</small>
        </button>
        <button type="button" className="reel-action" onClick={() => setMuted((current) => !current)} aria-label={muted ? 'Turn sound on' : 'Mute video'}>
          <span>{muted ? '🔇' : '🔊'}</span><small>{muted ? 'Sound off' : 'Sound on'}</small>
        </button>
      </div>

      {commentingOn === video.id ? (
        <aside className="comment-panel">
          <div className="panel-heading"><strong>Comments</strong><button type="button" onClick={() => setCommentingOn(null)} aria-label="Close comments">×</button></div>
          <div className="comment-list">
            {(comments[video.id] ?? []).map((comment, commentIndex) => <p key={`${commentIndex}-${comment}`}>{comment}</p>)}
            {comments[video.id]?.length ? null : <p className="muted-copy">Be the first to comment.</p>}
          </div>
          <form onSubmit={(event) => void submitComment(event, video)} className="comment-form">
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment" aria-label="Write a comment" />
            <button type="submit">Post</button>
          </form>
        </aside>
      ) : null}
    </article>
  );

  return (
    <SiteShell
      immersive={tab === 'reels'}
      title="ShopRadar videos"
      subtitle="Discover local sellers, watch short clips, and find your next favourite shop."
      action={<a className="video-top-action" href="/seller/videos">＋ Create a video</a>}
    >
      <div className={`video-hub${tab === 'reels' ? ' reels-mode' : ''}`}>
        <nav className="video-tabs" aria-label="Video sections">
          {([
            ['discover', 'Discover', 'Find videos'],
            ['reels', 'Watch Reels', 'Swipe videos'],
            ['upload', 'Upload', 'For sellers']
          ] as const).map(([key, title, hint]) => (
            <button key={key} type="button" className={tab === key ? 'video-tab selected' : 'video-tab'} onClick={() => setTab(key)}>
              <span>{title}</span><small>{hint}</small>
            </button>
          ))}
        </nav>

        {tab === 'discover' ? (
          <button type="button" className="reels-feature" onClick={() => setTab('reels')} aria-label="Watch ShopRadar Reels">
            <span className="reels-feature-icon" aria-hidden="true">▶</span>
            <span className="reels-feature-copy"><strong>Watch local shops in action</strong><small>Swipe through short videos from ShopRadar sellers.</small></span>
            <span className="reels-feature-cta">Watch Reels <span aria-hidden="true">→</span></span>
          </button>
        ) : null}

        {tab === 'discover' ? (
          <section className="discover-section" aria-labelledby="discover-title">
            <div className="discover-heading">
              <div>
                <span className="video-kicker">Find your next watch</span>
                <h2 id="discover-title">Discover videos</h2>
                <p>Search titles, categories, sellers, or video descriptions.</p>
              </div>
              <span className="discover-count">{videos.length} seller {videos.length === 1 ? 'video' : 'videos'}</span>
            </div>
            <form className="video-search" onSubmit={(event) => event.preventDefault()}>
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try “fresh produce” or “home decor”" aria-label="Search video descriptions" />
              {search ? <button type="button" onClick={() => setSearch('')}>Clear</button> : null}
            </form>
            {loading ? <p className="video-notice">Loading videos…</p> : null}
            {apiError ? <p className="video-notice error-notice">{apiError}</p> : null}
            {!loading && !apiError && filteredVideos.length === 0 ? (
              <div className="video-empty-state">
                <strong>{videos.length ? 'No videos match that search.' : 'No seller videos have been published yet.'}</strong>
                <span>{videos.length ? 'Try another description or browse all reels.' : 'Seller videos will appear here after an approved seller publishes one.'}</span>
                {videos.length ? <button type="button" onClick={() => { setSearch(''); setTab('reels'); }}>Browse Reels</button> : null}
              </div>
            ) : (
              <div className="discover-grid">
                {filteredVideos.map((video) => (
                  <button type="button" className="discover-card" key={video.id} onClick={() => openReel(video.id)}>
                    <div className="discover-media">
                      {video.videoUrl ? <video src={video.videoUrl} muted playsInline preload="metadata" /> : <span>▶</span>}

                      <span className="discover-play">▶</span>
                    </div>
                    <div className="discover-card-copy">
                      <span className="discover-category">{video.category}</span>
                      <strong>{video.title}</strong>
                      <span>{video.seller} · {video.views.toLocaleString()} views</span>
                      <p>{video.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === 'reels' ? (
          <section className="reels-section" aria-label="Short video reels">
            <div className="reels-heading">
              <button type="button" className="reels-exit" onClick={() => setTab('discover')}>Back to videos</button>
              <span>Swipe up for the next video</span>
            </div>
            <div className="reels-feed" ref={reelsFeedRef} tabIndex={0} aria-label="Swipe or scroll vertically through videos">
              {visibleVideos.length
                ? visibleVideos.map((video, index) => renderReel(video, index))
                : <div className="video-empty-state"><strong>No seller videos are available yet.</strong><span>Approved sellers will appear here after publishing a video.</span></div>}
            </div>
            <p className="reel-swipe-hint">On touch screens, swipe left on a video to view its seller.</p>
          </section>
        ) : null}

        {tab === 'upload' ? (
          <section className="upload-section">
            <div className="upload-copy">
              <span className="upload-icon">↥</span>
              <span className="video-kicker">Seller studio</span>
              <h2>Put your shop in motion</h2>
              <p>Upload a clip from your camera roll or files, or record one with your device camera. Videos can be up to 2 minutes 30 seconds.</p>
              <ul>
                <li>Registered seller account</li>
                <li>Registered seller profile</li>
                <li>One-month free trial, then an active ShopRadar seller subscription</li>
              </ul>
              <a className="upload-cta" href="/seller/videos">Continue to seller upload →</a>
              <a className="upload-register-link" href="/seller/register">New to ShopRadar? Register your business</a>
              <p className="upload-gate-note">Publishing is checked by the API; browser-only status changes cannot unlock uploads.</p>
            </div>
            <div className="upload-preview">
              <div className="upload-preview-top"><span /><span /><span /></div>
              <div className="upload-preview-card">
                <div className="upload-preview-art">▶</div>
                <div><strong>Your next customer is watching</strong><span>Short videos help shoppers discover your products.</span></div>
              </div>
              <div className="upload-stat"><span>Maximum length</span><strong>02:30</strong></div>
            </div>
          </section>
        ) : null}

        {status ? <p className="video-status" role="status">{status}</p> : null}
      </div>

      {profileVideo ? (
        <div className="profile-backdrop" role="presentation" onClick={() => setProfileVideo(null)}>
          <aside className="seller-profile" role="dialog" aria-modal="true" aria-labelledby="seller-profile-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="profile-close" onClick={() => setProfileVideo(null)} aria-label="Close seller profile">×</button>
            <div className="profile-cover"><span className="profile-avatar">{profileVideo.seller.slice(0, 1).toUpperCase()}</span></div>
            <span className="video-kicker">Seller profile</span>
            <h2 id="seller-profile-title">{profileVideo.seller}</h2>
            <p className="profile-status">{profileVideo.sellerVerified ? '✓ Verified ShopRadar seller' : 'ShopRadar seller'}</p>
            <div className="profile-details">
              <div><small>Featured in</small><strong>{profileVideo.category}</strong></div>
              <div><small>Shop location</small><strong>{profileVideo.sellerCity || 'Local seller'}</strong></div>
            </div>
            <p className="profile-bio">{profileVideo.sellerBio || 'Discover products, offers, and updates from this seller on ShopRadar.'}</p>
            <button type="button" className={favorites.has(profileVideo.seller) ? 'profile-favorite favorited' : 'profile-favorite'} onClick={() => void toggleFavorite(profileVideo)}>
              {favorites.has(profileVideo.seller) ? '♥ Added to favourites' : '♡ Add seller to favourites'}
            </button>
            <div className="profile-message">
              <strong>Message the seller</strong>
              <div className="profile-messages">{(messages[profileVideo.seller] ?? []).map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}</div>
              <form onSubmit={(event) => void sendMessage(event, profileVideo)}>
                <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Ask about a product or offer…" rows={3} />
                <button type="submit">Send message</button>
              </form>
              <small>Your message will appear in the seller&apos;s dashboard inbox.</small>
            </div>
          </aside>
        </div>
      ) : null}
    </SiteShell>
  );
}

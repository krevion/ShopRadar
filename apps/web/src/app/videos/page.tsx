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
  preview?: boolean;
};

type Tab = 'discover' | 'reels' | 'upload';

const previewVideo: VideoItem = {
  id: 'shopradar-preview',
  title: 'A quick look at Reels',
  seller: 'ShopRadar preview',
  category: 'Preview',
  duration: '12s',
  description: 'A short sample clip. Seller videos appear here once they are published.',
  videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  views: 128,
  likes: 14,
  comments: 3,
  preview: true
};

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
    try {
      const storedLikes = JSON.parse(localStorage.getItem('shopradar-video-likes') ?? '[]') as string[];
      const storedFavorites = JSON.parse(localStorage.getItem('shopradar-seller-favorites') ?? '[]') as string[];
      const storedComments = JSON.parse(localStorage.getItem('shopradar-video-comments') ?? '{}') as Record<string, string[]>;
      const storedMessages = JSON.parse(localStorage.getItem('shopradar-seller-messages') ?? '{}') as Record<string, string[]>;
      setLiked(new Set(storedLikes));
      setFavorites(new Set(storedFavorites));
      setComments(storedComments);
      setMessages(storedMessages);
    } catch {
      setStatus('Saved actions could not be restored from this browser.');
    }

    const token = localStorage.getItem('shopradar-access-token');
    if (token) {
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
    }
  }, []);

  const visibleVideos = videos.length > 0 ? videos : [previewVideo];
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

  const persist = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setStatus('Your browser could not save this action.');
    }
  };

  const toggleLike = async (video: VideoItem) => {
    if (!video.preview) {
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
      return;
    }
    const next = new Set(liked);
    if (next.has(video.id)) next.delete(video.id);
    else next.add(video.id);
    setLiked(next);
    setLikeCounts((current) => ({
      ...current,
      [video.id]: video.likes + (next.has(video.id) ? 1 : 0)
    }));
    persist('shopradar-video-likes', [...next]);
  };

  const toggleFavorite = async (video: VideoItem) => {
    const seller = video.seller;
    if (!video.preview && video.sellerProfileId) {
      const token = localStorage.getItem('shopradar-access-token');
      if (!token) {
        setStatus('Sign in to favourite sellers.');
        window.location.href = '/account';
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
          if (result.favorited) next.add(seller);
          else next.delete(seller);
          return next;
        });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Seller favourite could not be saved.');
      }
      return;
    }
    const next = new Set(favorites);
    if (next.has(seller)) next.delete(seller);
    else next.add(seller);
    setFavorites(next);
    persist('shopradar-seller-favorites', [...next]);
  };

  const openComments = async (video: VideoItem) => {
    if (commentingOn === video.id) {
      setCommentingOn(null);
      return;
    }
    setCommentingOn(video.id);
    if (video.preview) return;
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
    if (!video.preview) {
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
        const next = { ...comments, [video.id]: [...(comments[video.id] ?? []), `${created.author}: ${created.body}`] };
        setComments(next);
        setCommentCounts((current) => ({ ...current, [video.id]: (current[video.id] ?? video.comments) + 1 }));
        setCommentText('');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Comment could not be posted.');
      }
      return;
    }
    const next = { ...comments, [video.id]: [...(comments[video.id] ?? []), text] };
    setComments(next);
    setCommentCounts((current) => ({ ...current, [video.id]: video.comments + next[video.id].length }));
    persist('shopradar-video-comments', next);
    setCommentText('');
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
    if (video.preview || recordedViews.current.has(video.id)) return;
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
    if (!video.preview && video.sellerProfileId) {
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
    const seller = video.seller;
    const next = { ...messages, [seller]: [...(messages[seller] ?? []), text] };
    setMessages(next);
    persist('shopradar-seller-messages', next);
    setMessageText('');
    setStatus('Sample conversation saved in this browser.');
  };

  const openSellerProfile = async (video: VideoItem) => {
    setProfileVideo(video);
    const token = localStorage.getItem('shopradar-access-token');
    if (!token || video.preview || !video.sellerProfileId) return;
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

  const renderReel = (video: VideoItem, index: number) => (
    <article
      className="reel-row"
      id={`reel-${video.id}`}
      key={video.id}
      onTouchStart={handleTouchStart}
      onTouchEnd={(event) => handleTouchEnd(event, video)}
    >
      <div className="reel-card">
        {video.videoUrl ? (
          <video className="reel-video" src={video.videoUrl} controls playsInline loop preload={index === 0 ? 'metadata' : 'none'} onPlay={() => void recordView(video)} />
        ) : (
          <div className="reel-no-video">Video preview unavailable</div>
        )}
        <div className="reel-gradient" />
        {video.preview ? <span className="reel-preview-badge">Sample preview</span> : null}
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
      title="ShopRadar videos"
      subtitle="Discover local sellers, watch short clips, and find your next favourite shop."
      action={<a className="video-top-action" href="/seller/videos">＋ Create a video</a>}
    >
      <div className="video-hub">
        <nav className="video-tabs" aria-label="Video sections">
          {([
            ['discover', 'Discover', 'Find videos'],
            ['reels', 'Reels', 'Scroll to watch'],
            ['upload', 'Upload', 'For sellers']
          ] as const).map(([key, title, hint]) => (
            <button key={key} type="button" className={tab === key ? 'video-tab selected' : 'video-tab'} onClick={() => setTab(key)}>
              <span>{title}</span><small>{hint}</small>
            </button>
          ))}
        </nav>

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
            {apiError ? <p className="video-notice error-notice">{apiError} Showing a sample preview instead.</p> : null}
            {!loading && filteredVideos.length === 0 ? (
              <div className="video-empty-state"><strong>No videos match that search.</strong><span>Try another description or browse all reels.</span><button type="button" onClick={() => { setSearch(''); setTab('reels'); }}>Browse Reels</button></div>
            ) : (
              <div className="discover-grid">
                {filteredVideos.map((video) => (
                  <button type="button" className="discover-card" key={video.id} onClick={() => openReel(video.id)}>
                    <div className="discover-media">
                      {video.videoUrl ? <video src={video.videoUrl} muted playsInline preload="metadata" /> : <span>▶</span>}
                      {video.preview ? <small>PREVIEW</small> : null}
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
            {!videos.length && !loading ? <p className="preview-caption">Sample preview shown while sellers publish their first videos.</p> : null}
          </section>
        ) : null}

        {tab === 'reels' ? (
          <section className="reels-section" aria-label="Short video reels">
            <div className="reels-heading">
              <div><span className="video-kicker">Made by local sellers</span><h2>Reels</h2></div>
              <span>Scroll up or down to switch videos</span>
            </div>
            <div className="reels-feed">
              {visibleVideos.map((video, index) => renderReel(video, index))}
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
                <li>Successful KSh 1,000 subscription payment within the last 30 days</li>
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
            <p className="profile-status">{profileVideo.sellerVerified ? '✓ Verified ShopRadar seller' : profileVideo.preview ? 'Sample seller profile' : 'ShopRadar seller'}</p>
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
              {profileVideo.preview ? <small>Sample conversations are saved in this browser only.</small> : <small>Your message will appear in the seller&apos;s dashboard inbox.</small>}
            </div>
          </aside>
        </div>
      ) : null}
    </SiteShell>
  );
}

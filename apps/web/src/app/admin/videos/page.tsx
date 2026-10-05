import { SiteShell } from '@/components/site-shell';

export default function AdminVideosPage() {
  return (
    <SiteShell title="Video content" subtitle="Moderate product clips, seller videos, and discovery content.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ background: '#fff', border: '1px dashed var(--color-border)', borderRadius: 16, padding: '1.2rem', color: '#64748b' }}>
          No seller video submissions are queued right now.
        </div>
      </div>
    </SiteShell>
  );
}

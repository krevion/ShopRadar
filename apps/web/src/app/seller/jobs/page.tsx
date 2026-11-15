'use client';

import { type CSSProperties, type FormEvent, useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const tokenKey = 'shopradar-access-token';
const employmentTypes = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'INTERNSHIP', label: 'Internship' }
] as const;

type EmploymentType = typeof employmentTypes[number]['value'];
type JobListing = {
  id: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  location: string | null;
  salaryRange: string | null;
  requirements: string | null;
  isActive: boolean;
  createdAt: string;
};
type JobDraft = {
  title: string;
  description: string;
  employmentType: EmploymentType;
  location: string;
  salaryRange: string;
  requirements: string;
};

const emptyDraft: JobDraft = {
  title: '',
  description: '',
  employmentType: 'FULL_TIME',
  location: '',
  salaryRange: '',
  requirements: ''
};

export default function SellerJobsPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setError('Sign in with your seller account to manage job listings.');
      setLoading(false);
      return () => controller.abort();
    }

    fetch(`${API_URL}/api/sellers/jobs/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response));
        return response.json() as Promise<JobListing[]>;
      })
      .then(setJobs)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Job listings could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const updateDraft = (field: keyof JobDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const createJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const token = localStorage.getItem(tokenKey);
      if (!token) throw new Error('Sign in with your seller account to publish a job.');
      const response = await fetch(`${API_URL}/api/sellers/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim(),
          location: draft.location.trim(),
          salaryRange: draft.salaryRange.trim(),
          requirements: draft.requirements.trim()
        })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const created = await response.json() as JobListing;
      setJobs((current) => [created, ...current]);
      setDraft(emptyDraft);
      setStatus('Job listing published on your business profile.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The job listing could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const setJobActive = async (job: JobListing, isActive: boolean) => {
    setError('');
    setStatus('');
    try {
      const token = localStorage.getItem(tokenKey);
      if (!token) throw new Error('Sign in with your seller account to manage job listings.');
      const response = await fetch(`${API_URL}/api/sellers/jobs/${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const updated = await response.json() as JobListing;
      setJobs((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStatus(isActive ? 'Job listing reopened on your business profile.' : 'Job listing closed and removed from your public profile.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The job listing status could not be updated.');
    }
  };

  return (
    <SiteShell title="Jobs" subtitle="Share openings at your business and connect with people looking for work.">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        <form onSubmit={createJob} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Post a job</div>
          <label style={labelStyle}>
            Job title
            <input required maxLength={120} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} style={inputStyle} placeholder="Shop assistant" />
          </label>
          <label style={labelStyle}>
            Employment type
            <select value={draft.employmentType} onChange={(event) => updateDraft('employmentType', event.target.value)} style={inputStyle}>
              {employmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Job description
            <textarea required maxLength={5000} value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe the role and responsibilities" />
          </label>
          <label style={labelStyle}>
            Work location <span style={{ color: '#64748b', fontWeight: 400 }}>Optional</span>
            <input maxLength={160} value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} style={inputStyle} placeholder="Westlands, Nairobi" />
          </label>
          <label style={labelStyle}>
            Pay range <span style={{ color: '#64748b', fontWeight: 400 }}>Optional</span>
            <input maxLength={120} value={draft.salaryRange} onChange={(event) => updateDraft('salaryRange', event.target.value)} style={inputStyle} placeholder="KSh 20,000–25,000 per month" />
          </label>
          <label style={labelStyle}>
            Requirements <span style={{ color: '#64748b', fontWeight: 400 }}>Optional</span>
            <textarea maxLength={3000} value={draft.requirements} onChange={(event) => updateDraft('requirements', event.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Skills, experience, or qualifications" />
          </label>
          <button type="submit" disabled={busy} style={{ background: 'var(--color-orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.9rem 1.2rem', fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Publishing…' : 'Publish job'}
          </button>
          {status ? <p role="status" style={{ margin: 0, color: '#166534', fontWeight: 600 }}>{status}</p> : null}
          {error ? <p role="alert" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{error}</p> : null}
        </form>

        <section style={{ display: 'grid', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Your job listings</h2>
          {loading ? <p style={{ color: '#64748b' }}>Loading your job listings…</p> : null}
          {!loading && jobs.length === 0 && !error ? <p style={{ color: '#64748b' }}>No jobs yet. New listings will appear on your public business profile.</p> : null}
          {jobs.map((job) => (
            <article key={job.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1rem', display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{job.title}</h3>
                  <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    {employmentTypes.find((type) => type.value === job.employmentType)?.label ?? job.employmentType}
                    {job.location ? ` · ${job.location}` : ''}
                    {job.salaryRange ? ` · ${job.salaryRange}` : ''}
                  </p>
                </div>
                <span style={{ color: job.isActive ? '#166534' : '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>{job.isActive ? 'Open' : 'Closed'}</span>
              </div>
              <p style={{ margin: 0, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{job.description}</p>
              {job.requirements ? <p style={{ margin: 0, color: '#475569', whiteSpace: 'pre-wrap' }}><strong>Requirements:</strong> {job.requirements}</p> : null}
              <button type="button" onClick={() => void setJobActive(job, !job.isActive)} style={{ justifySelf: 'start', border: '1px solid var(--color-border)', background: '#fff', borderRadius: 8, padding: '0.4rem 0.7rem', cursor: 'pointer' }}>
                {job.isActive ? 'Close listing' : 'Reopen listing'}
              </button>
            </article>
          ))}
        </section>
      </div>
    </SiteShell>
  );
}

async function getErrorMessage(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (payload?.message) return Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
  return `Request failed (${response.status}).`;
}

const labelStyle: CSSProperties = { display: 'grid', gap: 6, color: '#334155', fontSize: '0.9rem', fontWeight: 650 };
const inputStyle: CSSProperties = { width: '100%', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.7rem 0.8rem', font: 'inherit', color: 'inherit', background: '#fff' };

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getModel, getReviews, createReview, AIModel, Review, IntegrationModel } from '../../services/api';
import { getToken } from '../../../lib/auth';
import { AI_MODEL_URLS } from '../../../lib/ai-models';
import AIModelModal from '../../components/AIModelModal';

const SCORE_META = [
  { key: 'coding_score', label: '💻 Coding', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  { key: 'reasoning_score', label: '🧠 Reasoning', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', text: '#a78bfa' },
  { key: 'creative_score', label: '🎨 Creative', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', text: '#fb923c' },
];

function ScoreCard({ label, value, color, bg, border, text }: { label: string; value: number; color: string; bg: string; border: string; text: string }) {
  return (
    <div className="card p-5 text-center" style={{ background: bg, borderColor: border }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: text }}>{label}</p>
      <div className="relative w-20 h-20 mx-auto mb-3">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-surface)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${value} 100`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-black" style={{ color: text }}>{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ModelDetailPage({ params }: { params: { id: string } }) {
  const modelId = parseInt(params.id, 10);
  const [model, setModel] = useState<AIModel | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeChatModel, setActiveChatModel] = useState<IntegrationModel | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const isAuth = !!getToken();

  useEffect(() => {
    if (isNaN(modelId)) return;
    Promise.all([getModel(modelId), getReviews(modelId)])
      .then(([m, r]) => { setModel(m); setReviews(r.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [modelId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setSubmitting(true);
    try {
      const nr = await createReview(modelId, rating, reviewText);
      setReviews([nr, ...reviews]);
      setReviewText(''); setRating(5);
      setSuccessMsg('Review submitted!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  const timeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="flex gap-2"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
    </div>
  );

  if (!model) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h1 className="text-3xl font-bold">Model not found</h1>
      <Link href="/" className="btn btn-primary">← Back Home</Link>
    </div>
  );

  const avg = Math.round((model.coding_score + model.reasoning_score + model.creative_score) / 3);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>A</div>
            <span className="font-bold tracking-tight">ARCHON</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/compare" className="nav-link">⚖️ Compare</Link>
            <Link href="/chat" className="nav-link">💬 Chat</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-white" style={{ color: 'var(--text-muted)' }}>
          ← Back Home
        </Link>

        {/* Hero card */}
        <div className="card overflow-hidden">
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #f97316)' }} />
          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <span className="badge badge-slate">by {model.creator}</span>
                  <span className="badge" style={{
                    background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.2)'
                  }}>{model.pricing}</span>
                  {avgRating && <span className="badge badge-amber">⭐ {avgRating} ({reviews.length})</span>}
                  <span className="badge" style={{
                    background: avg >= 85 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: avg >= 85 ? '#10b981' : '#f59e0b',
                    border: `1px solid ${avg >= 85 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
                  }}>Avg {avg}/100</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black" style={{ letterSpacing: '-0.04em' }}>{model.name}</h1>
                <p className="mt-4 text-base leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>{model.description}</p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2 shrink-0">
                {(AI_MODEL_URLS[model.name] || model.url) && (
                  <a href={AI_MODEL_URLS[model.name] || model.url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary">
                    Open {model.name} ↗
                  </a>
                )}
                {model.externalLink && (
                  <button onClick={() => setActiveChatModel(model as IntegrationModel)}
                    className="btn btn-secondary text-sm">
                    💬 Chat with {model.name}
                  </button>
                )}
                <Link href={`/compare?model=${model.id}`} className="btn btn-secondary text-sm text-center">
                  ⚖️ Compare
                </Link>
              </div>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {SCORE_META.map(s => (
                <ScoreCard key={s.key} label={s.label} value={model[s.key as keyof AIModel] as number}
                  color={s.color} bg={s.bg} border={s.border} text={s.text} />
              ))}
              <div className="card p-5 text-center" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#34d399' }}>⭐ User Rating</p>
                <div className="flex items-center justify-center h-20">
                  {avgRating ? (
                    <div>
                      <span className="text-4xl font-black" style={{ color: '#34d399' }}>{avgRating}</span>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{reviews.length} reviews</p>
                    </div>
                  ) : <span className="text-3xl font-black" style={{ color: '#475569' }}>—</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <div className="lg:col-span-4">
            <div className="card p-6 sticky top-20">
              <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                <span style={{ color: 'var(--accent-cyan)' }}>✏️</span> Leave a Review
              </h2>
              {!isAuth ? (
                <div className="text-center py-8">
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Sign in to leave a review</p>
                  <Link href="/auth/login" className="btn btn-primary text-sm">Sign In</Link>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {successMsg && (
                    <div className="px-4 py-3 rounded-lg text-sm font-medium"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                      {successMsg}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button"
                          onMouseEnter={() => setHoveredStar(s)}
                          onMouseLeave={() => setHoveredStar(0)}
                          onClick={() => setRating(s)}
                          className="text-2xl transition-all hover:scale-110">
                          {s <= (hoveredStar || rating) ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Comment</label>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                      placeholder="Share your experience..." rows={4} required
                      className="input resize-none" />
                  </div>
                  <button type="submit" disabled={submitting || !reviewText.trim()}
                    className="btn btn-primary w-full disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Reviews list */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Reviews <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <div className="card p-14 text-center">
                <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No reviews yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Be the first to review {model.name}!</p>
              </div>
            ) : reviews.map(r => (
              <div key={r.id} className="card p-5 hover-lift animate-slide-up">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className="text-sm">{s <= Math.round(r.rating) ? '⭐' : '☆'}</span>
                    ))}
                    <span className="ml-2 text-xs font-bold" style={{ color: 'var(--accent-amber)' }}>{r.rating}/5</span>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {timeAgo(r.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIModelModal model={activeChatModel} onClose={() => setActiveChatModel(null)} />
    </div>
  );
}

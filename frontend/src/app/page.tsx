'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCategories, getRecommendations, getAINews, Category, Recommendation, NewsItem, IntegrationModel } from './services/api';
import { isAuthenticated, logout, getUser } from '../lib/auth';
import ModelCard from './components/ModelCard';
import AIModelModal from './components/AIModelModal';

const T = {
  bg: 'var(--bg)', panel: 'var(--bg-panel)', card: 'var(--bg-card)', elevated: 'var(--bg-elevated)',
  green: 'var(--green)', greenDim: 'var(--green-dim)', greenMuted: 'var(--green-muted)', greenFaint: 'var(--green-faint)',
  cyan: 'var(--cyan)', cyanDim: 'var(--cyan-dim)', border: 'var(--border)', borderCyan: 'var(--border-cyan)',
  amber: 'var(--amber)', pink: 'var(--pink)', text: 'var(--text)', muted: 'var(--muted)',
  mono: "var(--font-mono)",
};

const FEATURES = [
  { sym: '[AI]',  title: 'Intelligent Agent',     desc: 'Ask anything — get precise answers with citations.', col: T.green,   href: '/chat' },
  { sym: '[WEB]', title: 'Live Web Search',        desc: 'Real-time results fetched from the web.', col: T.cyan,    href: '/chat?q=/search+latest+AI+news' },
  { sym: '[REC]', title: 'Smart Recommendations',  desc: 'Describe your task — get the best-matched models.', col: T.amber,   href: '#search-box' },
  { sym: '[CMP]', title: 'Model Comparison',        desc: 'Side-by-side analysis with radar charts.', col: T.cyanDim, href: '/compare' },
  { sym: '[REV]', title: 'Community Reviews',       desc: 'Real user ratings to guide your decisions.', col: T.greenDim, href: '/models/1' },
  { sym: '[LLM]', title: 'Local LLM (Ollama)',      desc: 'Chat directly with your local Ollama model — no cloud.', col: T.pink,  href: '/chat?mode=ollama' },
];

const SUGGESTIONS = ['Python coding AI', 'best image generation model', 'free open source LLM', 'AI agent automation', 'research and analysis AI'];

import DecodeText from './components/DecodeText';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecs, setFilteredRecs] = useState<Recommendation[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeChatModel, setActiveChatModel] = useState<IntegrationModel | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pricingFilter, setPricingFilter] = useState('all');
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const user = getUser() as { full_name?: string; username?: string };
    if (user?.full_name) setUserName(user.full_name.split(' ')[0]);
    else if (user?.username) setUserName(user.username);

    getCategories().then(setCategories).catch(() => setError('Backend unreachable.'));
    getAINews().then(r => setNews(r.news)).catch(() => {});

    const t = setInterval(() => setSuggestionIdx(i => (i + 1) % SUGGESTIONS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (pricingFilter === 'all') setFilteredRecs(recommendations);
    else setFilteredRecs(recommendations.filter(r => r.model.pricing.toLowerCase().includes(pricingFilter)));
  }, [pricingFilter, recommendations]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setSearched(false);
    try {
      const data = await getRecommendations(query, selectedCategory);
      setRecommendations(data); setFilteredRecs(data); setSearched(true);
    } catch { setError('Cannot reach backend. Ensure it is running on port 8000.'); }
    finally { setLoading(false); }
  };

  const mono = T.mono;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: mono, color: T.text, fontSize: 13 }}>

      {/* ── NAVBAR ── */}
      <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              ARCHON
            <span style={{ color: T.muted, fontSize: 11 }}>v2.0</span>
          </Link>
          <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              ['~/matrix_home', '/'],
              ['~/cloud_chat', '/chat'],
              ['~/compare_llm', '/compare'],
              ['~/integrations', '/ai-integrations']
            ].map(([label, href]) => (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: 'rgba(0,229,255,0.03)', 
                  border: `1px solid ${T.border}`, 
                  color: T.muted, 
                  padding: '6px 12px', 
                  fontSize: 10, 
                  fontFamily: T.mono,
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.cyan; (e.currentTarget as HTMLElement).style.color = T.cyan; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.03)'; }}>
                  {label}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {authed && <span style={{ color: T.muted, fontSize: 11, display: 'none' }}>{userName}@archon</span>}
            {authed ? (
              <>
                <Link href="/profile" className="nav-link">~/profile</Link>
                <button onClick={logout} className="btn-danger" style={{ fontSize: 11, padding: '6px 12px' }}>logout</button>
              </>
            ) : (
              <Link href="/auth/login" className="btn-primary" style={{ fontSize: 11, padding: '6px 12px' }}>sign_in</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      {!searched && (
        <section style={{ padding: '80px 20px 40px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '4px 16px', background: T.bg, border: `1px solid ${T.greenMuted}`, color: T.muted, fontSize: 10, letterSpacing: '0.15em', marginBottom: 30, textTransform: 'uppercase', boxShadow: `0 0 20px ${T.greenFaint}` }}>
            <span style={{ color: T.green, marginRight: 8, animation: 'blink 1.5s infinite' }}>●</span>
            System Online · {categories.length > 0 ? '15+ Models Indexed' : 'Initializing...'} · Ollama Ready
          </div>

          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <h1 style={{ fontSize: 80, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff' }}>
              ARCHON
            </h1>
          </div>
          <p style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>
            AI Discovery &amp; Recommendation Engine
          </p>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Search 15+ AI models. Get smart recommendations. Chat with a local LLM agent.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 50 }}>
            <Link href="/chat" className="btn btn-primary" style={{ fontSize: 12 }}>
              [+] Start Chat
            </Link>
            <button onClick={() => document.getElementById('search-box')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn btn-secondary" style={{ fontSize: 12 }}>
              [~] Explore Models
            </button>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, textAlign: 'left', animation: 'fadeUp 0.5s ease 0.2s both' }}>
            {FEATURES.map((f, i) => (
              f.href.startsWith('#') ? (
                <button key={i} onClick={() => document.getElementById('search-box')?.scrollIntoView({ behavior: 'smooth' })}
                  className="card hover-lift"
                  style={{ padding: '16px', animationDelay: `${i * 60}ms`, textAlign: 'left', width: '100%', cursor: 'pointer', background: 'transparent', border: '1px solid #0d2e18', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = f.col + '66'; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${f.col}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0d2e18'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: f.col, marginBottom: 6, letterSpacing: '0.08em' }}>{f.sym}</div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: f.col, marginBottom: 4 }}>{f.title}</h3>
                  <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{f.desc}</p>
                  <div style={{ fontSize: 10, color: f.col, marginTop: 8, opacity: 0.7 }}>click to explore →</div>
                </button>
              ) : (
                <Link key={i} href={f.href}
                  className="card hover-lift"
                  style={{ padding: '16px', animationDelay: `${i * 60}ms`, display: 'block', textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = f.col + '66'; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${f.col}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0d2e18'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: f.col, marginBottom: 6, letterSpacing: '0.08em' }}>{f.sym}</div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: f.col, marginBottom: 4 }}>{f.title}</h3>
                  <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{f.desc}</p>
                  <div style={{ fontSize: 10, color: f.col, marginTop: 8, opacity: 0.7 }}>click to explore →</div>
                </Link>
              )
            ))}
          </div>
        </section>
      )}

      {/* ── NEWS ── */}
      {!searched && news.length > 0 && (
        <section style={{ padding: '30px 20px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>// trending_updates</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              {news.slice(0, 6).map((item, i) => (
                <a key={i} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
                  className="card hover-lift"
                  style={{ padding: '12px 14px', display: 'block', textDecoration: 'none' }}>
                  <div style={{ width: 6, height: 6, background: T.green, marginBottom: 8, animation: 'pulse 2s infinite', animationDelay: `${i * 300}ms` }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.greenDim, marginBottom: 4, lineHeight: 1.4 }}>{item.title}</p>
                  <p style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{item.snippet?.slice(0, 120)}...</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SEARCH ── */}
      <section id="search-box" style={{ padding: '20px', position: 'sticky', top: 48, zIndex: 40, background: searched ? 'rgba(13,18,32,0.95)' : 'transparent', borderBottom: searched ? `1px solid ${T.border}` : 'none', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {!searched && <div className="section-label" style={{ marginBottom: 12 }}>// search_models</div>}
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.green, fontWeight: 700, fontSize: 13 }}>&gt;</span>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={`e.g. "${SUGGESTIONS[suggestionIdx]}"`}
                  className="input" style={{ paddingLeft: 28, height: 40 }} />
              </div>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                className="input" style={{ height: 40, width: 160 }}>
                <option value="">all_categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button type="submit" disabled={!query.trim() || loading}
                className="btn btn-primary" style={{ height: 40, minWidth: 90, padding: '0 18px' }}>
                {loading ? <span style={{ display: 'flex', gap: 3 }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span> : 'search'}
              </button>
            </div>
          </form>
          {error && <p style={{ marginTop: 8, fontSize: 11, color: T.pink }}>[ERROR] {error}</p>}
        </div>
      </section>

      {/* ── RESULTS ── */}
      {searched && !loading && (
        <section style={{ padding: '24px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div>
                <div className="section-label">// results [{filteredRecs.length}] for: "{query}"</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>filter:</span>
                {['all', 'free', 'paid', 'freemium', 'open source'].map(f => (
                  <button key={f} onClick={() => setPricingFilter(f)}
                    style={{
                      fontSize: 10, padding: '3px 10px', fontFamily: mono, letterSpacing: '0.05em', textTransform: 'uppercase',
                      background: pricingFilter === f ? T.greenFaint : 'transparent',
                      border: `1px solid ${pricingFilter === f ? T.greenDim : T.border}`,
                      color: pricingFilter === f ? T.green : T.muted, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredRecs.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filteredRecs.map((rec, i) => (
                  <div key={rec.model.id} style={{ position: 'relative', animation: `fadeUp 0.3s ease ${i * 40}ms both` }}>
                    <div style={{ position: 'absolute', top: -10, left: -4, zIndex: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', background: T.bg, border: `1px solid ${T.green}`, color: T.green, letterSpacing: '0.06em' }}>
                      #{i + 1} · {(rec.match_score * 100).toFixed(0)}% match
                    </div>
                    <ModelCard model={rec.model} onChat={m => setActiveChatModel(m as IntegrationModel)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ color: T.muted }}>[0 results] No models match this filter.</p>
                <button onClick={() => setPricingFilter('all')} className="btn btn-ghost" style={{ marginTop: 12, fontSize: 11 }}>clear_filter</button>
              </div>
            )}

            <div className="sep" style={{ margin: '28px 0' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              <Link href="/compare" className="btn btn-secondary" style={{ fontSize: 11 }}>~/compare</Link>
              <Link href="/chat" className="btn btn-secondary" style={{ fontSize: 11 }}>~/chat</Link>
              <Link href="/ai-integrations" className="btn btn-secondary" style={{ fontSize: 11 }}>~/integrations</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      {!searched && (
        <footer style={{ padding: '24px 20px', borderTop: `1px solid ${T.border}`, textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ARCHON v2.0 · AI Discovery Engine · 15+ Models Indexed · Local LLM Support
          </p>
        </footer>
      )}

      <style>{`
        @keyframes glow { 0%,100% { text-shadow: 0 0 20px rgba(255,0,51,0.4); } 50% { text-shadow: 0 0 40px rgba(255,0,51,0.8), 0 0 80px rgba(255,0,51,0.3); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        option { background: #0d1220; color: #c8ffd4; }
      `}</style>

      <AIModelModal model={activeChatModel} onClose={() => setActiveChatModel(null)} />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getModels, AIModel, IntegrationModel } from '../services/api';
import ModelCard from '../components/ModelCard';
import AIModelModal from '../components/AIModelModal';

export default function ComparePage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selected, setSelected] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatModel, setActiveChatModel] = useState<IntegrationModel | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    getModels().then(setModels).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggle = (m: AIModel) => {
    if (selected.some(s => s.id === m.id)) setSelected(selected.filter(s => s.id !== m.id));
    else setSelected([...selected, m]);
  };

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.creator.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const metrics = [
    { key: 'coding_score' as keyof AIModel, label: '💻 Coding', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
    { key: 'reasoning_score' as keyof AIModel, label: '🧠 Reasoning', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', text: '#a78bfa' },
    { key: 'creative_score' as keyof AIModel, label: '🎨 Creative', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', text: '#fb923c' },
  ];

  // Radar chart using SVG
  function RadarChart({ models }: { models: AIModel[] }) {
    if (models.length === 0) return null;
    const size = 240;
    const cx = size / 2, cy = size / 2, r = 90;
    const axes = [
      { label: 'Coding', key: 'coding_score' as keyof AIModel },
      { label: 'Reasoning', key: 'reasoning_score' as keyof AIModel },
      { label: 'Creative', key: 'creative_score' as keyof AIModel },
    ];
    const n = axes.length;
    const colors = ['#06b6d4', '#f97316', '#10b981'];

    const getPoint = (angle: number, value: number, maxR: number) => {
      const rad = (angle - 90) * (Math.PI / 180);
      const dist = (value / 100) * maxR;
      return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
    };

    const axisAngles = axes.map((_, i) => (360 / n) * i);

    const gridLevels = [25, 50, 75, 100];

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {/* Grid */}
        {gridLevels.map(level => {
          const pts = axisAngles.map(a => getPoint(a, level, r));
          return (
            <polygon key={level}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke="rgba(255,0,51,0.5)" strokeWidth="1" />
          );
        })}
        {/* Axes */}
        {axisAngles.map((angle, i) => {
          const end = getPoint(angle, 100, r);
          const labelPt = getPoint(angle, 118, r);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,0,51,0.4)" strokeWidth="1" />
              <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fill="#3a6648" fontFamily="'JetBrains Mono',monospace">{axes[i].label}</text>
            </g>
          );
        })}
        {/* Model polygons */}
        {models.map((m, mi) => {
          const pts = axes.map((a, i) => getPoint(axisAngles[i], m[a.key] as number, r));
          return (
            <g key={m.id}>
              <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                fill={colors[mi] + '25'} stroke={colors[mi]} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p, pi) => (
                <circle key={pi} cx={p.x} cy={p.y} r="3.5" fill={colors[mi]} />
              ))}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090d1a', fontFamily: "'JetBrains Mono','Fira Code',monospace", color: '#c8ffd4' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,18,32,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15, letterSpacing: '0.1em' }}>ARCHON</span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>v4.3</span>
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
                  border: '1px solid rgba(255,0,51,0.2)', 
                  color: '#3a6648', 
                  padding: '6px 12px', 
                  fontSize: 10, 
                  fontFamily: "'JetBrains Mono',monospace",
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00ff9d'; (e.currentTarget as HTMLElement).style.color = '#00ff9d'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,157,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,0,51,0.2)'; (e.currentTarget as HTMLElement).style.color = '#3a6648'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.03)'; }}>
                  {label}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Link href="/" style={{ display: 'inline-block', fontSize: 11, color: 'var(--muted)', marginBottom: 12, textDecoration: 'none' }}>
              &larr; Back Home
            </Link>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--green)', letterSpacing: '-0.02em', margin: 0 }}>Compare Models</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Select unlimited models for side-by-side analysis.</p>
          </div>
          {selected.length > 0 && (
            <button onClick={() => setSelected([])} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }}>Clear Selection</button>
          )}
        </div>

        {/* Model Picker */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              All Models <span className="badge badge-cyan ml-2">{selected.length} SELECTED</span>
            </h2>
            <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search models..." className="input h-9 w-full sm:w-52"
              style={{ fontSize: '13px' }} />
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredModels.map(m => {
                const isSel = selected.some(s => s.id === m.id);
                const isDisabled = false;
                return (
                  <button key={m.id} onClick={() => toggle(m)} disabled={isDisabled}
                    className="p-3 rounded-xl text-left transition-all border-2 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#06b6d4] active:scale-95"
                    style={{
                      background: isSel ? 'rgba(6,182,212,0.08)' : 'var(--bg-elevated)',
                      borderColor: isSel ? '#06b6d4' : 'var(--border)',
                    }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold leading-tight pr-1" style={{ color: isSel ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        {m.name}
                      </span>
                      {isSel && (
                        <span className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                          style={{ background: 'var(--accent-cyan)' }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.creator}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Comparison */}
        {selected.length > 0 && (
          <div className="space-y-6 animate-slide-up">

            {/* Radar chart + legend */}
            <div className="card p-6">
              <h2 className="text-base font-bold mb-6">Performance Radar</h2>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <RadarChart models={selected} />
                <div className="flex flex-col gap-3">
                  {selected.map((m, i) => {
                    const colors = ['#06b6d4', '#f97316', '#10b981'];
                    const avg = ((m.coding_score + m.reasoning_score + m.creative_score) / 3).toFixed(1);
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: colors[i] }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.creator} · Avg {avg}/100</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Score bars per metric */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.map(({ key, label, color, bg, border, text }) => {
                const sorted = [...selected].sort((a, b) => (b[key] as number) - (a[key] as number));
                return (
                  <div key={String(key)} className="card p-5" style={{ background: bg, borderColor: border }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: text }}>{label}</h3>
                    <div className="space-y-4">
                      {sorted.map((m, idx) => (
                        <div key={m.id}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                            <div className="flex items-center gap-2">
                              {idx === 0 && selected.length > 1 && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse"
                                  style={{ background: color, color: '#fff' }}>Winner</span>
                              )}
                              <span className="text-xs font-bold" style={{ color: text }}>{m[key] as number}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${m[key]}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feature table */}
            <div className="card overflow-hidden">
              <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-bold">Feature Matrix</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Metric</th>
                      {selected.map(m => (
                        <th key={m.id} className="text-center px-5 py-3 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{m.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '💻 Coding Score', key: 'coding_score' as keyof AIModel },
                      { label: '🧠 Reasoning Score', key: 'reasoning_score' as keyof AIModel },
                      { label: '🎨 Creative Score', key: 'creative_score' as keyof AIModel },
                      { label: '💰 Pricing', key: 'pricing' as keyof AIModel },
                      { label: '👨‍💻 Creator', key: 'creator' as keyof AIModel },
                    ].map(({ label, key }, ri) => {
                      const maxVal = typeof selected[0]?.[key] === 'number'
                        ? Math.max(...selected.map(m => m[key] as number)) : null;
                      return (
                        <tr key={String(key)} style={{ borderTop: '1px solid var(--border-subtle)', background: ri % 2 ? 'var(--bg-elevated)' : 'transparent' }}>
                          <td className="px-5 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</td>
                          {selected.map(m => (
                            <td key={m.id} className="px-5 py-3 text-center text-xs font-medium"
                              style={{ color: maxVal !== null && m[key] === maxVal ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                              {String(m[key])}
                              {maxVal !== null && m[key] === maxVal && selected.length > 1 && ' 🏆'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model cards */}
            <div>
              <h2 className="text-base font-bold mb-4">Full Profiles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {selected.map(m => (
                  <ModelCard key={m.id} model={m} onChat={m => setActiveChatModel(m as IntegrationModel)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <AIModelModal model={activeChatModel} onClose={() => setActiveChatModel(null)} />
    </div>
  );
}

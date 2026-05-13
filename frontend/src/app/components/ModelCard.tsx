import React from 'react';
import Link from 'next/link';
import { AIModel } from '../services/api';

interface ModelCardProps {
  model: AIModel;
  onChat?: (model: AIModel) => void;
}

const PRICING_COLOR: Record<string, string> = {
  'paid':        'var(--cyan)',
  'freemium':    'var(--amber)',
  'free':        'var(--green)',
  'open source': 'var(--pink)',
};

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
      <span style={{ width: 54, color: 'var(--muted)' }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 0.7s ease' }} />
      </div>
      <span style={{ width: 22, textAlign: 'right', color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function ModelCard({ model, onChat }: ModelCardProps) {
  const priceKey = model.pricing?.toLowerCase() || '';
  const priceColor = PRICING_COLOR[priceKey] || 'var(--muted)';
  const avg = Math.round((model.coding_score + model.reasoning_score + model.creative_score) / 3);

  return (
    <div style={{ position: 'relative', height: '100%' }} className="group">
      <Link href={`/models/${model.id}`}
        className="card"
        style={{
          display: 'flex', flexDirection: 'column', gap: 12, padding: '16px',
          textDecoration: 'none', height: '100%', position: 'relative', overflow: 'hidden',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{model.name}</h3>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{model.creator}</p>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: 9999, border: `1px solid ${priceColor}44`,
            color: priceColor, background: `${priceColor}11`, flexShrink: 0,
          }}>{model.pricing}</span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {model.description}
        </p>

        {/* Scores */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>Performance</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: avg >= 85 ? 'var(--green)' : avg >= 70 ? 'var(--amber)' : 'var(--muted)' }}>Avg: {avg}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ScoreBar value={model.coding_score}    color="var(--cyan)" label="Code" />
            <ScoreBar value={model.reasoning_score} color="var(--pink)" label="Reasoning" />
            <ScoreBar value={model.creative_score}  color="var(--amber)" label="Creative" />
          </div>
        </div>

        {/* Category */}
        {model.category && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{model.category.name}</span>
          </div>
        )}
      </Link>

      {/* Chat overlay button */}
      {onChat && model.externalLink && (
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onChat(model); }}
          className="btn btn-ghost"
          style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 20,
            opacity: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '4px 12px', fontSize: 11
          }}
          title={`Chat with ${model.name}`}>Chat ↗</button>
      )}

      <style>{`.group:hover button { opacity: 1 !important; }`}</style>
    </div>
  );
}

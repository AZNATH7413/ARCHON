'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getIntegrations, IntegrationModel } from '../services/api';
import AIModelModal from '../components/AIModelModal';

export default function AIIntegrationsPage() {
  const [models, setModels] = useState<IntegrationModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<IntegrationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeModel, setActiveModel] = useState<IntegrationModel | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const data = await getIntegrations();
        setModels(data);
        setFilteredModels(data);
        
        // Extract unique categories
        const cats = new Set(data.map(m => m.category?.name || 'Uncategorized'));
        setCategories(['All', ...Array.from(cats)]);
      } catch (err) {
        console.error('Failed to load integrations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredModels(models);
    } else {
      setFilteredModels(models.filter(m => (m.category?.name || 'Uncategorized') === selectedCategory));
    }
  }, [selectedCategory, models]);

  return (
    <div style={{ minHeight: '100vh', background: '#090d1a', fontFamily: "'JetBrains Mono','Fira Code',monospace", color: '#c8ffd4' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,18,32,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15, letterSpacing: '0.1em' }}>ARCHON</span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>v2.0</span>
          </Link>
          <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/" className="nav-link">~/home</Link>
            <Link href="/chat" className="nav-link">~/chat</Link>
            <Link href="/compare" className="nav-link">~/compare</Link>
            <Link href="/ai-integrations" className="nav-link active" style={{ color: 'var(--green)' }}>~/integrations</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} />
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', minHeight: '80vh' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-block', padding: '3px 12px', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 24, textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--cyan)', marginRight: 6 }}>●</span>
            Integration Directory
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: 'var(--green)', letterSpacing: '-0.04em', margin: '0 0 16px 0' }}>
            AI INTEGRATIONS
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 600, margin: '0 auto' }}>
            Access, launch, and chat with top AI models directly from your ARCHON dashboard. 
            Compare capabilities and jump straight into the native tools.
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'var(--green)' : 'transparent',
                color: selectedCategory === cat ? '#000' : 'var(--green)',
                border: '1px solid var(--green)',
                padding: '6px 16px',
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: selectedCategory === cat ? 700 : 400,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Models Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ color: 'var(--green)' }}>Loading integrations...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredModels.map((model) => {
              const avg = Math.round((model.coding_score + model.reasoning_score + model.creative_score) / 3);
              return (
                <div key={model.id} style={{ 
                  background: 'var(--card)', border: '1px solid var(--border)', 
                  display: 'flex', flexDirection: 'column', position: 'relative'
                }}>
                  {/* Top accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--green), transparent)' }} />
                  
                  <div style={{ padding: 20, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', margin: 0 }}>{model.name}</h3>
                      <span style={{ fontSize: 9, color: 'var(--cyan)', border: '1px solid var(--borderCyan)', padding: '2px 6px', textTransform: 'uppercase' }}>
                        {model.category?.name || 'Misc'}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20, height: 50, overflow: 'hidden' }}>
                      {model.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Score</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: avg >= 85 ? 'var(--green)' : avg >= 70 ? 'var(--amber)' : 'var(--muted)' }}>{avg}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <button 
                      onClick={() => setActiveModel(model)}
                      style={{ 
                        background: 'transparent', border: 'none', borderRight: '1px solid var(--border)',
                        color: 'var(--green)', padding: '12px 0', fontSize: 11, fontFamily: 'inherit',
                        cursor: 'pointer', transition: 'background 0.2s', textTransform: 'uppercase'
                      }}
                      onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(0,255,65,0.1)'}
                      onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
                    >
                      [Chat]
                    </button>
                    <a 
                      href={model.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        background: 'transparent', border: 'none',
                        color: 'var(--cyan)', padding: '12px 0', fontSize: 11, fontFamily: 'inherit',
                        cursor: 'pointer', transition: 'background 0.2s', textTransform: 'uppercase',
                        textDecoration: 'none', textAlign: 'center'
                      }}
                      onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(0,229,255,0.1)'}
                      onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
                    >
                      [Launch Native]
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AIModelModal 
        model={activeModel} 
        onClose={() => setActiveModel(null)} 
      />
    </div>
  );
}

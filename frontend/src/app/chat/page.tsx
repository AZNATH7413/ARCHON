'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken, getUser, clearAuth } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const OLLAMA = 'http://localhost:11434';

const T = {
  bg: 'var(--bg)', panel: 'var(--bg-panel)', card: 'var(--bg-card)',
  green: 'var(--green)', greenDim: 'var(--green-dim)', greenMuted: 'var(--green-muted)', greenFaint: 'var(--green-faint)',
  cyan: 'var(--cyan)', cyanDim: 'var(--cyan-dim)', border: 'var(--border)', borderCyan: 'var(--border-cyan)',
  amber: 'var(--amber)', pink: 'var(--pink)', text: 'var(--text)', muted: 'var(--muted)',
  mono: "var(--font-mono)",
};

interface Msg { id: string; role: 'user' | 'assistant'; content: string; time: string; sources?: any[]; ollamaUsed?: boolean; loading?: boolean; }
interface OllamaStatus { online: boolean; models: string[]; }

const QUICK = [
  { cmd: 'best AI for Python coding', label: '/recommend coding' },
  { cmd: '/search latest AI news 2025', label: '/search AI news' },
  { cmd: 'compare Claude 4.6 and GPT-5.4', label: '/compare models' },
  { cmd: 'show all free AI models', label: '/list free' },
  { cmd: 'best AI agent tools', label: '/agents' },
];

const WELCOME_ARCHON: Msg = {
  id: 'w1', role: 'assistant', time: '',
  content: `ARCHON Agent v2.0 — Ready
━━━━━━━━━━━━━━━━━━━━━━

> Connected to recommendation engine
> ${0} models indexed
> Web search enabled

Commands:
  /search [query]       live web search
  /recommend [task]     find best model
  /compare [a] vs [b]   side-by-side
  /list                 all models
  /free                 free models only`,
};

const WELCOME_OLLAMA: Msg = {
  id: 'w2', role: 'assistant', time: '',
  content: `Ollama Direct v2.0 — Local LLM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Connecting to localhost:11434...
> No data leaves your machine

Type anything to chat with your local model.`,
};

const WELCOME_CLOUD: Msg = {
  id: 'w3', role: 'assistant', time: '',
  content: `OmniCloud AI v2.0 — Live Cloud Models
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Connected to DuckDuckGo OmniCloud
> Free access to GPT-4o-mini, Claude 3 Haiku, Llama 3.1 70B
> Lightning fast response times

Select a model from the top bar to begin.`,
};

function Dots() {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(x => (x + 1) % 4), 400); return () => clearInterval(t); }, []);
  return <span style={{ color: T.greenDim }}>{'> querying' + '.'.repeat(n)}<span style={{ animation: 'blink 1s infinite', display: 'inline-block' }}>_</span></span>;
}

function renderMd(txt: string, green: string, cyan: string, muted: string) {
  return txt
    .replace(/^## (.+)$/gm, `<div style="color:${cyan};font-weight:700;font-size:13px;border-bottom:1px solid #0d2e18;padding-bottom:3px;margin:10px 0 4px">$1</div>`)
    .replace(/^### (.+)$/gm, `<div style="color:${green};font-weight:600;margin:7px 0 3px">▸ $1</div>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${green}">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code style="color:${cyan};background:#1a0006;padding:1px 5px;border:1px solid #80001a">$1</code>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" style="color:${cyan};text-decoration:underline dotted">$1↗</a>`)
    .replace(/^\|(.+)\|$/gm, row => {
      const cells = row.split('|').filter(Boolean);
      if (cells.every(c => /^[-: ]+$/.test(c))) return '';
      return `<tr>${cells.map(c => `<td style="padding:3px 10px;border-right:1px solid #33000a;color:#ffd4d4">${c.trim()}</td>`).join('')}</tr>`;
    })
    .replace(/(<tr>.*?<\/tr>)+/gs, m => `<table style="border-collapse:collapse;margin:8px 0;border:1px solid #33000a;font-size:11px">${m}</table>`)
    .replace(/^- (.+)$/gm, `<div style="display:flex;gap:8px;margin:2px 0"><span style="color:${green}">▸</span><span>$1</span></div>`)
    .replace(/^(\d+)\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:2px 0"><span style="color:${cyan};font-weight:700">$1.</span><span>$2</span></div>`)
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
}

function ChatContent() {
  const router = useRouter();
  const sp = useSearchParams();

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => (prev ? prev + ' ' : '') + transcript);
          setIsRecording(false);
        };

        recognitionRef.current.onerror = () => {
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  };

  const speakText = (text: string) => {
    if (!autoRead || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Clean markdown before speaking
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(utterance);
  };

  const initMode = ['ollama', 'cloud'].includes(sp.get('mode') || '') ? (sp.get('mode') as 'ollama' | 'cloud') : 'archon';
  const [mode, setMode] = useState<'archon' | 'ollama' | 'cloud'>(initMode);

  const [archonMsgs, setArchonMsgs] = useState<Msg[]>([WELCOME_ARCHON]);
  const [ollamaMsgs, setOllamaMsgs] = useState<Msg[]>([WELCOME_OLLAMA]);
  const [cloudMsgs, setCloudMsgs] = useState<Msg[]>([WELCOME_CLOUD]);

  const msgs = mode === 'archon' ? archonMsgs : (mode === 'cloud' ? cloudMsgs : ollamaMsgs);
  const setMsgs = mode === 'archon' ? setArchonMsgs : (mode === 'cloud' ? setCloudMsgs : setOllamaMsgs);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaModel, setOllamaModel] = useState('');
  const [cloudModel, setCloudModel] = useState('gpt-4o-mini');
  const [user, setUser] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!getToken()) { router.replace('/auth/login'); return; }
    setUser(getUser());
    checkOllama();
    const t = setInterval(checkOllama, 30000);
    return () => clearInterval(t);
  }, [router]);

  // Restore mode from query param on load
  useEffect(() => {
    const m = sp.get('mode');
    if (m === 'ollama' || m === 'cloud') setMode(m);
  }, [sp]);

  // Pre-fill search from query param
  useEffect(() => {
    const q = sp.get('q');
    if (q) { setInput(q); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [sp]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const checkOllama = async () => {
    try {
      const r = await fetch(`${API}/ollama/status`);
      if (r.ok) {
        const d = await r.json();
        setOllamaStatus(d);
        if (d.models?.length) setOllamaModel(d.models[0]);
      }
    } catch { setOllamaStatus({ online: false, models: [] }); }
  };

  const sendArchon = async (text: string) => {
    const id = Date.now().toString();
    const loadId = (Date.now() + 1).toString();
    setMsgs(p => [...p, { id, role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, { id: loadId, role: 'assistant', content: '', time: '', loading: true }]);
    try {
      const r = await fetch(`${API}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: text, model: ollamaModel === 'auto' ? undefined : ollamaModel }),
      });
      if (r.status === 401) { clearAuth(); router.replace('/auth/login'); return; }
      const d = r.ok ? await r.json() : null;
      const reply: Msg = { id: (Date.now() + 2).toString(), role: 'assistant', content: d?.response || 'Error connecting to backend.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sources: d?.sources || [], ollamaUsed: d?.ollama_used || false };
      setMsgs(p => p.filter(m => m.id !== loadId).concat(reply));
      if (d?.ollama_status) setOllamaStatus(d.ollama_status);
    } catch {
      setMsgs(p => p.filter(m => m.id !== loadId).concat({ id: (Date.now() + 2).toString(), role: 'assistant', content: `ERROR: Cannot connect to ${API}.`, time: '' }));
    }
  };

  const sendOllama = async (text: string) => {
    if (!ollamaStatus?.online) {
      setMsgs(p => [...p, { id: Date.now().toString(), role: 'user', content: text, time: '' },
      { id: (Date.now() + 1).toString(), role: 'assistant', content: 'ERROR: Ollama is offline. Start it with: ollama serve', time: '' }]);
      return;
    }
    const model = ollamaModel || ollamaStatus?.models?.[0] || 'phi3:mini';
    const loadId = (Date.now() + 1).toString();
    setMsgs(p => [...p,
    { id: Date.now().toString(), role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { id: loadId, role: 'assistant', content: '', time: '', loading: true }
    ]);
    try {
      const r = await fetch(`${API}/chat/ollama-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: text, model: model }),
      });
      if (r.status === 401) { clearAuth(); router.replace('/auth/login'); return; }
      const d = r.ok ? await r.json() : null;
      setMsgs(p => p.filter(m => m.id !== loadId).concat({
        id: (Date.now() + 2).toString(), role: 'assistant',
        content: d?.response?.trim() || 'No response from Ollama.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ollamaUsed: true,
      }));
      if (d?.response) speakText(d.response.trim());
    } catch {
      setMsgs(p => p.filter(m => m.id !== loadId).concat({ id: (Date.now() + 2).toString(), role: 'assistant', content: 'ERROR: Cannot connect to Ollama backend.', time: '' }));
    }
  };

  const sendCloud = async (text: string) => {
    const loadId = (Date.now() + 1).toString();
    setMsgs(p => [...p,
    { id: Date.now().toString(), role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { id: loadId, role: 'assistant', content: '', time: '', loading: true }
    ]);
    try {
      const r = await fetch(`${API}/chat/cloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: text, model: cloudModel }),
      });
      if (r.status === 401) { clearAuth(); router.replace('/auth/login'); return; }
      const d = r.ok ? await r.json() : null;
      setMsgs(p => p.filter(m => m.id !== loadId).concat({
        id: (Date.now() + 2).toString(), role: 'assistant',
        content: d?.response?.trim() || 'No response from OmniCloud.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ollamaUsed: true,
      }));
      if (d?.response) speakText(d.response.trim());
    } catch {
      setMsgs(p => p.filter(m => m.id !== loadId).concat({ id: (Date.now() + 2).toString(), role: 'assistant', content: 'ERROR: Cannot connect to OmniCloud backend.', time: '' }));
    }
  };

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    let resolved = t;
    if (t.startsWith('/search ')) resolved = `Search the web: ${t.slice(8)}`;
    if (t.startsWith('/recommend ')) resolved = `Recommend AI model for: ${t.slice(11)}`;
    if (t === '/list') resolved = 'List all AI models';
    if (t === '/free') resolved = 'Show all free AI models';
    setHistory(h => [t, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    setLoading(true);
    if (mode === 'archon') await sendArchon(resolved);
    else if (mode === 'cloud') await sendCloud(resolved);
    else await sendOllama(resolved);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loading, mode, ollamaStatus, ollamaModel]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    if (e.key === 'ArrowUp' && !input) { const i = Math.min(histIdx + 1, history.length - 1); setHistIdx(i); setInput(history[i] || ''); }
    if (e.key === 'ArrowDown') { const i = Math.max(histIdx - 1, -1); setHistIdx(i); setInput(i === -1 ? '' : history[i]); }
  };

  const copy = (id: string, txt: string) => { navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(null), 1500); };
  const displayName = user?.username || user?.full_name || 'user';
  const isArchon = mode === 'archon';
  const accentColor = isArchon ? T.green : T.cyan;
  const accentBorder = isArchon ? T.greenMuted : T.borderCyan;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, fontFamily: T.mono, color: T.text, fontSize: 13 }}>
      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 220 : 0, minWidth: sidebarOpen ? 220 : 0, overflow: 'hidden', background: T.panel, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', transition: 'all 0.2s', flexShrink: 0 }}>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220, height: '100%' }}>
          {/* Brand */}
          <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ color: T.green, fontWeight: 700, fontSize: 14, letterSpacing: '0.1em' }}>
              ARCHON&gt;_
            </div>
            <div style={{ color: T.muted, fontSize: 10, marginTop: 2 }}>AI Discovery Engine v2.0</div>
          </div>

          {/* Mode switcher */}
          <div>
            <div style={{ color: T.muted, fontSize: 10, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mode</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {([['archon', 'ARCHON Agent', T.green], ['cloud', 'OmniCloud AI', T.amber], ['ollama', 'Ollama Direct', T.cyan]] as const).map(([m, label, col]) => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ background: mode === m ? `${col}11` : 'transparent', border: `1px solid ${mode === m ? col : T.border}`, color: mode === m ? col : T.muted, padding: '5px 8px', cursor: 'pointer', fontFamily: T.mono, fontSize: 11, textAlign: 'left', transition: 'all 0.15s' }}>
                  {mode === m ? '▶ ' : ''}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Ollama status */}
          <div style={{ fontSize: 10 }}>
            <span style={{ color: ollamaStatus?.online ? T.green : T.muted }}>
              {ollamaStatus?.online ? `● OLLAMA ONLINE` : '○ OLLAMA OFFLINE'}
            </span>
            {ollamaStatus?.online && ollamaStatus.models.length > 0 && (
              <div style={{ color: T.muted, marginTop: 3 }}>
                Active: {ollamaModel === 'auto' ? 'Agent Pick' : (ollamaModel || ollamaStatus.models[0])}
              </div>
            )}
          </div>

          {/* New chat */}
          <button onClick={() => setMsgs([mode === 'archon' ? WELCOME_ARCHON : mode === 'cloud' ? WELCOME_CLOUD : WELCOME_OLLAMA])}
            style={{ background: 'transparent', border: `1px solid ${accentColor}`, color: accentColor, padding: '6px 10px', cursor: 'pointer', fontFamily: T.mono, fontSize: 11, textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = accentColor; (e.target as HTMLElement).style.color = T.bg; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = accentColor; }}>
            [+] NEW CONVERSATION
          </button>

          {/* Quick commands (archon only) */}
          {isArchon && (
            <div>
              <div style={{ color: T.muted, fontSize: 10, marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Commands</div>
              {QUICK.map((c, i) => (
                <button key={i} onClick={() => send(c.cmd)}
                  style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: T.greenDim, padding: '3px 2px', cursor: 'pointer', fontFamily: T.mono, fontSize: 11, textAlign: 'left', transition: 'color 0.1s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = T.cyan}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = T.greenDim}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Nav */}
          <div style={{ marginTop: 'auto', borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            {[['~/home', '/'], ['~/compare', '/compare'], ['~/integrations', '/ai-integrations'], ['~/profile', '/profile']].map(([label, href]) => (
              <Link key={href} href={href} style={{ display: 'block', color: T.muted, fontSize: 11, padding: '3px 2px', textDecoration: 'none', transition: 'color 0.1s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = T.cyan}
                onMouseLeave={e => (e.target as HTMLElement).style.color = T.muted}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', fontFamily: T.mono, fontSize: 14, padding: '2px 6px' }}>{sidebarOpen ? '◂' : '▸'}</button>
            <span style={{ color: accentColor, fontWeight: 900, letterSpacing: '0.1em', textShadow: `0 0 10px ${accentColor}` }}>
              {mode === 'archon' ? 'ARCHON AGENT' : mode === 'cloud' ? 'OMNICLOUD AI' : 'OLLAMA DIRECT'}
            </span>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: T.muted }}>
                <input type="checkbox" checked={autoRead} onChange={e => setAutoRead(e.target.checked)} />
                Auto-Speak
              </label>
              {mode === 'cloud' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase' }}>Model:</span>
                  <select value={cloudModel} onChange={e => setCloudModel(e.target.value)}
                    style={{
                      background: T.card, border: `1px solid ${T.amber}`, color: T.amber,
                      fontFamily: T.mono, fontSize: 12, padding: '4px 8px', borderRadius: 4, outline: 'none', cursor: 'pointer', minWidth: 140
                    }}>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                    <option value="llama-3.1-70b">Llama 3.1 70B</option>
                    <option value="mixtral-8x7b">Mixtral 8x7B</option>
                  </select>
                </div>
              )}

              {mode !== 'cloud' && ollamaStatus?.online && ollamaStatus.models.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase' }}>Model:</span>
                  <select value={ollamaModel} onChange={e => setOllamaModel(e.target.value)}
                    style={{
                      background: T.card, border: `1px solid ${accentBorder}`, color: accentColor,
                      fontFamily: T.mono, fontSize: 12, padding: '4px 8px', borderRadius: 4, outline: 'none', cursor: 'pointer', minWidth: 140
                    }}>
                    {mode === 'archon' && <option value="auto">Auto (Agent Pick)</option>}
                    {ollamaStatus.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>

            {mode === 'archon' && !ollamaStatus?.online && (
              <span style={{ color: accentColor, fontSize: 10, border: `1px solid ${accentBorder}`, padding: '1px 6px' }}>
                WEB-ONLY
              </span>
            )}

            {mode === 'ollama' && !ollamaStatus?.online && (
              <span style={{ color: accentColor, fontSize: 10, border: `1px solid ${accentBorder}`, padding: '1px 6px' }}>
                OFFLINE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{displayName}@archon</span>
            <button onClick={() => { clearAuth(); router.push('/auth/login'); }}
              className="cyber-btn cyber-btn-danger" style={{ fontSize: 10, padding: '6px 10px' }}>
              logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${T.greenMuted} ${T.panel}` }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {msgs.map(msg => (
              <div key={msg.id} style={{ marginBottom: 16, animation: 'fadeIn 0.25s ease' }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ color: T.muted, fontSize: 10 }}>{msg.time}</span>
                        <span style={{ color: accentColor, fontSize: 10, fontWeight: 700 }}>{displayName}</span>
                      </div>
                      <div style={{ background: '#001a30', border: `1px solid ${accentColor}44`, padding: '8px 14px', color: accentColor, lineHeight: 1.6 }}>
                        <span style={{ color: accentColor, opacity: 0.5, marginRight: 6 }}>&gt;</span>{msg.content}
                      </div>
                    </div>
                  </div>
                ) : msg.loading ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: accentColor, fontWeight: 700, marginTop: 2, fontSize: 12 }}>$</span>
                    <div style={{ border: `1px solid ${T.border}`, padding: '10px 14px', flex: 1 }}><Dots /></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: accentColor, fontWeight: 700, marginTop: 10, fontSize: 12, flexShrink: 0 }}>$</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: accentColor, fontSize: 10, fontWeight: 700 }}>{mode === 'archon' ? 'ARCHON' : mode === 'cloud' ? 'OMNICLOUD' : 'OLLAMA'}</span>
                        {msg.time && <span style={{ color: T.muted, fontSize: 10 }}>{msg.time}</span>}
                        {msg.ollamaUsed && <span style={{ color: T.green, fontSize: 9, border: `1px solid ${mode === 'cloud' ? T.amber : T.greenMuted}`, padding: '1px 5px' }}>LLM</span>}
                        {msg.sources && msg.sources.length > 0 && <span style={{ color: T.cyan, fontSize: 9, border: `1px solid ${T.borderCyan}`, padding: '1px 5px' }}>[{msg.sources.length} src]</span>}
                        <button onClick={() => copy(msg.id, msg.content)} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', fontFamily: T.mono, fontSize: 9, padding: '1px 4px', marginLeft: 'auto' }}>
                          {copied === msg.id ? '[copied]' : '[copy]'}
                        </button>
                      </div>
                      <div style={{ border: `1px solid ${T.border}`, padding: '10px 14px', lineHeight: 1.7, color: T.text }}
                        dangerouslySetInnerHTML={{ __html: renderMd(msg.content, T.green, T.cyanDim, T.muted) }} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: '#00100a', border: `1px solid ${T.border}`, fontSize: 11 }}>
                          <div style={{ color: T.greenMuted, marginBottom: 4, letterSpacing: '0.06em', fontSize: 10 }}>SOURCES</div>
                          {msg.sources.map((s: any, i: number) => (
                            <div key={i} style={{ marginBottom: 3 }}>
                              <span style={{ color: T.muted }}>[{i + 1}]</span>{' '}
                              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: T.cyanDim, textDecoration: 'underline dotted' }}>{s.title}</a>
                                : <span style={{ color: T.cyanDim }}>{s.title}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div className="glass" style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
          {mode === 'ollama' && !ollamaStatus?.online && (
            <div style={{ maxWidth: 820, margin: '0 auto 8px', padding: '6px 10px', border: `1px solid ${T.amber}44`, background: 'rgba(255,170,0,0.05)', color: T.amber, fontSize: 11, boxShadow: `0 0 10px ${T.amber}22` }}>
              ⚠ Ollama offline. Run: <code style={{ color: T.cyan }}>ollama serve</code> in a terminal.
            </div>
          )}
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', border: `1px solid ${loading ? accentColor : T.border}`, padding: '8px 12px', background: 'rgba(5,10,21,0.8)', backdropFilter: 'blur(10px)', transition: 'all 0.3s', boxShadow: loading ? `0 0 20px ${accentColor}44, inset 0 0 10px ${accentColor}22` : '0 4px 20px rgba(0,0,0,0.5)' }}>
              <span style={{ color: accentColor, fontWeight: 900, fontSize: 14, flexShrink: 0, marginBottom: 2, textShadow: `0 0 8px ${accentColor}` }}>&gt;</span>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                disabled={loading}
                placeholder={mode === 'archon' ? 'ask anything... (/search, /recommend, /compare)' : mode === 'cloud' ? 'chat with cloud models (GPT-4o-mini, Claude 3)...' : 'chat with local Ollama model...'}
                rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', color: accentColor, fontFamily: T.mono, fontSize: 13, fontWeight: 500, outline: 'none', resize: 'none', lineHeight: 1.6, maxHeight: 100, overflowY: 'auto', opacity: loading ? 0.5 : 1, caretColor: accentColor, textShadow: `0 0 5px ${accentColor}44` }}
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }} />
              <button onClick={toggleRecording}
                className="btn btn-ghost"
                style={{ padding: '6px 10px', fontSize: 14, color: isRecording ? '#ef4444' : T.muted }}>
                {isRecording ? '🎙️' : '🎤'}
              </button>
              <button onClick={() => send(input)} disabled={loading || !input.trim()}
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: 11, opacity: input.trim() && !loading ? 1 : 0.5 }}>
                SEND
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: T.muted }}>
              <span>ENTER=send · SHIFT+ENTER=newline · ↑↓=history</span>
              <span>{ollamaStatus?.online ? `● ${ollamaModel || ollamaStatus.models[0] || 'ollama'}` : '○ web-only'}</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *::-webkit-scrollbar-thumb{background:${T.greenMuted}}
        ::placeholder{color:${T.muted};font-family:${T.mono}}
        ::selection{background:rgba(255,255,255,0.2)}
        option{background:var(--bg-panel);color:var(--text)}
      `}} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', color: 'var(--muted)' }}>Loading chat interface...</div>}>
      <ChatContent />
    </Suspense>
  );
}

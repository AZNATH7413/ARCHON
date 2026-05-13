'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken, getUser, clearAuth, logout } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

const T = {
  bg: '#050a15', panel: '#0a0f1d', card: '#0d1225',
  green: '#00ff9d', greenDim: '#00cc7e', greenMuted: '#004d30',
  cyan: '#00e5ff', cyanDim: '#00b8cc', border: '#1f2937',
  amber: '#ffb300', pink: '#ff4081', text: '#e0e7ff', muted: '#94a3b8',
  mono: "var(--font-mono)",
};

interface Msg { id: string; role: 'user' | 'assistant'; content: string; time: string; sources?: any[]; loading?: boolean; }

const WELCOME_CLOUD: Msg = {
  id: 'w3', role: 'assistant', time: '',
  content: `OmniCloud AI v4.1 — High-Fidelity Intelligence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Cloud Matrix: Synchronized
> Global Model Library: Active (25+ models)
> Real-time Inference: Online

Choose your engine from the Model Selector and transmit your query.`,
};

function Dots() {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(x => (x + 1) % 4), 400); return () => clearInterval(t); }, []);
  return <span style={{ color: T.cyan }}>{'> processing' + '.'.repeat(n)}</span>;
}

function renderMd(txt: string, green: string, cyan: string, muted: string) {
  return txt
    .replace(/^## (.+)$/gm, `<button style="width:100%;text-align:left;background:rgba(0,229,255,0.05);border:1px solid ${cyan}44;color:${cyan};font-weight:700;font-size:13px;padding:8px 12px;margin:12px 0 6px;cursor:default;font-family:inherit;display:block">INTERFACE_SECTION: $1</button>`)
    .replace(/^### (.+)$/gm, `<div style="color:${green};font-weight:600;margin:8px 0 4px">▸ $1</div>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${green}">$1</strong>`)
    .replace(/```([\s\S]+?)```/g, `<pre style="color:${cyan};background:#0a0e27;padding:12px;border:1px solid #1e293b;border-radius:6px;overflow-x:auto;font-family:monospace;font-size:12px;margin:10px 0"><code>$1</code></pre>`)
    .replace(/`([^`]+)`/g, `<code style="color:${cyan};background:rgba(0,229,255,0.1);padding:1px 5px;border-radius:3px">$1</code>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" style="color:${cyan};text-decoration:underline">$1↗</a>`)
    .replace(/^- (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;line-height:1.5"><span style="color:${green};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^(\d+)\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;line-height:1.5"><span style="color:${cyan};font-weight:700;flex-shrink:0">$1.</span><span>$2</span></div>`)
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
}

function ChatContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [isRecording, setIsRecording] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => (prev ? prev + ' ' : '') + transcript);
          setIsRecording(false);
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }
    else { try { recognitionRef.current?.start(); setIsRecording(true); } catch { setIsRecording(false); } }
  };

  const [messages, setMessages] = useState<Msg[]>([WELCOME_CLOUD]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cloudModel, setCloudModel] = useState('gpt-4o-mini');
  const [user, setUser] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!getToken()) { logout(); return; }
    setUser(getUser());
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.status === 401) { logout(); return; }
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadConversation = async (conv: any) => {
    if (isMobile) setSidebarOpen(false);
    setActiveConv(conv.id);
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      const fullConv = data.find((c: any) => c.id === conv.id);
      if (fullConv?.messages) {
        setMessages(fullConv.messages.map((m: any) => ({
          id: m.id.toString(), role: m.role, content: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (e) { console.error(e); }
  };

  const deleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      const res = await fetch(`${API}/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.status === 401) { logout(); return; }
      if (res.ok) {
        setHistory(h => h.filter(c => c.id !== id));
        if (activeConv === id) { setActiveConv(null); setMessages([WELCOME_CLOUD]); }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const sendCloud = async (text: string) => {
    const loadId = (Date.now() + 1).toString();
    setMessages(p => [...p,
      { id: Date.now().toString(), role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { id: loadId, role: 'assistant', content: '', time: '', loading: true }
    ]);

    let convId = activeConv;
    if (!convId) {
      try {
        const cRes = await fetch(`${API}/chat/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ title: text.slice(0, 30) + (text.length > 30 ? '...' : '') }),
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          convId = cData.id;
          setActiveConv(convId);
          fetchConversations();
        }
      } catch {}
    }
    if (convId) {
      fetch(`${API}/chat/conversations/${convId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ role: 'user', content: text })
      }).catch(console.error);
    }

    try {
      const r = await fetch(`${API}/chat/cloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: text, model: cloudModel }),
      });
      const d = r.ok ? await r.json() : null;
      const replyContent = d?.response || 'Error connecting to OmniCloud.';

      if (convId && d?.response) {
        fetch(`${API}/chat/conversations/${convId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ role: 'assistant', content: replyContent })
        }).catch(console.error);
      }

      setMessages(p => p.filter(m => m.id !== loadId).concat({
        id: (Date.now() + 2).toString(), role: 'assistant',
        content: replyContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } catch {
      setMessages(p => p.filter(m => m.id !== loadId).concat({ id: (Date.now() + 2).toString(), role: 'assistant', content: 'ERROR: Connection failure.', time: '' }));
    }
  };

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setCommandHistory(h => [t, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    setLoading(true);
    await sendCloud(t);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loading, cloudModel, activeConv]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    if (e.key === 'ArrowUp' && !input) { const i = Math.min(histIdx + 1, commandHistory.length - 1); setHistIdx(i); setInput(commandHistory[i] || ''); }
    if (e.key === 'ArrowDown') { const i = Math.max(histIdx - 1, -1); setHistIdx(i); setInput(i === -1 ? '' : commandHistory[i]); }
  };

  const copy = (id: string, txt: string) => { navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(null), 1500); };
  const displayName = user?.username || 'User';

  return (
    <div className="cyber-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, fontFamily: T.mono, color: T.text, fontSize: 13 }}>
      <div className="scanline" />
      <div className={`cyber-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ 
        width: sidebarOpen ? 260 : 0, 
        minWidth: sidebarOpen ? 260 : 0, 
        background: T.panel, 
        borderRight: `1px solid ${T.border}`, 
        display: 'flex', 
        flexDirection: 'column', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
        flexShrink: 0, 
        overflow: 'hidden',
        position: isMobile ? 'absolute' : 'relative',
        zIndex: 1000,
        height: '100%'
      }}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 260, height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
            <div>
              <div style={{ color: T.cyan, fontWeight: 800, fontSize: 18, letterSpacing: '0.15em', textShadow: `0 0 10px ${T.cyan}44` }}>ARCHON OMNI</div>
              <div style={{ color: T.muted, fontSize: 10, marginTop: 4 }}>Cloud Matrix v4.1</div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: `1px solid ${T.pink}44`, color: T.pink, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>CLOSE [X]</button>
            )}
          </div>

          <button onClick={() => { setActiveConv(null); setMessages([WELCOME_CLOUD]); if (isMobile) setSidebarOpen(false); }}
            style={{ background: 'rgba(0,229,255,0.05)', border: `1px solid ${T.cyan}`, color: T.cyan, padding: '10px', cursor: 'pointer', fontFamily: T.mono, fontSize: 11, textAlign: 'center', transition: 'all 0.2s', fontWeight: 600 }}>
            [+] NEW SESSION
          </button>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ color: T.muted, fontSize: 10, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Memory Banks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => loadConversation(c)}
                    style={{ flex: 1, background: activeConv === c.id ? 'rgba(0,229,255,0.1)' : 'transparent', border: activeConv === c.id ? `1px solid ${T.cyan}44` : 'none', color: activeConv === c.id ? T.cyan : T.muted, padding: '8px 10px', cursor: 'pointer', fontFamily: T.mono, fontSize: 11, textAlign: 'left', transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title || 'Untitled_Entry'}
                  </button>
                  <button onClick={(e) => deleteConversation(e, c.id)} style={{ color: T.pink, padding: '4px', fontSize: 10, cursor: 'pointer', background: 'transparent', border: 'none', opacity: 0.5 }}>[X]</button>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
            <div style={{ color: T.muted, fontSize: 10, marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Navigation Matrix</div>
            {[
              ['~/matrix_home', '/'],
              ['~/compare_llm', '/compare'],
              ['~/integrations', '/ai-integrations'],
              ['~/user_profile', '/profile']
            ].map(([label, href]) => (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: 'rgba(0,229,255,0.03)', 
                  border: `1px solid ${T.border}`, 
                  color: T.muted, 
                  padding: '8px 10px', 
                  fontSize: 11, 
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

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted }}>{displayName}@archon</span>
              <button onClick={() => { clearAuth(); router.push('/auth/login'); }} style={{ color: T.pink, fontSize: 10, cursor: 'pointer', background: 'transparent', border: `1px solid ${T.pink}44`, padding: '4px 8px' }}>DISCONNECT</button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${T.border}`, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', color: T.cyan, cursor: 'pointer', fontSize: 16 }}>{sidebarOpen ? '◂' : '▸'}</button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: T.cyan, fontWeight: 900, fontSize: 14, letterSpacing: '0.1em' }}>OMNICLOUD AI</span>
              <span style={{ color: T.green, fontSize: 9 }}>STATUS: OPTIMAL</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <select value={cloudModel} onChange={e => setCloudModel(e.target.value)}
              style={{ background: T.card, border: `1px solid ${T.cyan}44`, color: T.cyan, fontFamily: T.mono, fontSize: 12, padding: '6px 12px', outline: 'none', cursor: 'pointer', boxShadow: `0 0 15px ${T.cyan}11` }}>
              <optgroup label="Core Intelligence">
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-sonnet">Claude 3.5 Sonnet</option>
              </optgroup>
              <optgroup label="Meta Matrix">
                <option value="llama-3.1-405b">Llama 3.1 405B</option>
                <option value="llama-3.1-70b">Llama 3.1 70B</option>
              </optgroup>
              <optgroup label="Advanced Operations">
                <option value="searchgpt">Real-Time SearchGPT</option>
                <option value="mistral-large">Mistral Large 2</option>
                <option value="qwen-2.5-72b">Qwen 2.5</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* CHAT AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24, scrollbarWidth: 'thin' }}>
          <div style={{ maxWidth: 850, margin: '0 auto', width: '100%' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 20, animation: 'fadeIn 0.4s ease-out forwards' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, opacity: 0.7 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: msg.role === 'user' ? T.cyan : T.green }}>{msg.role === 'user' ? displayName : 'OMNICLOUD'}</span>
                  <span style={{ fontSize: 9, color: T.muted }}>{msg.time}</span>
                </div>
                <div style={{
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'rgba(0,229,255,0.06)' : 'rgba(10,15,29,0.9)',
                  border: `1px solid ${msg.role === 'user' ? T.cyan : T.border}`,
                  padding: '14px 18px',
                  lineHeight: 1.65,
                  boxShadow: msg.role === 'user' ? `0 4px 15px rgba(0,229,255,0.03)` : 'none',
                  position: 'relative',
                  borderRadius: msg.role === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px'
                }}>
                  {msg.loading ? <Dots /> : <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content, T.green, T.cyan, T.muted) }} />}
                  <button onClick={() => copy(msg.id, msg.content)} style={{ position: 'absolute', top: 4, right: 4, background: 'transparent', border: 'none', color: T.muted, fontSize: 8, cursor: 'pointer' }}>{copied === msg.id ? 'COPIED' : 'COPY'}</button>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {/* INPUT AREA */}
        <div style={{ padding: '20px', borderTop: `1px solid ${T.border}`, background: 'rgba(10,15,29,0.5)' }}>
          <div style={{ maxWidth: 850, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(13,18,37,0.8)', border: `1px solid ${loading ? T.cyan : T.border}`, padding: '12px', boxShadow: loading ? `0 0 20px ${T.cyan}22` : 'none', borderRadius: '4px' }}>
              <span style={{ color: T.cyan, fontWeight: 800, marginBottom: 8 }}>&gt;</span>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="Synchronizing query with cloud matrix..."
                rows={1}
                disabled={loading}
                style={{ flex: 1, background: 'transparent', border: 'none', color: T.cyan, fontFamily: T.mono, fontSize: 14, outline: 'none', resize: 'none', minHeight: 24, maxHeight: 150 }}
                onInput={e => { (e.target as any).style.height = 'auto'; (e.target as any).style.height = (e.target as any).scrollHeight + 'px'; }}
              />
              <button onClick={toggleRecording} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', paddingBottom: 4 }}>{isRecording ? '🔴' : '🎤'}</button>
              <button onClick={() => send(input)} disabled={loading || !input.trim()}
                style={{ background: T.cyan, color: T.bg, border: 'none', padding: '8px 16px', fontFamily: T.mono, fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>EXECUTE</button>
            </div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.muted }}>
              <span>SHIFT+ENTER FOR MULTILINE</span>
              <span>MODEL: {cloudModel.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .glass{background:rgba(10,15,29,0.7);backdrop-filter:blur(10px);border:1px solid ${T.border}}
        .scanline{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.2) 50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02));background-size:100% 2px,3px 100%;pointer-events:none;z-index:2000}
        *::-webkit-scrollbar{width:4px}
        *::-webkit-scrollbar-thumb{background:${T.border};border-radius:10px}
        *::-webkit-scrollbar-thumb:hover{background:${T.cyan}}
        .cyber-sidebar.open { box-shadow: 20px 0 50px rgba(0,0,0,0.8); }
      `}} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading Interface...</div>}>
      <ChatContent />
    </Suspense>
  );
}

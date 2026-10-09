import { useState } from 'react';

export const DEMO_EMAIL = 'trader@mindtrade.ai';
export const DEMO_PASSWORD = 'demo1234';
const SESSION_KEY = 'mindtrade_user';

export function getSession(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
}

export default function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError('Incorrect email or password.');
      return;
    }
    setError('');
    setBusy(true);
    setTimeout(() => {
      try { localStorage.setItem(SESSION_KEY, DEMO_EMAIL); } catch { /* storage blocked */ }
      onLogin(DEMO_EMAIL);
    }, 350);
  };

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 6, background: 'var(--bg-input)',
    border: '1px solid var(--border-bright)', color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  };

  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--bg-primary)' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, background: 'var(--bg-secondary)', border: '1px solid var(--border-bright)', borderRadius: 12, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'linear-gradient(135deg, #2962ff, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧠</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>Mind<span className="gradient-text">Trade</span> AI</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Emotion-aware paper trading</div>
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Sign in</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>Demo details are already filled in — just press Sign in.</p>

        <label htmlFor="mt-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
        <input id="mt-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={field} required />

        <label htmlFor="mt-pass" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '14px 0 6px' }}>Password</label>
        <div style={{ position: 'relative' }}>
          <input id="mt-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...field, paddingRight: 60 }} required />
          <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && <div role="alert" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red)' }}>{error}</div>}

        <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: '11px 0', fontSize: 14, fontWeight: 700, justifyContent: 'center' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ marginTop: 18, padding: '10px 12px', borderRadius: 6, background: 'var(--accent-dim)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Demo login: <b style={{ color: 'var(--text-primary)' }}>{DEMO_EMAIL}</b> / <b style={{ color: 'var(--text-primary)' }}>{DEMO_PASSWORD}</b><br />
          You start with $100,000 of virtual money. No real money is used.
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { useEffect } from 'react';
import { simulator } from './engine/simulator';
import { fmtPrice, fmtUsd } from './lib/format';
import AnalyticsPanel from './components/Analytics/AnalyticsPanel';
import SettingsModal from './components/Settings/SettingsModal';
import { Settings as Gear, LogOut } from 'lucide-react';
import Login, { getSession, clearSession } from './components/Login';

// Views
import WatchList from './components/Terminal/WatchList';
import OrderPanel from './components/Terminal/OrderPanel';
import MarketDepth from './components/Terminal/MarketDepth';
import TradingChart from './components/Terminal/TradingChart';
import PositionTracker from './components/Terminal/PositionTracker';
import EmotionRadar from './components/AIHub/EmotionRadar';
import CoachSidebar from './components/AIHub/CoachSidebar';
import TimelineReplay from './components/AIHub/TimelineReplay';
import DNAPanel from './components/AIHub/DNAPanel';
import SummaryCards from './components/Dashboard/SummaryCards';
import PredictionPanel from './components/Dashboard/PredictionPanel';
import ChallengeGrid from './components/Challenge/ChallengeGrid';
import AcademyPanel from './components/Academy/AcademyPanel';
import CompetitionPanel from './components/Social/CompetitionPanel';
import JournalPanel from './components/Journal/JournalPanel';



const NAV_ITEMS = [
  { id: 'terminal', label: 'Terminal', icon: '📊' },
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'ai-hub', label: 'AI Hub', icon: '🧠' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'challenges', label: 'Challenges', icon: '🏆' },
  { id: 'academy', label: 'Academy', icon: '🎓' },
  { id: 'social', label: 'Social', icon: '🌐' },
];

function TickerTape() {
  const { prices, news, setSelectedSymbol } = useTrading();
  const assets = simulator.getAssets();
  const latest = news[0];
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.35)', height: 26, overflow: 'hidden' }}>
      {latest && (
        <button onClick={() => setSelectedSymbol(latest.symbol)} title={latest.headline} style={{ flexShrink: 0, maxWidth: '42%', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: latest.impact === 'bullish' ? 'rgba(38,166,154,.12)' : 'rgba(239,83,80,.12)', border: 0, borderRight: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <b style={{ color: latest.impact === 'bullish' ? 'var(--green)' : 'var(--red)' }}>📰 {latest.symbol}</b>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{latest.headline}</span>
        </button>
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 34, animation: 'ticker 60s linear infinite', whiteSpace: 'nowrap', paddingLeft: '100%' }}>
          {[...assets, ...assets].map((a, i) => {
            const q = prices[a.symbol]; const up = (q?.changePct ?? 0) >= 0;
            return (
              <span key={i} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 700, color: a.color }}>{a.symbol}</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtPrice(a.symbol, q?.price)}</span>
                <span className="font-mono" style={{ color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{up ? '▲' : '▼'}{Math.abs(q?.changePct ?? 0).toFixed(2)}%</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PsychBadge({ hasActivity }: { hasActivity: boolean }) {
  const { psychScore, dominantEmotion } = useTrading();
  const statusColor = !hasActivity ? 'var(--text-secondary)' : psychScore >= 70 ? 'var(--green)' : psychScore >= 40 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className="hide-md" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px solid var(--border)' }} title="Live psychology score">
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} className={hasActivity ? 'animate-pulse-glow' : ''} />
      <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{hasActivity ? Math.round(psychScore) : '--'}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>PSYCH</span>
      {hasActivity && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>· {dominantEmotion}</span>}
    </div>
  );
}

function SpeedControl() {
  const { speed, setSpeed, newsEnabled, setNewsEnabled } = useTrading();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="speed-ctl" title="Market speed (replay)">
        <button className={speed === 0 ? 'on' : ''} onClick={() => setSpeed(speed === 0 ? 1 : 0)} title="Pause / resume (Space)">{speed === 0 ? '▶' : '⏸'}</button>
        {[1, 5, 20, 60].map(s => <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{s}×</button>)}
      </div>
      <button className={`chip-btn hide-md ${newsEnabled ? 'on' : ''}`} onClick={() => setNewsEnabled(!newsEnabled)} title="Random market-moving news events">📰 News {newsEnabled ? 'on' : 'off'}</button>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useTrading();
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.tone}`} onClick={() => dismissToast(t.id)}>
          <div className="t">{t.title}</div><div className="m">{t.message}</div>
        </div>
      ))}
    </div>
  );
}

function Welcome({ onClose }: { onClose: () => void }) {
  const items = [
    ['🎯', 'Real broker execution', 'Bid/ask fills, spreads, commissions, margin, leverage, stop-out — trades behave like MT5 or cTrader.'],
    ['⏳', 'Limit, stop & trailing orders', 'Pending orders with expiry, SL/TP in pips or price, break-even and partial closes.'],
    ['🧘', 'Tilt guard', 'After a losing streak or a revenge-trade pattern the terminal locks and walks you through a breathing reset.'],
    ['🪞', 'Intent & mood tagging', 'Say why you are trading and how you feel — Analytics then shows exactly what your emotions cost you.'],
    ['⏩', 'Market replay speed', 'Pause or run the market at 5×, 20× or 60× to practise a full session in minutes.'],
    ['📰', 'News shocks', 'Random headlines move prices, widen spreads and cause slippage — train your reaction without risking a cent.'],
  ];
  return (
    <div className="modal-back"><div className="modal-card wide">
      <div className="modal-head"><h3>Welcome to MindTrade AI 🧠</h3></div>
      <div className="modal-body">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>A paper-trading terminal that trains the part most platforms ignore — your psychology. You start with <b style={{ color: 'var(--text-primary)' }}>$100,000</b> of virtual money.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          {items.map(([i, t, d]) => <div key={t} className="stat-tile"><div style={{ fontSize: 20 }}>{i}</div><div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{t}</div><div className="s" style={{ lineHeight: 1.5 }}>{d}</div></div>)}
        </div>
      </div>
      <div className="modal-foot"><button className="btn btn-primary" onClick={onClose}>Start trading</button></div>
    </div></div>
  );
}

function TerminalView() {
  return (
    <div className="terminal-grid">
      {/* Left: Watchlist — spans both rows */}
      <div className="tg-watchlist">
        <WatchList />
      </div>

      {/* Center top: Chart */}
      <div className="tg-chart">
        <TradingChart />
      </div>

      {/* Right: Order Panel + Depth — spans both rows */}
      <div className="tg-side">
        <OrderPanel />
        <div style={{ flex: 1, minHeight: 0 }}>
          <MarketDepth />
        </div>
      </div>

      {/* Center bottom: Position Tracker */}
      <div className="tg-positions">
        <PositionTracker />
      </div>
    </div>
  );
}

function DashboardView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <SummaryCards />
      <div className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TimelineReplay />
          <div style={{ flex: 1, minHeight: 0 }}>
            <PositionTracker />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <PredictionPanel />
        </div>
      </div>
    </div>
  );
}

function AIHubView() {
  return (
    <div className="aihub-grid">
      <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <EmotionRadar />
      </div>
      <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <DNAPanel />
        <TimelineReplay />
      </div>
      <div>
        <CoachSidebar />
      </div>
    </div>
  );
}

function AppContent({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('mindtrade_tab') || 'terminal');
  const [showSettings, setShowSettings] = useState(false);
  const [welcome, setWelcome] = useState(() => !localStorage.getItem('mindtrade_welcomed'));
  const ctx = useTrading();
  const { warnings, challenges, trades, positions, equity, startingBalance, marginLevel, speed, setSpeed, closeAll, placeOrder, selectedSymbol } = ctx;
  const unlockedCount = challenges.filter(c => c.unlocked).length;
  const hasActivity = trades.length > 0 || positions.length > 0;
  useEffect(() => { localStorage.setItem('mindtrade_tab', activeTab); }, [activeTab]);

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.code === 'Space') { e.preventDefault(); setSpeed(speed === 0 ? 1 : 0); return; }
      if (e.shiftKey && (e.key === 'B' || e.key === 'S')) {
        const a = simulator.getAsset(selectedSymbol)!;
        placeOrder({ symbol: selectedSymbol, direction: e.key === 'B' ? 'buy' : 'sell', kind: 'market', size: a.minLot });
        return;
      }
      if (e.shiftKey && e.key === 'X') { closeAll('all'); return; }
      const n = parseInt(e.key, 10);
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey && n >= 1 && n <= NAV_ITEMS.length) setActiveTab(NAV_ITEMS[n - 1].id);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [speed, setSpeed, selectedSymbol, placeOrder, closeAll]);

  const renderView = () => {
    switch (activeTab) {
      case 'terminal': return <TerminalView />;
      case 'dashboard': return <DashboardView />;
      case 'analytics': return <AnalyticsPanel />;
      case 'ai-hub': return <AIHubView />;
      case 'journal': return <JournalPanel />;
      case 'challenges': return <div style={{ height: '100%', overflow: 'auto' }}><ChallengeGrid /></div>;
      case 'academy': return <div style={{ height: '100%', overflow: 'auto' }}><AcademyPanel /></div>;
      case 'social': return <div style={{ height: '100%', overflow: 'auto' }}><CompetitionPanel /></div>;
      default: return <TerminalView />;
    }
  };

  return (
    <div className="bg-mesh" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1e222d', zIndex: 100, flexShrink: 0 }}>
        <div className="app-header" style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 6, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #2962ff, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14 }}>🧠</span></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>Mind<span className="gradient-text">Trade</span> AI</div>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.06em' }}>EMOTION-AWARE</div>
            </div>
          </div>
          <div className="app-nav" style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto', minWidth: 0 }}>
            {NAV_ITEMS.map((item, i) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-tab ${activeTab === item.id ? 'active' : ''}`} style={{ position: 'relative', flexShrink: 0 }} title={`${item.label} (${i + 1})`}>
                <span>{item.icon}</span><span>{item.label}</span>
                {item.id === 'ai-hub' && warnings.length > 0 && hasActivity && <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />}
                {item.id === 'challenges' && unlockedCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: '#f59e0b', color: 'black', borderRadius: 10, fontSize: 8, fontWeight: 800, padding: '0 3px', lineHeight: '12px' }}>{unlockedCount}</span>}
              </button>
            ))}
          </div>
          <div className="app-header-right">
            <SpeedControl />
            <PsychBadge hasActivity={hasActivity} />
            <div style={{ padding: '4px 10px', background: 'rgba(38,166,154,0.08)', borderRadius: 4, border: '1px solid rgba(38,166,154,0.2)' }} title="Account equity">
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>EQUITY </span>
              <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: equity >= startingBalance ? 'var(--green)' : 'var(--red)' }}>{fmtUsd(equity)}</span>
            </div>
            <button className="icon-act" style={{ padding: 6 }} onClick={() => setShowSettings(true)} title="Settings & trading rules"><Gear size={15} /></button>
            <button className="icon-act" style={{ padding: 6 }} onClick={onLogout} title="Log out" aria-label="Log out"><LogOut size={15} /></button>
          </div>
        </div>
      </div>
      <TickerTape />
      {marginLevel < 100 && <div style={{ background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', padding: '4px 10px' }}>⚠️ MARGIN CALL — margin level {marginLevel.toFixed(0)}%. Positions are closed automatically below 50%.</div>}
      {speed === 0 && <div style={{ background: 'rgba(255,183,77,.15)', color: 'var(--yellow)', fontSize: 11.5, fontWeight: 600, textAlign: 'center', padding: '3px 10px' }}>⏸ Market paused — press Space or ▶ to resume</div>}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 10px 10px 10px' }}>
        <div style={{ height: '100%', width: '100%' }}>{renderView()}</div>
      </div>
      <Toasts />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {welcome && <Welcome onClose={() => { localStorage.setItem('mindtrade_welcomed', '1'); setWelcome(false); }} />}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<string | null>(() => getSession());
  if (!user) return <Login onLogin={setUser} />;
  return (
    <TradingProvider>
      <AppContent onLogout={() => { clearSession(); setUser(null); }} />
    </TradingProvider>
  );
}

import { useMemo } from 'react';
import { useTrading, type Trade } from '../../context/TradingContext';
import { INTENTS, MOODS } from '../../engine/broker';
import { fmtUsd, pnlColor, duration } from '../../lib/format';

function EquityCurve() {
  const { equityCurve, startingBalance, equity } = useTrading();
  const pts = [...equityCurve, { t: equityCurve.length ? equityCurve[equityCurve.length - 1].t + 1 : 0, equity, balance: equity }];
  if (pts.length < 2) return <div style={{ height: 220, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Trade to build your equity curve</div>;
  const W = 800, H = 220, P = 8;
  const vals = pts.map(p => p.equity);
  const min = Math.min(...vals, startingBalance), max = Math.max(...vals, startingBalance);
  const rng = Math.max(max - min, startingBalance * 0.004);
  const x = (i: number) => P + (i / (pts.length - 1)) * (W - 2 * P);
  const mid = (max + min) / 2;
  const y = (v: number) => P + (0.5 - (v - mid) / rng) * (H - 2 * P);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.equity).toFixed(1)}`).join(' ');
  const bal = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ');
  const up = equity >= startingBalance;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 220, display: 'block' }}>
      <defs><linearGradient id="eqg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={up ? '#26a69a' : '#ef5350'} stopOpacity=".35" /><stop offset="1" stopColor={up ? '#26a69a' : '#ef5350'} stopOpacity="0" /></linearGradient></defs>
      <line x1={P} x2={W - P} y1={y(startingBalance)} y2={y(startingBalance)} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" />
      <path d={`${path} L${x(pts.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="url(#eqg)" />
      <path d={bal} fill="none" stroke="rgba(143,176,255,.5)" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" stroke={up ? '#26a69a' : '#ef5350'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.value)));
  if (!rows.length) return <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', padding: '8px 0' }}>Not enough tagged trades yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 90px', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label} {r.sub && <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{r.sub}</span>}</span>
          <div style={{ height: 8, background: 'rgba(255,255,255,.04)', borderRadius: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${Math.abs(r.value) / max * 50}%`, transform: r.value < 0 ? 'translateX(-100%)' : undefined, background: pnlColor(r.value), borderRadius: 4 }} />
          </div>
          <span className="font-mono" style={{ textAlign: 'right', color: pnlColor(r.value) }}>{fmtUsd(r.value, { sign: true, dp: 0 })}</span>
        </div>
      ))}
    </div>
  );
}

function group(trades: Trade[], key: (t: Trade) => string | undefined) {
  const m = new Map<string, { sum: number; n: number; w: number }>();
  trades.forEach(t => { const k = key(t); if (!k) return; const g = m.get(k) ?? { sum: 0, n: 0, w: 0 }; g.sum += t.pnl ?? 0; g.n++; if ((t.pnl ?? 0) > 0) g.w++; m.set(k, g); });
  return m;
}

export default function AnalyticsPanel() {
  const { trades, equityCurve, startingBalance, equity, ruleOverrides } = useTrading();
  const s = useMemo(() => {
    const pnl = trades.map(t => t.pnl ?? 0);
    const wins = pnl.filter(v => v > 0), losses = pnl.filter(v => v < 0);
    const gw = wins.reduce((a, b) => a + b, 0), gl = Math.abs(losses.reduce((a, b) => a + b, 0));
    let peak = startingBalance, mdd = 0;
    equityCurve.forEach(p => { peak = Math.max(peak, p.equity); mdd = Math.max(mdd, (peak - p.equity) / peak); });
    let ws = 0, ls = 0, cw = 0, cl = 0;
    pnl.forEach(v => { if (v > 0) { cw++; cl = 0; } else if (v < 0) { cl++; cw = 0; } ws = Math.max(ws, cw); ls = Math.max(ls, cl); });
    const rs = trades.map(t => t.rMultiple).filter((v): v is number => v !== undefined);
    const comm = trades.reduce((a, t) => a + (t.commission ?? 0), 0);
    const held = trades.length ? trades.reduce((a, t) => a + ((t.closeTime ?? 0) - t.openTime), 0) / trades.length : 0;
    const winHeld = trades.filter(t => (t.pnl ?? 0) > 0); const lossHeld = trades.filter(t => (t.pnl ?? 0) < 0);
    const avgHeld = (arr: Trade[]) => arr.length ? arr.reduce((a, t) => a + ((t.closeTime ?? 0) - t.openTime), 0) / arr.length : 0;
    const left = trades.reduce((a, t) => a + Math.max(0, (t.mfe ?? 0) - (t.pnl ?? 0)), 0);
    const captured = trades.filter(t => (t.mfe ?? 0) > 0).map(t => Math.max(0, (t.pnl ?? 0)) / (t.mfe ?? 1));
    const emotional = trades.filter(t => INTENTS.find(i => i.id === t.intent)?.emotional);
    const planned = trades.filter(t => t.intent && !INTENTS.find(i => i.id === t.intent)?.emotional);
    return {
      net: pnl.reduce((a, b) => a + b, 0), n: trades.length, winRate: trades.length ? wins.length / trades.length * 100 : 0,
      pf: gl ? gw / gl : gw > 0 ? Infinity : 0, avgW: wins.length ? gw / wins.length : 0, avgL: losses.length ? gl / losses.length : 0,
      exp: trades.length ? pnl.reduce((a, b) => a + b, 0) / trades.length : 0, mdd: mdd * 100, ws, ls,
      avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : undefined, best: Math.max(0, ...pnl), worst: Math.min(0, ...pnl),
      comm, held, winHeld: avgHeld(winHeld), lossHeld: avgHeld(lossHeld), left, capture: captured.length ? captured.reduce((a, b) => a + b, 0) / captured.length * 100 : undefined,
      emoPnl: emotional.reduce((a, t) => a + (t.pnl ?? 0), 0), emoN: emotional.length, planPnl: planned.reduce((a, t) => a + (t.pnl ?? 0), 0), planN: planned.length,
      slUse: trades.length ? trades.filter(t => t.stopLoss).length / trades.length * 100 : 0,
    };
  }, [trades, equityCurve, startingBalance]);

  const byIntent = [...group(trades, t => t.intent)].map(([k, g]) => { const i = INTENTS.find(x => x.id === k)!; return { label: `${i.emoji} ${k}`, value: g.sum, sub: `${g.n}× · ${Math.round(g.w / g.n * 100)}%` }; }).sort((a, b) => b.value - a.value);
  const byMood = [...group(trades, t => t.mood)].map(([k, g]) => { const m = MOODS.find(x => x.id === k)!; return { label: `${m.emoji} ${m.label}`, value: g.sum, sub: `${g.n}×` }; }).sort((a, b) => b.value - a.value);
  const bySym = [...group(trades, t => t.symbol)].map(([k, g]) => ({ label: k, value: g.sum, sub: `${g.n}×` })).sort((a, b) => b.value - a.value);
  const bySide = [...group(trades, t => t.direction === 'buy' ? 'Long' : 'Short')].map(([k, g]) => ({ label: k, value: g.sum, sub: `${g.n}× · ${Math.round(g.w / g.n * 100)}%` }));

  const tiles: [string, string, string?, string?][] = [
    ['Net P&L', fmtUsd(s.net, { sign: true }), `${((equity - startingBalance) / startingBalance * 100).toFixed(2)}% return`, pnlColor(s.net)],
    ['Trades', String(s.n), `${s.winRate.toFixed(0)}% win rate`],
    ['Profit factor', s.pf === Infinity ? '∞' : s.pf.toFixed(2), 'gross win ÷ gross loss', s.pf >= 1.5 ? 'var(--green)' : s.pf >= 1 ? 'var(--yellow)' : 'var(--red)'],
    ['Expectancy', fmtUsd(s.exp, { sign: true }), 'average per trade', pnlColor(s.exp)],
    ['Avg win / loss', `${fmtUsd(s.avgW, { dp: 0 })} / ${fmtUsd(s.avgL, { dp: 0 })}`, `payoff ${s.avgL ? (s.avgW / s.avgL).toFixed(2) : '—'}`],
    ['Average R', s.avgR !== undefined ? `${s.avgR.toFixed(2)}R` : '—', 'needs a stop loss', pnlColor(s.avgR ?? 0)],
    ['Max drawdown', `${s.mdd.toFixed(2)}%`, 'peak to trough', s.mdd > 10 ? 'var(--red)' : 'var(--text-primary)'],
    ['Streaks', `${s.ws}W / ${s.ls}L`, 'longest win / loss'],
    ['Best / worst', `${fmtUsd(s.best, { dp: 0 })} / ${fmtUsd(s.worst, { dp: 0 })}`, 'single trade'],
    ['Avg hold', duration(s.held), `wins ${duration(s.winHeld)} · losses ${duration(s.lossHeld)}`, s.lossHeld > s.winHeld * 1.5 && s.n > 3 ? 'var(--yellow)' : undefined],
    ['Profit captured', s.capture !== undefined ? `${s.capture.toFixed(0)}%` : '—', `${fmtUsd(s.left, { dp: 0 })} left on the table`],
    ['Costs', fmtUsd(s.comm), `stop loss used ${s.slUse.toFixed(0)}%`],
  ];

  const insights: string[] = [];
  if (s.n >= 3 && s.lossHeld > s.winHeld * 1.5) insights.push(`You hold losers ${(s.lossHeld / Math.max(1, s.winHeld)).toFixed(1)}× longer than winners — the classic "hope" bias. Let your stop do its job.`);
  if (s.capture !== undefined && s.capture < 45 && s.n >= 3) insights.push(`You only bank ${s.capture.toFixed(0)}% of the best floating profit. A trailing stop or a 2R target would capture more.`);
  if (s.emoN >= 2 && s.emoPnl < 0) insights.push(`Emotion-driven trades (FOMO / revenge / boredom) cost you ${fmtUsd(Math.abs(s.emoPnl))} across ${s.emoN} trades.`);
  if (s.slUse < 60 && s.n >= 3) insights.push(`Only ${s.slUse.toFixed(0)}% of your trades had a stop loss. Turn on "Require stop loss" in Settings.`);
  if (ruleOverrides > 0) insights.push(`You overrode your own rules ${ruleOverrides} time${ruleOverrides > 1 ? 's' : ''}. Every override is a promise to yourself you broke.`);
  if (!insights.length) insights.push(s.n ? 'Solid so far — keep tagging your trades honestly so these insights get sharper.' : 'Close a few trades and your personal edge report will appear here.');

  return (
    <div className="scroll-y" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10 }}>
      <div className="two-col">
        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div className="panel-title">Equity curve</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>— equity · - - balance · ··· starting balance</div>
          </div>
          <EquityCurve />
        </div>
        <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="panel-title">💸 What your emotions cost you</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="stat-tile"><div className="k">Planned trades</div><div className="v" style={{ color: pnlColor(s.planPnl) }}>{fmtUsd(s.planPnl, { sign: true, dp: 0 })}</div><div className="s">{s.planN} trades</div></div>
            <div className="stat-tile"><div className="k">Emotional trades</div><div className="v" style={{ color: pnlColor(s.emoPnl) }}>{fmtUsd(s.emoPnl, { sign: true, dp: 0 })}</div><div className="s">{s.emoN} trades (FOMO / revenge / bored)</div></div>
          </div>
          <div className="panel-title" style={{ marginTop: 4 }}>AI edge report</div>
          {insights.map((t, i) => <div key={i} className="coach-bubble" style={{ fontSize: 12, lineHeight: 1.5 }}>{t}</div>)}
        </div>
      </div>
      <div className="analytics-grid">
        {tiles.map(([k, v, sub, c]) => <div key={k} className="stat-tile"><div className="k">{k}</div><div className="v" style={{ color: c }}>{v}</div>{sub && <div className="s">{sub}</div>}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, paddingBottom: 12 }}>
        <div className="panel" style={{ padding: 14 }}><div className="panel-title" style={{ marginBottom: 10 }}>P&L by intent</div><Bars rows={byIntent} /></div>
        <div className="panel" style={{ padding: 14 }}><div className="panel-title" style={{ marginBottom: 10 }}>P&L by mood at entry</div><Bars rows={byMood} /></div>
        <div className="panel" style={{ padding: 14 }}><div className="panel-title" style={{ marginBottom: 10 }}>P&L by symbol</div><Bars rows={bySym} /></div>
        <div className="panel" style={{ padding: 14 }}><div className="panel-title" style={{ marginBottom: 10 }}>Long vs short</div><Bars rows={bySide} /></div>
      </div>
    </div>
  );
}

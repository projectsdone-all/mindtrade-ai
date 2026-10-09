import { useEffect, useState } from 'react';
import { useTrading, type Position } from '../../context/TradingContext';
import { simulator } from '../../engine/simulator';
import { INTENTS, MOODS, grossPnl } from '../../engine/broker';
import { fmtPrice, fmtUsd, pnlColor, elapsed, duration, downloadCSV } from '../../lib/format';
import { X, Pencil, Scissors, ShieldCheck, Download, Bell, Trash2, Ghost } from 'lucide-react';

type Tab = 'open' | 'orders' | 'history' | 'alerts';

function ModifyModal({ pos, onClose }: { pos: Position; onClose: () => void }) {
  const { modifyPosition, prices } = useTrading();
  const a = simulator.getAsset(pos.symbol)!;
  const [sl, setSl] = useState(pos.stopLoss ? String(pos.stopLoss) : '');
  const [tp, setTp] = useState(pos.takeProfit ? String(pos.takeProfit) : '');
  const [trail, setTrail] = useState(pos.trailingDistance ? String(+(pos.trailingDistance / a.pip).toFixed(1)) : '');
  const [err, setErr] = useState('');
  const q = prices[pos.symbol];
  const save = () => {
    const r = modifyPosition(pos.id, {
      stopLoss: sl ? parseFloat(sl) : null, takeProfit: tp ? parseFloat(tp) : null,
      trailingDistance: parseFloat(trail) ? parseFloat(trail) * a.pip : null,
    });
    if (!r.ok) setErr(r.error || 'Invalid'); else onClose();
  };
  const slUsd = sl ? grossPnl(pos.direction, pos.entryPrice, parseFloat(sl), pos.symbol, pos.size) - pos.commission : undefined;
  const tpUsd = tp ? grossPnl(pos.direction, pos.entryPrice, parseFloat(tp), pos.symbol, pos.size) - pos.commission : undefined;
  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: 'min(420px,100%)' }}>
        <div className="modal-head"><h3>Modify {pos.direction.toUpperCase()} {pos.size} {pos.symbol}</h3><button className="icon-act" onClick={onClose}><X size={14} /></button></div>
        <div className="modal-body">
          <div className="kv"><span>Entry</span><b>{fmtPrice(pos.symbol, pos.entryPrice)}</b></div>
          <div className="kv"><span>Current ({pos.direction === 'buy' ? 'bid' : 'ask'})</span><b>{fmtPrice(pos.symbol, pos.direction === 'buy' ? q?.bid : q?.ask)}</b></div>
          <div>
            <div className="field-label"><span style={{ color: 'var(--red)' }}>Stop loss</span>{slUsd !== undefined && !isNaN(slUsd) && <span className="font-mono" style={{ color: pnlColor(slUsd) }}>{fmtUsd(slUsd, { sign: true })}</span>}</div>
            <input className="input-field font-mono" value={sl} onChange={e => setSl(e.target.value)} placeholder="none" />
          </div>
          <div>
            <div className="field-label"><span style={{ color: 'var(--green)' }}>Take profit</span>{tpUsd !== undefined && !isNaN(tpUsd) && <span className="font-mono" style={{ color: pnlColor(tpUsd) }}>{fmtUsd(tpUsd, { sign: true })}</span>}</div>
            <input className="input-field font-mono" value={tp} onChange={e => setTp(e.target.value)} placeholder="none" />
          </div>
          <div>
            <div className="field-label"><span>Trailing stop (pips)</span></div>
            <input className="input-field font-mono" value={trail} onChange={e => setTrail(e.target.value)} placeholder="off" />
            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 3 }}>Activates once the trade is this far in profit, then follows price.</div>
          </div>
          {err && <div style={{ fontSize: 11, color: 'var(--red)' }}>{err}</div>}
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
      </div>
    </div>
  );
}

export default function PositionTracker() {
  const { positions, orders, trades, alerts, closeTrade, closeAll, cancelOrder, removeAlert, breakEven, prices, balance, equity, marginUsed, freeMargin, marginLevel, winRate, setSelectedSymbol } = useTrading();
  const [tab, setTab] = useState<Tab>('open');
  const [edit, setEdit] = useState<Position | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const floating = positions.reduce((s, p) => s + p.pnl, 0);
  const wins = trades.filter(t => (t.pnl || 0) > 0).length;

  const exportHistory = () => downloadCSV('mindtrade-history.csv', trades.map(t => ({
    symbol: t.symbol, direction: t.direction, size: t.size, entry: t.entryPrice, exit: t.closePrice, sl: t.stopLoss ?? '', tp: t.takeProfit ?? '',
    opened: new Date(t.openTime).toISOString(), closed: t.closeTime ? new Date(t.closeTime).toISOString() : '', reason: t.closeReason ?? '',
    gross: t.grossPnl ?? '', commission: t.commission ?? '', net: t.pnl ?? '', r: t.rMultiple ?? '', mfe: t.mfe ?? '', mae: t.mae ?? '', intent: t.intent ?? '', mood: t.mood ?? '',
  })));

  const tabs: [Tab, string][] = [['open', `Positions (${positions.length})`], ['orders', `Orders (${orders.length})`], ['history', `History (${trades.length})`], ['alerts', `Alerts (${alerts.length})`]];

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0 8px', flexShrink: 0, minHeight: 36, gap: 4, overflowX: 'auto' }}>
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0 10px', height: 36, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: tab === t ? '#8fb0ff' : 'var(--text-secondary)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent' }}>{l}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {tab === 'open' && positions.length > 0 && <>
            <button className="icon-act" onClick={() => closeAll('profit')}>Close winners</button>
            <button className="icon-act" onClick={() => closeAll('loss')}>Close losers</button>
            <button className="icon-act red" onClick={() => closeAll('all')}>Close all</button>
          </>}
          {tab === 'history' && trades.length > 0 && <button className="icon-act" onClick={exportHistory}><Download size={11} /> CSV</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, padding: '5px 12px', fontSize: 11, borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
        <span>Balance <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtUsd(balance)}</b></span>
        <span>Equity <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtUsd(equity)}</b></span>
        <span>Margin <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtUsd(marginUsed)}</b></span>
        <span>Free <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtUsd(freeMargin)}</b></span>
        <span>Level <b className="font-mono" style={{ color: marginLevel < 100 ? 'var(--red)' : marginLevel < 200 ? 'var(--yellow)' : 'var(--text-primary)' }}>{isFinite(marginLevel) ? `${marginLevel.toFixed(0)}%` : '—'}</b></span>
        <span>Floating <b className="font-mono" style={{ color: pnlColor(floating) }}>{fmtUsd(floating, { sign: true })}</b></span>
        <span>Win rate <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{trades.length ? `${winRate.toFixed(0)}% (${wins}/${trades.length})` : '—'}</b></span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'open' && (positions.length === 0 ? <Empty icon="📊" text="No open positions — place a trade to begin" /> : (
          <table className="tbl" style={{ minWidth: 820 }}>
            <thead><tr>{['Symbol', 'Type', 'Size', 'Entry', 'Price', 'S/L', 'T/P', 'Time', 'Swing', 'P&L', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {positions.map(p => {
                const q = prices[p.symbol];
                const half = simulator.getAsset(p.symbol)!;
                return (
                  <tr key={p.id}>
                    <td><button onClick={() => setSelectedSymbol(p.symbol)} style={{ background: 'none', border: 0, color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>{p.symbol}</button>
                      {p.intent && <span title={INTENTS.find(i => i.id === p.intent)?.label} style={{ marginLeft: 4 }}>{INTENTS.find(i => i.id === p.intent)?.emoji}</span>}</td>
                    <td><span className={`badge ${p.direction === 'buy' ? 'badge-green' : 'badge-red'}`}>{p.direction.toUpperCase()}</span></td>
                    <td className="font-mono">{p.size}</td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtPrice(p.symbol, p.entryPrice)}</td>
                    <td className="font-mono">{fmtPrice(p.symbol, p.direction === 'buy' ? q?.bid : q?.ask)}</td>
                    <td className="font-mono" style={{ color: 'var(--red)' }}>{p.stopLoss ? fmtPrice(p.symbol, p.stopLoss) : '—'}{p.trailingDistance ? ' ↻' : ''}</td>
                    <td className="font-mono" style={{ color: 'var(--green)' }}>{p.takeProfit ? fmtPrice(p.symbol, p.takeProfit) : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{elapsed(p.openTime)}</td>
                    <td className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }} title="Best / worst floating P&L so far (MFE / MAE)">
                      <span style={{ color: 'var(--green)' }}>{fmtUsd(p.mfe, { dp: 0 })}</span> / <span style={{ color: 'var(--red)' }}>{fmtUsd(p.mae, { dp: 0 })}</span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700, color: pnlColor(p.pnl) }}>{fmtUsd(p.pnl, { sign: true })}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-act" title="Modify SL / TP" onClick={() => setEdit(p)}><Pencil size={11} /></button>
                      <button className="icon-act" title="Move stop to break-even" onClick={() => breakEven(p.id)}><ShieldCheck size={11} /> BE</button>
                      {p.size / 2 >= half.minLot && <button className="icon-act" title="Close half" onClick={() => closeTrade(p.id, p.size / 2)}><Scissors size={11} /> ½</button>}
                      <button className="icon-act red" title="Close" onClick={() => closeTrade(p.id)}><X size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}

        {tab === 'orders' && (orders.length === 0 ? <Empty icon="⏳" text="No pending orders — use Limit or Stop in the order panel" /> : (
          <table className="tbl" style={{ minWidth: 640 }}>
            <thead><tr>{['Symbol', 'Type', 'Size', 'Order price', 'Market', 'Distance', 'S/L', 'T/P', 'Expires', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.map(o => {
                const q = prices[o.symbol]; const a = simulator.getAsset(o.symbol)!;
                const mkt = o.direction === 'buy' ? q?.ask : q?.bid;
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.symbol}</td>
                    <td><span className={`badge ${o.direction === 'buy' ? 'badge-green' : 'badge-red'}`}>{o.direction.toUpperCase()} {o.kind.toUpperCase()}</span></td>
                    <td className="font-mono">{o.size}</td>
                    <td className="font-mono">{fmtPrice(o.symbol, o.price)}</td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtPrice(o.symbol, mkt)}</td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{mkt ? (Math.abs(mkt - o.price) / a.pip).toFixed(1) : '—'} pips</td>
                    <td className="font-mono" style={{ color: 'var(--red)' }}>{o.stopLoss ? fmtPrice(o.symbol, o.stopLoss) : '—'}</td>
                    <td className="font-mono" style={{ color: 'var(--green)' }}>{o.takeProfit ? fmtPrice(o.symbol, o.takeProfit) : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{o.expiresAt ? duration(o.expiresAt - now) : 'GTC'}</td>
                    <td><button className="icon-act red" onClick={() => cancelOrder(o.id)}><Trash2 size={11} /> Cancel</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}

        {tab === 'history' && (trades.length === 0 ? <Empty icon="📜" text="No closed trades yet" /> : (
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead><tr>{['Symbol', 'Type', 'Size', 'Entry → Exit', 'Held', 'Closed by', 'Net P&L', 'R', 'Left on table', 'If held now', 'Tags'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {[...trades].reverse().slice(0, 300).map(t => {
                const q = prices[t.symbol];
                const ghost = q ? grossPnl(t.direction, t.entryPrice, t.direction === 'buy' ? q.bid : q.ask, t.symbol, t.size) - (t.commission ?? 0) : 0;
                const left = Math.max(0, (t.mfe ?? 0) - (t.pnl ?? 0));
                return (
                  <tr key={t.id + (t.closeTime ?? '')}>
                    <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                    <td><span className={`badge ${t.direction === 'buy' ? 'badge-green' : 'badge-red'}`}>{t.direction.toUpperCase()}</span></td>
                    <td className="font-mono">{t.size}</td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{fmtPrice(t.symbol, t.entryPrice)} → {fmtPrice(t.symbol, t.closePrice)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{duration((t.closeTime ?? 0) - t.openTime)}</td>
                    <td><span className={`badge ${t.closeReason === 'tp' ? 'badge-green' : t.closeReason === 'sl' || t.closeReason === 'stop-out' ? 'badge-red' : t.closeReason === 'trailing' ? 'badge-cyan' : 'badge-blue'}`}>{(t.closeReason ?? 'manual').toUpperCase()}</span></td>
                    <td className="font-mono" style={{ fontWeight: 700, color: pnlColor(t.pnl ?? 0) }}>{fmtUsd(t.pnl ?? 0, { sign: true })}</td>
                    <td className="font-mono" style={{ color: pnlColor(t.rMultiple ?? 0) }}>{t.rMultiple !== undefined ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple.toFixed(1)}R` : '—'}</td>
                    <td className="font-mono" style={{ color: left > 0 ? 'var(--yellow)' : 'var(--text-muted)' }} title="Max floating profit you had minus what you banked">{left > 0 ? fmtUsd(left) : '—'}</td>
                    <td className="font-mono" style={{ color: pnlColor(ghost), opacity: 0.85 }} title="What this trade would be worth right now if you had never closed it"><Ghost size={10} style={{ display: 'inline', marginRight: 3 }} />{fmtUsd(ghost, { sign: true })}</td>
                    <td>{t.intent && <span title={t.intent}>{INTENTS.find(i => i.id === t.intent)?.emoji}</span>} {t.mood && <span title={t.mood}>{MOODS.find(m => m.id === t.mood)?.emoji}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}

        {tab === 'alerts' && (alerts.length === 0 ? <Empty icon="🔔" text="No price alerts — use the 🔔 tool on the chart, then click a price" /> : (
          <table className="tbl">
            <thead><tr>{['Symbol', 'Condition', 'Price', 'Now', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{alerts.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}><Bell size={11} style={{ display: 'inline', marginRight: 4 }} />{a.symbol}</td>
                <td>{a.condition === 'above' ? 'Rises above' : 'Falls below'}</td>
                <td className="font-mono">{fmtPrice(a.symbol, a.price)}</td>
                <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtPrice(a.symbol, prices[a.symbol]?.price)}</td>
                <td><button className="icon-act red" onClick={() => removeAlert(a.id)}><Trash2 size={11} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        ))}
      </div>
      {edit && <ModifyModal pos={positions.find(p => p.id === edit.id) ?? edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return <div style={{ padding: 22, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}><div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>{text}</div>;
}

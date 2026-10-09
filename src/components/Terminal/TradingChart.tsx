import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { simulator, TIMEFRAMES, type Candle, type Timeframe } from '../../engine/simulator';
import { fmtPrice } from '../../lib/format';
import { Minus, TrendingUp, Square, Trash2, Bell, MousePointer2, Zap } from 'lucide-react';

type Tool = 'none' | 'trend' | 'hline' | 'rect' | 'alert';
type Mode = 'candle' | 'heikin' | 'line';
type Ind = 'SMA' | 'EMA' | 'BB' | 'VOL' | 'RSI';
interface Drawing { id: string; type: 'trend' | 'hline' | 'rect'; t1: number; p1: number; t2: number; p2: number; }

const sma = (v: number[], n: number) => v.map((_, i) => i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n);
function ema(v: number[], n: number) { const k = 2 / (n + 1); let e: number | null = null; return v.map((x, i) => { if (i < n - 1) return null; e = e === null ? v.slice(0, n).reduce((a, b) => a + b, 0) / n : x * k + e * (1 - k); return e; }); }
function bb(v: number[], n: number, m: number) { const mid = sma(v, n); return mid.map((md, i) => { if (md === null) return null; const sl = v.slice(i - n + 1, i + 1); const sd = Math.sqrt(sl.reduce((a, b) => a + (b - md) ** 2, 0) / n); return { up: md + m * sd, lo: md - m * sd, md }; }); }
function rsi(v: number[], n = 14) { const out: (number | null)[] = [null]; let g = 0, l = 0; for (let i = 1; i < v.length; i++) { const d = v[i] - v[i - 1]; if (i <= n) { g += Math.max(0, d); l += Math.max(0, -d); out.push(i === n ? 100 - 100 / (1 + (g / n) / ((l / n) || 1e-9)) : null); if (i === n) { g /= n; l /= n; } } else { g = (g * (n - 1) + Math.max(0, d)) / n; l = (l * (n - 1) + Math.max(0, -d)) / n; out.push(100 - 100 / (1 + g / (l || 1e-9))); } } return out; }
function heikin(c: Candle[]): Candle[] { const out: Candle[] = []; c.forEach((x, i) => { const close = (x.open + x.high + x.low + x.close) / 4; const open = i === 0 ? (x.open + x.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2; out.push({ ...x, open, close, high: Math.max(x.high, open, close), low: Math.min(x.low, open, close) }); }); return out; }

function Chart() {
  const { selectedSymbol, prices, trades, positions, orders, alerts, addAlert, news } = useTrading();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<Timeframe>(() => (localStorage.getItem('mindtrade_tf') as Timeframe) || '1m');
  const [mode, setMode] = useState<Mode>('candle');
  const [inds, setInds] = useState<Ind[]>(['SMA', 'VOL']);
  const [tool, setTool] = useState<Tool>('none');
  const [drawings, setDrawings] = useState<Record<string, Drawing[]>>(() => { try { return JSON.parse(localStorage.getItem('mindtrade_drawings') || '{}'); } catch { return {}; } });
  const [draft, setDraft] = useState<Drawing | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [count, setCount] = useState(90);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; off: number } | null>(null);
  const geo = useRef<{ toX: (i: number) => number; toY: (p: number) => number; fromY: (y: number) => number; fromX: (x: number) => number; visible: Candle[]; chartH: number; top: number; right: number; w: number } | null>(null);

  const [dragging, setDragging] = useState(false);
  useEffect(() => { localStorage.setItem('mindtrade_tf', tf); }, [tf]);
  useEffect(() => { localStorage.setItem('mindtrade_drawings', JSON.stringify(drawings)); }, [drawings]);
  const changeTf = (t: Timeframe) => { setTf(t); setOffset(0); };

  const symDrawings = useMemo(() => drawings[selectedSymbol] ?? [], [drawings, selectedSymbol]);
  const q = prices[selectedSymbol];
  const digits = simulator.getAsset(selectedSymbol)?.digits ?? 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current, box = boxRef.current;
    if (!canvas || !box) return;
    const rect = box.getBoundingClientRect();
    const w = Math.floor(rect.width), h = Math.floor(rect.height);
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    let all = simulator.getCandles(selectedSymbol, tf);
    if (mode === 'heikin') all = heikin(all);
    const end = Math.max(Math.min(all.length, count), all.length - offset);
    const visible = all.slice(Math.max(0, end - count), end);
    if (visible.length < 2) return;

    const showRsi = inds.includes('RSI'), showVol = inds.includes('VOL');
    const PAD = { top: 14, right: 74, bottom: 22, left: 6 };
    const rsiH = showRsi ? Math.min(90, h * 0.2) : 0;
    const chartH = h - PAD.top - PAD.bottom - rsiH - (showRsi ? 8 : 0);
    const chartW = w - PAD.left - PAD.right;
    const slot = chartW / visible.length;

    // price range includes position levels that are close by
    let lo = Math.min(...visible.map(c => c.low)), hi = Math.max(...visible.map(c => c.high));
    const rng0 = hi - lo || hi * 0.001;
    const extra = [...positions.filter(p => p.symbol === selectedSymbol).flatMap(p => [p.entryPrice, p.stopLoss, p.takeProfit]), ...orders.filter(o => o.symbol === selectedSymbol).map(o => o.price)]
      .filter((v): v is number => !!v && v > lo - rng0 * 0.6 && v < hi + rng0 * 0.6);
    lo = Math.min(lo, ...extra); hi = Math.max(hi, ...extra);
    const pad = (hi - lo) * 0.08 || hi * 0.0005;
    lo -= pad; hi += pad;
    const toX = (i: number) => PAD.left + slot * (i + 0.5);
    const toY = (p: number) => PAD.top + ((hi - p) / (hi - lo)) * chartH;
    const fromY = (y: number) => hi - ((y - PAD.top) / chartH) * (hi - lo);
    const fromX = (x: number) => Math.round((x - PAD.left) / slot - 0.5);
    geo.current = { toX, toY, fromY, fromX, visible, chartH, top: PAD.top, right: PAD.right, w };
    const timeToIdx = (t: number) => { let i = visible.findIndex(c => c.time >= t); if (i === -1) i = t > visible[visible.length - 1].time ? visible.length - 1 + (t - visible[visible.length - 1].time) / TIMEFRAMES[tf] : 0; return i; };

    // grid + price axis
    ctx.font = '10px JetBrains Mono, monospace';
    for (let i = 0; i <= 6; i++) {
      const y = PAD.top + (i / 6) * chartH; const p = fromY(y);
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(w - PAD.right, y); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(digits), w - PAD.right + 6, y + 3);
    }
    const step = Math.max(1, Math.round(visible.length / 6));
    for (let i = 0; i < visible.length; i += step) {
      const x = toX(i); const d = new Date(visible[i].time);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + chartH); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.55)'; ctx.textAlign = 'center';
      const lbl = tf === '4h' || tf === '1h' ? `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00` : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(lbl, x, h - 6);
    }

    // volume
    if (showVol) {
      const mv = Math.max(...visible.map(c => c.volume)) || 1;
      visible.forEach((c, i) => {
        const vh = (c.volume / mv) * chartH * 0.16;
        ctx.fillStyle = c.close >= c.open ? 'rgba(38,166,154,0.22)' : 'rgba(239,83,80,0.22)';
        ctx.fillRect(toX(i) - slot * 0.35, PAD.top + chartH - vh, Math.max(1, slot * 0.7), vh);
      });
    }

    // Bollinger
    const closes = visible.map(c => c.close);
    if (inds.includes('BB')) {
      const b = bb(closes, 20, 2);
      ctx.fillStyle = 'rgba(41,98,255,0.06)'; ctx.beginPath();
      let first = true;
      b.forEach((v, i) => { if (!v) return; if (first) { ctx.moveTo(toX(i), toY(v.up)); first = false; } else ctx.lineTo(toX(i), toY(v.up)); });
      for (let i = b.length - 1; i >= 0; i--) { const v = b[i]; if (v) ctx.lineTo(toX(i), toY(v.lo)); }
      ctx.closePath(); ctx.fill();
      (['up', 'lo', 'md'] as const).forEach(k => { ctx.strokeStyle = k === 'md' ? 'rgba(41,98,255,0.45)' : 'rgba(41,98,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); let s = false; b.forEach((v, i) => { if (!v) return; if (!s) { ctx.moveTo(toX(i), toY(v[k])); s = true; } else ctx.lineTo(toX(i), toY(v[k])); }); ctx.stroke(); });
    }

    // candles / line
    if (mode === 'line') {
      const g = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
      g.addColorStop(0, 'rgba(41,98,255,0.35)'); g.addColorStop(1, 'rgba(41,98,255,0)');
      ctx.beginPath(); visible.forEach((c, i) => i ? ctx.lineTo(toX(i), toY(c.close)) : ctx.moveTo(toX(i), toY(c.close)));
      ctx.strokeStyle = '#2962ff'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.lineTo(toX(visible.length - 1), PAD.top + chartH); ctx.lineTo(toX(0), PAD.top + chartH); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    } else {
      const bw = Math.max(1, slot * 0.7);
      visible.forEach((c, i) => {
        const up = c.close >= c.open; const col = up ? '#26a69a' : '#ef5350'; const x = toX(i);
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke();
        ctx.fillStyle = col; const top = toY(Math.max(c.open, c.close)); ctx.fillRect(x - bw / 2, top, bw, Math.max(1, toY(Math.min(c.open, c.close)) - top));
      });
    }

    const line = (vals: (number | null)[], color: string) => { ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.beginPath(); let s = false; vals.forEach((v, i) => { if (v === null) return; if (!s) { ctx.moveTo(toX(i), toY(v)); s = true; } else ctx.lineTo(toX(i), toY(v)); }); ctx.stroke(); };
    if (inds.includes('SMA')) line(sma(closes, 20), 'rgba(255,183,77,0.9)');
    if (inds.includes('EMA')) line(ema(closes, 50), 'rgba(171,71,188,0.9)');

    // horizontal price tag helper
    const tag = (price: number, bg: string, text: string, dash: number[] | null, color = bg, lw = 1) => {
      const y = toY(price); if (y < PAD.top - 2 || y > PAD.top + chartH + 2) return;
      if (dash) { ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(w - PAD.right, y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = bg; ctx.fillRect(w - PAD.right + 1, y - 8, PAD.right - 2, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9.5px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.fillText(text, w - PAD.right + 4, y + 3.5);
    };
    const leftLabel = (price: number, bg: string, text: string) => {
      const y = toY(price); if (y < PAD.top || y > PAD.top + chartH) return;
      ctx.font = 'bold 9px Inter, sans-serif'; const tw = ctx.measureText(text).width + 10;
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(PAD.left + 4, y - 8, tw, 16, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(text, PAD.left + 9, y + 3.5);
    };

    // trade markers
    trades.filter(t => t.symbol === selectedSymbol && t.closeTime && t.closeTime >= visible[0].time).forEach(t => {
      const i1 = timeToIdx(t.openTime), i2 = timeToIdx(t.closeTime!);
      const x1 = toX(i1), y1 = toY(t.entryPrice), x2 = toX(i2), y2 = toY(t.closePrice!);
      ctx.setLineDash([2, 3]); ctx.strokeStyle = (t.pnl ?? 0) >= 0 ? 'rgba(38,166,154,.7)' : 'rgba(239,83,80,.7)'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      const up = t.direction === 'buy';
      ctx.fillStyle = up ? '#2196f3' : '#ff5252'; ctx.beginPath();
      if (up) { ctx.moveTo(x1, y1 + 2); ctx.lineTo(x1 - 5, y1 + 10); ctx.lineTo(x1 + 5, y1 + 10); } else { ctx.moveTo(x1, y1 - 2); ctx.lineTo(x1 - 5, y1 - 10); ctx.lineTo(x1 + 5, y1 - 10); }
      ctx.fill();
      ctx.fillStyle = (t.pnl ?? 0) >= 0 ? '#26a69a' : '#ef5350'; ctx.beginPath(); ctx.arc(x2, y2, 3.5, 0, Math.PI * 2); ctx.fill();
    });

    // news flags
    news.filter(n => n.symbol === selectedSymbol && n.time >= visible[0].time).forEach(n => {
      const x = toX(timeToIdx(n.time));
      ctx.fillStyle = n.impact === 'bullish' ? 'rgba(38,166,154,.9)' : 'rgba(239,83,80,.9)';
      ctx.beginPath(); ctx.roundRect(x - 7, PAD.top + chartH - 16, 14, 14, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center'; ctx.fillText('N', x, PAD.top + chartH - 6);
    });

    // drawings
    const allD = draft ? [...symDrawings, draft] : symDrawings;
    allD.forEach(d => {
      const x1 = toX(timeToIdx(d.t1)), y1 = toY(d.p1), x2 = toX(timeToIdx(d.t2)), y2 = toY(d.p2);
      ctx.lineWidth = 1.5;
      if (d.type === 'hline') { ctx.strokeStyle = '#ffb74d'; ctx.beginPath(); ctx.moveTo(PAD.left, y1); ctx.lineTo(w - PAD.right, y1); ctx.stroke(); tag(d.p1, '#b7791f', d.p1.toFixed(digits), null); }
      else if (d.type === 'rect') { ctx.strokeStyle = '#7c4dff'; ctx.fillStyle = 'rgba(124,77,255,0.08)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); }
      else { ctx.strokeStyle = '#42a5f5'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    });

    // alerts
    alerts.filter(a => a.symbol === selectedSymbol).forEach(a => { tag(a.price, '#b7791f', '🔔 ' + a.price.toFixed(digits).slice(-7), [2, 4], '#ffb74d'); });

    // pending orders
    orders.filter(o => o.symbol === selectedSymbol).forEach(o => {
      const col = o.direction === 'buy' ? '#26a69a' : '#ef5350';
      tag(o.price, col + 'cc', o.price.toFixed(digits), [6, 4], col);
      leftLabel(o.price, col + 'cc', `${o.direction.toUpperCase()} ${o.kind.toUpperCase()} ${o.size}`);
      if (o.stopLoss) tag(o.stopLoss, '#ef5350aa', 'SL', [2, 3], '#ef535088');
      if (o.takeProfit) tag(o.takeProfit, '#26a69aaa', 'TP', [2, 3], '#26a69a88');
    });

    // open positions
    positions.filter(p => p.symbol === selectedSymbol).forEach(p => {
      const col = p.direction === 'buy' ? '#2196f3' : '#ff5252';
      tag(p.entryPrice, col, p.entryPrice.toFixed(digits), [], col, 1.3);
      leftLabel(p.entryPrice, p.pnl >= 0 ? '#26a69a' : '#ef5350', `${p.direction.toUpperCase()} ${p.size}  ${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)}`);
      if (p.stopLoss) { tag(p.stopLoss, '#ef5350', 'SL ' + p.stopLoss.toFixed(digits).slice(-6), [4, 3], '#ef5350'); }
      if (p.takeProfit) { tag(p.takeProfit, '#26a69a', 'TP ' + p.takeProfit.toFixed(digits).slice(-6), [4, 3], '#26a69a'); }
    });

    // bid / ask + countdown
    if (q && offset === 0) {
      ctx.setLineDash([1, 3]);
      ctx.strokeStyle = 'rgba(38,166,154,0.55)'; ctx.beginPath(); ctx.moveTo(PAD.left, toY(q.ask)); ctx.lineTo(w - PAD.right, toY(q.ask)); ctx.stroke();
      ctx.strokeStyle = 'rgba(239,83,80,0.55)'; ctx.beginPath(); ctx.moveTo(PAD.left, toY(q.bid)); ctx.lineTo(w - PAD.right, toY(q.bid)); ctx.stroke();
      ctx.setLineDash([]);
      const last = visible[visible.length - 1];
      const bg = last.close >= last.open ? '#26a69a' : '#ef5350';
      const y = toY(q.bid);
      ctx.fillStyle = bg; ctx.fillRect(w - PAD.right + 1, y - 8, PAD.right - 2, 28);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.fillText(q.bid.toFixed(digits), w - PAD.right + 4, y + 4);
      const msLeft = Math.max(0, TIMEFRAMES[tf] - (simulator.simTime % TIMEFRAMES[tf]));
      const s = Math.floor(msLeft / 1000);
      ctx.font = '9px JetBrains Mono, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, w - PAD.right + 4, y + 16);
    }

    // RSI pane
    if (showRsi) {
      const top = PAD.top + chartH + 8, H = rsiH;
      ctx.fillStyle = 'rgba(255,255,255,0.015)'; ctx.fillRect(PAD.left, top, chartW, H);
      [30, 70].forEach(lv => { const y = top + (1 - lv / 100) * H; ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(w - PAD.right, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(148,163,184,.6)'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'left'; ctx.fillText(String(lv), w - PAD.right + 6, y + 3); });
      const r = rsi(closes);
      ctx.strokeStyle = '#ab47bc'; ctx.lineWidth = 1.3; ctx.beginPath(); let s = false;
      r.forEach((v, i) => { if (v === null) return; const y = top + (1 - v / 100) * H; if (!s) { ctx.moveTo(toX(i), y); s = true; } else ctx.lineTo(toX(i), y); }); ctx.stroke();
      const lastR = r[r.length - 1];
      ctx.fillStyle = 'rgba(148,163,184,.8)'; ctx.font = '9px Inter'; ctx.textAlign = 'left'; ctx.fillText(`RSI 14  ${lastR?.toFixed(1) ?? ''}`, PAD.left + 4, top + 10);
    }

    // crosshair
    if (mouse && mouse.y > PAD.top && mouse.y < PAD.top + chartH && mouse.x < w - PAD.right) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mouse.x, PAD.top); ctx.lineTo(mouse.x, PAD.top + chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.left, mouse.y); ctx.lineTo(w - PAD.right, mouse.y); ctx.stroke(); ctx.setLineDash([]);
      tag(fromY(mouse.y), '#363a45', fromY(mouse.y).toFixed(digits), null);
      const i = Math.max(0, Math.min(visible.length - 1, fromX(mouse.x)));
      const c = visible[i];
      ctx.font = '10.5px JetBrains Mono, monospace'; ctx.textAlign = 'left';
      const d = new Date(c.time);
      const txt = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}   O ${c.open.toFixed(digits)}  H ${c.high.toFixed(digits)}  L ${c.low.toFixed(digits)}  C ${c.close.toFixed(digits)}`;
      ctx.fillStyle = 'rgba(19,23,34,0.85)'; ctx.fillRect(PAD.left + 2, PAD.top - 2, ctx.measureText(txt).width + 12, 16);
      ctx.fillStyle = c.close >= c.open ? '#26a69a' : '#ef5350'; ctx.fillText(txt, PAD.left + 8, PAD.top + 10);
    }
  }, [selectedSymbol, tf, mode, inds, count, offset, positions, orders, trades, alerts, news, draft, symDrawings, mouse, q, digits]);

  useEffect(() => { const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id); }, [draw]);
  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(draw)); ro.observe(box); return () => ro.disconnect();
  }, [draw]);
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); setCount(c => Math.max(25, Math.min(400, Math.round(c * (e.deltaY > 0 ? 1.12 : 0.89))))); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const pos = (e: React.MouseEvent) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const toTP = (p: { x: number; y: number }) => {
    const g = geo.current!; const i = g.fromX(p.x); const v = g.visible;
    const t = i < v.length ? v[Math.max(0, i)].time : v[v.length - 1].time + (i - v.length + 1) * TIMEFRAMES[tf];
    return { t, p: +g.fromY(p.y).toFixed(digits) };
  };
  function down(e: React.MouseEvent) {
    const p = pos(e);
    if (!geo.current) return;
    if (tool === 'none') { drag.current = { x: p.x, off: offset }; setDragging(true); return; }
    const tp = toTP(p);
    if (tool === 'alert') { addAlert(selectedSymbol, tp.p); setTool('none'); return; }
    if (tool === 'hline') { setDrawings(d => ({ ...d, [selectedSymbol]: [...(d[selectedSymbol] ?? []), { id: crypto.randomUUID(), type: 'hline', t1: tp.t, p1: tp.p, t2: tp.t, p2: tp.p }] })); return; }
    setDraft({ id: crypto.randomUUID(), type: tool, t1: tp.t, p1: tp.p, t2: tp.t, p2: tp.p });
  }
  function move(e: React.MouseEvent) {
    const p = pos(e); setMouse(p);
    if (drag.current && geo.current) {
      const slot = (geo.current.w - geo.current.right) / geo.current.visible.length;
      setOffset(Math.max(0, Math.round(drag.current.off + (p.x - drag.current.x) / slot)));
    }
    if (draft && geo.current) { const tp = toTP(p); setDraft({ ...draft, t2: tp.t, p2: tp.p }); }
  }
  function up() {
    drag.current = null; setDragging(false);
    if (draft) { setDrawings(d => ({ ...d, [selectedSymbol]: [...(d[selectedSymbol] ?? []), draft] })); setDraft(null); }
  }

  const changePct = q?.changePct ?? 0;
  const btn = (on: boolean) => `chip-btn ${on ? 'on' : ''}`;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{selectedSymbol}</span>
          <span className="font-mono" style={{ fontSize: 15, fontWeight: 800, color: changePct >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPrice(selectedSymbol, q?.price)}</span>
          <span className="font-mono" style={{ fontSize: 11, color: changePct >= 0 ? 'var(--green)' : 'var(--red)' }}>{changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%</span>
          <span className="font-mono hide-md" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>H {fmtPrice(selectedSymbol, q?.high)} · L {fmtPrice(selectedSymbol, q?.low)}</span>
        </div>
        <div className="seg" style={{ padding: 1 }}>
          {(Object.keys(TIMEFRAMES) as Timeframe[]).map(t => <button key={t} className={tf === t ? 'on' : ''} onClick={() => changeTf(t)} style={{ padding: '3px 7px' }}>{t.toUpperCase()}</button>)}
        </div>
        <div className="seg" style={{ padding: 1 }}>
          {([['candle', 'Candles'], ['heikin', 'Heikin'], ['line', 'Line']] as [Mode, string][]).map(([m, l]) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)} style={{ padding: '3px 7px' }}>{l}</button>)}
        </div>
        {(['SMA', 'EMA', 'BB', 'VOL', 'RSI'] as Ind[]).map(i => (
          <button key={i} className={btn(inds.includes(i))} onClick={() => setInds(v => v.includes(i) ? v.filter(x => x !== i) : [...v, i])} title={{ SMA: 'SMA 20', EMA: 'EMA 50', BB: 'Bollinger Bands 20,2', VOL: 'Volume', RSI: 'RSI 14' }[i]}>{i}</button>
        ))}
        <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
        {([['none', <MousePointer2 size={11} />, 'Pan'], ['trend', <TrendingUp size={11} />, 'Trend line'], ['hline', <Minus size={11} />, 'Horizontal line'], ['rect', <Square size={11} />, 'Box'], ['alert', <Bell size={11} />, 'Price alert — click a price']] as [Tool, React.ReactNode, string][]).map(([t, ic, l]) => (
          <button key={t} className={btn(tool === t)} title={l} onClick={() => setTool(t)} style={{ display: 'flex', alignItems: 'center' }}>{ic}</button>
        ))}
        {symDrawings.length > 0 && <button className="chip-btn" title="Clear drawings" onClick={() => setDrawings(d => ({ ...d, [selectedSymbol]: [] }))}><Trash2 size={11} /></button>}
        {offset > 0 && <button className="chip-btn on" onClick={() => setOffset(0)}>⏩ Live</button>}
        <button className="chip-btn" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }} title="Simulate breaking news on this symbol" onClick={() => simulator.triggerNews(selectedSymbol)}><Zap size={11} /> News shock</button>
      </div>
      <div ref={boxRef} style={{ flex: 1, minHeight: 0, position: 'relative', cursor: tool === 'none' ? (dragging ? 'grabbing' : 'crosshair') : 'copy' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }}
          onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={() => { setMouse(null); drag.current = null; setDragging(false); }} />
        {tool !== 'none' && <div style={{ position: 'absolute', top: 24, left: 12, fontSize: 10.5, color: '#ffb74d', background: 'rgba(0,0,0,.5)', padding: '3px 8px', borderRadius: 4, pointerEvents: 'none' }}>
          {tool === 'alert' ? 'Click a price level to set an alert' : tool === 'hline' ? 'Click to place a horizontal level' : 'Click and drag to draw'}
        </div>}
      </div>
    </div>
  );
}

export default function TradingChart() {
  const { selectedSymbol } = useTrading();
  return <Chart key={selectedSymbol} />;
}

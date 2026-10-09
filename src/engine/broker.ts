// ─────────────────────────────────────────────────────────────────────────────
// Paper Broker — executes orders the way a real MT5 / cTrader style broker does
//
//  • Market orders fill at ASK (buy) / BID (sell); positions are marked at the
//    price you could close at (BID for longs, ASK for shorts) — spread is a cost.
//  • Pending orders: Buy/Sell Limit & Buy/Sell Stop, with optional expiry.
//  • SL / TP / trailing stop are server-side and validated for the correct side.
//  • Margin = notional / leverage. Orders are rejected on insufficient margin.
//  • Margin call at 100 % margin level, automatic stop-out at 50 %.
//  • Commission per lot per side, partial closes, close-all, MFE / MAE tracking.
//  • Discipline guard: daily loss limit, max trades/day, max lot, mandatory SL,
//    and a "tilt" cool-down after a losing streak.
// ─────────────────────────────────────────────────────────────────────────────
import { simulator, type Quote, type Quotes } from './simulator';
import type { EmotionScores } from './emotionEngine';

export type Direction = 'buy' | 'sell';
export type OrderKind = 'market' | 'limit' | 'stop';
export type CloseReason = 'manual' | 'sl' | 'tp' | 'trailing' | 'stop-out' | 'partial' | 'close-all';
export type Intent = 'plan' | 'breakout' | 'pullback' | 'news' | 'fomo' | 'revenge' | 'boredom';
export type Mood = 'calm' | 'neutral' | 'anxious' | 'frustrated' | 'euphoric';

export const INTENTS: { id: Intent; label: string; emoji: string; emotional: boolean }[] = [
  { id: 'plan', label: 'Following my plan', emoji: '📋', emotional: false },
  { id: 'breakout', label: 'Breakout', emoji: '🚀', emotional: false },
  { id: 'pullback', label: 'Pullback', emoji: '↩️', emotional: false },
  { id: 'news', label: 'News reaction', emoji: '📰', emotional: false },
  { id: 'fomo', label: 'Fear of missing out', emoji: '😱', emotional: true },
  { id: 'revenge', label: 'Making it back', emoji: '😤', emotional: true },
  { id: 'boredom', label: 'Bored', emoji: '🥱', emotional: true },
];
export const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'anxious', emoji: '😬', label: 'Anxious' },
  { id: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { id: 'euphoric', emoji: '🤑', label: 'Euphoric' },
];

export interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  size: number;
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingDistance?: number; // price units
  openTime: number;
  pnl: number;      // net floating P&L (after round-turn commission)
  pnlPct: number;   // % of margin
  commission: number;
  margin: number;
  initialRisk?: number;   // $ at risk at open (for R multiples)
  mfe: number;      // max favorable excursion, $
  mae: number;      // max adverse excursion, $
  trailingActive?: boolean;
  emotionAtOpen: EmotionScores;
  intent?: Intent;
  mood?: Mood;
  comment?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  direction: Direction;
  size: number;
  entryPrice: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: number;
  closeTime?: number;
  pnl?: number;          // net
  grossPnl?: number;
  commission?: number;
  closeReason?: CloseReason;
  rMultiple?: number;
  mfe?: number;
  mae?: number;
  intent?: Intent;
  mood?: Mood;
  emotionAtOpen?: EmotionScores;
  emotionAtClose?: EmotionScores;
  journalEntry?: string;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  direction: Direction;
  kind: 'limit' | 'stop';
  price: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingDistance?: number;
  createdAt: number;
  expiresAt?: number;
  intent?: Intent;
  mood?: Mood;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: 'above' | 'below';
  createdAt: number;
  note?: string;
}

export interface Settings {
  startingBalance: number;
  leverage: number;
  commissionEnabled: boolean;
  dailyLossLimitPct: number;   // 0 = off
  maxTradesPerDay: number;     // 0 = off
  maxLotPerTrade: number;      // 0 = off
  maxRiskPerTradePct: number;  // 0 = off (needs SL)
  requireStopLoss: boolean;
  tiltGuard: boolean;
  tiltLosses: number;          // consecutive losses that trigger cool-down
  cooldownMinutes: number;
  moodCheck: boolean;          // ask intent + mood before each trade
  oneClick: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  startingBalance: 100_000,
  leverage: 100,
  commissionEnabled: true,
  dailyLossLimitPct: 5,
  maxTradesPerDay: 0,
  maxLotPerTrade: 0,
  maxRiskPerTradePct: 0,
  requireStopLoss: false,
  tiltGuard: true,
  tiltLosses: 3,
  cooldownMinutes: 3,
  moodCheck: true,
  oneClick: false,
  sound: true,
};

export type BrokerEventKind = 'fill' | 'close' | 'sl' | 'tp' | 'trailing' | 'reject' | 'pending' | 'cancel' | 'alert' | 'margin-call' | 'stop-out' | 'tilt' | 'news' | 'info';
export interface BrokerEvent { id: string; kind: BrokerEventKind; title: string; message: string; time: number; tone: 'good' | 'bad' | 'warn' | 'info'; }

export interface EquityPoint { t: number; equity: number; balance: number; }

export interface BrokerState {
  settings: Settings;
  balance: number;
  positions: Position[];
  orders: PendingOrder[];
  trades: Trade[];
  alerts: PriceAlert[];
  equityCurve: EquityPoint[];
  cooldownUntil: number;       // real-time ms
  ruleOverrides: number;
  dayKey: string;
  dayStartBalance: number;
  marginCallActive: boolean;
}

export interface OrderRequest {
  symbol: string;
  direction: Direction;
  kind: OrderKind;
  size: number;
  price?: number;              // for limit / stop
  stopLoss?: number;
  takeProfit?: number;
  trailingDistance?: number;
  expiresInMin?: number;
  intent?: Intent;
  mood?: Mood;
  emotion: EmotionScores;
}

export interface OrderResult { ok: boolean; error?: string; id?: string; }

const STORAGE_KEY = 'mindtrade_broker_v2';
const dayKeyOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const r2 = (v: number) => Math.round(v * 100) / 100;
const ZERO_EMOTIONS: EmotionScores = { fear: 0, greed: 0, fomo: 0, discipline: 0, stress: 0, confidence: 0, patience: 0, revenge: 0 };

// ── pure helpers ───────────────────────────────────────────────────────────
export function unitsOf(symbol: string, size: number) {
  return size * (simulator.getAsset(symbol)?.lotSize ?? 1);
}
export function grossPnl(dir: Direction, entry: number, exit: number, symbol: string, size: number) {
  const u = unitsOf(symbol, size);
  return r2(dir === 'buy' ? (exit - entry) * u : (entry - exit) * u);
}
export function commissionFor(symbol: string, size: number, enabled: boolean) {
  if (!enabled) return 0;
  const a = simulator.getAsset(symbol);
  if (!a) return 0;
  // stocks are charged per share; everything else per lot, both sides
  return r2(a.commissionPerLot * size * 2);
}
export function effectiveLeverage(symbol: string, accountLev: number) {
  return Math.min(accountLev, simulator.getAsset(symbol)?.maxLeverage ?? accountLev);
}
export function marginFor(symbol: string, size: number, price: number, accountLev: number) {
  return r2((unitsOf(symbol, size) * price) / effectiveLeverage(symbol, accountLev));
}
/** $ value of a 1-pip move for the given volume */
export function pipValue(symbol: string, size: number) {
  const a = simulator.getAsset(symbol);
  return a ? unitsOf(symbol, size) * a.pip : 0;
}
export function closePriceFor(dir: Direction, q: Quote) { return dir === 'buy' ? q.bid : q.ask; }
export function openPriceFor(dir: Direction, q: Quote) { return dir === 'buy' ? q.ask : q.bid; }

export function normalizeLots(symbol: string, size: number) {
  const a = simulator.getAsset(symbol);
  if (!a) return size;
  const steps = Math.floor(size / a.lotStep + 1e-9);
  return +Math.max(0, Math.min(a.maxLot, steps * a.lotStep)).toFixed(4);
}

// ── broker ─────────────────────────────────────────────────────────────────
type Listener = () => void;
type EventListener = (e: BrokerEvent) => void;

class Broker {
  state: BrokerState;
  private listeners: Listener[] = [];
  private eventListeners: EventListener[] = [];
  private lastCurveAt = 0;
  private lastSaveAt = 0;
  private journal?: (t: Trade) => string;

  constructor() {
    this.state = this.load() ?? this.fresh(DEFAULT_SETTINGS);
  }

  private fresh(settings: Settings): BrokerState {
    return {
      settings, balance: settings.startingBalance, positions: [], orders: [], trades: [], alerts: [],
      equityCurve: [{ t: Date.now(), equity: settings.startingBalance, balance: settings.startingBalance }],
      cooldownUntil: 0, ruleOverrides: 0, dayKey: dayKeyOf(), dayStartBalance: settings.startingBalance, marginCallActive: false,
    };
  }

  private load(): BrokerState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as BrokerState;
      s.settings = { ...DEFAULT_SETTINGS, ...s.settings };
      // drop anything referencing symbols that no longer exist
      s.positions = (s.positions || []).filter(p => simulator.getAsset(p.symbol)).map(p => ({ ...p, mfe: p.mfe ?? 0, mae: p.mae ?? 0, commission: p.commission ?? 0, margin: p.margin ?? 0, emotionAtOpen: p.emotionAtOpen ?? ZERO_EMOTIONS }));
      s.orders = (s.orders || []).filter(o => simulator.getAsset(o.symbol));
      s.alerts = (s.alerts || []).filter(a => simulator.getAsset(a.symbol));
      s.trades = s.trades || [];
      s.equityCurve = s.equityCurve?.length ? s.equityCurve : [{ t: Date.now(), equity: s.balance, balance: s.balance }];
      return s;
    } catch { return null; }
  }

  private save() {
    try {
      const s = { ...this.state, equityCurve: this.state.equityCurve.slice(-1500) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* storage full */ }
  }

  private set(patch: Partial<BrokerState>, persist = true) {
    this.state = { ...this.state, ...patch };
    if (persist) this.save();
    this.listeners.forEach(l => l());
  }

  private emit(kind: BrokerEventKind, title: string, message: string, tone: BrokerEvent['tone']) {
    const e: BrokerEvent = { id: crypto.randomUUID(), kind, title, message, time: Date.now(), tone };
    this.eventListeners.forEach(l => l(e));
  }

  subscribe = (l: Listener) => { this.listeners.push(l); return () => { this.listeners = this.listeners.filter(x => x !== l); }; };
  onEvent = (l: EventListener) => { this.eventListeners.push(l); return () => { this.eventListeners = this.eventListeners.filter(x => x !== l); }; };
  getState = () => this.state;
  setJournalWriter(fn: (t: Trade) => string) { this.journal = fn; }

  // ── account metrics ──────────────────────────────────────────────────────
  equity(s = this.state) { return r2(s.balance + s.positions.reduce((a, p) => a + p.pnl, 0)); }
  marginUsed(s = this.state) { return r2(s.positions.reduce((a, p) => a + p.margin, 0)); }
  freeMargin(s = this.state) { return r2(this.equity(s) - this.marginUsed(s)); }
  marginLevel(s = this.state) { const m = this.marginUsed(s); return m > 0 ? (this.equity(s) / m) * 100 : Infinity; }
  todaysTrades(s = this.state) { const k = dayKeyOf(); return s.trades.filter(t => dayKeyOf(t.openTime) === k).length + s.positions.filter(p => dayKeyOf(p.openTime) === k).length; }
  todaysPnl(s = this.state) { return this.equity(s) - s.dayStartBalance; }

  /** Discipline-guard checks. Returns blocking problems. */
  ruleCheck(req: Pick<OrderRequest, 'symbol' | 'size' | 'stopLoss' | 'direction'> & { entry: number }): string[] {
    const s = this.state; const set = s.settings; const out: string[] = [];
    if (Date.now() < s.cooldownUntil) out.push(`Tilt guard active — trading paused for ${Math.ceil((s.cooldownUntil - Date.now()) / 1000)}s`);
    if (set.dailyLossLimitPct > 0 && this.todaysPnl() <= -s.dayStartBalance * set.dailyLossLimitPct / 100) out.push(`Daily loss limit of ${set.dailyLossLimitPct}% reached — come back tomorrow`);
    if (set.maxTradesPerDay > 0 && this.todaysTrades() >= set.maxTradesPerDay) out.push(`Max ${set.maxTradesPerDay} trades per day reached`);
    if (set.maxLotPerTrade > 0 && req.size > set.maxLotPerTrade) out.push(`Size exceeds your max of ${set.maxLotPerTrade} lots`);
    if (set.requireStopLoss && !req.stopLoss) out.push('Your rules require a stop loss on every trade');
    if (set.maxRiskPerTradePct > 0 && req.stopLoss) {
      const risk = Math.abs(grossPnl(req.direction, req.entry, req.stopLoss, req.symbol, req.size));
      if (risk > this.equity() * set.maxRiskPerTradePct / 100) out.push(`Risk $${risk.toFixed(0)} is above your ${set.maxRiskPerTradePct}% per-trade limit`);
    }
    return out;
  }

  /** Validates SL/TP placement relative to the reference price */
  private validateStops(dir: Direction, ref: number, sl: number | undefined, tp: number | undefined, symbol: string): string | null {
    const a = simulator.getAsset(symbol)!;
    const minDist = a.spread * 1.5;
    if (sl !== undefined) {
      if (!(sl > 0)) return 'Invalid stop loss';
      if (dir === 'buy' && sl >= ref - minDist) return `Stop loss for a BUY must be below ${simulator.format(symbol, ref - minDist)}`;
      if (dir === 'sell' && sl <= ref + minDist) return `Stop loss for a SELL must be above ${simulator.format(symbol, ref + minDist)}`;
    }
    if (tp !== undefined) {
      if (!(tp > 0)) return 'Invalid take profit';
      if (dir === 'buy' && tp <= ref + minDist) return `Take profit for a BUY must be above ${simulator.format(symbol, ref + minDist)}`;
      if (dir === 'sell' && tp >= ref - minDist) return `Take profit for a SELL must be below ${simulator.format(symbol, ref - minDist)}`;
    }
    return null;
  }

  // ── orders ───────────────────────────────────────────────────────────────
  placeOrder(req: OrderRequest, overrideRules = false): OrderResult {
    const a = simulator.getAsset(req.symbol);
    const q = simulator.getQuote(req.symbol);
    if (!a || !q) return this.reject('Unknown symbol');
    if (simulator.speed === 0 && req.kind === 'market') return this.reject('Market is paused — resume the simulation to trade');
    const size = normalizeLots(req.symbol, req.size);
    if (!(size >= a.minLot)) return this.reject(`Minimum size is ${a.minLot} ${a.lotSize === 1 ? 'units' : 'lots'}`);
    if (size > a.maxLot) return this.reject(`Maximum size is ${a.maxLot}`);

    const s = this.state;
    const entryRef = req.kind === 'market' ? openPriceFor(req.direction, q) : req.price!;
    if (req.kind !== 'market') {
      if (!(req.price && req.price > 0)) return this.reject('Enter a valid order price');
      const mkt = openPriceFor(req.direction, q);
      const below = req.price < mkt;
      if (req.kind === 'limit' && req.direction === 'buy' && !below) return this.reject(`Buy Limit must be below the ask (${simulator.format(req.symbol, mkt)}). Use Buy Stop to buy higher.`);
      if (req.kind === 'limit' && req.direction === 'sell' && below) return this.reject(`Sell Limit must be above the bid (${simulator.format(req.symbol, mkt)}). Use Sell Stop to sell lower.`);
      if (req.kind === 'stop' && req.direction === 'buy' && below) return this.reject(`Buy Stop must be above the ask (${simulator.format(req.symbol, mkt)})`);
      if (req.kind === 'stop' && req.direction === 'sell' && !below) return this.reject(`Sell Stop must be below the bid (${simulator.format(req.symbol, mkt)})`);
    }
    const stopErr = this.validateStops(req.direction, req.kind === 'market' ? closePriceFor(req.direction, q) : req.price!, req.stopLoss, req.takeProfit, req.symbol);
    if (stopErr) return this.reject(stopErr);

    const rules = this.ruleCheck({ symbol: req.symbol, size, stopLoss: req.stopLoss, direction: req.direction, entry: entryRef });
    if (rules.length) {
      const hard = rules.filter(r => r.startsWith('Tilt') || r.startsWith('Daily loss'));
      if (hard.length || !overrideRules) return this.reject(rules[0]);
      this.set({ ruleOverrides: s.ruleOverrides + 1 });
    }

    const margin = marginFor(req.symbol, size, entryRef, s.settings.leverage);
    if (margin > this.freeMargin()) return this.reject(`Not enough free margin — needs $${margin.toLocaleString()}, you have $${this.freeMargin().toLocaleString()}`);

    if (req.kind === 'market') {
      const id = this.openPosition({ ...req, size }, entryRef, q.gap);
      return { ok: true, id };
    }
    const order: PendingOrder = {
      id: crypto.randomUUID(), symbol: req.symbol, direction: req.direction, kind: req.kind, price: req.price!, size,
      stopLoss: req.stopLoss, takeProfit: req.takeProfit, trailingDistance: req.trailingDistance, createdAt: Date.now(),
      expiresAt: req.expiresInMin ? Date.now() + req.expiresInMin * 60_000 : undefined, intent: req.intent, mood: req.mood,
    };
    this.set({ orders: [...s.orders, order] });
    this.emit('pending', 'Order placed', `${req.direction === 'buy' ? 'Buy' : 'Sell'} ${req.kind === 'limit' ? 'Limit' : 'Stop'} ${size} ${req.symbol} @ ${simulator.format(req.symbol, req.price)}`, 'info');
    return { ok: true, id: order.id };
  }

  private pendingEmotion?: EmotionScores;
  setCurrentEmotion(e: EmotionScores) { this.pendingEmotion = e; }

  private openPosition(req: OrderRequest, price: number, gap: boolean, fromOrder?: PendingOrder): string {
    const a = simulator.getAsset(req.symbol)!;
    // slippage on news spikes for market fills
    let fill = price;
    if (gap && !fromOrder) {
      const slip = a.pip * (Math.random() * 3);
      fill = +(req.direction === 'buy' ? price + slip : price - slip).toFixed(a.digits);
    }
    const s = this.state;
    const commission = commissionFor(req.symbol, req.size, s.settings.commissionEnabled);
    const margin = marginFor(req.symbol, req.size, fill, s.settings.leverage);
    const q = simulator.getQuote(req.symbol)!;
    const mark = closePriceFor(req.direction, q);
    const pnl = r2(grossPnl(req.direction, fill, mark, req.symbol, req.size) - commission);
    const pos: Position = {
      id: crypto.randomUUID(), symbol: req.symbol, direction: req.direction, size: req.size, lotSize: a.lotSize,
      entryPrice: fill, currentPrice: mark, stopLoss: req.stopLoss, takeProfit: req.takeProfit, trailingDistance: req.trailingDistance,
      openTime: Date.now(), pnl, pnlPct: margin ? r2(pnl / margin * 100) : 0, commission, margin,
      initialRisk: req.stopLoss ? Math.abs(grossPnl(req.direction, fill, req.stopLoss, req.symbol, req.size)) + commission : undefined,
      mfe: Math.max(0, pnl), mae: Math.min(0, pnl), emotionAtOpen: req.emotion ?? this.pendingEmotion ?? ZERO_EMOTIONS, intent: req.intent, mood: req.mood,
    };
    this.set({ positions: [...s.positions, pos], orders: fromOrder ? s.orders.filter(o => o.id !== fromOrder.id) : s.orders });
    this.emit('fill', fromOrder ? 'Pending order filled' : 'Order filled',
      `${req.direction.toUpperCase()} ${req.size} ${req.symbol} @ ${simulator.format(req.symbol, fill)}${fill !== price ? ' (slipped)' : ''}`, 'info');
    return pos.id;
  }

  private reject(msg: string): OrderResult {
    this.emit('reject', 'Order rejected', msg, 'bad');
    return { ok: false, error: msg };
  }

  cancelOrder(id: string) {
    const o = this.state.orders.find(x => x.id === id);
    if (!o) return;
    this.set({ orders: this.state.orders.filter(x => x.id !== id) });
    this.emit('cancel', 'Order cancelled', `${o.direction} ${o.kind} ${o.size} ${o.symbol}`, 'info');
  }

  modifyPosition(id: string, patch: { stopLoss?: number | null; takeProfit?: number | null; trailingDistance?: number | null }): OrderResult {
    const p = this.state.positions.find(x => x.id === id);
    const q = p && simulator.getQuote(p.symbol);
    if (!p || !q) return { ok: false, error: 'Position not found' };
    const sl = patch.stopLoss === null ? undefined : patch.stopLoss ?? p.stopLoss;
    const tp = patch.takeProfit === null ? undefined : patch.takeProfit ?? p.takeProfit;
    const err = this.validateStops(p.direction, closePriceFor(p.direction, q), sl, tp, p.symbol);
    if (err) return this.reject(err);
    const tr = patch.trailingDistance === null ? undefined : patch.trailingDistance ?? p.trailingDistance;
    this.set({ positions: this.state.positions.map(x => x.id === id ? { ...x, stopLoss: sl, takeProfit: tp, trailingDistance: tr } : x) });
    this.emit('info', 'Position modified', `${p.symbol} SL ${sl ? simulator.format(p.symbol, sl) : '—'} · TP ${tp ? simulator.format(p.symbol, tp) : '—'}`, 'info');
    return { ok: true };
  }

  /** Move stop loss to entry (+ commission) — "break even" */
  breakEven(id: string): OrderResult {
    const p = this.state.positions.find(x => x.id === id);
    const q = p && simulator.getQuote(p.symbol);
    if (!p || !q) return { ok: false, error: 'Position not found' };
    const a = simulator.getAsset(p.symbol)!;
    const comm = p.commission / unitsOf(p.symbol, p.size);
    const be = +(p.direction === 'buy' ? p.entryPrice + comm : p.entryPrice - comm).toFixed(a.digits);
    return this.modifyPosition(id, { stopLoss: be });
  }

  closePosition(id: string, opts: { volume?: number; reason?: CloseReason; price?: number; emotion?: EmotionScores } = {}): OrderResult {
    const s = this.state;
    const p = s.positions.find(x => x.id === id);
    const q = p && simulator.getQuote(p.symbol);
    if (!p || !q) return { ok: false, error: 'Position not found' };
    if (simulator.speed === 0 && !opts.price) return this.reject('Market is paused — resume the simulation to close');
    const volume = opts.volume ? Math.min(p.size, normalizeLots(p.symbol, opts.volume)) : p.size;
    if (!(volume > 0)) return this.reject('Invalid close volume');
    const partial = volume < p.size - 1e-9;
    const exit = opts.price ?? closePriceFor(p.direction, q);
    const gross = grossPnl(p.direction, p.entryPrice, exit, p.symbol, volume);
    const comm = r2(p.commission * (volume / p.size));
    const net = r2(gross - comm);
    const frac = volume / p.size;
    const reason: CloseReason = opts.reason ?? (partial ? 'partial' : 'manual');
    const trade: Trade = {
      id: partial ? crypto.randomUUID() : p.id, symbol: p.symbol, direction: p.direction, size: volume, entryPrice: p.entryPrice,
      closePrice: exit, stopLoss: p.stopLoss, takeProfit: p.takeProfit, openTime: p.openTime, closeTime: Date.now(),
      pnl: net, grossPnl: gross, commission: comm, closeReason: reason,
      rMultiple: p.initialRisk ? r2(net / (p.initialRisk * frac)) : undefined,
      mfe: r2(p.mfe * frac), mae: r2(p.mae * frac), intent: p.intent, mood: p.mood,
      emotionAtOpen: p.emotionAtOpen, emotionAtClose: opts.emotion ?? this.pendingEmotion,
    };
    if (this.journal) trade.journalEntry = this.journal(trade);
    const positions = partial
      ? s.positions.map(x => x.id === id ? this.remark({ ...x, size: +(x.size - volume).toFixed(4), commission: r2(x.commission - comm), margin: r2(x.margin * (1 - frac)), initialRisk: x.initialRisk ? x.initialRisk * (1 - frac) : undefined, mfe: x.mfe * (1 - frac), mae: x.mae * (1 - frac) }, q) : x)
      : s.positions.filter(x => x.id !== id);
    const balance = r2(s.balance + net);
    const trades = [...s.trades, trade];
    this.set({ balance, positions, trades });
    this.pushCurve(true);

    const label = { manual: 'Position closed', partial: 'Partial close', sl: 'Stop loss hit', tp: 'Take profit hit', trailing: 'Trailing stop hit', 'stop-out': 'STOP OUT', 'close-all': 'Position closed' }[reason];
    this.emit(reason === 'sl' || reason === 'trailing' ? 'sl' : reason === 'tp' ? 'tp' : reason === 'stop-out' ? 'stop-out' : 'close', label,
      `${p.symbol} ${volume} lots ${net >= 0 ? '+' : ''}$${net.toFixed(2)}`, net >= 0 ? 'good' : 'bad');
    this.checkTilt();
    return { ok: true };
  }

  closeAll(filter: 'all' | 'profit' | 'loss' = 'all', symbol?: string) {
    const ids = this.state.positions.filter(p => (!symbol || p.symbol === symbol) && (filter === 'all' || (filter === 'profit' ? p.pnl > 0 : p.pnl < 0))).map(p => p.id);
    ids.forEach(id => this.closePosition(id, { reason: 'close-all' }));
    return ids.length;
  }

  private checkTilt() {
    const s = this.state;
    if (!s.settings.tiltGuard) return;
    let streak = 0;
    for (let i = s.trades.length - 1; i >= 0; i--) { if ((s.trades[i].pnl ?? 0) < 0) streak++; else break; }
    if (streak >= s.settings.tiltLosses && streak % s.settings.tiltLosses === 0) {
      this.triggerCooldown(`${streak} losses in a row`);
    }
  }

  triggerCooldown(reason: string) {
    const until = Date.now() + this.state.settings.cooldownMinutes * 60_000;
    this.set({ cooldownUntil: until });
    this.emit('tilt', 'Tilt guard activated', `${reason}. Trading paused for ${this.state.settings.cooldownMinutes} min — take a breath.`, 'warn');
  }
  endCooldown() { this.set({ cooldownUntil: 0, ruleOverrides: this.state.ruleOverrides + 1 }); }

  // ── alerts ───────────────────────────────────────────────────────────────
  addAlert(symbol: string, price: number, note?: string) {
    const q = simulator.getQuote(symbol);
    if (!q) return;
    const alert: PriceAlert = { id: crypto.randomUUID(), symbol, price, condition: price >= q.price ? 'above' : 'below', createdAt: Date.now(), note };
    this.set({ alerts: [...this.state.alerts, alert] });
    this.emit('info', 'Alert set', `${symbol} ${alert.condition} ${simulator.format(symbol, price)}`, 'info');
  }
  removeAlert(id: string) { this.set({ alerts: this.state.alerts.filter(a => a.id !== id) }); }

  // ── settings / account ───────────────────────────────────────────────────
  updateSettings(patch: Partial<Settings>) {
    this.set({ settings: { ...this.state.settings, ...patch } });
  }
  resetAccount(startingBalance?: number) {
    const settings = { ...this.state.settings, startingBalance: startingBalance ?? this.state.settings.startingBalance };
    this.state = this.fresh(settings);
    this.save();
    this.listeners.forEach(l => l());
    this.emit('info', 'Account reset', `Fresh paper account with $${settings.startingBalance.toLocaleString()}`, 'info');
  }
  deposit(amount: number) {
    this.set({ balance: r2(this.state.balance + amount), dayStartBalance: r2(this.state.dayStartBalance + amount) });
  }

  // ── price engine hook ────────────────────────────────────────────────────
  private remark(p: Position, q: Quote): Position {
    const mark = closePriceFor(p.direction, q);
    const pnl = r2(grossPnl(p.direction, p.entryPrice, mark, p.symbol, p.size) - p.commission);
    return { ...p, currentPrice: mark, pnl, pnlPct: p.margin ? r2(pnl / p.margin * 100) : 0, mfe: Math.max(p.mfe, pnl), mae: Math.min(p.mae, pnl) };
  }

  private pushCurve(force = false) {
    const now = Date.now();
    if (!force && now - this.lastCurveAt < 5000) return;
    this.lastCurveAt = now;
    const curve = [...this.state.equityCurve, { t: now, equity: this.equity(), balance: this.state.balance }].slice(-1500);
    this.state = { ...this.state, equityCurve: curve };
  }

  onQuotes(quotes: Quotes) {
    let s = this.state;
    if (s.dayKey !== dayKeyOf()) {
      s = { ...s, dayKey: dayKeyOf(), dayStartBalance: this.equity(s) };
    }
    const triggers: { id: string; reason: CloseReason; price?: number }[] = [];

    // 1. mark positions, trailing stops, SL/TP
    const positions = s.positions.map(p0 => {
      const q = quotes[p0.symbol];
      if (!q) return p0;
      let p = this.remark(p0, q);
      const mark = p.currentPrice;
      const td = p.trailingDistance;
      if (td) {
        const a = simulator.getAsset(p.symbol)!;
        if (p.direction === 'buy' && mark - p.entryPrice >= td) {
          const nsl = +(mark - td).toFixed(a.digits);
          if (!p.stopLoss || nsl > p.stopLoss) p = { ...p, stopLoss: nsl, trailingActive: true };
        }
        if (p.direction === 'sell' && p.entryPrice - mark >= td) {
          const nsl = +(mark + td).toFixed(a.digits);
          if (!p.stopLoss || nsl < p.stopLoss) p = { ...p, stopLoss: nsl, trailingActive: true };
        }
      }
      const slHit = p.stopLoss !== undefined && (p.direction === 'buy' ? mark <= p.stopLoss : mark >= p.stopLoss);
      const tpHit = p.takeProfit !== undefined && (p.direction === 'buy' ? mark >= p.takeProfit : mark <= p.takeProfit);
      if (slHit) {
        // stop = market order once touched; fills at the stop price unless the market gapped through it
        const fill = q.gap ? mark : p.stopLoss!;
        triggers.push({ id: p.id, reason: p.trailingActive ? 'trailing' : 'sl', price: fill });
      } else if (tpHit) {
        // take profit = limit order: fills at the TP price (or better on a gap)
        triggers.push({ id: p.id, reason: 'tp', price: q.gap ? mark : p.takeProfit! });
      }
      return p;
    });
    this.state = { ...s, positions };

    triggers.forEach(t => this.closePosition(t.id, { reason: t.reason, price: t.price }));

    // 2. pending orders
    const now = Date.now();
    for (const o of [...this.state.orders]) {
      const q = quotes[o.symbol];
      if (!q) continue;
      if (o.expiresAt && now >= o.expiresAt) {
        this.state = { ...this.state, orders: this.state.orders.filter(x => x.id !== o.id) };
        this.emit('cancel', 'Order expired', `${o.direction} ${o.kind} ${o.size} ${o.symbol}`, 'info');
        continue;
      }
      const px = openPriceFor(o.direction, q);
      const hit = o.kind === 'limit' ? (o.direction === 'buy' ? px <= o.price : px >= o.price) : (o.direction === 'buy' ? px >= o.price : px <= o.price);
      if (!hit) continue;
      const margin = marginFor(o.symbol, o.size, px, this.state.settings.leverage);
      if (margin > this.freeMargin()) {
        this.state = { ...this.state, orders: this.state.orders.filter(x => x.id !== o.id) };
        this.emit('reject', 'Pending order cancelled', `${o.symbol}: not enough free margin when triggered`, 'bad');
        continue;
      }
      // limit fills at its price (or better), stop becomes a market order
      const fill = o.kind === 'limit' ? (q.gap ? px : o.price) : px;
      this.openPosition({ symbol: o.symbol, direction: o.direction, kind: 'market', size: o.size, stopLoss: o.stopLoss, takeProfit: o.takeProfit, trailingDistance: o.trailingDistance, intent: o.intent, mood: o.mood, emotion: this.pendingEmotion ?? ZERO_EMOTIONS }, fill, false, o);
    }

    // 3. alerts
    const fired: string[] = [];
    this.state.alerts.forEach(a => {
      const q = quotes[a.symbol];
      if (!q) return;
      if ((a.condition === 'above' && q.price >= a.price) || (a.condition === 'below' && q.price <= a.price)) {
        fired.push(a.id);
        this.emit('alert', `🔔 ${a.symbol} alert`, `Price ${a.condition === 'above' ? 'rose above' : 'fell below'} ${simulator.format(a.symbol, a.price)}${a.note ? ` — ${a.note}` : ''}`, 'warn');
      }
    });
    if (fired.length) this.state = { ...this.state, alerts: this.state.alerts.filter(a => !fired.includes(a.id)) };

    // 4. margin call / stop out
    const lvl = this.marginLevel();
    if (lvl < 50 && this.state.positions.length) {
      const worst = [...this.state.positions].sort((a, b) => a.pnl - b.pnl)[0];
      this.closePosition(worst.id, { reason: 'stop-out', price: worst.currentPrice });
    } else if (lvl < 100 && !this.state.marginCallActive) {
      this.state = { ...this.state, marginCallActive: true };
      this.emit('margin-call', 'MARGIN CALL', `Margin level ${lvl.toFixed(0)}% — positions will be closed automatically below 50%`, 'bad');
    } else if (lvl >= 100 && this.state.marginCallActive) {
      this.state = { ...this.state, marginCallActive: false };
    }

    this.pushCurve();
    if (Date.now() - this.lastSaveAt > 3000) { this.lastSaveAt = Date.now(); this.save(); }
    this.listeners.forEach(l => l());
  }
}

export const broker = new Broker();

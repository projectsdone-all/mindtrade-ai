// ─────────────────────────────────────────────────────────────────────────────
// Market Simulation Engine
//
// A realistic synthetic market:
//  • Stochastic volatility (vol clusters, calms down, spikes on news)
//  • Drifting trend regimes (markets trend, then range)
//  • Two-sided quotes (bid/ask) with spreads that widen on news
//  • A simulated clock that can be paused or sped up (market replay)
//  • 1-minute base candles aggregated into 1m / 5m / 15m / 1h / 4h
//  • Random macro / company news events that move prices
// ─────────────────────────────────────────────────────────────────────────────

export type AssetCategory = 'crypto' | 'forex' | 'stock' | 'commodity' | 'index';

export interface Asset {
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  open: number;       // price 24h ago (session reference)
  high: number;       // 24h high
  low: number;        // 24h low
  change: number;
  changePct: number;
  spread: number;     // typical spread in price units
  pip: number;        // pip / tick size
  digits: number;     // quote precision
  lotSize: number;    // contract size of 1.00 lot
  minLot: number;
  lotStep: number;
  maxLot: number;
  maxLeverage: number;
  commissionPerLot: number; // USD per 1.00 lot per side
  currency: string;
  icon: string;
  color: string;
  volatility: number; // daily volatility fraction
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel { price: number; size: number; total: number; }
export interface OrderBook { bids: OrderBookLevel[]; asks: OrderBookLevel[]; }

export interface Quote {
  price: number;   // mid
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  gap: boolean;    // true when this tick jumped (news) — stops may slip
}
export type Quotes = Record<string, Quote>;

export interface NewsEvent {
  id: string;
  time: number;
  symbol: string;
  headline: string;
  impact: 'bullish' | 'bearish';
  magnitude: number; // expected move, %
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h';
export const TIMEFRAMES: Record<Timeframe, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000,
};

export type PriceListener = (symbol: string, price: number, bid: number, ask: number) => void;
export type TickListener = (quotes: Quotes, simTime: number) => void;
export type NewsListener = (e: NewsEvent) => void;

const A = (a: Omit<Asset, 'open' | 'high' | 'low' | 'change' | 'changePct'>): Asset =>
  ({ ...a, open: a.price, high: a.price, low: a.price, change: 0, changePct: 0 });

const ASSETS: Asset[] = [
  A({ symbol: 'BTC/USD', name: 'Bitcoin',       category: 'crypto',    price: 105200,  spread: 18,     pip: 1,      digits: 2, lotSize: 1,      minLot: 0.01, lotStep: 0.01, maxLot: 20,  maxLeverage: 10,  commissionPerLot: 0,   currency: 'USD', icon: '₿', color: '#f7931a', volatility: 0.030 }),
  A({ symbol: 'ETH/USD', name: 'Ethereum',      category: 'crypto',    price: 2520,    spread: 1.2,    pip: 0.1,    digits: 2, lotSize: 1,      minLot: 0.1,  lotStep: 0.1,  maxLot: 500, maxLeverage: 10,  commissionPerLot: 0,   currency: 'USD', icon: 'Ξ', color: '#7b8cff', volatility: 0.036 }),
  A({ symbol: 'SOL/USD', name: 'Solana',        category: 'crypto',    price: 168.4,   spread: 0.12,   pip: 0.01,   digits: 2, lotSize: 1,      minLot: 1,    lotStep: 1,    maxLot: 5000, maxLeverage: 10, commissionPerLot: 0,   currency: 'USD', icon: '◎', color: '#14f195', volatility: 0.045 }),
  A({ symbol: 'EUR/USD', name: 'Euro / Dollar', category: 'forex',     price: 1.08920, spread: 0.00008, pip: 0.0001, digits: 5, lotSize: 100000, minLot: 0.01, lotStep: 0.01, maxLot: 50, maxLeverage: 500, commissionPerLot: 3.5, currency: 'USD', icon: '€', color: '#3b82f6', volatility: 0.0045 }),
  A({ symbol: 'GBP/USD', name: 'Pound / Dollar',category: 'forex',     price: 1.27380, spread: 0.00012, pip: 0.0001, digits: 5, lotSize: 100000, minLot: 0.01, lotStep: 0.01, maxLot: 50, maxLeverage: 500, commissionPerLot: 3.5, currency: 'USD', icon: '£', color: '#a78bfa', volatility: 0.0055 }),
  A({ symbol: 'AUD/USD', name: 'Aussie / Dollar',category: 'forex',    price: 0.66140, spread: 0.00010, pip: 0.0001, digits: 5, lotSize: 100000, minLot: 0.01, lotStep: 0.01, maxLot: 50, maxLeverage: 500, commissionPerLot: 3.5, currency: 'USD', icon: 'A$', color: '#22c55e', volatility: 0.0060 }),
  A({ symbol: 'AAPL',    name: 'Apple Inc.',    category: 'stock',     price: 211.45,  spread: 0.04,   pip: 0.01,   digits: 2, lotSize: 1,      minLot: 1,    lotStep: 1,    maxLot: 10000, maxLeverage: 5, commissionPerLot: 0.01, currency: 'USD', icon: '', color: '#94a3b8', volatility: 0.016 }),
  A({ symbol: 'TSLA',    name: 'Tesla Inc.',    category: 'stock',     price: 342.80,  spread: 0.08,   pip: 0.01,   digits: 2, lotSize: 1,      minLot: 1,    lotStep: 1,    maxLot: 10000, maxLeverage: 5, commissionPerLot: 0.01, currency: 'USD', icon: 'T', color: '#ef4444', volatility: 0.032 }),
  A({ symbol: 'NVDA',    name: 'NVIDIA Corp.',  category: 'stock',     price: 138.60,  spread: 0.04,   pip: 0.01,   digits: 2, lotSize: 1,      minLot: 1,    lotStep: 1,    maxLot: 10000, maxLeverage: 5, commissionPerLot: 0.01, currency: 'USD', icon: 'N', color: '#76b900', volatility: 0.030 }),
  A({ symbol: 'XAU/USD', name: 'Gold Spot',     category: 'commodity', price: 2384.50, spread: 0.25,   pip: 0.01,   digits: 2, lotSize: 100,    minLot: 0.01, lotStep: 0.01, maxLot: 20, maxLeverage: 100, commissionPerLot: 3,   currency: 'USD', icon: '◈', color: '#eab308', volatility: 0.009 }),
  A({ symbol: 'OIL/USD', name: 'Crude Oil WTI', category: 'commodity', price: 68.45,   spread: 0.03,   pip: 0.01,   digits: 2, lotSize: 1000,   minLot: 0.01, lotStep: 0.01, maxLot: 50, maxLeverage: 100, commissionPerLot: 3,   currency: 'USD', icon: '⬡', color: '#f97316', volatility: 0.020 }),
  A({ symbol: 'SPX500',  name: 'S&P 500 Index', category: 'index',     price: 5954.0,  spread: 0.5,    pip: 0.1,    digits: 1, lotSize: 1,      minLot: 0.1,  lotStep: 0.1,  maxLot: 100, maxLeverage: 20,  commissionPerLot: 0,   currency: 'USD', icon: 'S', color: '#10b981', volatility: 0.011 }),
  A({ symbol: 'NAS100',  name: 'Nasdaq 100',    category: 'index',     price: 21287.0, spread: 1.0,    pip: 0.1,    digits: 1, lotSize: 1,      minLot: 0.1,  lotStep: 0.1,  maxLot: 100, maxLeverage: 20,  commissionPerLot: 0,   currency: 'USD', icon: 'N', color: '#ec4899', volatility: 0.014 }),
];

// ── helpers ────────────────────────────────────────────────────────────────
function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const round = (v: number, d: number) => +v.toFixed(d);

const NEWS_TEMPLATES: Record<AssetCategory, { up: string[]; down: string[] }> = {
  crypto: {
    up: ['Spot ETF inflows hit record high for {n}', 'Major bank announces {n} custody service', '{n} network upgrade goes live without issues', 'Whale wallets accumulate {n} ahead of halving'],
    down: ['Exchange hack rattles {n} holders', 'Regulator signals tougher stance on {n}', 'Large {n} transfer to exchanges sparks selling', '{n} funding rates flip negative as longs unwind'],
  },
  forex: {
    up: ['{b} central bank hints at another rate hike', '{b} inflation comes in hotter than expected', '{b} PMI beats forecasts by a wide margin', 'US jobless claims jump — dollar slips vs {b}'],
    down: ['{b} central bank surprises with a rate cut', 'Weak {b} retail sales weigh on the currency', 'US payrolls crush estimates — dollar rallies', 'Political uncertainty hits the {b}'],
  },
  stock: {
    up: ['{n} beats earnings and raises guidance', 'Analysts upgrade {n} to Strong Buy', '{n} unveils new product line — pre-orders surge', '{n} announces $20B share buyback'],
    down: ['{n} misses revenue estimates', '{n} faces antitrust probe', 'Key supplier warns of {n} order cuts', '{n} CFO resigns unexpectedly'],
  },
  commodity: {
    up: ['Supply disruption lifts {n}', 'Central banks step up {n} purchases', 'Inventories draw down sharply — {n} jumps', 'Geopolitical tension boosts {n}'],
    down: ['Inventories build more than expected — {n} slides', 'Demand worries weigh on {n}', 'Strong dollar pressures {n}', 'Output increase announced — {n} drops'],
  },
  index: {
    up: ['Fed minutes lean dovish — {n} rallies', 'Tech earnings beat lifts {n}', 'Soft inflation print sends {n} higher', 'Rate-cut bets surge, {n} climbs'],
    down: ['Hot CPI print drags {n} lower', 'Bond yields spike, {n} sells off', 'Recession fears hit {n}', 'Hawkish Fed comments pressure {n}'],
  },
};

interface SimState {
  trend: number;      // drift, daily fraction
  volMult: number;    // stochastic volatility multiplier
  spreadMult: number; // spread widening
  jump: number;       // pending jump (fraction) applied gradually
  anchor: number;     // slow mean
}

class PriceSimulator {
  private assets = new Map<string, Asset>();
  private base = new Map<string, Candle[]>();          // 1-minute candles
  private state = new Map<string, SimState>();
  private quotes: Quotes = {};
  private priceListeners: PriceListener[] = [];
  private tickListeners: TickListener[] = [];
  private newsListeners: NewsListener[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private aggCache = new Map<string, { key: string; data: Candle[] }>();
  private nextNewsAt = 0;

  readonly TICK_MS = 500;
  simTime = Date.now();
  speed = 1;               // 0 = paused
  newsEnabled = true;
  news: NewsEvent[] = [];

  constructor() {
    ASSETS.forEach(a => {
      const asset = { ...a };
      this.assets.set(a.symbol, asset);
      this.state.set(a.symbol, { trend: 0, volMult: 1, spreadMult: 1, jump: 0, anchor: a.price });
      this.base.set(a.symbol, this.generateHistory(asset, 4 * 24 * 60));
      this.refreshSessionStats(asset);
      this.quotes[a.symbol] = this.makeQuote(asset, false);
    });
    this.scheduleNews();
  }

  // Walk BACKWARD from the current price so the last historical close equals
  // the live price — no artificial jump between history and live data.
  private generateHistory(asset: Asset, minutes: number): Candle[] {
    const out: Candle[] = [];
    const sigmaMin = asset.volatility / Math.sqrt(1440);
    const endMinute = Math.floor(this.simTime / 60_000) * 60_000;
    let close = asset.price;
    let vol = 1;
    let trend = 0;
    for (let i = 0; i < minutes; i++) {
      vol = Math.max(0.5, Math.min(2.2, vol + (1 - vol) * 0.03 + gauss() * 0.04));
      trend = trend * 0.995 + gauss() * sigmaMin * 0.002;
      // four sub-steps per minute so highs/lows look natural
      const path = [close];
      let p = close;
      for (let s = 0; s < 4; s++) {
        p = p / (1 + trend + gauss() * sigmaMin * vol * 0.5);
        path.push(p);
      }
      const open = p;
      out.push({
        time: endMinute - i * 60_000,
        open: round(open, asset.digits),
        high: round(Math.max(...path), asset.digits),
        low: round(Math.min(...path), asset.digits),
        close: round(close, asset.digits),
        volume: Math.round((40 + Math.random() * 160) * vol),
      });
      close = open;
    }
    return out.reverse();
  }

  private refreshSessionStats(asset: Asset) {
    const c = this.base.get(asset.symbol)!;
    const day = c.slice(-1440);
    asset.open = day[0].open;
    asset.high = Math.max(...day.map(x => x.high), asset.price);
    asset.low = Math.min(...day.map(x => x.low), asset.price);
    asset.change = round(asset.price - asset.open, asset.digits);
    asset.changePct = +((asset.change / asset.open) * 100).toFixed(2);
  }

  private makeQuote(asset: Asset, gap: boolean): Quote {
    const st = this.state.get(asset.symbol)!;
    const spread = Math.max(asset.pip * 0.1, asset.spread * st.spreadMult * (0.85 + Math.random() * 0.3));
    const bid = round(asset.price - spread / 2, asset.digits);
    const ask = round(asset.price + spread / 2, asset.digits);
    return {
      price: asset.price, bid, ask: Math.max(ask, bid + Math.pow(10, -asset.digits)),
      spread: round(ask - bid, asset.digits),
      change: asset.change, changePct: asset.changePct, high: asset.high, low: asset.low, gap,
    };
  }

  private step(asset: Asset, dtSec: number) {
    const st = this.state.get(asset.symbol)!;
    const dtDays = dtSec / 86400;
    const sigma = asset.volatility;

    // regime dynamics
    st.volMult = Math.max(0.4, Math.min(5, st.volMult + (1 - st.volMult) * Math.min(1, dtSec / 600) + gauss() * 0.04 * Math.sqrt(dtSec)));
    st.trend = st.trend * Math.exp(-dtSec / 1800) + gauss() * sigma * 0.35 * Math.sqrt(dtSec / 1800);
    st.spreadMult = 1 + (st.spreadMult - 1) * Math.exp(-dtSec / 45);
    st.anchor = st.anchor + (asset.price - st.anchor) * Math.min(1, dtSec / 7200);

    let ret = st.trend * dtDays + sigma * st.volMult * Math.sqrt(dtDays) * gauss();
    // weak mean reversion keeps long sessions sane
    ret += ((st.anchor - asset.price) / asset.price) * Math.min(1, dtSec / 3600) * 0.2;

    let gap = false;
    if (Math.abs(st.jump) > 1e-9) {
      const part = st.jump * Math.min(1, 0.35 + Math.random() * 0.3);
      ret += part;
      st.jump -= part;
      if (Math.abs(part) > sigma * 0.02) gap = true;
      if (Math.abs(st.jump) < 1e-6) st.jump = 0;
    }

    const prev = asset.price;
    asset.price = round(Math.max(asset.pip, prev * (1 + ret)), asset.digits);

    // candles
    const list = this.base.get(asset.symbol)!;
    const minute = Math.floor(this.simTime / 60_000) * 60_000;
    let last = list[list.length - 1];
    if (last.time !== minute) {
      // fill any skipped minutes when running fast
      while (last.time + 60_000 < minute) {
        const t = last.time + 60_000;
        list.push({ time: t, open: last.close, high: last.close, low: last.close, close: last.close, volume: 0 });
        last = list[list.length - 1];
      }
      list.push({ time: minute, open: prev, high: Math.max(prev, asset.price), low: Math.min(prev, asset.price), close: asset.price, volume: 0 });
      if (list.length > 6000) list.splice(0, list.length - 6000);
      last = list[list.length - 1];
    }
    last.close = asset.price;
    last.high = Math.max(last.high, asset.price);
    last.low = Math.min(last.low, asset.price);
    last.volume += Math.round((1 + Math.random() * 6) * st.volMult * Math.max(1, dtSec / 2));

    asset.high = Math.max(asset.high, asset.price);
    asset.low = Math.min(asset.low, asset.price);
    asset.change = round(asset.price - asset.open, asset.digits);
    asset.changePct = +((asset.change / asset.open) * 100).toFixed(2);
    return gap;
  }

  private scheduleNews() {
    // 3–7 simulated minutes between headlines
    this.nextNewsAt = this.simTime + (180 + Math.random() * 240) * 1000;
  }

  private fireNews(forced?: string) {
    const all = [...this.assets.values()];
    const asset = forced ? this.assets.get(forced)! : all[Math.floor(Math.random() * all.length)];
    const up = Math.random() > 0.5;
    const tpl = NEWS_TEMPLATES[asset.category][up ? 'up' : 'down'];
    const base = asset.symbol.split('/')[0];
    const ccyName: Record<string, string> = { EUR: 'ECB / Euro', GBP: 'BoE / Pound', AUD: 'RBA / Aussie' };
    const headline = tpl[Math.floor(Math.random() * tpl.length)]
      .replace('{n}', asset.name.replace(' Inc.', '').replace(' Corp.', ''))
      .replace('{b}', ccyName[base] ?? base);
    const magnitude = asset.volatility * (0.25 + Math.random() * 0.55);
    const st = this.state.get(asset.symbol)!;
    st.jump += up ? magnitude : -magnitude;
    st.volMult = Math.min(5, st.volMult * 2.4);
    st.spreadMult = 3.5;
    st.trend += (up ? 1 : -1) * asset.volatility * 1.5;
    const ev: NewsEvent = { id: crypto.randomUUID(), time: this.simTime, symbol: asset.symbol, headline, impact: up ? 'bullish' : 'bearish', magnitude: +(magnitude * 100).toFixed(2) };
    this.news = [ev, ...this.news].slice(0, 30);
    this.newsListeners.forEach(fn => fn(ev));
    this.scheduleNews();
  }

  private tick() {
    if (this.speed <= 0) return;
    const dtSec = (this.TICK_MS / 1000) * this.speed;
    this.simTime += this.TICK_MS * this.speed;
    if (this.newsEnabled && this.simTime >= this.nextNewsAt) this.fireNews();
    else if (!this.newsEnabled && this.simTime >= this.nextNewsAt) this.scheduleNews();

    this.assets.forEach(asset => {
      const gap = this.step(asset, dtSec);
      const q = this.makeQuote(asset, gap);
      this.quotes[asset.symbol] = q;
      this.priceListeners.forEach(fn => fn(asset.symbol, q.price, q.bid, q.ask));
    });
    this.quotes = { ...this.quotes };
    this.tickListeners.forEach(fn => fn(this.quotes, this.simTime));
  }

  // ── public API ────────────────────────────────────────────────────────────
  start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(), this.TICK_MS);
  }
  stop(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }
  setSpeed(s: number) { this.speed = s; }
  setNewsEnabled(on: boolean) { this.newsEnabled = on; if (on) this.scheduleNews(); }
  triggerNews(symbol?: string) { this.fireNews(symbol); }

  subscribe(listener: PriceListener): () => void {
    this.priceListeners.push(listener);
    return () => { this.priceListeners = this.priceListeners.filter(l => l !== listener); };
  }
  onTick(listener: TickListener): () => void {
    this.tickListeners.push(listener);
    return () => { this.tickListeners = this.tickListeners.filter(l => l !== listener); };
  }
  onNews(listener: NewsListener): () => void {
    this.newsListeners.push(listener);
    return () => { this.newsListeners = this.newsListeners.filter(l => l !== listener); };
  }

  getQuotes(): Quotes { return this.quotes; }
  getQuote(symbol: string): Quote | undefined { return this.quotes[symbol]; }
  getAssets(): Asset[] { return Array.from(this.assets.values()); }
  getAsset(symbol: string): Asset | undefined { return this.assets.get(symbol); }

  getCandles(symbol: string, tf: Timeframe = '1m'): Candle[] {
    const base = this.base.get(symbol) || [];
    if (tf === '1m' || !base.length) return base;
    const ms = TIMEFRAMES[tf];
    const last = base[base.length - 1];
    const key = `${base.length}:${base[0].time}:${last.time}`;
    const cacheKey = `${symbol}|${tf}`;
    const cached = this.aggCache.get(cacheKey);
    let out: Candle[];
    if (cached && cached.key === key) {
      out = cached.data;
    } else {
      out = [];
      for (const c of base.slice(0, -1)) {
        const t = Math.floor(c.time / ms) * ms;
        const cur = out[out.length - 1];
        if (cur && cur.time === t) {
          cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low);
          cur.close = c.close; cur.volume += c.volume;
        } else out.push({ ...c, time: t });
      }
      this.aggCache.set(cacheKey, { key, data: out });
    }
    // merge the live (still forming) 1m candle on top without mutating cache
    const res = out.map(c => c);
    const t = Math.floor(last.time / ms) * ms;
    const tail = res[res.length - 1];
    if (tail && tail.time === t) {
      res[res.length - 1] = { ...tail, high: Math.max(tail.high, last.high), low: Math.min(tail.low, last.low), close: last.close, volume: tail.volume + last.volume };
    } else res.push({ ...last, time: t });
    return res;
  }

  /** Average True Range on 1m candles × sqrt(minutes) — used for "smart" stop suggestions */
  getATR(symbol: string, tf: Timeframe = '5m', period = 14): number {
    const c = this.getCandles(symbol, tf).slice(-(period + 1));
    if (c.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < c.length; i++) {
      sum += Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close));
    }
    return sum / (c.length - 1);
  }

  getOrderBook(symbol: string): OrderBook {
    const asset = this.assets.get(symbol);
    const q = this.quotes[symbol];
    if (!asset || !q) return { bids: [], asks: [] };
    const st = this.state.get(symbol)!;
    const step = Math.max(asset.pip, asset.spread * 0.6);
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bt = 0, at = 0;
    // order-flow imbalance follows the current trend
    const skew = Math.max(-0.6, Math.min(0.6, st.trend / (asset.volatility * 0.5)));
    for (let i = 0; i < 12; i++) {
      const bs = +((0.4 + Math.random() * 4) * (1 + skew) * (1 + i * 0.12)).toFixed(2);
      const as = +((0.4 + Math.random() * 4) * (1 - skew) * (1 + i * 0.12)).toFixed(2);
      bt += bs; at += as;
      bids.push({ price: round(q.bid - step * i, asset.digits), size: bs, total: +bt.toFixed(2) });
      asks.push({ price: round(q.ask + step * i, asset.digits), size: as, total: +at.toFixed(2) });
    }
    return { bids, asks };
  }

  format(symbol: string, v: number | undefined): string {
    if (v === undefined || v === null || isNaN(v)) return '—';
    const d = this.assets.get(symbol)?.digits ?? 2;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
}

export const simulator = new PriceSimulator();
export { ASSETS };
export const digitsOf = (symbol: string) => simulator.getAsset(symbol)?.digits ?? 2;
export const fmtPrice = (symbol: string, v: number | undefined) => simulator.format(symbol, v);

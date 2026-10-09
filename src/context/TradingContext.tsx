import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useSyncExternalStore, useMemo } from 'react';
import { simulator, type Quotes, type NewsEvent } from '../engine/simulator';
import {
  broker, type Position, type Trade, type PendingOrder, type PriceAlert, type Settings, type BrokerEvent,
  type OrderRequest, type OrderResult, type EquityPoint, type Direction,
} from '../engine/broker';
import {
  computeEmotionScores, computePsychScore, getDominantEmotion, generateWarnings, generateInsights,
  generateCoachMessages, generateJournalEntry, computeTraderDNA,
  type EmotionScores, type EmotionSnapshot, type DNAProfile,
} from '../engine/emotionEngine';
import { computePredictions, type PredictionResult } from '../engine/predictor';

export type { Position, Trade, PendingOrder, PriceAlert, Settings, BrokerEvent } from '../engine/broker';

export interface JournalEntry {
  id: string;
  tradeId: string;
  timestamp: number;
  content: string;
  pnl: number;
  symbol: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (trades: Trade[], scores: EmotionScores) => boolean;
  unlocked: boolean;
  progress: number;
  target: number;
  reward: string;
}

export interface Prices {
  [symbol: string]: { price: number; bid: number; ask: number; spread: number; change: number; changePct: number; high: number; low: number };
}

export type Toast = BrokerEvent;

interface TradingContextType {
  // account
  balance: number;
  equity: number;
  freeMargin: number;
  marginUsed: number;
  marginLevel: number;
  dailyPnL: number;
  startingBalance: number;
  // market
  prices: Prices;
  selectedSymbol: string;
  setSelectedSymbol: (s: string) => void;
  speed: number;
  setSpeed: (s: number) => void;
  newsEnabled: boolean;
  setNewsEnabled: (on: boolean) => void;
  news: NewsEvent[];
  triggerNews: () => void;
  // trading
  positions: Position[];
  orders: PendingOrder[];
  trades: Trade[];
  alerts: PriceAlert[];
  equityCurve: EquityPoint[];
  openTrade: (symbol: string, direction: Direction, size: number, sl?: number, tp?: number) => OrderResult;
  placeOrder: (req: Omit<OrderRequest, 'emotion'>, overrideRules?: boolean) => OrderResult;
  closeTrade: (positionId: string, volume?: number) => OrderResult;
  closeAll: (filter?: 'all' | 'profit' | 'loss') => number;
  modifyPosition: typeof broker.modifyPosition;
  breakEven: (id: string) => OrderResult;
  cancelOrder: (id: string) => void;
  addAlert: (symbol: string, price: number, note?: string) => void;
  removeAlert: (id: string) => void;
  ruleCheck: typeof broker.ruleCheck;
  // settings / discipline
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  resetAccount: (startingBalance?: number) => void;
  cooldownUntil: number;
  endCooldown: () => void;
  ruleOverrides: number;
  todaysTrades: number;
  // notifications
  toasts: Toast[];
  dismissToast: (id: string) => void;
  // psychology
  emotionScores: EmotionScores;
  psychScore: number;
  dominantEmotion: string;
  warnings: string[];
  insights: string[];
  emotionHistory: EmotionSnapshot[];
  coachMessages: string[];
  dnaProfile: DNAProfile;
  predictions: PredictionResult;
  journalEntries: JournalEntry[];
  addJournalNote: (tradeId: string, note: string) => void;
  challenges: Challenge[];
  recentWins: number;
  recentLosses: number;
  consecutiveLosses: number;
  winRate: number;
  totalPnL: number;
}

const DEFAULT_EMOTIONS: EmotionScores = { fear: 0, greed: 0, fomo: 0, discipline: 0, stress: 0, confidence: 0, patience: 0, revenge: 0 };

// ── Wire the market feed to the broker exactly once (outside React, so
//    StrictMode / re-renders can never double-execute fills) ─────────────────
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  simulator.onTick(q => broker.onQuotes(q));
  simulator.start();
}

const TradingContext = createContext<TradingContextType | null>(null);
const STORAGE_KEY = 'mindtrade_psych_v2';

function loadPsych() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as { journalEntries: JournalEntry[]; emotionHistory: EmotionSnapshot[] } : null;
  } catch { return null; }
}

const CHALLENGE_DEFS: Omit<Challenge, 'unlocked' | 'progress'>[] = [
  { id: 'no-revenge', name: 'No Revenge', description: 'Complete 10 trades without revenge trading', icon: '🧘', condition: (t, s) => s.revenge < 20 && t.length >= 10, target: 10, reward: 'Calm Trader Badge' },
  { id: 'discipline-master', name: 'Discipline Master', description: 'Maintain discipline score above 75 for 20 trades', icon: '🎯', condition: (t, s) => s.discipline > 75 && t.length >= 20, target: 20, reward: 'Iron Discipline Badge' },
  { id: 'consistency', name: 'Consistency King', description: 'Win 5 trades in a row', icon: '👑', condition: (t) => streakOf(t, 1) >= 5, target: 5, reward: 'Win Streak Badge' },
  { id: 'risk-control', name: 'Risk Controller', description: 'Set stop loss on 10 consecutive trades', icon: '🛡️', condition: (t) => t.slice(-10).length === 10 && t.slice(-10).every(x => x.stopLoss), target: 10, reward: 'Guardian Badge' },
  { id: 'patience', name: 'The Waiting Game', description: 'Keep patience above 70 across 5+ trades', icon: '⏳', condition: (t, s) => s.patience > 70 && t.length >= 5, target: 15, reward: 'Zen Trader Badge' },
  { id: 'profit-streak', name: 'Profit Streak', description: 'Earn $500 net profit', icon: '💰', condition: (t) => t.reduce((a, x) => a + (x.pnl || 0), 0) >= 500, target: 500, reward: 'Money Maker Badge' },
  { id: 'two-r', name: 'Let Winners Run', description: 'Close 3 trades at +2R or better', icon: '🏹', condition: (t) => t.filter(x => (x.rMultiple ?? 0) >= 2).length >= 3, target: 3, reward: 'Sniper Badge' },
  { id: 'honest', name: 'Honest Trader', description: 'Tag 10 trades with your real intent & mood', icon: '🪞', condition: (t) => t.filter(x => x.intent && x.mood).length >= 10, target: 10, reward: 'Self-Aware Badge' },
];

function streakOf(trs: Trade[], sign: 1 | -1) {
  let n = 0;
  for (let i = trs.length - 1; i >= 0; i--) { if (Math.sign(trs[i].pnl ?? 0) === sign) n++; else break; }
  return n;
}

function computeProgress(id: string, trs: Trade[], scores: EmotionScores): number {
  switch (id) {
    case 'no-revenge': return trs.length;
    case 'discipline-master': return trs.length;
    case 'consistency': return streakOf(trs, 1);
    case 'risk-control': { let n = 0; for (let i = trs.length - 1; i >= 0 && trs[i].stopLoss; i--) n++; return n; }
    case 'patience': return Math.floor(scores.patience * 0.15);
    case 'profit-streak': return Math.max(0, Math.floor(trs.reduce((s, t) => s + (t.pnl || 0), 0)));
    case 'two-r': return trs.filter(x => (x.rMultiple ?? 0) >= 2).length;
    case 'honest': return trs.filter(x => x.intent && x.mood).length;
    default: return 0;
  }
}

function toPrices(q: Quotes): Prices {
  const out: Prices = {};
  for (const k in q) out[k] = q[k];
  return out;
}

export function TradingProvider({ children }: { children: React.ReactNode }) {
  wire();
  const bs = useSyncExternalStore(broker.subscribe, broker.getState);
  const [quotes, setQuotes] = useState<Quotes>(() => simulator.getQuotes());
  const [selectedSymbol, setSelectedSymbol] = useState(() => localStorage.getItem('mindtrade_symbol') || 'BTC/USD');
  const [speed, setSpeedState] = useState(simulator.speed);
  const [newsEnabled, setNewsState] = useState(simulator.newsEnabled);
  const [news, setNews] = useState<NewsEvent[]>(simulator.news);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saved] = useState(loadPsych);
  const [emotionScores, setEmotionScores] = useState<EmotionScores>(DEFAULT_EMOTIONS);
  const [emotionHistory, setEmotionHistory] = useState<EmotionSnapshot[]>(saved?.emotionHistory ?? []);
  const [notes, setNotes] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('mindtrade_notes') || '{}'); } catch { return {}; } });
  const [challenges, setChallenges] = useState<Challenge[]>(CHALLENGE_DEFS.map(c => ({ ...c, unlocked: false, progress: 0 })));

  const stateRef = useRef(bs);
  const emotionRef = useRef(emotionScores);
  useEffect(() => { stateRef.current = bs; }, [bs]);
  useEffect(() => { emotionRef.current = emotionScores; }, [emotionScores]);
  const revengeFired = useRef(false);

  useEffect(() => { localStorage.setItem('mindtrade_symbol', selectedSymbol); }, [selectedSymbol]);
  useEffect(() => { localStorage.setItem('mindtrade_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ emotionHistory: emotionHistory.slice(-200) })); } catch { /* full */ } }, [emotionHistory]);

  // market feed → UI (throttled to the simulator tick)
  useEffect(() => simulator.onTick(q => setQuotes(q)), []);
  useEffect(() => simulator.onNews(e => {
    setNews([...simulator.news]);
    setToasts(t => [...t.slice(-2), { id: e.id, kind: 'news', title: `📰 ${e.symbol} — ${e.impact === 'bullish' ? 'Bullish' : 'Bearish'} news`, message: e.headline, time: Date.now(), tone: e.impact === 'bullish' ? 'good' : 'bad' }]);
  }), []);
  useEffect(() => broker.onEvent(e => setToasts(t => [...t.slice(-2), e])), []);
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts(t => t.slice(1)), 4000);
    return () => clearTimeout(id);
  }, [toasts]);

  // journal writer
  useEffect(() => {
    broker.setJournalWriter(t => generateJournalEntry(t, t.emotionAtOpen ?? DEFAULT_EMOTIONS, t.emotionAtClose ?? emotionRef.current));
  }, []);

  // emotion engine — every 3s
  useEffect(() => {
    const tick = () => {
      const s = stateRef.current;
      const eq = broker.equity(s);
      const recentLosses = s.trades.slice(-5).filter(t => (t.pnl ?? 0) < 0).length;
      const recentWins = s.trades.slice(-5).filter(t => (t.pnl ?? 0) > 0).length;
      const ns = computeEmotionScores(s.trades, s.positions, s.settings.startingBalance, eq, recentLosses, recentWins);
      setEmotionScores(ns);
      broker.setCurrentEmotion(ns);
      if (s.trades.length || s.positions.length) {
        setEmotionHistory(prev => [...prev.slice(-150), {
          timestamp: Date.now(), scores: ns, dominantEmotion: getDominantEmotion(ns), psychScore: computePsychScore(ns),
          warnings: generateWarnings(ns, s.trades), insights: generateInsights(ns, s.trades),
        }]);
      }
      setChallenges(prev => prev.map(ch => ({ ...ch, unlocked: ch.condition(s.trades, ns), progress: Math.min(ch.target, computeProgress(ch.id, s.trades, ns)) })));
      // revenge-trading detector feeds the tilt guard
      if (s.settings.tiltGuard && ns.revenge >= 75 && Date.now() > s.cooldownUntil && s.positions.length > 0 && !revengeFired.current) {
        revengeFired.current = true;
        broker.triggerCooldown('Revenge-trading pattern detected');
      }
      if (ns.revenge < 50) revengeFired.current = false;
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  // ── actions ──────────────────────────────────────────────────────────────
  const placeOrder = useCallback((req: Omit<OrderRequest, 'emotion'>, override = false) => broker.placeOrder({ ...req, emotion: emotionRef.current }, override), []);
  const openTrade = useCallback((symbol: string, direction: Direction, size: number, sl?: number, tp?: number) =>
    broker.placeOrder({ symbol, direction, size, kind: 'market', stopLoss: sl, takeProfit: tp, emotion: emotionRef.current }), []);
  const closeTrade = useCallback((id: string, volume?: number) => broker.closePosition(id, { volume, emotion: emotionRef.current }), []);
  const setSpeed = useCallback((s: number) => { simulator.setSpeed(s); setSpeedState(s); }, []);
  const setNewsEnabled = useCallback((on: boolean) => { simulator.setNewsEnabled(on); setNewsState(on); }, []);
  const addJournalNote = useCallback((tradeId: string, note: string) => setNotes(n => ({ ...n, [tradeId]: note })), []);

  // ── derived ──────────────────────────────────────────────────────────────
  const { trades, positions } = bs;
  const equity = broker.equity(bs);
  const marginUsed = broker.marginUsed(bs);
  const balance = bs.balance;
  const recentLosses = trades.slice(-5).filter(t => (t.pnl ?? 0) < 0).length;
  const recentWins = trades.slice(-5).filter(t => (t.pnl ?? 0) > 0).length;
  const consecutiveLosses = streakOf(trades, -1);
  const winRate = trades.length ? trades.filter(t => (t.pnl ?? 0) > 0).length / trades.length * 100 : 0;
  const totalPnL = equity - bs.settings.startingBalance;
  const journalEntries: JournalEntry[] = useMemo(() => [...trades].reverse().filter(t => t.journalEntry).map(t => ({
    id: `j-${t.id}`, tradeId: t.id, timestamp: t.closeTime ?? t.openTime,
    content: t.journalEntry! + (notes[t.id] ? `\n\n✍️ My note: ${notes[t.id]}` : ''), pnl: t.pnl ?? 0, symbol: t.symbol,
  })), [trades, notes]);

  const value: TradingContextType = {
    balance, equity, freeMargin: equity - marginUsed, marginUsed, marginLevel: broker.marginLevel(bs),
    dailyPnL: broker.todaysPnl(bs), startingBalance: bs.settings.startingBalance,
    prices: toPrices(quotes), selectedSymbol, setSelectedSymbol, speed, setSpeed, newsEnabled, setNewsEnabled, news,
    triggerNews: () => simulator.triggerNews(selectedSymbol),
    positions, orders: bs.orders, trades, alerts: bs.alerts, equityCurve: bs.equityCurve,
    openTrade, placeOrder, closeTrade,
    closeAll: (f = 'all') => broker.closeAll(f),
    modifyPosition: (id, p) => broker.modifyPosition(id, p),
    breakEven: id => broker.breakEven(id),
    cancelOrder: id => broker.cancelOrder(id),
    addAlert: (s, p, n) => broker.addAlert(s, p, n),
    removeAlert: id => broker.removeAlert(id),
    ruleCheck: r => broker.ruleCheck(r),
    settings: bs.settings, updateSettings: p => broker.updateSettings(p),
    resetAccount: sb => { broker.resetAccount(sb); setEmotionHistory([]); setNotes({}); },
    cooldownUntil: bs.cooldownUntil, endCooldown: () => broker.endCooldown(), ruleOverrides: bs.ruleOverrides,
    todaysTrades: broker.todaysTrades(bs),
    toasts, dismissToast: id => setToasts(t => t.filter(x => x.id !== id)),
    emotionScores, psychScore: computePsychScore(emotionScores), dominantEmotion: getDominantEmotion(emotionScores),
    warnings: generateWarnings(emotionScores, trades), insights: generateInsights(emotionScores, trades),
    emotionHistory, coachMessages: generateCoachMessages(emotionScores, trades, positions),
    dnaProfile: computeTraderDNA(emotionScores, trades),
    predictions: computePredictions(emotionScores, bs.settings.startingBalance, equity, consecutiveLosses, positions.length, trades.length),
    journalEntries, addJournalNote, challenges,
    recentWins, recentLosses, consecutiveLosses, winRate, totalPnL,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
}

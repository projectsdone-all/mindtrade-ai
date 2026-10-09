import type { Trade, Position } from '../context/TradingContext';

export interface EmotionScores {
  fear: number;        // 0-100
  greed: number;       // 0-100
  fomo: number;        // 0-100
  discipline: number;  // 0-100
  stress: number;      // 0-100
  confidence: number;  // 0-100
  patience: number;    // 0-100
  revenge: number;     // 0-100
}

export interface EmotionSnapshot {
  timestamp: number;
  scores: EmotionScores;
  dominantEmotion: string;
  psychScore: number;
  warnings: string[];
  insights: string[];
}

export type TraderDNA =
  | 'The Disciplined Professional'
  | 'The Risk Hunter'
  | 'The Emotional Trader'
  | 'The Conservative Analyst'
  | 'The FOMO Chaser'
  | 'The Revenge Trader'
  | 'The Overconfident Gambler'
  | 'The Patient Strategist';

export interface DNAProfile {
  archetype: TraderDNA;
  description: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  color: string;
  icon: string;
}

export function computeEmotionScores(
  trades: Trade[],
  positions: Position[],
  balance: number,
  equity: number,
  recentLosses: number,
  recentWins: number,
): EmotionScores {
  // No activity yet — return neutral zeros so UI can show empty state
  if (trades.length === 0 && positions.length === 0) {
    return { fear: 0, greed: 0, fomo: 0, discipline: 0, stress: 0, confidence: 0, patience: 0, revenge: 0 };
  }

  const now = Date.now();
  const recent = trades.filter(t => now - t.closeTime! < 30 * 60 * 1000); // last 30 min

  // FEAR: closing winners early, tight SLs, hesitation
  let fear = 0;
  const earlyClosedWinners = trades.filter(t => t.pnl && t.pnl > 0 && t.pnl < (t.entryPrice * 0.003 * t.size)).length;
  fear += Math.min(30, earlyClosedWinners * 5);
  if (recentLosses >= 3) fear += 20;
  if (equity < balance * 0.9) fear += 15;
  fear = Math.min(100, fear);

  // GREED: large positions, no SL, moving SL wider
  let greed = 0;
  const largePosCount = positions.filter(p => p.size > 2).length;
  greed += Math.min(35, largePosCount * 12);
  const noSLPositions = positions.filter(p => !p.stopLoss).length;
  greed += Math.min(30, noSLPositions * 10);
  if (recentWins >= 3) greed += 15;
  greed = Math.min(100, greed);

  // FOMO: rapid entries right after price moves, high trade frequency
  let fomo = 0;
  if (recent.length > 5) fomo += 30;
  if (recent.length > 8) fomo += 20;
  const timeBetweenTrades = computeAvgTimeBetweenTrades(trades);
  if (timeBetweenTrades < 2 * 60 * 1000) fomo += 25; // less than 2 min
  fomo = Math.min(100, fomo);

  // REVENGE: trade opened within 3 minutes of a loss
  let revenge = 0;
  const lossesToCheck = trades.filter(t => t.pnl && t.pnl < 0).slice(-5);
  lossesToCheck.forEach(loss => {
    const nextTrade = trades.find(t => t.openTime > (loss.closeTime || 0) && t.openTime - (loss.closeTime || 0) < 3 * 60 * 1000);
    if (nextTrade) {
      revenge += 20;
    }
  });
  // Bigger position after loss = revenge. Only look at the recent trading
  // window — otherwise a single oversized re-entry years ago in the session
  // would keep inflating the revenge score forever, long after the trader
  // has calmed down.
  const recentForRevenge = trades.slice(-10);
  for (let i = 1; i < recentForRevenge.length; i++) {
    const prev = recentForRevenge[i - 1];
    const curr = recentForRevenge[i];
    if (prev.pnl && prev.pnl < 0 && curr.size > prev.size * 1.5) {
      revenge += 15;
    }
  }
  revenge = Math.min(100, revenge);

  // DISCIPLINE: following plan (SL/TP set, consistent size)
  let discipline = trades.length > 0 ? 80 : 0;
  const slMissingCount = trades.slice(-10).filter(t => !t.stopLoss).length;
  discipline -= slMissingCount * 8;
  const tpMissingCount = trades.slice(-10).filter(t => !t.takeProfit).length;
  discipline -= tpMissingCount * 4;
  discipline -= Math.min(30, revenge * 0.3);
  discipline -= Math.min(20, fomo * 0.2);
  discipline = Math.max(0, Math.min(100, discipline));

  // STRESS: drawdown, loss streak, high frequency
  let stress = 0;
  const drawdown = (balance - equity) / balance * 100;
  stress += Math.min(35, drawdown * 3.5);
  stress += Math.min(25, recentLosses * 8);
  if (positions.length > 5) stress += 20;
  stress = Math.min(100, stress);

  // CONFIDENCE: based on win rate and streak
  const winCount = trades.filter(t => t.pnl && t.pnl > 0).length;
  const winRate = trades.length > 0 ? winCount / trades.length : 0.5;
  let confidence = 30 + winRate * 60;
  if (recentWins >= 3) confidence += 15;
  if (recentLosses >= 3) confidence -= 20;
  confidence = Math.max(5, Math.min(100, confidence));

  // PATIENCE: avg trade duration, waiting for entries
  let patience = trades.length > 0 ? 60 : 0;
  const avgDuration = computeAvgTradeDuration(trades);
  if (avgDuration < 5 * 60 * 1000) patience -= 30; // less than 5 min average
  if (avgDuration > 30 * 60 * 1000) patience += 20;
  if (timeBetweenTrades < 60 * 1000) patience -= 25;
  patience = Math.max(0, Math.min(100, patience));

  return { fear, greed, fomo, discipline, stress, confidence, patience, revenge };
}

function computeAvgTimeBetweenTrades(trades: Trade[]): number {
  if (trades.length < 2) return 60 * 60 * 1000; // 1 hour default
  const times: number[] = [];
  for (let i = 1; i < trades.length; i++) {
    times.push(trades[i].openTime - trades[i - 1].openTime);
  }
  return times.reduce((a, b) => a + b, 0) / times.length;
}

function computeAvgTradeDuration(trades: Trade[]): number {
  const closed = trades.filter(t => t.closeTime);
  if (closed.length === 0) return 30 * 60 * 1000;
  const durations = closed.map(t => (t.closeTime! - t.openTime));
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export function computePsychScore(scores: EmotionScores): number {
  const disciplineWeight = 0.3;
  const patienceWeight = 0.2;
  const fearPenalty = scores.fear * 0.1;
  const greedPenalty = scores.greed * 0.1;
  const fomoPenalty = scores.fomo * 0.1;
  const revengePenalty = scores.revenge * 0.15;
  const stressPenalty = scores.stress * 0.05;

  const base =
    scores.discipline * disciplineWeight +
    scores.patience * patienceWeight +
    scores.confidence * 0.15;

  const penalty = fearPenalty + greedPenalty + fomoPenalty + revengePenalty + stressPenalty;

  return Math.max(0, Math.min(100, base - penalty * 0.5));
}

export function getDominantEmotion(scores: EmotionScores): string {
  const map: Record<string, number> = {
    Fear: scores.fear,
    Greed: scores.greed,
    FOMO: scores.fomo,
    Stress: scores.stress,
    'Revenge Risk': scores.revenge,
  };
  let max = 0;
  let dominant = 'Balanced';
  for (const [key, val] of Object.entries(map)) {
    if (val > max && val > 40) {
      max = val;
      dominant = key;
    }
  }
  return dominant;
}

export function generateWarnings(scores: EmotionScores, trades: Trade[]): string[] {
  const warnings: string[] = [];

  if (scores.revenge > 60)
    warnings.push('⚠️ High revenge trading risk detected. Take a 15-minute break before your next trade.');
  if (scores.greed > 70)
    warnings.push('⚠️ Greed score is elevated. Consider reducing position size to protect your capital.');
  if (scores.fear > 70)
    warnings.push('⚠️ Fear is affecting your exits. You may be closing winners too early.');
  if (scores.fomo > 65)
    warnings.push('⚠️ FOMO detected. You are trading too frequently. Slow down and wait for setups.');
  if (scores.stress > 75)
    warnings.push('⚠️ Stress levels are very high. A mental reset may improve performance.');
  if (scores.discipline < 40)
    warnings.push('⚠️ Discipline score is low. Set stop-loss and take-profit on every trade.');

  // Genuinely consecutive losses — not just "3 losses somewhere in history",
  // which is what filtering-then-slicing the loss list actually checks (it
  // stays true forever once 3 losses have ever happened, wins in between
  // included).
  if (computeCurrentStreak(trades, false) >= 3)
    warnings.push('⚠️ 3+ consecutive losses. Consider stopping for the day to avoid further damage.');

  return warnings;
}

export function generateInsights(scores: EmotionScores, trades: Trade[]): string[] {
  const insights: string[] = [];

  if (scores.discipline > 75)
    insights.push('✅ Your discipline score is strong. Keep following your trading plan.');
  if (scores.patience > 70)
    insights.push('✅ Excellent patience. Waiting for quality setups is a professional habit.');
  if (scores.confidence > 65 && scores.discipline > 60)
    insights.push('✅ Confident yet disciplined — this combination produces consistent results.');

  const winners = trades.filter(t => t.pnl && t.pnl > 0).length;
  const losers = trades.filter(t => t.pnl && t.pnl < 0).length;
  if (winners > losers && trades.length > 5)
    insights.push(`✅ Win rate: ${Math.round(winners / trades.length * 100)}%. Above average — keep it up.`);

  return insights;
}

export function computeTraderDNA(scores: EmotionScores, trades: Trade[]): DNAProfile {
  if (scores.discipline > 75 && scores.patience > 65 && scores.revenge < 30) {
    return {
      archetype: 'The Disciplined Professional',
      description: 'You follow rules, manage risk precisely, and trade with calm objectivity.',
      strengths: ['Consistent risk management', 'Emotional control', 'Follows the plan'],
      weaknesses: ['May miss big momentum trades', 'Can be overly cautious'],
      recommendation: 'Start scaling up position sizes systematically. Your psychology supports it.',
      color: '#10b981',
      icon: '🎯',
    };
  }

  if (scores.revenge > 65) {
    return {
      archetype: 'The Revenge Trader',
      description: 'You tend to trade impulsively after losses, trying to "win back" your money quickly.',
      strengths: ['High motivation', 'Persistent'],
      weaknesses: ['Emotional decisions after losses', 'Rapid account drawdown risk'],
      recommendation: 'Implement a mandatory 20-minute cooldown after every losing trade.',
      color: '#ec4899',
      icon: '🔥',
    };
  }

  if (scores.fomo > 65) {
    return {
      archetype: 'The FOMO Chaser',
      description: 'You frequently chase price, entering positions out of fear of missing moves.',
      strengths: ['Active and engaged', 'Catches some momentum moves'],
      weaknesses: ['Enters late in moves', 'High frequency increases costs'],
      recommendation: 'Set an entry rule: only trade when price comes to your level, never chase.',
      color: '#8b5cf6',
      icon: '⚡',
    };
  }

  if (scores.greed > 70) {
    return {
      archetype: 'The Risk Hunter',
      description: 'You are drawn to high-risk, high-reward scenarios and often over-leverage.',
      strengths: ['Aggressive profit potential', 'Not afraid to act'],
      weaknesses: ['Over-leveraged positions', 'No stop losses', 'Account blow-up risk'],
      recommendation: 'Cap risk at 1% per trade. The best traders risk small and compound returns.',
      color: '#f59e0b',
      icon: '🎲',
    };
  }

  if (scores.fear > 65) {
    return {
      archetype: 'The Conservative Analyst',
      description: 'You are cautious and analytical, but fear often prevents you from acting on good setups.',
      strengths: ['Good at analysis', 'Avoids reckless trades', 'Protects capital'],
      weaknesses: ['Analysis paralysis', 'Misses breakout opportunities', 'Exits too early'],
      recommendation: 'Trust your analysis. Set a rule: if all criteria are met, you must take the trade.',
      color: '#3b82f6',
      icon: '🔬',
    };
  }

  if (scores.discipline < 40) {
    return {
      archetype: 'The Emotional Trader',
      description: 'Your trading is heavily influenced by emotions, leading to inconsistent results.',
      strengths: ['High enthusiasm', 'Learns quickly from mistakes'],
      weaknesses: ['No consistent system', 'Emotional entries and exits', 'Inconsistent sizing'],
      recommendation: 'Write a trading plan today. Define entry, exit, and risk rules before opening any position.',
      color: '#ef4444',
      icon: '🌪️',
    };
  }

  const winRate = trades.length > 0 ? trades.filter(t => t.pnl && t.pnl > 0).length / trades.length : 0.5;
  if (winRate > 0.6 && scores.patience > 60) {
    return {
      archetype: 'The Patient Strategist',
      description: 'You wait for high-probability setups and execute with precision and calm.',
      strengths: ['High win rate', 'Quality over quantity', 'Consistent execution'],
      weaknesses: ['May under-trade in ranging markets'],
      recommendation: 'Maintain your current approach and focus on improving risk-to-reward ratios.',
      color: '#06b6d4',
      icon: '🧘',
    };
  }

  return {
    archetype: 'The Emotional Trader',
    description: 'You are still developing your trading psychology and finding your edge.',
    strengths: ['Still learning', 'Open to growth'],
    weaknesses: ['Inconsistent psychology', 'Needs a structured system'],
    recommendation: 'Start with the Academy modules on Trading Psychology and Risk Management.',
    color: '#f97316',
    icon: '📈',
  };
}

export function generateCoachMessages(scores: EmotionScores, trades: Trade[], positions: Position[]): string[] {
  const messages: string[] = [];

  if (trades.length === 0) {
    messages.push("Welcome to MindTrade AI! I'm your AI Trading Coach. Start by placing a trade and I'll begin analyzing your psychological patterns in real-time.");
    return messages;
  }

  if (scores.revenge > 60) {
    const recentLoss = trades.filter(t => t.pnl && t.pnl < 0).slice(-1)[0];
    if (recentLoss) {
      messages.push(`You opened a new position shortly after a $${Math.abs(recentLoss.pnl!).toFixed(2)} loss. This pattern is consistent with revenge trading. The market doesn't owe you a recovery.`);
    }
  }

  if (scores.greed > 65 && positions.length > 0) {
    const bigPos = positions.find(p => !p.stopLoss);
    if (bigPos) {
      messages.push(`Your position in ${bigPos.symbol} has no stop-loss. Professional traders always define their maximum risk before entering any position.`);
    }
  }

  if (scores.fomo > 60) {
    messages.push(`You've placed ${trades.length} trades recently with very little time between them. Research shows win rates drop significantly when trade frequency exceeds your strategy's optimal cadence.`);
  }

  if (scores.discipline > 80) {
    messages.push("Excellent! You're trading with strong discipline right now. Your stop-loss adherence and position sizing are within optimal ranges. This is exactly what professional trading looks like.");
  }

  const winStreak = computeCurrentStreak(trades, true);
  if (winStreak >= 3) {
    messages.push(`You're on a ${winStreak}-trade win streak. Great work! Be cautious of overconfidence — maintain your risk management rules even when on a hot streak.`);
  }

  const lossStreak = computeCurrentStreak(trades, false);
  if (lossStreak >= 3) {
    messages.push(`You've experienced ${lossStreak} consecutive losses. Consider reducing position size by 50% or stopping for the session. Protecting capital is your #1 priority.`);
  }

  if (messages.length === 0) {
    messages.push("Keep monitoring your emotional state. Your psychology score is being tracked in real-time. Make consistent, rule-based decisions.");
  }

  return messages;
}

function computeCurrentStreak(trades: Trade[], wins: boolean): number {
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const isWin = trades[i].pnl !== undefined && trades[i].pnl! > 0;
    if (isWin === wins) streak++;
    else break;
  }
  return streak;
}

export function generateJournalEntry(trade: Trade, scoresAtOpen: EmotionScores, scoresAtClose: EmotionScores): string {
  const dir = trade.direction === 'buy' ? 'LONG' : 'SHORT';
  const result = (trade.pnl || 0) >= 0 ? 'profit' : 'loss';
  const psychAtOpen = computePsychScore(scoresAtOpen);
  const psychAtClose = computePsychScore(scoresAtClose);

  let emotionalNote: string;
  if (scoresAtOpen.revenge > 60) {
    emotionalNote = 'This trade was opened during a high revenge-trading risk period. ⚠️ Review if this trade followed your strategy.';
  } else if (scoresAtOpen.fomo > 60) {
    emotionalNote = 'FOMO was elevated at trade open. ⚠️ Ensure you waited for your setup criteria to align.';
  } else if (scoresAtOpen.discipline > 70) {
    emotionalNote = 'Excellent emotional state at entry. ✅ Disciplined approach detected.';
  } else {
    emotionalNote = 'Emotional state was within acceptable range at entry.';
  }

  return `**${dir} ${trade.symbol}** | ${new Date(trade.openTime).toLocaleTimeString()} → ${trade.closeTime ? new Date(trade.closeTime).toLocaleTimeString() : 'Open'}

**Entry:** $${trade.entryPrice.toFixed(4)} | **Exit:** $${(trade.closePrice || trade.entryPrice).toFixed(4)}
**P&L:** ${(trade.pnl || 0) >= 0 ? '+' : ''}$${(trade.pnl || 0).toFixed(2)} (${result.toUpperCase()})
**Stop Loss:** ${trade.stopLoss ? '$' + trade.stopLoss : 'None set ⚠️'} | **Take Profit:** ${trade.takeProfit ? '$' + trade.takeProfit : 'None set'}

**AI Psychology Analysis:**
${emotionalNote}

- Psych Score at Open: **${psychAtOpen.toFixed(0)}/100**
- Psych Score at Close: **${psychAtClose.toFixed(0)}/100**
- Fear: ${scoresAtOpen.fear.toFixed(0)} → ${scoresAtClose.fear.toFixed(0)}
- Discipline: ${scoresAtOpen.discipline.toFixed(0)} → ${scoresAtClose.discipline.toFixed(0)}

*Overall Assessment: ${psychAtOpen > 65 ? 'Trade executed from a healthy psychological state. ✅' : 'Consider reviewing emotional triggers before this trade. 🔍'}*`;
}

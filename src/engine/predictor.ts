import type { EmotionScores } from './emotionEngine';
import { computePsychScore } from './emotionEngine';

export interface PredictionResult {
  blowUpRisk: number;        // 0-100%
  revengeRisk: number;       // 0-100%
  ruleViolationRisk: number; // 0-100%
  emotionalTradingRisk: number; // 0-100%
  label: string;
  severity: 'safe' | 'caution' | 'warning' | 'danger';
  action: string;
}

export function computePredictions(
  scores: EmotionScores,
  balance: number,
  equity: number,
  consecutiveLosses: number,
  openPositions: number,
  tradeCount = 1,
): PredictionResult {
  if (tradeCount === 0 && openPositions === 0) {
    return { blowUpRisk: 0, revengeRisk: 0, ruleViolationRisk: 0, emotionalTradingRisk: 0, label: 'Ready to Trade', severity: 'safe', action: 'No activity yet — the AI starts profiling you after your first trade.' };
  }
  const drawdownPct = Math.max(0, (balance - equity) / balance * 100);
  const psychScore = computePsychScore(scores);

  // Blow-up Risk: drawdown + greed + no discipline
  const blowUpRisk = Math.min(100,
    drawdownPct * 3 +
    scores.greed * 0.3 +
    (100 - scores.discipline) * 0.2 +
    consecutiveLosses * 10 +
    openPositions * 5,
  );

  // Revenge Trading Risk
  const revengeRisk = Math.min(100,
    scores.revenge * 0.6 +
    consecutiveLosses * 15 +
    scores.stress * 0.2,
  );

  // Rule Violation Risk
  const ruleViolationRisk = Math.min(100,
    (100 - scores.discipline) * 0.5 +
    scores.fomo * 0.3 +
    scores.greed * 0.2,
  );

  // Emotional Trading Risk
  const emotionalTradingRisk = Math.min(100,
    scores.fear * 0.25 +
    scores.greed * 0.25 +
    scores.fomo * 0.25 +
    scores.revenge * 0.25,
  );

  let label: string;
  let severity: PredictionResult['severity'];
  let action: string;

  if (psychScore > 70 && blowUpRisk < 20) {
    label = 'Optimal Trading State';
    severity = 'safe';
    action = 'Continue trading with your current approach.';
  } else if (blowUpRisk > 70 || revengeRisk > 75) {
    label = 'CRITICAL: Stop Trading Now';
    severity = 'danger';
    action = 'Close all positions and step away from the platform for at least 1 hour.';
  } else if (blowUpRisk > 40 || emotionalTradingRisk > 60) {
    label = 'High Risk Detected';
    severity = 'warning';
    action = 'Reduce position size by 50% and set a strict daily loss limit.';
  } else {
    label = 'Proceed with Caution';
    severity = 'caution';
    action = 'Monitor your emotions carefully. Stick to your trading plan.';
  }

  return {
    blowUpRisk: +blowUpRisk.toFixed(1),
    revengeRisk: +revengeRisk.toFixed(1),
    ruleViolationRisk: +ruleViolationRisk.toFixed(1),
    emotionalTradingRisk: +emotionalTradingRisk.toFixed(1),
    label,
    severity,
    action,
  };
}

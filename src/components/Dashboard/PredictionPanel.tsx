import { useTrading } from '../../context/TradingContext';
import { AlertTriangle, Zap, TrendingDown, Activity, ShieldAlert } from 'lucide-react';

const SEVERITY_CONFIG = {
  safe: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', icon: '✅' },
  caution: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', icon: '⚠️' },
  warning: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', icon: '🚨' },
  danger: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', icon: '🔴' },
};

interface RiskBarProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

function RiskBar({ label, value, color, icon, description }: RiskBarProps) {
  const barColor = value < 25 ? '#10b981' : value < 50 ? '#f59e0b' : value < 75 ? '#f97316' : '#ef4444';
  return (
    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{value.toFixed(0)}%</div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{
          height: '100%', width: `${value}%`, borderRadius: 2,
          background: barColor,
          boxShadow: `0 0 8px ${barColor}66`,
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{description}</div>
    </div>
  );
}

export default function PredictionPanel() {
  const { predictions, emotionScores } = useTrading();
  const cfg = SEVERITY_CONFIG[predictions.severity];

  const riskBars = [
    {
      label: 'Account Blow-Up Risk',
      value: predictions.blowUpRisk,
      color: '#ef4444',
      icon: <TrendingDown size={13} />,
      description: 'Probability of losing > 20% of account this session',
    },
    {
      label: 'Revenge Trading Risk',
      value: predictions.revengeRisk,
      color: '#ec4899',
      icon: <Zap size={13} />,
      description: 'Likelihood of an impulsive retaliatory trade',
    },
    {
      label: 'Rule Violation Risk',
      value: predictions.ruleViolationRisk,
      color: '#f97316',
      icon: <ShieldAlert size={13} />,
      description: 'Probability of breaking your trading plan',
    },
    {
      label: 'Emotional Trading Risk',
      value: predictions.emotionalTradingRisk,
      color: '#8b5cf6',
      icon: <Activity size={13} />,
      description: 'Overall emotional influence on decisions',
    },
  ];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
        AI Prediction Layer
      </div>

      {/* Overall Status Banner */}
      <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 24 }}>{cfg.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{predictions.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
              {predictions.action}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {riskBars.map(bar => <RiskBar key={bar.label} {...bar} />)}
      </div>

      {/* Early Warning Signs */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={11} /> Early Warning Signs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { condition: emotionScores.stress > 60, text: 'Stress above normal threshold', color: '#f97316' },
            { condition: emotionScores.greed > 65, text: 'Greed levels elevated — oversizing risk', color: '#f59e0b' },
            { condition: emotionScores.patience < 40, text: 'Patience critically low — avoid entries', color: '#ef4444' },
            { condition: emotionScores.discipline > 70, text: 'Discipline is strong — maintain your edge', color: '#10b981' },
          ].map((item, i) => item.condition && (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 6, background: `${item.color}0d`, border: `1px solid ${item.color}22` }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: item.color, marginTop: 4, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

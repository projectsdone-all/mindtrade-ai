import { useTrading } from '../../context/TradingContext';
import { TrendingUp, Activity, Shield, Brain, Target, Zap, Clock } from 'lucide-react';

export default function SummaryCards() {
  const { balance, equity, dailyPnL, equityCurve, startingBalance, psychScore, emotionScores, winRate, trades, positions, totalPnL, consecutiveLosses } = useTrading();

  const hasActivity = trades.length > 0 || positions.length > 0;
  const peak = Math.max(startingBalance, ...equityCurve.map(p => p.equity), equity);
  const drawdown = Math.max(0, (peak - equity) / peak * 100);
  void balance;
  const drawdownColor = drawdown < 2 ? 'var(--green)' : drawdown < 5 ? 'var(--yellow)' : 'var(--red)';
  const psychColor = !hasActivity ? 'var(--text-muted)' : psychScore >= 70 ? 'var(--green)' : psychScore >= 40 ? 'var(--yellow)' : 'var(--red)';

  const cards = [
    {
      label: 'Equity',
      value: `$${equity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `${dailyPnL >= 0 ? '+' : ''}$${dailyPnL.toFixed(2)} today`,
      color: equity >= startingBalance ? 'var(--green)' : 'var(--red)',
      icon: <TrendingUp size={16} />,
      glow: equity >= startingBalance ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    },
    {
      label: 'Psychology Score',
      value: hasActivity ? `${Math.round(psychScore)}/100` : '--',
      sub: !hasActivity ? 'No trades yet' : psychScore >= 70 ? 'Optimal State' : psychScore >= 40 ? 'Proceed with Caution' : 'Stop Trading Now',
      color: psychColor,
      icon: <Brain size={16} />,
      glow: !hasActivity ? 'transparent' : psychScore >= 70 ? 'rgba(38,166,154,0.08)' : 'rgba(255,183,77,0.08)',
    },
    {
      label: 'Win Rate',
      value: trades.length > 0 ? `${winRate.toFixed(0)}%` : '--',
      sub: `${trades.filter(t => t.pnl && t.pnl > 0).length}W / ${trades.filter(t => t.pnl && t.pnl < 0).length}L (${trades.length} trades)`,
      color: trades.length === 0 ? 'var(--text-muted)' : winRate >= 50 ? 'var(--green)' : 'var(--red)',
      icon: <Target size={16} />,
      glow: trades.length === 0 ? 'transparent' : winRate >= 50 ? 'rgba(38,166,154,0.08)' : 'rgba(239,83,80,0.08)',
    },
    {
      label: 'Drawdown',
      value: `-${drawdown.toFixed(2)}%`,
      sub: drawdown < 2 ? 'Within safe range' : drawdown < 5 ? 'Monitor closely' : 'Critical — reduce risk',
      color: drawdownColor,
      icon: <Shield size={16} />,
      glow: drawdown < 2 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    },
    {
      label: 'Discipline',
      value: hasActivity ? `${Math.round(emotionScores.discipline)}/100` : '--',
      sub: !hasActivity ? 'No trades yet' : emotionScores.discipline > 75 ? 'Excellent' : emotionScores.discipline > 50 ? 'Moderate' : 'Needs improvement',
      color: !hasActivity ? 'var(--text-muted)' : emotionScores.discipline > 75 ? 'var(--green)' : emotionScores.discipline > 50 ? 'var(--yellow)' : 'var(--red)',
      icon: <Activity size={16} />,
      glow: 'transparent',
    },
    {
      label: 'Open Positions',
      value: positions.length.toString(),
      sub: positions.length > 0 ? `$${positions.reduce((s, p) => s + p.pnl, 0).toFixed(2)} unrealized` : 'No open trades',
      color: 'var(--accent)',
      icon: <Zap size={16} />,
      glow: 'rgba(99,102,241,0.1)',
    },
    {
      label: 'Total P&L',
      value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`,
      sub: `${((totalPnL / balance) * 100).toFixed(2)}% return`,
      color: totalPnL >= 0 ? 'var(--green)' : 'var(--red)',
      icon: <TrendingUp size={16} />,
      glow: totalPnL >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    },
    {
      label: 'Loss Streak',
      value: hasActivity ? consecutiveLosses.toString() : '--',
      sub: !hasActivity ? 'No trades yet' : consecutiveLosses >= 3 ? '⚠️ Stop recommended' : consecutiveLosses >= 2 ? 'Caution' : 'Normal',
      color: !hasActivity ? 'var(--text-muted)' : consecutiveLosses >= 3 ? 'var(--red)' : consecutiveLosses >= 2 ? 'var(--yellow)' : 'var(--green)',
      icon: <Clock size={16} />,
      glow: 'transparent',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="card-hover"
          style={{
            borderRadius: 8, padding: '14px 16px',
            background: card.glow && card.glow !== 'transparent' ? card.glow : 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="section-header">{card.label}</div>
            <div style={{ color: card.color, opacity: 0.75 }}>{card.icon}</div>
          </div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: card.color, marginBottom: 3 }}>
            {card.value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

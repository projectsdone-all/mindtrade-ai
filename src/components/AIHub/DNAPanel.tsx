import { useTrading } from '../../context/TradingContext';

export default function DNAPanel() {
  const { dnaProfile, emotionScores, trades, winRate, totalPnL } = useTrading();

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
        Trader DNA Profile
      </div>

      {/* Archetype Card */}
      <div style={{
        background: `linear-gradient(135deg, ${dnaProfile.color}15, ${dnaProfile.color}05)`,
        border: `1px solid ${dnaProfile.color}33`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 100, height: 100,
          borderRadius: '50%', background: `${dnaProfile.color}15`,
          filter: 'blur(30px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{dnaProfile.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: dnaProfile.color, marginBottom: 4 }}>
            {dnaProfile.archetype}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {dnaProfile.description}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Total Trades', value: trades.length.toString(), color: 'var(--accent)' },
          { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' },
          { label: 'Total P&L', value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          ✅ STRENGTHS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dnaProfile.strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weaknesses */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠️ WEAKNESSES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dnaProfile.weaknesses.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div style={{
        background: `${dnaProfile.color}10`,
        border: `1px solid ${dnaProfile.color}30`,
        borderRadius: 8,
        padding: '10px 12px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: dnaProfile.color, marginBottom: 4, letterSpacing: '0.05em' }}>
          🎯 AI RECOMMENDATION
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          {dnaProfile.recommendation}
        </div>
      </div>

      {/* Top Emotion Scores */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Psychology Fingerprint
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { label: 'Discipline', val: emotionScores.discipline, color: '#10b981' },
            { label: 'Patience', val: emotionScores.patience, color: '#3b82f6' },
            { label: 'Confidence', val: emotionScores.confidence, color: '#06b6d4' },
            { label: 'Fear', val: emotionScores.fear, color: '#ef4444' },
            { label: 'Greed', val: emotionScores.greed, color: '#f59e0b' },
          ].map(e => (
            <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 60, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{e.label}</div>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${e.val}%`, background: e.color, borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
              <div className="font-mono" style={{ width: 28, fontSize: 10, color: e.color, textAlign: 'right' }}>{Math.round(e.val)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

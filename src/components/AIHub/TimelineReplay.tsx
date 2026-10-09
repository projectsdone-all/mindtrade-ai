import { useTrading } from '../../context/TradingContext';

const EMOTION_COLORS: Record<string, string> = {
  fear:       '#ef5350',
  greed:      '#ffb74d',
  fomo:       '#7c4dff',
  discipline: '#26a69a',
  stress:     '#ff9800',
  confidence: '#00bcd4',
  patience:   '#42a5f5',
  revenge:    '#ec407a',
};

const EMOTION_LINES: Array<{ key: string; label: string }> = [
  { key: 'fear',       label: 'Fear' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'greed',      label: 'Greed' },
  { key: 'stress',     label: 'Stress' },
];

export default function TimelineReplay() {
  const { emotionHistory, trades } = useTrading();

  if (emotionHistory.length < 2) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 160,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, opacity: 0.5 }}>📈</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Emotional Timeline</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 240 }}>
          Start trading and your real-time emotion data will appear here as a live chart
        </div>
      </div>
    );
  }

  // SVG dimensions — use percentage-based viewBox for responsive rendering
  const W = 400;
  const H = 150;
  const PAD = { top: 12, right: 12, bottom: 24, left: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const n = emotionHistory.length;

  function toX(i: number) {
    return PAD.left + (i / Math.max(n - 1, 1)) * cW;
  }
  function toY(val: number) {
    return PAD.top + (1 - val / 100) * cH;
  }

  function buildPath(key: string) {
    return emotionHistory
      .map((snap, i) => {
        const val = snap.scores[key as keyof typeof snap.scores];
        return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(val).toFixed(1)}`;
      })
      .join(' ');
  }

  // Trade markers: map each trade's openTime to an x position based on the timeline range
  // Use time-based mapping (not index) to avoid stacking when trades pre-date history
  const firstTs = emotionHistory[0].timestamp;
  const lastTs  = emotionHistory[n - 1].timestamp;
  const tsRange = lastTs - firstTs || 1;

  const tradeMarkers = trades
    .filter(t => t.closeTime && t.closeTime >= firstTs)
    .map(t => {
      const ts = t.closeTime!;
      const xFraction = Math.min(1, Math.max(0, (ts - firstTs) / tsRange));
      const x = PAD.left + xFraction * cW;
      return { x, isWin: (t.pnl || 0) > 0, symbol: t.symbol };
    });

  const latest = emotionHistory[n - 1];
  const psychTrend = n > 5
    ? latest.psychScore - emotionHistory[n - 6].psychScore
    : 0;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-header">Emotional Timeline</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n} snapshots</span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: psychTrend >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            Psych: {psychTrend >= 0 ? '↑' : '↓'}{Math.abs(psychTrend).toFixed(0)}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line
              x1={PAD.left} y1={toY(v)}
              x2={W - PAD.right} y2={toY(v)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={0.8}
            />
            <text
              x={PAD.left - 3} y={toY(v)}
              textAnchor="end" dominantBaseline="middle"
              fill="rgba(148,163,184,0.45)" fontSize={7}
              fontFamily="JetBrains Mono, monospace"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Emotion lines */}
        {EMOTION_LINES.map(em => (
          <path
            key={em.key}
            d={buildPath(em.key)}
            fill="none"
            stroke={EMOTION_COLORS[em.key]}
            strokeWidth={1.2}
            strokeOpacity={0.85}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Trade markers — use time-based x, not index */}
        {tradeMarkers.map((m, i) => (
          <g key={i}>
            <line
              x1={m.x} y1={PAD.top}
              x2={m.x} y2={H - PAD.bottom}
              stroke={m.isWin ? '#26a69a' : '#ef5350'}
              strokeWidth={0.8}
              strokeDasharray="2,2"
              strokeOpacity={0.7}
            />
            <circle
              cx={m.x} cy={H - PAD.bottom}
              r={2.5}
              fill={m.isWin ? '#26a69a' : '#ef5350'}
            />
          </g>
        ))}

        {/* "Now" indicator */}
        <line
          x1={toX(n - 1)} y1={PAD.top}
          x2={toX(n - 1)} y2={H - PAD.bottom}
          stroke="rgba(41,98,255,0.5)" strokeWidth={1}
        />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {EMOTION_LINES.map(em => (
          <div key={em.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 2.5, background: EMOTION_COLORS[em.key], borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: EMOTION_COLORS[em.key], fontWeight: 600 }}>{em.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          <div style={{ width: 2, height: 10, background: '#26a69a', borderRadius: 1, opacity: 0.7 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Win</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 2, height: 10, background: '#ef5350', borderRadius: 1, opacity: 0.7 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Loss</span>
        </div>
      </div>

      {/* Current emotion scores */}
      {latest && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {EMOTION_LINES.map(em => {
            const val = latest.scores[em.key as keyof typeof latest.scores];
            return (
              <div key={em.key} style={{
                textAlign: 'center',
                padding: '6px 4px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 5,
                border: `1px solid rgba(255,255,255,0.05)`,
              }}>
                <div className="font-mono" style={{ fontSize: 15, fontWeight: 800, color: EMOTION_COLORS[em.key] }}>
                  {Math.round(val)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {em.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

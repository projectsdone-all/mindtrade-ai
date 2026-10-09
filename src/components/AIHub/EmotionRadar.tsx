import { useTrading } from '../../context/TradingContext';

const EMOTIONS = [
  { key: 'fear', label: 'Fear', color: '#ef4444' },
  { key: 'greed', label: 'Greed', color: '#f59e0b' },
  { key: 'fomo', label: 'FOMO', color: '#8b5cf6' },
  { key: 'discipline', label: 'Discipline', color: '#10b981' },
  { key: 'stress', label: 'Stress', color: '#f97316' },
  { key: 'confidence', label: 'Confidence', color: '#06b6d4' },
  { key: 'patience', label: 'Patience', color: '#3b82f6' },
  { key: 'revenge', label: 'Revenge', color: '#ec4899' },
] as const;

type EmotionKey = typeof EMOTIONS[number]['key'];

export default function EmotionRadar() {
  const { emotionScores, psychScore, dominantEmotion, trades, positions } = useTrading();

  const hasActivity = trades.length > 0 || positions.length > 0;

  // SVG radar chart
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const n = EMOTIONS.length;

  function polarToXY(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const scores = hasActivity ? emotionScores : {
    fear: 0, greed: 0, fomo: 0, discipline: 0,
    stress: 0, confidence: 0, patience: 0, revenge: 0,
  };

  const points = EMOTIONS.map((em, i) => {
    const angle = (i / n) * 360 - 90;
    const val = scores[em.key as EmotionKey] / 100;
    const r = val * maxR;
    return polarToXY(angle, r);
  });
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const gridRings = [0.25, 0.5, 0.75, 1.0];
  const labels = EMOTIONS.map((em, i) => {
    const angle = (i / n) * 360 - 90;
    const r = maxR + 18;
    const pos = polarToXY(angle, r);
    return { ...pos, label: em.label, color: em.color };
  });

  const displayScore = hasActivity ? psychScore : 0;
  const scoreColor = !hasActivity ? 'var(--text-muted)' : displayScore >= 70 ? '#10b981' : displayScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        Emotion Radar
      </div>

      {!hasActivity ? (
        <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧘</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No Trading Activity Yet</div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>Place your first trade and the AI will begin analyzing your emotional patterns in real-time.</div>
        </div>
      ) : (
        <>
          {/* Radar SVG */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
              {gridRings.map((r, i) => {
                const ringPoints = EMOTIONS.map((_, idx) => {
                  const angle = (idx / n) * 360 - 90;
                  const pos = polarToXY(angle, r * maxR);
                  return `${pos.x},${pos.y}`;
                }).join(' ');
                return <polygon key={i} points={ringPoints} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
              })}
              {EMOTIONS.map((_, i) => {
                const angle = (i / n) * 360 - 90;
                const end = polarToXY(angle, maxR);
                return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
              })}
              <polygon points={polygonPoints} fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.6)" strokeWidth={1.5} style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={EMOTIONS[i].color} stroke="rgba(0,0,0,0.5)" strokeWidth={1} style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
              ))}
              {labels.map((l, i) => (
                <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill={l.color} fontSize={8} fontFamily="Inter, sans-serif" fontWeight="700">{l.label}</text>
              ))}
            </svg>
          </div>

          {/* Psych Score Ring */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                <circle cx={40} cy={40} r={34} fill="none" stroke={scoreColor} strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - displayScore / 100)}`}
                  className="score-ring" style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor }}>{Math.round(displayScore)}</span>
                <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600 }}>PSYCH</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Dominant</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{dominantEmotion}</div>
              <div style={{ fontSize: 10, color: scoreColor, marginTop: 4, fontWeight: 600 }}>
                {displayScore >= 70 ? '✅ Healthy' : displayScore >= 40 ? '⚠️ Caution' : '🚨 Critical'}
              </div>
            </div>
          </div>

          {/* Emotion Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {EMOTIONS.map(em => {
              const val = scores[em.key as EmotionKey];
              return (
                <div key={em.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: em.color, fontWeight: 600 }}>{em.label}</span>
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Math.round(val)}</span>
                  </div>
                  <div className="emotion-bar-track">
                    <div className="emotion-bar-fill" style={{ width: `${val}%`, background: `linear-gradient(90deg, ${em.color}99, ${em.color})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

import { useTrading } from '../../context/TradingContext';

export default function ChallengeGrid() {
  const { challenges } = useTrading();

  const unlocked = challenges.filter(c => c.unlocked).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Challenge Mode</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Earn badges by mastering your trading psychology</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--yellow)' }}>{unlocked}/{challenges.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Badges Earned</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Overall Progress</span>
          <span className="font-mono" style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 600 }}>
            {Math.round((unlocked / challenges.length) * 100)}%
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(unlocked / challenges.length) * 100}%`,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            borderRadius: 3, transition: 'width 1s ease',
            boxShadow: '0 0 10px rgba(245,158,11,0.4)',
          }} />
        </div>
      </div>

      {/* Challenge Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {challenges.map(ch => (
          <div
            key={ch.id}
            style={{
              padding: 16,
              borderRadius: 12,
              border: '1px solid',
              background: ch.unlocked ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
              borderColor: ch.unlocked ? 'rgba(245,158,11,0.4)' : 'var(--border)',
              boxShadow: ch.unlocked ? '0 0 20px rgba(245,158,11,0.1)' : 'none',
              transition: 'all 0.3s ease',
              cursor: 'default',
              filter: ch.unlocked ? 'none' : 'saturate(0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Icon */}
              <div style={{
                fontSize: 28,
                width: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: ch.unlocked ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}>
                {ch.unlocked ? ch.icon : '🔒'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ch.unlocked ? 'var(--yellow)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ch.name}
                  </div>
                  {ch.unlocked && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>
                      UNLOCKED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                  {ch.description}
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Progress</span>
                    <span className="font-mono" style={{ fontSize: 10, color: ch.unlocked ? '#f59e0b' : 'var(--accent)' }}>
                      {ch.progress}/{ch.target}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (ch.progress / ch.target) * 100)}%`,
                      background: ch.unlocked ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'var(--accent)',
                      borderRadius: 2, transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>

                {/* Reward */}
                <div style={{ marginTop: 8, fontSize: 10, color: ch.unlocked ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🏆 {ch.reward}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>💡 How to Earn Badges</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Badges are earned automatically by demonstrating disciplined trading behavior. The AI monitors your trades in real-time and unlocks achievements when you meet the criteria. Focus on quality trades, not quantity.
        </div>
      </div>
    </div>
  );
}

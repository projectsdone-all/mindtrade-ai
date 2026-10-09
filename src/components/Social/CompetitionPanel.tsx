import { useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Alex K.', avatar: 'AK', psychScore: 91, winRate: 74, pnl: 12450, trades: 87, badge: 'The Disciplined Professional', country: '🇺🇸' },
  { rank: 2, name: 'Maria S.', avatar: 'MS', psychScore: 88, winRate: 71, pnl: 9820, trades: 64, badge: 'The Patient Strategist', country: '🇩🇪' },
  { rank: 3, name: 'Jin H.', avatar: 'JH', psychScore: 85, winRate: 68, pnl: 8340, trades: 95, badge: 'The Conservative Analyst', country: '🇰🇷' },
  { rank: 4, name: 'Priya M.', avatar: 'PM', psychScore: 82, winRate: 65, pnl: 7100, trades: 52, badge: 'The Patient Strategist', country: '🇮🇳' },
  { rank: 5, name: 'Carlos R.', avatar: 'CR', psychScore: 79, winRate: 63, pnl: 5890, trades: 78, badge: 'The Disciplined Professional', country: '🇧🇷' },
  { rank: 6, name: 'Sarah T.', avatar: 'ST', psychScore: 76, winRate: 60, pnl: 4230, trades: 43, badge: 'The Conservative Analyst', country: '🇬🇧' },
  { rank: 7, name: 'Omar A.', avatar: 'OA', psychScore: 72, winRate: 58, pnl: 3180, trades: 61, badge: 'The Risk Hunter', country: '🇦🇪' },
];

const TOURNAMENTS = [
  { id: 't1', name: 'Best Discipline Score', prize: '$500 Premium Plan', deadline: '3 days', type: 'Discipline', participants: 248, icon: '🎯' },
  { id: 't2', name: 'Zero Revenge Challenge', prize: '$250 + Gold Badge', deadline: '6 days', type: 'Psychology', participants: 189, icon: '🧘' },
  { id: 't3', name: 'Highest Win Rate', prize: '$1,000 Grand Prize', deadline: '12 days', type: 'Performance', participants: 512, icon: '👑' },
  { id: 't4', name: 'Risk Master Monthly', prize: '3 Month Premium', deadline: '18 days', type: 'Risk Management', participants: 334, icon: '🛡️' },
];

export default function CompetitionPanel() {
  const { psychScore, winRate, totalPnL, trades } = useTrading();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'tournaments'>('leaderboard');
  const [sortBy, setSortBy] = useState<'psychScore' | 'winRate' | 'pnl'>('psychScore');
  const [joined, setJoined] = useState<Set<string>>(new Set());


  const sorted = [...MOCK_LEADERBOARD].sort((a, b) => b[sortBy] - a[sortBy]);

  const rankColor = (rank: number) => rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#cd7c32' : 'var(--text-muted)';
  const rankIcon = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Social & Competition</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Compete with traders worldwide. Rise through the ranks.</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Trophy size={16} color="#f59e0b" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>Weekly Competition</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 3 }}>
        {(['leaderboard', 'tournaments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              textTransform: 'capitalize', transition: 'all 0.2s',
              background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {tab === 'leaderboard' ? <><Users size={12} style={{ display: 'inline', marginRight: 4 }} />Leaderboard</> : <><Trophy size={12} style={{ display: 'inline', marginRight: 4 }} />Tournaments</>}
          </button>
        ))}
      </div>

      {activeTab === 'leaderboard' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Sort */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'psychScore' as const, label: 'Psych Score' },
              { key: 'winRate' as const, label: 'Win Rate' },
              { key: 'pnl' as const, label: 'P&L' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                  background: sortBy === s.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                  borderColor: sortBy === s.key ? 'var(--accent)' : 'var(--border)',
                  color: sortBy === s.key ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Your position */}
          <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>YOUR RANKING</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white' }}>
                ME
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>You — Developing Trader 🌍</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{trades.length} trades · Rank pending (need 10+ trades)</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                {[
                  { label: 'Psych', val: Math.round(psychScore) },
                  { label: 'Win%', val: `${winRate.toFixed(0)}%` },
                  { label: 'P&L', val: `$${totalPnL.toFixed(0)}` },
                ].map(s => (
                  <div key={s.label}>
                    <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard list */}
          <div className="scroll-y" style={{ flex: 1 }}>
            {sorted.map((trader) => (
              <div
                key={trader.rank}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', marginBottom: 6,
                  background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-bright)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
              >
                {/* Rank */}
                <div style={{ width: 28, textAlign: 'center', fontSize: trader.rank <= 3 ? 18 : 12, fontWeight: 700, color: rankColor(trader.rank) }}>
                  {rankIcon(trader.rank)}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: 'white',
                  background: `hsl(${(trader.rank * 47) % 360}, 60%, 40%)`,
                }}>
                  {trader.avatar}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{trader.country} {trader.name}</span>
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', fontWeight: 600 }}>
                      {trader.badge.split(' ').slice(-1)[0]}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{trader.trades} trades</div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 4, textAlign: 'right' }}>
                  {[
                    { label: 'Psych', val: trader.psychScore.toString(), highlight: sortBy === 'psychScore' },
                    { label: 'Win%', val: `${trader.winRate}%`, highlight: sortBy === 'winRate' },
                    { label: 'P&L', val: `$${(trader.pnl / 1000).toFixed(1)}k`, highlight: sortBy === 'pnl' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: s.highlight ? 'var(--accent)' : 'var(--text-primary)' }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="scroll-y" style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {TOURNAMENTS.map(t => (
              <div
                key={t.id}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 28 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>{t.type}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: '8px', background: 'rgba(245,158,11,0.05)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700, marginBottom: 2 }}>🏆 PRIZE</div>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{t.prize}</div>
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(99,102,241,0.05)', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginBottom: 2 }}>⏱ ENDS IN</div>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{t.deadline}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <Users size={12} /> {t.participants.toLocaleString()} participants
                  </div>
                </div>

                <button
                  onClick={() => setJoined(prev => {
                    const n = new Set(prev);
                    if (n.has(t.id)) n.delete(t.id); else n.add(t.id);
                    return n;
                  })}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                    background: joined.has(t.id) ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: joined.has(t.id) ? 'var(--green)' : 'white',
                    borderColor: joined.has(t.id) ? 'rgba(16,185,129,0.3)' : 'transparent',
                    boxShadow: joined.has(t.id) ? 'none' : '0 4px 15px rgba(99,102,241,0.3)',
                  }}
                >
                  {joined.has(t.id) ? '✅ Joined — View Progress' : 'Join Competition'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

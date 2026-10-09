import { useTrading } from '../../context/TradingContext';
import { BookOpen } from 'lucide-react';

export default function JournalPanel() {
  const { journalEntries } = useTrading();

  if (journalEntries.length === 0) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 48 }}>📓</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Your AI Trade Journal</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
          Every time you close a trade, the AI automatically generates a detailed psychological journal entry — analyzing your emotional state, risk behavior, and providing personalized insights.
        </div>
        <div style={{ fontSize: 12, color: 'var(--accent)' }}>Close your first trade to see your AI journal entry.</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="var(--accent)" /> AI Trade Journal
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Automatically generated psychological analysis for every trade</p>
        </div>
        <div className="badge badge-purple">{journalEntries.length} entries</div>
      </div>

      <div className="scroll-y" style={{ flex: 1 }}>
        {journalEntries.map(entry => {
          const isProfit = entry.pnl >= 0;
          return (
            <div
              key={entry.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid',
                borderColor: isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Entry Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    background: isProfit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: isProfit ? 'var(--green)' : 'var(--red)',
                  }}>
                    {entry.symbol}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleDateString()} · {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: isProfit ? 'var(--green)' : 'var(--red)' }}>
                  {isProfit ? '+' : ''}${entry.pnl.toFixed(2)}
                </div>
              </div>

              {/* AI Generated Content — render markdown-like */}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {entry.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.includes('**')) {
                    const parts = line.split(/\*\*(.*?)\*\*/);
                    return (
                      <div key={i}>
                        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text-primary)' }}>{p}</strong> : <span key={j}>{p}</span>)}
                      </div>
                    );
                  }
                  if (line.trim() === '') return <br key={i} />;
                  return <div key={i}>{line}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

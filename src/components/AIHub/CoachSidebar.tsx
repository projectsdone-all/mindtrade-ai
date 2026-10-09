import { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Bot, AlertTriangle, CheckCircle, Send, ChevronDown } from 'lucide-react';

const CANNED_QA: Record<string, string> = {
  'why am i losing': "Based on your trade history, your losses are often driven by: (1) Trading too frequently without waiting for high-probability setups, (2) Not setting stop-losses — this dramatically increases your loss size, (3) Revenge trading after losses. Focus on patience and discipline first.",
  'how to improve': "Your top improvement areas right now: (1) Always set a Stop Loss — it's non-negotiable, (2) Wait at least 15 minutes between trades, (3) Risk no more than 2% per trade. These three habits alone will significantly improve your consistency.",
  'what is fomo': "FOMO (Fear Of Missing Out) in trading means you enter positions because a price is moving fast, not because your strategy tells you to. It causes you to buy tops and sell bottoms. Fix: Only trade when your full entry criteria are met — never chase price.",
  'what is my profile': "Check the 'Trader DNA' tab for your complete psychological profile including your archetype, strengths, weaknesses, and a personalized improvement plan.",
  'stop loss': "A stop loss is the maximum amount you're willing to lose on any single trade. It removes emotion from exits. Rule of thumb: Set SL at the point where your trade idea is proven wrong, not based on how much money you want to lose.",
  'best time to trade': "Statistically, your win rate is highest when: (1) You've been rested and your stress score is low, (2) You've already had 1-2 good trades, not after losses, (3) You follow your strategy rules exactly.",
};

export default function CoachSidebar() {
  const { coachMessages, warnings, insights, psychScore, trades, positions } = useTrading();
  const hasActivity = trades.length > 0 || positions.length > 0;
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'coach'; text: string }[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = input.trim().toLowerCase();
    setChat(prev => [...prev, { role: 'user', text: input.trim() }]);

    // Find best matching canned answer
    let response = "I don't have a specific answer for that right now, but keep watching your emotion scores and follow your trading plan. Consistency is the key to profitability.";
    for (const [key, val] of Object.entries(CANNED_QA)) {
      if (userMsg.includes(key) || key.split(' ').some(w => userMsg.includes(w))) {
        response = val;
        break;
      }
    }

    setTimeout(() => {
      setChat(prev => [...prev, { role: 'coach', text: response }]);
    }, 600);

    setInput('');
  }

  const statusColor = psychScore >= 70 ? 'var(--green)' : psychScore >= 40 ? 'var(--yellow)' : 'var(--red)';
  const statusLabel = psychScore >= 70 ? 'Healthy' : psychScore >= 40 ? 'Caution' : 'At Risk';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99,102,241,0.4)',
          }}>
            <Bot size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Trading Coach</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} className="animate-pulse-glow" />
              <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{statusLabel} — Psych Score: {Math.round(psychScore)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!hasActivity ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>AI Coach Ready</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Open a position in the Terminal and I'll start analyzing your emotional patterns, risk behavior, and decision-making in real time.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>ASK ME ANYTHING</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(CANNED_QA).map(q => (
                  <button key={q} onClick={() => { setChat(prev => [...prev, { role: 'user', text: q }]); setTimeout(() => { setChat(prev => [...prev, { role: 'coach', text: CANNED_QA[q] }]); }, 400); }}
                    style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'}
                  >{q}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {warnings.length > 0 && (
              <div>
                <button onClick={() => setCollapsed(p => ({ ...p, warnings: !p.warnings }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontWeight: 700, padding: '4px 0', width: '100%', textAlign: 'left' }}>
                  <AlertTriangle size={12} /> WARNINGS ({warnings.length})
                  <ChevronDown size={12} style={{ marginLeft: 'auto', transform: collapsed.warnings ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {!collapsed.warnings && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {warnings.map((w, i) => <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{w}</div>)}
                  </div>
                )}
              </div>
            )}
            {insights.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={12} /> INSIGHTS</div>
                {insights.map((ins, i) => <div key={i} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 6 }}>{ins}</div>)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={12} /> LIVE ANALYSIS</div>
              {coachMessages.map((msg, i) => <div key={i} className="coach-bubble" style={{ marginBottom: 8 }}>{msg}</div>)}
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>QUICK QUESTIONS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(CANNED_QA).slice(0, 4).map(q => (
                  <button key={q} onClick={() => { setChat(prev => [...prev, { role: 'user', text: q }]); setTimeout(() => { setChat(prev => [...prev, { role: 'coach', text: CANNED_QA[q] }]); }, 400); }}
                    style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'}
                  >{q}</button>
                ))}
              </div>
            </div>
          </>
        )}
        {chat.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="divider" />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>CONVERSATION</div>
            {chat.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: msg.role === 'user' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid', borderColor: msg.role === 'user' ? 'rgba(99,102,241,0.3)' : 'var(--border)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          className="input-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask your coach anything..."
          style={{ flex: 1, fontSize: 12 }}
        />
        <button
          onClick={handleSend}
          style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--accent)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

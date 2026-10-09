import { useState } from 'react';
import { BookOpen, CheckCircle, Play, Lock } from 'lucide-react';

interface Lesson {
  id: string;
  module: string;
  title: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  content: string;
  quiz: { q: string; options: string[]; correct: number }[];
  completed: boolean;
}

const LESSONS: Lesson[] = [
  {
    id: 'l1',
    module: 'Psychology',
    title: 'The Emotional Cycle of a Trader',
    duration: '5 min',
    difficulty: 'Beginner',
    content: `Every trader goes through an emotional cycle: Excitement → Overconfidence → Anxiety → Denial → Panic → Capitulation → Despair → Hope → Relief → Optimism → Back to Excitement.

Understanding where you are in this cycle is crucial. Most traders lose money at the "Overconfidence" and "Panic" stages.

**Key Lesson:** Your emotions are predictable patterns. By identifying them early, you can neutralize their impact on your trading decisions.

Professional traders don't eliminate emotions — they observe them without acting on them. Treat your emotions as data points, not commands.`,
    quiz: [
      { q: 'At which emotional stage do most traders lose the most money?', options: ['Optimism', 'Overconfidence & Panic', 'Hope', 'Relief'], correct: 1 },
      { q: 'What is the professional approach to emotions?', options: ['Ignore them', 'Act on them immediately', 'Observe them without acting', 'Trade more to overcome them'], correct: 2 },
    ],
    completed: false,
  },
  {
    id: 'l2',
    module: 'Psychology',
    title: 'Understanding FOMO and How to Beat It',
    duration: '6 min',
    difficulty: 'Beginner',
    content: `FOMO (Fear of Missing Out) is one of the most destructive forces in trading. It causes you to:

• **Chase price** — buying after a large move up, usually near the top
• **Enter without a plan** — no defined stop loss or take profit
• **Ignore your strategy** — because "this one is different"

The cure for FOMO is **a written entry checklist**. Before every trade ask:
1. Is price at my pre-defined entry zone?
2. Is there a clear stop loss level?
3. Is the risk-to-reward at least 1:2?
4. Am I entering because of my strategy, or because of emotion?

If you can't answer "yes" to all four, walk away.`,
    quiz: [
      { q: 'What does FOMO typically cause traders to do?', options: ['Wait patiently for setups', 'Chase price moves impulsively', 'Set better stop losses', 'Trade less frequently'], correct: 1 },
      { q: 'What is the best cure for FOMO?', options: ['Trade more often to get used to it', 'A written entry checklist', 'Increasing position sizes', 'Following other traders'], correct: 1 },
    ],
    completed: false,
  },
  {
    id: 'l3',
    module: 'Risk Management',
    title: 'The 1% Rule — Your Trading Lifeline',
    duration: '7 min',
    difficulty: 'Intermediate',
    content: `The **1% Rule** is the foundation of professional risk management:

**Never risk more than 1% of your account on a single trade.**

With a $100,000 account, your maximum loss per trade is $1,000.

This rule means you can have 50 consecutive losing trades and still have 60% of your capital remaining. It gives you the runway to improve, learn, and eventually become profitable.

**Position Sizing Formula:**
Position Size = (Account Size × Risk%) / (Entry Price - Stop Loss Price)

**Example:**
Account: $100,000 | Risk: 1% = $1,000
Entry: $50.00 | Stop Loss: $48.00 | Distance: $2.00
Position Size = $1,000 / $2.00 = 500 shares

Without this formula, you are gambling, not trading.`,
    quiz: [
      { q: 'With the 1% rule and a $50,000 account, what is the max risk per trade?', options: ['$5,000', '$500', '$100', '$1,000'], correct: 1 },
      { q: 'Why is the 1% rule called a trading lifeline?', options: ['It maximizes profits', 'It ensures you can survive many consecutive losses', 'It reduces trading frequency', 'It eliminates emotions'], correct: 1 },
    ],
    completed: false,
  },
  {
    id: 'l4',
    module: 'Technical Analysis',
    title: 'Support, Resistance & Price Action',
    duration: '8 min',
    difficulty: 'Intermediate',
    content: `**Support and Resistance** are the most powerful concepts in technical analysis because they represent where the most buying and selling activity has occurred historically.

**Support:** A price level where buying pressure has historically been strong enough to stop price from falling further. Think of it as the "floor."

**Resistance:** A price level where selling pressure has historically been strong enough to stop price from rising further. Think of it as the "ceiling."

**Key Rules:**
• The more times a level is tested, the more significant it is
• A broken support often becomes resistance (and vice versa)
• Always look for entries near support in an uptrend, resistance in a downtrend
• High-probability trades occur when multiple timeframes confirm the same level

**Price Action Tip:** Don't just look at where price is. Look at *how* it is approaching a level. A slow, weak approach to resistance is very different from a strong, impulsive move.`,
    quiz: [
      { q: 'What typically happens when a support level is broken?', options: ['It becomes a new resistance', 'Price immediately rebounds', 'The level becomes irrelevant', 'Volume decreases'], correct: 0 },
      { q: 'Where are the highest probability entries in an uptrend?', options: ['At resistance', 'Near support', 'At all-time highs', 'After large red candles'], correct: 1 },
    ],
    completed: false,
  },
  {
    id: 'l5',
    module: 'Trading Discipline',
    title: 'Building an Unbreakable Trading Routine',
    duration: '6 min',
    difficulty: 'Beginner',
    content: `Elite traders don't rely on motivation — they build **systems and routines** that execute regardless of how they feel.

**Pre-Market Routine (30 minutes before trading):**
1. Review your trading plan for the day
2. Check your max daily loss limit
3. Identify 2-3 high-probability setups
4. Write down your entry, stop loss, and take profit for each setup

**During Trading:**
• Only trade the setups you identified pre-market
• Do not deviate from your stop loss — ever
• After 2 consecutive losses, stop trading for the day

**Post-Market Routine:**
1. Review all trades — what did you do right/wrong?
2. Update your journal with emotional states
3. Plan tomorrow's sessions

**Remember:** The routine protects you from your own worst instincts.`,
    quiz: [
      { q: 'What should you do after 2 consecutive losses?', options: ['Double your position size to recover', 'Stop trading for the day', 'Change your strategy immediately', 'Trade more frequently'], correct: 1 },
      { q: 'Why do elite traders use routines?', options: ['To maximize trade frequency', 'To eliminate the need for analysis', 'To execute consistently regardless of emotions', 'To predict market direction'], correct: 2 },
    ],
    completed: false,
  },
  {
    id: 'l6',
    module: 'Strategy Development',
    title: 'Creating a Profitable Trading Edge',
    duration: '10 min',
    difficulty: 'Advanced',
    content: `A trading "edge" is a condition or set of conditions that gives you a statistical advantage over a large number of trades.

**To develop an edge, you need:**
1. **A specific entry trigger** — "I buy when price closes above the 20 EMA on the 4H chart after a pullback to support"
2. **A defined stop loss** — "Stop is placed below the previous swing low"
3. **A take profit rule** — "Target is 2x the risk (1:2 RR minimum)"
4. **Defined market conditions** — "Only trade during London/NY sessions in trending markets"

**How to validate your edge:**
• Backtest on at least 100 historical trades
• Forward test in a paper trading account (like this one!)
• Track win rate, average win, average loss, and profit factor

**Profit Factor = Total Profits / Total Losses**
A profit factor above 1.5 = strong edge
Below 1.0 = losing strategy

Your edge is worthless if you don't execute it consistently. **Execution IS the edge.**`,
    quiz: [
      { q: 'What profit factor indicates a strong trading edge?', options: ['Above 0.5', 'Above 1.0', 'Above 1.5', 'Above 2.0'], correct: 2 },
      { q: 'Why is a paper trading account like MindTrade important for edge development?', options: ['To trade with real money risk-free', 'To forward-test strategies without real financial risk', 'To get social media followers', 'To learn chart patterns only'], correct: 1 },
    ],
    completed: false,
  },
];

export default function AcademyPanel() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);

  const modules = [...new Set(LESSONS.map(l => l.module))];

  function startLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setQuizMode(false);
    setQuizAnswer({});
    setQuizSubmitted(false);
    setQuizIdx(0);
  }

  function submitQuiz() {
    setQuizSubmitted(true);
    if (selectedLesson) {
      const allCorrect = selectedLesson.quiz.every((q, i) => quizAnswer[i] === q.correct);
      if (allCorrect) setCompleted(prev => new Set([...prev, selectedLesson.id]));
    }
  }

  const difficultyColor = (d: string) => d === 'Beginner' ? 'var(--green)' : d === 'Intermediate' ? 'var(--yellow)' : 'var(--red)';
  const difficultyBg = (d: string) => d === 'Beginner' ? 'rgba(16,185,129,0.1)' : d === 'Intermediate' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  if (selectedLesson) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Back button + header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setSelectedLesson(null)}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>{selectedLesson.module}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLesson.title}</div>
          </div>
          {completed.has(selectedLesson.id) && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)' }}>
              <CheckCircle size={16} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Completed</span>
            </div>
          )}
        </div>

        <div className="scroll-y" style={{ flex: 1 }}>
          {!quizMode ? (
            <div>
              {/* Content */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {selectedLesson.content.split(/\*\*(.*?)\*\*/).map((part, i) =>
                    i % 2 === 1
                      ? <strong key={i} style={{ color: 'var(--accent)', fontWeight: 700 }}>{part}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setQuizMode(true)} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Take Quiz to Complete Lesson →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Question {quizIdx + 1} of {selectedLesson.quiz.length}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.5 }}>
                  {selectedLesson.quiz[quizIdx].q}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedLesson.quiz[quizIdx].options.map((opt, i) => {
                    const isSelected = quizAnswer[quizIdx] === i;
                    const isCorrect = quizSubmitted && i === selectedLesson.quiz[quizIdx].correct;
                    const isWrong = quizSubmitted && isSelected && !isCorrect;
                    return (
                      <button
                        key={i}
                        disabled={quizSubmitted}
                        onClick={() => setQuizAnswer(prev => ({ ...prev, [quizIdx]: i }))}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1px solid',
                          borderColor: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--border)',
                          background: isCorrect ? 'rgba(16,185,129,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                          color: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: quizSubmitted ? 'default' : 'pointer',
                          fontSize: 13,
                          transition: 'all 0.2s',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {String.fromCharCode(65 + i)}. {opt}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  {!quizSubmitted ? (
                    <button
                      onClick={submitQuiz}
                      disabled={quizAnswer[quizIdx] === undefined}
                      className="btn btn-primary"
                      style={{ opacity: quizAnswer[quizIdx] === undefined ? 0.5 : 1 }}
                    >
                      Submit Answer
                    </button>
                  ) : (
                    quizIdx < selectedLesson.quiz.length - 1 ? (
                      <button onClick={() => { setQuizIdx(i => i + 1); setQuizSubmitted(false); }} className="btn btn-primary">
                        Next Question →
                      </button>
                    ) : (
                      <button onClick={() => setSelectedLesson(null)} className="btn btn-primary">
                        ✅ Finish Lesson
                      </button>
                    )
                  )}
                  <button onClick={() => { setQuizMode(false); }} className="btn btn-ghost">
                    Re-read
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>AI Learning Academy</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Personalized curriculum based on your trading weaknesses</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{completed.size}/{LESSONS.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Completed</div>
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1 }}>
        {modules.map(module => (
          <div key={module} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={14} /> {module}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LESSONS.filter(l => l.module === module).map((lesson, i, arr) => {
                const isUnlocked = i === 0 || completed.has(arr[i - 1].id);
                const isDone = completed.has(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    onClick={() => isUnlocked && startLesson(lesson)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid',
                      background: isDone ? 'rgba(16,185,129,0.05)' : isUnlocked ? 'var(--bg-card)' : 'rgba(255,255,255,0.01)',
                      borderColor: isDone ? 'rgba(16,185,129,0.3)' : isUnlocked ? 'var(--border)' : 'rgba(255,255,255,0.03)',
                      cursor: isUnlocked ? 'pointer' : 'default',
                      filter: isUnlocked ? 'none' : 'saturate(0.3) brightness(0.6)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (isUnlocked) (e.currentTarget as HTMLDivElement).style.borderColor = isDone ? 'rgba(16,185,129,0.5)' : 'var(--border-bright)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isDone ? 'rgba(16,185,129,0.3)' : isUnlocked ? 'var(--border)' : 'rgba(255,255,255,0.03)'; }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: isDone ? 'rgba(16,185,129,0.15)' : isUnlocked ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid', borderColor: isDone ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                    }}>
                      {isDone ? <CheckCircle size={18} color="var(--green)" /> : isUnlocked ? <Play size={16} color="var(--accent)" /> : <Lock size={16} color="var(--text-muted)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? 'var(--green)' : 'var(--text-primary)' }}>
                          {lesson.title}
                        </div>
                        <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: difficultyBg(lesson.difficulty), color: difficultyColor(lesson.difficulty), fontWeight: 700, flexShrink: 0 }}>
                          {lesson.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱ {lesson.duration} · {lesson.quiz.length} quiz questions</div>
                    </div>
                    {isDone && <CheckCircle size={16} color="var(--green)" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

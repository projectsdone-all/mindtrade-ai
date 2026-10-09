import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import type { Settings } from '../../engine/broker';

const Switch = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => <button className={`switch ${on ? 'on' : ''}`} onClick={() => set(!on)} aria-pressed={on} />;

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, resetAccount, balance } = useTrading();
  const [confirmReset, setConfirmReset] = useState<number | null>(null);
  const up = (p: Partial<Settings>) => updateSettings(p);
  const num = (k: keyof Settings, label: string, desc: string, suffix: string, opts: number[]) => (
    <div className="set-row">
      <div><div className="n">{label}</div><div className="d">{desc}</div></div>
      <div className="seg" style={{ flexShrink: 0 }}>
        {opts.map(o => <button key={o} className={settings[k] === o ? 'on' : ''} onClick={() => up({ [k]: o } as Partial<Settings>)}>{o === 0 ? 'Off' : `${o}${suffix}`}</button>)}
      </div>
    </div>
  );
  const sw = (k: keyof Settings, label: string, desc: string) => (
    <div className="set-row"><div><div className="n">{label}</div><div className="d">{desc}</div></div><Switch on={!!settings[k]} set={v => up({ [k]: v } as Partial<Settings>)} /></div>
  );
  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card wide">
        <div className="modal-head"><h3>⚙️ Settings</h3><button className="icon-act" onClick={onClose}><X size={14} /></button></div>
        <div className="modal-body">
          <div className="panel-title">Account</div>
          <div className="set-row">
            <div><div className="n">Leverage</div><div className="d">Account maximum. Each market also has its own cap (crypto 1:10, stocks 1:5, indices 1:20…)</div></div>
            <div className="seg">{[10, 30, 100, 500].map(l => <button key={l} className={settings.leverage === l ? 'on' : ''} onClick={() => up({ leverage: l })}>1:{l}</button>)}</div>
          </div>
          {sw('commissionEnabled', 'Realistic commissions', 'Charge per-lot commission like an ECN broker (forex $3.50/lot/side, gold $3, stocks 1¢/share)')}
          <div className="set-row">
            <div><div className="n">Reset account</div><div className="d">Current balance ${balance.toLocaleString()}. Start over with a fresh paper account.</div></div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1000, 10000, 100000].map(v => <button key={v} className="chip-btn" onClick={() => setConfirmReset(v)}>${v.toLocaleString()}</button>)}
            </div>
          </div>
          {confirmReset !== null && (
            <div className="warning-banner" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12 }}>Erase all positions, history and journal and restart with ${confirmReset.toLocaleString()}?</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" onClick={() => setConfirmReset(null)}>Cancel</button>
                <button className="btn" style={{ background: 'var(--red)', color: '#fff', border: 0 }} onClick={() => { resetAccount(confirmReset); setConfirmReset(null); onClose(); }}><RotateCcw size={12} /> Reset</button>
              </span>
            </div>
          )}

          <div className="divider" />
          <div className="panel-title">Discipline guard — your trading rules</div>
          {num('dailyLossLimitPct', 'Daily loss limit', 'Blocks new trades once today\'s loss reaches this % of the day\'s starting equity', '%', [0, 2, 5, 10])}
          {num('maxTradesPerDay', 'Max trades per day', 'Stops over-trading', '', [0, 3, 5, 10, 20])}
          {num('maxRiskPerTradePct', 'Max risk per trade', 'Blocks trades whose stop-loss risk exceeds this % of equity', '%', [0, 1, 2, 5])}
          {num('maxLotPerTrade', 'Max volume per trade', 'Hard cap on lot size', '', [0, 0.5, 1, 5])}
          {sw('requireStopLoss', 'Require stop loss', 'Every order must have a stop loss')}
          {sw('tiltGuard', 'Tilt guard', 'Locks trading with a breathing exercise after a losing streak or when revenge trading is detected')}
          {settings.tiltGuard && <>
            {num('tiltLosses', 'Losing streak that triggers it', '', ' losses', [2, 3, 4, 5])}
            {num('cooldownMinutes', 'Cool-down length', '', ' min', [1, 3, 5, 15])}
          </>}

          <div className="divider" />
          <div className="panel-title">Trading experience</div>
          {sw('moodCheck', 'Intent & mood check', 'Ask "why this trade?" and how you feel before each order — powers the emotion-cost analytics')}
          {sw('oneClick', 'One-click trading', 'BUY / SELL buttons execute market orders instantly, no confirmation')}
          <div className="d" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ⌨️ Shortcuts: <b>Shift+B</b> buy · <b>Shift+S</b> sell (minimum size, market) · <b>Shift+X</b> close all · <b>Space</b> pause / resume market · <b>1–5</b> switch tabs
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { simulator } from '../../engine/simulator';
import { INTENTS, MOODS, grossPnl, marginFor, pipValue, commissionFor, effectiveLeverage, normalizeLots, type Intent, type Mood, type OrderKind } from '../../engine/broker';
import { fmtPrice, fmtUsd, lotLabel } from '../../lib/format';
import { AlertTriangle, ShieldCheck, Wand2, Lock } from 'lucide-react';

type StopMode = 'price' | 'pips';
type SizeMode = 'lots' | 'risk';

function CooldownCard() {
  const { cooldownUntil, endCooldown } = useTrading();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  const left = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const phase = Math.floor((now / 1000) % 8) < 4 ? 'Breathe in…' : 'Breathe out…';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '10px 4px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--yellow)', fontWeight: 700, fontSize: 12 }}><Lock size={13} /> TILT GUARD ACTIVE</div>
      <div className="breathe">{phase}</div>
      <div className="font-mono" style={{ fontSize: 22, fontWeight: 700 }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        You hit a losing streak. Most blown accounts start with the next trade after this moment. Follow the circle, slow your breathing, and come back with a plan.
      </div>
      {left < 60 && (
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={endCooldown}>I'm calm — resume (logged as rule override)</button>
      )}
    </div>
  );
}

function OrderTicket() {
  const { selectedSymbol, prices, placeOrder, equity, freeMargin, settings, cooldownUntil, ruleCheck, todaysTrades } = useTrading();
  const asset = simulator.getAsset(selectedSymbol)!;
  const q = prices[selectedSymbol];

  const [kind, setKind] = useState<OrderKind>('market');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [sizeMode, setSizeMode] = useState<SizeMode>('lots');
  const [size, setSize] = useState(String(asset.minLot));
  const [riskPct, setRiskPct] = useState('1');
  const [orderPrice, setOrderPrice] = useState('');
  const [expiry, setExpiry] = useState(0);
  const [stopMode, setStopMode] = useState<StopMode>('pips');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [trail, setTrail] = useState('');
  const [intent, setIntent] = useState<Intent | undefined>();
  const [mood, setMood] = useState<Mood | undefined>();
  const [confirmSig, setConfirmSig] = useState('');
  const [error, setError] = useState('');

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const locked = now < cooldownUntil;
  const mkt = q ? (direction === 'buy' ? q.ask : q.bid) : 0;
  const entry = kind === 'market' ? mkt : parseFloat(orderPrice) || mkt;
  const pip = asset.pip;
  const sgn = direction === 'buy' ? 1 : -1;

  const slPrice = useMemo(() => {
    const v = parseFloat(sl); if (!v) return undefined;
    return stopMode === 'price' ? v : +(entry - sgn * v * pip).toFixed(asset.digits);
  }, [sl, stopMode, entry, sgn, pip, asset.digits]);
  const tpPrice = useMemo(() => {
    const v = parseFloat(tp); if (!v) return undefined;
    return stopMode === 'price' ? v : +(entry + sgn * v * pip).toFixed(asset.digits);
  }, [tp, stopMode, entry, sgn, pip, asset.digits]);

  // position sizing
  const lots = useMemo(() => {
    if (sizeMode === 'lots') return parseFloat(size) || 0;
    if (!slPrice) return 0;
    const riskUsd = equity * (parseFloat(riskPct) || 0) / 100;
    const perLot = Math.abs(grossPnl(direction, entry, slPrice, selectedSymbol, 1)) + commissionFor(selectedSymbol, 1, settings.commissionEnabled);
    return perLot > 0 ? normalizeLots(selectedSymbol, riskUsd / perLot) : 0;
  }, [sizeMode, size, slPrice, equity, riskPct, direction, entry, selectedSymbol, settings.commissionEnabled]);

  const margin = marginFor(selectedSymbol, lots, entry, settings.leverage);
  const comm = commissionFor(selectedSymbol, lots, settings.commissionEnabled);
  const riskUsd = slPrice ? Math.abs(grossPnl(direction, entry, slPrice, selectedSymbol, lots)) + comm : undefined;
  const rewardUsd = tpPrice ? Math.abs(grossPnl(direction, entry, tpPrice, selectedSymbol, lots)) - comm : undefined;
  const rr = riskUsd && rewardUsd ? rewardUsd / riskUsd : undefined;
  const riskOfEquity = riskUsd ? riskUsd / equity * 100 : undefined;
  const violations = ruleCheck({ symbol: selectedSymbol, size: lots, stopLoss: slPrice, direction, entry });
  const softOnly = violations.length > 0 && violations.every(v => !v.startsWith('Tilt') && !v.startsWith('Daily loss'));
  const needTags = settings.moodCheck && (!intent || !mood);
  const spreadPips = q ? (q.spread / pip) : 0;

  function smartStops() {
    const atr = simulator.getATR(selectedSymbol, '5m') || asset.spread * 20;
    const slDist = Math.max(atr * 1.5, asset.spread * 3);
    if (stopMode === 'pips') {
      const p = Math.round(slDist / pip * 10) / 10;
      setSl(String(p)); setTp(String(Math.round(p * 2 * 10) / 10));
    } else {
      setSl((entry - sgn * slDist).toFixed(asset.digits)); setTp((entry + sgn * slDist * 2).toFixed(asset.digits));
    }
  }

  function submit(dirOverride?: 'buy' | 'sell', override = false) {
    setError('');
    const dir = dirOverride ?? direction;
    if (needTags) { setError('Tag your intent and mood first — honesty here is what makes the AI coach useful.'); return; }
    if (!lots) { setError(sizeMode === 'risk' ? 'Set a stop loss so we can size the position by risk.' : 'Enter a volume.'); return; }
    if (!settings.oneClick && !confirm && !override) { setConfirm(true); return; }
    const res = placeOrder({
      symbol: selectedSymbol, direction: dir, kind, size: lots,
      price: kind === 'market' ? undefined : parseFloat(orderPrice),
      stopLoss: slPrice, takeProfit: tpPrice,
      trailingDistance: parseFloat(trail) ? parseFloat(trail) * pip : undefined,
      expiresInMin: expiry || undefined, intent, mood,
    }, override);
    setConfirm(false);
    if (!res.ok) { setError(res.error || 'Order rejected'); return; }
    setSl(''); setTp(''); setTrail(''); setOrderPrice(''); setIntent(undefined); setMood(undefined);
  }

  const sig = `${kind}|${direction}|${lots}|${slPrice}|${tpPrice}|${orderPrice}`;
  const confirm = confirmSig === sig;
  const setConfirm = (v: boolean) => setConfirmSig(v ? sig : '');
  const dirColor = direction === 'buy' ? 'var(--green)' : 'var(--red)';
  const kindLabel = kind === 'market' ? 'Market' : `${direction === 'buy' ? 'Buy' : 'Sell'} ${kind === 'limit' ? 'Limit' : 'Stop'}`;

  return (
    <div className="panel scroll-y" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, flex: '0 1 auto', maxHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedSymbol}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Spread {spreadPips.toFixed(1)} {asset.category === 'forex' ? 'pips' : 'ticks'} · 1:{effectiveLeverage(selectedSymbol, settings.leverage)}
          </div>
        </div>
        <span className="badge badge-blue">{todaysTrades} today</span>
      </div>

      {locked ? <CooldownCard /> : (<>
        <div className="seg">
          {(['market', 'limit', 'stop'] as const).map(k => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)} style={{ textTransform: 'capitalize' }}>{k}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`quote-btn sell ${direction === 'sell' ? 'on' : ''}`} onClick={() => settings.oneClick && kind === 'market' ? (setDirection('sell'), submit('sell')) : setDirection('sell')}>
            <span className="lbl">SELL</span><span className="px">{fmtPrice(selectedSymbol, q?.bid)}</span>
          </button>
          <button className={`quote-btn buy ${direction === 'buy' ? 'on' : ''}`} onClick={() => settings.oneClick && kind === 'market' ? (setDirection('buy'), submit('buy')) : setDirection('buy')}>
            <span className="lbl">BUY</span><span className="px">{fmtPrice(selectedSymbol, q?.ask)}</span>
          </button>
        </div>
        {settings.oneClick && kind === 'market' && <div style={{ fontSize: 10, color: 'var(--yellow)', textAlign: 'center', marginTop: -4 }}>⚡ One-click trading is ON — buttons execute instantly</div>}

        {kind !== 'market' && (
          <div>
            <div className="field-label">
              <span>{kindLabel} price</span>
              <button className="chip-btn" onClick={() => setOrderPrice(String(mkt))}>Use {direction === 'buy' ? 'ask' : 'bid'}</button>
            </div>
            <input className="input-field font-mono" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder={fmtPrice(selectedSymbol, mkt)} inputMode="decimal" />
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>
              {kind === 'limit' ? (direction === 'buy' ? 'Buys if price DROPS to this level' : 'Sells if price RISES to this level') : (direction === 'buy' ? 'Buys if price BREAKS ABOVE this level' : 'Sells if price BREAKS BELOW this level')}
            </div>
            <div className="seg" style={{ marginTop: 6 }}>
              {[[0, 'GTC'], [15, '15m'], [60, '1h'], [240, '4h'], [1440, '1d']].map(([m, l]) => (
                <button key={m} className={expiry === m ? 'on' : ''} onClick={() => setExpiry(m as number)}>{l}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="field-label">
            <span>{sizeMode === 'lots' ? `Volume (${lotLabel(selectedSymbol)})` : 'Risk % of equity'}</span>
            <div className="seg" style={{ padding: 1 }}>
              <button className={sizeMode === 'lots' ? 'on' : ''} onClick={() => setSizeMode('lots')} style={{ padding: '2px 6px' }}>Lots</button>
              <button className={sizeMode === 'risk' ? 'on' : ''} onClick={() => setSizeMode('risk')} style={{ padding: '2px 6px' }}>Risk %</button>
            </div>
          </div>
          {sizeMode === 'lots' ? (
            <>
              <div className="stepper">
                <button onClick={() => setSize(String(Math.max(asset.minLot, +((parseFloat(size) || 0) - asset.lotStep).toFixed(4))))}>−</button>
                <input className="input-field font-mono" value={size} onChange={e => setSize(e.target.value)} inputMode="decimal" />
                <button onClick={() => setSize(String(+((parseFloat(size) || 0) + asset.lotStep).toFixed(4)))}>+</button>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                {[1, 5, 10, 50].map(m => { const v = +(asset.minLot * m).toFixed(4); return (
                  <button key={m} className={`chip-btn ${parseFloat(size) === v ? 'on' : ''}`} style={{ flex: 1 }} onClick={() => setSize(String(v))}>{v}</button>
                ); })}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 4 }}>
                {['0.5', '1', '2'].map(v => <button key={v} className={`chip-btn ${riskPct === v ? 'on' : ''}`} style={{ flex: 1 }} onClick={() => setRiskPct(v)}>{v}%</button>)}
                <input className="input-field font-mono" style={{ width: 64, padding: '4px 6px' }} value={riskPct} onChange={e => setRiskPct(e.target.value)} />
              </div>
              <div style={{ fontSize: 10.5, color: slPrice ? 'var(--text-secondary)' : 'var(--yellow)', marginTop: 4 }}>
                {slPrice ? <>Auto size: <b className="font-mono" style={{ color: 'var(--text-primary)' }}>{lots}</b> {lotLabel(selectedSymbol)} risking {fmtUsd(equity * (parseFloat(riskPct) || 0) / 100)}</> : 'Set a stop loss — size is calculated from it'}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="field-label">
            <span>Stop loss / Take profit</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="chip-btn" title="ATR-based stop with a 1:2 target" onClick={smartStops}><Wand2 size={10} style={{ display: 'inline', marginRight: 2 }} />Smart</button>
              <div className="seg" style={{ padding: 1 }}>
                <button className={stopMode === 'pips' ? 'on' : ''} onClick={() => { setStopMode('pips'); setSl(''); setTp(''); }} style={{ padding: '2px 6px' }}>Pips</button>
                <button className={stopMode === 'price' ? 'on' : ''} onClick={() => { setStopMode('price'); setSl(''); setTp(''); }} style={{ padding: '2px 6px' }}>Price</button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <input className="input-field font-mono" value={sl} onChange={e => setSl(e.target.value)} placeholder={stopMode === 'pips' ? 'SL pips' : 'SL price'} style={{ borderColor: sl ? 'rgba(239,83,80,.5)' : undefined }} inputMode="decimal" />
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--red)', marginTop: 2, minHeight: 13 }}>{slPrice && stopMode === 'pips' ? fmtPrice(selectedSymbol, slPrice) : ''}{riskUsd ? ` −${fmtUsd(riskUsd, { dp: 0 })}` : ''}</div>
            </div>
            <div>
              <input className="input-field font-mono" value={tp} onChange={e => setTp(e.target.value)} placeholder={stopMode === 'pips' ? 'TP pips' : 'TP price'} style={{ borderColor: tp ? 'rgba(38,166,154,.5)' : undefined }} inputMode="decimal" />
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--green)', marginTop: 2, minHeight: 13 }}>{tpPrice && stopMode === 'pips' ? fmtPrice(selectedSymbol, tpPrice) : ''}{rewardUsd ? ` +${fmtUsd(rewardUsd, { dp: 0 })}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', flexShrink: 0 }}>Trailing stop</span>
            <input className="input-field font-mono" value={trail} onChange={e => setTrail(e.target.value)} placeholder="pips (optional)" style={{ padding: '4px 8px', fontSize: 11 }} inputMode="decimal" />
          </div>
        </div>

        {settings.moodCheck && (
          <div>
            <div className="field-label"><span>Why this trade?</span>{intent && INTENTS.find(i => i.id === intent)?.emotional && <span style={{ color: 'var(--yellow)', textTransform: 'none' }}>emotional trigger</span>}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {INTENTS.map(i => (
                <button key={i.id} className={`chip-btn ${intent === i.id ? 'on' : ''}`} title={i.label} onClick={() => setIntent(i.id)}>{i.emoji} {i.id}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {MOODS.map(m => (
                <button key={m.id} className={`chip-btn ${mood === m.id ? 'on' : ''}`} title={m.label} style={{ flex: 1, fontSize: 15, padding: '2px 0' }} onClick={() => setMood(m.id)}>{m.emoji}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 6, padding: '6px 8px' }}>
          <div className="kv"><span>Margin required</span><b style={{ color: margin > freeMargin ? 'var(--red)' : undefined }}>{fmtUsd(margin)}</b></div>
          <div className="kv"><span>Free margin</span><b>{fmtUsd(freeMargin)}</b></div>
          <div className="kv"><span>Pip value</span><b>{fmtUsd(pipValue(selectedSymbol, lots))}</b></div>
          {comm > 0 && <div className="kv"><span>Commission (round turn)</span><b>{fmtUsd(comm)}</b></div>}
          {riskOfEquity !== undefined && <div className="kv"><span>Risk of equity</span><b style={{ color: riskOfEquity > 2 ? 'var(--red)' : 'var(--green)' }}>{riskOfEquity.toFixed(2)}%</b></div>}
          {rr !== undefined && <div className="kv"><span>Reward : Risk</span><b style={{ color: rr >= 1.5 ? 'var(--green)' : 'var(--yellow)' }}>{rr.toFixed(2)} R</b></div>}
        </div>

        {violations.length > 0 && (
          <div className="warning-banner" style={{ padding: '7px 9px', flexDirection: 'column', alignItems: 'stretch', gap: 3 }}>
            {violations.map(v => <div key={v} style={{ fontSize: 11, color: 'var(--red)', display: 'flex', gap: 5 }}><AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />{v}</div>)}
          </div>
        )}
        {!slPrice && !settings.requireStopLoss && <div style={{ fontSize: 10.5, color: 'var(--yellow)', display: 'flex', gap: 4 }}><AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />No stop loss — this lowers your Discipline score.</div>}
        {error && <div style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', padding: '6px 8px', borderRadius: 5 }}>{error}</div>}

        {confirm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11.5, textAlign: 'center' }}>
              {kindLabel} <b style={{ color: dirColor }}>{direction.toUpperCase()}</b> {lots} {selectedSymbol} @ <span className="font-mono">{kind === 'market' ? 'market' : fmtPrice(selectedSymbol, parseFloat(orderPrice))}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={() => submit()} style={{ flex: 1, background: dirColor, color: '#fff', border: 0, padding: 10, fontWeight: 700 }}>Confirm</button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        ) : violations.length > 0 && softOnly ? (
          <button className="btn btn-ghost" style={{ padding: 10, color: 'var(--yellow)' }} onClick={() => submit(undefined, true)}>Break my rule and place anyway (logged)</button>
        ) : (
          <button className="btn" disabled={violations.length > 0} onClick={() => submit()}
            style={{ padding: 11, border: 0, fontWeight: 700, fontSize: 13, color: '#fff', background: violations.length ? 'var(--bg-input)' : dirColor, boxShadow: violations.length ? 'none' : `0 4px 15px ${direction === 'buy' ? 'var(--green-glow)' : 'var(--red-glow)'}`, cursor: violations.length ? 'not-allowed' : 'pointer' }}>
            {kind === 'market' ? `${direction === 'buy' ? 'Buy' : 'Sell'} ${lots || ''} @ Market` : `Place ${kindLabel}`}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', justifyContent: 'center' }}><ShieldCheck size={11} /> Paper trading — no real money</div>
      </>)}
    </div>
  );
}

export default function OrderPanel() {
  const { selectedSymbol } = useTrading();
  return <OrderTicket key={selectedSymbol} />;
}

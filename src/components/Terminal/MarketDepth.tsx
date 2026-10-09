import { useTrading } from '../../context/TradingContext';
import { simulator } from '../../engine/simulator';
import { fmtPrice } from '../../lib/format';

export default function MarketDepth() {
  const { selectedSymbol, prices } = useTrading();
  const book = simulator.getOrderBook(selectedSymbol);
  const q = prices[selectedSymbol];
  const bids = book.bids.slice(0, 8), asks = book.asks.slice(0, 8);
  const maxTotal = Math.max(1, ...bids.map(b => b.total), ...asks.map(a => a.total));
  const bidVol = bids.reduce((s, b) => s + b.size, 0), askVol = asks.reduce((s, a) => s + a.size, 0);
  const bidPct = Math.round(bidVol / Math.max(1e-9, bidVol + askVol) * 100);

  const Row = ({ price, size, total, side }: { price: number; size: number; total: number; side: 'bid' | 'ask' }) => (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', padding: '2px 12px', minHeight: 19 }}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(total / maxTotal) * 100}%`, background: side === 'bid' ? 'rgba(38,166,154,0.09)' : 'rgba(239,83,80,0.09)' }} />
      <div className="font-mono" style={{ fontSize: 10.5, color: side === 'bid' ? 'var(--green)' : 'var(--red)', position: 'relative' }}>{fmtPrice(selectedSymbol, price)}</div>
      <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)', textAlign: 'right', position: 'relative' }}>{size.toFixed(2)}</div>
      <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'right', position: 'relative' }}>{total.toFixed(1)}</div>
    </div>
  );

  return (
    <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 140 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panel-title">Market Depth</div>
        <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Spread {fmtPrice(selectedSymbol, q?.spread)}</div>
      </div>
      <div className="scroll-y" style={{ flex: 1 }}>
        {[...asks].reverse().map((l, i) => <Row key={'a' + i} {...l} side="ask" />)}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 4, background: 'rgba(41,98,255,0.07)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#8fb0ff' }}>{fmtPrice(selectedSymbol, q?.price)}</span>
        </div>
        {bids.map((l, i) => <Row key={'b' + i} {...l} side="bid" />)}
      </div>
      <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span style={{ color: 'var(--green)' }}>Bids {bidPct}%</span><span>Order-flow pressure</span><span style={{ color: 'var(--red)' }}>{100 - bidPct}% Asks</span>
        </div>
        <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${bidPct}%`, background: 'var(--green)', transition: 'width .4s' }} />
          <div style={{ flex: 1, background: 'var(--red)' }} />
        </div>
      </div>
    </div>
  );
}

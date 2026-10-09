import { useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { simulator } from '../../engine/simulator';
import { fmtPrice } from '../../lib/format';

function Spark({ symbol, up }: { symbol: string; up: boolean }) {
  const c = simulator.getCandles(symbol, '5m').slice(-36);
  if (c.length < 2) return null;
  const vals = c.map(x => x.close);
  const min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 60},${18 - ((v - min) / rng) * 16}`).join(' ');
  return <svg width="60" height="20" viewBox="0 0 60 20" style={{ flexShrink: 0 }}><polyline points={pts} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="1.3" /></svg>;
}

export default function WatchList() {
  const { prices, selectedSymbol, setSelectedSymbol, positions } = useTrading();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('mindtrade_favs') || '[]'); } catch { return []; } });
  const toggleFav = (s: string) => { const n = favs.includes(s) ? favs.filter(x => x !== s) : [...favs, s]; setFavs(n); localStorage.setItem('mindtrade_favs', JSON.stringify(n)); };
  const cats = ['all', '★', 'crypto', 'forex', 'stock', 'commodity', 'index'];
  const assets = simulator.getAssets();
  const list = useMemo(() => assets.filter(a =>
    (a.symbol + a.name).toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === '★' ? favs.includes(a.symbol) : a.category === filter))
  ), [assets, search, filter, favs]);
  const openSyms = new Set(positions.map(p => p.symbol));

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
        <div className="panel-title" style={{ marginBottom: 8 }}>Watchlist</div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input-field" style={{ fontSize: 12, padding: '6px 8px 6px 26px' }} />
        </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {cats.map(c => <button key={c} className={`chip-btn ${filter === c ? 'on' : ''}`} style={{ textTransform: 'capitalize', padding: '2px 6px' }} onClick={() => setFilter(c)}>{c}</button>)}
        </div>
      </div>
      <div className="scroll-y" style={{ flex: 1 }}>
        {list.length === 0 && <div style={{ padding: 16, fontSize: 11.5, color: 'var(--text-secondary)', textAlign: 'center' }}>{filter === '★' ? 'Star a symbol to add it here' : 'No matches'}</div>}
        {list.map(a => {
          const q = prices[a.symbol];
          const up = (q?.changePct ?? 0) >= 0;
          const sel = a.symbol === selectedSymbol;
          return (
            <div key={a.symbol} className={`watchlist-row ${sel ? 'selected' : ''}`} onClick={() => setSelectedSymbol(a.symbol)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
              <button onClick={e => { e.stopPropagation(); toggleFav(a.symbol); }} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: favs.includes(a.symbol) ? '#ffb74d' : 'var(--text-muted)' }} aria-label="Favourite"><Star size={12} fill={favs.includes(a.symbol) ? '#ffb74d' : 'none'} /></button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.symbol}</span>
                  {openSyms.has(a.symbol) && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} title="Open position" />}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              </div>
              <Spark symbol={a.symbol} up={up} />
              <div style={{ textAlign: 'right', minWidth: 64 }}>
                <div className="font-mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{fmtPrice(a.symbol, q?.price)}</div>
                <div className="font-mono" style={{ fontSize: 10, color: up ? 'var(--green)' : 'var(--red)' }}>{up ? '+' : ''}{(q?.changePct ?? 0).toFixed(2)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

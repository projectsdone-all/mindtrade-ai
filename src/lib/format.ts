import { simulator } from '../engine/simulator';

export const fmtPrice = (symbol: string, v?: number) => simulator.format(symbol, v);
export const fmtUsd = (v: number, opts: { sign?: boolean; dp?: number } = {}) => {
  const dp = opts.dp ?? 2;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const zero = Number(Math.abs(v).toFixed(dp)) === 0;
  const sign = zero ? '' : v < 0 ? '-' : opts.sign && v > 0 ? '+' : '';
  return `${sign}$${s}`;
};
export const pnlColor = (v: number) => (v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-secondary)');
export const elapsed = (ms: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};
export const duration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};
export const lotLabel = (symbol: string) => {
  const a = simulator.getAsset(symbol);
  if (!a) return 'lots';
  return a.category === 'stock' ? 'shares' : a.category === 'crypto' && a.lotSize === 1 ? 'coins' : a.category === 'index' ? 'contracts' : 'lots';
};
export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

# MindTrade AI — Emotion-Aware Paper Trading

A paper-trading terminal that trains your trading psychology. Start with $100,000 of virtual money. No backend, no sign-up — everything is saved in the browser.

## Demo login

The login page opens with the details already filled in — just press **Sign in**.

- Email: `trader@mindtrade.ai`
- Password: `demo1234`

Use the log-out button (top right) to return to the login page.

## How trades work (like MT5 / cTrader)

1. Market BUY fills at the ask, SELL at the bid — the spread is a real cost
2. Open positions are valued at the price you could close at (bid for longs, ask for shorts)
3. Buy/Sell Limit and Buy/Sell Stop pending orders, with expiry (GTC, 15m, 1h, 4h, 1d)
4. Stop loss, take profit and trailing stop, checked on every tick and validated for the correct side
5. Margin = position value ÷ leverage; orders are rejected without enough free margin
6. Margin call at 100% margin level, automatic stop-out at 50%
7. Per-lot commissions (forex $3.50/lot/side, gold & oil $3, stocks 1¢/share) — can be switched off
8. Slippage on news spikes; partial close, close half, break-even, close all / winners / losers
9. Balance, equity, free margin and margin level update exactly like a real account

## Unique features

1. Tilt guard — locks the order panel with a breathing exercise after a losing streak or when revenge trading is detected
2. Intent & mood tagging — say why you are trading (plan, breakout, FOMO, revenge, boredom…) and how you feel
3. Emotion cost report — Analytics shows how much your emotional trades made or lost vs planned trades
4. Discipline rules — daily loss limit, max trades per day, max risk per trade, max lot size, mandatory stop loss
5. Market replay speed — pause, 1×, 5×, 20×, 60×
6. News shocks — random headlines move prices, widen spreads and cause slippage; trigger one on demand
7. Smart stops — ATR-based stop loss with a 2R target in one click
8. Risk-% sizing — enter the % of equity to risk and the lot size is calculated from your stop
9. "Left on the table" and "If held now" (ghost P&L) for every closed trade, plus MFE / MAE tracking
10. Analytics — equity curve, profit factor, expectancy, average R, max drawdown, streaks, P&L by intent / mood / symbol
11. Chart — 1m/5m/15m/1H/4H, candles / Heikin-Ashi / line, SMA, EMA, Bollinger Bands, volume, RSI, trend lines, levels, boxes, price alerts, zoom & pan, candle countdown
12. 13 markets — crypto, forex, stocks, gold, oil, indices — each with realistic spread, contract size and leverage cap
13. Keyboard shortcuts — Shift+B buy, Shift+S sell, Shift+X close all, Space pause, 1–8 switch tabs

## Project structure

1. src/engine/simulator.ts — market simulator (prices, candles, order book, news)
2. src/engine/broker.ts — order execution, margin, SL/TP, pending orders, rules
3. src/engine/emotionEngine.ts — psychology scoring and coaching
4. src/context/TradingContext.tsx — connects the engines to React
5. src/components — UI

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Custom market simulator and broker engine (no external APIs)

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173

To check the production build:

```bash
npm run build
npm run preview
```

## Push to GitHub

1. Create an empty repository on GitHub named `mindtrade-ai` (no README, no .gitignore)
2. Open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/mindtrade-ai.git
git push -u origin main
```

3. For later changes:

```bash
git add .
git commit -m "Describe your change"
git push
```

## Deploy on Vercel

1. Go to https://vercel.com → **Add New → Project**
2. Import the GitHub repository
3. Framework preset: **Vite** (detected automatically) — build command `npm run build`, output folder `dist`
4. Click **Deploy** — no environment variables are needed

Every `git push` to `main` redeploys the site automatically.

## Data storage

Everything is saved in the visitor's own browser (localStorage), so each device has its own data. No backend, no database and no sign-up service are needed. Prices are simulated — no real money and no real market data.

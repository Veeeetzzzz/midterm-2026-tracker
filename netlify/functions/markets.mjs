/**
 * Netlify Function — live, unauthenticated market snapshots.
 * Sources: Polymarket Gamma API and Kalshi public market-data API.
 * Failures are explicit, never replaced with fabricated or silently stale prices.
 */
const PBASE = 'https://gamma-api.polymarket.com/events?slug=';
const KBASE = 'https://api.elections.kalshi.com/trade-api/v2';
const PM_SLUGS = {
  house: 'which-party-will-win-the-house-in-2026',
  senate: 'which-party-will-win-the-senate-in-2026',
  balance: 'balance-of-power-2026-midterms'
};
const K_EVENTS = {
  house: 'CONTROLH-2026',
  senate: 'CONTROLS-2026',
  balance: 'KXBALANCEPOWERCOMBO-27FEB'
};
const num = x => (x === '' || x === null || x === undefined || !Number.isFinite(Number(x)) ? null : Number(x));
const parseArr = v => {
  try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a : []; }
  catch { return []; }
};
const sum = vals => vals.reduce((acc, x) => acc + (Number.isFinite(x) ? x : 0), 0);
const valid = p => Number.isFinite(p) && p >= 0 && p <= 1;
const outcome = (m) => {
  const labels = parseArr(m.outcomes);
  const prices = parseArr(m.outcomePrices).map(num);
  const yes = labels.findIndex(x => String(x).toLowerCase() === 'yes');
  return yes >= 0 && valid(prices[yes]) ? prices[yes] : (prices.length === 2 && labels.length === 0 && valid(prices[0]) ? prices[0] : null);
};
const labelOf = m => String(m.groupItemTitle || m.yes_sub_title || m.question || m.title || '').trim();
function group(m, section) {
  const label = labelOf(m).toLowerCase();
  const ticker = String(m.ticker || '').toUpperCase();
  if (section !== 'balance') {
    if (/democratic party|^democrat|^dem\b/.test(label) || ticker.endsWith('-D')) return 'D';
    if (/republican party|^republican|^gop\b/.test(label) || ticker.endsWith('-R')) return 'R';
    return null;
  }
  if (/democrats sweep|democratic sweep|d[- ]house[,\s/]+d[- ]senate|dem house.+dem senate/.test(label) || ticker.endsWith('-DD')) return 'DD';
  if (/republicans sweep|republican sweep|r[- ]house[,\s/]+r[- ]senate|rep house.+rep senate/.test(label) || ticker.endsWith('-RR')) return 'RR';
  if (/r senate[,\s/]+d house|d[- ]house[,\s/]+r[- ]senate|dem house.+rep senate/.test(label) || ticker.endsWith('-DR')) return 'DR';
  if (/d senate[,\s/]+r house|r[- ]house[,\s/]+d[- ]senate|rep house.+dem senate/.test(label) || ticker.endsWith('-RD')) return 'RD';
  if (/^other/.test(label)) return 'OTHER';
  return null;
}
async function fetchJson(url) {
  const r = await fetch(url, {headers: {'accept':'application/json', 'user-agent':'MidtermSignalDashboard/1.0'}, signal:AbortSignal.timeout(8500)});
  if (!r.ok) throw Error(`Source HTTP ${r.status}`);
  return r.json();
}
function polymarketRecord(m) {
  return {
    price: outcome(m), volume24hUSD: num(m.volume24hr), volumeUSD: num(m.volumeNum ?? m.volume),
    liquidityUSD: num(m.liquidityNum ?? m.liquidity),
    dayChangePP: num(m.oneDayPriceChange) == null ? null : num(m.oneDayPriceChange) * 100,
    spreadPP: num(m.spread) == null ? null : num(m.spread) * 100,
    active: !!m.active, closed: !!m.closed
  };
}
async function fetchPolymarket(section, slug) {
  const arr = await fetchJson(PBASE + encodeURIComponent(slug));
  const event = Array.isArray(arr) ? arr[0] : null;
  if (!event || !Array.isArray(event.markets)) throw Error('Event or markets unavailable');
  const results = {};
  for (const m of event.markets) {
    const key = group(m, section);
    if (key) results[key] = polymarketRecord(m);
  }
  if (!Object.keys(results).length) throw Error('No matching market outcome labels');
  return {
    outcomes:results,
    eventVolume24hUSD: num(event.volume24hr) ?? sum(event.markets.map(m => num(m.volume24hr))),
    eventVolumeUSD:num(event.volume) ?? sum(event.markets.map(m => num(m.volumeNum ?? m.volume))),
    eventLiquidityUSD:num(event.liquidity) ?? sum(event.markets.map(m => num(m.liquidityNum ?? m.liquidity))),
    sourceUrl:'https://polymarket.com/event/'+slug,
    updatedAt: new Date().toISOString()
  };
}
const kalshiMid = m => {
  const bid = num(m.yes_bid_dollars), ask = num(m.yes_ask_dollars);
  if (valid(bid) && valid(ask) && bid <= ask) return (bid + ask)/2;
  const last = num(m.last_price_dollars);
  if (valid(last)) return last;
  const cents = num(m.yes_bid), askCents = num(m.yes_ask);
  if (cents !== null && askCents !== null && cents <= askCents) return (cents+askCents)/200;
  return null;
};
async function fetchKalshi(section, ticker) {
  let markets;
  try {
    const nested = await fetchJson(`${KBASE}/events/${encodeURIComponent(ticker)}?with_nested_markets=true`);
    markets = nested.markets || nested.event?.markets;
  } catch(e) { /* Try market list endpoint below */ }
  if (!Array.isArray(markets) || !markets.length) {
    const page = await fetchJson(`${KBASE}/markets?event_ticker=${encodeURIComponent(ticker)}&limit=100`);
    markets = page.markets;
  }
  if (!Array.isArray(markets) || !markets.length) throw Error('No markets for ticker');
  const results = {};
  for (const m of markets) {
    const key = group(m, section);
    if (!key) continue;
    results[key] = {
      price: kalshiMid(m),
      volume24hContracts: num(m.volume_24h_fp ?? m.volume_24h),
      volumeContracts: num(m.volume_fp ?? m.volume),
      openInterestContracts: num(m.open_interest_fp ?? m.open_interest),
      liquidityUSD: num(m.liquidity_dollars),
      lastPrice: num(m.last_price_dollars),
      status: m.status || null
    };
  }
  if (!Object.keys(results).length) throw Error('No matching outcome tickers');
  return {
    outcomes:results,
    eventVolume24hContracts:sum(Object.values(results).map(x => x.volume24hContracts)),
    eventVolumeContracts:sum(Object.values(results).map(x => x.volumeContracts)),
    eventOpenInterestContracts:sum(Object.values(results).map(x => x.openInterestContracts)),
    sourceUrl: section === 'balance' ? 'https://kalshi.com/markets/kxbalancepowercombo/2026-midterms-congress-balance-of-power' : section === 'house' ? 'https://kalshi.com/markets/controlh/house-control' : 'https://kalshi.com/markets/controls',
    updatedAt:new Date().toISOString()
  };
}
export default async function handler(request) {
  if (request.method !== 'GET') return Response.json({error:'Method not allowed'}, {status:405});
  const jobs = [
    ...Object.entries(PM_SLUGS).map(([key,slug]) => ({venue:'polymarket',key,job:fetchPolymarket(key,slug)})),
    ...Object.entries(K_EVENTS).map(([key,ticker]) => ({venue:'kalshi',key,job:fetchKalshi(key,ticker)}))
  ];
  const settled = await Promise.allSettled(jobs.map(x=>x.job));
  const data = {asOf:new Date().toISOString(), sources:{polymarket:{},kalshi:{}}, errors:[], updated:0};
  settled.forEach((result,i) => {
    const j = jobs[i];
    if (result.status==='fulfilled') {data.sources[j.venue][j.key] = result.value; data.updated++;}
    else data.errors.push({source:j.venue, section:j.key, error:String(result.reason?.message || result.reason).slice(0,140)});
  });
  return Response.json(data, {
    status:data.updated ? 200 : 503,
    headers:{'Cache-Control':'public,max-age=0,s-maxage=20,stale-while-revalidate=30', 'Content-Type':'application/json'}
  });
}

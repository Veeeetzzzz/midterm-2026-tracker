/* Midterm Signal — transparent source status, no invented realtime values. */
'use strict';
const $ = id => document.getElementById(id);
const state = {snapshot:null, market:null, view:'overview', chamber:'senate', lastResult:null};
const html = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct = p => p == null || !Number.isFinite(Number(p)) ? '—' : `${(Number(p)*100).toFixed(Number(p)*100 % 1 ? 1 : 0)}%`;
const nfmt = x => x == null || !Number.isFinite(Number(x)) ? '—' : new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(Number(x));
const compact = x => x==null || !Number.isFinite(Number(x)) ? '—' : new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(Number(x));
const usd = x => x == null || !Number.isFinite(Number(x)) ? '—' : `$${compact(x)}`;
const date = d => { if(!d) return '—'; const t=new Date(d);return Number.isNaN(t.getTime()) ? html(d) : new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(t); };
const time = t => {if (!t) return '—';const d=new Date(t);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC',hour12:false}).format(d)+' UTC';};
const clamp = v => Math.min(100,Math.max(0,v));
const safeUrl = u => {try{const x=new URL(u);return /^https:$/.test(x.protocol)?x.toString():'#';}catch{return '#';}};
function setText(id,value){const el=$(id);if(el)el.textContent=value;}
function alertMessage(message,warning=false){const el=$('alert');el.className=`alert${warning?' warn':''}`;el.textContent=message;}
function clearAlert(){$('alert').classList.add('hidden');}
function initialiseClock(){
  function tick(){const now=new Date();setText('londonTime',new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/London',hour12:false}).format(now));const target=new Date('2026-11-03T00:00:00-05:00');const remaining=target-now;const div=$('countdown');const unit=$('countdownUnit');if(remaining>0){const hours=Math.ceil(remaining/3600000);div.textContent=hours>=48?String(Math.ceil(hours/24)):String(hours);unit.textContent=hours>=48?'Days to election day':'Hours to election day';}else{div.textContent='03 NOV';unit.textContent='Election day / result counting';}}
  tick();setInterval(tick,1000);
}
function route(view,updateHash=true){const valid=['overview','polls','markets','battlegrounds'];if(!valid.includes(view)) view='overview';state.view=view;for(const b of document.querySelectorAll('.nav-btn')){b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');}for(const p of document.querySelectorAll('.view-panel'))p.classList.toggle('active',p.dataset.panel===view);if(updateHash) history.replaceState({},'',`#${view}`);window.scrollTo({top:0,behavior:'smooth'});}
function showSnapshot(s){
  state.snapshot=s; const f=s.forecasts,p=s.polling;
  setText('forecastDate',`${f.source} · ${date(f.updated)}`);
  setText('housePct',nfmt(f.house.demChance));setText('senatePct',nfmt(f.senate.demChance));setText('bothPct',nfmt(f.both.demSweep));
  $('houseBar').style.width=clamp(f.house.demChance)+'%';$('senateBar').style.width=clamp(f.senate.demChance)+'%';$('bothBar').style.width=clamp(f.both.demSweep)+'%';
  setText('houseSeats',`${f.house.demSeats} D · ${f.house.repSeats} R`);setText('senateSeats',`${f.senate.demSeats} D · ${f.senate.repSeats} R`);
  setText('ballotMargin',`D +${p.genericBallot.marginD}`);setText('pollsGeneric',`D +${p.genericBallot.marginD}`);
  setText('ballotLv',`Likely-voter adjustment: D +${p.genericBallot.lvAdjustedD}`);setText('pollsGenericLV',`Likely-voter adjusted: D +${p.genericBallot.lvAdjustedD}`);
  setText('ballotDate',`${p.genericBallot.source} · ${date(p.genericBallot.updated)}`);$('silverLink').href=safeUrl(p.genericBallot.sourceUrl);
  const rating=p.houseRatings;setText('ratedD',rating.dem);setText('ratedToss',rating.toss);setText('ratedR',rating.rep);setText('cookDate',`Cook · ${date(rating.updated)}`);$('cookLink').href=safeUrl(rating.sourceUrl);
  $('ratingD').style.flex=rating.dem;$('ratingT').style.flex=rating.toss;$('ratingR').style.flex=rating.rep;
  setText('pollsHouseSeats',`${f.house.demSeats} D / ${f.house.repSeats} R`);setText('pollsHouseChance',`${f.house.demChance}% D control`);
  setText('pollsSenateSeats',`${f.senate.demSeats} D / ${f.senate.repSeats} R`);setText('pollsSenateChance',`${f.senate.demChance}% D control`);
  setText('headlineInsight',s.headline || 'Every figure is sourced and dated. Polls, forecasts, and betting exchange prices are different metrics.');
  $('pollCards').innerHTML = p.statePolls.map(r=>{
    const margin=r.dem-r.rep;return `<article class="pollcard"><div class="pollhead"><strong>${html(r.state)}</strong><span class="pollmargin ${margin===0?'tie':''}">${r.independent?'Independent / GOP':margin===0?'Tie':`D +${margin}`}</span></div><div class="pollmeta">${html(r.race)} · ${html(r.pollster)} · ${html(r.dates)}</div><div class="dualbar" aria-label="${html(r.dem)} percent versus ${html(r.rep)} percent"><i class="blue" style="width:${clamp(r.dem)}%;${r.independent?'background:#91a2b7':''}"></i><i class="red" style="width:${clamp(r.rep)}%"></i></div><div class="pollfoot"><span>${r.independent?'Osborn (I)':'Democratic'} ${html(r.dem)}%</span><span>Republican ${html(r.rep)}%</span></div></article>`;}).join('');
  $('footerSources').innerHTML = s.sources.map(r=>`<a href="${html(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${html(r.name)} ↗</a>`).join('');
  renderRaces();renderMarkets();
}
function snapshotResultFallback(){return state.snapshot?.referenceMarkets || null;}
function getVenue(venue, section){return state.market?.sources?.[venue]?.[section] || null;}
function fromSnapshot(venue,section,key){return snapshotResultFallback()?.[venue]?.[section]?.[key]??null;}
function getPrice(venue,section,key){const live=getVenue(venue,section);if(live){return live.outcomes?.[key]?.price ?? null;}return fromSnapshot(venue,section,key);}
function isLive(venue,section){return !!getVenue(venue,section);}
function metricText(venue,section,type){const block=getVenue(venue,section);if(!block)return '—';if(venue==='polymarket'){
    if(type==='24h')return usd(block.eventVolume24hUSD);
    if(type==='lifetime')return usd(block.eventVolumeUSD);
    if(type==='liquidity')return usd(block.eventLiquidityUSD);
    return '—';
  }
  if(type==='24h')return compact(block.eventVolume24hContracts);
  if(type==='lifetime')return compact(block.eventVolumeContracts);
  if(type==='liquidity')return compact(block.eventOpenInterestContracts);
  return '—';
}
function marketCard(venue,key,label){
  const block=getVenue(venue,key);const live=!!block;const d=getPrice(venue,key,'D');const r=getPrice(venue,key,'R');const dd=getPrice(venue,key,'DD');const showKey=key==='balance'?'DD':'D';const v=key==='balance'?dd:d;
  const flowTitle=venue==='kalshi'?'24h contracts':'24h traded';
  const flowLifetime=venue==='kalshi'?'Lifetime contracts':'Lifetime traded';
  const liquidityTitle=venue==='kalshi'?'Open interest':'Liquidity';
  const trend=block?.outcomes?.[showKey]?.dayChangePP;
  const source=block?.sourceUrl || (venue==='polymarket'?`https://polymarket.com/event/${key==='house'?'which-party-will-win-the-house-in-2026':key==='senate'?'which-party-will-win-the-senate-in-2026':'balance-of-power-2026-midterms'}`:key==='balance'?'https://kalshi.com/markets/kxbalancepowercombo/2026-midterms-congress-balance-of-power':key==='house'?'https://kalshi.com/markets/controlh/house-control':'https://kalshi.com/markets/controls');
  return `<article class="marketcard"><div class="markethead"><strong>${html(label)}</strong><span class="market-source-badge ${live?'':'not-live'}">${live?'API LIVE':'REFERENCE'}</span></div><div class="market-pct">${pct(v)}</div><div class="market-caption">${key==='balance'?'D House + D Senate contract':'Democratic-control contract'}${trend==null?'':` · ${trend>=0?'+':''}${nfmt(trend)}pp / 1d`}</div><div class="probability-bar" style="margin-top:15px"><i class="d-bar" style="width:${v==null?0:clamp(v*100)}%"></i></div><div class="market-two"><span>${key==='balance'?'D/D': 'D'} <b>${pct(v)}</b></span><span>${key==='balance'?'D House / R Senate':'R'} <b>${pct(key==='balance'?getPrice(venue,key,'DR'):r)}</b></span></div><div class="marketmetrics"><div><label>${flowTitle}</label><strong>${metricText(venue,key,'24h')}</strong></div><div><label>${flowLifetime}</label><strong>${metricText(venue,key,'lifetime')}</strong></div><div><label>${liquidityTitle}</label><strong>${metricText(venue,key,'liquidity')}</strong></div><div><label>Data as of</label><strong style="font-size:11px">${live?html(time(block.updatedAt)):'2 Nov · ref'}</strong></div></div><a class="tiny-source" href="${html(safeUrl(source))}" target="_blank" rel="noopener noreferrer">View source & contract rules ↗</a></article>`;
}
function renderMarkets(){
  if(!state.snapshot)return;
  $('polyMarketRows').innerHTML=[['house','House control'],['senate','Senate control'],['balance','Congress D/D']].map(([k,t])=>marketCard('polymarket',k,t)).join('');
  $('kalshiMarketRows').innerHTML=[['house','House control'],['senate','Senate control'],['balance','Congress D/D']].map(([k,t])=>marketCard('kalshi',k,t)).join('');
  const f=state.snapshot.forecasts;
  const rows=[['DD','D House / D Senate',f.both.demSweep],['DR','D House / R Senate',f.both.demHouseRepSenate],['RR','R House / R Senate',f.both.repSweep],['RD','R House / D Senate',f.both.repHouseDemSenate]];
  $('outcomeRows').innerHTML=rows.map(([k,label,forecast])=>`<tr><td>${html(label)}</td><td>${pct(getPrice('polymarket','balance',k))}</td><td>${pct(getPrice('kalshi','balance',k))}</td><td>${forecast}%</td></tr>`).join('');
  const line=[['DDHQ model',`${f.house.demChance}%`,`${f.senate.demChance}%`,`${f.both.demSweep}%`,'Forecast']];
  for(const venue of ['polymarket','kalshi'])line.push([venue==='polymarket'?'Polymarket':'Kalshi',pct(getPrice(venue,'house','D')),pct(getPrice(venue,'senate','D')),pct(getPrice(venue,'balance','DD')),isLive(venue,'house')||isLive(venue,'senate')?'Exchange price · API':'Reference price · 2 Nov']);
  $('comparisonRows').innerHTML=line.map((r,i)=>`<tr><td>${html(r[0])}</td><td>${html(r[1])}</td><td>${html(r[2])}</td><td>${html(r[3])}</td><td style="color:#91a3b7;font-size:11px">${html(r[4])}</td></tr>`).join('');
  const up=state.market?.updated || 0;
  if(up){$('marketDot').className='status-dot'+(up<6?' warn':'');setText('marketStatus',`${up}/6 API groups · ${time(state.market.asOf)}`);setText('apiHealth',`${up}/6 market groups refreshed from public APIs. ${state.market.errors?.length?state.market.errors.map(x=>`${x.source}/${x.section}: ${x.error}`).join('; '):'No API fetch errors.'} Figures show when each market group was fetched.`);}
  else{$('marketDot').className='status-dot warn';setText('marketStatus','Reference prices shown · no live feed');setText('apiHealth','No live market data is currently available. Historical reference prices from 2 November 2026 are displayed. Set up Netlify Functions using the README and refresh again. Trading volume and open interest are intentionally left blank.');}
  setText('marketComparisonNote',up?`Live market groups ${up}/6; missing groups marked as historical reference. Prices are market quotes, not independent model probabilities.`:'Reference market prices from 2 November 2026; not a live feed. Exchange prices differ from model probabilities.');
}
function renderRaces(){
  if(!state.snapshot)return;
  const races=state.snapshot.battlegrounds[state.chamber] || [];
  const q=$('raceSearch').value.trim().toLowerCase();
  const filtered=races.filter(r=>[r.id,r.name,r.rating,r.status,r.detail].join(' ').toLowerCase().includes(q));
  $('battlegroundRows').innerHTML=filtered.map(r=>`<article class="race-card"><div class="race-code">${html(r.id)}</div><div class="race-content"><div class="race-head"><strong>${html(r.name)}</strong><span class="race-rating">${html(r.rating)}</span></div><div class="race-meta">${html(r.detail)} · ${html(r.status)}</div><div class="race-bottom"><span>${html(r.risk)}</span>${r.demChance==null?'':`<strong>${nfmt(r.demChance)}% D · DDHQ snapshot</strong>`}</div>${r.demChance==null?'':`<div class="race-progress"><i style="width:${clamp(r.demChance)}%"></i></div>`}</div></article>`).join('') || '<p style="color:var(--muted)">No matching races.</p>';
  $('senateToggle').classList.toggle('active',state.chamber==='senate');$('houseToggle').classList.toggle('active',state.chamber==='house');
}
async function loadSnapshot(){
  const response=await fetch(`/data/snapshot.json?v=${Date.now()}`,{cache:'no-store'});
  if(!response.ok)throw Error('Snapshot HTTP '+response.status);
  const data=await response.json();
  if(!data.forecasts?.house || !data.polling?.houseRatings)throw Error('Snapshot data is incomplete');
  showSnapshot(data);return data;
}
async function loadMarkets(){
  const response=await fetch(`/.netlify/functions/markets?v=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('Market API HTTP '+response.status);
  const data=await response.json();
  if(!data.updated)throw Error('No market API groups returned');
  state.market=data;renderMarkets();return data;
}
async function refresh(initial=false){
  const btn=$('refreshButton');btn.disabled=true;setText('refreshLabel','Refreshing…');
  setText('statusLine','Checking independent sources…');
  const results=await Promise.allSettled([loadSnapshot(),loadMarkets()]);
  const failures=[];
  if(results[0].status==='rejected')failures.push('polling snapshot: '+results[0].reason.message);
  if(results[1].status==='rejected')failures.push('market APIs: '+results[1].reason.message);
  if(!state.snapshot){
    alertMessage('Could not load data/snapshot.json. Use a web server rather than opening the HTML directly, or deploy the complete folder to Netlify.',true);
  }else if(failures.length){
    alertMessage(`Source check completed with limitations: ${failures.join('; ')}. Forecast and poll figures remain dated ${date(state.snapshot.asOf)}, and unavailable market data is labelled as reference only.`,true);
  }else if(!initial){
    alertMessage(`Refresh complete. Poll snapshot checked (${date(state.snapshot.asOf)}); ${state.market?.updated||0}/6 market groups fetched at ${time(state.market?.asOf)}.`);
  }else clearAlert();
  const marketCount=state.market?.updated||0;
  $('statusLine').innerHTML=`<span class="status-dot${marketCount<6?' warn':''}"></span><span>Poll snapshot: ${html(date(state.snapshot?.asOf))} · Market APIs: ${marketCount}/6</span>`;
  btn.disabled=false;setText('refreshLabel','Refresh sources');
}
function setup(){
  initialiseClock();
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>route(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();route(a.dataset.go);}));
  $('refreshButton').addEventListener('click',()=>refresh(false));
  document.querySelectorAll('[data-chamber]').forEach(b=>b.addEventListener('click',()=>{state.chamber=b.dataset.chamber;renderRaces();}));
  $('raceSearch').addEventListener('input',renderRaces);
  window.addEventListener('hashchange',()=>route(location.hash.slice(1),false));
  route(location.hash.slice(1)||'overview',false);
  refresh(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();

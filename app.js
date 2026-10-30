const form=document.querySelector('#scan-form'),input=document.querySelector('#mint'),btn=document.querySelector('#scan-btn'),statusBox=document.querySelector('#status'),results=document.querySelector('#results');
const fmt=(n,cur=false)=>{if(n===null||n===undefined||!Number.isFinite(Number(n)))return '—';n=Number(n);if(cur)return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n<1?8:2}).format(n);return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)};
const short=s=>s?`${s.slice(0,6)}…${s.slice(-5)}`:'—';
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showStatus(msg,error=false){statusBox.textContent=msg;statusBox.classList.remove('hidden','error');if(error)statusBox.classList.add('error')}
function row(k,v){return `<div class="data-row"><span>${esc(k)}</span><b>${v}</b></div>`}
function riskCard(r){const danger=String(r.level||'').toLowerCase()==='danger';return `<div class="risk-row ${danger?'danger':''}"><small>${esc(r.level||'INFO')} · ${esc(r.score??'—')} pts</small><br><b>${esc(r.name||'Risk flag')}</b><p>${esc(r.description||r.value||'No description provided')}</p></div>`}
function render(d){
 const p=d.market||{},r=d.rugcheck||{},t=r.token||{},meta=r.tokenMeta||{},holders=r.topHolders||[],risks=r.risks||[],networks=r.insiderNetworks||[];
 const mc=p.marketCap??p.fdv,liq=p.liquidity?.usd,vol=p.volume?.h24,buys=p.txns?.h24?.buys,sells=p.txns?.h24?.sells;
 const rc=Number.isFinite(Number(r.score_normalised))?Number(r.score_normalised):null;
 let extras=0,extraNotes=[];
 if(liq!==undefined&&liq<10000){extras+=15;extraNotes.push('Likuiditas DexScreener di bawah $10k');}
 else if(liq!==undefined&&liq<25000){extras+=8;extraNotes.push('Likuiditas DexScreener relatif tipis (<$25k)');}
 if(holders.length){const top10=holders.slice(0,10).reduce((a,h)=>a+Number(h.pct||0),0);if(top10>50){extras+=15;extraNotes.push(`Top 10 holder sekitar ${top10.toFixed(1)}%`)}else if(top10>30){extras+=8;extraNotes.push(`Top 10 holder sekitar ${top10.toFixed(1)}%`)}}
 if(networks.length){extras+=Math.min(20,networks.length*5);extraNotes.push(`${networks.length} insider network terdeteksi`)}
 const score=rc===null?null:Math.min(100,Math.round(rc+extras));
 const verdict=score===null?'DATA BELUM CUKUP':score>=65?'AVOID':score>=35?'WATCHLIST':'RELATIVELY LOWER RISK';
 const cls=score===null?'':score>=65?'danger':score>=35?'':'good';
 const name=meta.name||p.baseToken?.name||'Token Solana',symbol=meta.symbol||p.baseToken?.symbol||'UNKNOWN';
 const pairAge=p.pairCreatedAt?`${Math.max(0,Math.floor((Date.now()-p.pairCreatedAt)/86400000))} hari`:'—';
 const authority=(x)=>x?'AKTIF / ADA':'Tidak ada / revoked';
 const concentration=holders.length?holders.slice(0,10).reduce((a,h)=>a+Number(h.pct||0),0).toFixed(2)+'%':'Tidak tersedia';
 const lp=Array.isArray(r.markets)&&r.markets.length?r.markets.map(m=>m.lp?.lpLockedPct).filter(v=>v!==undefined):[];
 const lpText=lp.length?`${Math.max(...lp).toFixed(2)}% (nilai tertinggi pool yang dilaporkan)`:'Tidak tersedia';
 const buysell=buys!==undefined&&sells!==undefined?`${fmt(buys)} buy / ${fmt(sells)} sell`:'Tidak tersedia';
 results.innerHTML=`
 <div class="result-head"><div><div class="token-title">${esc(name)} <span class="pill">${esc(symbol)}</span></div><div class="token-sub">${esc(d.mint)} · snapshot ${new Date().toLocaleString('id-ID')}</div></div><div class="verdict ${cls}">${verdict}</div></div>
 <div class="metrics">
  <div class="metric"><small>RISK SCORE (HEURISTIC)</small><strong>${score===null?'N/A':score+'/100'}</strong><span>${rc===null?'RugCheck score unavailable':`RugCheck ${rc}/100 + market flags ${extras}`}</span></div>
  <div class="metric"><small>MARKET CAP / FDV</small><strong>${fmt(mc,true)}</strong><span>DexScreener snapshot</span></div>
  <div class="metric"><small>LIQUIDITY</small><strong>${fmt(liq,true)}</strong><span>Reported pool liquidity</span></div>
  <div class="metric"><small>24H VOLUME</small><strong>${fmt(vol,true)}</strong><span>${buysell}</span></div>
 </div>
 <div class="cols">
  <section class="panel"><h3><span>01</span> CONTRACT & PERMISSIONS</h3>
   ${row('Token program',esc(r.tokenProgram||'Tidak tersedia'))}
   ${row('Mint authority',`<b>${authority(t.mintAuthority)}</b>`)}
   ${row('Freeze authority',`<b>${authority(t.freezeAuthority)}</b>`)}
   ${row('Metadata mutable',esc(meta.mutable===undefined?'Tidak diketahui':meta.mutable?'Ya':'Tidak'))}
   ${row('Creator',`<span class="address">${esc(r.creator||'Tidak tersedia')}</span>`)}
   ${row('Creator balance',esc(r.creatorBalance===undefined?'Tidak tersedia':fmt(r.creatorBalance)))}
   ${row('Creator token history',esc(r.creatorTokens===undefined||r.creatorTokens===null?'Tidak tersedia':`${r.creatorTokens.length} token tercatat`))}
  </section>
  <section class="panel"><h3><span>02</span> LIQUIDITY & HOLDERS</h3>
   ${row('Total holders',esc(r.totalHolders??'Tidak tersedia'))}
   ${row('Top 10 holder concentration',esc(concentration))}
   ${row('LP locked (RugCheck)',esc(lpText))}
   ${row('LP providers',esc(r.totalLPProviders??'Tidak tersedia'))}
   ${row('Pair age',esc(pairAge))}
   ${row('Pool / DEX',esc(p.dexId||'Tidak tersedia'))}
  </section>
  <section class="panel"><h3><span>03</span> INSIDER & TRADING</h3>
   ${row('Insider accounts detected',esc(r.graphInsidersDetected??'Tidak tersedia'))}
   ${row('Insider networks',esc(networks.length||0))}
   ${row('24h buys / sells',esc(buysell))}
   ${row('Buy/sell ratio',buys!==undefined&&sells!==undefined&&sells>0?(buys/sells).toFixed(2)+'x':'Tidak tersedia')}
   <p class="note">Sniper-wallet classification, funding-source clustering, wallet lifetime PnL, and historical developer rug history are not independently reconstructed in this beta. RugCheck insider fields are shown only when returned by its report.</p>
  </section>
  <section class="panel"><h3><span>04</span> RISK FINDINGS</h3>
   <div class="risk-list">${risks.length?risks.map(riskCard).join(''):'<div class="risk-row"><small>UNKNOWN</small><br><b>RugCheck risk list unavailable</b><p>Do not interpret missing report as a clean token.</p></div>'}
   ${extraNotes.map(n=>`<div class="risk-row"><small>MARKET HEURISTIC</small><br><b>${esc(n)}</b></div>`).join('')}
   ${networks.map(n=>`<div class="risk-row danger"><small>INSIDER NETWORK · ${esc(n.type||'unknown')}</small><br><b>${esc(n.activeAccounts??n.size??'')} accounts</b><p>Network activity returned by RugCheck.</p></div>`).join('')}
   </div>
  </section>
  <section class="panel wide"><h3><span>05</span> TOP HOLDERS (DATA RUGCHECK)</h3>
   ${holders.length?holders.slice(0,10).map((h,i)=>row(`#${i+1} · ${short(h.owner||h.address)}`,`${esc(Number(h.pct||0).toFixed(3))}% ${h.insider?'<span class="pill">INSIDER</span>':''}`)).join(''):'<p class="note">Top holder detail tidak tersedia pada report ini.</p>'}
  </section>
  <section class="panel wide"><h3><span>06</span> VERDICT & LIMITATIONS</h3>
   ${row('Kesimpulan awal',`<b>${verdict}</b>`)}
   ${row('Skor RugCheck asli',esc(rc===null?'Tidak tersedia':rc+'/100'))}
   ${row('Tambahan indikator pasar',esc(extras+' poin'))}
   <p class="note">Skor gabungan adalah heuristik transparan versi beta, bukan probabilitas rugpull dan bukan pengganti skor resmi RugCheck. Jika data RugCheck tidak tersedia, aplikasi tidak membuat skor aman. Liquidity dan volume dapat berubah cepat. LP lock tidak sama dengan LP burn; status lock perlu ditafsirkan bersama detail locker. Selalu verifikasi ulang sebelum transaksi.</p>
   <div class="quicklinks"><a href="https://rugcheck.xyz/tokens/${encodeURIComponent(d.mint)}" target="_blank" rel="noreferrer">Buka laporan RugCheck ↗</a><a href="${esc(p.url||'https://dexscreener.com/solana')}" target="_blank" rel="noreferrer">Buka pool DexScreener ↗</a><a href="https://solscan.io/token/${encodeURIComponent(d.mint)}" target="_blank" rel="noreferrer">Buka Solscan ↗</a></div>
  </section>
 </div>`;
 results.classList.remove('hidden');results.scrollIntoView({behavior:'smooth',block:'start'});
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const mint=input.value.trim();
 if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)){showStatus('Format CA tidak valid. Tempel alamat mint Solana base58 (32–44 karakter).',true);return;}
 btn.disabled=true;btn.textContent='SCANNING…';results.classList.add('hidden');showStatus('Mengambil data pasar dan laporan keamanan publik…');
 try{const res=await fetch(`/api/scan?mint=${encodeURIComponent(mint)}`);const data=await res.json();if(!res.ok)throw new Error(data.error||`Server error ${res.status}`);render(data);showStatus('Selesai. Hasil adalah snapshot data publik; sebagian sumber dapat mengembalikan data cache.');}
 catch(err){showStatus(`Scan gagal: ${err.message}. Coba lagi atau buka RugCheck dan DexScreener secara langsung.`,true);}
 finally{btn.disabled=false;btn.innerHTML='SCAN <span>↗</span>';}
});

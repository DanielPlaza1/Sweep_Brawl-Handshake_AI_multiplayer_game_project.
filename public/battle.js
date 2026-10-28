(() => {
 const popups=[],alerts=[];let expiry;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const active=list=>list.filter(a=>a.until>Date.now());
 function popup(id,text,tone='negative'){if(id)popups.push({id,text,tone,start:Date.now(),until:Date.now()+1200});}
 function refreshLater(){clearTimeout(expiry);const times=[...popups,...alerts].map(a=>a.until).filter(t=>t>Date.now());if(times.length)expiry=setTimeout(()=>{window.dispatchEvent(new Event('sweep-battle-refresh'));refreshLater();},Math.max(20,Math.min(...times)-Date.now()+20));}
 function events(list,prior,next,me){
  const sounds=new Set(),name=id=>next.players.find(p=>p.id===id)?.name||'Another player';
  for(const e of list){
   const target=e.targetId||(['mine','poison','skip'].includes(e.type)?e.playerId:null),loss=(e.heartsLost||0)+(e.armorLost||0);
   if(e.type==='mine')sounds.add('boom');
   if(e.feedback==='zap'){sounds.add('zap');popup(target,'⚡ ZAPPED!','electric');}
   if(e.type==='damage'&&loss){popup(target,'−'+(e.heartsLost||e.armorLost)+(e.heartsLost?' ♥':' ARMOR'));if(['Hit','Dagger'].includes(e.reason))sounds.add('hit');}
   if(e.text.includes('blocked')&&['item','bonus','mine'].includes(e.type))sounds.add('shield');
   if(e.type==='reveal'&&e.tier==='guess'&&e.probability>=.5&&e.points>0)sounds.add('fanfare');
   if(e.hailMary)popup(e.playerId,'HAIL MARY! +'+e.points,'positive');
   if(e.feedback==='forced-down')popup(target,'×4 FORCED!','fog');
   if(e.feedback==='exposed')popup(e.playerId,'EXPOSED!','fog');
   if(target&&/fogged/.test(e.text))popup(target,'≋ FOGGED!','fog');
   if(target&&/extra reveal/.test(e.text))popup(target,'FORCED PICK!','fog');
   if(e.type==='ghost'&&e.ghostKind==='spook')popup(target,'👻 SPOOK!','fog');
   const personal=target===me||e.playerId===me&&['item','heal','bonus','mine','damage','score','poison'].includes(e.type);
   if(personal&&e.type!=='turn'){
    const text=e.type==='damage'&&loss?(e.playerId===me?'You':name(e.playerId))+' → '+(target===me?'you':name(target))+': −'+(e.heartsLost||e.armorLost)+(e.heartsLost?' ♥':' armor')+' ('+(e.reason||'damage')+')':e.text;
    alerts.push({text,tone:e.toneBy?.[me]||e.tone||'neutral',until:Date.now()+(target===me?6500:4500)});while(alerts.length>4)alerts.shift();
   }
  }
  if(prior&&['round-end','finished'].includes(next.phase)&&!['round-end','finished'].includes(prior.phase))sounds.add('fanfare');
  for(const sound of sounds)window.SweepAudio?.[sound]?.();refreshLater();
 }
 window.SweepBattle={events,popups(id){return active(popups).filter(a=>a.id===id).slice(-3).map(a=>'<span class="battle-popup '+a.tone+'" role="status" style="animation-delay:-'+(Date.now()-a.start)+'ms">'+esc(a.text)+'</span>').join('');},alerts(){const rows=active(alerts);return rows.length?'<aside class="personal-callouts" aria-label="Your recent battle effects" aria-live="polite">'+rows.map(a=>'<div class="personal-callout '+a.tone+'">'+esc(a.text)+'</div>').join('')+'</aside>':'';},reset(){popups.length=0;alerts.length=0;clearTimeout(expiry);}};
})();

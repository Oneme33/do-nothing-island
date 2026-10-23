import {islandIdentity} from './identity.js';
import {TREASURE_CATALOG} from './coast.js';
import {nl} from './language.js';
import {wishTally} from './wishes.js';
import {currentScores} from './finale.js';
// The ending as a film: the real island in the background, an effect per ending, and credits written from this island's own history.
const credHash=(a,b=0)=>{const n=Math.sin(a*91.17+b*57.3)*43758.5453;return n-Math.floor(n);};
const credPick=(s,list,salt)=>list[Math.floor(credHash((s.seed>>>0)%9973,salt)*list.length)];
const nlNumber=n=>n>=1e6?`${(n/1e6).toFixed(1).replace('.',',')} miljoen`:Math.round(n).toLocaleString('nl-NL');
function islandAnimal(s){
 if(s.land.some(t=>t.building==='zoo'))return'de giraf, die alles van bovenaf zag';
 if((s.wishes?.history||[]).some(w=>w.kind==='sheep'))return'schaap Bertha, van het schuurdak';
 if(s.coast?.lighthouse)return'de vuurtorenkat en haar trap';
 return credPick(s,['een eend met ambitie','de haan die leerde klokkijken','een meeuw met een patatverleden'],3);
}
export function creditsFor(s){
 const id=islandIdentity(s),family=s.family,o=s.outcome||{},helped=wishTally(s,'helped'),unasked=Math.max(0,(s.interferences||0)-helped);
 const houses=s.houses.length,towers=s.houses.filter(t=>t.building==='tower').length,years=s.year,pop=Math.floor(s.population);
 const keur=currentScores(s,o.scores);
 const treasure=TREASURE_CATALOG.find(t=>t.id===s.coast?.treasures?.[0]?.id);
 const lines=[
  {kind:'title',text:id.name,sub:nl(o.title||'Een eilandverhaal')},
  {kind:'head',text:'In de hoofdrol'},
  {kind:'line',text:`${nlNumber(pop)} eilanders`,sub:'die het allemaal zelf bedachten (min of meer)'},
  {kind:'line',text:`Familie ${family?.lastName||'van het eerste huis'}`,sub:`${family?.generations.length||1} generaties sleutelhouders`},
  {kind:'head',text:'Bijrollen'},
  {kind:'line',text:'De oude boom',sub:'was er als eerste, en is er nog'},
  {kind:'line',text:islandAnimal(s)},
  ...(treasure?[{kind:'line',text:treasure.title,sub:'gevonden, gepoetst en in het museum gezet'}]:[]),
  ...(s.court?[{kind:'line',text:'Het kasteel',sub:credPick(s,['met meer kamers dan mensen','en een trap die nooit ophoudt','dat elke eeuw een stukje groter werd'],5)}]:[]),
  {kind:'head',text:'De eilandkeur'},
  {kind:'award',text:keur.level.title,sub:`${keur.total} van 100 · ${keur.done} van ${keur.items} dingen erop en eraan`},
  {kind:'head',text:'Prijzen'},
  {kind:'award',text:'Langste vergadering',sub:`de gemeenteraad, ${nlNumber(years/3)} uur over de kleur van de bankjes`},
  {kind:'award',text:'Mooiste dak',sub:`familie ${credPick(s,['Bos','Visser','de Boer','Steen','van Dijk'],7)}, voor ‘onverwacht petrol’`},
  {kind:'award',text:'Beste uitzicht',sub:s.land.some(t=>t.building==='watchtower')?'de uitkijktoren die jij liet bouwen':s.land.some(t=>t.building==='lighthouse')?'de vuurtorenwachter, elke ochtend':'iedereen die even op de heuvel ging zitten'},
  {kind:'head',text:'In cijfers'},
  {kind:'stat',text:'Gebakken broden',sub:nlNumber(pop*years*.6)},
  {kind:'stat',text:'Kopjes koffie op het plein',sub:nlNumber(pop*Math.max(1,years-40)*.4)},
  {kind:'stat',text:'Huizen',sub:`${nlNumber(houses)}${towers?`, waarvan ${towers} torenflats`:''}`},
  {kind:'stat',text:'Feesten',sub:`${s.partiesHeld||0}, waarvan ${Math.max(0,(s.partiesHeld||0)-1)} met taart`},
  {kind:'stat',text:'Keren dat iemand ‘wat was dát?’ riep',sub:nlNumber((s.interferences||0)*37+(s.fireCount||0)*12+3)},
  {kind:'head',text:'Met dank aan'},
  {kind:'thanks',text:s.interferences===0?'Jou, voor het geduld. Je deed helemaal niets, en dat was precies goed.':unasked===0?`Jou, voor ${helped} keer helpen. Ze vroegen het zelf, dus het telt niet.`:unasked>8?`De Hand, die echt niet kon stilzitten (${unasked} keer).`:`De Hand, voor ${helped} keer helpen en ${unasked} keer… nou ja.`},
  {kind:'line',text:o.quote?`“${nl(o.quote)}”`:'Einde.',sub:''},
  {kind:'end',text:'Do Nothing Island',sub:'Geen dieren of eilanders kwamen iets tekort tijdens het maken van dit eiland.'}
 ];
 return lines;
}
const credEase=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// The closing film: only the island, slowly coming closer while the light turns to evening, and a few quiet lines.
export function drawCredits(c,w,h,s,movie,reduced,island){
 if(!movie)return;const u=reduced?Math.min(1,Math.floor(movie.elapsed/6)*6/movie.duration+.0001):Math.min(1,movie.elapsed/movie.duration),t=movie.elapsed;
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#000';c.fillRect(0,0,w,h);
 if(island&&island.width&&island.height){const zoom=1.02+u*.1,iw=island.width,ih=island.height,scale=Math.max(w/iw,h/ih)*zoom;c.drawImage(island,(w-iw*scale)/2,(h-ih*scale)/2-u*h*.03,iw*scale,ih*scale);}
 // Golden hour first, then dusk settles.
 const warm=credEase(0,.45,u)*(1-credEase(.7,1,u)),dusk=credEase(.5,1,u);
 c.save();c.globalCompositeOperation='soft-light';c.fillStyle=`rgba(255,170,90,${(.55*warm).toFixed(3)})`;c.fillRect(0,0,w,h);c.restore();
 c.save();c.globalCompositeOperation='multiply';c.fillStyle=`rgba(70,80,120,${(.55*dusk).toFixed(3)})`;c.fillRect(0,0,w,h);c.restore();
 const v=c.createRadialGradient(w/2,h*.5,Math.min(w,h)*.25,w/2,h*.5,Math.max(w,h)*.75);if(v?.addColorStop){v.addColorStop(0,'rgba(10,16,14,0)');v.addColorStop(1,`rgba(10,16,14,${(.45+.25*u).toFixed(3)})`);c.fillStyle=v;c.fillRect(0,0,w,h);}
 const keur=currentScores(s,s.outcome?.scores),o=s.outcome||{};
 // Only a perfect island gets a little extra: soft golden lights drifting up.
 if(keur.level.id==='perfect'&&!reduced)for(let i=0;i<26;i++){const f=(t*.03+credHash(i,3))%1;c.fillStyle=`rgba(255,226,150,${(Math.sin(f*Math.PI)*.7).toFixed(3)})`;c.beginPath();c.ellipse(w*credHash(i,4)+Math.sin(t*.5+i)*12,h*(1-f),1.6,1.6,0,0,Math.PI*2);c.fill();}
 const scale=Math.min(1.25,Math.max(.6,w/900)),text=(str,y,font,alpha,color='#fbf8ee')=>{if(alpha<=.01)return;c.globalAlpha=alpha;c.fillStyle=color;c.font=font;c.fillText(str,w/2,y);c.globalAlpha=1;};
 // A soft dark haze behind the words, so they read against a busy island.
 const words=Math.max(credEase(.16,.25,u)*(1-credEase(.6,.68,u)),credEase(.68,.74,u)*(1-credEase(.88,.93,u)));
 if(words>0){const g=c.createRadialGradient(w/2,h*.5,0,w/2,h*.5,Math.max(w,h)*.55);if(g?.addColorStop){g.addColorStop(0,`rgba(12,18,16,${(.72*words).toFixed(3)})`);g.addColorStop(.55,`rgba(12,18,16,${(.42*words).toFixed(3)})`);g.addColorStop(1,'rgba(12,18,16,0)');c.fillStyle=g;c.fillRect(0,0,w,h);}}
 c.save();c.textAlign='center';c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=14;
 const name=islandIdentity(s).name,showName=credEase(.16,.25,u)*(1-credEase(.6,.68,u)),showLine=credEase(.3,.38,u)*(1-credEase(.6,.68,u)),showCredits=credEase(.68,.74,u)*(1-credEase(.88,.93,u)),showEnd=credEase(.92,.97,u);
 text(name,h*.44,`${Math.round(62*scale)}px Georgia, serif`,showName);
 text(`JAAR 1 – ${o.year||s.year}`,h*.44+30*scale,`600 ${Math.round(12*scale)}px sans-serif`,showName*.85,'#e8dfc4');
 text(nl(o.title||''),h*.56,`italic ${Math.round(22*scale)}px Georgia, serif`,showLine);
 if(o.quote)text(`“${nl(o.quote)}”`,h*.56+30*scale,`${Math.round(14*scale)}px Georgia, serif`,showLine*.8,'#e8dfc4');
 const family=s.family;
 [[family?`Familie ${family.lastName} · ${family.generations.length} generaties sleutelhouders`:'',0],[`${Math.round(o.population??s.population).toLocaleString('nl-NL')} eilanders`,1],[`Eilandkeur ${keur.total} · ${keur.level.title.toLowerCase()}`,2]].forEach(([line,i])=>text(line,h*.44+i*28*scale,`${Math.round(16*scale)}px Georgia, serif`,showCredits*credEase(.68+i*.03,.74+i*.03,u)));
 c.shadowBlur=0;c.fillStyle=`rgba(0,0,0,${(showEnd*.8).toFixed(3)})`;c.fillRect(0,0,w,h);
 text('Do Nothing Island',h*.5,`${Math.round(26*scale)}px Georgia, serif`,showEnd);
 c.restore();
}

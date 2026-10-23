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
function particles(c,id,w,h,t,reduced){
 const n=reduced?0:1;
 if(id==='independent'){
  for(let i=0;i<4;i++){const x=w*(.15+i*.22)+Math.sin(t*.6+i)*20*n,y=h*(.18+credHash(i,2)*.2)+Math.cos(t*.8+i)*10*n;c.fillStyle=['#d4644f','#e2c26a','#7fa3a8','#c98fb0'][i];c.beginPath();c.moveTo(x,y-10);c.lineTo(x+7,y);c.lineTo(x,y+10);c.lineTo(x-7,y);c.closePath();c.fill();c.strokeStyle='rgba(60,60,60,.4)';c.beginPath();c.moveTo(x,y+10);c.quadraticCurveTo(x+10,y+40,x-5,h*.8);c.stroke();}
 }
 if(id==='sanctuary'){for(let i=0;i<30;i++){const u=(t*.05+credHash(i,4))%1;c.fillStyle=['#c99a4a','#a8b46a','#d4704f'][i%3];c.beginPath();c.ellipse(w*credHash(i,5)+Math.sin(t+i)*14*n,u*h,3,1.6,t+i,0,Math.PI*2);c.fill();}}
 if(id==='miracles'){c.save();c.globalAlpha=.35;for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*.18+Math.sin(t*.4)*.04*n;c.fillStyle='#f6dc8a';c.beginPath();c.moveTo(w*.5,-20);c.lineTo(w*.5+Math.cos(a-.05)*h*1.4,-20+Math.sin(a-.05)*-h*1.4*-1);c.lineTo(w*.5+Math.cos(a+.05)*h*1.4,-20+Math.sin(a+.05)*-h*1.4*-1);c.closePath();c.fill();}c.restore();
  const wave=Math.sin(t*3)*.25*n;c.save();c.translate(w*.5,h*.12);c.rotate(wave);c.fillStyle='#f4efe4';c.beginPath();c.ellipse(0,0,26,30,0,0,Math.PI*2);c.fill();for(let i=0;i<4;i++){c.beginPath();c.ellipse(-15+i*10,-30,4.5,14,0,0,Math.PI*2);c.fill();}c.restore();}
 if(id==='fortress'){for(let i=0;i<5;i++){const x=w*(.1+i*.2),sway=Math.sin(t*2+i)*3*n;c.strokeStyle='#6d675a';c.beginPath();c.moveTo(x,h*.55);c.lineTo(x,h*.25);c.stroke();c.fillStyle=['#a35a45','#3f5f7a'][i%2];c.beginPath();c.moveTo(x,h*.25);c.lineTo(x+26,h*.27+sway);c.lineTo(x+26,h*.36+sway);c.lineTo(x,h*.34);c.closePath();c.fill();}}
 if(id==='retreat'){for(let i=0;i<4;i++){const u=(t*.03+i*.22)%1,x=w*(.2+i*.18)+u*w*.3,y=h*(.7-u*.35);c.fillStyle='#8f6f5a';c.beginPath();c.moveTo(x-12,y);c.lineTo(x+12,y);c.lineTo(x+8,y+5);c.lineTo(x-8,y+5);c.closePath();c.fill();c.fillStyle='#f3efcf';c.beginPath();c.moveTo(x,y-1);c.lineTo(x,y-20);c.lineTo(x+11,y-4);c.closePath();c.fill();}}
 if(id==='last-drop'){const level=Math.min(1,t/18);c.fillStyle=`rgba(90,150,170,${.45*(1-level)})`;c.fillRect(0,h*(.35+level*.6),w,h);for(let i=0;i<5;i++){const hop=Math.abs(Math.sin(t*3+i))*14*n;c.fillStyle='#c9d3cf';c.beginPath();c.ellipse(w*(.2+i*.15),h*.92-hop,6,2.6,Math.sin(t+i),0,Math.PI*2);c.fill();}}
 if(id==='artists'){for(let i=0;i<26;i++){const u=(t*.04+credHash(i,11))%1;c.save();c.globalAlpha=.6*Math.sin(u*Math.PI);c.fillStyle=['#d4644f','#e2c26a','#5c8fc0','#8cc07a','#c98fb0'][i%5];c.beginPath();c.ellipse(w*credHash(i,12),h*credHash(i,13)+Math.sin(t+i)*6*n,8+credHash(i,14)*14,5+credHash(i,15)*8,credHash(i,16)*3,0,Math.PI*2);c.fill();c.restore();}}
 if(id==='funfair'){for(let i=0;i<9;i++){const u=(t*.05+i/9)%1,x=w*(.08+credHash(i,17)*.55)+Math.sin(t+i)*12*n,y=h*(1.05-u*1.2);c.fillStyle=['#d4644f','#e2c26a','#5c8fc0','#c98fb0'][i%4];c.beginPath();c.ellipse(x,y,9,11,0,0,Math.PI*2);c.fill();c.strokeStyle='rgba(60,60,60,.5)';c.beginPath();c.moveTo(x,y+11);c.lineTo(x+Math.sin(t*2+i)*4,y+34);c.stroke();}
  const cx=w*.22,cy=h*.55,R=Math.min(w,h)*.18;c.strokeStyle='rgba(251,248,238,.7)';c.lineWidth=2;c.beginPath();c.ellipse(cx,cy,R,R,0,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){const a=t*.3*n+i*Math.PI/4;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);c.stroke();c.fillStyle=['#d4644f','#e2c26a','#5c8fc0','#8cc07a'][i%4];c.fillRect(cx+Math.cos(a)*R-5,cy+Math.sin(a)*R,10,8);}}
 if(id==='seafarers'){for(let i=0;i<6;i++){const u=(t*.025+i/6)%1,x=-60+u*(w+120),y=h*(.72+(i%3)*.08)+Math.sin(t*1.5+i)*3*n;c.fillStyle='#8f6f5a';c.beginPath();c.moveTo(x-18,y);c.lineTo(x+18,y);c.lineTo(x+12,y+7);c.lineTo(x-12,y+7);c.closePath();c.fill();c.fillStyle='#f3efcf';c.beginPath();c.moveTo(x,y-2);c.lineTo(x,y-30);c.lineTo(x+16,y-6);c.closePath();c.fill();c.fillStyle=['#d4644f','#5c8fc0','#e2c26a'][i%3];c.fillRect(x,y-34,8,4);}}
 if(id==='phoenix'){for(let i=0;i<40;i++){const u=(t*.12+credHash(i,6))%1;c.fillStyle=`rgba(255,${150+Math.floor(credHash(i,7)*80)},80,${1-u})`;c.beginPath();c.ellipse(w*credHash(i,8)+Math.sin(t+i)*10*n,h*(1-u),2,2,0,0,Math.PI*2);c.fill();}
  const x=((t*.08)%1.3-.15)*w,y=h*.25+Math.sin(t)*20*n;c.fillStyle='#e8913c';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-40,y-30-Math.sin(t*6)*12*n,x-70,y-10);c.quadraticCurveTo(x-40,y-5,x-25,y+8);c.closePath();c.fill();}
 if(['independent','sanctuary','phoenix','miracles','artists','funfair','seafarers'].includes(id)&&!reduced){for(let k=0;k<3;k++){const cycle=(t*.3+k*.33)%1,cx=w*(.2+credHash(k,Math.floor(t*.3+k*.33))*.6),cy=h*(.12+credHash(k,9)*.25),col=['#d4644f','#e2c26a','#7fa3a8','#c98fb0'][(k+Math.floor(t))%4];if(cycle>.25){const open=(cycle-.25)/.75;c.save();c.globalAlpha=1-open;c.fillStyle=col;for(let i=0;i<14;i++){const a=i/14*Math.PI*2;c.beginPath();c.ellipse(cx+Math.cos(a)*open*40,cy+Math.sin(a)*open*30+open*10,2,2,0,0,Math.PI*2);c.fill();}c.restore();}}}
}
// Halfway through the film the inspection stamp drops onto the island, and the checklist ticks itself off.
function drawKeur(c,w,h,s,u,reduced){
 if(u<.42)return;
 const keur=currentScores(s,s.outcome?.scores),k=reduced?1:Math.min(1,(u-.42)/.06),drop=1+(1-k)*1.6,panel=Math.min(360,w*.52),cx=Math.max(110,(w-panel-18)/2),cy=h*.42;
 if((keur.level.id==='perfect'||keur.level.id==='gold')&&!reduced){
  const tt=u*60;for(let k=0;k<5;k++){const cyc=(tt*.35+k*.21)%1,cx2=w*(.08+((k*37)%60)/100),cy2=h*(.12+((k*23)%30)/100),col=['#d4644f','#e2c26a','#7fa3a8','#c98fb0','#8cc07a'][k];if(cyc>.2){const open=(cyc-.2)/.8;c.save();c.globalAlpha=1-open;c.fillStyle=col;for(let i=0;i<18;i++){const a=i/18*Math.PI*2;c.beginPath();c.ellipse(cx2+Math.cos(a)*open*46,cy2+Math.sin(a)*open*36+open*14,2,2,0,0,Math.PI*2);c.fill();}c.restore();}}
  for(let i=0;i<40;i++){const fall=(tt*.05+((i*53)%100)/100)%1;c.fillStyle=['#d4644f','#e2c26a','#7fa3a8','#c98fb0','#8cc07a'][i%5];c.save();c.translate(((i*71)%100)/100*(w-360),fall*h);c.rotate(tt*2+i);c.fillRect(-2.5,-1.2,5,2.4);c.restore();}
 }
 if(keur.level.id==='perfect'&&!reduced){c.save();c.globalAlpha=.45*Math.min(1,(u-.42)/.1);c.lineWidth=12;['#e46b5d','#eda04f','#efd36a','#8cc07a','#6fa8d6','#8f7fc4'].forEach((col,i)=>{c.strokeStyle=col;c.beginPath();c.ellipse(cx,h*.95,Math.min(w,h)*.62-i*12,Math.min(w,h)*.62-i*12,0,Math.PI*1.05,Math.PI*1.95);c.stroke();});c.restore();}
 c.save();c.translate(cx,cy);c.scale(drop,drop);c.rotate(-.08*(1-k)-.05);c.globalAlpha=k;
 c.fillStyle='rgba(20,34,28,.35)';c.beginPath();c.ellipse(4,6,74,74,0,0,Math.PI*2);c.fill();
 c.fillStyle=keur.level.color;c.beginPath();c.ellipse(0,0,74,74,0,0,Math.PI*2);c.fill();
 c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=3;c.beginPath();c.ellipse(0,0,64,64,0,0,Math.PI*2);c.stroke();
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2;c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.ellipse(Math.cos(a)*69,Math.sin(a)*69,2,2,0,0,Math.PI*2);c.fill();}
 c.fillStyle='#293d32';c.textAlign='center';c.font='600 9px sans-serif';c.fillText('DE EILANDKEUR',0,-30);
 c.font='44px Georgia, serif';c.fillText(String(keur.total),0,12);c.font='10px sans-serif';c.fillText('VAN 100',0,28);
 c.restore();
 c.save();c.globalAlpha=k;c.textAlign='center';c.fillStyle='#fbf8ee';c.font='22px Georgia, serif';c.fillText(keur.level.title,cx,cy+104);
 if(keur.level.id==='perfect'){c.save();c.translate(cx,cy-104);c.rotate(-.04);c.fillStyle='#c98fb0';c.fillRect(-120,-16,240,30);c.fillStyle='#fbf8ee';c.font='600 13px sans-serif';c.fillText('HET PERFECTE EILAND',0,4);c.restore();}
 // One tick per item, appearing one after another.
 const shown=reduced?keur.items:Math.floor(Math.min(1,(u-.48)/.2)*keur.items),cols=12,size=14;
 keur.checklist.forEach((item,i)=>{if(i>=Math.max(0,shown))return;const x=cx+((i%cols)-(cols-1)/2)*size*1.3,y=cy+124+Math.floor(i/cols)*size*1.3;c.fillStyle=item.done?'#8cc07a':'rgba(251,248,238,.25)';c.beginPath();c.ellipse(x,y,size/2,size/2,0,0,Math.PI*2);c.fill();if(item.done){c.strokeStyle='#22372c';c.lineWidth=2;c.beginPath();c.moveTo(x-3.5,y);c.lineTo(x-1,y+3);c.lineTo(x+4,y-3);c.stroke();}});
 if(shown>=keur.items){c.fillStyle='#dfe9d4';c.font='12px sans-serif';c.fillText(`${keur.done} van ${keur.items} dingen erop en eraan`,cx,cy+124+2*size*1.3+8);}
 c.restore();
}
export function drawCredits(c,w,h,s,movie,reduced,island){
 if(!movie)return;const t=reduced?Math.floor(movie.elapsed/6)*6:movie.elapsed,id=movie.id;
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#22372c';c.fillRect(0,0,w,h);
 // The real island, slowly coming closer.
 if(island&&island.width&&island.height){const zoom=1.05+t/movie.duration*.25,iw=island.width,ih=island.height,scale=Math.max(w/iw,h/ih)*zoom;c.globalAlpha=.9;c.drawImage(island,(w-iw*scale)/2,(h-ih*scale)/2,iw*scale,ih*scale);c.globalAlpha=1;}
 c.fillStyle='rgba(20,34,28,.25)';c.fillRect(0,0,w,h);
 particles(c,id,w,h,t,reduced);
 drawKeur(c,w,h,s,t/movie.duration,reduced);
 // Credits roll up through a soft paper panel.
 const lines=creditsFor(s),panelW=Math.min(360,w*.52),x0=w-panelW-18;
 c.fillStyle='rgba(251,248,238,.9)';c.fillRect(x0,0,panelW,h);
 const lineH=42,total=lines.length*lineH+h,offset=h-(t/movie.duration)*total;
 c.save();c.beginPath();c.rect(x0,0,panelW,h);c.clip();c.textAlign='center';
 lines.forEach((line,i)=>{const y=offset+i*lineH;if(y<-40||y>h+40)return;const cx=x0+panelW/2;
  if(line.kind==='title'){c.fillStyle='#293d32';c.font='26px Georgia, serif';c.fillText(line.text,cx,y);c.fillStyle='#7b866e';c.font='italic 14px Georgia, serif';c.fillText(line.sub,cx,y+18);}
  else if(line.kind==='head'){c.fillStyle='#8a7552';c.font='600 10px sans-serif';c.fillText(line.text.toUpperCase(),cx,y+10);}
  else if(line.kind==='end'){c.fillStyle='#293d32';c.font='20px Georgia, serif';c.fillText(line.text,cx,y);c.fillStyle='#7b866e';c.font='10px sans-serif';c.fillText(line.sub,cx,y+16);}
  else{c.fillStyle='#293d32';c.font=line.kind==='award'?'600 13px sans-serif':line.kind==='thanks'?'italic 13px Georgia, serif':'13px sans-serif';
   const words=line.text.split(' ');let row='',rows=[];for(const word of words){if(c.measureText(row+word).width>panelW-30&&row){rows.push(row);row='';}row+=word+' ';}rows.push(row);rows.slice(0,2).forEach((r,k)=>c.fillText(r.trim(),cx,y+k*15));
   if(line.sub){c.fillStyle='#6f7f61';c.font='11px sans-serif';c.fillText(line.sub,cx,y+(rows.length>1?30:15));}}
 });
 c.restore();
}

import { cinemaBeat, cinemaVisible } from './spectacle.js';
import {nl} from './language.js';
const pageant01=n=>Math.max(0,Math.min(1,n));
export function cinemaLift(s){const m=s.cinematic;return m?.id==='independent'&&cinemaVisible(s)?125*pageant01((m.elapsed-10)/10):0;}
export function drawFlames(r,x,y,size=1){
 const clock=r.reduced?0:r.activityTime;
 r.ellipse(x,y+2,13*size,5*size,'#e5ae4b55');
 for(let i=0;i<3;i++){const dx=(i-1)*5*size,h=(17+Math.sin(clock*7+i*2)*5)*size;
  r.poly([[x+dx-6*size,y],[x+dx-5*size,y-h*.6],[x+dx+Math.sin(clock*4+i)*4*size,y-h],[x+dx+5*size,y-h*.4],[x+dx+6*size,y],[x+dx,y+3*size]],i%2?'#d97a3c':'#edab45');
  r.poly([[x+dx-3*size,y],[x+dx,y-h*.62],[x+dx+3*size,y]],'#f8d67c');
 }
 for(let i=0;i<5;i++){const f=(clock*.4+i*.21)%1;r.ellipse(x+Math.sin(i*4+clock)*9*size,y-12*size-f*30*size,(1-f)*1.2*size,(1-f)*2*size,'#e6b45c');}
}
export function drawBonfire(r){
 r.diamond(0,0,20,10,'#b8b090');
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;r.ellipse(Math.cos(a)*11,Math.sin(a)*4,3,2,'#b6b39b');}
 r.line([[-9,0],[8,-4]],'#8f7756',4);r.line([[-8,-4],[8,1]],'#ad8c59',3);drawFlames(r,0,-4,1.15);
}
export function drawFestivalGround(r){
 r.diamond(0,0,23,11.5,'#c8bd96');
 r.poly([[-19,0],[-19,-15],[-9,-25],[1,-14],[1,4]],'#d9bb91');
 r.poly([[-22,-14],[-9,-27],[4,-14]],'#c9856a');r.poly([[-14,-24],[-9,-27],[-4,-22],[-7,-15],[-11,-15]],'#efe0b2');
 r.poly([[7,1],[7,-13],[15,-23],[24,-12],[24,0]],'#c4c8a0');r.poly([[4,-12],[15,-25],[27,-12]],'#859f91');
 r.line([[-22,-32],[25,-30]],'#9c9477',.8);
 for(let i=0;i<6;i++){const x=-22+i*8;r.poly([[x,-32],[x+6,-32],[x+3,-26]],['#c1886c','#d6bb72','#91aa9b'][i%3]);}
 r.line([[0,5],[15,2]],'#e2d0ab',2);
}
export function drawLifeWorld(r){
 const s=r.sim;
 for(const tile of s.land.filter(t=>t.fire)){
  const p=r.p(tile.x,tile.y);r.enqueueActor(p.y+9,()=>{drawFlames(r,p.x,p.y-12,1.6);for(let i=0;i<3;i++){const f=(r.activityTime*.16+i*.31)%1;r.ellipse(p.x+f*14,p.y-44-f*28,6+f*7,4+f*4,'#8d8b7b55');}});
  const journey=s.journeys?.find(j=>j.to===`${tile.x},${tile.y}`);
  if(journey){for(let i=0;i<3;i++){const distance=((r.activityTime*.8+i*1.7)%(journey.route.length-1)),n=Math.floor(distance),a=s.tiles.get(journey.route[n]),b=s.tiles.get(journey.route[n+1]);if(!a||!b)continue;const q=r.streetPosition(a,b,distance-n,i-1);r.enqueueActor(q.y,()=>{r.person(q.x,q.y,'#7c9da0',i);r.ellipse(q.x+4,q.y-1,2,1.8,'#98b9b4');});}}
 }
 const party=s.festival;if(party&&party.until>=s.year){
  const tile=s.tile(party.x,party.y);if(!tile||tile.kind!=='land')return;
  const p=r.p(party.x,party.y),clock=r.reduced?0:r.activityTime;
  for(let i=0;i<6;i++){const x=p.x+(i%3-1)*9,y=p.y+14+Math.floor(i/3)*5+Math.abs(i%3-1)*3;
   r.enqueueActor(y,()=>{if(party.kind==='picnic')r.diamond(x,y,7,3,i%2?'#d8ba94':'#c1c49b');r.person(x,y,['#c09870','#899e78','#d2ba84'][i%3],i);});}
  if(party.kind==='duck-race'){
   const water=[[tile.x+1,tile.y],[tile.x-1,tile.y],[tile.x,tile.y+1],[tile.x,tile.y-1]].map(([x,y])=>s.tile(x,y)).find(t=>t?.kind==='water');
   if(water){const q=r.p(water.x,water.y);r.enqueueActor(q.y,()=>{for(let i=0;i<4;i++){const a=clock*.8+i*1.5,x=q.x+Math.cos(a)*20,y=q.y+Math.sin(a)*7;r.ellipse(x,y,4,2,'#e9cf7c');r.ellipse(x+3,y-3,2,2,'#f1d994');r.poly([[x+4,y-3],[x+7,y-2],[x+4,y-1]],'#c88a53');}});}
  }else if(party.kind==='kite-day'){
   r.enqueueActor(p.y+30,()=>{for(let i=0;i<3;i++){const x=p.x-22+i*19+Math.sin(clock+i)*4,y=p.y-65-i*9;r.line([[x,y],[p.x+(i-1)*9,p.y+18]],'#b0a684',.7);r.diamond(x,y,6,12,['#c18970','#d7bd77','#8eaaa0'][i]);r.line([[x,y+12],[x-3,y+18],[x+3,y+24]],'#baa078',.8);}});
  }else if(party.kind==='circus'){
   r.enqueueActor(p.y+20,()=>{for(let i=0;i<5;i++){const a=clock*2+i*Math.PI*2/5;r.ellipse(p.x+Math.cos(a)*13,p.y-14-Math.abs(Math.sin(a))*22,2.5,2.5,i%2?'#ba775c':'#ccb16f');}});
  }else if(party.kind==='pancakes'){
   r.enqueueActor(p.y+20,()=>{for(let i=0;i<4;i++)r.ellipse(p.x+11,p.y+8-i*2,6,2,'#d8b674');const h=Math.abs(Math.sin(clock*2))*32;r.ellipse(p.x-10,p.y-9-h,6,2,'#e2c184');});
  }else if(['bonfire','picnic'].includes(party.kind))r.enqueueActor(p.y+5,()=>{if(party.kind==='bonfire')drawFlames(r,p.x,p.y-5,1.3);else{r.ellipse(p.x+12,p.y+12,4,2,'#e2c89a');r.rect(p.x+11,p.y+8,3,4,'#b49668');}});
 }
}
export function drawComicBubbles(r){
 if(cinemaVisible(r.sim))return;
 const lines=[];const s=r.sim;
 if(s.liveJoke&&s.liveJoke.until>=s.year)lines.push({...s.liveJoke});
 if(s.festival&&s.festival.until>=s.year&&lines.length<2){const f=s.festival;lines.push({x:f.x,y:f.y,text:f.quips[Math.floor(r.activityTime/4)%f.quips.length]});}
 for(const speech of lines){const p=r.point(speech.x,speech.y),c=r.ctx,mobile=r.width<600;
  c.save();c.font=`${mobile?10:12}px "DM Sans",sans-serif`;
  const maxWidth=mobile?205:285,words=speech.text.split(' '),rows=[];let line='';
  for(const word of nl(speech.text).split(' ')){if(line&&c.measureText(line+' '+word).width>maxWidth){rows.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)rows.push(line);
  const w=Math.min(maxWidth+22,Math.max(...rows.map(t=>c.measureText(t).width))+22),h=rows.length*16+16;
  const box=r.reserveLabel(p.x,p.y-62*r.zoom,w,h);if(!box){c.restore();continue;}const x=box.x+w/2,y=box.y;
  c.fillStyle='#fcf4dfee';c.fillRect(x-w/2,y,w,h);r.poly([[x-5,y+h],[x+3,y+h+7],[x+8,y+h]],'#fcf4df');
  c.fillStyle='#6f7654';c.textAlign='center';rows.forEach((text,i)=>c.fillText(text,x,y+18+i*16));c.restore();
 }
}
export function drawCinemaBack(r){
 const m=r.sim.cinematic;if(!m||!cinemaVisible(r.sim))return;
 const t=m.elapsed,p=r.groundOrigin||r.origin;
 if(m.id==='independent'){
  const lift=pageant01((t-10)/10);r.ellipse(p.x,p.y+65,Math.min(390,r.width*.35)*(1-lift*.15),90*(1-lift*.2),`rgba(85,114,89,${.08+lift*.12})`);
 }else if(m.id==='last-drop'){
  const dry=pageant01((t-5)/12),c=r.ctx;c.save();c.globalAlpha=dry*.85;r.rect(0,0,r.width,r.height,'#ded3af');
  for(let i=0;i<42;i++){const x=(i*137.7)%r.width,y=(i*79.3)%r.height;r.line([[x-22,y-9],[x,y],[x+14,y-6],[x+30,y+4]],'#bfb28d',.8);r.line([[x,y],[x-5,y+19]],'#bfb28d',.8);}c.restore();
 }else if(m.id==='retreat'){
  const surge=Math.sin(pageant01((t-6)/15)*Math.PI);r.ellipse(r.width*.5,r.height*.64,r.width*.45,55+surge*35,'#b2d2c577');
 }
}
export function drawCinemaWorld(r){
 const m=r.sim.cinematic;if(!m||!cinemaVisible(r.sim))return;
 const t=r.reduced?Math.floor(m.elapsed/6)*6:m.elapsed,grow=pageant01((t-4)/7),p=r.p(2,-2),c=r.ctx;
 if(m.id==='independent'){
  for(const [i,[x,y]]of [[-6,-1],[0,-6],[5,0],[0,5]].entries()){
   const q=r.p(x,y);r.enqueueActor(q.y+2,()=>{const top=q.y-70-35*grow;r.line([[q.x-10,q.y],[q.x-12,top+15]],'#a99771',1.2);r.line([[q.x+10,q.y],[q.x+12,top+15]],'#a99771',1.2);r.ellipse(q.x,top,21*grow+3,29*grow+3,['#c4876b','#d4bb79','#8fa99c','#b7b385'][i]);r.line([[q.x,top-26*grow],[q.x,top+25*grow]],'#eee0b455',2);r.rect(q.x-7,top+29*grow,14,7,'#ad9470');});
  }
 }else if(['miracles','fortress','last-drop'].includes(m.id)){
  r.enqueueActor(p.y+3,()=>{c.save();c.translate(p.x,p.y);c.scale(Math.max(.08,grow),Math.max(.08,grow));
   r.diamond(0,0,40,20,'#c8bd92');r.poly([[-25,0],[0,12],[25,0],[25,-12],[0,-24],[-25,-12]],'#cbb88b');
   if(m.id==='miracles'){
    r.poly([[-27,-126],[-27,-38],[-7,-57],[9,-22],[25,-30],[9,-66],[35,-66]],'#b28d4c','#8e774c',2);
    r.poly([[-22,-119],[-22,-49],[-5,-66],[12,-30],[18,-34],[1,-72],[24,-72]],'#ecd187');
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7+t*.1;r.line([[Math.cos(a)*55,-84+Math.sin(a)*44],[Math.cos(a)*65,-84+Math.sin(a)*54]],'#d6b769',2);}
   }else if(m.id==='fortress'){
    for(let i=0;i<5;i++){const x=(i-2)*22;r.line([[x,-2],[x,-48]],'#a68b5c',2);r.poly([[x,-48],[x+15,-44],[x,-36]],i%2?'#a9bb9a':'#d5b57e');}
    r.line([[-55,-50],[55,-50]],'#aa9974',1);
   }else{
    r.line([[-40,0],[-40,-100],[4,-100],[4,-74],[30,-74],[30,-57]],'#9b9e86',20);
    r.line([[-42,-1],[-42,-98],[2,-98],[2,-75],[30,-75]],'#d2c6a2',9);
    r.ellipse(-20,-110,18,5,'#9b8d68');r.line([[-20,-118],[-20,-103]],'#a38d62',3);r.line([[-37,-110],[-3,-110]],'#a38d62',3);
    r.ellipse(30,-4,21,7,'#b4ac88');r.ellipse(30,-6,16,4,'#a9bba5');
    if(t<19){const fall=((t-10)*.6)%1;if(t>=10&&fall>=0){const y=-48+fall*37;r.poly([[30,y-5],[26,y+2],[30,y+5],[34,y+2]],'#8eb6ad');}}
   }
   c.restore();});
 }else if(m.id==='phoenix'){
  for(let i=0;i<5;i++){const q=r.p(i-2,2-i%2);r.enqueueActor(q.y+5,()=>{c.save();c.translate(q.x,q.y);c.scale(.7,.7);r.archStyle='classical';r.house(i*.2,1);r.line([[10,2],[10,-44]],'#b49760',2);r.poly([[10,-44],[24,-40],[10,-33]],'#d7a34f');c.restore();});}
  const q=r.p(0,-2);r.enqueueActor(q.y,()=>{r.poly([[q.x,q.y-100],[q.x-25,q.y-53],[q.x-78,q.y-78],[q.x-36,q.y-24],[q.x,q.y-36],[q.x+36,q.y-24],[q.x+78,q.y-78],[q.x+25,q.y-53]],'#cc9a50');drawFlames(r,q.x,q.y-12,.7);});
 }else if(m.id==='sanctuary'){
  const root=r.p(0,0);r.enqueueActor(root.y-2,()=>{c.save();c.translate(root.x,root.y);c.scale(1+grow*1.65,1+grow*.9);r.tree(true,.5);c.restore();});
 }else if(m.id==='retreat'){
  for(let i=0;i<6;i++){const x=-175+i*65+(t-10)*1.6,y=135+Math.sin(i*2+t)*3;r.enqueueActor(y,()=>{c.save();c.translate(x,y);r.smallBoat(true);r.poly([[-8,-8],[0,-18],[10,-9]],'#b88366');r.rect(-6,-9,14,8,'#d8cbab');c.restore();});}
 }
 if(t>2){const root=r.p(0,2);for(let i=0;i<12;i++){const x=root.x+(i%6-2.5)*9,y=root.y+14+Math.floor(i/6)*8;r.enqueueActor(y,()=>{r.person(x,y,['#c8ac72','#88a28d','#b48667'][i%3],i);if(i%3===0){r.line([[x+3,y-3],[x+3,y-25]],'#9b8e68',1);r.poly([[x+3,y-25],[x+17,y-22],[x+3,y-16]],'#d4b469');}});}}
}
export function drawCinemaOverlay(r){
 const m=r.sim.cinematic;if(!m||!cinemaVisible(r.sim))return;const t=m.elapsed,c=r.ctx;
 if(t>11&&m.id!=='retreat'&&m.id!=='last-drop'){
  for(let i=0;i<7;i++){
   const phase=((t-11)*.5+i*.31)%1,boom=pageant01((phase-.18)/.72);if(phase<.18)continue;
   const x=r.width*(.15+(i*.137)% .72),y=r.height*(.14+(i*.073)% .24);
   for(let j=0;j<9;j++){const a=j*Math.PI*2/9+i,len=12+boom*38;c.save();c.globalAlpha=1-boom;r.line([[x+Math.cos(a)*len,y+Math.sin(a)*len],[x+Math.cos(a)*(len+5),y+Math.sin(a)*(len+5)]],['#bf8d60','#d7b96a','#82a99c'][i%3],1.8);c.restore();}
  }
 }
 if(m.id==='sanctuary'&&t>10)for(let i=0;i<30;i++){const x=((i*83.7+t*11)%r.width),y=((i*47+t*18)%r.height);r.ellipse(x,y,2.5,1.2,i%2?'#d8bd95':'#b9c993');}
 if(m.cheers>0&&t>5){const q=r.point(0,1);for(let i=0;i<Math.min(24,m.cheers*4);i++){const a=i*2.4+t;r.ellipse(q.x+Math.cos(a)*55,q.y-20+Math.sin(a)*25,2,2,['#d5ad66','#9aaf80','#c38d72'][i%3]);}}
}

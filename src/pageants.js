import { cinemaVisible } from './spectacle.js';
import {nl} from './language.js';
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

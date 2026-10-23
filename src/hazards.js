import {startBlaze} from './consequences.js';
// Disasters that run downhill: lava from the volcano, water over the falls in the hills, an avalanche off the mountains.
// They follow the slope outward, damage what stands in the way, and the island takes years to rebuild.
const hzHash=(seed,a,b=0)=>{let x=(seed^Math.imul(a+17,0x2545f491)^Math.imul(b+3,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>15),0x85ebca6b);x^=x>>>13;return(x>>>0)/4294967296;};
const HAZARD_HOMES=new Set(['hut','house','townhouse','tower']);
export const REBUILD={lava:35,flood:20,avalanche:25};
export function ensureHazards(s){s.hazards??={events:[],hits:[],falls:null,lastFlood:-999};return s.hazards;}
// A path from a landform outward: each step moves to the neighbour farthest from the peak.
export function downhill(s,from,len){
 const path=[],seen=new Set([`${from.x},${from.y}`]);let cur=from;
 for(let i=0;i<len;i++){
  const next=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].map(([dx,dy])=>s.tile(cur.x+dx,cur.y+dy)).filter(t=>t&&t.kind==='land'&&!t.landform&&!seen.has(`${t.x},${t.y}`)).sort((a,b)=>Math.hypot(b.x-from.x,b.y-from.y)-Math.hypot(a.x-from.x,a.y-from.y)||hzHash(s.seed,a.x,a.y)-hzHash(s.seed,b.x,b.y))[0];
  if(!next)break;seen.add(`${next.x},${next.y}`);path.push(next);cur=next;
 }
 return path;
}
// Damage along a path: homes become ruins that need years to rebuild, fields are spoiled, and lava sets fires.
function hazardStrike(s,kind,path,{ruinUpTo=2,fire=false}={}){
 let ruined=0;
 for(const t of path){
  if(t.foundingHome||t.castle||t.landform)continue;
  if(HAZARD_HOMES.has(t.building)&&ruined<ruinUpTo){t.rebuildFrom=t.building;t.rebuildAt=s.year+REBUILD[kind];t.building='ruins';t.buildSite=null;ruined++;s.lostBuildings=(s.lostBuildings||0)+1;s.population=Math.max(4,s.population*.99);}
  else if(t.building==='farm'){t.wetUntil=kind==='flood'?s.year+8:t.wetUntil;s.food=Math.max(0,s.food*.97);}
  else if(['tree','forest','park','garden'].includes(t.building)&&kind!=='flood'){t.building=null;}
  else if(fire&&t.building&&!t.fire)startBlaze(s,t);
  if(kind==='flood')t.wetUntil=s.year+8;
 }
 if(ruined)s.rebuildRoads();
 return ruined;
}
function hazardRecord(s,kind,from,path,years){
 const h=ensureHazards(s);h.events.push({kind,year:s.year,until:s.year+years,from:{x:from.x,y:from.y},path:path.map(t=>`${t.x},${t.y}`)});
 if(h.events.length>8)h.events.shift();
}
export function lavaFlow(s){
 const v=s.land.find(t=>t.landform==='volcano');if(!v)return null;
 const path=downhill(s,v,4);if(!path.length)return null;
 const ruined=hazardStrike(s,'lava',path,{ruinUpTo:2,fire:true});hazardRecord(s,'lava',v,path,40);
 s.log(ruined?`Een lavastroom loopt de vulkaan af en neemt ${ruined===1?'een huis':'twee huizen'} mee. De bewoners bouwen het over ${REBUILD.lava} jaar opnieuw, een stukje verderop van de berg.`:'Een lavastroom kruipt de helling af en stopt vlak voor de eerste huizen. Iedereen ademt uit.','volcano',{x:path.at(-1).x,y:path.at(-1).y});
 return path;
}
export function avalanche(s,near){
 const m=s.land.filter(t=>t.landform==='mountain').sort((a,b)=>Math.hypot(a.x-near.x,a.y-near.y)-Math.hypot(b.x-near.x,b.y-near.y))[0];
 if(!m||Math.hypot(m.x-near.x,m.y-near.y)>3.5)return null;
 const path=downhill(s,m,3);if(!path.length)return null;
 const ruined=hazardStrike(s,'avalanche',path,{ruinUpTo:2});hazardRecord(s,'avalanche',m,path,25);
 s.log(ruined?'De beving maakt een lawine los. Sneeuw en stenen rollen de berg af en raken de huizen aan de voet.':'Een lawine dendert de berg af en komt tot stilstand in de weilanden.','crisis',{x:path.at(-1).x,y:path.at(-1).y});
 s.signal('rumble',path.at(-1),'Een lawine!');
 return path;
}
// The waterfall sits in the hills; after a lot of rain it overflows and the water runs down into the village.
export function waterfallSite(s){
 const h=ensureHazards(s);if(h.falls&&s.tile(h.falls.x,h.falls.y)?.landform==='hill')return h.falls;
 const hill=s.land.filter(t=>t.landform==='hill').sort((a,b)=>(b.relief||0)-(a.relief||0))[0];
 h.falls=hill?{x:hill.x,y:hill.y}:null;return h.falls;
}
export function overflow(s){
 const h=ensureHazards(s),falls=waterfallSite(s);if(!falls||s.year-h.lastFlood<60)return null;
 const hill=s.tile(falls.x,falls.y),path=downhill(s,hill,3);if(!path.length)return null;
 h.lastFlood=s.year;const ruined=hazardStrike(s,'flood',path,{ruinUpTo:1});hazardRecord(s,'flood',hill,path,12);
 s.log(ruined?'Na alle regen loopt de waterval over. Het water stroomt de heuvels af en een huis onderaan spoelt weg.':'Na alle regen loopt de waterval over. Kelders lopen onder en de akkers worden een meertje.','flood',{x:path.at(-1).x,y:path.at(-1).y});
 s.signal('flood',path.at(-1),'De waterval loopt over');
 return path;
}
// Your own heavy hand: a few trials make them strong, but many in a short time wreck the island.
export function registerHit(s,mode,spot){
 const h=ensureHazards(s);h.hits.push({mode,year:s.year});h.hits=h.hits.filter(x=>s.year-x.year<=15);
 const same=h.hits.filter(x=>x.mode===mode).length;
 if(mode==='rumble'&&spot)avalanche(s,spot);
 if(mode==='rain'&&spot){const falls=waterfallSite(s);if(falls&&Math.hypot(spot.x-falls.x,spot.y-falls.y)<=3&&same>=2)overflow(s);}
 if(same<5)return 0;
 // Carnage: the island cannot keep up any more.
 const near=s.land.filter(t=>Math.hypot(t.x-spot.x,t.y-spot.y)<=2.5&&!t.foundingHome&&!t.castle&&!t.landform);
 if(mode==='rumble'){hazardStrike(s,'avalanche',near,{ruinUpTo:3});}
 else if(mode==='fire'){for(const t of near.filter(t=>t.building&&!t.fire).slice(0,4))startBlaze(s,t);}
 else if(mode==='rain'){hazardStrike(s,'flood',near,{ruinUpTo:2});const low=s.reclaimed.filter(t=>t.kind==='land'&&Math.hypot(t.x-spot.x,t.y-spot.y)<=4);if(low.length&&s.flood)s.flood(low.slice(0,6));}
 if(same===5)s.log(mode==='rumble'?'Weer een beving, en nog een. Hele straten storten in. De bewoners vragen zich af wat ze je hebben aangedaan.':mode==='fire'?'Het ene vuur na het andere. De emmers raken op en de brandweer slaapt in de brandweerkazerne.':'Het houdt niet meer op met regenen. De dijken lopen over en de straten worden rivieren.','crisis',{x:spot.x,y:spot.y});
 return same;
}
export function advanceHazards(s){
 const h=ensureHazards(s);if(s.ending)return;
 waterfallSite(s);
 // A long, heavy shower or a storm can make the falls overflow by themselves, now and then.
 const wet=s.weather&&s.year<=s.weather.until&&['shower','thunder'].includes(s.weather.kind)||s.storm;
 if(wet&&hzHash(s.seed,s.year,7)<.04)overflow(s);
}
// Drawing: the waterfall, and the traces of lava, water and avalanches on the ground.
export function drawHazards(r){
 const s=r.sim,h=s.hazards;if(!h)return;const t=r.reduced?0:r.time,L=r.light||{};
 if(h.falls){
  const hill=s.tile(h.falls.x,h.falls.y);
  if(hill?.landform==='hill'){
   const p=r.p(hill.x,hill.y),top=-(hill.relief||40)*.55,over=h.events.some(e=>e.kind==='flood'&&s.year<=e.until),frozen=L.winter>.6;
   r.enqueueActor(p.y+11,()=>{
    const w=over?5:3;r.poly([[p.x+2-w,p.y+top],[p.x+2+w,p.y+top],[p.x+3+w*1.3,p.y+2],[p.x+3-w*1.3,p.y+2]],frozen?'#e6eef2':'#9fcfdc');
    if(!frozen)for(let k=0;k<4;k++){const f=(t*1.4+k*.25)%1;r.line([[p.x+1+k*1.3-w*.6,p.y+top+f*(-top)*.9],[p.x+1+k*1.3-w*.6,p.y+top+f*(-top)*.9+4]],'rgba(255,255,255,.8)',.7);}
    r.ellipse(p.x+3,p.y+3,8+w,3,frozen?'#dfe8ec':'#8fc0cc');r.ellipse(p.x+3,p.y+2,5,1.6,'rgba(255,255,255,.55)');
   });
  }
 }
 for(const e of h.events){
  const age=s.year-e.year,from=r.p(e.from.x,e.from.y),pts=[from,...e.path.map(k=>{const [x,y]=k.split(',').map(Number);return r.p(x,y);})];
  if(e.kind==='lava'){
   if(age>40)continue;const hot=age<6,c=r.ctx;
   c.save();c.lineCap='round';c.lineJoin='round';
   const stroke=(w,col)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y-20));c.strokeStyle=col;c.lineWidth=w;c.stroke();};
   stroke(hot?7:6,hot?'#4a2a22':'#5a4f4a');if(hot){stroke(4,'#d6502a');stroke(1.6,'#ffc24a');for(let k=0;k<3;k++){const f=(t*.2+k/3)%1,seg=f*(pts.length-1),i=Math.min(pts.length-2,Math.floor(seg)),u=seg-i;const x=pts[i].x+(pts[i+1].x-pts[i].x)*u,y=pts[i].y+(pts[i+1].y-pts[i].y)*u;r.ellipse(x,y,1.6,1,'#fff0b0');r.lavaLight?.(x,y,.6);}}
   c.restore();
  }else if(e.kind==='flood'){
   if(age>12)continue;const c=r.ctx;c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=`rgba(127,178,189,${(.6*(1-age/12)).toFixed(3)})`;c.lineWidth=12;c.stroke();c.restore();
  }else if(e.kind==='avalanche'){
   if(age>25)continue;for(const [i,p] of pts.slice(1).entries())for(let k=0;k<4;k++){const x=p.x+(hzHash(i,k)-.5)*26,y=p.y+(hzHash(k,i)-.5)*10;r.ellipse(x,y,3+hzHash(i+k,3)*3,1.6,k%2?'#eef1f3':'#a7a093');}
  }
 }
}

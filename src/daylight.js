// Days, nights and seasons are ambience only: they never touch the simulation or its randomness.
export const DAY_SECONDS=150;
export const SEASON_DAYS=2;
export const SEASON_NAMES=['lente','zomer','herfst','winter'];
export const DAYLIGHT_START=DAY_SECONDS*.32;
// Every visit begins on a morning, in any of the four seasons.
export const randomDaylightStart=(roll=Math.random())=>DAYLIGHT_START+DAY_SECONDS*SEASON_DAYS*Math.min(3,Math.floor(roll*4));
const dayClamp=n=>Math.max(0,Math.min(1,n));
const DAY_TAU=Math.PI*2;
const SUMMER_NOON={phase:.5,darkness:0,dusk:0,night:false,season:1,seasonName:'zomer',spring:0,summer:1,autumn:0,winter:0};
// A season has a plateau and soft edges, so leaves turn gradually instead of switching.
function seasonAmount(position,index){
 let distance=Math.abs(position-(index+.5));distance=Math.min(distance,4-distance);
 return dayClamp((.62-distance)/.24);
}
export function daylightAt(clock,enabled=true){
 if(!enabled||!Number.isFinite(clock))return SUMMER_NOON;
 const phase=((clock/DAY_SECONDS)%1+1)%1,sun=-Math.cos(DAY_TAU*phase);
 const darkness=dayClamp((.2-sun)/.7),dusk=dayClamp(1-Math.abs(sun-.05)/.3)*(1-darkness*.5);
 const position=((clock/DAY_SECONDS/SEASON_DAYS)%4+4)%4,season=Math.floor(position);
 return{phase,darkness,dusk,night:darkness>.5,season,seasonName:SEASON_NAMES[season],spring:seasonAmount(position,0),summer:seasonAmount(position,1),autumn:seasonAmount(position,2),winter:seasonAmount(position,3)};
}
const leafCache=new Map();
const toRgb=hex=>{const n=parseInt(hex.slice(1,7),16);return[n>>16&255,n>>8&255,n&255];};
const toHex=rgb=>'#'+rgb.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
// Deciduous leaves turn amber in autumn and frosted in winter.
export function seasonalLeaf(hex,light){
 if(!light||(!light.autumn&&!light.winter)||typeof hex!=='string'||hex[0]!=='#'||hex.length<7)return hex;
 const autumn=Math.round(light.autumn*8)/8,winter=Math.round(light.winter*8)/8,cacheKey=`${hex}|${autumn}|${winter}`;
 if(leafCache.has(cacheKey))return leafCache.get(cacheKey);
 let rgb=toRgb(hex);const warm=(rgb[0]+rgb[1])%3===0?[204,132,70]:(rgb[0]+rgb[1])%3===1?[219,166,82]:[190,112,72];
 rgb=rgb.map((v,i)=>v+(warm[i]-v)*autumn*.85);
 rgb=rgb.map((v,i)=>v+([222,226,219][i]-v)*winter*.5);
 const result=toHex(rgb)+hex.slice(7);
 if(leafCache.size>600)leafCache.clear();leafCache.set(cacheKey,result);return result;
}
const UNLIT=new Set(['farm','forest','beach','park','garden','tree','original-tree','ruins','royal-garden','palace-square','campus-square','playground','windmill','solar','wind-turbine','statue','sculpture']);
const FIRES=new Set(['campfire','bonfire']);
const lightHash=(x,y)=>{const n=Math.sin(x*91.7+y*47.3)*15731.13;return n-Math.floor(n);};
// Darkness is multiplied over the finished island; windows, fires and streetlights glow on top.
export function drawDaylight(r,light){
 if(!light||(!light.darkness&&!light.dusk))return;
 const c=r.ctx;c.save();c.setTransform(r.dpr,0,0,r.dpr,0,0);
 if(light.dusk>0){c.globalCompositeOperation='source-over';c.fillStyle=`rgba(240,160,96,${(light.dusk*.14).toFixed(3)})`;c.fillRect(0,0,r.width,r.height);}
 if(light.darkness>0){
  const k=light.darkness*.52,night=[56,72,118].map(v=>Math.round(255+(v-255)*k));
  c.globalCompositeOperation='multiply';c.fillStyle=`rgb(${night.join(',')})`;c.fillRect(0,0,r.width,r.height);
  c.globalCompositeOperation='lighter';c.translate(r.origin.x,r.origin.y);c.scale(r.zoom,r.zoom);
  const d=light.darkness,glow=(x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,DAY_TAU);c.fillStyle=color;c.fill();};
  const powered=r.sim.power>0;
  for(const t of r.visibleTiles||[]){
   if(t.kind!=='land')continue;const p=r.p(t.x,t.y);
   if(t.building==='lighthouse'){
    // A slow sweep of light over the sea; the beam is a soft wedge from the lantern room.
    const angle=(r.dayClock*.8)%DAY_TAU,x=p.x,y=p.y-62,len=280,spread=.12;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle-spread)*len,y+Math.sin(angle-spread)*len*.5);c.lineTo(x+Math.cos(angle+spread)*len,y+Math.sin(angle+spread)*len*.5);c.closePath();
    c.fillStyle=`rgba(255,236,170,${(.11*d).toFixed(3)})`;c.fill();
    glow(x,y,20,14,`rgba(255,225,150,${(.22*d).toFixed(3)})`);glow(x,y,5,5,`rgba(255,245,200,${(.6*d).toFixed(3)})`);continue;
   }
   if(FIRES.has(t.building)||t.fire){glow(p.x,p.y-8,34,17,`rgba(255,150,70,${(.13*d).toFixed(3)})`);glow(p.x,p.y-8,12,7,`rgba(255,190,110,${(.22*d).toFixed(3)})`);continue;}
   if(t.building&&!UNLIT.has(t.building)&&lightHash(t.x,t.y)<.85){glow(p.x+3,p.y-11,15,8,`rgba(255,175,95,${(.06*d).toFixed(3)})`);glow(p.x+3,p.y-11,4.5,3,`rgba(255,205,130,${(.34*d).toFixed(3)})`);}
   if(powered&&t.road&&lightHash(t.y,t.x)<.45){glow(p.x,p.y+11,9,5,`rgba(255,215,150,${(.08*d).toFixed(3)})`);glow(p.x,p.y+11,2,1.5,`rgba(255,230,170,${(.4*d).toFixed(3)})`);}
  }
 }
 c.restore();
}

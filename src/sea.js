// Life on the water is drawn only: boats follow the day, fish jump, and sometimes a whale says hello.
const seaClamp=n=>Math.max(0,Math.min(1,n));
const seaSmooth=(a,b,x)=>{const t=seaClamp((x-a)/(b-a));return t*t*(3-2*t);};
const seaHash=(a,b=0)=>{const n=Math.sin(a*12.9898+b*78.233)*43758.5453;return n-Math.floor(n);};
const HULLS=['#a6936c','#8f6f5a','#7f8f86','#a77c66','#6f7f95'];
let seaCache={key:'',coast:[],docks:[],center:{x:0,y:0},radius:200};
function seaLayout(r){
 const s=r.sim,key=`${s.seed}|${s.year}|${s.land.length}`;
 if(seaCache.key===key)return seaCache;
 const coast=[],docks=[];let sx=0,sy=0,n=0,radius=0;
 for(const t of s.tiles.values()){
  if(t.kind==='land'){const p=r.p(t.x,t.y);sx+=p.x;sy+=p.y;n++;}
  if(t.kind==='water'&&(t.building==='dock'||t.building==='harbor'))docks.push(t);
  else if(t.kind==='water'&&!t.building&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>s.tile(t.x+dx,t.y+dy)?.kind==='land'))coast.push(t);
 }
 const center={x:n?sx/n:0,y:n?sy/n:0};
 for(const t of s.land){const p=r.p(t.x,t.y);radius=Math.max(radius,Math.hypot(p.x-center.x,(p.y-center.y)*2));}
 seaCache={key,coast,docks,center,radius:radius||200};
 return seaCache;
}
function fishingBoat(r,hull,net){
 r.ellipse(0,4,13,3.5,'#86b29c22');
 r.poly([[-10,0],[9,-3],[5,4],[-6,4]],hull);r.poly([[-10,0],[-3,2],[9,-3],[2,-5]],'#d9c9a3');
 r.poly([[-3,-1],[2,-2.5],[2,-8],[-3,-6.5]],'#efe6cc');r.poly([[2,-2.5],[5,-3.5],[5,-9],[2,-8]],'#cfc4a6');
 r.line([[6,-3],[6,-15]],'#7e7a62',1);
 if(net)r.line([[6,-15],[14,-4]],'#9aa48a',.7);
}
function gull(c,x,y,wing){c.beginPath();c.moveTo(x-3.5,y-wing);c.quadraticCurveTo(x-1,y-wing,x,y);c.quadraticCurveTo(x+1,y-wing,x+3.5,y-wing);c.stroke();}
export function drawSeaLife(r){
 const s=r.sim;if(s.ending)return;
 const c=r.ctx,layout=seaLayout(r),light=r.light||{phase:.5},time=r.reduced?0:r.time;
 // Boats leave after sunrise and come home before dark.
 const fog=s.weather&&s.year<=s.weather.until&&['fog','snowstorm','thunder'].includes(s.weather.kind);
 const out=fog?0:seaSmooth(.27,.36,light.phase)*(1-seaSmooth(.64,.73,light.phase));
 const boats=Math.min(6,layout.docks.length*2+(s.era>=1?1:0));
 for(let i=0;i<boats;i++){
  const dock=layout.docks[i%Math.max(1,layout.docks.length)];
  const home=dock?r.p(dock.x,dock.y):{x:layout.center.x+layout.radius*.6,y:layout.center.y+layout.radius*.2};
  const dx=home.x-layout.center.x,dy=(home.y-layout.center.y)*2,len=Math.hypot(dx,dy)||1;
  const angle=Math.atan2(dy,dx)+(seaHash(i,3)-.5)*1.4+Math.sin(time*.03+i)*.25;
  const distance=layout.radius+60+seaHash(i,5)*110;
  const sea={x:layout.center.x+Math.cos(angle)*distance,y:layout.center.y+Math.sin(angle)*distance*.5};
  const moor={x:home.x+12+(i>=layout.docks.length?14:0),y:home.y+10};
  const x=moor.x+(sea.x-moor.x)*out,y=moor.y+(sea.y-moor.y)*out+Math.sin(time*1.1+i)*.7;
  c.save();c.translate(x,y);if(sea.x<moor.x&&out>.05)c.scale(-1,1);fishingBoat(r,HULLS[i%HULLS.length],out>.9);c.restore();
  if(out>.6){c.strokeStyle='#7d9785aa';c.lineWidth=.8;for(let g=0;g<2;g++){const a=time*.9+g*Math.PI+i;gull(c,x+Math.cos(a)*14,y-26+Math.sin(a)*4,1.5+Math.sin(time*6+g)*1);}}
 }
 if(r.reduced||!layout.coast.length)return;
 // A few fish jump near the shore; each takes its own turn.
 for(let i=0;i<4;i++){
  const period=7+i*1.3,cycle=Math.floor((time+i*2.1)/period),phase=((time+i*2.1)%period)/period;
  const spot=layout.coast[Math.floor(seaHash(cycle,i+9)*layout.coast.length)],p=r.p(spot.x,spot.y);
  const ox=(seaHash(cycle,i)-.5)*30+p.x,oy=(seaHash(i,cycle)-.5)*10+p.y+6;
  if(phase<.12){const f=phase/.12;c.save();c.translate(ox-8+f*16,oy-Math.sin(f*Math.PI)*12);c.rotate((f-.5)*1.6);r.ellipse(0,0,3.2,1.3,'#c9d3cf');r.poly([[-3,0],[-5.5,-1.6],[-5.5,1.6]],'#b4c0bc');c.restore();}
  else if(phase<.24){const f=(phase-.12)/.12;c.strokeStyle=`rgba(244,248,240,${(1-f)*.8})`;c.lineWidth=.8;c.beginPath();c.ellipse(ox+8,oy,2+f*7,1+f*3,0,0,Math.PI*2);c.stroke();}
 }
 // Now and then a whale surfaces far out and blows a fountain.
 const whaleCycle=Math.floor(time/80),wf=(time%80)/80;
 if(seaHash(whaleCycle,41)<.45&&wf<.1){
  const a=seaHash(whaleCycle,7)*Math.PI*2,d=layout.radius+150,x=layout.center.x+Math.cos(a)*d,y=layout.center.y+Math.sin(a)*d*.5,f=wf/.1;
  c.save();c.globalAlpha=Math.sin(f*Math.PI);r.ellipse(x,y,18,4,'#6f8a87');r.ellipse(x-3,y-2,10,2.5,'#7f9996');r.poly([[16,0],[24,-6],[22,1]].map(([px,py])=>[x+px,y+py]),'#6f8a87');
  for(let j=0;j<5;j++)r.ellipse(x-6+(j-2)*2.2,y-8-f*10-Math.abs(j-2)*-1.5,1.6,2.4,'rgba(240,246,244,.8)');c.restore();
 }
}

// Animals make the island feel lived in. They are drawn only and never change the simulation.
const animalHash=(a,b)=>{const n=Math.sin(a*41.3+b*289.1)*24634.6;return n-Math.floor(n);};
// Each animal faces right and is a little larger than life, so it reads at a glance.
const leg=(r,x,y,len,phase,color,w=1)=>r.line([[x,y],[x+phase,y+len]],color,w);
function sheep(r,x,y,wool,phase){
 r.ellipse(x,y+.6,5.4,1.6,'rgba(40,50,35,.18)');
 for(const lx of [-2.8,-1.2,1.6,3])leg(r,x+lx,y-1.6,2.4,lx<0?phase*.5:-phase*.5,'#3f3b36',.9);
 for(const [dx,dy,rr] of [[-2.6,-3.6,2.4],[0,-4.4,2.7],[2.4,-3.8,2.4],[-1,-2.6,2.5],[1.6,-2.7,2.3]])r.ellipse(x+dx,y+dy,rr,rr*.85,wool);
 r.ellipse(x-.6,y-5.4,2.4,1.2,'rgba(255,255,255,.35)');
 r.ellipse(x+4.6,y-4.6,1.5,1.9,'#3f3b36');r.ellipse(x+4,y-6.1,.9,.45,'#3f3b36');r.ellipse(x+5.3,y-4.3,.3,.3,'#f4f1e8');
}
function cow(r,x,y,phase){
 r.ellipse(x,y+.8,7,2,'rgba(40,50,35,.18)');
 for(const lx of [-4,-2.4,2.6,4])leg(r,x+lx,y-2.2,3.2,lx<0?phase*.5:-phase*.5,'#4a4540',1.2);
 r.ellipse(x,y-4.4,6,3.2,'#f4f1ea');r.ellipse(x-2.4,y-5.2,2.2,1.6,'#2f2b28');r.ellipse(x+1.6,y-3.6,1.7,1.2,'#2f2b28');r.ellipse(x-4.6,y-3.6,1.1,1.3,'#2f2b28');
 r.ellipse(x+.6,y-1.4,1.4,.8,'#e8b4b0');r.line([[x-6,y-5],[x-7.4,y-1.6]],'#8a8278',.7);r.ellipse(x-7.5,y-1.4,.6,.8,'#2f2b28');
 r.ellipse(x+6.8,y-5.6,2.3,2,'#f4f1ea');r.ellipse(x+8.2,y-5,1.4,1.1,'#e8b4b0');r.ellipse(x+6.2,y-6.4,.6,.6,'#2f2b28');
 r.line([[x+5.8,y-7.2],[x+5.2,y-8.8]],'#d8cfb8',.7);r.line([[x+7.4,y-7.3],[x+8.2,y-8.8]],'#d8cfb8',.7);
}
function grazingHorse(r,x,y,phase){
 r.ellipse(x,y+.8,6.6,1.8,'rgba(40,50,35,.18)');
 for(const lx of [-3.8,-2.2,2.4,3.8])leg(r,x+lx,y-3.2,4.2,lx<0?phase*.6:-phase*.6,'#5e4430',1.1);
 r.ellipse(x,y-5.6,5.6,2.8,'#8a6a4c');r.ellipse(x-1,y-6.6,4,1.2,'rgba(255,255,255,.12)');
 r.poly([[x+3.6,y-7],[x+6.4,y-12.6],[x+8.4,y-12],[x+5.8,y-5.2]],'#8a6a4c');r.ellipse(x+8.2,y-11.6,2.4,1.4,'#7a5c42');r.ellipse(x+9.6,y-11.2,.6,.5,'#3a2a20');
 r.line([[x+4,y-8],[x+6.6,y-12.8]],'#3f2c1f',1.4);r.poly([[x+6.4,y-13],[x+6.8,y-14.6],[x+7.4,y-13]],'#7a5c42');
 r.line([[x-5.4,y-6.4],[x-7.4,y-2.6+phase*.3]],'#3f2c1f',1.5);
}
function deer(r,x,y,phase){
 r.ellipse(x,y+.6,5,1.4,'rgba(40,50,35,.16)');
 for(const lx of [-3,-1.8,1.8,3])leg(r,x+lx,y-3.4,4.2,lx<0?phase*.4:-phase*.4,'#6e5a44',.8);
 r.ellipse(x,y-5.4,4.4,2.3,'#b0825a');r.ellipse(x-4,y-5.8,1.1,1,'#f4efe4');
 r.poly([[x+3,y-6.4],[x+5,y-10.6],[x+6.4,y-10],[x+4.6,y-5]],'#b0825a');r.ellipse(x+6.4,y-10.8,1.9,1.2,'#a8774f');r.ellipse(x+7.9,y-10.6,.5,.4,'#3a2a20');
 r.line([[x+5.6,y-11.6],[x+4.4,y-15]],'#6e5a44',.7);r.line([[x+4.8,y-13.6],[x+3.4,y-14.4]],'#6e5a44',.6);r.line([[x+6.6,y-11.6],[x+7.6,y-15]],'#6e5a44',.7);r.line([[x+7.2,y-13.6],[x+8.6,y-14.2]],'#6e5a44',.6);
}
function rabbit(r,x,y,hop){
 r.ellipse(x,y+.4,2.6,.8,'rgba(40,50,35,.16)');
 r.ellipse(x,y-2-hop,2.6,1.9,'#b7a68b');r.ellipse(x+2.2,y-3.4-hop,1.4,1.2,'#b7a68b');
 r.poly([[x+1.8,y-4.2-hop],[x+1.2,y-7.6-hop],[x+2.2,y-4.4-hop]],'#a8977b');r.poly([[x+2.6,y-4.2-hop],[x+2.8,y-7.4-hop],[x+3.2,y-4.2-hop]],'#b7a68b');
 r.ellipse(x-2.6,y-2.4-hop,.9,.9,'#fbf9f2');r.ellipse(x+3,y-3.4-hop,.3,.3,'#2b2b2b');
}
function seaDuck(r,x,y){
 r.ellipse(x,y+.4,3.4,.9,'rgba(255,255,255,.35)');
 r.ellipse(x,y-.6,3,1.6,'#8b6f55');r.ellipse(x-.4,y-1.2,2,.9,'#a98b6c');r.ellipse(x-3,y-1.2,1,.6,'#2f3236');
 r.ellipse(x+2.4,y-2.6,1.3,1.2,'#2f6b4a');r.ellipse(x+3.8,y-2.4,.9,.35,'#e0a040');r.line([[x+1.6,y-1.7],[x+3,y-1.7]],'#f4f1e8',.4);
}
function beachGull(r,x,y){
 r.line([[x-.4,y-1],[x-.6,y+.8]],'#e0a040',.5);r.line([[x+.8,y-1],[x+1,y+.8]],'#e0a040',.5);
 r.ellipse(x,y-2.2,2.6,1.5,'#f8f8f4');r.poly([[x-2.6,y-2.6],[x+1.4,y-3.2],[x+1,y-1.8],[x-3.6,y-1.6]],'#a9b2b4');r.poly([[x-3.6,y-1.6],[x-4.6,y-1.2],[x-3,y-2]],'#3a3f42');
 r.ellipse(x+2.2,y-3.6,1.2,1.1,'#f8f8f4');r.ellipse(x+2.6,y-3.8,.25,.25,'#2b2b2b');r.poly([[x+3.2,y-3.6],[x+4.6,y-3.3],[x+3.2,y-3.1]],'#e8c040');
}
function houseCat(r,x,y,color){
 r.ellipse(x,y+.3,2.4,.7,'rgba(40,50,35,.16)');
 r.ellipse(x,y-1.8,2,2.2,color);r.ellipse(x+.4,y-4.6,1.5,1.4,color);
 r.poly([[x-.6,y-5.4],[x-.4,y-7],[x+.4,y-5.8]],color);r.poly([[x+.6,y-5.8],[x+1.4,y-7],[x+1.6,y-5.2]],color);
 r.ellipse(x-.1,y-4.7,.25,.3,'#d8e07a');r.ellipse(x+1,y-4.7,.25,.3,'#d8e07a');
 r.ctx.beginPath();r.ctx.moveTo(x-1.6,y-.6);r.ctx.quadraticCurveTo(x-4.4,y-1,x-3.4,y-4.2);r.ctx.strokeStyle=color;r.ctx.lineWidth=.9;r.ctx.lineCap='round';r.ctx.stroke();
}
export function drawAnimals(r){
 const s=r.sim,still=r.reduced,t=still?0:r.activityTime,winter=(r.light?.winter||0)>.6,night=r.light?.night;
 let cats=0;
 for(const tile of r.visibleTiles||[]){
  if(tile.kind!=='land')continue;const p=r.p(tile.x,tile.y),h=animalHash(tile.x,tile.y);
  if(tile.building==='farm'&&!tile.fire&&!winter&&!night){
   const kind=h<.45?'sheep':h<.75?'cow':s.year>=600?'horse':'sheep',n=kind==='sheep'?3:kind==='cow'?2:1;
   for(let i=0;i<n;i++){const drift=still?0:Math.sin(t*.12+i*2+h*9)*5,x=p.x-10+i*9+drift,y=p.y+(i%2?3:-2),phase=still?0:Math.sin(t*2+i);
    r.enqueueActor(y+1,()=>kind==='sheep'?sheep(r,x,y,h>.2?'#f4f1e6':'#5c5752',phase):kind==='cow'?cow(r,x,y,phase):grazingHorse(r,x,y,phase));}
  }else if(tile.building==='forest'&&h<.3&&!night){
   const x=p.x+Math.sin(t*.08+h*20)*8,y=p.y+4;r.enqueueActor(y+1,()=>deer(r,x,y,still?0:Math.sin(t*1.5)));
  }else if(!tile.building&&!tile.road&&!tile.buildSite&&!tile.landform&&h<.06&&!winter){
   const cycle=(t*.5+h*10)%4,hop=cycle<.5?Math.sin(cycle*Math.PI*2)*2.4:0,x=p.x+((t*2+h*40)%24)-12,y=p.y+2;r.enqueueActor(y+1,()=>rabbit(r,x,y,Math.max(0,hop)));
  }else if(tile.building==='beach'&&h<.4){
   const x=p.x+(h-.2)*30,y=p.y+3;r.enqueueActor(y+1,()=>beachGull(r,x,y));
  }else if(['house','townhouse','hut'].includes(tile.building)&&h>.93&&cats<6){
   cats++;const x=p.x+12,y=p.y+6;r.enqueueActor(y+1,()=>houseCat(r,x,y,['#e0a15c','#3e3a38','#cfc8bc'][Math.floor(h*100)%3]));
  }
 }
 // Ducks paddle along the coast near the beaches.
 if(!winter)for(const tile of (r.visibleTiles||[]).filter(t=>t.building==='beach').slice(0,3)){
  const p=r.p(tile.x,tile.y);for(let i=0;i<3;i++){const x=p.x+18+i*6+(still?0:Math.sin(t*.3+i)*6),y=p.y+16+i*2;r.enqueueActor(y,()=>seaDuck(r,x,y));}
 }
}

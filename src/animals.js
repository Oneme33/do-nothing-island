// Animals make the island feel lived in. They are drawn only and never change the simulation.
const animalHash=(a,b)=>{const n=Math.sin(a*41.3+b*289.1)*24634.6;return n-Math.floor(n);};
function sheep(r,x,y,wool,phase){r.ellipse(x,y-3,4.2,2.8,wool);r.ellipse(x+3.6,y-4.2,1.7,1.5,'#4d4a44');r.line([[x-2,y-1],[x-2,y+1]],'#5d584f',.9);r.line([[x+2,y-1],[x+2+phase*.6,y+1]],'#5d584f',.9);}
function cow(r,x,y,phase){r.ellipse(x,y-4,5.4,3,'#f2efe6');r.ellipse(x-1.5,y-4.5,1.8,1.3,'#3f3a36');r.ellipse(x+2,y-3.4,1.4,1,'#3f3a36');r.ellipse(x+5,y-5,1.8,1.6,'#e9e3d6');for(const lx of [-3,3])r.line([[x+lx,y-1.5],[x+lx+phase*.5,y+1]],'#5d584f',1);}
function grazingHorse(r,x,y,phase){r.ellipse(x,y-5,5,2.6,'#8a6a4c');r.poly([[x+4,y-6],[x+7,y-10],[x+8.5,y-8.5],[x+5,y-4.5]],'#8a6a4c');for(const lx of [-3,3])r.line([[x+lx,y-3],[x+lx+phase*.6,y+1]],'#6c5038',1);r.line([[x-5,y-6],[x-7,y-2.5]],'#4f3a2a',1);}
function deer(r,x,y,phase){r.ellipse(x,y-5,3.8,2,'#a87b52');r.line([[x+3,y-6],[x+5,y-10]],'#a87b52',1.4);r.ellipse(x+5.4,y-10.4,1.4,1.1,'#a87b52');r.line([[x+5,y-11],[x+4,y-14]],'#6e5a44',.7);r.line([[x+6,y-11],[x+7,y-14]],'#6e5a44',.7);for(const lx of [-2,2])r.line([[x+lx,y-3.5],[x+lx+phase*.4,y+1]],'#6e5a44',.8);}
function rabbit(r,x,y,hop){r.ellipse(x,y-1.6-hop,2,1.4,'#b5a58c');r.ellipse(x+1.6,y-2.8-hop,.9,.8,'#b5a58c');r.line([[x+1.6,y-3.4-hop],[x+1.4,y-5.4-hop]],'#b5a58c',.7);r.ellipse(x-1.8,y-1.7-hop,.6,.6,'#f4f1e8');}
function seaDuck(r,x,y){r.ellipse(x,y,2.2,1.2,'#f2efe4');r.ellipse(x+1.8,y-1,1,.9,'#3f6b4c');r.ellipse(x+2.8,y-.9,.6,.3,'#d9a24e');}
function beachGull(r,x,y){r.ellipse(x,y-1.5,2,1.2,'#f6f6f2');r.ellipse(x+1.6,y-2.4,.9,.8,'#f6f6f2');r.line([[x-1.5,y-1.6],[x-3,y-1.2]],'#9aa3a3',.8);r.line([[x+2.4,y-2.4],[x+3.3,y-2.2]],'#d9a24e',.5);}
function houseCat(r,x,y,color){r.ellipse(x,y-1.8,2,1.5,color);r.ellipse(x+1.8,y-3.2,1.2,1.1,color);r.poly([[x+1,y-4],[x+1.4,y-5.2],[x+1.8,y-4]],color);r.poly([[x+2,y-4],[x+2.5,y-5.2],[x+2.8,y-4]],color);r.line([[x-2,y-1.5],[x-3.4,y-4]],color,.8);}
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

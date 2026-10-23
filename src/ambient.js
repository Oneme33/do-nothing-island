// Seasonal customs and night life: only scenery, never a change to the island itself.
const ambHash=(a,b)=>{const n=Math.sin(a*73.1+b*19.7)*31415.9;return n-Math.floor(n);};
export function drawSeasonal(r){
 const L=r.light||{},still=r.reduced,t=still?0:r.time;
 for(const tile of r.visibleTiles||[]){
  if(tile.kind!=='land')continue;const p=r.p(tile.x,tile.y),h=ambHash(tile.x,tile.y);
  if(L.autumn>.5&&tile.building==='farm'&&h<.6){
   // Harvest time: a haystack and a few pumpkins.
   r.enqueueActor(p.y+2,()=>{r.ellipse(p.x+9,p.y-1,6,2.4,'#5a5a3d22');r.poly([[p.x+3,p.y-1],[p.x+9,p.y-12],[p.x+15,p.y-1]],'#d8b45c');r.line([[p.x+6,p.y-5],[p.x+12,p.y-5]],'#b8943c',.8);for(let i=0;i<3;i++)r.ellipse(p.x-10+i*5,p.y+3-i,2.2,1.6,'#d9822b');});
  }else if(L.winter>.6&&!tile.building&&!tile.road&&!tile.buildSite&&!tile.landform&&h<.05){
   r.enqueueActor(p.y+2,()=>{r.ellipse(p.x,p.y-2,4,3,'#f6f7f8');r.ellipse(p.x,p.y-7,3,2.6,'#f6f7f8');r.ellipse(p.x+1.6,p.y-7.2,1.4,.5,'#e08a3c');r.line([[p.x-4,p.y-4],[p.x-7,p.y-7]],'#6f5a40',.7);});
  }else if(L.spring>.5&&!tile.building&&!tile.road&&!tile.buildSite&&!tile.landform&&h<.35){
   for(let i=0;i<4;i++)r.ellipse(p.x+(ambHash(i,tile.x)-.5)*30,p.y+(ambHash(tile.y,i)-.5)*10,1.1,1,['#f2efe4','#f1c6d0','#e2c26a','#c9b6e4'][i]);
  }else if(L.spring>.5&&tile.building==='farm'&&h>.7){
   const hop=still?0:Math.abs(Math.sin(t*4+h*9))*1.5;r.enqueueActor(p.y+3,()=>{r.ellipse(p.x-6,p.y+2-hop,2.4,1.6,'#fbf9f2');r.ellipse(p.x-4,p.y+.8-hop,1,1,'#f0e8dc');});
  }else if(L.night&&tile.building==='forest'&&h<.08){
   // An owl watching from the woods, eyes glowing.
   r.enqueueActor(p.y+1,()=>{r.ellipse(p.x+4,p.y-26,3.2,4,'#6b5640');r.ellipse(p.x+2.8,p.y-27,1,1,'#ffd36a');r.ellipse(p.x+5.2,p.y-27,1,1,'#ffd36a');});
  }
 }
 // Winter evenings: strings of lights across the square.
 if(L.winter>.5&&L.darkness>.3&&r.sim.square?.builtYear){const a=r.p(0,1),b=r.p(1,2);for(let i=0;i<10;i++){const u=i/9,x=a.x+(b.x-a.x)*u,y=a.y-26+(b.y-a.y)*u+Math.sin(u*Math.PI)*6;r.ellipse(x,y,1.2,1.2,['#ffd36a','#f19a8a','#9fd6e8','#b7e39a'][i%4]);}}
}
// Screen-space night life: stars reflected in the sea, fireflies, and now and then a shooting star.
export function drawNightLife(r){
 const L=r.light||{},c=r.ctx,W=r.width,H=r.height,t=r.reduced?0:r.time;if(!L.darkness||L.darkness<.35)return;
 c.save();const d=L.darkness;
 for(let i=0;i<70;i++){const tw=.5+.5*Math.sin(t*2+i*1.7);c.fillStyle=`rgba(255,250,225,${(.25+.5*tw)*d})`;c.fillRect(ambHash(i,1)*W,ambHash(i,2)*H,1.3,1.3);}
 if(L.summer>.4&&!r.reduced)for(let i=0;i<24;i++){const x=W*(.25+ambHash(i,3)*.5)+Math.sin(t*.7+i)*14,y=H*(.35+ambHash(i,4)*.4)+Math.cos(t*.9+i)*8,glow=.5+.5*Math.sin(t*3+i*2);c.fillStyle=`rgba(220,255,140,${glow*.8*d})`;c.beginPath();c.ellipse(x,y,1.4,1.4,0,0,Math.PI*2);c.fill();}
 const cycle=(t/45)%1;
 if(!r.reduced&&cycle<.04){const u=cycle/.04,x=W*(.15+u*.5),y=H*(.08+u*.18);c.strokeStyle=`rgba(255,255,240,${(1-u)*d})`;c.lineWidth=1.6;c.beginPath();c.moveTo(x,y);c.lineTo(x-40,y-14);c.stroke();c.fillStyle=`rgba(250,246,226,${(1-u)*d})`;c.font='11px Georgia, serif';c.fillText('Iemand doet een wens…',x+8,y+14);}
 c.restore();
}

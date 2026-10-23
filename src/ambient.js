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
  // Feasts through the year: Christmas lights, Halloween pumpkins, spring bunting and a summer carnival.
  {const dayIndex=Math.floor((r.dayClock||0)/150),firstDay=dayIndex%2===0,dark=(L.darkness||0)>.2,t2=r.reduced?0:r.time;
   for(const tile of r.visibleTiles||[]){
    if(tile.kind!=='land')continue;const p=r.p(tile.x,tile.y),h=ambHash(tile.x*5+1,tile.y*9+2);
    if(['hut','house','townhouse'].includes(tile.building)&&h<.35&&L.winter>.5&&dark){
     r.enqueueActor(p.y+7,()=>{for(let k=0;k<7;k++){const f=k/6,x=p.x-12+f*24,y=p.y-11+Math.abs(f-.5)*-6+6*Math.abs(f-.5)*0+(f<.5?f*6:(1-f)*6),on=Math.sin(t2*3+k*1.7)>-.4;r.ellipse(x,y,.9,.9,on?['#ff6b5a','#ffd36a','#7fd0ff','#9fe39a'][k%4]:'#6b6b6b');if(on&&k%2===0)r.lampLight(x,y,tile);}});
    }
    if(['hut','house','townhouse'].includes(tile.building)&&h<.25&&L.autumn>.5&&dark){
     r.enqueueActor(p.y+8,()=>{const x=p.x-9,y=p.y+3;r.ellipse(x,y,2.6,2,'#d9822b');r.line([[x,y-2],[x+.4,y-3.2]],'#6f8f4f',.7);r.poly([[x-1.4,y-.6],[x-.6,y-1.4],[x-.2,y-.4]],'#ffd36a');r.poly([[x+.2,y-.4],[x+.6,y-1.4],[x+1.4,y-.6]],'#ffd36a');r.poly([[x-1.2,y+.6],[x+1.2,y+.6],[x,y+1.2]],'#ffd36a');r.lampLight(x,y,tile);});
    }
    if(tile.building==='town-square'&&tile.x===0&&tile.y===3&&L.winter>.5){
     r.enqueueActor(p.y+9,()=>{const x=p.x+2,y=p.y+2;r.rect(x-1,y-4,2,4,'#6e5a44');for(const [w,yy,col] of [[9,-4,'#3f6b4c'],[7,-10,'#4a7a56'],[5,-15,'#55875f']])r.poly([[x-w,y+yy],[x,y+yy-9],[x+w,y+yy]],col);
      for(let k=0;k<9;k++){const a=ambHash(k,7),bx=x+(a-.5)*12*(1-k/12),by=y-4-k*2.3;const on=!dark||Math.sin(t2*2.5+k)>-.3;r.ellipse(bx,by,1,1,['#ff6b5a','#ffd36a','#7fd0ff','#f6f2e6'][k%4]);if(dark&&on&&k%3===0)r.lampLight(bx,by,tile);}
      r.poly([[x,y-27],[x+1.2,y-24.6],[x+3.6,y-24.4],[x+1.8,y-22.8],[x+2.4,y-20.4],[x,y-21.8],[x-2.4,y-20.4],[x-1.8,y-22.8],[x-3.6,y-24.4],[x-1.2,y-24.6]],'#f2c94c');if(dark)r.lampLight(x,y-24,tile);});
    }
    if(tile.building==='town-square'&&tile.x===1&&tile.y===1&&L.spring>.5&&firstDay&&!dark){
     r.enqueueActor(p.y-6,()=>{for(const [a,b] of [[[p.x-22,p.y-18],[p.x+22,p.y-6]],[[p.x-22,p.y-6],[p.x+22,p.y-18]]]){r.line([a,b],'#8a7552',.5);for(let k=1;k<9;k++){const f=k/9,x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f+Math.sin(f*Math.PI)*3;r.poly([[x-1.6,y],[x+1.6,y],[x,y+3]],['#f1a5c0','#e8c040','#9fe39a','#7fd0ff'][k%4]);}}});
    }
    if(tile.building==='town-square'&&tile.x===0&&tile.y===2&&L.summer>.5&&firstDay&&!dark){
     // Carnival on the square: costumes, flags and confetti.
     r.enqueueActor(p.y+6,()=>{for(let k=0;k<7;k++){const x=p.x-16+k*5.5+Math.sin(t2*1.5+k)*2,y=p.y+(k%2?3:-2)-Math.abs(Math.sin(t2*5+k))*2;r.person(x,y,['#d4644f','#e2c26a','#5c8fc0','#c98fb0','#8cc07a'][k%5],k);if(k%2===0){r.line([[x+2,y-8],[x+2,y-15]],'#6e5a44',.5);r.poly([[x+2,y-15],[x+6,y-14],[x+2,y-13]],['#e2c26a','#d4644f','#5c8fc0'][k%3]);}}
      for(let k=0;k<14;k++){const f=(t2*.35+ambHash(k,3))%1;r.rect(p.x-18+ambHash(k,5)*36,p.y-26+f*28,1.4,1,['#d4644f','#e2c26a','#5c8fc0','#c98fb0'][k%4]);}});
    }
   }
   // Father Christmas does his rounds by day, sack and all.
   if(L.winter>.5&&!dark){const w=r.sampleWalker?.(5);if(w&&w.stage!=='inside'&&Number.isFinite(w.x))r.enqueueActor(w.y+1,()=>{r.person(w.x,w.y,'#c64a42',5);r.ellipse(w.x,w.y-8.6,1.6,1.2,'#f6f2e6');r.poly([[w.x-1.8,w.y-11],[w.x+1.8,w.y-11],[w.x+.6,w.y-13.6]],'#c64a42');r.ellipse(w.x+.6,w.y-13.8,.7,.7,'#f6f2e6');r.ellipse(w.x-3.4,w.y-6,2.4,2.8,'#8a6a4c');});}
   // And in the mountains a yeti peeks out from behind the rocks.
   if(L.winter>.5){const peak=r.sim.land.filter(t=>t.landform==='mountain').sort((a,b)=>(b.relief||0)-(a.relief||0))[0];if(peak){const p=r.p(peak.x,peak.y),peek=r.reduced?1:Math.max(0,Math.sin(t2*.25));if(peek>.05)r.enqueueActor(p.y+12,()=>{const x=p.x+20,y=p.y-4-peek*4;r.ellipse(x,y,3.4,4.4,'#f4f6f7');r.ellipse(x,y-5.4,2.6,2.6,'#f4f6f7');r.ellipse(x,y-5.2,1.6,1.3,'#9aa7b0');r.ellipse(x-.6,y-5.6,.35,.35,'#2b2b2b');r.ellipse(x+.6,y-5.6,.35,.35,'#2b2b2b');r.line([[x+3,y-2],[x+5.6,y-6+Math.sin(t2*3)*1.4]],'#f4f6f7',1.4);});}}
  }
  // Summer: picnics in the parks and sunflowers in the gardens.
  if(L.summer>.5&&!L.night&&!L.darkness){
   for(const tile of r.visibleTiles||[]){
    if(tile.kind!=='land')continue;const p=r.p(tile.x,tile.y),h=ambHash(tile.x*3,tile.y*7);
    if(tile.building==='park'&&h<.45)r.enqueueActor(p.y+4,()=>{r.poly([[p.x+2,p.y+3],[p.x+9,p.y+.5],[p.x+14,p.y+3],[p.x+7,p.y+5.5]],h<.2?'#d9534a':'#5c8fc0');r.poly([[p.x+5,p.y+3],[p.x+9,p.y+1.5],[p.x+11,p.y+3],[p.x+7,p.y+4.4]],'rgba(255,255,255,.35)');r.person(p.x+5,p.y+2,'#c9a14f',h*9);r.person(p.x+12,p.y+2.5,'#7fa3a8',h*7);r.ellipse(p.x+9,p.y+3,1.4,1,'#a77c4f');});
    else if(tile.building==='garden'&&h<.6)r.enqueueActor(p.y+3,()=>{for(let i=0;i<3;i++){const x=p.x-10+i*5,y=p.y+2-i;r.line([[x,y],[x,y-9]],'#6f8f4f',.8);r.ellipse(x,y-9.5,2,2,'#e8c040');r.ellipse(x,y-9.5,.9,.9,'#7a5a30');}});
   }
  }
 // Winter evenings: strings of lights across the square.
 if(L.winter>.5&&L.darkness>.3&&r.sim.square?.builtYear){const a=r.p(0,1),b=r.p(1,2);for(let i=0;i<10;i++){const u=i/9,x=a.x+(b.x-a.x)*u,y=a.y-26+(b.y-a.y)*u+Math.sin(u*Math.PI)*6;r.ellipse(x,y,1.2,1.2,['#ffd36a','#f19a8a','#9fd6e8','#b7e39a'][i%4]);}}
}
// Screen-space feasts: fireworks on the carnival night, bats on autumn nights.
export function drawFestivities(r){
 const L=r.light||{},c=r.ctx,W=r.width,H=r.height,t=r.reduced?0:r.time,firstDay=Math.floor((r.dayClock||0)/150)%2===0;if(r.sim.ending)return;
 c.save();c.setTransform(r.dpr,0,0,r.dpr,0,0);
 if(L.summer>.5&&firstDay&&L.darkness>.4&&!r.reduced)for(let k=0;k<4;k++){const cyc=(t*.3+k*.27)%1,x=W*(.25+ambHash(k,Math.floor(t*.3+k*.27))*.5),y=H*(.12+ambHash(k,9)*.2),col=['#ff6b5a','#ffd36a','#7fd0ff','#f1a5c0'][k];if(cyc<.25){c.fillStyle='rgba(255,240,200,.8)';c.fillRect(x-.6,y+(1-cyc/.25)*H*.3,1.2,4);}else{const open=(cyc-.25)/.75;c.globalAlpha=1-open;c.fillStyle=col;for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.beginPath();c.ellipse(x+Math.cos(a)*open*42,y+Math.sin(a)*open*32+open*10,1.8,1.8,0,0,Math.PI*2);c.fill();}c.globalAlpha=1;}}
 if(L.autumn>.5&&L.darkness>.4&&!r.reduced){c.strokeStyle='rgba(30,30,36,.75)';c.lineWidth=1.2;for(let k=0;k<3;k++){const u=(t*.04+k*.33)%1,x=W*u,y=H*(.18+k*.06)+Math.sin(t*2+k)*8,wing=2.4+Math.sin(t*12+k)*1.8;c.beginPath();c.moveTo(x-5,y-wing);c.lineTo(x-2,y);c.lineTo(x,y-1);c.lineTo(x+2,y);c.lineTo(x+5,y-wing);c.stroke();}}
 c.restore();
}
// A reward for doing nothing for ten minutes: northern lights, a meteor shower or a whale jumping close to shore.
export function drawIdleEvent(r){
 const e=r.idleEvent;if(!e||r.sim.ending)return;const age=r.time-e.start,dur=40;if(age>dur){r.idleEvent=null;return;}
 const c=r.ctx,W=r.width,H=r.height,k=Math.min(1,age/4,(dur-age)/5);c.save();c.setTransform(r.dpr,0,0,r.dpr,0,0);
 if(e.kind==='aurora'){c.globalCompositeOperation='lighter';for(let b=0;b<3;b++){c.beginPath();for(let x=0;x<=W;x+=12){const y=H*(.1+b*.05)+Math.sin(x*.01+r.time*.3+b)*18;x?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=`rgba(${b===1?'170,120,255':'120,255,190'},${(.22*k).toFixed(3)})`;c.lineWidth=26-b*6;c.stroke();}}
 else if(e.kind==='meteors'){for(let i=0;i<5;i++){const cyc=(age*.5+i*.21)%1;if(cyc>.25)continue;const u=cyc/.25,x=W*(.2+((i*37)%60)/100)+u*80,y=H*(.06+((i*23)%20)/100)+u*30;c.strokeStyle=`rgba(255,255,240,${((1-u)*k).toFixed(3)})`;c.lineWidth=1.4;c.beginPath();c.moveTo(x,y);c.lineTo(x-36,y-13);c.stroke();}}
 else{const cyc=(age*.12)%1,x=W*.2+cyc*60,base=H*.8,jump=Math.sin(Math.min(1,cyc*2.2)*Math.PI)*70;c.globalAlpha=k;if(cyc<.46){c.save();c.translate(x,base-jump);c.rotate(-.6+cyc*2.6);c.fillStyle='#4f6a7a';c.beginPath();c.ellipse(0,0,26,8,0,0,Math.PI*2);c.fill();c.fillStyle='#dfe8ec';c.beginPath();c.ellipse(4,4,16,3.4,0,0,Math.PI*2);c.fill();c.fillStyle='#4f6a7a';c.beginPath();c.moveTo(-24,0);c.lineTo(-36,-9);c.lineTo(-34,6);c.closePath();c.fill();c.restore();}else{const s=(cyc-.46)/.54;c.fillStyle=`rgba(240,246,248,${((1-s)*.8).toFixed(3)})`;for(let i=0;i<10;i++){c.beginPath();c.ellipse(x+30+(i-5)*5,base-Math.sin(s*Math.PI)*(16+i%3*6),2.4,3,0,0,Math.PI*2);c.fill();}}}
 c.restore();
}
// Summer days feel warm: a soft golden wash and a sun in the corner.
export function drawSummerSun(r){
 const L=r.light||{},s=L.summer||0;if(s<.3||L.darkness>.15||r.sim.storm||r.sim.ending)return;
 const c=r.ctx,W=r.width,H=r.height,k=(s-.3)/.7*(1-(L.darkness||0)*4);c.save();c.setTransform(r.dpr,0,0,r.dpr,0,0);
 c.fillStyle=`rgba(255,214,140,${(.06*k).toFixed(3)})`;c.fillRect(0,0,W,H);
 const g=c.createRadialGradient(W*.88,H*.08,0,W*.88,H*.08,H*.5);g.addColorStop(0,`rgba(255,240,190,${(.45*k).toFixed(3)})`);g.addColorStop(.25,`rgba(255,226,160,${(.16*k).toFixed(3)})`);g.addColorStop(1,'rgba(255,226,160,0)');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.restore();
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

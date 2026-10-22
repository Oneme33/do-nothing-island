// Interventions you can feel: fleeing residents, rain on the fields, smoke and a bucket brigade.
const fxHash=(a,b)=>{const n=Math.sin(a*91.3+b*17.7)*9876.5;return n-Math.floor(n);};
export function drawInterventionFx(r){
 const c=r.ctx,still=r.reduced;
 for(const e of r.effects){
  if(!Number.isFinite(e.x)||!Number.isFinite(e.y))continue;const p=r.p(e.x,e.y),t=e.elapsed;
  if(e.type==='rumble'&&t<3.5){
   // Residents run out, wait, and wander back once the ground is quiet.
   const out=t<1.6?t/1.6:t<2.3?1:Math.max(0,1-(t-2.3)/1.2);
   for(let i=0;i<7;i++){const a=i/7*Math.PI*2+fxHash(i,e.x),d=8+out*34;const x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d*.5;r.enqueueActor(y,()=>{r.person(x,y,['#a37b5f','#7f9481','#c09870'][i%3],still?0:i+t*8);if(t<1.6)r.ellipse(x-Math.cos(a)*5,y-Math.sin(a)*2.5+2,3,1.2,'rgba(190,175,140,.5)');});}
   if(t<1.2){c.strokeStyle=`rgba(150,130,100,${.5*(1-t/1.2)})`;c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y,10+t*40,5+t*20,0,0,Math.PI*2);c.stroke();}
  }else if(e.type==='rain'&&t<3){
   c.strokeStyle='rgba(150,190,200,.6)';c.lineWidth=.9;
   for(let i=0;i<40;i++){const fx=(fxHash(i,1)-.5)*110,fy=(fxHash(i,2)-.5)*55,fall=still?.5:((t*1.8+fxHash(i,3))%1);const x=p.x+fx,y=p.y+fy-40+fall*40;c.beginPath();c.moveTo(x,y);c.lineTo(x-2,y+6);c.stroke();if(fall>.85)r.ellipse(x-2,y+7,2.2,.9,'rgba(220,236,240,.7)');}
  }else if(e.type==='fire'&&t<4.5){
   for(let i=0;i<6;i++){const f=still?.4:((t*.5+i/6)%1);r.ellipse(p.x+Math.sin(f*5+i)*6+f*10,p.y-20-f*55,4+f*10,3+f*7,`rgba(120,115,105,${(1-f)*.35})`);}
  }else if(/^Een schat/.test(e.label||'')&&t<4){
   // Treasure: the lid opens, golden rays turn and coins fly up and tumble back down.
   const glow=Math.min(1,t*2)*(1-Math.max(0,t-3));c.save();c.globalAlpha=.55*glow;
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2+(still?0:t*.6);c.beginPath();c.moveTo(p.x,p.y-8);c.lineTo(p.x+Math.cos(a-.12)*34,p.y-8+Math.sin(a-.12)*20);c.lineTo(p.x+Math.cos(a+.12)*34,p.y-8+Math.sin(a+.12)*20);c.closePath();c.fillStyle='#f6dc8a';c.fill();}
   c.restore();
   r.poly([[p.x-6,p.y],[p.x,p.y+3],[p.x,p.y-3],[p.x-6,p.y-6]],'#8d6542');r.poly([[p.x,p.y+3],[p.x+6,p.y],[p.x+6,p.y-6],[p.x,p.y-3]],'#74543a');
   const lid=Math.min(1,t*1.5);r.poly([[p.x-6,p.y-6],[p.x,p.y-3],[p.x+2-lid*4,p.y-9-lid*5],[p.x-4-lid*4,p.y-11-lid*4]],'#a37a4f');r.ellipse(p.x,p.y-4,4.5,1.8,'#f1d77a');
   for(let i=0;i<9;i++){const f=still?.5:Math.min(1,t/1.6+fxHash(i,9)*.2),vx=(fxHash(i,7)-.5)*36,x=p.x+vx*f,y=p.y-6-Math.sin(f*Math.PI)*(26+fxHash(i,8)*14);r.ellipse(x,y,1.8,1.3,'#e5b94a');r.ellipse(x-.4,y-.3,.7,.5,'#fff1b8');}
  }else if((e.type==='nudge'||e.type==='repair')&&t<2.5){
   for(let i=0;i<10;i++){const f=still?.5:((t*.6+fxHash(i,5))%1);r.ellipse(p.x+(fxHash(i,6)-.5)*36,p.y-8-f*36,1.3,1.3,`rgba(240,212,120,${(1-f)})`);}
  }
 }
 // A bucket brigade walks to every burning plot until the fire is out.
 for(const t of r.visibleTiles||[]){
  if(!t.fire)continue;const p=r.p(t.x,t.y);
  for(let i=0;i<3;i++){const sway=still?0:Math.sin(r.time*3+i*2)*2,x=p.x+20+i*9,y=p.y+12+i*4.5+sway*.3;r.enqueueActor(y,()=>{r.person(x,y,['#7f9481','#a37b5f','#899e78'][i],still?0:r.time*4+i);r.rect(x-5,y-8+sway,3,3,'#8a8f94');});}
  if(!still){const f=(r.time*.8)%1;r.ellipse(p.x+18-f*14,p.y+4-Math.sin(f*Math.PI)*14,1.6,1.6,'rgba(170,205,220,.8)');}
 }
}

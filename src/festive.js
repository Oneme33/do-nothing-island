// A real party: bunting, lanterns, a ring of dancers, music notes, a snack stall and fireworks after dark.
const festHash=(a,b)=>{const n=Math.sin(a*63.7+b*11.3)*31337.7;return n-Math.floor(n);};
const FEST_COLOURS=['#d4644f','#e2c26a','#7fa3a8','#c98fb0','#93a77b'];
export function drawFestive(r){
 const f=r.sim.festival;if(!f||r.sim.ending||!Number.isFinite(f.x))return;
 const c=r.ctx,p=r.p(f.x,f.y),t=r.reduced?0:r.time,dark=r.light?.darkness||0;
 // Bunting and lanterns on four poles around the party.
 const poles=[[-30,-6],[0,-21],[30,-6],[0,9]];
 for(const [x,y] of poles)r.line([[p.x+x,p.y+y],[p.x+x,p.y+y-22]],'#7d7464',1);
 for(let i=0;i<4;i++){const [ax,ay]=poles[i],[bx,by]=poles[(i+1)%4];
  for(let k=0;k<6;k++){const u=(k+.5)/6,x=p.x+ax+(bx-ax)*u,y=p.y+ay-22+(by-ay)*u+Math.sin(u*Math.PI)*4;
   r.poly([[x-2,y],[x+2,y],[x,y+3.5]],FEST_COLOURS[(i+k)%5]);
   if(k%2===0){r.ellipse(x,y+5,1.6,2,dark>.2?'#ffd98c':'#f0c870');if(dark>.2){c.save();c.globalAlpha=.25*dark;r.ellipse(x,y+5,6,6,'#ffcf7a');c.restore();}}}}
 // A ring of dancers turning around the centre.
 for(let i=0;i<8;i++){const a=t*.9+i/8*Math.PI*2,x=p.x+Math.cos(a)*16,y=p.y+Math.sin(a)*8,hop=r.reduced?0:Math.abs(Math.sin(t*5+i))*2;r.enqueueActor(y,()=>r.person(x,y-hop,FEST_COLOURS[i%5],t*6+i));}
 // A snack stall with a striped roof.
 r.enqueueActor(p.y+12,()=>{const x=p.x+22,y=p.y+10;r.poly([[x-6,y],[x+6,y-3],[x+6,y-8],[x-6,y-5]],'#b29b74');r.poly([[x-8,y-6],[x+8,y-10],[x+7,y-14],[x-7,y-10]],'#d4644f');r.line([[x-4,y-7],[x+5,y-10]],'#fbf3e4',1.2);});
 if(r.reduced)return;
 for(let i=0;i<4;i++){const u=(t*.35+i/4)%1;c.fillStyle=`rgba(90,80,60,${1-u})`;c.font='10px serif';c.fillText(i%2?'♪':'♫',p.x-10+i*7+Math.sin(u*6)*4,p.y-24-u*30);}
 for(let i=0;i<14;i++){const u=(t*.25+festHash(i,1))%1;r.ellipse(p.x+(festHash(i,2)-.5)*60,p.y-40+u*46,1,1.4,FEST_COLOURS[i%5]);}
 if(dark>.3){
  // Fireworks: a few bursts that rise, open and fade.
  for(let k=0;k<3;k++){const cycle=(t*.4+k*.37)%1,cx=p.x+(festHash(k,Math.floor(t*.4+k*.37))-.5)*120,cy=p.y-70-festHash(k,3)*40,col=FEST_COLOURS[(k+Math.floor(t*.4))%5];
   if(cycle<.3)r.ellipse(cx,cy+60*(1-cycle/.3),1.2,1.2,'#fff3c4');
   else{const open=(cycle-.3)/.7;c.save();c.globalAlpha=(1-open)*dark;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;r.ellipse(cx+Math.cos(a)*open*22,cy+Math.sin(a)*open*14+open*6,1.4,1.4,col);}c.restore();}}
 }
}

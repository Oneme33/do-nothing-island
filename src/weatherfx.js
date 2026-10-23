// How the weather looks: rain, lightning, fog banks, a dry tint, heat shimmer, snow and a rainbow afterwards.
const wfHash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
export function drawWeather(r){
 const s=r.sim,w=s.weather;if(!w||s.ending)return;
 const active=s.year<=w.until?w.kind:null,c=r.ctx,W=r.width,H=r.height,t=r.reduced?0:r.time;
 c.save();
 if(active==='shower'||active==='thunder'){
  c.fillStyle=active==='thunder'?'rgba(40,52,70,.22)':'rgba(90,110,110,.08)';c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(225,235,235,.45)';c.lineWidth=.8;
  for(let i=0;i<(active==='thunder'?140:100);i++){const x=(wfHash(i,2)*W+t*30)%W,y=(wfHash(i,3)*H+t*180)%H;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+10);c.stroke();}
  if(active==='thunder'&&!r.reduced&&(t%6)<.14){
   c.fillStyle='rgba(255,255,240,.45)';c.fillRect(0,0,W,H);
   if(w.strike){const p=r.point(w.strike.x,w.strike.y);c.strokeStyle='#fffbe0';c.lineWidth=2.2;c.beginPath();let x=p.x+30,y=0;c.moveTo(x,y);for(let k=1;k<=6;k++){x=p.x+30-30*k/6+(wfHash(k,Math.floor(t))-.5)*26;y=(p.y-20)*k/6;c.lineTo(x,y);}c.stroke();}
  }
 }else if(active==='fog'){
  c.fillStyle='rgba(238,242,240,.38)';c.fillRect(0,0,W,H);
  for(let i=0;i<6;i++){const y=H*(.2+i*.13),x=((t*8*(i%2?1:-1))+i*140)%(W+300)-150;c.fillStyle='rgba(248,250,248,.35)';c.beginPath();c.ellipse(x+W/2,y,W*.45,26,0,0,Math.PI*2);c.fill();}
 }else if(active==='drought'){
  c.fillStyle='rgba(214,180,110,.14)';c.fillRect(0,0,W,H);
 }else if(active==='heatwave'){
  c.fillStyle='rgba(255,196,120,.09)';c.fillRect(0,0,W,H);
  if(!r.reduced){c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;for(let i=0;i<14;i++){const y=(wfHash(i,9)*H+t*10)%H;c.beginPath();for(let x=0;x<=W;x+=20)c[x?'lineTo':'moveTo'](x,y+Math.sin(x*.05+t*3+i)*2);c.stroke();}}
 }else if(active==='snowstorm'){
  c.fillStyle='rgba(240,244,248,.2)';c.fillRect(0,0,W,H);c.fillStyle='rgba(255,255,255,.9)';
  for(let i=0;i<160;i++){const x=(wfHash(i,4)*W+t*40+Math.sin(t+i)*10)%W,y=(wfHash(i,5)*H+t*55)%H;const rad=1+wfHash(i,6)*1.4;c.beginPath();c.ellipse(x,y,rad,rad,0,0,Math.PI*2);c.fill();}
 }
 // A rainbow after a shower, only by day: it fades in, stays about fourteen seconds and fades out, whatever the speed.
 if(w.rainbow&&r._rainbowKey!==w.rainbow){r._rainbowKey=w.rainbow;r._rainbowStart=Date.now();}
 const since=(Date.now()-(r._rainbowStart||0))/1000,day=1-Math.min(1,(r.light?.darkness||0)*3);
 const rainbow=r._rainbowStart&&!active&&since<18?Math.min(1,since/2.5,(18-since)/3)*day:0;
 if(rainbow>0){
  // Anchored to the island: it moves and scales with the camera instead of hanging on the screen.
  const anchor=r.point(0,0),z=r.zoom||1,cx=anchor.x,cy=anchor.y+60*z,colours=['#e46b5d','#eda04f','#efd36a','#8cc07a','#6fa8d6','#8f7fc4'];c.globalAlpha=.3*rainbow;c.lineWidth=7*z;
  colours.forEach((col,i)=>{c.strokeStyle=col;const rad=320*z-i*7*z;c.beginPath();c.ellipse(cx,cy,rad,rad,0,Math.PI*1.08,Math.PI*1.92);c.stroke();});
 }
 c.restore();
}

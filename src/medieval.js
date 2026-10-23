// The long middle of the story gets a moment per century: monks, markets, knights, a dragon (a kite), a cathedral, tulips.
const medHash=(seed,a,b=0)=>{let x=(seed^Math.imul(a+41,0x2545f491)^Math.imul(b+9,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>15),0x85ebca6b);x^=x>>>13;return(x>>>0)/4294967296;};
export const MEDIEVAL=[
 {year:537,kind:'monastery',years:0,label:'Een klooster!',sound:'chime',text:'Monniken stichten een klooster aan de rand van het eiland. Ze brouwen bier, kweken kruiden en zwijgen over allebei.'},
 {year:637,kind:'market',years:6,label:'Jaarmarkt!',sound:'fanfare',text:'De eerste jaarmarkt op het plein. Er is een kraam met kaas, een met kazen en een met twijfelachtig mooie kazen.'},
 {year:737,kind:'dragon',years:5,label:'Een draak!',sound:'whoosh',text:'Iemand ziet een draak boven de berg. Het blijkt een vlieger van de bakkersdochter. De vlieger krijgt een naam en een eigen feestdag.'},
 {year:837,kind:'tournament',years:6,label:'Een toernooi!',sound:'fanfare',text:'Een riddertoernooi! Twee ridders stormen op elkaar af, missen elkaar allebei en worden samen uitgeroepen tot winnaar.'},
 {year:937,kind:'pilgrims',years:4,label:'Pelgrims',sound:'chime',text:'Pelgrims trekken over het eiland, op weg naar de oude boom. Ze vinden hem prachtig en blijven een week.'},
 {year:1137,kind:'cathedral',years:0,label:'Een kathedraal',sound:'fanfare',text:'De bouw van een kathedraal begint. De bouwmeester zegt dat het zeventig jaar duurt. Hij zegt het met een heel rustig gezicht.'},
 {year:1237,kind:'market',years:6,label:'Gildenfeest',sound:'fanfare',text:'De gilden houden hun grote feest: bakkers, smeden en mandenmakers paraderen over het plein, elk iets te trots.'},
 {year:1337,kind:'tournament',years:5,label:'Troubadours',sound:'chime',text:'Troubadours zingen op het toernooiveld over de daden van de ridders. De meeste daden zijn verzonnen, alle liedjes zijn goed.'},
 {year:1457,kind:'printing',years:0,label:'Een drukpers!',sound:'chime',text:'Er komt een drukpers. Het eerste boek is een kookboek. Het tweede ook.'},
 {year:1537,kind:'market',years:6,label:'Kermis!',sound:'fanfare',text:'Kermis op het plein, met een draaimolen die met de hand wordt rondgeduwd door drie zeer sterke neven.'},
 {year:1637,kind:'tulips',years:20,label:'Tulpenmanie',sound:'chime',text:'Tulpenmanie! Iedereen wil tulpen, een bol kost meer dan een koe. De akkers kleuren rood, geel en roze.'}
];
export const CATHEDRAL_YEARS=70;
export function ensureMedieval(s){s.medieval??={done:[],active:null};return s.medieval;}
function placeMonastery(s){
 const spots=s.land.filter(t=>!t.building&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.road&&!t.river&&!t.foundingHome&&Math.hypot(t.x,t.y)>=6);
 return spots.sort((a,b)=>Math.hypot(b.x,b.y)-Math.hypot(a.x,a.y))[Math.floor(medHash(s.seed,5)*Math.min(6,spots.length))]||null;
}
function placeCathedral(s){
 const ok=t=>t&&t.kind==='land'&&!t.landform&&!t.buildSite&&!t.reservedFor&&!t.foundingHome&&!t.river&&!t.castle&&!t.plaque&&(!t.building||['hut','house','tree','garden','park','farm'].includes(t.building));
 return s.land.filter(t=>ok(t)&&Math.hypot(t.x-.5,t.y-2)<=5&&Math.hypot(t.x-.5,t.y-2)>=2).sort((a,b)=>Number(!!a.building)-Number(!!b.building)||Math.hypot(a.x,a.y-2)-Math.hypot(b.x,b.y-2))[0]||null;
}
export function advanceMedieval(s){
 const m=ensureMedieval(s);if(s.ending)return;
 if(m.active&&s.year>m.active.until)m.active=null;
 const event=MEDIEVAL.find(e=>s.year===e.year&&!m.done.includes(e.year));if(!event)return;
 m.done.push(event.year);
 let at=s.tile(0,2)||s.tile(0,0);
 if(event.kind==='monastery'){const t=placeMonastery(s);if(!t)return;t.building='monastery';t.builtYear=s.year;at=t;s.rebuildRoads();}
 else if(event.kind==='cathedral'){const t=placeCathedral(s);if(!t)return;t.building='cathedral';t.builtYear=s.year;t.cathedralFrom=s.year;t.landmark=true;at=t;s.rebuildRoads();}
 else if(event.kind==='tournament'){const c=s.court&&s.tile(s.court.x+2,s.court.y+2);at=c?.kind==='land'?c:s.tile(1,1)||at;}
 else if(event.kind==='dragon')at=s.land.filter(t=>t.landform).sort((a,b)=>(b.relief||0)-(a.relief||0))[0]||at;
 if(event.years)m.active={kind:event.kind,year:s.year,until:s.year+event.years,x:at.x,y:at.y};
 if(event.kind==='printing')s.printingPress=s.year;
 s.prosperity=Math.min(94,s.prosperity+1.5);
 s.log(event.text,'culture',{x:at.x,y:at.y});
 s.signal('celebrate',at,event.label,{sound:event.sound,text:event.text.split('. ')[0]+'.'});
}
export const tulipTime=s=>s.medieval?.active?.kind==='tulips';
// Drawing the temporary scenes: market stalls, a tournament, pilgrims and the dragon kite over the mountain.
export function drawMedieval(r){
 const s=r.sim,a=s.medieval?.active;if(!a||s.ending)return;
 const t=r.reduced?0:r.time,p=r.p(a.x,a.y),c=r.ctx;
 if(a.kind==='market'){
  const stalls=[[-14,-2,'#d4644f'],[2,-8,'#5c8fc0'],[12,2,'#e2c26a'],[-4,6,'#8cc07a']];
  for(const [dx,dy,col] of stalls)r.enqueueActor(p.y+dy+6,()=>{const x=p.x+dx,y=p.y+dy;r.rect(x-5,y-6,10,6,'#c9a77a');r.poly([[x-7,y-6],[x,y-12],[x+7,y-6]],col);for(let k=0;k<3;k++)r.poly([[x-7+k*4.6,y-6],[x-4.7+k*4.6,y-9.5],[x-2.4+k*4.6,y-6]],'#f6f2e6');for(let k=0;k<3;k++)r.ellipse(x-3+k*3,y-6.5,1.1,.8,['#e8c040','#d9822b','#a05a3a'][k]);r.person(x+7,y+3,'#a07a5a',dx);});
 }else if(a.kind==='tournament'){
  r.enqueueActor(p.y+8,()=>{
   for(const [dx,dy,col] of [[-18,-6,'#d4644f'],[18,-8,'#5c8fc0']]){const x=p.x+dx,y=p.y+dy;r.ellipse(x,y+1,6,2.5,'rgba(40,50,35,.15)');for(let k=0;k<6;k++){const a0=Math.PI+k*Math.PI/6,a1=a0+Math.PI/6;r.poly([[x+Math.cos(a0)*6,y+Math.sin(a0)*-2.6],[x+Math.cos(a1)*6,y+Math.sin(a1)*-2.6],[x,y-14]],k%2?'#f6f2e6':col);}r.line([[x,y-14],[x,y-19]],'#6e5a44',.6);r.poly([[x,y-19],[x+4,y-18],[x,y-17]],col);}
   r.line([[p.x-12,p.y+2],[p.x+12,p.y+8]],'#8a6a4c',1.2);
   const u=(t*.35)%1,k=u<.5?u*2:2-u*2;
   for(const [side,col] of [[-1,'#d4644f'],[1,'#5c8fc0']]){const x=p.x+side*(14-k*11),y=p.y+5+side*(-3+k*1.8)+ (side>0?3:0);c.save();c.translate(x,y);if(side>0)c.scale(-1,1);r.ellipse(0,-4,4.6,2.4,'#8a6a4c');r.poly([[3,-5],[6,-9],[7.4,-8],[4.4,-4]],'#8a6a4c');for(const lx of [-2.6,2.6])r.line([[lx,-2.6],[lx+Math.sin(t*9)*.8,1]],'#6c5038',.9);r.rect(-1.6,-10,3.2,5,col);r.ellipse(0,-11,1.6,1.6,'#b8bcc0');r.line([[1,-8],[11,-10]],'#d8cfb8',.9);c.restore();}
  });
 }else if(a.kind==='pilgrims'){
  for(let i=0;i<5;i++){const u=((t*.03)+i*.12)%1,x=p.x-60+u*120,y=p.y+20-u*40+i*2;r.enqueueActor(y,()=>{r.person(x,y,'#8a7a62',i);r.line([[x+2.6,y-9],[x+3,y+1]],'#6e5a44',.6);});}
 }else if(a.kind==='dragon'){
  // A red dragon kite on a long string, dancing above the mountain.
  const z=r.zoom,base=r.point(a.x,a.y),x=base.x+40*z+Math.sin(t*.6)*14*z,y=base.y-150*z+Math.cos(t*.8)*8*z;
  c.save();c.setTransform(r.dpr,0,0,r.dpr,0,0);c.strokeStyle='rgba(90,80,70,.5)';c.lineWidth=.8;c.beginPath();c.moveTo(base.x+60*z,base.y-20*z);c.quadraticCurveTo(base.x+70*z,base.y-80*z,x,y);c.stroke();
  c.translate(x,y);c.scale(z,z);c.rotate(Math.sin(t*1.3)*.15);
  c.fillStyle='#c64a42';c.beginPath();c.moveTo(0,-9);c.lineTo(7,0);c.lineTo(0,9);c.lineTo(-7,0);c.closePath();c.fill();c.fillStyle='#e2c26a';c.beginPath();c.ellipse(-1,-2,1.4,1.4,0,0,Math.PI*2);c.ellipse(2,-2,1.4,1.4,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#c64a42';c.lineWidth=2;c.beginPath();c.moveTo(0,9);for(let k=1;k<=6;k++)c.lineTo(Math.sin(t*3+k)*4,9+k*5);c.stroke();
  for(let k=1;k<=6;k+=2){c.fillStyle=k%4===1?'#e2c26a':'#5c8fc0';c.beginPath();c.ellipse(Math.sin(t*3+k)*4,9+k*5,1.8,1,0,0,Math.PI*2);c.fill();}
  c.restore();
 }
}

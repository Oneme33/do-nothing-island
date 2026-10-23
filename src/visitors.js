// Now and then someone arrives from overseas. They stay a few years, leave something behind and sail, float or fly on.
const visitHash=(seed,a,b=0)=>{let x=(seed^Math.imul(a+11,0x27d4eb2d)^Math.imul(b+5,0x165667b1))>>>0;x=Math.imul(x^(x>>>15),0x2c1b3c6d);x^=x>>>12;return(x>>>0)/4294967296;};
const harborTile=s=>{for(const t of s.tiles.values())if(t.kind==='water'&&(t.building==='harbor'||t.building==='dock'))return t;return null;};
export const VISITORS=[
 {kind:'trader',since:250,by:'sea',stay:5,label:'Een handelsschip!',arrive:'Een handelsschip van overzee legt aan. De koopman ruilt kaneel tegen zeventien potten jam en een heel serieus gesprek over het weer.',leave:'Het handelsschip vertrekt. Er blijft een geur van kaneel hangen, en een kat die besloot te blijven.',effect:s=>{s.wealth+=30;s.food+=20;s.prosperity=Math.min(94,s.prosperity+3);}},
 {kind:'explorer',since:950,by:'sea',stay:4,label:'Land in zicht!',arrive:'Een ontdekkingsreiziger stapt aan land en plant trots een vlag. Als hij hoort dat hier al eeuwen mensen wonen, haalt hij de vlag heel zachtjes weer weg.',leave:'De ontdekkingsreiziger vaart verder. Op zijn kaart staat het eiland nu, alleen iets te groot en met een draak erbij.',effect:s=>{s.technology+=.4;s.prosperity=Math.min(94,s.prosperity+2);}},
 {kind:'balloon',since:1785,by:'air',stay:3,label:'Een luchtballon!',arrive:'Een luchtballon landt midden op het plein. De piloot vraagt de weg; niemand weet waar hij heen wil, hijzelf ook niet.',leave:'De luchtballon stijgt weer op. De piloot roept nog iets naar beneden. Het klonk als ‘bedankt’, of als ‘brandt’.',effect:s=>{s.prosperity=Math.min(94,s.prosperity+3);s.unrest=Math.max(0,(s.unrest||0)-4);}},
 {kind:'zeppelin',since:1905,by:'air',stay:4,label:'Een zeppelin!',arrive:'Een zeppelin zweeft boven het eiland. Iedereen zwaait. De zeppelin zwaait niet terug, maar dat ligt aan de bouw.',leave:'De zeppelin drijft weg over zee, langzaam, alsof hij nog even twijfelt.',effect:s=>{s.wealth+=40;s.prosperity=Math.min(94,s.prosperity+3);}},
 {kind:'cruise',since:1965,by:'sea',stay:3,label:'Een cruiseschip!',arrive:'Een cruiseschip meert aan. Tweeduizend toeristen kopen in één middag alle ansichtkaarten, ijsjes en een bankje op.',leave:'Het cruiseschip toetert en vaart weg. Het eiland ruimt op en telt het geld. Allebei duren ze lang.',effect:s=>{s.wealth+=80;s.environment=Math.max(0,(s.environment??60)-2);}}
];
export function ensureVisitors(s){s.visitors??={next:180+Math.floor(visitHash(s.seed,1)*80),current:null,history:[]};return s.visitors;}
export function advanceVisitors(s){
 const v=ensureVisitors(s);
 if(v.current&&s.year>=v.current.until){
  const def=VISITORS.find(d=>d.kind===v.current.kind);if(def)s.log(def.leave,'visitor',{x:v.current.x,y:v.current.y});
  v.history.push({kind:v.current.kind,year:v.current.year});v.current=null;
 }
 if(v.current||s.ending||s.storm||s.year<v.next)return;
 v.next=s.year+75+Math.floor(visitHash(s.seed,s.year,3)*90);
 const dock=harborTile(s),square=s.tile(1,2);
 const recent=v.history.slice(-2).map(h=>h.kind);
 const options=VISITORS.filter(d=>s.year>=d.since&&(d.by==='sea'?!!dock:d.kind!=='balloon'||square?.building==='town-square'));
 const def=options.filter(d=>!recent.includes(d.kind)).pop()||options[Math.floor(visitHash(s.seed,s.year,7)*options.length)];
 if(!def)return;
 const at=def.by==='sea'?dock:def.kind==='balloon'?square:{x:0,y:0};
 v.current={kind:def.kind,year:s.year,until:s.year+def.stay,x:at.x,y:at.y};
 def.effect(s);
 s.log(def.arrive,'visitor',{x:at.x,y:at.y});
 s.signal('celebrate',s.tile(at.x,at.y)||at,def.label,{sound:def.by==='sea'?'horn':'whoosh',text:`${def.label} Bezoek van overzee.`});
}
// Drawing only: the renderer keeps track of when it first saw a visitor, so arrivals glide in on the wall clock.
const visitorSeen=new Map();
const visitEase=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
function tallShip(r,sail,flag,size=1){
 const c=r.ctx;c.save();c.scale(size,size);
 r.ellipse(0,6,26,5,'#6f938a33');
 r.poly([[-24,-2],[22,-6],[16,6],[-17,6]],'#7a5a40');r.poly([[-24,-2],[-14,1],[22,-6],[12,-8]],'#a5835e');r.line([[-20,2],[18,0]],'#5e4430',.8);
 for(const [x,h] of [[-6,30],[8,24]]){r.line([[x,-4],[x,-4-h]],'#5e4430',1.3);r.poly([[x-1,-8],[x+10,-10],[x+9,-4-h*.55],[x-1,-4-h*.6]],sail);r.poly([[x-1,-6-h*.65],[x+8,-7-h*.62],[x+7,-3-h],[x-1,-4-h]],sail);}
 r.poly([[-6,-34],[-6,-40],[1,-37]],flag);
 c.restore();
}
function cruiseShip(r){
 r.ellipse(0,7,40,6,'#6f938a33');
 r.poly([[-38,-2],[36,-10],[30,8],[-30,8]],'#f4f4f0');r.poly([[-38,-2],[-30,8],[30,8],[32,4],[-34,1]],'#2f4a63');
 r.poly([[-24,-6],[22,-13],[22,-19],[-22,-12]],'#f7f7f2');r.poly([[-14,-14],[14,-19],[14,-24],[-12,-19]],'#eeeeea');
 for(let i=0;i<9;i++){r.ellipse(-20+i*5,-8.5-i*.75,1,1,'#7aa2bd');r.ellipse(-22+i*5.5,-2.5-i*.9,1,1,'#7aa2bd');}
 r.poly([[4,-20],[10,-21],[10,-30],[4,-29]],'#d9534a');r.poly([[4,-29],[10,-30],[10,-27],[4,-26]],'#2f3438');
}
function balloon(r,landed){
 if(!landed)r.ellipse(0,46,9,3,'#5a5a3d22');
 r.line([[-6,-6],[-4,6]],'#7b6a52',.6);r.line([[6,-6],[4,6]],'#7b6a52',.6);
 r.poly([[-4,6],[4,6],[3.4,11],[-3.4,11]],'#a77c4f');
 // Nested gores give the envelope its stripes.
 for(const [w,color] of [[15,'#d9534a'],[11,'#f2d36b'],[6.5,'#5c8fc0'],[2.5,'#f2d36b']])r.ellipse(0,-20,w,18,color);
 r.ellipse(-6,-27,3.5,7,'#ffffff33');
 r.poly([[-7,-5],[7,-5],[4,-1],[-4,-1]],'#c64a42');
}
function zeppelin(r){
 r.ellipse(0,0,40,11,'#c8ccd0');r.ellipse(0,-3,38,7,'#dde1e4');r.ellipse(-4,-6,26,3,'#eef0f1');
 r.poly([[30,-2],[44,-12],[44,10],[30,3]],'#a9afb5');r.poly([[-6,9],[8,9],[6,14],[-4,14]],'#7d848a');
 for(let i=0;i<3;i++)r.ellipse(-2+i*3,11.5,.9,.9,'#f5d98a');
 r.line([[-30,-1],[30,-1]],'#b4bac0',.5);
}
export function drawOverseas(r){
 const s=r.sim,v=s.visitors;if(!v||s.ending)return;
 const leaving=!v.current&&v.history.length&&s.year-v.history[v.history.length-1].year<12?v.history[v.history.length-1]:null;
 const visit=v.current||leaving;if(!visit)return;
 const id=`${visit.kind}|${visit.year}|${leaving?'out':'in'}`;if(!visitorSeen.has(id)){if(visitorSeen.size>20)visitorSeen.clear();visitorSeen.set(id,r.time);}
 const since=r.reduced?99:r.time-visitorSeen.get(id),def=VISITORS.find(d=>d.kind===visit.kind);if(!def)return;
 // A departure only plays once, shortly after it happens.
 if(leaving&&since>26)return;
 const u=visitEase(since/14),k=leaving?1-u:u,c=r.ctx,home=r.p(visit.x??0,visit.y??0),middle=r.p(0,0);
 if(def.by==='sea'){
  const dx=home.x-middle.x,dy=(home.y-middle.y)*2,len=Math.hypot(dx,dy)||1;
  const far={x:home.x+dx/len*420,y:home.y+dy/len*210},moor={x:home.x+dx/len*70,y:home.y+dy/len*35};
  const x=far.x+(moor.x-far.x)*k,y=far.y+(moor.y-far.y)*k+(r.reduced?0:Math.sin(r.time*1.2)*.8);
  r.enqueueActor(y,()=>{c.save();c.translate(x,y);if(dx<0)c.scale(-1,1);
  if(visit.kind==='cruise')cruiseShip(r);else tallShip(r,visit.kind==='explorer'?'#f2ead6':'#e9dcc0',visit.kind==='explorer'?'#c64a42':'#3f6f8f',visit.kind==='explorer'?.9:1);
  c.restore();});return;
 }
 if(visit.kind==='balloon'){
  const height=(1-k)*220,sway=r.reduced?0:Math.sin(r.time*.7)*3*(1-k*.8);
  r.enqueueActor(home.y+12,()=>{c.save();c.translate(home.x+sway,home.y-6-height);balloon(r,k>.98);c.restore();});return;
 }
 // The zeppelin circles slowly, high above everything.
 const a=r.reduced?0:r.time*.04,x=middle.x+Math.cos(a)*260-(1-k)*500,y=middle.y-210+Math.sin(a)*60;
 r.enqueueActor(1e6,()=>{c.save();c.translate(x,y);if(Math.sin(a)<0)c.scale(-1,1);zeppelin(r);c.restore();});
}

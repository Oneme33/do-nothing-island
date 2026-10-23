// Two little islands on the horizon. From 1700 a ferry runs, and slowly a few people move over.
const isleHash=(seed,a,b=0)=>{let x=(seed^Math.imul(a+3,0x9e3779b1)^Math.imul(b+17,0x85ebca6b))>>>0;x=Math.imul(x^(x>>>13),0xc2b2ae35);x^=x>>>16;return(x>>>0)/4294967296;};
const ISLET_NAMES=['Meeuweneiland','Klein Duin','Het Kalf','Schapenplaat','De Stip','Zandkop','Kokkelwaard'];
export const FERRY_YEAR=1700;
export function ensureIslets(s){
 if(s.islets)return s.islets;
 const first=Math.floor(isleHash(s.seed,1)*ISLET_NAMES.length),second=(first+1+Math.floor(isleHash(s.seed,2)*(ISLET_NAMES.length-1)))%ISLET_NAMES.length;
 // Placed by screen angle behind the island (left and right), at a fixed distance in tiles.
 const make=(name,phi,size,cap)=>{const r=17.5+size*1.5,a=phi-Math.PI/4;return{name,x:Math.cos(a)*r,y:Math.sin(a)*r,size,cap,houses:0};};
 s.islets={list:[make(ISLET_NAMES[first],-.42-isleHash(s.seed,3)*.25,1,6),make(ISLET_NAMES[second],-2.72+isleHash(s.seed,4)*.25,.7,3)],ferry:null};
 return s.islets;
}
const isleHarbor=s=>{for(const t of s.tiles.values())if(t.kind==='water'&&(t.building==='harbor'||t.building==='dock'))return true;return false;};
export function advanceIslets(s){
 const isles=ensureIslets(s);if(s.ending)return;
 if(!isles.ferry&&s.year>=FERRY_YEAR&&s.year%5===0&&isleHarbor(s)){
  isles.ferry=s.year;
  s.log(`De eerste veerboot vaart naar ${isles.list[0].name}. De kapitein heeft één pet, één fluitje en heel veel meningen over golven.`,'islet');
  s.signal('celebrate',s.tile(0,0),'De veerboot vaart!',{sound:'horn',text:`De eerste veerboot vaart naar ${isles.list[0].name}.`});
 }
 if(isles.ferry&&isles.linked==null&&s.year>=1960&&s.year%15===5){isles.linked=0;s.log(`Een dijk met een weg verbindt ${isles.list[0].name} met het eiland. De veerman krijgt een pensioen en een bankje bij de dijk.`,'islet');s.signal('celebrate',s.tile(0,0),'Een dijk naar het buureiland',{sound:'fanfare',text:`${isles.list[0].name} is nu met een dijk verbonden.`});}
 if(!isles.ferry||s.year%15!==0)return;
 for(const [i,islet] of isles.list.entries()){
  const want=Math.min(islet.cap,Math.floor((s.year-isles.ferry-i*40)/45)+1);
  if(want<=islet.houses)continue;
  islet.houses=want;
  if(want===1)s.log(`Op ${islet.name} staat het eerste huisje. De bewoner noemt zichzelf burgemeester, kapitein én bakker.`,'islet');
  else if(want===islet.cap)s.log(`${islet.name} is vol: ${want} huizen, een vlaggenmast en een eigen mening over het grote eiland.`,'islet');
 }
 // Islet folk fish and trade over the water.
 const homes=isles.list.reduce((n,i)=>n+i.houses,0);s.food+=homes*.15;
}
// Drawing: a sandy blob with grass, trees, and over time little houses; the ferry shuttles from the nearest shore.
let isleCoast={key:'',points:[]};
function isleShore(r,islet){
 const s=r.sim,key=`${s.seed}|${s.land.length}`;
 if(isleCoast.key!==key)isleCoast={key,points:s.islets.list.map(i=>{let best=null,d=Infinity;for(const t of s.land){if(![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>s.tile(t.x+dx,t.y+dy)?.kind==='water'))continue;const e=Math.hypot(t.x-i.x,t.y-i.y);if(e<d){d=e;best=t;}}return best;})};
 return isleCoast.points[s.islets.list.indexOf(islet)];
}
function miniHouse(r,x,y,wall,roof){
 r.poly([[x-5,y-2],[x,y+.5],[x,y-5],[x-5,y-7.5]],wall);r.poly([[x,y+.5],[x+5,y-2],[x+5,y-7.5],[x,y-5]],'#d9cdb4');
 r.poly([[x-6,y-7],[x,y-4.2],[x+6,y-7],[x,y-12]],roof);r.ellipse(x+2.5,y-3,.8,1.1,'#7d6c58');
}
function miniTree(r,x,y,leaf){r.ellipse(x,y,3,1.2,'#5a6a4033');r.line([[x,y],[x,y-3]],'#7a5c42',1);r.poly([[x-3.4,y-2],[x,y-11],[x+3.4,y-2]],leaf);}
export function drawIslets(r){
 const s=r.sim,isles=s.islets;if(!isles)return;
 const c=r.ctx,winter=(r.light?.winter||0)>.6,autumn=(r.light?.autumn||0)>.5;
 for(const [n,islet] of isles.list.entries()){
  const p=r.p(islet.x,islet.y),k=islet.size,h=(a,b=0)=>isleHash(s.seed,n*31+a,b);
  r.ellipse(p.x,p.y+5,80*k,23*k,'#c0d9ca');r.ellipse(p.x+3*k,p.y+4,64*k,15*k,'#b9a57c');
  for(let i=0;i<4;i++)r.ellipse(p.x+(h(i,1)-.5)*70*k,p.y+(h(i,2)-.5)*12*k,(34+h(i,3)*20)*k,(12+h(i,4)*5)*k,'#e3d4ad');
  for(let i=0;i<4;i++)r.ellipse(p.x+(h(i,1)-.5)*60*k,p.y-2+(h(i,2)-.5)*10*k,(26+h(i,3)*16)*k,(9+h(i,4)*4)*k,winter?'#e7ebe6':'#a9c08a');
  r.ellipse(p.x+8*k,p.y-4,22*k,6*k,winter?'#f1f3f0':'#b7cb97');
  const items=[];
  const trees=Math.max(2,Math.round(7*k)-islet.houses);
  for(let i=0;i<trees;i++)items.push({x:p.x+(h(i+10,1)-.5)*80*k,y:p.y-3+(h(i+10,2)-.5)*14*k,tree:true});
  const roofs=['#9b6a55','#6f7f95','#8f8a5c','#a8735a','#7c6a8c','#5f7d70'];
  for(let i=0;i<islet.houses;i++)items.push({x:p.x-24*k+i*11*k+(i%2)*3,y:p.y-1+(i%2?4:-3)*k,house:roofs[(i+n)%roofs.length]});
  items.sort((a,b)=>a.y-b.y);
  for(const it of items){if(it.tree)miniTree(r,it.x,it.y,winter?'#93a596':autumn?'#b98a4f':'#5f8a5a');else miniHouse(r,it.x,it.y,'#efe4cc',it.house);}
  // A flagpole once the islet is full, and a small jetty for the ferry.
  if(islet.houses>=islet.cap){r.line([[p.x+30*k,p.y-2],[p.x+30*k,p.y-26]],'#6e6252',.8);r.poly([[p.x+30*k,p.y-26],[p.x+38*k,p.y-23.5],[p.x+30*k,p.y-21]],'#c64a42');}
  if(!isles.ferry)continue;
  const shore=isleShore(r,islet);if(!shore)continue;
  // A linked islet gets a causeway with a road instead of the ferry.
  if(isles.linked===n){const a=r.p(shore.x,shore.y),b={x:p.x,y:p.y+4},dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;for(const [w,col] of [[8,'#b9a57c'],[6,'#c9b98e'],[3,'#8f9792']])r.poly([[a.x+nx*w,a.y+ny*w*.5],[b.x+nx*w,b.y+ny*w*.5],[b.x-nx*w,b.y-ny*w*.5],[a.x-nx*w,a.y-ny*w*.5]],col);for(let k=1;k<6;k++){const f=k/6;r.line([[a.x+dx*f,a.y+dy*f],[a.x+dx*(f+.06),a.y+dy*(f+.06)]],'#eee8d2',.6);}continue;}
  const from=r.p(shore.x+(islet.x-shore.x)*.06,shore.y+(islet.y-shore.y)*.06),to={x:p.x+(from.x-p.x)*.16,y:p.y+(from.y-p.y)*.16+6};
  r.line([[to.x,to.y],[to.x+(from.x-to.x)*.06,to.y+(from.y-to.y)*.06]],'#8f7457',2.2);
  // Each crossing lasts a while, with a short wait at either side.
  const cycle=r.reduced?.25:((r.time*.018+n*.37)%1),leg=cycle<.5?cycle*2:2-cycle*2,u=Math.max(0,Math.min(1,(leg-.1)/.8)),e=u*u*(3-2*u);
  const x=from.x+(to.x-from.x)*e,y=from.y+(to.y-from.y)*e+(r.reduced?0:Math.sin(r.time*1.3+n)*.6);
  c.save();c.translate(x,y);if((to.x-from.x)*(cycle<.5?1:-1)<0)c.scale(-1,1);
  r.ellipse(0,3,11,2.6,'#6f938a33');r.poly([[-9,-1],[9,-2],[6,3],[-7,3]],'#f1ede2');r.poly([[-9,-1],[-7,3],[6,3],[7,1.5],[-8,.6]],'#2f5f7a');
  r.poly([[-4,-2],[4,-2.5],[4,-6],[-4,-5.5]],'#e8e2d2');r.ellipse(-2,-4,.7,.7,'#7aa2bd');r.ellipse(1,-4.2,.7,.7,'#7aa2bd');
  if(s.year>=1850){r.poly([[1,-6],[3,-6.2],[3,-9.5],[1,-9.3]],'#d9534a');if(!r.reduced)r.ellipse(2-Math.sin(r.time)*1,-12-((r.time*3)%4),1.4,1.2,'rgba(240,240,236,.6)');}
  else{r.line([[0,-5.5],[0,-14]],'#6e5a44',.7);r.poly([[.4,-13.5],[5,-7],[.4,-6.5]],'#efe6cc');}
  c.restore();
 }
}

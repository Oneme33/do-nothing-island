// Small delights: one of each per island, each in a place that suits it.
const delightAround=t=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
export const DELIGHTS=[
 {type:'museum',since:900,population:150,name:'Eilandmuseum',label:'Een museum!',opening:'Het eilandmuseum opent. De eerste bezoeker vraagt waar de wc is, de tweede waar de geschiedenis is.',where:(s,t)=>Math.hypot(t.x,t.y)<=10},
 {type:'circus',since:1650,population:250,name:'Circustent',label:'Hooggeëerd publiek!',opening:'Een circus slaat zijn tent op. De clown blijkt de burgemeester van vroeger te zijn.',where:(s,t)=>Math.hypot(t.x,t.y)>=3&&Math.hypot(t.x,t.y)<=9},
 {type:'station',since:1860,population:400,name:'Treinstation',label:'Instappen!',opening:'Het eiland krijgt een treinstation. Het spoor is kort, maar de conducteur fluit met heel veel overtuiging.',where:(s,t)=>Math.hypot(t.x,t.y)>=4},
 {type:'pool',since:1930,population:500,name:'Openluchtzwembad',label:'Bommetje!',opening:'Een openluchtzwembad opent. De zee doet alsof ze niet beledigd is.',where:(s,t)=>Math.hypot(t.x,t.y)>=3},
 {type:'spaceport',since:2060,population:800,name:'Ruimtehaven',label:'Aftellen!',opening:'Een ruimtehaven! De eerste raket gaat naar de maan en komt terug met een steen en een selfie.',where:(s,t,near)=>near(t,p=>p?.kind==='water'||p?.building==='beach')},
 {type:'zoo',since:1700,population:350,name:'Dierentuin',label:'Kijk, een giraf!',opening:'De dierentuin opent. De giraf kijkt over het hek en vindt de mensen het interessantst.',where:(s,t)=>Math.hypot(t.x,t.y)>=4},
 {type:'theme-park',since:1960,population:700,name:'Pretpark',label:'Nog een keer!',opening:'Een pretpark opent, met een achtbaan die precies één looping te veel heeft.',where:(s,t)=>Math.hypot(t.x,t.y)>=5},
 {type:'watermill',since:600,population:60,name:'Watermolen',label:'Klik-klak, klik-klak',opening:'Aan de rivier draait een watermolen. De molenaar praat alleen nog in het ritme van het rad.',where:(s,t,near)=>near(t,p=>!!p?.river)},
 {type:'petting-farm',since:150,population:40,name:'Kinderboerderij',label:'Mèèh!',opening:'Een kinderboerderij opent. De geit wordt direct verkozen tot burgemeester van de kinderen.',where:(s,t)=>Math.hypot(t.x,t.y)>=3&&Math.hypot(t.x,t.y)<=8},
 {type:'observatory',since:1600,population:200,name:'Sterrenwacht',label:'Sterren kijken',opening:'Een sterrenwacht verrijst bij de berg. De eerste ontdekking: de maan is er nog.',where:(s,t,near)=>near(t,p=>!!p?.landform)||s.year>=1900&&Math.hypot(t.x,t.y)>=5},
 {type:'ice-cream',since:1800,population:300,name:'IJssalon',label:'Een ijsje!',opening:'Een ijssalon opent bij het strand. Het eiland leert het woord ‘nog eentje’.',where:(s,t,near)=>near(t,p=>p?.building==='beach')},
 {type:'greenhouse',since:1850,population:300,name:'Kas',label:'Tomaten onder glas',opening:'Een glazen kas vol tomaten en twijfelachtige cactussen opent. De tuiniers praten er alleen fluisterend.',where:(s,t)=>delightAround(t).some(p=>['farm','garden','park'].includes(s.tile(p.x,p.y)?.building))}
];
export const DELIGHT_TYPES=DELIGHTS.map(d=>d.type);
export const DELIGHT_NAMES=Object.fromEntries(DELIGHTS.map(d=>[d.type,d.name]));
export const DELIGHT_LABELS=Object.fromEntries(DELIGHTS.map(d=>[d.type,d.label]));
export const DELIGHT_OPENINGS=Object.fromEntries(DELIGHTS.map(d=>[d.type,d.opening]));
// The zoo and the theme park need a whole block, so from year 200 the island keeps one free for each of them.
const BIG_DELIGHTS=['zoo','theme-park','spaceport'];
// Rides stand at the back (they are tall); the zoo's low enclosures sit in front of its gate, with giraffes on the sides.
const DELIGHT_RING=[[-1,0],[0,-1],[-1,-1],[1,1],[1,0],[0,1],[1,-1],[-1,1]],DELIGHT_ROLES={'theme-park':[0,1,2,3,4,4,6,6],zoo:[3,4,4,0,1,2,5,5],spaceport:[9,10,8,8,8,8,8,8]};
export function reserveDelightGrounds(s){
 s.delightGrounds??={};
 for(const type of BIG_DELIGHTS){
  if(s.delightGrounds[type]||[...s.tiles.values()].some(t=>t.building===type||t.buildSite?.type===type))continue;
  const free=t=>t?.kind==='land'&&!t.building&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.foundingHome&&!t.river&&!t.road;
  // A block of five by five, like the castle grounds: three enclosures or rides at the back, a plaza at the front,
  // and a ring of park around it so no houses crowd in and hide it.
  const ring2=[];for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)if(Math.max(Math.abs(dx),Math.abs(dy))===2)ring2.push([dx,dy]);
  // The spaceport only needs its concrete apron, but it must be by the sea, well away from the homes.
  const rocket=type==='spaceport',seaward=t=>[[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,-2],[2,-2],[-2,2],[3,0],[0,3],[-3,0],[0,-3]].some(([dx,dy])=>{const n=s.tile(t.x+dx,t.y+dy);return !n||n.kind==='water';});
  const spots=s.land.filter(t=>free(t)&&Math.hypot(t.x,t.y)>=3&&DELIGHT_RING.every(([dx,dy])=>free(s.tile(t.x+dx,t.y+dy)))&&(rocket?seaward(t):ring2.filter(([dx,dy])=>free(s.tile(t.x+dx,t.y+dy))).length>=7));
  if(!spots.length)continue;
  const spot=spots[(s.seed+type.length*31)%spots.length];
  spot.reservedFor=`delight:${type}`;s.delightGrounds[type]={x:spot.x,y:spot.y};
  const claim=(dx,dy,i)=>{const yard=s.tile(spot.x+dx,spot.y+dy);if(!free(yard))return;yard.reservedFor='delight';yard.yardOf={type,x:spot.x,y:spot.y,i};};
  DELIGHT_RING.forEach(([dx,dy],k)=>claim(dx,dy,DELIGHT_ROLES[type][k]));if(!rocket)for(const [dx,dy] of ring2)claim(dx,dy,type==='zoo'?7:6);
 }
}
// When the zoo or the theme park opens, the strip in front of it is cleared (the residents move a street over),
// so you can actually see the animals and the rides.
const FRONT_STRIP=[[2,0],[2,1],[2,2],[1,2],[0,2],[2,-1],[-1,2]];
function openFront(s,spot,type){
 let moved=0;
 for(const [dx,dy] of FRONT_STRIP){
  const t=s.tile(spot.x+dx,spot.y+dy);
  if(!t||t.kind!=='land'||t.landform||t.foundingHome||t.plaque||t.castle||t.buildSite||t.district==='heritage'||t.reservedFor&&t.reservedFor!=='delight'||t.yardOf&&t.yardOf.type!==type)continue;
  if(t.building&&!['hut','house','townhouse','farm','tree','park','garden'].includes(t.building))continue;
  if(['hut','house','townhouse'].includes(t.building))moved++;
  t.building=null;t.reservedFor='delight';t.yardOf={type,x:spot.x,y:spot.y,i:type==='zoo'?7:6};
 }
 if(moved)s.rebuildRoads();
 return moved;
}
// Plans at most one delight at a time; returns true when something was planned.
export function planDelight(s){
 const planned=[...s.tiles.values()].some(t=>t.buildSite&&DELIGHT_TYPES.includes(t.buildSite.type));if(planned)return false;
 for(const d of DELIGHTS){
  if(s.year<d.since||s.population<d.population||[...s.tiles.values()].some(t=>t.building===d.type||t.rebuildFrom===d.type||t.buildSite?.type===d.type))continue;
  const ground=s.delightGrounds?.[d.type]&&s.tile(s.delightGrounds[d.type].x,s.delightGrounds[d.type].y);
  if(ground?.reservedFor===`delight:${d.type}`){ground.reservedFor=null;if(['tree','garden','park'].includes(ground.building))ground.building=null;if(!ground.building&&s.planBuilding(ground,d.type)){openFront(s,ground,d.type);return true;}ground.reservedFor=`delight:${d.type}`;}
  // A lone tree may make way; homes, farms and reserved plots never do.
  const near=(t,r)=>delightAround(t).some(p=>r(s.tile(p.x,p.y)))||[[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>r(s.tile(t.x+dx,t.y+dy)));
  const spots=s.land.filter(t=>(!t.building||['tree','garden','park'].includes(t.building)||d.type==='observatory'&&t.building==='forest')&&!t.buildSite&&!t.landform&&!t.reservedFor&&!t.road&&!t.foundingHome&&d.where(s,t,near));if(!spots.length)continue;
  // A special building gets breathing room: prefer plots with open ground around, and keep some of it open.
  const open=t=>delightAround(t).filter(p=>{const n=s.tile(p.x,p.y);return n?.kind==='land'&&!n.building&&!n.buildSite&&!n.reservedFor&&!n.landform&&!n.foundingHome;});
  // The zoo and the theme park spread over three extra plots of enclosures and rides; the others get a small plaza.
  const yards=['zoo','theme-park'].includes(d.type)?3:2;
  const roomy=spots.filter(t=>open(t).length>=yards),pool=roomy.length?roomy:spots.filter(t=>open(t).length>=2).length?spots.filter(t=>open(t).length>=2):spots;
  const spot=pool[(s.year*13+s.seed)%pool.length],tree=spot.building;if(tree)spot.building=null;
  if(s.planBuilding(spot,d.type)){open(spot).slice(0,yards).forEach((n,i)=>{const yard=s.tile(n.x,n.y);yard.reservedFor='delight';yard.yardOf={type:d.type,x:spot.x,y:spot.y,i};});return true;}
  if(tree)spot.building=tree;
 }
 return false;
}

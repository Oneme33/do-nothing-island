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
 {type:'petting-farm',since:150,population:40,name:'Kinderboerderij',label:'Mèèh!',opening:'Een kinderboerderij opent. De geit wordt direct verkozen tot burgemeester van de kinderen.',where:(s,t)=>Math.hypot(t.x,t.y)>=3&&Math.hypot(t.x,t.y)<=8},
 {type:'observatory',since:1600,population:200,name:'Sterrenwacht',label:'Sterren kijken',opening:'Een sterrenwacht verrijst bij de berg. De eerste ontdekking: de maan is er nog.',where:(s,t,near)=>near(t,p=>!!p?.landform)},
 {type:'ice-cream',since:1800,population:300,name:'IJssalon',label:'Een ijsje!',opening:'Een ijssalon opent bij het strand. Het eiland leert het woord ‘nog eentje’.',where:(s,t,near)=>near(t,p=>p?.building==='beach')},
 {type:'greenhouse',since:1850,population:300,name:'Kas',label:'Tomaten onder glas',opening:'Een glazen kas vol tomaten en twijfelachtige cactussen opent. De tuiniers praten er alleen fluisterend.',where:(s,t)=>delightAround(t).some(p=>['farm','garden','park'].includes(s.tile(p.x,p.y)?.building))}
];
export const DELIGHT_TYPES=DELIGHTS.map(d=>d.type);
export const DELIGHT_NAMES=Object.fromEntries(DELIGHTS.map(d=>[d.type,d.name]));
export const DELIGHT_LABELS=Object.fromEntries(DELIGHTS.map(d=>[d.type,d.label]));
export const DELIGHT_OPENINGS=Object.fromEntries(DELIGHTS.map(d=>[d.type,d.opening]));
// Plans at most one delight at a time; returns true when something was planned.
export function planDelight(s){
 const planned=[...s.tiles.values()].some(t=>t.buildSite&&DELIGHT_TYPES.includes(t.buildSite.type));if(planned)return false;
 for(const d of DELIGHTS){
  if(s.year<d.since||s.population<d.population||[...s.tiles.values()].some(t=>t.building===d.type||t.rebuildFrom===d.type||t.buildSite?.type===d.type))continue;
  // A lone tree may make way; homes, farms and reserved plots never do.
  const near=(t,r)=>delightAround(t).some(p=>r(s.tile(p.x,p.y)))||[[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>r(s.tile(t.x+dx,t.y+dy)));
  const spots=s.land.filter(t=>(!t.building||t.building==='tree'||d.type==='observatory'&&t.building==='forest')&&!t.buildSite&&!t.landform&&!t.reservedFor&&!t.road&&!t.foundingHome&&d.where(s,t,near));if(!spots.length)continue;
  const spot=spots[(s.year*13+s.seed)%spots.length],tree=spot.building;if(tree)spot.building=null;
  if(s.planBuilding(spot,d.type))return true;
  if(tree)spot.building=tree;
 }
 return false;
}

// Small delights: one of each per island, each in a place that suits it.
const delightAround=t=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
export const DELIGHTS=[
 {type:'museum',since:900,population:150,name:'Eilandmuseum',label:'Een museum!',opening:'Het eilandmuseum opent. De eerste bezoeker vraagt waar de wc is, de tweede waar de geschiedenis is.',where:(s,t)=>Math.hypot(t.x,t.y)<=6},
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
  if(s.year<d.since||s.population<d.population||s.buildings.some(t=>t.building===d.type))continue;
  // A lone tree may make way; homes, farms and reserved plots never do.
  const near=(t,r)=>delightAround(t).some(p=>r(s.tile(p.x,p.y)))||[[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>r(s.tile(t.x+dx,t.y+dy)));
  const spots=s.land.filter(t=>(!t.building||t.building==='tree')&&!t.buildSite&&!t.landform&&!t.reservedFor&&!t.road&&!t.foundingHome&&d.where(s,t,near));if(!spots.length)continue;
  const spot=spots[(s.year*13+s.seed)%spots.length],tree=spot.building;if(tree)spot.building=null;
  if(s.planBuilding(spot,d.type))return true;
  if(tree)spot.building=tree;
 }
 return false;
}

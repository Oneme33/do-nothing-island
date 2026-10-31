// Every island begins with one old, unusual place that belongs only to that seed.
export const ORIGIN_CATALOG=[
 {id:'ancient-oak',name:'De oudste eik',description:'Een eik die al voor de eerste hut bestond. Zijn wortels houden de grond bij elkaar en zijn schaduw is de oudste plek van het eiland.'},
 {id:'stone-circle',name:'De steencirkel',description:'Zeven stenen in een kring. Niemand weet wie ze neerzette, maar iedereen groet ze bij het langslopen.'},
 {id:'dolmen',name:'Het hunebed',description:'Een grafkamer van reusachtige stenen, ouder dan elk huis op het eiland. De bewoners gebruiken hem als weerbericht.'},
 {id:'rock-arch',name:'De rotsboog',description:'De zee boog ooit een gat in de kust. De meeuwen noemen het een poort en de vissers nemen er graag een omweg voor.'},
 {id:'warm-spring',name:'De warme bron',description:'Zelfs in de koude winter stijgt hier stoom op. De bewoners denken dat het geluk brengt, en wassen er hun handen.'},
 {id:'shipwreck',name:'Het oude scheepswrak',description:'Een schip dat hier ooit strandde. Het hout werd gebruikt voor de eerste hut en de naam staat nog op de boeg.'}
];
const originHash=(seed,salt)=>{const n=Math.sin((seed>>>0)*12.9898+salt*78.233)*43758.5453;return n-Math.floor(n);};
const distance=(t)=>Math.hypot(t.x-.5,t.y-2);
const hasNeighbour=(s,t,types)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>types.includes(s.tile(t.x+x,t.y+y)?.landform));
export function originForSeed(seed){
 return ORIGIN_CATALOG[(originHash(seed,7)*ORIGIN_CATALOG.length)|0];
}
export function chooseOrigin(s){
 const definition=originForSeed(s.seed);
 let candidates=s.land.filter(t=>t.kind==='land'&&!t.building&&!t.buildSite&&!t.landform&&!t.reservedFor&&!t.foundingHome&&!t.road);
 if(definition.id==='shipwreck'){
  const coast=candidates.filter(t=>s.isCoast(t));
  if(coast.length)candidates=coast;
 }else if(definition.id==='warm-spring'){
  const nearHeat=candidates.filter(t=>hasNeighbour(s,t,['hill','mountain','volcano']));
  if(nearHeat.length)candidates=nearHeat;
 }else{
  const outer=candidates.filter(t=>distance(t)>=4&&distance(t)<=11);
  if(outer.length)candidates=outer;
 }
 if(!candidates.length)candidates=s.land.filter(t=>['tree','forest','beach'].includes(t.building));
 if(!candidates.length)return null;
 candidates.sort((a,b)=>originHash(s.seed,a.x*31+a.y*17)-originHash(s.seed,b.x*31+b.y*17)||distance(a)-distance(b));
 return{definition,tile:candidates[0]};
}
export function ensureOrigin(s,{restoring=false}={}){
 const existing=s.origin&&s.tile(s.origin.x,s.origin.y);
 if(existing?.building==='origin'&&existing.originId===s.origin.id)return s.origin;
 if(restoring&&s.origin)return s.origin;
 const pick=chooseOrigin(s);if(!pick)return null;
 if(restoring){
  const {definition}=pick;
  s.origin={id:definition.id,name:definition.name,description:definition.description,x:pick.tile.x,y:pick.tile.y,year:1};
  return s.origin;
 }
 const {definition,tile}=pick;
 tile.building='origin';tile.originId=definition.id;tile.originName=definition.name;
 tile.builtYear=1;tile.reservedFor='origin';tile.originLandmark=true;tile.district='heritage';tile.landform=null;tile.buildSite=null;
 s.origin={id:definition.id,name:definition.name,description:definition.description,x:tile.x,y:tile.y,year:1};
 if(!restoring)s.log(`Bij het eerste huis lag al iets ouders: ${definition.name.toLowerCase()}. Het eiland noemt het zijn eerste herinnering.`,'origin',{x:tile.x,y:tile.y});
 return s.origin;
}

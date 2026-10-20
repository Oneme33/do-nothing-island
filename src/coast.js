// The coast keeps its own small stories. Nothing here draws on the simulation's random numbers.
export const LIGHTHOUSE_YEAR=400;
const coastAround=t=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
const seaSides=(s,t)=>coastAround(t).filter(p=>{const n=s.tile(p.x,p.y);return !n||n.kind==='water';}).length;
export function ensureCoast(s){
 s.coast??={lighthouse:null};
 s.coast.beaches??=[];s.coast.nextBeachAt??=60;
 return s.coast;
}
function hasHarbor(s){for(const t of s.tiles.values())if(t.building==='dock'||t.building==='harbor')return true;return false;}
// The lighthouse stands on the most exposed free point of the coast, once ships have somewhere to go.
export function placeLighthouse(s){
 const coast=ensureCoast(s),standing=s.land.find(t=>t.building==='lighthouse');
 if(standing){coast.lighthouse={...coast.lighthouse,x:standing.x,y:standing.y};return standing;}
 if(s.year<LIGHTHOUSE_YEAR||s.storm||s.ending||!hasHarbor(s))return null;
 const candidates=s.land.filter(t=>s.isCoast(t)&&!t.building&&!t.buildSite&&!t.landform&&!t.reservedFor&&!t.foundingHome&&!t.protectedCoast);
 let best=null,bestScore=-1;
 for(const t of candidates){const score=seaSides(s,t)*100+Math.hypot(t.x,t.y);if(score>bestScore||score===bestScore&&(t.x<best.x||t.x===best.x&&t.y<best.y)){best=t;bestScore=score;}}
 if(!best||seaSides(s,best)<3)return null;
 const rebuilt=!!coast.lighthouse;
 best.building='lighthouse';best.builtYear=s.year;coast.lighthouse={x:best.x,y:best.y,year:s.year,since:coast.lighthouse?.since??s.year};
 s.log(rebuilt?'De vuurtoren wordt opnieuw opgebouwd, een stukje verderop. De kat neemt de trap meteen weer in gebruik.':'Een vuurtoren verrijst op de verste punt van de kust. De wachter krijgt een kat en ontzettend veel trappen.','lighthouse',{x:best.x,y:best.y});
 s.signal('built',best,'Een vuurtoren!');s.rebuildRoads();
 return best;
}
// New beaches appear where the coast is free and far from the existing sand.
const BEACH_NAMES=['Noorderstrand','Oosterstrand','Zuiderstrand','Westerduin'];
export function beachTarget(year){return 1+(year>=60)+(year>=600)+(year>=1250);}
function beachName(t){const a=Math.atan2(t.y-t.x,t.x+t.y);return BEACH_NAMES[((Math.round(a/(Math.PI/2))%4)+4)%4];}
export function growBeach(s){
 const coast=ensureCoast(s);coast.nextBeachAt=s.year+41;
 if(s.storm||s.ending||coast.beaches.length+1>=beachTarget(s.year))return null;
 const sand=s.land.filter(t=>t.building==='beach');
 const free=t=>s.isCoast(t)&&!t.landform&&!t.reservedFor&&!t.buildSite&&!t.foundingHome&&(!t.building||t.building==='tree');
 const far=t=>sand.every(b=>Math.hypot(b.x-t.x,b.y-t.y)>=6);
 const seeds=s.land.filter(t=>free(t)&&far(t)).sort((a,b)=>coastAround(b).filter(p=>s.tile(p.x,p.y)?.kind==='water').length-coastAround(a).filter(p=>s.tile(p.x,p.y)?.kind==='water').length||a.x-b.x||a.y-b.y);
 const first=seeds[0];if(!first)return null;
 const cluster=s.land.filter(t=>free(t)&&Math.hypot(t.x-first.x,t.y-first.y)<=2.3).sort((a,b)=>Math.hypot(a.x-first.x,a.y-first.y)-Math.hypot(b.x-first.x,b.y-first.y)).slice(0,5);
 if(cluster.length<2)return null;
 for(const t of cluster){t.building='beach';t.protectedCoast=true;t.district='beach';t.builtYear=s.year;}
 const base=beachName(first),name=coast.beaches.some(b=>b.name===base)?`Klein ${base}`:base;
 coast.beaches.push({name,x:first.x,y:first.y,year:s.year});
 s.log(`${name}: een nieuw strand waar de kust zandig is. Het eerste strand doet alsof het niet jaloers is.`,'beach',{x:first.x,y:first.y});
 s.signal('celebrate',first,`${name}!`);s.rebuildRoads();
 return cluster;
}
export function advanceCoast(s){
 ensureCoast(s);
 if(s.year%7===0)placeLighthouse(s);
 if(s.year>=s.coast.nextBeachAt)growBeach(s);
}

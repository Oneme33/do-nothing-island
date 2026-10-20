// The coast keeps its own small stories. Nothing here draws on the simulation's random numbers.
export const LIGHTHOUSE_YEAR=400;
const coastAround=t=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
const seaSides=(s,t)=>coastAround(t).filter(p=>{const n=s.tile(p.x,p.y);return !n||n.kind==='water';}).length;
export function ensureCoast(s){
 s.coast??={lighthouse:null};
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
export function advanceCoast(s){
 ensureCoast(s);
 if(s.year%7===0)placeLighthouse(s);
}

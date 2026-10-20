// The village square in front of the first home: kept free from day one, laid out once the village gathers.
// A two-by-two square: the back plot by the old tree, the bandstand side, the market side and a low front.
export const SQUARE_TILES=[[0,1],[1,1],[0,2],[1,2]];
export const squareRole=t=>t.x===1&&t.y===1?'centre':t.x===0&&t.y===2?'market':t.x===1&&t.y===2?'front':'back';
export const SQUARE_YEAR=40;
const SQUARE_CLEARABLE=new Set(['park','garden','playground']);
export function ensureSquare(s,{restoring=false}={}){
 s.square??={version:1,builtYear:null};
 if(!s.square.reserved){
  for(const [x,y] of SQUARE_TILES){
   const t=s.tile(x,y);if(t?.kind!=='land'||t.landform||t.foundingHome)continue;
   // Older islands give up a park or playground here; homes and farms are never removed.
   if(t.buildSite)continue;
   if(!t.building||restoring&&SQUARE_CLEARABLE.has(t.building)){t.building=null;t.reservedFor='square';t.district='heritage';}
  }
  s.square.reserved=true;
 }
 return s.square;
}
export function squareTiles(s){return SQUARE_TILES.map(([x,y])=>s.tile(x,y)).filter(t=>t?.building==='town-square');}
export function advanceSquare(s){
 const square=ensureSquare(s);
 if(square.builtYear||s.year<SQUARE_YEAR)return;
 const tiles=SQUARE_TILES.map(([x,y])=>s.tile(x,y)).filter(t=>t?.kind==='land'&&t.reservedFor==='square'&&!t.building);
 if(!tiles.length)return;
 for(const t of tiles){t.building='town-square';t.builtYear=s.year;}
 square.builtYear=s.year;
 s.log('Voor het eerste huis wordt een plein aangelegd. Niemand weet nog waarvoor, maar iedereen gaat er alvast staan.','culture',{x:tiles[0].x,y:tiles[0].y});
 s.signal('celebrate',tiles[0],'Een dorpsplein!');s.rebuildRoads();
}

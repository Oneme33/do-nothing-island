import {startParty} from './spectacle.js';
// Statues the island raises by itself: for you, for its founder, and for the odd things it loves.
const helpedWishes=s=>(s.wishes?.history||[]).filter(w=>w.status==='helped').length;
export const MONUMENTS=[
 {kind:'hand',square:true,when:s=>helpedWishes(s)>=3||s.influence?.trust>=12,title:'Het Onzichtbare Handje',text:'Een stenen hand die uit een wolk steekt. Niemand weet precies wie het is, maar iedereen bedankt hem op zondag.'},
 {kind:'watcher',square:true,when:s=>s.year>=1500&&s.interferences===0,title:'Voor wie niets deed',text:'Een leeg voetstuk met een bankje ervoor, ter ere van de toeschouwer die hen hun gang liet gaan.'},
 {kind:'founder',when:s=>s.year>=600&&s.family,title:s=>`${s.family.generations[0].name} ${s.family.lastName}, de eerste bewoner`,text:'Met een schoffel in de ene hand en voor de zekerheid een boterham in de andere.'},
 {kind:'chicken',when:s=>s.coast?.treasures?.some(t=>t.id==='chicken'),title:'De Heilige Kip, levensgroot',text:'Het kippenbeeldje uit de grond kreeg een grote zus. Er liggen altijd verse korrels.'},
 {kind:'cat',when:s=>s.coast?.lighthouse&&s.year-(s.coast.lighthouse.since||s.year)>=120,title:'De Vuurtorenkat',text:'Generaties katten hielpen de wachter de trap op. Deze is van brons en houdt nog steeds de wacht.'},
 {kind:'flame',when:s=>(s.fireCount||0)>=4,title:'Monument voor de Grote Brand',text:'Een stenen vlam met de namen van alle emmerdragers. Het is een lange lijst.'}
];
export const monumentTitle=(s,m)=>typeof m.title==='function'?m.title(s):m.title;
export function advanceMonuments(s){
 s.monuments??=[];if(s.ending||s.year%7!==3)return;
 for(const m of MONUMENTS){
  if(s.monuments.some(x=>x.kind===m.kind)||!m.when(s))continue;
  if(m.square&&s.monuments.some(x=>x.square))continue;
  let tile=m.square?s.tile(1,3):null;
  if(tile&&(tile.building!=='town-square'||tile.monument))tile=null;
  if(!tile)tile=s.land.filter(t=>!t.building&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.road&&Math.hypot(t.x,t.y)<=7).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];
  if(!tile)continue;
  if(tile.building!=='town-square'){tile.building='monument';tile.builtYear=s.year;}
  tile.monument=m.kind;const title=monumentTitle(s,m);
  s.monuments.push({kind:m.kind,x:tile.x,y:tile.y,year:s.year,square:!!m.square});
  s.log(`Een standbeeld: ${title}. ${m.text}`,'delight',{x:tile.x,y:tile.y});s.rebuildRoads();
  startParty(s,tile,`Onthulling: ${title}`,['Het doek gaat eraf. Iedereen zegt ‘oooh’.','De burgemeester knipt een lint door dat er niet hoeft te zijn.','Er zijn bitterballen. Dat maakt alles plechtig.'],8);
  return;
 }
}
// One castle per island, on a site each island chooses for itself: by the mountains, on the coast or away from the bustle.
export function buildCastle(s){
 if(s.court||s.ending)return null;
 const near=t=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].some(([dx,dy])=>s.tile(t.x+dx,t.y+dy)?.landform);
 const sea=t=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>s.tile(t.x+dx,t.y+dy)?.kind==='water');
 const free=t=>(!t.building||['tree','forest','park','garden','farm'].includes(t.building))&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.road&&!t.foundingHome&&Math.hypot(t.x,t.y)>=4;
 const styles=[t=>near(t)?0:1,t=>sea(t)?0:1,t=>-Math.hypot(t.x,t.y)];
 const style=styles[(s.seed>>>0)%styles.length],spots=s.land.filter(free).sort((a,b)=>style(a)-style(b)||(a.x+a.y)-(b.x+b.y)).slice(0,5);
 const tile=spots[((s.seed>>>3)+s.year)%Math.max(1,spots.length)];if(!tile)return null;
 tile.building='palace';tile.builtYear=s.year;tile.architecture=s.age.id;tile.district='heritage';tile.landmark=true;tile.castle=true;
 s.court={x:tile.x,y:tile.y,year:s.year};
 s.log('Het eiland bouwt een kasteel, op een plek die het zelf heeft uitgekozen. Het eerste huis blijft het huis van de familie.','palace',{x:tile.x,y:tile.y});
 startParty(s,tile,'Inhuldiging van het kasteel',['De trap is zo lang dat de koning onderweg pauzeert.','Er zijn meer kamers dan mensen.','De lakeien oefenen buigen. Twee vallen om.'],4);s.rebuildRoads();
 return tile;
}

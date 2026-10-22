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
// Around 1500 the court moves to a far grander palace on a commanding spot; the first home stays with the family.
export function advanceCourt(s){
 s.court??=null;if(s.court||s.ending||s.year<1500||s.population<500||s.year%5!==0)return null;
 const near=t=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].some(([dx,dy])=>s.tile(t.x+dx,t.y+dy)?.landform);
 const free=t=>(!t.building||['tree','forest','park','garden'].includes(t.building))&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.road&&!t.foundingHome&&Math.hypot(t.x,t.y)>=4;
 const spots=s.land.filter(free).sort((a,b)=>(near(b)?1:0)-(near(a)?1:0)||(a.x+a.y)-(b.x+b.y));
 const tile=spots[0];if(!tile)return null;
 tile.building='royal-palace';tile.builtYear=s.year;tile.district='heritage';tile.landmark=true;
 s.court={x:tile.x,y:tile.y,year:s.year};
 s.log('Het hof verhuist naar een nieuw paleis op de mooiste plek van het eiland. Het eerste huis blijft van de familie; de koning neemt alleen het servies mee.','palace',{x:tile.x,y:tile.y});
 startParty(s,tile,'Inhuldiging van het nieuwe paleis',['De trap is zo lang dat de koning onderweg pauzeert.','Er zijn meer kamers dan mensen.','De lakeien oefenen buigen. Twee vallen om.'],6);s.rebuildRoads();
 return tile;
}

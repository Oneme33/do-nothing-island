import {startParty} from './spectacle.js';
import {wishTally} from './wishes.js';
// Statues the island raises by itself: for you, for its founder, and for the odd things it loves.
const helpedWishes=s=>wishTally(s,'helped');
export const MONUMENTS=[
 {kind:'hand',square:true,when:s=>helpedWishes(s)>=3||s.influence?.trust>=12,title:'Het Onzichtbare Handje',text:'Een stenen hand die uit een wolk steekt. Niemand weet precies wie het is, maar iedereen bedankt hem op zondag.'},
 {kind:'watcher',square:true,when:s=>s.year>=1500&&s.interferences===0,title:'Voor wie niets deed',text:'Een leeg voetstuk met een bankje ervoor, ter ere van de toeschouwer die hen hun gang liet gaan.'},
 {kind:'founder',when:s=>s.year>=600&&s.family,title:s=>`${s.family.generations[0].name} ${s.family.lastName}, de eerste bewoner`,text:'Met een schoffel in de ene hand en voor de zekerheid een boterham in de andere.'},
 {kind:'chicken',when:s=>s.coast?.treasures?.some(t=>t.id==='chicken'),title:'De Heilige Kip, levensgroot',text:'Het kippenbeeldje uit de grond kreeg een grote zus. Er liggen altijd verse korrels.'},
 {kind:'cat',when:s=>s.coast?.lighthouse&&s.year-(s.coast.lighthouse.since||s.year)>=120,title:'De Vuurtorenkat',text:'Generaties katten hielpen de wachter de trap op. Deze is van brons en houdt nog steeds de wacht.'},
 {kind:'flame',when:s=>(s.fireCount||0)>=4,title:'Monument voor de Grote Brand',text:'Een stenen vlam met de namen van alle emmerdragers. Het is een lange lijst.'}
];
export const monumentTitle=(s,m)=>typeof m.title==='function'?m.title(s):m.title;
// Around 400 the island already marks out where its castle will stand, so the grounds stay free.
// The grounds are two rings deep: an inner formal garden and an outer castle park, so the castle never stands squeezed in.
export const CASTLE_RING=[];for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)if(dx||dy)CASTLE_RING.push([dx,dy]);
const castleOpen=n=>n?.kind==='land'&&!n.landform&&(!n.building||['tree','forest','park','garden'].includes(n.building))&&!n.reservedFor&&!n.buildSite&&!n.foundingHome&&!n.river;
function reserveCastleSite(s){
 if(s.court||s.castleSite||s.year<400)return;
 const room=t=>CASTLE_RING.filter(([dx,dy])=>castleOpen(s.tile(t.x+dx,t.y+dy))).length;
 const spots=s.land.filter(t=>!t.building&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.foundingHome&&!t.river&&Math.hypot(t.x,t.y)>=4&&room(t)>=17).sort((a,b)=>room(b)-room(a)||(a.x+a.y)-(b.x+b.y)).slice(0,5);
 const site=spots[(s.seed>>>5)%Math.max(1,spots.length)];if(!site)return;
 s.castleSite={x:site.x,y:site.y};site.reservedFor='castle';
 for(const [dx,dy] of CASTLE_RING){const n=s.tile(site.x+dx,site.y+dy);if(castleOpen(n))n.reservedFor='castle';}
}
// The castle keeps growing: every century and a half it spends a few years in scaffolding and comes out grander.
export const CASTLE_STEPS=['Het kasteel krijgt een tweede ring muren. De wachters moeten nu twee keer zo ver lopen.','Er komt een poortgebouw met een ophaalbrug die echt op en neer kan. De kinderen proberen het om de vijf minuten.','Een nieuwe, hoge toren met een uitkijkpost. Op heldere dagen zie je de buureilandjes zwaaien.','Een lichte paleisvleugel met hoge ramen. Het kasteel is nu officieel ook gezellig.','Op de muren wapperen vlaggen voor elke familie van het eiland. Het waait er nooit meer stil.','Een glazen koepel op de oude toren. ’s Nachts gloeit hij als een lantaarn boven het eiland.','Zonnepanelen op de kantelen en een tuin op het dak. De ridders van vroeger zouden het niet geloven.'];
export const CASTLE_STEP_YEARS=150,CASTLE_SCAFFOLD_YEARS=8;
export function advanceCastle(s){
 const court=s.court;if(!court||s.ending)return;const tile=s.tile(court.x,court.y);if(tile?.building!=='palace')return;
 court.level??=0;
 if(court.renovating){if(s.year<court.renovating)return;court.renovating=null;court.level++;
  s.log(CASTLE_STEPS[court.level-1],'palace',{x:court.x,y:court.y});s.signal('built',tile,'Het kasteel groeit',{sound:'fanfare',text:CASTLE_STEPS[court.level-1].split('. ')[0]+'.'});return;}
 if(court.level<CASTLE_STEPS.length&&s.year>=court.year+(court.level+1)*CASTLE_STEP_YEARS){court.renovating=s.year+CASTLE_SCAFFOLD_YEARS;s.log('Het kasteel staat in de steigers. Niemand weet precies wat er komt, behalve de metselaars, en die zeggen niets.','culture',{x:court.x,y:court.y});}
}
export function advanceMonuments(s){
 s.monuments??=[];advanceCastle(s);if(s.year%10===5){reserveCastleSite(s);if(s.court)claimCastleGrounds(s);}if(s.ending||s.year%7!==3)return;
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
 const free=t=>(!t.building||['tree','forest','park','garden','farm'].includes(t.building))&&!t.buildSite&&(!t.reservedFor||t.reservedFor==='castle')&&!t.landform&&!t.road&&!t.foundingHome&&Math.hypot(t.x,t.y)>=4;
 const styles=[t=>near(t)?0:1,t=>sea(t)?0:1,t=>-Math.hypot(t.x,t.y)];
 const room=t=>CASTLE_RING.filter(([dx,dy])=>{const n=s.tile(t.x+dx,t.y+dy);return n?.kind==='land'&&!n.landform&&(!n.building||['tree','forest','park','garden','farm'].includes(n.building))&&(!n.reservedFor||n.reservedFor==='castle');}).length;
 const reserved=s.castleSite&&s.tile(s.castleSite.x,s.castleSite.y);
 const style=styles[(s.seed>>>0)%styles.length],spots=reserved?[reserved]:s.land.filter(t=>free(t)&&room(t)>=12).sort((a,b)=>style(a)-style(b)||room(b)-room(a)||(a.x+a.y)-(b.x+b.y)).slice(0,5);
 const tile=spots[((s.seed>>>3)+s.year)%Math.max(1,spots.length)];if(!tile)return null;
 tile.reservedFor=null;tile.building='palace';tile.builtYear=s.year;tile.architecture=s.age.id;tile.district='heritage';tile.landmark=true;tile.castle=true;
 s.court={x:tile.x,y:tile.y,year:s.year};claimCastleGrounds(s);
 s.log('Het eiland bouwt een kasteel, op een plek die het zelf heeft uitgekozen. Het eerste huis blijft het huis van de familie.','palace',{x:tile.x,y:tile.y});
 startParty(s,tile,'Inhuldiging van het kasteel',['De trap is zo lang dat de koning onderweg pauzeert.','Er zijn meer kamers dan mensen.','De lakeien oefenen buigen. Twee vallen om.'],4);s.rebuildRoads();
 return tile;
}

// The castle grounds: a ring of garden around the castle, in a style of the island's own choosing.
export const GARDEN_STYLES=['formal','roses','orchard','maze'];
export function claimCastleGrounds(s){
 if(!s.court)return 0;const castle=s.tile(s.court.x,s.court.y);if(castle?.building!=='palace')return 0;
 let claimed=0;const style=GARDEN_STYLES[(s.seed>>>0)%GARDEN_STYLES.length];
 for(const [dx,dy] of CASTLE_RING){
  const t=s.tile(s.court.x+dx,s.court.y+dy),outer=Math.max(Math.abs(dx),Math.abs(dy))===2;
  if(!t||t.kind!=='land'||t.landform||t.foundingHome||t.river||t.reservedFor&&t.reservedFor!=='castle'||t.buildSite)continue;
  // The outer park does not push out farms; the inner garden may take a field.
  if(t.building&&!['tree','forest','park','garden',...(outer?[]:['farm']),'castle-garden'].includes(t.building))continue;
  if(t.building!=='castle-garden'){t.building='castle-garden';t.gardenStyle=outer?'park':style;t.reservedFor='castle';t.district='heritage';claimed++;}
 }
 if(claimed)s.rebuildRoads();
 return claimed;
}

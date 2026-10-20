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
 seasonalFinds(s);
}
// Treasures: found once per island, by tremors, storms, volcanoes or builders who dig a little deeper.
export const TREASURE_CATALOG=[
 {id:'buttons',cause:'rumble',title:'De knopenkist',short:'de knopenkist',description:'Een kist met zeventien knopen en één heel goede schaar. Niemand weet van wie.',hint:'Wat de grond schudt, komt soms boven.'},
 {id:'chicken',cause:'rumble',title:'Het heilige kippenbeeldje',short:'het heilige kippenbeeldje',description:'Een stenen beeldje van een kip, onmiskenbaar heilig. Het krijgt een eigen plankje in het eerste huis.',hint:'Onder een trillende akker ligt misschien iets kakelends.'},
 {id:'bottle',cause:'storm',title:'Post van de zee',short:'de fles met post van de zee',description:'Een fles met een briefje: “Ik ben er bijna. Groetjes, de zee.”',hint:'Na een storm ligt er van alles op het strand.'},
 {id:'anchor',cause:'storm',since:900,title:'Het anker van niemand',short:'het anker van niemand',description:'Een anker van een schip dat nooit is aangekomen. Het staat nu bij de haven, als wegwijzer.',hint:'Hoog water brengt soms iets zwaars mee.'},
 {id:'map',cause:'build',title:'De verkeerde kaart',short:'de verkeerde kaart',description:'Een oude kaart van het eiland, met de kust op een heel andere plek. Of was dat ooit zo?',hint:'Bouwers graven soms dieper dan nodig.'},
 {id:'coin',cause:'build',since:300,title:'De onbekende munt',short:'de onbekende munt',description:'Een gouden munt met een hoofd dat niemand herkent. De bakker geeft er toch brood voor.',hint:'Een nieuwe fundering kan een oude zak geld raken.'},
 {id:'armour',cause:'build',since:1100,title:'Een harnas op maat',short:'het harnas van de bakker',description:'Een oud harnas dat precies past bij de bakker. Hij draagt het op zondag.',hint:'Wie in een oude stad bouwt, vindt soms iets van ridders.'},
 {id:'radio',cause:'build',since:1900,title:'De walvisradio',short:'de walvisradio',description:'Een kapotte radio die alleen walvisliedjes ontvangt. Iedereen doet alsof dat de bedoeling is.',hint:'Ook moderne funderingen raken soms iets wonderlijks.'},
 {id:'capsule',cause:'build',since:2000,title:'De tijdcapsule',short:'de tijdcapsule van de eerste school',description:'Een tijdcapsule van de eerste school, met een kindertekening van precies deze stad.',hint:'Wie lang genoeg wacht, vindt een brief van vroeger.'},
 {id:'seeds',cause:'volcano',title:'Zaden van ergens anders',short:'de vreemde zaden',description:'Een kistje met zaden van een boom die niemand kent. Ze groeien vrolijk, zonder uitleg.',hint:'Een berg met een mening laat soms iets los.'}
];
const coastHash=(seed,a,b,c)=>{let x=(seed^Math.imul(a+7,0x27d4eb2d)^Math.imul(b+101,0x165667b1)^Math.imul(c+307,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>15),0x2c1b3c6d);x^=x>>>12;return(x>>>0)/4294967296;};
const TREASURE_CHANCE={rumble:.4,storm:.05,build:.006,volcano:.5};
export function findTreasure(s,cause,tile){
 const coast=ensureCoast(s);coast.treasures??=[];
 if(!tile||s.ending||coastHash(s.seed,s.year,tile.x,tile.y)>=TREASURE_CHANCE[cause])return null;
 const found=new Set(coast.treasures.map(t=>t.id)),treasure=TREASURE_CATALOG.find(t=>t.cause===cause&&!found.has(t.id)&&s.year>=(t.since||0));
 if(!treasure)return null;
 const record={id:treasure.id,year:s.year,x:tile.x,y:tile.y};coast.treasures.push(record);tile.treasure={id:treasure.id,year:s.year};
 s.prosperity=Math.min(94,s.prosperity+3);
 s.log(`Een schat! ${treasure.description}`,'treasure',{x:tile.x,y:tile.y,treasureId:treasure.id});
 s.signal('celebrate',tile,`Een schat: ${treasure.title.toLowerCase()}`);
 return record;
}
// Called for every logged event: some events uncover what was hidden.
export function coastNotice(s,entry){
 if(entry.type==='interference'){const type=s.interventionLedger?.find(t=>t.id===entry.interventionId)?.type;if(type==='rumble')findTreasure(s,'rumble',s.tile(entry.x,entry.y));}
 else if(entry.type==='volcano'){const peak=s.land.find(t=>t.landform==='volcano');if(peak)findTreasure(s,'volcano',s.land.find(t=>!t.landform&&Math.hypot(t.x-peak.x,t.y-peak.y)<=2)||peak);}
}
function seasonalFinds(s){
 if(s.storm){const beach=s.land.filter(t=>t.building==='beach')[s.year%7];if(beach)findTreasure(s,'storm',beach);}
 const fresh=s.land.find(t=>t.builtYear===s.year&&t.building&&!['beach','lighthouse'].includes(t.building));
 if(fresh)findTreasure(s,'build',fresh);
}

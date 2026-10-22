import test from 'node:test';
import assert from 'node:assert/strict';
import { Civilization, neighbors, PROJECT_STAGES, secondsPerYear, FIXED_SECONDS_PER_YEAR } from '../src/simulation.js';

function prepared(era=2,config={}) {
  const sim=new Civilization(48,config);
  sim.era=era;sim.year=era>=4?2080:era>=3?1920:era>=2?1750:1250;sim.character='harbor';sim.technology=20;sim.food=100;sim.wood=400;sim.stone=400;sim.wealth=1000;sim.prosperity=80;
  for(const t of sim.freeLand)t.building='house';
  if(era===1)sim.houses.find(t=>!t.foundingHome).building='windmill';
  sim.population=sim.capacity;
  return sim;
}
test('early inhabitants cannot reclaim land; projects need technology, resources, prosperity and calm weather',()=>{
  const early=prepared(0);assert.equal(early.tryExpansion(),false);
  for(const [field,value] of [['wood',0],['stone',0],['wealth',0],['food',0],['prosperity',10],['storm',5]]){
    const sim=prepared();sim[field]=value;assert.equal(sim.tryExpansion(),false,field);
  }
  assert.equal(prepared().tryExpansion(),true);
});
test('development uses hand drainage and never builds an industrial pump',()=>{
  const sim=prepared(1);const original=sim.land.length;
  assert.equal(sim.tryExpansion(),true);assert.equal(sim.project.manual,true);
  for(let i=0;i<50;i++)sim.advanceProject();
  assert.equal(sim.project,null);assert.equal(sim.land.length,original+5);
  assert.equal(sim.reclaimed.some(t=>t.building==='pump'),false);
});
test('reclamation waits for drainage technology and real inland space pressure',()=>{
  const early=prepared(1);early.year=1249;early.technology=1000;
  assert.equal(early.tryExpansion(),false,'research cannot bypass the drainage age');
  early.year=1250;early.technology=2;
  assert.equal(early.tryExpansion(),false,'the engineering still needs to be learned');
  early.technology=3;
  const mill=early.buildings.find(t=>t.building==='windmill');mill.building='house';
  assert.equal(early.tryExpansion(),false,'preindustrial drainage needs mechanical infrastructure');
  mill.building='windmill';assert.equal(early.tryExpansion(),true);

  const roomy=prepared(2);
  for(const plot of roomy.land.filter(t=>!t.foundingHome&&!t.reservedFor&&['hut','house','townhouse','tower','farm'].includes(t.building)))plot.building=null;
  assert.ok(roomy.freeLand.length>roomy.land.length*.3,'plenty of spare inland plots');
  roomy.population=roomy.capacity;roomy.food=4000;
  assert.equal(roomy.tryExpansion(),false,'even a large population must use spare inland plots first');
  for(const tile of roomy.freeLand)tile.building='house';
  roomy.population=roomy.capacity;assert.equal(roomy.tryExpansion(),true);
});
test('reclamation forms a connected coastal project and land is usable only after all stages',()=>{
  const sim=prepared();const original=sim.land.length;
  sim.tryExpansion();const ids=sim.project.tiles;
  assert.ok(neighbors(sim.tiles.get(ids[0])).some(([x,y])=>sim.tile(x,y)?.kind==='land'));
  const seen=new Set([ids[0]]);
  for(const id of ids.slice(1)){
    assert.ok(neighbors(sim.tiles.get(id)).some(([x,y])=>seen.has(`${x},${y}`)));seen.add(id);
  }
  let stages=new Set();
  for(let i=0;i<PROJECT_STAGES.reduce((sum,s)=>sum+s.duration,0)-1;i++){
    stages.add(sim.project.stage);sim.advanceProject();assert.equal(sim.land.length,original);
  }
  sim.advanceProject();assert.equal(stages.size,5);assert.equal(sim.project,null);
  assert.equal(sim.land.length,original+9);assert.ok(sim.reclaimed.some(t=>t.building==='pump'));
});
test('storms and broken pumps stop drainage, and completed districts add capacity through real homes',()=>{
  const sim=prepared();sim.tryExpansion();
  for(let i=0;i<12;i++)sim.advanceProject();
  assert.equal(sim.project.stage,2);
  const elapsed=sim.project.elapsed;
  sim.pumpBroken=2;sim.advanceProject();assert.equal(sim.project.elapsed,elapsed);
  sim.pumpBroken=0;sim.storm=3;sim.advanceProject();assert.equal(sim.project.elapsed,elapsed);
  sim.storm=0;for(let i=0;i<30;i++)sim.advanceProject();
  for(const t of sim.houses.slice(0,Math.ceil(sim.houses.length/2)))t.building='farm';
  const capacity=sim.capacity;sim.food=4000;sim.population=capacity;
  sim.develop();assert.ok(sim.reclaimed.some(t=>t.buildSite?.type==='house'));
  for(let i=0;i<8;i++)sim.advanceBuildings();assert.ok(sim.capacity>capacity);
});
test('configured tile limits are respected, including an incomplete final batch',()=>{
  const sim=prepared();sim.config.maxTiles=sim.land.length+3;
  sim.tryExpansion();assert.equal(sim.project.tiles.length,3);
  for(let i=0;i<40;i++)sim.advanceProject();
  assert.equal(sim.land.length,sim.config.maxTiles);assert.equal(sim.tryExpansion(),false);
});
test('a flood affects a district and its economy, then engineers repair it without losing the original tree',()=>{
  const sim=prepared();sim.tryExpansion();for(let i=0;i<40;i++)sim.advanceProject();
  const population=sim.population;sim.flood(sim.reclaimed,true);
  assert.ok(sim.reclaimed.some(t=>t.kind==='flooded'));assert.ok(sim.population>population*.8);
  sim.storm=0;for(let i=0;i<30;i++)sim.repairFloods();
  assert.equal(sim.reclaimed.filter(t=>t.kind==='flooded').length,0);
  assert.ok(sim.dikeLevel>1);assert.equal(sim.tile(0,0).building,'original-tree');
  assert.ok(sim.history.some(e=>e.type==='flood'));assert.ok(sim.history.some(e=>e.type==='repair'));
});
test('an impoverished city relocates homes and abandons flooded ground',()=>{
  const sim=prepared();sim.tryExpansion();for(let i=0;i<40;i++)sim.advanceProject();
  const t=sim.reclaimed.find(t=>!t.building);t.building='house';
  sim.tile(-1,-1).building=null;const oldHomes=sim.houses.length;
  sim.flood([t]);sim.wealth=0;
  for(let i=0;i<35;i++)sim.repairFloods();
  assert.equal(t.kind,'water');assert.equal(t.building,null);assert.ok(sim.history.some(e=>e.type==='abandon'));
  assert.equal(sim.houses.length,oldHomes);
});
test('saves restore the entire landscape, mid-project progress, history and seeded future',()=>{
  const sim=prepared();sim.tryExpansion();for(let i=0;i<15;i++)sim.advanceProject();
  const restored=Civilization.restore(sim.serialize());assert.ok(restored);
  assert.deepEqual(restored.project,sim.project);assert.deepEqual(restored.history,sim.history);
  assert.deepEqual([...restored.tiles],[...sim.tiles]);
  for(let i=0;i<50;i++){sim.tick();restored.tick();}
  assert.equal(restored.serialize(),sim.serialize());
  assert.equal(Civilization.restore('{broken'),null);
  const corrupt=JSON.parse(sim.serialize());corrupt.project={stage:12,tiles:[],elapsed:0};
  assert.equal(Civilization.restore(JSON.stringify(corrupt)),null);
});
test('islands develop inland before expanding and remain bounded across multiple seeds',()=>{
  for(const seed of [8,12,31,79,201]){
    const sim=new Civilization(seed);
    for(let i=0;i<2200;i++)sim.tick();
    assert.ok(sim.land.length>sim.originalArea,`coastal growth, seed ${seed}`);
    assert.ok(sim.buildings.length>sim.originalArea*.8,`inland settlement, seed ${seed}`);
    assert.ok(sim.land.length<=sim.config.maxTiles);
    assert.equal(sim.era,4);assert.ok(sim.population>60);assert.equal(sim.ending,false);
    assert.ok([sim.food,sim.wealth,sim.wood,sim.population].every(Number.isFinite));
    assert.equal(sim.tile(0,0).building,'original-tree');
  }
});
test('the rare obsession can reach The Last Drop through actual simulation, and cannot bypass ending settings',()=>{
  const sim=new Civilization(8,{maxTiles:625});sim.obsessed=true;
  for(let i=0;i<3500&&!sim.ending;i++)sim.tick();
  assert.equal(sim.ending,true);assert.ok(sim.land.length>=591);assert.ok(sim.food<=3);
  assert.equal(sim.history.at(-1).text,'The ocean has been successfully discontinued.');
  const disabled=Civilization.restore(sim.serialize());disabled.ending=false;disabled.config.rareEndings=false;
  disabled.tryLastDrop();assert.equal(disabled.ending,false);
  disabled.config.rareEndings=true;disabled.config.maxTiles=320;disabled.tryLastDrop();assert.equal(disabled.ending,false);
});
test('future island projects leave a real water channel with a bridge and a pump on the new landmass',()=>{
  const sim=prepared(4);sim.projectCount=3;sim.tryExpansion();
  assert.equal(sim.project.isArtificial,true);
  const [bridgeId,pumpId,...islandIds]=sim.project.tiles;
  for(let i=0;i<40;i++)sim.advanceProject();
  assert.equal(sim.tiles.get(bridgeId).kind,'water');assert.equal(sim.tiles.get(bridgeId).building,'bridge');
  assert.equal(sim.tiles.get(pumpId).building,'pump');assert.equal(sim.tiles.get(pumpId).kind,'land');
  for(const id of [pumpId,...islandIds]){
    const tile=sim.tiles.get(id);
    assert.equal(neighbors(tile).some(([x,y])=>sim.tile(x,y)?.natural),false);
  }
});
test('new islands have different geography while identical seeds reproduce the same beginning and future',()=>{
  const islands=[8,12,31,201].map(seed=>new Civilization(seed));
  assert.equal(JSON.stringify([...new Civilization(8).tiles]),JSON.stringify([...islands[0].tiles]));
  assert.ok(new Set(islands.map(s=>JSON.stringify([...s.tiles]))).size>=3);
  for(const island of islands){for(let i=0;i<450;i++)island.tick();}
  assert.ok(new Set(islands.map(s=>s.character)).size>=3);
  assert.ok(new Set(islands.map(s=>JSON.stringify(s.land.map(t=>[t.x,t.y,t.building])))).size>=3);
  assert.ok(islands.every(s=>s.history.some(h=>h.type==='palace')));
});
test('pacing starts brisk, slows down gently in later ages, stays bounded, and permits the fixed-speed setting',()=>{
  let previous=secondsPerYear(1);
  assert.ok(previous<1,'the first centuries pass briskly');
  for(let year=2;year<3000;year++){
    const duration=secondsPerYear(year,Math.min(4,Math.floor(year/500)));
    assert.ok(duration>=previous-1e-9);assert.ok(duration<=2.3);previous=duration;
  }
  assert.ok(secondsPerYear(2100,4)>2,'the short modern ages get more time');
  const sim=new Civilization(8);assert.ok(sim.yearDuration<FIXED_SECONDS_PER_YEAR);
  sim.year=2000;sim.era=4;assert.ok(sim.yearDuration>FIXED_SECONDS_PER_YEAR);
  sim.config.accelerating=false;assert.equal(sim.yearDuration,FIXED_SECONDS_PER_YEAR);
});
test('roads connect real destinations and traffic only appears after powered modern roads exist',()=>{
  const sim=new Civilization(31);
  assert.equal(sim.routes.length,0);assert.equal(sim.land.some(t=>t.road),false);assert.equal(sim.carCount,0);
  const site=sim.freeLand.find(t=>t.x<-4&&t.y<0);assert.ok(sim.planBuilding(site,'hut'));
  assert.equal(sim.routes.length,1);assert.equal(sim.routes[0][0],'-1,1');assert.equal(sim.routes[0].at(-1),`${site.x},${site.y}`);
  for(const route of sim.routes)for(let i=1;i<route.length;i++){
    const a=sim.tiles.get(route[i-1]),b=sim.tiles.get(route[i]);
    assert.equal(Math.abs(a.x-b.x)+Math.abs(a.y-b.y),1);assert.equal(b.road,true);
    assert.ok(a.roadLinks.includes(route[i]));assert.ok(b.roadLinks.includes(route[i-1]));
  }
  for(let i=0;i<2150;i++)sim.tick();
  assert.ok(sim.era>=3);assert.ok(sim.power>0);assert.ok(sim.carCount>0);
  assert.ok([...sim.tiles.values()].some(t=>t.building==='bridge'));
});
test('old paths migrate without changing the island, its buildings or history',()=>{
  const sim=new Civilization(31);sim.tile(1,1).building='hut';
  const save=JSON.parse(sim.serialize());delete save.routeVersion;
  for(const [,tile] of save.tiles){tile.road=tile.kind==='land';delete tile.roadLinks;delete tile.walkable;}
  const restored=Civilization.restore(JSON.stringify(save));assert.ok(restored);
  assert.equal(restored.houses.length,2);assert.equal(restored.land.length,sim.land.length);assert.deepEqual(restored.history,sim.history);
  assert.ok(restored.land.filter(t=>t.road).length<sim.land.length/4,'legacy roads shrink to real building connections');
  assert.ok(restored.land.some(t=>t.walkable&&!t.road));
  const fresh=new Civilization(31),again=Civilization.restore(fresh.serialize());
  assert.equal(again.houses.length,1);assert.equal(again.routes.length,0);assert.equal(again.buildings.some(t=>t.building==='campfire'),false);
});
test('new infrastructure and the original home have a visible and functional progression',()=>{
  const sim=new Civilization(31);assert.equal(sim.tile(-1,1).building,'hut');
  assert.equal(sim.houses.length,1);assert.equal(sim.farms.length,1);assert.equal(sim.power,0);
  assert.equal(sim.buildings.some(t=>['campfire','bonfire'].includes(t.building)),false);
  let manor=false;
  for(let i=0;i<2200;i++){sim.tick();if(sim.tile(-1,1).building==='manor')manor=true;}
  assert.equal(manor,true);assert.equal(sim.tile(-1,1).building,'palace');
  for(const type of ['school','library','science-center','factory','powerplant','statue','garden','solar','turbine','theater'])assert.ok(sim.buildings.some(t=>t.building===type),type);
  assert.ok(sim.power>sim.powerDemand);
  const before=sim.wood;sim.updatePower();assert.ok(sim.wood<before,'steam power burns timber');
});
test('interventions have immediate, measurable and lasting consequences',()=>{
  const sim=new Civilization(31),plot=sim.freeLand[0];
  const wood=sim.wood;sim.interfere(plot.x,plot.y,'nudge');
  assert.ok(plot.buildSite);assert.ok(sim.wood>wood);assert.equal(sim.inspiration,14);
  const duration=plot.buildSite.duration;
  for(let i=0;i<Math.ceil(duration/2);i++)sim.advanceBuildings();
  assert.ok(plot.building);assert.equal(plot.buildSite,null);
  const control=Civilization.restore(sim.serialize());const food=sim.food;
  sim.interfere(1,-1,'rain');assert.ok(sim.food>food);assert.equal(sim.rainBoost,12);
  sim.tick();control.tick();assert.ok(sim.food>control.food);
  const capacity=sim.capacity;sim.interfere(-1,1,'rumble');
  assert.ok(sim.tile(-1,1).quakeDamage>0);assert.ok(sim.capacity<capacity);
  for(let i=0;i<12;i++)sim.advanceBuildings();assert.equal(sim.tile(-1,1).quakeDamage,0);
  assert.equal(sim.tile(0,0).building,'original-tree');
});
test('belief follows interference, while protests follow crowding and trigger a real gathering',()=>{
  const untouched=new Civilization(31);for(let i=0;i<180;i++)untouched.tick();
  assert.equal(untouched.belief,0);assert.equal(untouched.buildings.some(t=>['shrine','church'].includes(t.building)),false);
  const faithful=new Civilization(31);faithful.interfere(1,-1,'rain');faithful.interfere(1,-1,'rain');
  for(let i=0;i<180;i++)faithful.tick();
  assert.ok(faithful.buildings.some(t=>t.building==='church'));
  const city=prepared(3);city.year=150;city.population=city.capacity;city.prosperity=30;
  for(let i=0;i<30;i++)city.updateCivicPressure();
  assert.ok(city.protestUntil>city.year);assert.ok(city.history.some(e=>e.type==='protest'));
});
test('remarks vary without immediate repetition and never mention cars before there is traffic',()=>{
  const sim=new Civilization(7),seen=new Set();
  for(let i=0;i<25;i++){
    const previous=sim.populationNote;sim.chooseRemark();assert.notEqual(sim.populationNote,previous);
    assert.doesNotMatch(sim.populationNote,/cars|drivers|park nearer|traffic jam/);seen.add(sim.populationNote);
  }
  assert.ok(seen.size>=9);
  for(let i=0;i<2150;i++)sim.tick();
  assert.ok(sim.carCount>0);
  const modernSeen=new Set();for(let i=0;i<50;i++){sim.chooseRemark();modernSeen.add(sim.populationNote);}
  assert.ok(modernSeen.size>16);assert.ok([...modernSeen].some(text=>/palace|library|factory|statue/.test(text)));
});
test('a new island has coherent woodland and real sandy coasts, then develops parks, shops and amusement',()=>{
  const sim=new Civilization(31);
  assert.ok(sim.forests.length>=8);assert.ok(sim.beaches.length>=9);
  for(const beach of sim.beaches)assert.equal(sim.isCoast(beach),true);
  assert.equal(sim.tile(0,0).building,'original-tree');
  for(let i=0;i<2200;i++)sim.tick();
  for(const type of ['park','forest','shop','bakery','cafe','playground','fairground']){
    const place=sim.buildings.find(t=>t.building===type);assert.ok(place,type);
    if(!place.walkable){sim.storm=0;sim.pumpBroken=0;for(let i=0;i<20;i++)sim.repairFloods();sim.rebuildRoads();}
    assert.equal(place.walkable,true,`${type} reachable after flood repairs`);
  }
  for(let i=0;i<25&&!sim.beaches.length;i++)sim.tick();
  assert.ok(sim.beaches.length>0);assert.ok(sim.land.length<=sim.config.maxTiles);
});
test('new terrain is connected, reserves relief from construction and preserves the founding village',()=>{
  const types=new Set(),shapes=new Set();
  for(let seed=1;seed<=30;seed++){
    const sim=new Civilization(seed);types.add(sim.geography.kind);
    shapes.add(JSON.stringify(sim.land.map(t=>[t.x,t.y,t.landform])));
    const seen=new Set(['0,0']),queue=[sim.tile(0,0)];
    for(let i=0;i<queue.length;i++)for(const [x,y]of neighbors(queue[i])){const t=sim.tile(x,y),id=`${x},${y}`;if(t?.kind==='land'&&!seen.has(id)){seen.add(id);queue.push(t);}}
    assert.equal(seen.size,sim.land.length);assert.ok(sim.land.length>=340&&sim.land.length<=410);
    assert.equal(sim.population,6);assert.equal(sim.houses.length,1);assert.equal(sim.farms.length,1);
    assert.ok(sim.land.filter(t=>!t.building&&!t.landform).length>sim.land.length*.8,'most of the larger island starts unoccupied');
    assert.equal(sim.tile(0,0).building,'original-tree');assert.equal(sim.tile(-1,1).building,'hut');assert.equal(sim.tile(1,1).building,null);
    assert.equal(sim.land.some(t=>t.road),false,'nature alone does not need a road');
    for(const relief of sim.land.filter(t=>t.landform)){assert.ok(!sim.freeLand.includes(relief));assert.equal(sim.planBuilding(relief,'tower'),false);}
  }
  assert.equal(types.size,3);assert.ok(shapes.size>20);
});
test('the final age begins around 2100 and interventions bring it forward within a bounded range',()=>{
  const quiet=new Civilization(31);assert.equal(quiet.endgameYear,2100);
  quiet.year=2099;quiet.advanceEndgame();assert.equal(quiet.endgameStarted,false);
  quiet.year=2100;quiet.advanceEndgame();assert.equal(quiet.endgameStarted,true);assert.equal(quiet.endgameAt,2100);
  const busy=new Civilization(31);busy.influence.nudge=10;busy.interferences=10;assert.equal(busy.endgameYear,2060);
  busy.year=2060;busy.advanceEndgame();assert.equal(busy.endgameStarted,true);
  const chaotic=new Civilization(31);chaotic.influence.rumble=100;chaotic.interferences=100;assert.equal(chaotic.endgameYear,1950);
  chaotic.year=1949;chaotic.advanceEndgame();assert.equal(chaotic.endgameStarted,false);
});
test('volcanic activity is local, recoverable, and recorded in island history',()=>{
  let sim;
  for(let seed=1;seed<40;seed++){const candidate=new Civilization(seed);if(candidate.geography.kind==='volcanic'){sim=candidate;break;}}
  assert.ok(sim);const population=sim.population;sim.year=sim.nextVolcanicEvent;sim.advanceGeology();
  assert.ok(sim.volcanoActiveUntil>sim.year);assert.equal(sim.population,population);assert.ok(sim.history.some(h=>h.type==='volcano'));
  assert.equal(sim.tile(0,0).building,'original-tree');
});
test('districts preserve everyday buildings, put high homes in the back, and support both cars and bicycles',()=>{
  const sim=new Civilization(31);for(let i=0;i<2300;i++)sim.tick();sim.organizeDistricts();
  const bounds=sim.layoutBounds();
  assert.ok(sim.houses.some(t=>t.building==='tower'));
  assert.ok(sim.houses.filter(t=>t.building==='tower').every(t=>sim.plotPosition(t,bounds).depth<.43));
  assert.ok(sim.houses.filter(t=>t.building==='tower').length<sim.houses.length*.5);
  for(const type of ['farm','factory','school','science-center'])assert.ok(sim.buildings.some(t=>t.building===type),type);
  assert.ok(sim.carCount>0);assert.ok(sim.bikeCount>0);
  const fields=sim.farms.map(t=>sim.plotPosition(t,bounds).depth);
  const factories=sim.buildings.filter(t=>t.building==='factory').map(t=>sim.plotPosition(t,bounds).depth);
  assert.ok(fields.reduce((a,b)=>a+b,0)/fields.length>factories.reduce((a,b)=>a+b,0)/factories.length);
});
test('beaches follow the actual coast and become parks when reclamation leaves them inland',()=>{
  const sim=new Civilization(31),beach=sim.beaches[0];
  for(const [x,y]of neighbors(beach)){
    const tile=sim.tile(x,y);if(tile?.kind==='water'){tile.kind='land';tile.reclaimed=true;}
  }
  assert.equal(sim.isCoast(beach),false);sim.updateNature();assert.equal(beach.building,'park');
  assert.ok(sim.history.some(h=>h.text.includes('inland park')));
  for(const other of sim.beaches)assert.equal(sim.isCoast(other),true);
});
test('woodland supplies renewable timber, shops bring income and parks reduce crowding pressure',()=>{
  const green=new Civilization(31),bare=Civilization.restore(green.serialize());
  for(const forest of bare.forests)forest.building=null;
  green.era=2;bare.era=2;
  green.tick();bare.tick();assert.ok(green.wood>bare.wood);assert.ok(green.environment>bare.environment);
  const city=prepared(3);city.population=city.capacity;city.prosperity=30;
  const withPark=Civilization.restore(city.serialize());withPark.houses.find(t=>!t.foundingHome).building='park';
  city.updateCivicPressure();withPark.updateCivicPressure();assert.ok(withPark.unrest<city.unrest);
  const shop=new Civilization(31),noShop=Civilization.restore(shop.serialize());
  shop.freeLand[0].building='shop';shop.tick();noShop.tick();assert.ok(shop.wealth>noShop.wealth);
});
test('amusement consumes power and existing full cities can make room for new amenities',()=>{
  const sim=prepared(3);sim.year=200;sim.wood=400;sim.wealth=500;
  sim.power=100;sim.updatePower();const demand=sim.powerDemand;
  const plot=sim.houses.find(t=>!t.foundingHome);plot.building='fairground';
  sim.updatePower();assert.ok(sim.powerDemand>demand,'rides use more electricity than the home they replaced');
  // A sufficiently large, full established city can rezone an ordinary house, preserving the founder.
  for(const tile of [...sim.tiles.values()].filter(t=>t.kind==='water'&&!t.building).slice(0,30)){
    tile.kind='land';tile.building='house';
  }
  assert.equal(sim.freeLand.length,0);sim.ensureNeighborhoods();
  assert.ok(sim.land.some(t=>t.buildSite?.type==='park'));
  assert.equal(sim.tile(-1,1).building,'hut');assert.equal(sim.tile(0,0).building,'original-tree');
});
test('rapid research cannot skip historical ages or unlock modern buildings centuries early',()=>{
  const sim=new Civilization(31);sim.technology=1000;
  for(let i=0;i<119;i++)sim.tick();
  assert.equal(sim.age.id,'classical');assert.equal(sim.era,1);
  for(const type of ['factory','powerplant','tower','science-center','solar','turbine','fairground'])assert.equal(sim.planBuilding(sim.freeLand[0],type,true),false,type);
  sim.year=600;assert.equal(sim.age.id,'medieval');
  sim.year=1250;assert.equal(sim.age.id,'renaissance');
  sim.year=1750;sim.tick();assert.equal(sim.era,2);assert.equal(sim.power,0);assert.equal(sim.carCount,0);assert.equal(sim.bikeCount,0);
  sim.year=1920;sim.tick();assert.equal(sim.era,3);assert.notEqual(sim.homeTypeFor(sim.freeLand[0]),'tower');
  sim.year=1980;assert.equal(sim.age.id,'contemporary');sim.year=2080;sim.tick();assert.equal(sim.era,4);
});
test('old modern saves adapt to their historical year without losing the map, population or landmarks',()=>{
  const sim=new Civilization(31);sim.year=900;sim.era=4;sim.technology=100;
  for(const type of ['tower','factory','powerplant','science-center','solar','turbine'])sim.freeLand[0].building=type;
  const old=JSON.parse(sim.serialize());delete old.timelineVersion;
  const restored=Civilization.restore(JSON.stringify(old));assert.ok(restored);assert.equal(restored.age.id,'medieval');assert.equal(restored.era,1);
  assert.equal(restored.population,sim.population);assert.equal(restored.land.length,sim.land.length);assert.equal(restored.history.length,sim.history.length);
  assert.equal(restored.buildings.some(t=>['tower','factory','powerplant','science-center','solar','turbine'].includes(t.building)),false);
  assert.equal(restored.tile(0,0).building,'original-tree');assert.equal(restored.tile(-1,1).foundingHome,true);
});
test('historical blueprints do not overwrite a new civic use or the founding palace later',()=>{
  const sim=new Civilization(31);sim.year=1300;sim.era=1;sim.population=90;
  const plot=sim.freeLand[0];plot.futureBuilding='tower';
  assert.equal(sim.planBuilding(plot,'school',true),true);assert.equal(plot.futureBuilding,undefined);
  const home=sim.tile(-1,1);home.building='manor';home.futureBuilding='tower';sim.advanceFoundingHome();
  assert.equal(home.building,'palace');assert.equal(home.futureBuilding,undefined);
});

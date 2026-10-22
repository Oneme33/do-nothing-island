import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization,neighbors} from '../src/simulation.js';
import {startBlaze,tendFires,finishBlaze} from '../src/consequences.js';
import {advanceEconomy,advanceEnvironment,chooseFinalPlan,finishStory,resumeSandbox} from '../src/story.js';
import {describePlot} from '../src/inspection.js';
import {islandScores,drawFinale} from '../src/finale.js';
import {nl} from '../src/language.js';

test('fire spreads to wooden neighbors, while wet and stone houses resist',()=>{
 for(const [material,wet,burns] of [['wood',false,true],['stone',false,false],['wood',true,false]]){
  const s=new Civilization(31),a=s.tile(4,-1),b=s.tile(5,-1);a.building='house';b.building='house';b.material=material;if(wet)b.wetUntil=50;s.random=()=>.2;
  startBlaze(s,a);s.year=3;tendFires(s);assert.equal(!!b.fire,burns,`${material}, wet ${wet}`);
 }
});
test('a burnt forest becomes a buildable clearing and ash makes fields more productive',()=>{
 const s=new Civilization(31),forest=s.forests[0];startBlaze(s,forest);s.year=forest.fire.until;tendFires(s);
 assert.equal(forest.building,null);assert.equal(forest.burntForest,true);assert.ok(s.freeLand.includes(forest));
 const r=Civilization.restore(s.serialize());assert.equal(r.tile(forest.x,forest.y).burntForest,true);
 const clean=Civilization.restore(s.serialize()),fertile=Civilization.restore(s.serialize());fertile.farms[0].ashFertility=.6;
 advanceEconomy(clean);advanceEconomy(fertile);assert.ok(fertile.food>clean.food);assert.ok(s.planBuilding(forest,'hut',true));
});
test('repeated fires establish masonry, a brigade and the Phoenix ending',()=>{
 const s=new Civilization(31);s.wood=400;
 for(let i=0;i<5;i++){const t=s.freeLand[0];t.building='house';startBlaze(s,t);finishBlaze(s,t);s.year=t.rebuildAt;tendFires(s);}
 assert.ok(s.fireCode);assert.ok(s.houses.some(t=>t.material==='stone'));assert.ok(s.rebuiltFires>=2);
 for(let i=0;i<6;i++)s.advanceBuildings();assert.ok(s.buildings.some(t=>t.building==='fire-station'));
 s.influence.fire=5;assert.equal(chooseFinalPlan(s),'phoenix');finishStory(s,'phoenix');assert.equal(s.outcome.id,'phoenix');
 const t=s.houses.find(t=>!t.foundingHome);startBlaze(s,t);assert.equal(t.fire.until-s.year,6);
});
test('a coastal quake raises actual land, respects the limit and survives saving',()=>{
 const s=new Civilization(31),shore=s.land.find(t=>!t.landform&&neighbors(t).some(([x,y])=>s.tile(x,y)?.kind==='water'));
 const count=s.land.length;s.interfere(shore.x,shore.y,'rumble');assert.equal(s.land.length,count+1);assert.ok(s.land.some(t=>t.upliftedYear));
 assert.equal(Civilization.restore(s.serialize()).land.length,count+1);
 const bounded=new Civilization(31);bounded.config.maxTiles=bounded.land.length;bounded.interfere(shore.x,shore.y,'rumble');assert.ok(bounded.land.length<=bounded.config.maxTiles);
});
test('an interior quake can expose a permanent spring or a bridgeable rift',()=>{
 const s=new Civilization(31);s.interfere(1,-1,'rumble');assert.ok(s.land.some(t=>t.spring));
 const withSpring=Civilization.restore(s.serialize()),without=Civilization.restore(s.serialize());for(const t of without.land)t.spring=false;withSpring.freshwater=without.freshwater=40;
 for(let i=0;i<30;i++){advanceEnvironment(withSpring);advanceEnvironment(without);}assert.ok(withSpring.freshwater>without.freshwater);
 const r=new Civilization(31);r.influence.rumble=2;r.interfere(1,-1,'rumble');const rift=[...r.tiles.values()].find(t=>t.rift);assert.ok(rift);assert.equal(rift.kind,'water');
 r.interfere(rift.x,rift.y,'nudge');assert.equal(rift.building,'bridge');assert.ok(rift.riftYear);assert.ok(r.journeys.some(j=>j.route.includes(`${rift.x},${rift.y}`)));
});
test('quakes by mountains leave lower relief and a productive quarry',()=>{
 const s=new Civilization(31),peak=s.land.find(t=>t.landform==='mountain'),height=peak.relief;
 s.interfere(peak.x,peak.y,'rumble');assert.ok(peak.relief<height);assert.ok(peak.landslideYear);assert.ok(s.buildings.some(t=>t.building==='quarry'));
});
test('volcano, soaked ground and established bonfires reward discovering combinations',()=>{
 let volcanic;for(let seed=1;seed<30;seed++){const s=new Civilization(seed);if(s.geography.kind==='volcanic'){volcanic=s;break;}}
 const cone=volcanic.land.find(t=>t.landform==='volcano');volcanic.interfere(cone.x,cone.y,'rumble');assert.ok(volcanic.volcanoActiveUntil>volcanic.year);assert.ok(volcanic.discoveries.includes('quake-volcano'));
 const wet=new Civilization(31);wet.interfere(1,-1,'rain');wet.interfere(1,-1,'rumble');assert.ok(wet.discoveries.includes('rain-quake'));assert.ok(wet.land.some(t=>t.mudflowYear));
 const festival=new Civilization(31),spot=festival.freeLand[0];festival.interfere(spot.x,spot.y,'fire');festival.interfere(spot.x,spot.y,'fire');assert.ok(spot.traditionCount);assert.ok(festival.discoveries.includes('fire-tradition'));assert.ok(festival.nextTradition>festival.year);
 const restored=Civilization.restore(wet.serialize());assert.deepEqual(restored.discoveries,wet.discoveries);
});
test('inspection gives a stable household, dates and actual plot memories',()=>{
 const s=new Civilization(31),home=s.tile(-1,1);s.interfere(-1,1,'fire');s.interfere(-1,1,'rain');s.interfere(-1,1,'rumble');
 const text=describePlot(s,home);assert.match(text,/familie/);assert.match(text,/Gebouwd in jaar 1/);assert.match(text,/brand/);assert.match(text,/beving/);assert.match(text,/Regen gekregen/);assert.doesNotMatch(text,/undefined/);
 assert.equal(describePlot(Civilization.restore(s.serialize()),Civilization.restore(s.serialize()).tile(-1,1)),text);
});
test('scores reflect choices, stay bounded and freeze in the saved recap',()=>{
 const s=new Civilization(31),before=islandScores(s);s.influence.dependence=60;s.interferences=30;s.pollution=80;s.environment=20;
 const after=islandScores(s);assert.ok(after.values.zelfstandigheid<before.values.zelfstandigheid);assert.ok(after.values.natuur<before.values.natuur);
 for(const n of Object.values(after.values))assert.ok(n>=0&&n<=100);
 finishStory(s,'independent');const score=structuredClone(s.outcome.scores);resumeSandbox(s);for(let i=0;i<20;i++)s.tick();assert.deepEqual(s.outcome.scores,score);assert.deepEqual(Civilization.restore(s.serialize()).outcome.scores,score);
});
test('all seven dedicated finale scenes draw finite coordinates at small and large sizes',()=>{
 const s=new Civilization(31),calls=[];const c=new Proxy({},{get:(target,name)=>name in target?target[name]:(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));calls.push(name);},set:(target,name,value)=>(target[name]=value,true)});
 for(const id of ['independent','sanctuary','fortress','phoenix','miracles','retreat','last-drop'])for(const w of [320,800])for(const elapsed of [0,5,12,24])drawFinale(c,w,300,s,{id,elapsed},false);
 assert.ok(calls.includes('fillRect'));assert.ok(calls.includes('ellipse'));
 assert.equal(nl('The Great Duck Regatta'),'De grote eendenrace');assert.equal(nl('The very cautious kingdom.'),'Het bijzonder voorzichtige koninkrijk.');
});
test('a tremor collapses fragile buildings near the epicentre and costs stores; reinforced homes only crack',()=>{
 const s=new Civilization(31);while(s.year<300)s.tick();
 const home=s.houses.find(t=>!t.foundingHome&&t.district!=='heritage'&&!t.retrofitted);const food=s.food,pop=s.population;
 s.interfere(home.x,home.y,'rumble');assert.equal(home.building,'ruins');assert.ok(home.rebuildFrom);assert.ok(s.food<food);assert.ok(s.population<pop);
 const strong=s.houses.find(t=>!t.foundingHome&&t.district!=='heritage'&&Math.hypot(t.x-home.x,t.y-home.y)>6);strong.retrofitted=true;const type=strong.building;
 s.interfere(strong.x,strong.y,'rumble');assert.equal(strong.building,type);
});

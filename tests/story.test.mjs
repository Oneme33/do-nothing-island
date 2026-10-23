import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {resumeSandbox,advanceEconomy,advanceEnvironment,eventPriority} from '../src/story.js';
const run=(seed=31,mode=null,count=0,config={})=>{
 const s=new Civilization(seed,config);
 while(!s.ending&&s.year<2600){if(s.year===500)for(let i=0;i<count;i++)s.interfere(1,-1,mode);s.tick();}
 return s;
};
test('ordinary untouched islands tell a full story and finish by 2240 without requiring a rare setting',()=>{
 for(const seed of [8,31,201]){
  const s=run(seed,null,0,{rareEndings:false});
  assert.equal(s.ending,true);assert.ok(s.year>=2170&&s.year<=2270,`ends at ${s.year}`);assert.ok(s.outcome?.quote);assert.notEqual(s.outcome.id,'last-drop');
  assert.ok(s.storyStats.reforms>=3,'autonomous civic stories complete without help');
  assert.ok(s.buildings.some(t=>t.civicLegacy),'civic arguments leave actual places');
  const year=s.year;s.tick();assert.equal(s.year,year);
  resumeSandbox(s);s.tick();assert.equal(s.year,year+1);assert.equal(s.ending,false);assert.ok(s.outcome,'recap survives free play');
 }
});
test('the same island remembers different intervention types and reaches different endings',()=>{
 const quiet=run(31),rain=run(31,'rain',12),quake=run(31,'rumble',8);
 assert.ok(['independent','sanctuary','artists','funfair','seafarers'].includes(quiet.outcome.id),'an untouched island follows its own calling');assert.equal(rain.outcome.id,'miracles');assert.equal(quake.outcome.id,'fortress');
 assert.ok(quiet.year>=2170);assert.ok(rain.year<quiet.year);assert.ok(quake.year<quiet.year);
 assert.equal(rain.interventionLedger.length,12);assert.ok(rain.influence.dependence>=16);
 assert.ok(quake.houses.some(t=>t.retrofitted),'earthquake memories change construction');
 assert.ok(rain.land.some(t=>(t.irrigated||0)>(quiet.tile(t.x,t.y)?.irrigated||0)),'rain leaves physical irrigation even when both coastlines reach the same space limit');
});
test('rain leaves irrigation; tremor repairs produce foundations that reduce future damage',()=>{
 const s=new Civilization(31),farm=s.tile(1,-1);
 s.interfere(1,-1,'rain');assert.ok(farm.irrigated);
 for(let i=0;i<120;i++)s.tick();assert.ok(farm.irrigated);assert.equal(s.rainBoost,0);
 s.interfere(-1,1,'rumble');const home=s.tile(-1,1);assert.equal(home.quakeDamage,1);
 for(let i=0;i<15;i++){s.wood=200;s.advanceBuildings();}
 assert.equal(home.retrofitted,true);s.interfere(-1,1,'rumble');assert.equal(home.quakeDamage,.35);
 const restored=Civilization.restore(s.serialize());assert.deepEqual(restored.influence,s.influence);assert.deepEqual(restored.interventionLedger,s.interventionLedger);assert.equal(restored.tile(-1,1).retrofitted,true);
});
test('the founding manor keeps its estate while the one castle stands on its own site',()=>{
 const s=new Civilization(31);while(s.year<1300)s.tick();
 assert.equal(s.tile(-1,1).building,'manor');assert.ok(s.court);const castle=s.tile(s.court.x,s.court.y);assert.equal(castle.building,'palace');assert.ok(Math.hypot(castle.x,castle.y)>=4);
 assert.equal(s.land.filter(t=>['palace','royal-palace'].includes(t.building)).length,1,'only one castle');
 assert.equal(s.tile(-2,1).building,'garden');assert.equal(s.tile(-1,2).building,'palace-square');
 for(const t of [s.tile(-2,1),s.tile(-2,2),s.tile(-1,2)])assert.ok(!s.freeLand.includes(t));
 assert.ok(s.buildings.some(t=>t.building==='campus-square'));
 assert.ok(s.journeys.some(j=>j.purpose==='learning'));
 assert.ok(s.journeys.every(j=>s.tiles.get(j.from)?.foundingHome||s.houses.some(h=>`${h.x},${h.y}`===j.from)));
});
test('public costs, food spoilage and conservation remain effective on a larger green island',()=>{
 const s=run(201);assert.ok(['sanctuary','independent'].includes(s.outcome.id),'a calm, untouched island');
 assert.ok(s.wealth<1400);assert.ok(s.prosperity<98);
 const stores=Civilization.restore(s.serialize()),empty=Civilization.restore(s.serialize());
 stores.food=2000;empty.food=1000;stores.wealth=1000;empty.wealth=0;
 advanceEconomy(stores);advanceEconomy(empty);
 assert.ok(Math.abs(stores.food-empty.food-975)<.001,'stored food loses 2.5% per year');
 assert.ok(stores.balance.expenses>empty.balance.expenses,'large reserves carry additional public costs');
 const clean=Civilization.restore(s.serialize()),dirty=Civilization.restore(s.serialize());
 clean.policies.conservation=true;dirty.policies.conservation=false;
 for(const t of dirty.houses.slice(0,8)){t.building='factory';clean.tile(t.x,t.y).building='factory';}
 for(let i=0;i<100;i++){advanceEnvironment(clean);advanceEnvironment(dirty);}
 assert.ok(clean.environment>dirty.environment);assert.ok(clean.pollution<dirty.pollution);
});
test('milestones survive routine messages and important effects survive a busy signal queue',()=>{
 const s=new Civilization(31);const entry=s.log('The first palace opens.','palace',{x:-1,y:1});
 for(let i=0;i<500;i++){s.log('A boat arrives.','trade');s.signal('build',s.tile(0,1),'A house');}
 s.signal('ending',s.tile(0,0),'A complete story');for(let i=0;i<100;i++)s.signal('build',s.tile(1,1),'A house');
 assert.ok(s.history.some(e=>e.id===entry.id));assert.equal(s.history.length,350);assert.ok(s.signals.some(e=>e.type==='ending'));
 assert.ok(eventPriority('endgame')>eventPriority('trade'));assert.ok(s.signals.length<=40);
});
test('coastline snapshots preserve the beginning and the final island within a bounded archive',()=>{
 const s=run(31);assert.equal(s.snapshots[0].year,1);assert.equal(s.snapshots[0].land.length,s.originalArea);
 assert.ok(s.snapshots.at(-1).land.length>s.originalArea);assert.equal(s.snapshots.at(-1).label,'The final island');assert.ok(s.snapshots.length<=16);
 assert.ok(s.land.some(t=>t.oldDike));
 const r=Civilization.restore(s.serialize());assert.deepEqual(r.snapshots,s.snapshots);assert.deepEqual(r.outcome,s.outcome);
});
test('a legacy year-4100 save reaches a recap on load instead of resuming indefinitely',()=>{
 const s=run(31),old=JSON.parse(s.serialize());old.year=4100;old.ending=false;old.endingSeen=false;old.endgameAt=2100;old.endgameStarted=true;
 for(const field of ['storyVersion','outcome','finaleDeadline','endgamePhase','snapshots','finalPlan'])delete old[field];
 const restored=Civilization.restore(JSON.stringify(old));assert.ok(restored);assert.equal(restored.ending,true);assert.ok(restored.outcome);assert.equal(restored.snapshots[0].year,1);
});
test('modern life and the finale receive readable time even when automatic acceleration is enabled',()=>{
 const s=new Civilization(31);let modernSeconds=0;for(let y=1920;y<2080;y++){s.year=y;modernSeconds+=s.yearDuration;}
 assert.ok(modernSeconds>=90);s.endgameStarted=true;s.year=2150;assert.ok(s.yearDuration>=.65);
});
import {islandScores,scoreInputs,scoreLevel,ISLAND_CHECKLIST,SCORE_MAX} from '../src/finale.js';
import {ensureWishes,canHelpWish,helpActiveWish} from '../src/wishes.js';
import {placeCommission,canCommission} from '../src/commissions.js';
// Plays an island with a share of the wishes helped and a few trials of your own.
function playStyle(seed,share,trials=[]){
 const s=new Civilization(seed,{maxTiles:720}),seen=new Set();let asked=0,helped=0;
 while(!s.ending){s.tick();const w=ensureWishes(s).active;
  if(w&&!seen.has(w.id)){seen.add(w.id);asked++;if(helped<share*asked&&canHelpWish(s,w)){helped++;helpActiveWish(s,w.id);}}
  if(trials.includes(s.year)){const t=s.houses.find(t=>!t.foundingHome&&!t.fire);s.interfere(t.x,t.y,s.year%2?'fire':'rumble');}
  if(s.commissions?.available){const spot=s.land.find(t=>canCommission(s,t));if(spot)placeCommission(s,'rose-garden',spot.x,spot.y);}}
 return s;
}
test('the island inspection is win-win: helping never costs, a few trials help, a heavy hand costs',()=>{
 const watched=playStyle(7,0),helpful=playStyle(7,1),balanced=playStyle(7,.5,[400,901,1500]);
 const quiet=islandScores(watched),all=islandScores(helpful),middle=islandScores(balanced);
 assert.ok(quiet.total>=55&&quiet.total<88,`watching alone: ${quiet.total}`);assert.ok(quiet.values.band>0&&quiet.values.band<35,'wishes they solve themselves count too');
 assert.equal(all.values.band,35,'helping with everything never costs');assert.ok(all.total>=88,`helping all: ${all.total}`);
 assert.ok(middle.total>=93,`middle ground: ${JSON.stringify(middle.values)}`);assert.ok(middle.total>=all.total&&middle.total>quiet.total);
 assert.equal(scoreInputs(balanced).tests,3);assert.equal(scoreInputs(helpful).unrequested,0,'asked-for help never counts as meddling');
 assert.ok(scoreInputs(helpful).helped>24,'help is counted beyond the short wish history');
 // A heavy hand costs resilience and the bond again.
 balanced.interventionLedger.push(...Array.from({length:10},(_,i)=>({type:'fire',asked:false,year:2000+i})));balanced.interferences+=24;
 const harsh=islandScores(balanced);assert.ok(harsh.values.veerkracht<middle.values.veerkracht&&harsh.values.band<middle.values.band&&harsh.total<middle.total);
 assert.equal(Object.values(SCORE_MAX).reduce((a,b)=>a+b,0),100);assert.equal(middle.checklist.length,ISLAND_CHECKLIST.length);
 for(const total of [0,49,50,70,85,99,100])assert.ok(scoreLevel(total).min<=total);
});



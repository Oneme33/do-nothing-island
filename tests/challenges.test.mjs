import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {ensureChallenges,advanceChallenges,CHALLENGE_CATALOG} from '../src/challenges.js';
function track(s,...ids){s.challenges={version:1,revealed:false,trackingSince:1,goals:ids.map(id=>({id,status:'active',completedAt:null}))};return s.challenges.goals;}

test('each island gets one to three reproducible goals without contradictory intervention goals',()=>{
 const counts=new Set(),selections=new Set();
 for(let seed=1;seed<=30;seed++){
  const s=new Civilization(seed),random=s.randomState,initial=structuredClone(s.challenges);delete s.challenges;ensureChallenges(s);
  assert.deepEqual(s.challenges,initial);assert.equal(s.randomState,random);assert.ok(s.challenges.goals.length>=1&&s.challenges.goals.length<=3);assert.equal(s.challenges.revealed,false);
  counts.add(s.challenges.goals.length);selections.add(s.challenges.goals.map(g=>g.id).join(','));
  const definitions=s.challenges.goals.map(g=>CHALLENGE_CATALOG.find(d=>d.id===g.id));if(definitions.some(d=>d.id==='hands-off'))assert.equal(definitions.some(d=>d.experiment),false);
 }
 assert.equal(counts.size,3);assert.ok(selections.size>5);
});
test('deadlines include the named year and completed goals survive later changes and saving',()=>{
 const s=new Civilization(31),[goal]=track(s,'first-manor');s.year=400;s.tile(-1,1).building='manor';advanceChallenges(s);assert.equal(goal.status,'completed');assert.equal(goal.completedAt,400);
 s.year=700;s.tile(-1,1).building='ruins';advanceChallenges(s);assert.equal(goal.status,'completed');assert.deepEqual(Civilization.restore(s.serialize()).challenges,s.challenges);
 const late=new Civilization(31),[missed]=track(late,'first-manor');late.year=401;late.tile(-1,1).building='manor';advanceChallenges(late);assert.equal(missed.status,'missed');
});
test('the quiet Renaissance challenge reacts to real intervention but never retracts an earned result',()=>{
 const a=new Civilization(31),[missed]=track(a,'hands-off');a.interfere(1,-1,'rain');assert.equal(missed.status,'missed');
 const b=new Civilization(31),[goal]=track(b,'hands-off');b.year=1249;advanceChallenges(b);assert.equal(goal.status,'active');b.year=1250;advanceChallenges(b);assert.equal(goal.status,'completed');b.interfere(1,-1,'rain');assert.equal(goal.status,'completed');
});
test('hidden progress stays silent and never awards resources or changes the random sequence',()=>{
 const s=new Civilization(31);track(s,'hundred-neighbors','library','fresh-spring');s.population=101;s.tile(2,2).building='library';s.tile(1,1).spring=true;
 const before={history:structuredClone(s.history),events:structuredClone(s.events),signals:structuredClone(s.signals),random:s.randomState,food:s.food,wood:s.wood,influence:{...s.influence}};
 advanceChallenges(s);assert.ok(s.challenges.goals.every(g=>g.status==='completed'));assert.equal(s.challenges.revealed,false);
 assert.deepEqual({history:s.history,events:s.events,signals:s.signals,random:s.randomState,food:s.food,wood:s.wood,influence:s.influence},before);
});
test('green goals need the actual modern year and fire goals respond to a real new tradition',()=>{
 const s=new Civilization(31),[green]=track(s,'green-modernity');for(const t of s.freeLand.slice(0,4))t.building='forest';s.environment=80;s.year=1919;advanceChallenges(s);assert.equal(green.status,'active');s.year=1920;advanceChallenges(s);assert.equal(green.status,'completed');
 const a=new Civilization(31),[fire]=track(a,'fire-tradition'),spot=a.freeLand.find(t=>!t.landform&&!t.reservedFor);a.interfere(spot.x,spot.y,'fire');assert.equal(fire.status,'active');a.interfere(spot.x,spot.y,'fire');assert.equal(fire.status,'completed');
});
test('legacy saves start tracking future goals without fabricating past success or changing the world',()=>{
 const s=new Civilization(31);while(s.year<1300)s.tick();const old=JSON.parse(s.serialize());delete old.challenges;
 const restored=Civilization.restore(JSON.stringify(old));assert.equal(restored.challenges.trackingSince,old.year);assert.equal(restored.challenges.revealed,false);
 for(const goal of restored.challenges.goals){const definition=CHALLENGE_CATALOG.find(d=>d.id===goal.id);if(definition.deadline<=old.year)assert.equal(goal.status,'unavailable');assert.notEqual(goal.status,'completed');}
 assert.deepEqual(restored.history,old.history);assert.deepEqual([...restored.tiles],old.tiles);assert.equal(restored.randomState,old.randomState);
 restored.ending=true;advanceChallenges(restored);assert.equal(restored.challenges.goals.some(g=>g.status==='active'),false);
});

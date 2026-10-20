import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {advanceWishes,dismissWish,answerWish} from '../src/wishes.js';

function requesting(kind){
 for(let seed=1;seed<50;seed++){const s=new Civilization(seed);s.wishes.nextAt=1;advanceWishes(s);if(s.wishes.active?.kind===kind)return s;}
 throw new Error(`No ${kind} wish found`);
}
test('wishes use real places, named islanders and their own schedule without steering random simulation',()=>{
 for(const kind of ['rain','feast','bonfire','spring']){
  const s=requesting(kind),w=s.wishes.active,t=s.tile(w.x,w.y);assert.ok(t);assert.ok(w.speaker.includes(s.family.lastName));
  const random=s.randomState,history=s.history.length;advanceWishes(s);assert.equal(s.randomState,random);assert.equal(s.history.length,history,'asking never opens a narrative card');
  const before=s.influence.trust;s.interfere(w.x,w.y,w.mode);assert.equal(s.wishes.active,null,kind);assert.equal(s.wishes.history.at(-1).status,'helped',kind);assert.ok(s.influence.trust>before);
  const trust=s.influence.trust;assert.equal(answerWish(s,t,w.mode),false);assert.equal(s.influence.trust,trust);
 }
});
test('only the requested kind and place count as helping',()=>{
 const s=requesting('rain'),w=s.wishes.active;
 s.interfere(w.x,w.y,'nudge');assert.equal(s.wishes.active.id,w.id);
 const far=s.land.find(t=>Math.hypot(t.x-w.x,t.y-w.y)>5);s.interfere(far.x,far.y,'rain');assert.equal(s.wishes.active.id,w.id);
 s.interfere(w.x,w.y,'rain');assert.equal(s.wishes.history.at(-1).status,'helped');assert.ok(s.influence.dependence>0);
});
test('a real fire can be answered with rain or resolved by the residents themselves',()=>{
 for(const help of [true,false]){
  const s=new Civilization(31),farm=s.farms[0];s.interfere(farm.x,farm.y,'fire');s.wishes.nextAt=s.year;advanceWishes(s);assert.equal(s.wishes.active.kind,'extinguish');
  if(help)s.interfere(farm.x,farm.y,'rain');else{delete farm.fire;advanceWishes(s);}
  assert.equal(s.wishes.history.at(-1).status,help?'helped':'independent');
 }
});
test('dismissing is persistent and declining a wish never creates extra dependence',()=>{
 const s=requesting('feast');s.influence.dependence=10;s.influence.trust=10;dismissWish(s);
 const restored=Civilization.restore(s.serialize());assert.equal(restored.wishes.active.hidden,true);
 restored.year=restored.wishes.active.deadline+1;advanceWishes(restored);assert.equal(restored.wishes.active,null);assert.equal(restored.wishes.history.at(-1).status,'expired');assert.equal(restored.influence.dependence,9.5);assert.equal(restored.influence.trust,9);
 restored.year=restored.wishes.nextAt;advanceWishes(restored);assert.ok(restored.wishes.active);assert.equal(restored.wishes.active.hidden,false);
});
test('old saves get future wishes without inventing a backlog or changing history',()=>{
 const s=new Civilization(31);while(s.year<150)s.tick();const old=JSON.parse(s.serialize());delete old.wishes;
 const restored=Civilization.restore(JSON.stringify(old));assert.equal(restored.wishes.active,null);assert.ok(restored.wishes.nextAt>restored.year);assert.deepEqual(restored.history,old.history);assert.equal(restored.randomState,old.randomState);
});
test('Help fulfils each real request once and refuses stale or changed places without an intervention',async()=>{
 const {helpActiveWish,canHelpWish}=await import('../src/wishes.js');
 for(const kind of ['rain','feast','bonfire','spring']){const s=requesting(kind),id=s.wishes.active.id;assert.equal(canHelpWish(s),true);assert.equal(helpActiveWish(s,id),true);assert.equal(s.interferences,1);assert.equal(helpActiveWish(s,id),false);assert.equal(s.interferences,1);}
 const s=requesting('bonfire'),w=s.wishes.active;s.tile(w.x,w.y).building='house';assert.equal(canHelpWish(s),false);assert.equal(helpActiveWish(s,w.id),false);assert.equal(s.interferences,0);assert.equal(s.tile(w.x,w.y).fire,undefined);
 const a=requesting('rain');assert.equal(helpActiveWish(a,'a different request'),false);assert.equal(a.interferences,0);a.year=a.wishes.active.deadline+1;assert.equal(helpActiveWish(a,a.wishes.active.id),false);assert.equal(a.interferences,0);
});
import {isOpenPlot} from '../src/wishes.js';
test('a requested bonfire goes on an open plot that no house hides',()=>{
 for(let seed=1;seed<40;seed++){
  const s=new Civilization(seed);while(s.year<150)s.tick();s.wishes.active=null;s.wishes.nextAt=s.year;
  for(let i=0;i<8&&s.wishes.active?.kind!=='bonfire';i++){s.wishes.active=null;s.wishes.serial++;s.wishes.nextAt=s.year;advanceWishes(s);}
  const w=s.wishes.active;if(w?.kind!=='bonfire')continue;const t=s.tile(w.x,w.y);
  if(!['campfire','bonfire'].includes(t.building))assert.ok(isOpenPlot(s,t),`seed ${seed}`);
  for(const [dx,dy] of [[1,0],[0,1],[1,1]]){const n=s.tile(t.x+dx,t.y+dy);assert.ok(!n?.building||['farm','beach','park','garden','campfire','bonfire','playground','campus-square','palace-square'].includes(n.building),`nothing tall in front (seed ${seed})`);}
 }
});
import {FUNNY_WISHES} from '../src/wishes.js';
test('funny wishes appear in varied places and are solved with the asked-for tool on the spot',()=>{
 const kinds=new Set(),places=new Set();
 for(let seed=1;seed<60;seed++){
  const s=new Civilization(seed);while(s.year<450)s.tick();s.wishes.active=null;s.wishes.nextAt=s.year;advanceWishes(s);const w=s.wishes.active;if(!w)continue;
  kinds.add(w.kind);places.add(`${w.x},${w.y}`);
  if(!FUNNY_WISHES[w.kind])continue;
  const other=['rain','nudge','rumble','fire'].find(m=>m!==w.mode);const far=s.land.find(t=>Math.hypot(t.x-w.x,t.y-w.y)>6);
  s.interfere(far.x,far.y,w.mode);assert.equal(s.wishes.active?.id,w.id,'the wrong place does not count');
  s.interfere(w.x,w.y,other);if(s.wishes.active)assert.equal(s.wishes.active.id,w.id,'the wrong tool does not count');
  if(s.wishes.active?.id===w.id){s.interfere(w.x,w.y,w.mode);const done=s.wishes.history.at(-1);assert.equal(done.status,'helped');assert.ok(s.history.at(-1).text.includes(FUNNY_WISHES[w.kind].thanks)||s.history.some(e=>e.type==='wish'&&e.text.includes(FUNNY_WISHES[w.kind].thanks)));}
 }
 assert.ok(kinds.size>=6,`varied wishes: ${[...kinds]}`);assert.ok(places.size>=20,'wishes are not always in the same place');
});

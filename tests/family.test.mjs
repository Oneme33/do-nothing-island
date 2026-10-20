import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {advanceFamily,currentRelative} from '../src/family.js';
import {describePlot} from '../src/inspection.js';

test('the first household has a stable named founder and distinct generational links',()=>{
 const a=new Civilization(31),b=new Civilization(31);assert.deepEqual(a.family,b.family);
 const founder=currentRelative(a);assert.equal(founder.generation,1);assert.equal(founder.parentId,null);assert.ok(founder.name&&founder.occupation&&founder.quirk);
 const random=a.randomState;a.year=97;advanceFamily(a);assert.equal(a.randomState,random,'family generation does not steer the island economy');assert.equal(a.family.generations.length,4);
 for(let i=1;i<4;i++){const person=a.family.generations[i];assert.equal(person.parentId,a.family.generations[i-1].id);assert.notEqual(person.name,a.family.generations[i-1].name);assert.equal(person.lastName,founder.lastName);}
 assert.match(describePlot(a,a.tile(-1,1)),new RegExp(currentRelative(a).name));
});
test('centuries of family history survive saving and keep producing the same descendants',()=>{
 const a=new Civilization(31);while(a.year<650)a.tick();const saved=a.serialize(),b=Civilization.restore(saved);assert.deepEqual(b.family,a.family);
 const firstNames=a.family.generations.map(p=>p.name);for(let i=0;i<80;i++){a.tick();b.tick();}
 assert.deepEqual(a.family,b.family);assert.deepEqual(a.family.generations.slice(0,firstNames.length).map(p=>p.name),firstNames);
 assert.equal(new Set(a.family.generations.map(p=>p.id)).size,a.family.generations.length);
 for(const person of a.family.generations)if(person.since<1750)assert.doesNotMatch(person.occupation,/fabrieks|elektricien|programmeur|machinebouwer/);
});
test('older saves gain a family without resetting the map, population, chronology or random state',()=>{
 const s=new Civilization(31);while(s.year<250)s.tick();const old=JSON.parse(s.serialize());delete old.family;
 const restored=Civilization.restore(JSON.stringify(old));assert.ok(restored.family.reconstructed);assert.equal(currentRelative(restored).generation,8);
 assert.equal(restored.year,old.year);assert.equal(restored.population,old.population);assert.deepEqual([...restored.tiles],old.tiles);assert.deepEqual(restored.history,old.history);assert.equal(restored.randomState,old.randomState);
 const previous=restored.family.generations.length;while(restored.year<257)restored.tick();assert.equal(restored.family.generations.length,previous+1);assert.equal(currentRelative(restored).reconstructed,false);
});
test('the family keeps its first home and identity while a burnt home is rebuilt',()=>{
 const s=new Civilization(31),person=currentRelative(s),home=s.tile(-1,1);home.building='ruins';home.rebuildFrom='hut';
 assert.match(describePlot(s,home),new RegExp(person.name));assert.match(describePlot(s,home),/tijdelijk elders/);
 const restored=Civilization.restore(s.serialize());assert.deepEqual(currentRelative(restored),person);assert.deepEqual(restored.family.home,{x:-1,y:1});
});
test('no quirk returns within 32 generations',()=>{
 const s=new Civilization(31);s.year=32*40;advanceFamily(s);const quirks=s.family.generations.map(p=>p.quirk);
 for(let i=0;i+32<=quirks.length;i++)assert.equal(new Set(quirks.slice(i,i+32)).size,32);
});
test('what happens near the first home becomes a family memory that is told to the next generation',()=>{
 const s=new Civilization(31);while(s.year<10)s.tick();const person=currentRelative(s);
 s.interfere(s.family.home.x,s.family.home.y,'rain');
 assert.equal(person.moments.length,1);assert.match(person.moments[0].text,/regen/);assert.match(person.moments[0].memory,/jaar 10/);
 while(currentRelative(s).id===person.id)s.tick();
 const handover=s.history.filter(e=>e.type==='family').at(-1);assert.match(handover.text,new RegExp(`${person.name}, die nog altijd vertelt over de regen uit het niets in jaar 10`));
 assert.match(describePlot(s,s.tile(s.family.home.x,s.family.home.y)),/Aan tafel gaat het nog vaak over/);
 const restored=Civilization.restore(s.serialize());assert.deepEqual(restored.family,s.family);
});
test('an ignored wish is remembered by whoever holds the key when it expires',()=>{
 const s=new Civilization(31),first=currentRelative(s);
 s.wishes.active={id:'wish-old',kind:'spring',mode:'rumble',speaker:`${first.name} ${first.lastName}`,text:'Een bron?',x:3,y:3,issuedAt:20,deadline:40,status:'active',hidden:false};s.wishes.nextAt=9999;
 while(s.year<=41)s.tick();const holder=currentRelative(s);assert.notEqual(holder.id,first.id);
 const memory=holder.moments.find(m=>m.kind==='wish');assert.ok(memory);assert.match(memory.text,new RegExp(`samen met ${first.name}`));assert.match(memory.memory,/^de bron die in jaar \d+ nooit kwam$/);
});
test('each keyholder keeps at most four memories and keeps the most important ones',()=>{
 const s=new Civilization(31),person=currentRelative(s);
 for(let i=0;i<6;i++)s.interfere(5,5,'nudge');s.interfere(s.family.home.x,s.family.home.y,'rumble');
 assert.equal(person.moments.length,4);assert.ok(person.moments.some(m=>m.kind==='rumble'));
});

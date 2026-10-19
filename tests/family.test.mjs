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

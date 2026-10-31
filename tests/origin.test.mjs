import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {ORIGIN_CATALOG,originForSeed} from '../src/origin.js';
import {museumExhibits} from '../src/museum.js';
import {creditsFor} from '../src/credits.js';
import {describePlot} from '../src/inspection.js';

test('each seed picks the same one old place',()=>{
 for(const seed of [1,2,8,20,31,77]){
  const first=originForSeed(seed),second=originForSeed(seed);
  assert.equal(first.id,second.id);
  assert.ok(ORIGIN_CATALOG.includes(first));
 }
});

test('a new island begins with exactly one unique origin landmark',()=>{
 for(const seed of [1,2,8,20,31]){
  const s=new Civilization(seed),tile=s.tile(s.origin.x,s.origin.y);
  assert.equal(s.land.filter(t=>t.building==='origin').length,1);
  assert.equal(tile.building,'origin');
  assert.equal(tile.originId,s.origin.id);
  assert.equal(tile.originName,s.origin.name);
  assert.equal(tile.originLandmark,true);
  assert.equal(tile.builtYear,1);
  assert.equal(tile.reservedFor,'origin');
 }
});

test('the shipwreck starts on the coast and survives a save',()=>{
 const s=new Civilization(2);
 assert.equal(s.origin.id,'shipwreck');
 assert.equal(s.isCoast(s.tile(s.origin.x,s.origin.y)),true);
 const restored=Civilization.restore(s.serialize());
 assert.ok(restored);
 assert.equal(restored.origin.name,s.origin.name);
 assert.equal(restored.tile(restored.origin.x,restored.origin.y).building,'origin');
});

test('the origin appears in the museum, the credits and the inspection card',()=>{
 const s=new Civilization(31);
 assert.ok(museumExhibits(s).some(item=>item.kind==='Oudste plek'&&item.title===s.origin.name));
 assert.ok(creditsFor(s).some(line=>line.text===s.origin.name&&line.sub==='het oudste spoor van dit eiland'));
 const text=describePlot(s,s.tile(s.origin.x,s.origin.y));
 assert.match(text,new RegExp(s.origin.name));
 assert.match(text,/oudste spoor/);
});

test('an older save gets the record without having its map rewritten',()=>{
 const old=new Civilization(31),data=JSON.parse(old.serialize());
 delete data.origin;
 for(const [,tile] of data.tiles){delete tile.originId;delete tile.originName;delete tile.originLandmark;if(tile.building==='origin')tile.building=null;}
 const restored=Civilization.restore(JSON.stringify(data));
 assert.ok(restored);
 assert.ok(restored.origin);
 assert.equal(restored.land.filter(t=>t.building==='origin').length,0);
 assert.deepEqual([...restored.tiles].map(([id,t])=>[id,t.building]),data.tiles.map(([id,t])=>[id,t.building]));
});

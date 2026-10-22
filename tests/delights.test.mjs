import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {DELIGHTS} from '../src/delights.js';
import {describePlot} from '../src/inspection.js';

test('each island gets one of every small delight, in a fitting place, after its time',()=>{
 const s=new Civilization(31);while(!s.ending)s.tick();
 for(const d of DELIGHTS){
  const built=s.buildings.filter(t=>t.building===d.type);assert.equal(built.length,1,d.type);assert.ok(built[0].builtYear>=d.since,d.type);
  assert.ok(s.history.some(e=>e.text===d.opening),`${d.type} opening is logged`);assert.match(describePlot(s,built[0]),new RegExp(d.name));
 }
});
import {museumExhibits} from '../src/museum.js';
test('the museum collects finds, your visits and old maps as exhibits',()=>{
 const s=new Civilization(31);while(s.year<300)s.tick();s.interfere(3,3,'fire');while(s.year<1000)s.tick();
 const items=museumExhibits(s);assert.ok(items.some(i=>i.kind==='Jouw ingreep'&&/Grote Brand/.test(i.title)));assert.ok(items.some(i=>i.kind==='Oude kaart'));
 for(let i=1;i<items.length;i++)assert.ok(items[i].year>=items[i-1].year);
 assert.ok(s.buildings.some(t=>t.building==='museum'));
});
import {islandIdentity,flagSVG} from '../src/identity.js';
test('islands get a stable name and flag that follow their character',()=>{
 const a=new Civilization(31),b=new Civilization(31);assert.deepEqual(islandIdentity(a),islandIdentity(b));
 while(!a.character&&a.year<400)a.tick();const id=islandIdentity(a);assert.ok(id.name.length>3);assert.notEqual(id.kind,'none');
 assert.match(flagSVG(id),/^<svg[^>]*class="island-flag"/);
 const names=new Set([1,2,3,4,5,6,7,8].map(seed=>islandIdentity(new Civilization(seed)).name));assert.ok(names.size>=3);
});

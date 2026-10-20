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

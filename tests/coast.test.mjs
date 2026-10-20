import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {placeLighthouse,LIGHTHOUSE_YEAR} from '../src/coast.js';
import {describePlot} from '../src/inspection.js';

test('a lighthouse rises on an exposed point once the island has a harbour, and only one',()=>{
 const s=new Civilization(31);while(s.year<LIGHTHOUSE_YEAR-1)s.tick();assert.equal(s.land.filter(t=>t.building==='lighthouse').length,0);
 while(s.year<LIGHTHOUSE_YEAR+60)s.tick();
 const towers=s.land.filter(t=>t.building==='lighthouse');assert.equal(towers.length,1);
 const tower=towers[0];assert.ok(s.isCoast(tower));assert.ok(s.history.some(e=>e.type==='lighthouse'));assert.match(describePlot(s,tower),/Vuurtoren/);
 placeLighthouse(s);assert.equal(s.land.filter(t=>t.building==='lighthouse').length,1);
 const restored=Civilization.restore(s.serialize());assert.deepEqual(restored.coast,s.coast);
});
test('a lost lighthouse is rebuilt elsewhere along the coast',()=>{
 const s=new Civilization(31);while(!s.land.some(t=>t.building==='lighthouse')&&s.year<900)s.tick();
 const old=s.land.find(t=>t.building==='lighthouse');old.building=null;old.buildSite=null;old.reservedFor='test';
 const next=placeLighthouse(s);assert.ok(next);assert.notEqual(`${next.x},${next.y}`,`${old.x},${old.y}`);assert.match(s.history.at(-1).text,/opnieuw/);
});
test('more beaches appear over the centuries, far apart, on the real coast',()=>{
 const s=new Civilization(31);while(s.year<1300)s.tick();
 assert.ok(s.coast.beaches.length>=1,'at least one new beach');assert.ok(s.coast.beaches.length<=3);
 for(const b of s.coast.beaches){const t=s.tile(b.x,b.y);assert.equal(t.building,'beach');assert.ok(s.history.some(e=>e.type==='beach'&&e.text.startsWith(b.name)));}
 for(let i=0;i<s.coast.beaches.length;i++)for(let j=i+1;j<s.coast.beaches.length;j++){const a=s.coast.beaches[i],b=s.coast.beaches[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=6);}
 assert.ok(!s.land.some(t=>t.building==='beach'&&t.foundingHome));
});
import {findTreasure,TREASURE_CATALOG,coastNotice} from '../src/coast.js';
import {COLLECTION_CATALOG} from '../src/collection.js';
test('treasures are found once each, logged, remembered by the family and collected',()=>{
 const s=new Civilization(31);let found=null;
 for(let i=0;i<200&&!found;i++){s.year++;found=findTreasure(s,'rumble',s.tile(1,1));}
 assert.ok(found,'a tremor eventually uncovers something');const def=TREASURE_CATALOG.find(t=>t.id===found.id);
 assert.equal(s.tile(1,1).treasure.id,found.id);assert.ok(s.history.some(e=>e.type==='treasure'&&e.treasureId===found.id));
 const holder=s.family.generations.find(p=>p.id===s.family.currentId);assert.ok(holder.moments.some(m=>m.kind==='treasure'&&m.memory.startsWith(def.short)));
 assert.match(describePlot(s,s.tile(1,1)),new RegExp(def.short));
 for(let i=0;i<400;i++){s.year++;findTreasure(s,'rumble',s.tile(2,1));}
 const rumbleFinds=s.coast.treasures.filter(t=>TREASURE_CATALOG.find(c=>c.id===t.id).cause==='rumble');assert.equal(new Set(rumbleFinds.map(t=>t.id)).size,rumbleFinds.length);assert.ok(rumbleFinds.length<=2);
 assert.ok(COLLECTION_CATALOG.some(c=>c.id===`treasure:${found.id}`&&c.group==='treasures'));
 s.tick();assert.ok(Number.isInteger(s.collectionRecords[`treasure:${found.id}`]));
});
test('a deliberate tremor can uncover treasure without using island randomness',()=>{
 const a=new Civilization(31),b=new Civilization(31);
 for(let i=0;i<30;i++){a.tick();b.tick();}
 for(let i=0;i<12;i++){a.interfere(1+i%3,1,'rumble');b.interfere(1+i%3,1,'rumble');a.tick();b.tick();}
 assert.deepEqual(a.coast,b.coast);assert.equal(a.randomState,b.randomState);
});

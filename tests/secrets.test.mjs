import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {collectIsland,readCollection,SECRET_CATALOG} from '../src/collection.js';
import {describePlot} from '../src/inspection.js';

test('only three direct rain visits make the old tree bloom, with progress and discovery saved',()=>{
 let s=new Civilization(31);s.interfere(1,0,'rain');s.interfere(1,0,'rain');assert.equal(s.tile(0,0).treeRainCount,undefined);
 s.interfere(0,0,'rain');s.interfere(0,0,'rain');assert.equal(s.tile(0,0).bloomYear,undefined);
 s=Civilization.restore(s.serialize());s.year=20;s.interfere(0,0,'rain');assert.equal(s.tile(0,0).treeRainCount,3);assert.equal(s.tile(0,0).bloomYear,20);assert.ok(s.discoveries.includes('old-tree-bloom'));assert.equal(s.discoveryRecords['old-tree-bloom'].year,20);
 assert.match(describePlot(s,s.tile(0,0)),/tweede lente/);const book=readCollection(null);collectIsland(book,s);assert.deepEqual(book.entries['secret:old-tree-bloom'],{seed:31,year:20});
 s.interfere(0,0,'rain');assert.equal(s.history.filter(e=>e.discoveryId==='old-tree-bloom').length,1);assert.equal(s.tile(0,0).treeRainCount,3);assert.equal(Civilization.restore(s.serialize()).tile(0,0).bloomYear,20);
});
test('a quake by a real volcano erupts and joins the collection once',()=>{
 let s,volcano;for(let seed=1;seed<50;seed++){s=new Civilization(seed);volcano=s.land.find(t=>t.landform==='volcano');if(volcano)break;}
 assert.ok(volcano);s.interfere(volcano.x,volcano.y,'rumble');assert.ok(s.volcanoActiveUntil>s.year);assert.ok(s.discoveries.includes('quake-volcano'));assert.ok(s.land.some(t=>t.volcanicAshYear===s.year));
 const book=readCollection(null);collectIsland(book,s);assert.ok(book.entries['secret:quake-volcano']);assert.equal(collectIsland(book,s),false);assert.equal(s.history.filter(e=>e.discoveryId==='quake-volcano').length,1);
});
test('fire on an existing campfire during a nearby feast becomes a named yearly tradition',()=>{
 const s=new Civilization(31),spot=s.freeLand.find(t=>!t.reservedFor&&!t.landform);s.interfere(spot.x,spot.y,'fire');assert.equal(spot.building,'bonfire');assert.equal(spot.festivalTraditionYear,undefined);
 s.interfere(spot.x,spot.y,'fire');assert.equal(spot.festivalTraditionYear,s.year);assert.ok(s.discoveries.includes('fire-tradition'));assert.match(s.festival.title,/jaarlijkse lichtfeest/);assert.match(describePlot(s,spot),/vuur tijdens het feest/);
 const book=readCollection(null);collectIsland(book,s);assert.ok(book.entries['secret:fire-tradition']);const record=structuredClone(s.discoveryRecords['fire-tradition']);s.year+=2;s.interfere(spot.x,spot.y,'fire');assert.deepEqual(s.discoveryRecords['fire-tradition'],record);assert.equal(s.history.filter(e=>e.discoveryId==='fire-tradition').length,1);
});
test('the feast combination checks place and time before starting the next party',()=>{
 const s=new Civilization(31),spot=s.freeLand.find(t=>!t.reservedFor&&!t.landform);spot.building='campfire';s.festival={x:spot.x+6,y:spot.y,until:s.year+10};s.interfere(spot.x,spot.y,'fire');assert.equal(spot.festivalTraditionYear,undefined);
 const a=new Civilization(31),t=a.freeLand.find(t=>!t.reservedFor&&!t.landform);t.building='campfire';a.festival={x:t.x,y:t.y,until:a.year};a.interfere(t.x,t.y,'fire');assert.equal(t.festivalTraditionYear,undefined);
});
test('all earlier geological discoveries can be collected from an old save without replaying them',()=>{
 const s=new Civilization(31);s.year=300;s.discoveries=SECRET_CATALOG.filter(d=>d.discovery!=='old-tree-bloom').map(d=>d.discovery);s.tile(1,1).springYear=80;delete s.discoveryRecords;
 const old=JSON.parse(s.serialize());delete old.collectionRecords;const restored=Civilization.restore(JSON.stringify(old)),book=readCollection(null);collectIsland(book,restored);
 for(const id of s.discoveries)assert.ok(book.entries[`secret:${id}`],id);assert.equal(book.entries['secret:old-tree-bloom'],undefined);assert.equal(book.entries['secret:spring'].year,80);assert.deepEqual(restored.history,old.history);assert.equal(restored.randomState,old.randomState);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {finishStory,resumeSandbox} from '../src/story.js';
import {advanceCollection,collectIsland,readCollection,mergeCollections,COLLECTION_CATALOG} from '../src/collection.js';

test('collection milestones use actual evidence, stay silent and survive later demolition',()=>{
 const s=new Civilization(31),book=readCollection(null);assert.equal(collectIsland(book,s),false);
 s.year=120;s.tile(-1,1).building='manor';s.tile(-1,1).builtYear=120;s.rebuiltFires=1;s.tile(1,1).material='stone';s.tile(1,1).rebuiltYear=110;s.tile(2,1).floodMemorial=true;s.tile(2,1).rebuiltYear=100;
 const random=s.randomState,history=structuredClone(s.history),signals=structuredClone(s.signals),food=s.food;
 assert.equal(collectIsland(book,s),true);assert.deepEqual(book.entries['moment:manor'],{seed:31,year:120});assert.equal(book.entries['moment:rebirth'].year,110);assert.equal(book.entries['moment:waterfront'].year,100);
 assert.deepEqual(s.history,history);assert.deepEqual(s.signals,signals);assert.equal(s.randomState,random);assert.equal(s.food,food);
 s.tile(-1,1).building='ruins';s.rebuiltFires=0;delete s.tile(2,1).floodMemorial;
 const restored=Civilization.restore(s.serialize());assert.ok(restored.collectionRecords['moment:manor']);assert.equal(collectIsland(book,restored),false);assert.equal(Object.keys(book.entries).length,3);
});
test('all endings and only completed challenges join a collection across unrelated islands',()=>{
 const book=readCollection(null),s=new Civilization(31);finishStory(s,'independent');collectIsland(book,s);resumeSandbox(s);s.year=200;finishStory(s,'sanctuary');collectIsland(book,s);
 const b=new Civilization(8);b.challenges.goals=[{id:'library',status:'completed',completedAt:180},{id:'hands-off',status:'missed'},{id:'fresh-spring',status:'unavailable'}];collectIsland(book,b);
 assert.deepEqual(book.entries['ending:independent'],{seed:31,year:1});assert.deepEqual(book.entries['ending:sanctuary'],{seed:31,year:200});assert.deepEqual(book.entries['challenge:library'],{seed:8,year:180});assert.equal(book.entries['challenge:hands-off'],undefined);assert.equal(book.entries['challenge:fresh-spring'],undefined);
 const before=structuredClone(book);collectIsland(book,new Civilization(99));assert.deepEqual(book,before);
});
test('stored collection data is bounded, validated and mergeable without duplicate discoveries',()=>{
 for(const raw of [null,'not JSON','null','[]','{"version":2,"entries":{}}'])assert.deepEqual(readCollection(raw),{version:1,entries:{}});
 const book=readCollection(JSON.stringify({version:1,entries:{'moment:manor':{seed:31,year:120},'moment:palace':{seed:-1,year:1000},'ending:independent':{seed:8,year:null},'unknown:item':{seed:9,year:9}}}));assert.deepEqual(Object.keys(book.entries),['moment:manor']);
 const other=readCollection({version:1,entries:{'moment:manor':{seed:8,year:130},'moment:palace':{seed:12,year:1000}}});assert.equal(mergeCollections(book,other),true);assert.equal(book.entries['moment:manor'].seed,31);assert.equal(mergeCollections(book,other),false);assert.ok(Object.keys(book.entries).length<=COLLECTION_CATALOG.length);
});
test('old saves backfill verifiable moments without fabricated family history or world changes',()=>{
 const s=new Civilization(31);s.year=500;s.tile(-1,1).building='manor';s.tile(-1,1).builtYear=130;const old=JSON.parse(s.serialize());delete old.family;delete old.collectionRecords;
 const restored=Civilization.restore(JSON.stringify(old));assert.equal(restored.collectionRecords['moment:manor'],130);assert.equal(restored.collectionRecords['moment:generations'],undefined);assert.deepEqual(restored.history,old.history);assert.deepEqual([...restored.tiles],old.tiles);assert.equal(restored.randomState,old.randomState);
 advanceCollection(restored);assert.equal(restored.collectionRecords['moment:generations'],undefined);
});

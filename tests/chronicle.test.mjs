import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization,AGES} from '../src/simulation.js';
import {chronicleChapters,chroniclePlace,CHAPTER_ILLUSTRATIONS} from '../src/chronicle.js';

test('chronicle chapters use exact epoch boundaries, keep every entry once and sort within each chapter',()=>{
 const s=new Civilization(31);s.year=2100;s.history=[{id:'a',year:1250,type:'age'},{id:'b',year:1,type:'tree'},{id:'c',year:119,type:'life'},{id:'d',year:120,type:'family'},{id:'e',year:600,type:'age'},{id:'f',year:599,type:'life'},{id:'g',year:1250,type:'interference'},{id:'h',year:1920,type:'age'},{id:'i',year:2080,type:'age'}];
 const before=structuredClone(s.history),random=s.randomState,chapters=chronicleChapters(s);
 assert.equal(chapters.length,AGES.length);assert.deepEqual(chapters[0].entries.map(e=>e.id),['b','c']);assert.deepEqual(chapters[1].entries.map(e=>e.id),['d','f']);assert.deepEqual(chapters[2].entries.map(e=>e.id),['e']);assert.deepEqual(chapters[3].entries.map(e=>e.id),['a','g']);
 assert.equal(chapters.flatMap(c=>c.entries).length,s.history.length);assert.equal(chapters.filter(c=>c.current).length,1);assert.equal(chapters.at(-1).current,true);assert.deepEqual(s.history,before);assert.equal(s.randomState,random);
 for(const chapter of chapters){assert.ok(CHAPTER_ILLUSTRATIONS[chapter.id]);assert.doesNotMatch(chapter.title,/^The /);}
 const early=new Civilization(31);assert.equal(chronicleChapters(early).length,1,'future chapters are not shown before their time');
});
test('location links use saved coordinates or known family places without inventing locations for old news',()=>{
 const s=new Civilization(31);assert.equal(chroniclePlace(s,{type:'family'}),s.tile(-1,1));assert.equal(chroniclePlace(s,{type:'tree'}),s.tile(0,0));assert.equal(chroniclePlace(s,{type:'interference',x:1,y:-1}),s.tile(1,-1));
 assert.equal(chroniclePlace(s,{type:'interference'}),null);assert.equal(chroniclePlace(s,{type:'trade'}),null);assert.equal(chroniclePlace(s,{x:100,y:100}),null);
});
test('new interventions and construction openings retain a real place through saving',()=>{
 const s=new Civilization(31);s.interfere(1,-1,'rain');const touch=s.history.findLast(e=>e.type==='interference');assert.equal(touch.x,1);assert.equal(touch.y,-1);assert.ok(touch.interventionId);
 while(s.year<160)s.tick();const opening=s.history.find(e=>e.type==='technology'&&Number.isFinite(e.x));assert.ok(opening);assert.ok(chroniclePlace(s,opening));
 const restored=Civilization.restore(s.serialize());assert.deepEqual(chronicleChapters(restored),chronicleChapters(s));assert.ok(chroniclePlace(restored,touch));
});

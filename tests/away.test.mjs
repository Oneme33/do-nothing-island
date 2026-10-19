import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {returnFromAway,MAX_AWAY_YEARS} from '../src/away.js';

test('absence runs the real simulation at saved speed and reports actual family and flood changes',()=>{
 const s=new Civilization(31),expected=Civilization.restore(s.serialize());s.lastVisitAt=1000;const report=returnFromAway(s,121000);assert.ok(report&&report.years>100&&report.years<=300);
 while(expected.year<s.year)expected.tick();assert.equal(s.population,expected.population);assert.equal(s.randomState,expected.randomState);assert.deepEqual([...s.tiles],[...expected.tiles]);assert.deepEqual(s.family,expected.family);assert.equal(report.floods,s.storyStats.floods);assert.match(report.summary,/familiesleutel/);assert.ok(report.biggest.text);assert.equal(s.events.length,0);assert.equal(s.signals.length,0);
});
test('long absences are bounded, saved and cannot be processed twice',()=>{
 const s=new Civilization(31);s.lastVisitAt=1000;const r=returnFromAway(s,86401000);assert.equal(r.years,MAX_AWAY_YEARS);assert.equal(r.limited,true);const restored=Civilization.restore(s.serialize()),year=restored.year;
 assert.equal(returnFromAway(restored,86401000),null);assert.equal(restored.year,year);assert.deepEqual(restored.awayReport,r);
});
test('pause, short visits, old saves, disabled progress and backwards clocks never fast-forward',()=>{
 for(const configure of [s=>s.lastVisitPaused=true,s=>s.config.offlineProgress=false,s=>delete s.lastVisitAt,s=>s.lastVisitAt=200000]){
  const s=new Civilization(31);s.lastVisitAt=1000;configure(s);const random=s.randomState;assert.equal(returnFromAway(s,121000),null);assert.equal(s.year,1);assert.equal(s.randomState,random);
 }
 const s=new Civilization(31);s.lastVisitAt=1000;assert.equal(returnFromAway(s,59000),null);assert.equal(s.year,1);
});
test('an ending reached during absence is preserved without an automatic movie or recap',()=>{
 const s=new Civilization(31);while(s.year<2230)s.tick();s.lastVisitAt=1000;const r=returnFromAway(s,121000);assert.ok(s.ending);assert.ok(r.years<300);assert.equal(r.biggest.type,'ending');assert.equal(s.endingSeen,true);assert.equal(s.cinematic.completed,true);assert.ok(s.outcome.scores);
});

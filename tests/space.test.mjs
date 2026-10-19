import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';

test('new islands have substantially more connected natural land, one hut and room along the sea',()=>{
 for(const seed of [8,12,31,79,201]){
  const s=new Civilization(seed);assert.ok(s.originalArea>=340&&s.originalArea<=410,`${seed}: ${s.originalArea}`);assert.equal(s.geographyVersion,3);assert.equal(s.houses.length,1);assert.equal(s.land.some(t=>t.road),false);
  const reached=new Set(['0,0']),queue=[s.tile(0,0)];for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const t=s.tile(queue[i].x+dx,queue[i].y+dy),id=t&&`${t.x},${t.y}`;if(t?.kind==='land'&&!reached.has(id)){reached.add(id);queue.push(t);}}
  assert.equal(reached.size,s.originalArea);assert.equal([...s.tiles.values()].some(t=>t.natural&&(Math.abs(t.x)===12||Math.abs(t.y)===12)),false);assert.ok(s.config.maxTiles>s.originalArea);
 }
});
test('housing placement counts completed homes and planned neighbors while still allowing crowded fallback',()=>{
 const s=new Civilization(31),near=s.tile(0,1),apart=s.tile(3,0);near.building=null;apart.building=null;delete near.reservedFor;delete apart.reservedFor;
 assert.equal(s.choosePlot('hut',[near,apart]),apart);s.tile(-1,1).building=null;s.tile(-1,1).buildSite={type:'hut'};assert.equal(s.choosePlot('hut',[near,apart]),apart);
 assert.equal(s.choosePlot('hut',[near]),near,'a dense island can still grow when there is no alternative');
});
test('three centuries of real growth spread homes without sacrificing population or progression',()=>{
 const s=new Civilization(31);while(s.year<301)s.tick();const homes=s.houses;
 const touching=homes.reduce((n,t)=>n+homes.filter(p=>p!==t&&Math.max(Math.abs(p.x-t.x),Math.abs(p.y-t.y))<=1).length,0)/homes.length;
 assert.ok(homes.length>=30);assert.ok(touching<1,`${touching} immediate neighbors per home`);assert.ok(s.population>=100);assert.equal(s.tile(-1,1).building,'manor');assert.ok(s.routes.length>0);
});
test('legacy islands keep every existing plot, house and road when loading the larger-island update',()=>{
 const s=new Civilization(31);while(s.year<200)s.tick();const old=JSON.parse(s.serialize());delete old.geographyVersion;old.geography.radiusX=9;old.geography.radiusY=8;
 const restored=Civilization.restore(JSON.stringify(old));assert.ok(restored);assert.equal(restored.geographyVersion,2);assert.deepEqual([...restored.tiles],old.tiles);assert.equal(restored.originalArea,old.originalArea);assert.equal(restored.year,old.year);assert.equal(restored.population,old.population);assert.deepEqual(restored.history,old.history);
});

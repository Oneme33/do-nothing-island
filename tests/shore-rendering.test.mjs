import test from 'node:test';
import assert from 'node:assert/strict';
import {IslandRenderer,coastContours} from '../src/renderer.js';

function shoreHarness(tiles=[{x:0,y:0,kind:'land'}]){
  const calls=[],ctx={};
  for(const method of ['save','restore','beginPath','moveTo','lineTo','closePath','quadraticCurveTo','stroke','ellipse','fill','translate','scale']){
    ctx[method]=(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));calls.push({method,args,color:method==='fill'?ctx.fillStyle:undefined});};
  }
  const renderer=Object.assign(Object.create(IslandRenderer.prototype),{
    ctx,time:0,reduced:false,interacting:false,zoom:1,fitZoom:1,origin:{x:600,y:300},
    sim:{year:1,tile:(x,y)=>tiles.find(t=>t.x===x&&t.y===y)},
  });
  return {renderer,calls};
}
const land=(x,y)=>({x,y,kind:'land',building:'beach'});
const area=ring=>ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p.x*q.y-q.x*p.y;},0)/2;

test('the coastline encloses actual land, preserving bays, inland water and separate islands',()=>{
  const tiles=[];for(let x=0;x<3;x++)for(let y=0;y<3;y++)if(x!==1||y!==1)tiles.push(land(x,y));
  tiles.push(land(8,8));
  const rings=coastContours(tiles);
  assert.equal(rings.length,3,'outer coast, lake and separate island');
  assert.equal(rings.filter(r=>area(r)<0).length,1,'the lake cuts a hole in the land surface');
  assert.equal(rings.reduce((sum,r)=>sum+area(r),0),tiles.length*23*23*2);
  const diagonal=coastContours([land(0,0),land(1,1)]);
  assert.equal(diagonal.length,2,'diagonal corners never join two coasts');
  const bay=coastContours([land(0,0),land(1,0),land(0,1)]);
  assert.equal(bay.length,1);assert.equal(area(bay[0]),3*23*23*2);
});

test('the 3D coast uses static filled surfaces and refreshes when geography changes',()=>{
  const tiles=[land(0,0),land(1,0)],{renderer,calls}=shoreHarness(tiles);
  const original=structuredClone(tiles);
  const frame=time=>{calls.length=0;renderer.time=time;renderer.drawShore(tiles);return structuredClone(calls);};
  const first=frame(0),cache=renderer.shoreRings;
  assert.ok(first.filter(c=>c.method==='fill').length>=6,'filled depth, sand and raised ground');
  assert.ok(!first.some(c=>c.method==='stroke'),'no moving surf strokes');
  assert.deepEqual(frame(12),first);assert.equal(renderer.shoreRings,cache);
  renderer.reduced=true;renderer.interacting=true;assert.deepEqual(frame(24),first);
  assert.deepEqual(tiles,original,'rendering leaves the real geography intact');
  tiles[1].kind='flooded';frame(25);assert.notEqual(renderer.shoreRings,cache);
  const flooded=renderer.shoreRings;tiles[1].kind='land';frame(26);assert.notEqual(renderer.shoreRings,flooded);
});

test('cloud shadows track their clouds through drift, camera movement and zoom',()=>{
  const {renderer,calls}=shoreHarness();
  for(const time of [0,120,900]){
    renderer.time=time;renderer.origin={x:700-time,y:250+time};renderer.zoom=1.2;
    calls.length=0;renderer.drawCloudShadows();
    const shadows=calls.filter(c=>c.method==='translate').map(c=>c.args);
    const silhouette=calls.filter(c=>c.method==='ellipse').map(c=>c.args);
    calls.length=0;renderer.drawClouds();
    const clouds=calls.filter(c=>c.method==='translate').map(c=>c.args);
    assert.equal(shadows.length,4);
    assert.deepEqual(silhouette,calls.filter(c=>c.method==='ellipse').map(c=>c.args));
    for(let i=0;i<4;i++){
      assert.ok(Math.abs(shadows[i][0]-clouds[i][0]-45*renderer.zoom)<1e-9);
      assert.ok(Math.abs(shadows[i][1]-clouds[i][1]-115*renderer.zoom)<1e-9);
    }
  }
});

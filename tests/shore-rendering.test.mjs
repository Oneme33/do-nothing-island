import test from 'node:test';
import assert from 'node:assert/strict';
import {IslandRenderer} from '../src/renderer.js';

function shoreHarness(){
  const calls=[],ctx={};
  for(const method of ['save','restore','beginPath','moveTo','quadraticCurveTo','stroke','ellipse','fill','translate','scale']){
    ctx[method]=(...args)=>calls.push({method,args,color:method==='stroke'?ctx.strokeStyle:undefined});
  }
  const tile={x:0,y:0,kind:'land',natural:true};
  const adjacent=new Map(['0,-1','1,0','0,1','-1,0'].map(k=>[k,{kind:'land'}]));
  const renderer=Object.assign(Object.create(IslandRenderer.prototype),{
    ctx,time:0,reduced:false,interacting:false,zoom:1,fitZoom:1,origin:{x:600,y:300},
    sim:{year:1,tile:(x,y)=>adjacent.get(`${x},${y}`)},
  });
  return {renderer,tile,adjacent,calls};
}

test('surf follows exposed water edges, never inland plots or missing world tiles',()=>{
  const {renderer,tile,adjacent,calls}=shoreHarness();
  renderer.drawShore(tile);
  assert.equal(calls.filter(c=>c.method==='stroke').length,0);
  adjacent.delete('0,-1');renderer.drawShore(tile);
  assert.equal(calls.filter(c=>c.method==='stroke').length,0);
  adjacent.set('0,-1',{kind:'water'});renderer.drawShore(tile);
  assert.ok(calls.some(c=>c.method==='stroke'));
  assert.ok(!calls.some(c=>c.method==='ellipse'||c.method==='fill'),'no fake land blobs');
  const firstEdge=calls.filter(c=>c.method==='moveTo');
  assert.ok(firstEdge.every(c=>c.args[0]>=0&&c.args[1]<6),'surf stays on the exposed north-east edge');
  assert.deepEqual(tile,{x:0,y:0,kind:'land',natural:true});
});

test('surf moves gently, with a fixed waterline for reduced motion and mobile interaction',()=>{
  const {renderer,tile,adjacent,calls}=shoreHarness();adjacent.set('1,0',{kind:'water'});
  const frame=time=>{calls.length=0;renderer.time=time;renderer.drawShore(tile);return structuredClone(calls);};
  assert.notDeepEqual(frame(1),frame(3));
  renderer.reduced=true;assert.deepEqual(frame(1),frame(3));
  renderer.reduced=false;renderer.interacting=true;assert.deepEqual(frame(1),frame(3));
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

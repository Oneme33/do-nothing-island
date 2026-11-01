import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {IslandRenderer} from '../src/renderer.js';

const rendererFor=sim=>Object.assign(Object.create(IslandRenderer.prototype),{sim,activityTime:0,reduced:false});

test('population growth and reordered destinations never teleport residents midway through a trip',()=>{
  const sim=new Civilization(31),r=rendererFor(sim);
  const before=Array.from({length:6},(_,i)=>r.sampleWalker(i,0));
  assert.ok(before.some(p=>p&&Number.isFinite(p.x)));
  sim.population=30;
  sim.journeys=[...sim.journeys.slice(2),...sim.journeys.slice(0,2)];
  for(let i=0;i<6;i++){
    const after=r.sampleWalker(i,0);
    assert.deepEqual(after,before[i]);
    const next=r.sampleWalker(i,.01);
    if(Number.isFinite(after?.x)&&Number.isFinite(next?.x))assert.ok(Math.hypot(next.x-after.x,next.y-after.y)<1);
  }
});

test('residents refresh their path between trips and a new island clears old trips',()=>{
  const sim=new Civilization(31),r=rendererFor(sim);
  r.sampleWalker(0,0);const trip=r.walkerTrips.get(0);
  const a=sim.journeys[0].route[0],b=sim.journeys[0].route[1];
  sim.journeys=[{route:[a,b]}];
  r.sampleWalker(0,(trip.start+trip.cycle+.01)/.9);
  assert.deepEqual(r.walkerTrips.get(0).route,[a,b]);
  r.sim=new Civilization(42);r.sampleWalker(0,0);
  assert.notEqual(r.walkerTrips.get(0),trip);
  assert.equal(r.walkerSim,r.sim);
});

test('walker drawing uses continuous foot depth rather than snapping across buildings',()=>{
  const sim=new Civilization(31),r=rendererFor(sim),depths=[];
  r.drawTraffic=()=>{};r.drawBicycles=()=>{};r.enqueueActor=depth=>depths.push(depth);
  r.sampleWalker=()=>({x:10,y:7.25,alpha:1,stage:'walking'});
  r.drawWorkers();assert.equal(depths[0],10.25);
  r.sampleWalker=()=>({x:10,y:7.26,alpha:1,stage:'walking'});
  depths.length=0;r.drawWorkers();assert.equal(depths[0],10.26);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization,bridgeAxis} from '../src/simulation.js';
import {IslandRenderer} from '../src/renderer.js';

const tile=(x,y,kind='land',building=null)=>({x,y,kind,building,variant:.3,road:true,roadLinks:[],builtYear:1});
function renderer(tiles){
  const polygons=[],translations=[],ctx={save(){},restore(){},translate:(...args)=>translations.push(args)};
  const sim={tiles:new Map(tiles.map(t=>[`${t.x},${t.y}`,t])),seed:31,era:3,year:1980,power:0,tile(x,y){return this.tiles.get(`${x},${y}`);}};
  const r=Object.assign(Object.create(IslandRenderer.prototype),{sim,ctx,poly:points=>polygons.push(points),ellipse(){},line(){}});
  return {r,polygons,translations};
}

test('routes cross a sea bridge along its span and never turn off its side or treat it as a destination',()=>{
  const sim=new Civilization(31);sim.tiles=new Map();
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++){const t=tile(x,y,'water');sim.tiles.set(`${x},${y}`,t);}
  const home=sim.tile(-1,0);home.kind='land';home.building='hut';home.foundingHome=true;
  const destination=sim.tile(1,0);destination.kind='land';destination.building='workshop';
  const side=sim.tile(0,-1);side.kind='land';side.building='well';
  const bridge=sim.tile(0,0);bridge.building='bridge';
  sim.rebuildRoads();assert.equal(bridgeAxis(sim,bridge),'x');
  assert.deepEqual(new Set(bridge.roadLinks),new Set(['-1,0','1,0']));
  assert.equal(side.walkable,false,'a bank alongside the bridge has no exit through its railing');
  assert.ok(sim.routes.some(r=>r.join('|')==='-1,0|0,0|1,0'));
  assert.ok(sim.journeys.some(j=>j.route.includes('0,0')));
  assert.ok(sim.journeys.every(j=>j.to!=='0,0'));
});

test('sea bridge decks, pedestrians, cars and bicycles share the street centre and the same arch',()=>{
  for(const axis of ['x','y']){
    const a=tile(axis==='x'?-1:0,axis==='y'?-1:0),bridge=tile(0,0,'water','bridge'),b=tile(axis==='x'?1:0,axis==='y'?1:0);
    const {r,translations}=renderer([a,bridge,b]);a.roadLinks=['0,0'];
    let deck;r.deck=(...args)=>deck=args;r.bridge(bridge);
    assert.equal(deck[0],axis==='x');assert.equal(deck[1],1);
    assert.deepEqual(translations[0],[0,13.5]);
    for(const t of [0,.25,.5,.75,1]){
      const p=r.streetPosition(a,bridge,t),raw=r.streetPoint(a),end=r.streetPoint(bridge);
      assert.ok(Math.abs(p.y-(raw.y+(end.y-raw.y)*t-5*(1-(1-t)**2)))<1e-9);
      assert.deepEqual(r.walkingPosition(a,bridge,t),p);
    }
    assert.equal(r.streetPosition(a,bridge,1).y,-2+translations[0][1]-5);
  }
});

function inside(p,polygon){
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}

test('a river bridge sits at the real water crossing, replaces the road and lifts all road users',()=>{
  const a=tile(0,0),b=tile(1,0);a.roadLinks=['1,0'];b.roadLinks=['0,0'];
  const {r,polygons,translations}=renderer([a,b]);
  r.prepareRiverCrossings([{x:0,y:30},{x:23,y:-10}]);
  assert.equal(r.riverCrossings.size,1);const crossing=[...r.riverCrossings.values()][0];
  const raw=r.streetPoint(a),end=r.streetPoint(b);
  assert.ok(Math.abs(crossing.x-(raw.x+(end.x-raw.x)*crossing.t))<1e-9);
  assert.ok(Math.abs(crossing.y-(30-40*crossing.x/23))<1e-9);
  r.drawRoads([a,b]);assert.ok(polygons.length);
  assert.ok(!polygons.some(p=>inside(crossing,p)),'no road, kerb or junction lies across the water under the bridge');
  let deck;r.deck=(...args)=>deck=args;r.drawRiverBridges();
  assert.deepEqual(translations.at(-1),[crossing.x,crossing.y]);assert.equal(deck[0],true);
  assert.ok(Math.abs(r.streetPosition(a,b,crossing.t).y-(crossing.y-3))<1e-9);
  assert.ok(Math.abs(r.streetPosition(b,a,1-crossing.t).y-(crossing.y-3))<1e-9);
  const previous=r.riverCrossings;r.prepareRiverCrossings([{x:0,y:30},{x:23,y:-10}]);assert.equal(r.riverCrossings,previous);
  a.roadLinks=[];b.roadLinks=[];r.prepareRiverCrossings([{x:0,y:30},{x:23,y:-10}]);assert.equal(r.riverCrossings.size,0);
});

test('old saved road networks are rebuilt so bare water cannot keep a road',()=>{
  const sim=new Civilization(31),save=JSON.parse(sim.serialize());save.routeVersion=2;
  const water=save.tiles.find(([,t])=>t.kind==='water')[1];water.road=true;water.roadLinks=['0,0'];
  const restored=Civilization.restore(JSON.stringify(save));assert.ok(restored);
  assert.equal(restored.routeVersion,3);
  assert.ok([...restored.tiles.values()].every(t=>!t.road||t.kind==='land'||t.building==='bridge'));
});


test('a resident cannot keep walking over water after an active route loses its land or bridge',()=>{
  const sim=new Civilization(31),r=Object.assign(Object.create(IslandRenderer.prototype),{sim,reduced:false,activityTime:0});
  let index=0,p;
  for(;index<6;index++){p=r.sampleWalker(index,0);if(p?.a)break;}
  assert.ok(p?.a);p.a.kind='water';p.a.building=null;
  assert.equal(r.sampleWalker(index,0),null);
});

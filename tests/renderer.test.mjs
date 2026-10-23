import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { Civilization } from '../src/simulation.js';
import { IslandRenderer } from '../src/renderer.js';
import {startCinema} from '../src/spectacle.js';
import {ENDINGS} from '../src/story.js';

function canvasHarness(width=1200,height=575) {
  const calls=[];
  const methods=['setTransform','clearRect','fillRect','save','restore','translate','scale','rotate','beginPath','closePath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','ellipse','fill','stroke','fillText'];
  const context={createRadialGradient(...args){verify(args);return{addColorStop(){}};},measureText(text){return{width:text.length*5.5};}};
  function verify(args){for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),'canvas coordinates must be finite');}
  for(const name of methods)context[name]=(...args)=>{verify(args);calls.push(name);};
  return{canvas:{getContext:()=>context,getBoundingClientRect:()=>({width,height})},calls};
}
globalThis.matchMedia=()=>({matches:false});
globalThis.window={devicePixelRatio:2};
globalThis.ResizeObserver=class{observe(){} disconnect(){}};

test('all six endings draw safely throughout the scene on desktop and mobile',()=>{
 for(const width of [1200,390]){
  const sim=new Civilization(31),{canvas,calls}=canvasHarness(width,650),renderer=new IslandRenderer(canvas,sim);
  sim.ending=true;
  for(const id of Object.keys(ENDINGS)){
   startCinema(sim,id);sim.cinematic.cheers=3;
   for(const time of [0,5,11,19,24]){sim.cinematic.elapsed=time;renderer.draw(time*1000+100);}
  }
  assert.ok(calls.includes('fill'));assert.ok(calls.includes('ellipse'));
 }
});

test('renderer draws every era, completed projects and flooded districts at desktop and mobile sizes',()=>{
  for(const width of [1200,650,330]){
    const sim=new Civilization(31),{canvas,calls}=canvasHarness(width,width<500?490:575);
    const renderer=new IslandRenderer(canvas,sim);
    for(let year=0;year<2200;year++){
      sim.tick();
      if(year%30===0)renderer.draw(year*16+100);
    }
    sim.flood(sim.reclaimed,true);renderer.draw(16000);
    for(const mode of ['nudge','rain','rumble']){
      sim.interfere(-1,1,mode);for(const signal of sim.signals)renderer.addEffect(signal);
      for(let i=0;i<8;i++)renderer.draw(16100+i*16);
    }
    assert.ok(calls.includes('ellipse'));assert.ok(calls.includes('fill'));
    assert.ok(renderer.zoom>=.68);assert.ok(renderer.zoom<=1.55);
    assert.ok(sim.buildings.some(t=>t.building==='tower'));
    assert.equal(canvas.width,width*(width<700?1.5:2),'phones draw with a slightly lower pixel ratio');
  }
});
test('tile selection remains accurate through adaptive zoom, panning and recentering',()=>{
  const sim=new Civilization(42),{canvas}=canvasHarness(),renderer=new IslandRenderer(canvas,sim);
  for(let i=0;i<30;i++)renderer.draw(i*16+100);
  renderer.setZoom(1.8);renderer.pan={x:90,y:-20};
  for(let i=30;i<70;i++)renderer.draw(i*16+100);
  for(const [x,y]of [[0,0],[2,1],[-4,3],[9,-8]]){
    const screen=renderer.point(x,y);assert.deepEqual(renderer.screenToTile(screen.x,screen.y),{x,y});
  }
  renderer.recenter();assert.deepEqual(renderer.pan,{x:0,y:0});assert.equal(renderer.userZoom,1);
});
test('clicking a roof selects its home rather than an unrelated ground tile behind it',()=>{
  const {canvas}=canvasHarness(),renderer=new IslandRenderer(canvas,new Civilization(42));
  for(let i=0;i<30;i++)renderer.draw(i*16+100);
  const home=renderer.point(-1,1,17);
  assert.deepEqual(renderer.pick(home.x,home.y),{x:-1,y:1});
});
test('leisure destinations draw safely and the Ferris wheel stops without electricity or during a pause',()=>{
  const {canvas}=canvasHarness(330,490),sim=new Civilization(31),renderer=new IslandRenderer(canvas,sim);
  const places=['park','forest','beach','shop','bakery','cafe','playground','fairground'];
  for(const type of places){const tile=sim.freeLand[0];tile.building=type;}
  sim.rebuildRoads();sim.population=60;
  renderer.draw(100);assert.equal(renderer.wheelTime,0);
  sim.power=40;renderer.draw(200);assert.ok(renderer.wheelTime>0);
  const stopped=renderer.wheelTime;renderer.paused=true;renderer.draw(300);assert.equal(renderer.wheelTime,stopped);
  renderer.paused=false;sim.power=0;renderer.draw(400);assert.equal(renderer.wheelTime,stopped);
});
test('standalone distribution contains valid executable JavaScript and no module imports',async()=>{
  const html=await readFile('start.html','utf8');
  const script=html.match(/<script>\(\(\)=>\{([\s\S]*)\}\)\(\);<\/script>/)?.[1];
  assert.ok(script,'standalone script included');assert.doesNotMatch(script,/^import /m);
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(html,/Probeer niets aan te raken/);assert.match(html,/DO NOTHING/);
});
test('walkers stay on the drawn street geometry, approach entrances, and spend time inside',()=>{
  const {canvas}=canvasHarness(),sim=new Civilization(31);sim.planBuilding(sim.freeLand.filter(t=>!t.reservedFor).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0],'well');for(let i=0;i<5;i++)sim.advanceBuildings();sim.population=100;
  const renderer=new IslandRenderer(canvas,sim);
  const stages=new Set();
  for(let i=0;i<64;i++)for(let time=0;time<90;time+=.4){
    const sample=renderer.sampleWalker(i,time);if(!sample)continue;stages.add(sample.stage);
    if(sample.stage==='inside'){assert.equal(sample.x,undefined);continue;}
    assert.ok(Number.isFinite(sample.x)&&Number.isFinite(sample.y));
    if(sample.stage==='road'){
      const expected=renderer.streetPosition(sample.a,sample.b,sample.t,(Math.sin(i*127.1+9*311.7)*43758.5453-Math.floor(Math.sin(i*127.1+9*311.7)*43758.5453)-.5)*1.8);
      assert.ok(Math.hypot(sample.x-expected.x,sample.y-expected.y)<.001);
      for(const home of sim.houses){const center=renderer.p(home.x,home.y);assert.ok(!(Math.abs(sample.x-center.x)<10&&sample.y<center.y+2&&sample.y>center.y-5),'road does not cross a home footprint');}
    }
  }
  for(const stage of ['road','entering','inside','leaving'])assert.ok(stages.has(stage),stage);
});
test('the founding residents explore the back and sides without requiring roads or entering water',()=>{
 const sim=new Civilization(31),{canvas}=canvasHarness(),renderer=new IslandRenderer(canvas,sim);
 const quadrants=new Set(),stages=new Set();let back=false,front=false,left=false,right=false;
 for(let i=0;i<6;i++)for(let time=0;time<100;time+=.5){
  const p=renderer.sampleWalker(i,time);assert.ok(p);stages.add(p.stage);
  if(p.a){assert.equal(p.a.kind,'land');assert.equal(p.b.kind,'land');assert.ok(!p.a.landform&&!p.b.landform);}
  const t=p.target;quadrants.add(`${Math.sign(t.x)},${Math.sign(t.y)}`);
  if(t.x+t.y<-4)back=true;if(t.x+t.y>4)front=true;if(t.x-t.y<-4)left=true;if(t.x-t.y>4)right=true;
 }
 assert.equal(sim.routes.length,0);assert.ok(stages.has('walking'));assert.ok(stages.has('visiting'));
 assert.ok(back&&front&&left&&right,'visible residents travel to every side of the island');assert.ok(quadrants.size>=3);
});
test('neighboring road tiles do not acquire streets that were never planned',()=>{
 const sim=new Civilization(31),{canvas}=canvasHarness(),renderer=new IslandRenderer(canvas,sim);
 const tiles=[[3,0],[4,0],[3,1],[4,1]].map(([x,y])=>sim.tile(x,y));
 for(const t of tiles){t.road=true;t.roadLinks=[];t.building=null;}
 tiles[0].roadLinks=['4,0'];tiles[1].roadLinks=['3,0'];tiles[2].roadLinks=['4,1'];tiles[3].roadLinks=['3,1'];
 const segments=[];renderer.poly=points=>{if(points.some(a=>points.some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])>20)))segments.push(points);};
 renderer.drawRoads(tiles);assert.equal(segments.length,2,'draw the two planned roads without joining adjacent parcels');
 const midpoints=segments.map(points=>points.reduce((sum,p)=>({x:sum.x+p[0]/points.length,y:sum.y+p[1]/points.length}),{x:0,y:0}));
 assert.deepEqual(midpoints,[renderer.streetPosition(tiles[0],tiles[1],.5),renderer.streetPosition(tiles[2],tiles[3],.5)]);
});
test('floating labels are capped, bounded and separated, including an intervention with only a title',()=>{
 for(const width of [390,1200]){
  const sim=new Civilization(31),{canvas}=canvasHarness(width,600),r=new IslandRenderer(canvas,sim),labels=[];
  r.ctx.fillText=(text)=>{assert.notEqual(text,undefined);assert.notEqual(text,'undefined');labels.push(text);};
  for(let i=0;i<15;i++)r.addEffect({type:'fire',x:0,y:1,title:`Brand ${i}`,priority:i});
  for(let i=0;i<20;i++)r.draw(i*16+100);
  assert.ok(labels.some(t=>String(t).startsWith('Brand')));assert.ok(r.labelBoxes.length<=3);
  for(const [i,a]of r.labelBoxes.entries()){
   assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=width&&a.y+a.h<=600);
   for(const b of r.labelBoxes.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
  }
 }
});
test('actors behind a building are painted before it, and actors on its front street after it',()=>{
  const {canvas}=canvasHarness(),sim=new Civilization(31),renderer=new IslandRenderer(canvas,sim),order=[];
  renderer.drawBuilding=tile=>{if(tile.x===0&&tile.y===0)order.push('building');};
  renderer.drawWorkers=()=>{renderer.enqueueActor(-3,()=>order.push('behind'));renderer.enqueueActor(18,()=>order.push('front'));};
  renderer.drawVisitors=()=>{};renderer.draw(100);
  assert.ok(order.indexOf('behind')<order.indexOf('building'));assert.ok(order.indexOf('building')<order.indexOf('front'));
});
test('the larger palace, history overlays and reserved campus render with smooth, temporary focus',()=>{
 const sim=new Civilization(31);while(sim.year<1300)sim.tick();
 for(const width of [1200,390]){
  const {canvas,calls}=canvasHarness(width,width<500?600:650),renderer=new IslandRenderer(canvas,sim);
  renderer.reduced=width<500;renderer.showHistory=true;renderer.historySnapshot=sim.snapshots[0];renderer.focusTile(sim.tile(-1,1),.5);
  let previous=renderer.zoom;
  for(let i=0;i<70;i++){renderer.draw(100+i*16);assert.ok(Math.abs(renderer.zoom-previous)<.09,'camera never jumps');previous=renderer.zoom;}
  assert.equal(renderer.focus,null,'focus also expires with reduced motion');if(width>=700)assert.ok(calls.includes('fillText'),'landmark names on larger screens');assert.ok(calls.includes('stroke'));
 }
});
test('every open wish shows one clickable question mark at the requested place at either screen size',()=>{
 for(const width of [1200,390]){
  const s=new Civilization(31),{canvas}=canvasHarness(width,650),r=new IslandRenderer(canvas,s);s.wishes.active={x:1,y:-1,id:'test'};r.draw(100);
  const p=r.wishResidentPoint();assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.y),'visible outside Help mode too');assert.equal(r.pickWishResident(p.x,p.y),true);assert.equal(r.pickWishResident(p.x+100,p.y),false);
  r.mode='help';assert.doesNotThrow(()=>r.draw(200));
  s.wishes.active.hidden=true;assert.equal(r.wishResidentPoint(),null,'a dismissed wish hides its question mark');
  s.wishes.active=null;r.draw(300);assert.equal(r.pickWishResident(p.x,p.y),false);
 }
});
test('camera flights move smoothly through waypoints and release afterwards',()=>{
 const s=new Civilization(31),{canvas}=canvasHarness(1200,650),r=new IslandRenderer(canvas,s);r.draw(0);
 r.sweep(2);const start={...r.center};const xs=[];for(let t=16;t<=2400;t+=100){r.draw(t);xs.push(r.center.x);}
 assert.ok(xs.some(x=>Math.abs(x-start.x)>40),'the camera travels');assert.equal(r.flight,null,'a sweep releases the camera');
 r.flyTo([{x:100,y:50,zoom:1.7}],1);for(let t=2500;t<=3700;t+=100)r.draw(t);assert.ok(Math.abs(r.center.x-100)<1&&Math.abs(r.zoom-1.7)<.01);assert.ok(r.flight,'a tour stop holds its view');
});
test('a dive glides in close, holds, and then hands the camera back',()=>{
 const s=new Civilization(31),{canvas}=canvasHarness(1200,650),r=new IslandRenderer(canvas,s);r.draw(0);const before=r.zoom;
 r.dive(1,1,2);for(let t=16;t<=3200;t+=100)r.draw(t);assert.ok(r.zoom>before+.6,'close in');assert.ok(r.flight);
 for(let t=3300;t<=6000;t+=100)r.draw(t);assert.equal(r.flight,null,'released after the hold');
});

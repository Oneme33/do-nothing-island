import test from 'node:test';
import assert from 'node:assert/strict';
import { Civilization } from '../src/simulation.js';
import { IslandRenderer } from '../src/renderer.js';
import { daylightAt, seasonalLeaf, DAY_SECONDS, SEASON_DAYS } from '../src/daylight.js';

globalThis.matchMedia=()=>({matches:false});
globalThis.window={devicePixelRatio:2};
globalThis.ResizeObserver=class{observe(){} disconnect(){}};
function canvasHarness(){
 const fills=[],context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:text=>({width:text.length*5}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},{get:(t,k)=>k in t?t[k]:k==='fill'?()=>fills.push(t.fillStyle):()=>{},set:(t,k,v)=>{if(typeof v==='number')assert.ok(Number.isFinite(v));t[k]=v;return true;}});
 return{canvas:{getContext:()=>context,getBoundingClientRect:()=>({width:1200,height:575})},context,fills};
}
test('a day turns from midnight to noon and back; seasons follow each other softly',()=>{
 assert.ok(daylightAt(0).night);assert.equal(daylightAt(DAY_SECONDS*.5).darkness,0);assert.ok(daylightAt(DAY_SECONDS*.25).dusk>.6,'sunrise glows');
 const names=[0,1,2,3].map(i=>daylightAt((i+.5)*DAY_SECONDS*SEASON_DAYS).seasonName);assert.deepEqual(names,['lente','zomer','herfst','winter']);
 const middle=daylightAt(2.5*DAY_SECONDS*SEASON_DAYS);assert.equal(middle.autumn,1);assert.equal(middle.winter,0);
 const edge=daylightAt(3*DAY_SECONDS*SEASON_DAYS);assert.ok(edge.autumn>0&&edge.winter>0,'autumn fades into winter');
 const off=daylightAt(0,false);assert.equal(off.darkness,0);assert.equal(off.seasonName,'zomer');
});
test('leaves keep their colour in summer, turn warm in autumn and keep transparency',()=>{
 const summer=daylightAt(1.5*DAY_SECONDS*SEASON_DAYS),autumn=daylightAt(2.5*DAY_SECONDS*SEASON_DAYS);
 assert.equal(seasonalLeaf('#6f8752',summer),'#6f8752');
 const turned=seasonalLeaf('#6f8752',autumn);assert.notEqual(turned,'#6f8752');assert.ok(parseInt(turned.slice(1,3),16)>0x6f,'more red');
 assert.match(seasonalLeaf('#a7b97755',autumn),/^#[0-9a-f]{6}55$/);
});
test('the island draws safely by night and in winter, with lit windows, and never changes the simulation',()=>{
 const sim=new Civilization(31);while(sim.year<300)sim.tick();const before=sim.serialize();
 const {canvas,fills}=canvasHarness(),renderer=new IslandRenderer(canvas,sim);
 renderer.dayClock=3.5*DAY_SECONDS*SEASON_DAYS+DAY_SECONDS*.02;renderer.draw(16);
 assert.ok(renderer.light.night);assert.equal(renderer.light.seasonName,'winter');
 assert.ok(fills.some(f=>/^rgba\(255,214,130,/.test(f)),'real windows light up at night');assert.ok(renderer.litWindows.length>0);assert.ok(fills.some(f=>/^rgba\(244,246,247,/.test(f)),'snow lies on the ground');
 renderer.dayNight=false;fills.length=0;renderer.draw(32);assert.equal(renderer.light.darkness,0);assert.ok(!fills.some(f=>/^rgba\(255,214,130,/.test(f)));assert.equal(renderer.litWindows.length,0);
 assert.equal(sim.serialize(),before);
});
import {randomDaylightStart} from '../src/daylight.js';
test('a visit starts on a morning in any of the four seasons',()=>{
 const seasons=[0,.3,.6,.99].map(roll=>daylightAt(randomDaylightStart(roll)));
 assert.deepEqual(seasons.map(l=>l.seasonName),['lente','zomer','herfst','winter']);
 for(const l of seasons){assert.equal(l.darkness,0);assert.ok(l.phase>.3&&l.phase<.35);}
});
import {lightHidden} from '../src/daylight.js';
test('a window behind a house in front of it stays dark',()=>{
 const s=new Civilization(31),back=s.tile(4,-4),front=s.tile(5,-3);
 back.building='house';front.building=null;front.landform=null;front.buildSite=null;assert.equal(lightHidden(s,back),false);
 front.building='house';assert.equal(lightHidden(s,back),true);
 front.building='farm';assert.equal(lightHidden(s,back),false,'a field in front hides nothing');
});
test('seasonal customs and night life draw safely in every season and at night',()=>{
 const s=new Civilization(31);while(s.year<400)s.tick();const before=s.serialize();
 for(const season of [0,1,2,3])for(const phase of [.02,.5]){const {canvas}=canvasHarness(),r=new IslandRenderer(canvas,s);r.dayClock=(season*SEASON_DAYS+phase)*DAY_SECONDS;r.time=30;assert.doesNotThrow(()=>r.draw(16));}
 assert.equal(s.serialize(),before);
});

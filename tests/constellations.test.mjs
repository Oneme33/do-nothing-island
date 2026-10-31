import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {IslandRenderer} from '../src/renderer.js';
import {constellationsFor} from '../src/constellations.js';
import {DAY_SECONDS,SEASON_DAYS} from '../src/daylight.js';

test('the night sky stays quiet until the visitor has intervened often',()=>{
 const s=new Civilization(31);
 assert.deepEqual(constellationsFor(s),[]);
 s.interferences=7;assert.deepEqual(constellationsFor(s),[]);
 s.interferences=8;s.influence={fire:0,rain:0,nudge:5,rumble:0,rescues:0};
 assert.deepEqual(constellationsFor(s).map(c=>c.name),['De Grote Hand']);
});

test('the dominant intervention names the first constellation and the old place joins later',()=>{
 const s=new Civilization(31);
 s.interferences=18;s.influence={fire:9,rain:1,nudge:2,rumble:0,rescues:0};
 assert.deepEqual(constellationsFor(s).map(c=>c.name),['De Brandende Emmer','De Steencirkel']);
 s.influence={fire:0,rain:0,nudge:0,rumble:0,rescues:7};
 assert.deepEqual(constellationsFor(s).map(c=>c.name),['De Helpende Hand','De Steencirkel']);
});

test('constellations draw safely over a real night island without changing it',()=>{
 globalThis.matchMedia=()=>({matches:false});globalThis.window={devicePixelRatio:2};globalThis.ResizeObserver=class{observe(){}};
 const s=new Civilization(31);while(s.year<260)s.tick();s.interferences=20;s.influence={fire:9,rain:2,nudge:3,rumble:1,rescues:2};const before=s.serialize();
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:text=>({width:text.length*5}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>{if(typeof v==='number')assert.ok(Number.isFinite(v));t[k]=v;return true;}});
 const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:1200,height:575})},r=new IslandRenderer(canvas,s);
 r.dayClock=3.5*SEASON_DAYS*DAY_SECONDS+DAY_SECONDS*.02;r.time=30;assert.doesNotThrow(()=>r.draw(16));
 assert.equal(s.serialize(),before);
});

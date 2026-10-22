import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {advanceWeather,WEATHER} from '../src/weather.js';
import {IslandRenderer} from '../src/renderer.js';
globalThis.matchMedia=()=>({matches:false});globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:t=>({width:t.length*5}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},{get:(t,k)=>k in t?t[k]:(...a)=>{for(const v of a)if(typeof v==='number')assert.ok(Number.isFinite(v));},set:(t,k,v)=>(t[k]=v,true)});
test('weather comes and goes, has consequences and never uses island randomness',()=>{
 const s=new Civilization(31);const kinds=new Set();while(s.year<1500){s.tick();if(s.weather)kinds.add(s.weather.kind);}
 assert.ok(kinds.size>=4,`varied weather: ${[...kinds]}`);
 const a=new Civilization(31),b=new Civilization(31);for(let i=0;i<400;i++){a.tick();b.tick();}assert.deepEqual(a.weather,b.weather);assert.equal(a.randomState,b.randomState);
});
test('a drought costs water, a shower feeds the fields, thunder can set something alight',()=>{
 const d=new Civilization(31);while(d.year<200)d.tick();d.weather={kind:'drought',since:d.year,until:d.year+3};const water=d.freshwater;advanceWeather(d);assert.ok(d.freshwater<water);
 const r=new Civilization(31);while(r.year<200)r.tick();r.weather={kind:'shower',since:r.year,until:r.year+1};const food=r.food;advanceWeather(r);assert.ok(r.food>food);assert.ok(r.farms.every(f=>f.wetUntil>=r.year));
 const t=new Civilization(31);while(t.year<300)t.tick();t.weather=null;t.nextWeather=t.year;let fires=0;for(let i=0;i<300&&!fires;i++){t.year++;t.weather=null;t.nextWeather=t.year;advanceWeather(t);if(t.weather.kind==='thunder'&&t.land.some(x=>x.fire))fires++;}
 assert.ok(fires>0,'lightning eventually starts a fire before lightning rods');
 for(const kind of Object.keys(WEATHER)){t.weather={kind,since:t.year,until:t.year+1,strike:{x:1,y:1}};const r2=new IslandRenderer({getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:500})},t);for(let i=0;i<5;i++)assert.doesNotThrow(()=>r2.draw(i*300));}
});

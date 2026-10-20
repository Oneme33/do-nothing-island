import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {IslandRenderer} from '../src/renderer.js';
import {DAY_SECONDS} from '../src/daylight.js';

globalThis.matchMedia=()=>({matches:false});
globalThis.window={devicePixelRatio:2};
globalThis.ResizeObserver=class{observe(){} disconnect(){}};
function harness(){
 const translations=[],context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:t=>({width:t.length*5})},{get:(t,k)=>k in t?t[k]:k==='translate'?(x,y)=>{assert.ok(Number.isFinite(x)&&Number.isFinite(y));translations.push([x,y]);}:(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`${String(k)} gets finite numbers`);},set:(t,k,v)=>{t[k]=v;return true;}});
 return{canvas:{getContext:()=>context,getBoundingClientRect:()=>({width:1200,height:575})},translations};
}
test('fishing boats, gulls, fish and the occasional whale draw safely by day, night and with reduced motion',()=>{
 const s=new Civilization(31);while(s.year<700)s.tick();assert.ok([...s.tiles.values()].some(t=>t.building==='dock'||t.building==='harbor'));
 const before=s.serialize();
 for(const reduced of [false,true])for(const phase of [.1,.3,.5,.7,.9]){
  const {canvas}=harness(),r=new IslandRenderer(canvas,s);r.reduced=reduced;r.dayClock=DAY_SECONDS*(4+phase);r.time=37+phase*80;
  assert.doesNotThrow(()=>r.draw(16));
 }
 assert.equal(s.serialize(),before,'the sea is only drawn');
});

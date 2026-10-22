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
test('intervention effects and a bucket brigade draw safely and never change the island',()=>{
 const s=new Civilization(31);while(s.year<200)s.tick();s.farms[0].fire={started:s.year,until:s.year+9};const before=s.serialize();
 const {canvas}=harness(),r=new IslandRenderer(canvas,s);
 for(const type of ['rumble','rain','fire','nudge'])r.addEffect({type,x:2,y:2,title:type});
 for(let i=0;i<40;i++)assert.doesNotThrow(()=>r.draw(i*100));
 r.reduced=true;assert.doesNotThrow(()=>r.draw(5000));assert.equal(s.serialize(),before);
});
test('vehicles follow history from handcarts to modern cars',()=>{
 const s=new Civilization(31);const kinds=[];for(const y of [100,800,1800,1920,2000]){s.year=y;kinds.push(s.vehicleKind);}
 assert.deepEqual(kinds,['handcart','horse','coach','oldtimer','car']);
 const t=new Civilization(31);while(t.year<1890)t.tick();assert.equal(t.carCount,0,'no cars before 1900');
 for(const y of [300,1000,1800,1930,2050]){t.year=y;const {canvas}=harness(),r=new IslandRenderer(canvas,t);assert.doesNotThrow(()=>r.draw(16));}
});

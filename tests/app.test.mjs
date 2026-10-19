import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Civilization} from '../src/simulation.js';
import {nl} from '../src/language.js';
async function appHarness(initial,{firstVisit=false}={}){
 const html=await readFile('start.html','utf8'),elements=new Map(),storage=new Map();
 class Element{
  constructor(){this.hidden=false;this.open=false;this.style={};this.dataset={};this.handlers={};this.children=[];this.classList={toggle(){},add(){},remove(){}};}
  addEventListener(type,handler){this.handlers[type]=handler;}
  setAttribute(){}setPointerCapture(){}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}
  querySelector(){return new Element();}matches(){return false;}close(){const wasOpen=this.open;this.open=false;if(wasOpen)this.handlers.close?.();}showModal(){this.open=true;}
  getBoundingClientRect(){return{width:1200,height:575,left:0,top:0};}
 }
 for(const match of html.split('<script>')[0].matchAll(/id="([^"]+)"/g)){const element=new Element();element.id=match[1];elements.set(match[1],element);}
 const speeds=[1,2,3,10].map(value=>{const e=new Element();e.dataset.speed=String(value);return e;});
 const modes=['inspect','nudge','rain','rumble','fire'].map(value=>{const e=new Element();e.dataset.interference=value;return e;});
 const dialogs=[...elements].filter(([id])=>id.endsWith('-dialog')).map(([,e])=>e),live=new Element();
 const document={hidden:false,activeElement:null,body:new Element(),getElementById:id=>elements.get(id),createElement:()=>new Element(),addEventListener(){},querySelector:s=>s==='.live-status'?live:dialogs.find(d=>d.open)||null,querySelectorAll:s=>s==='[data-speed]'?speeds:s==='[data-interference]'?modes:s==='dialog'?dialogs:s==='dialog[open]'?dialogs.filter(d=>d.open):[]};
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:text=>({width:text.length*5})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 elements.get('island').getContext=()=>context;elements.get('finale-canvas').getContext=()=>context;storage.set('do-nothing-island-v1',initial.serialize());if(!firstVisit)storage.set('do-nothing-island-intro-v1','done');
 let nextFrame,now=0;const seeds=[8,12],window={devicePixelRatio:1,addEventListener(){}};
 const runtime=vm.createContext({document,window,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>now},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>nextFrame=fn,setTimeout:()=>1,clearTimeout(){},crypto:{getRandomValues:a=>{a[0]=seeds.shift();return a;}}});
 vm.runInContext(html.match(/<script>([\s\S]*)<\/script>/)[1],runtime);
 return{elements,modes,frame:time=>{now=time;nextFrame(now);},advance:seconds=>{for(let end=now+seconds*1000;now<end;){now+=100;nextFrame(now);}},saved:()=>JSON.parse(storage.get('do-nothing-island-v1'))};
}
test('the delivered game starts, creates fresh islands immediately and can undo a reset',async()=>{
 const old=new Civilization(31);for(let i=0;i<40;i++)old.tick();const a=await appHarness(old),e=a.elements;
 assert.equal(e.get('year').textContent,41);e.get('new-island').handlers.click();
 assert.equal(a.saved().seed,8);assert.equal(a.saved().year,1);assert.equal(e.get('undo-reset').hidden,false);assert.doesNotThrow(()=>a.frame(16));
 assert.equal(a.saved().tiles.filter(([,t])=>t.building==='hut').length,1);assert.equal(a.saved().tiles.some(([,t])=>t.road),false);
 e.get('new-island').handlers.click();assert.equal(a.saved().seed,12);e.get('undo-reset').handlers.click();assert.equal(a.saved().seed,8);assert.equal(e.get('undo-reset').hidden,true);
});
test('Observe lets a player inspect without interference; deliberately choosing rain changes the world',async()=>{
 const a=await appHarness(new Civilization(31)),e=a.elements,c=e.get('island');a.frame(16);
 assert.equal(c.dataset.mode,'nudge');a.modes.find(b=>b.dataset.interference==='inspect').handlers.click();
 const tap=()=>{c.handlers.pointerdown({button:0,clientX:600,clientY:300,pointerId:1});c.handlers.pointerup({clientX:600,clientY:300,pointerId:1});};
 tap();assert.equal(a.saved().interferences,0);
 a.modes.find(b=>b.dataset.interference==='inspect').handlers.click();e.get('find-palace').handlers.click();assert.match(e.get('tile-inspector').textContent,/allereerste huis/);assert.match(e.get('tile-inspector').textContent,/familie/);
 a.modes.find(b=>b.dataset.interference==='rain').handlers.click();tap();assert.equal(a.saved().interferences,1);assert.equal(a.saved().influence.rain,1);assert.equal(e.get('intervention-result').hidden,false);
 e.get('history-layer').handlers.change({target:{checked:true}});assert.equal(e.get('history-snapshot').hidden,false);assert.equal(e.get('history-legend').hidden,false);
 assert.ok(e.get('history-snapshot').children.length>0);
});
test('the actual application shows a contextual recap, then permits explicit free play',async()=>{
 const sim=new Civilization(201);while(!sim.ending)sim.tick();const a=await appHarness(sim),e=a.elements;
 assert.equal(e.get('ending-dialog').open,false);assert.equal(e.get('cinema-caption').hidden,false);
 e.get('cinema-cheer').handlers.click();assert.match(e.get('cinema-cheer').textContent,/1/);
 a.advance(9);assert.equal(e.get('cinema-skip').hidden,false);e.get('cinema-skip').handlers.click();
 assert.equal(e.get('ending-dialog').open,true);assert.equal(e.get('ending-title').textContent,nl(sim.outcome.title));assert.match(e.get('ending-before').innerHTML,/<rect/);assert.match(e.get('ending-after').innerHTML,/<rect/);
 assert.match(e.get('ending-causes').textContent,/Jij keek toe/);assert.equal(e.get('score-breakdown').children.length,5);const stats=e.get('ending-stats').textContent,score=e.get('ending-score').textContent;
 e.get('ending-replay').handlers.click();assert.equal(e.get('ending-dialog').open,false);assert.equal(a.saved().cinematic.elapsed,0);
 a.advance(25);assert.equal(e.get('ending-dialog').open,true);assert.equal(a.saved().cinematic.completed,true);
 e.get('ending-sandbox').handlers.click();assert.equal(e.get('ending-dialog').open,false);assert.equal(a.saved().sandbox,true);
 a.advance(2);assert.ok(e.get('year').textContent>sim.year);
 e.get('open-ending').handlers.click();assert.equal(e.get('ending-dialog').open,true);assert.equal(e.get('ending-stats').textContent,stats,'recap keeps the original ending rather than the free-play world');
 assert.equal(e.get('ending-score').textContent,score,'scores stay frozen after free play');
});
test('first visit has three quiet intro screens and begins at 1x only when finished',async()=>{
 const sim=new Civilization(31);sim.config.speedMultiplier=10;const a=await appHarness(sim,{firstVisit:true}),e=a.elements;
 assert.equal(e.get('intro-dialog').open,true);assert.match(e.get('intro-title').textContent,/Dit is jouw eiland/);a.advance(15);assert.equal(e.get('year').textContent,1);
 e.get('intro-next').handlers.click();assert.match(e.get('intro-title').textContent,/redden zich/);e.get('intro-next').handlers.click();assert.match(e.get('intro-title').textContent,/aan te raken/);
 e.get('intro-next').handlers.click();assert.equal(e.get('intro-dialog').open,false);assert.equal(a.saved().config.speedMultiplier,1);a.advance(2);assert.ok(e.get('year').textContent>1);
});
test('the logbook and settings stop simulation time without changing the chosen speed',async()=>{
 const sim=new Civilization(31);sim.config.speedMultiplier=3;const a=await appHarness(sim),e=a.elements;
 e.get('canvas-journal').handlers.click();a.advance(20);assert.equal(e.get('year').textContent,1);e.get('journal-dialog').close();a.advance(1);assert.ok(e.get('year').textContent>1);
 const year=e.get('year').textContent;e.get('settings').handlers.click();a.advance(20);assert.equal(e.get('year').textContent,year);e.get('settings-dialog').close();a.advance(1);assert.ok(e.get('year').textContent>year);
});
test('population remarks update before their normal hold when six residents become eight',async()=>{
 const sim=new Civilization(31);sim.population=8;const a=await appHarness(sim);assert.doesNotMatch(a.elements.get('population-note').textContent,/Zes|Six/);assert.match(a.elements.get('population-note').textContent,/8/);
});
test('an unfinished reclamation card is hidden after the ending',async()=>{
 const sim=new Civilization(31);while(!sim.ending)sim.tick();sim.project={stage:2,elapsed:5,tiles:[],manual:false};
 const a=await appHarness(sim);assert.equal(a.elements.get('project-overlay').hidden,true);
 a.advance(25);assert.equal(a.elements.get('project-overlay').hidden,true);assert.equal(a.elements.get('cinema-dialog').open,false);assert.equal(a.elements.get('ending-dialog').open,true);
});
test('a saved ending resumes its scene, while a completed recap stays completed on reload',async()=>{
 const sim=new Civilization(31);while(!sim.ending)sim.tick();sim.cinematic.elapsed=12;sim.cinematic.cheers=2;
 const a=await appHarness(sim);assert.equal(a.elements.get('cinema-caption').hidden,false);a.advance(13);
 assert.equal(a.elements.get('ending-dialog').open,true);assert.equal(a.saved().cinematic.cheers,2);
 const b=await appHarness(Civilization.restore(JSON.stringify(a.saved())));
 assert.equal(b.elements.get('cinema-caption').hidden,true);assert.equal(b.elements.get('ending-dialog').open,false);
 b.elements.get('open-ending').handlers.click();assert.equal(b.elements.get('ending-dialog').open,true);
});

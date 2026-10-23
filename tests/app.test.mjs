import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Civilization} from '../src/simulation.js';
import {nl} from '../src/language.js';
async function appHarness(initial,{firstVisit=false,persistentStorage=null,rejectCollectionWrites=false}={}){
 const html=await readFile('start.html','utf8'),elements=new Map(),storage=persistentStorage||new Map();
 class Element{
  constructor(){this.hidden=false;this.open=false;this.style={};this.dataset={};this.handlers={};this.children=[];this.classList={toggle(){},add(){},remove(){}};}
  addEventListener(type,handler){this.handlers[type]=handler;}
  scrollIntoView(options){this.scrolled=options;}
  setAttribute(){}setPointerCapture(){}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}
  querySelector(){return new Element();}matches(){return false;}close(){const wasOpen=this.open;this.open=false;if(wasOpen)this.handlers.close?.();}showModal(){this.open=true;}
  getBoundingClientRect(){return{width:1200,height:575,left:0,top:0};}
 }
 for(const match of html.split('<script>')[0].matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){const element=new Element();element.id=match[1];element.hidden=/\shidden(?:\s|>)/.test(match[0]);elements.set(match[1],element);}
 const speeds=[1,2,3,10].map(value=>{const e=new Element();e.dataset.speed=String(value);return e;});
 const modes=['help','nudge','rain','rumble','fire'].map(value=>{const e=new Element();e.dataset.interference=value;return e;});
 const dialogs=[...elements].filter(([id])=>id.endsWith('-dialog')).map(([,e])=>e),live=new Element();
 const document={hidden:false,activeElement:null,body:new Element(),getElementById:id=>elements.get(id),createElement:()=>new Element(),addEventListener(){},querySelector:s=>s==='.live-status'?live:dialogs.find(d=>d.open)||null,querySelectorAll:s=>s==='[data-speed]'?speeds:s==='[data-interference]'?modes:s==='dialog'?dialogs:s==='dialog[open]'?dialogs.filter(d=>d.open):[]};
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:text=>({width:text.length*5})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 elements.get('island').getContext=()=>context;elements.get('finale-canvas').getContext=()=>context;storage.set('do-nothing-island-v1',initial.serialize());if(!firstVisit)storage.set('do-nothing-island-intro-v1','done');
 let nextFrame,now=0;const seeds=[8,12],window={devicePixelRatio:1,addEventListener(){}};
 const runtime=vm.createContext({document,window,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(rejectCollectionWrites&&k==='do-nothing-island-collection-v1')throw new Error('Collection storage denied');storage.set(k,v);}},performance:{now:()=>now},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>nextFrame=fn,setTimeout:()=>1,clearTimeout(){},crypto:{getRandomValues:a=>{a[0]=seeds.shift();return a;}}});
 vm.runInContext(html.match(/<script>([\s\S]*)<\/script>/)[1],runtime);
 return{elements,modes,storage,collection:()=>JSON.parse(storage.get('do-nothing-island-collection-v1')||'{"version":1,"entries":{}}'),frame:time=>{now=time;nextFrame(now);},advance:seconds=>{for(let end=now+seconds*1000;now<end;){now+=100;nextFrame(now);}},saved:()=>JSON.parse(storage.get('do-nothing-island-v1'))};
}
test('the delivered game starts, creates fresh islands immediately and can undo a reset',async()=>{
 const old=new Civilization(31);for(let i=0;i<40;i++)old.tick();const a=await appHarness(old),e=a.elements;
 assert.equal(e.get('year').textContent,41);e.get('new-island').handlers.click();
 assert.equal(a.saved().seed,8);assert.equal(a.saved().year,1);assert.equal(e.get('undo-reset').hidden,false);assert.doesNotThrow(()=>a.frame(16));
 assert.equal(a.saved().tiles.filter(([,t])=>t.building==='hut').length,1);assert.equal(a.saved().tiles.some(([,t])=>t.road),false);
 e.get('new-island').handlers.click();assert.equal(a.saved().seed,12);e.get('undo-reset').handlers.click();assert.equal(a.saved().seed,8);assert.equal(e.get('undo-reset').hidden,true);
});
test('Help allows looking around without interference; deliberately choosing rain changes the world',async()=>{
 const a=await appHarness(new Civilization(31)),e=a.elements,c=e.get('island');a.frame(16);
 assert.equal(c.dataset.mode,'nudge');a.modes.find(b=>b.dataset.interference==='help').handlers.click();
 const tap=()=>{c.handlers.pointerdown({button:0,clientX:600,clientY:300,pointerId:1});c.handlers.pointerup({clientX:600,clientY:300,pointerId:1});};
 tap();assert.equal(a.saved().interferences,0);
 e.get('find-palace').handlers.click();assert.match(e.get('tile-inspector').textContent,/allereerste huis/);assert.match(e.get('tile-inspector').textContent,/familie/);
 a.modes.find(b=>b.dataset.interference==='rain').handlers.click();tap();assert.equal(a.saved().interferences,1);assert.equal(a.saved().influence.rain,1);a.modes.find(b=>b.dataset.interference==='rain').handlers.click();assert.equal(c.dataset.mode,'look','clicking the active tool again puts it away');tap();assert.equal(a.saved().interferences,1,'just looking changes nothing');a.modes.find(b=>b.dataset.interference==='rain').handlers.click();assert.equal(e.get('intervention-result').hidden,true);assert.ok(e.get('toast-text').textContent);
 e.get('history-layer').handlers.change({target:{checked:true}});assert.equal(e.get('history-snapshot').hidden,false);assert.equal(e.get('history-legend').hidden,false);
 assert.ok(e.get('history-snapshot').children.length>0);
});
test('the actual application shows a contextual recap, then permits explicit free play',async()=>{
 const sim=new Civilization(201);while(!sim.ending)sim.tick();sim.cinematic.toured=true;const a=await appHarness(sim),e=a.elements;
 assert.equal(e.get('ending-dialog').open,false);assert.equal(e.get('cinema-caption').hidden,false);
 e.get('cinema-cheer').handlers.click();assert.match(e.get('cinema-cheer').textContent,/1/);
 a.advance(9);assert.equal(e.get('cinema-skip').hidden,false);e.get('cinema-skip').handlers.click();
 assert.equal(e.get('ending-dialog').open,true);assert.equal(e.get('ending-title').textContent,nl(sim.outcome.title));assert.match(e.get('ending-before').innerHTML,/<rect/);assert.match(e.get('ending-after').innerHTML,/<rect/);
 assert.match(e.get('ending-causes').textContent,/Jij keek toe/);assert.equal(e.get('score-breakdown').children.length,6);const stats=e.get('ending-stats').textContent,score=e.get('ending-score').textContent;
 e.get('ending-replay').handlers.click();assert.equal(e.get('ending-dialog').open,false);assert.equal(a.saved().cinematic.elapsed,0);
 a.advance(41);assert.equal(e.get('ending-dialog').open,true);assert.equal(a.saved().cinematic.completed,true);
 e.get('ending-sandbox').handlers.click();assert.equal(e.get('ending-dialog').open,false);assert.equal(a.saved().sandbox,true);
 a.advance(5);assert.ok(e.get('year').textContent>sim.year);
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
 e.get('canvas-journal').handlers.click();a.advance(20);assert.equal(e.get('year').textContent,1);e.get('book-dialog').close();a.advance(1);assert.ok(e.get('year').textContent>1);
 const year=e.get('year').textContent;e.get('settings').handlers.click();a.advance(20);assert.equal(e.get('year').textContent,year);e.get('settings-dialog').close();a.advance(1);assert.ok(e.get('year').textContent>year);
});
test('population remarks update before their normal hold when six residents become eight',async()=>{
 const sim=new Civilization(31);sim.population=8;const a=await appHarness(sim);assert.doesNotMatch(a.elements.get('population-note').textContent,/Zes|Six/);assert.match(a.elements.get('population-note').textContent,/8/);
});
test('an unfinished reclamation card is hidden after the ending',async()=>{
 const sim=new Civilization(31);while(!sim.ending)sim.tick();sim.cinematic.toured=true;sim.project={stage:2,elapsed:5,tiles:[],manual:false};
 const a=await appHarness(sim);assert.equal(a.elements.get('project-overlay').hidden,true);
 a.advance(41);assert.equal(a.elements.get('project-overlay').hidden,true);assert.equal(a.elements.get('cinema-dialog').open,false);assert.equal(a.elements.get('ending-dialog').open,true);
});
test('a saved ending resumes its scene, while a completed recap stays completed on reload',async()=>{
 const sim=new Civilization(31);while(!sim.ending)sim.tick();sim.cinematic.toured=true;sim.cinematic.elapsed=12;sim.cinematic.cheers=2;
 const a=await appHarness(sim);assert.equal(a.elements.get('cinema-caption').hidden,false);a.advance(29);
 assert.equal(a.elements.get('ending-dialog').open,true);assert.equal(a.saved().cinematic.cheers,2);
 const b=await appHarness(Civilization.restore(JSON.stringify(a.saved())));
 assert.equal(b.elements.get('cinema-caption').hidden,true);assert.equal(b.elements.get('ending-dialog').open,false);
 b.elements.get('open-ending').handlers.click();assert.equal(b.elements.get('ending-dialog').open,true);
});
test('story cards are off by default and milestones do not interrupt watching',async()=>{
 const sim=new Civilization(31);sim.year=119;sim.technology=100;const a=await appHarness(sim),e=a.elements;
 assert.equal(e.get('story-cards').checked,false);a.advance(7);assert.ok(e.get('year').textContent>121);
 assert.equal(e.get('moment-card').hidden,true);assert.equal(e.get('tile-inspector').hidden,true);
});
test('opted-in cards have an immediate close button and never automatically pause or select a place',async()=>{
 const sim=new Civilization(31);sim.year=119;sim.technology=100;sim.config.storyCards=true;const a=await appHarness(sim),e=a.elements;
 a.advance(7);assert.equal(e.get('moment-card').hidden,false);assert.ok(e.get('year').textContent>121);assert.equal(e.get('tile-inspector').hidden,true);
 e.get('moment-close').handlers.click();assert.equal(e.get('moment-card').hidden,true);a.advance(1);assert.equal(e.get('moment-card').hidden,true);
 e.get('story-cards').handlers.change({target:{checked:false}});assert.equal(a.saved().config.storyCards,false);
});
test('the intro and ending windows can be dismissed immediately without a replacement popup',async()=>{
 const intro=await appHarness(new Civilization(31),{firstVisit:true});intro.elements.get('intro-close').handlers.click();assert.equal(intro.elements.get('intro-dialog').open,false);intro.advance(2);assert.ok(intro.elements.get('year').textContent>1);
 const sim=new Civilization(31);while(!sim.ending)sim.tick();sim.cinematic.toured=true;const a=await appHarness(sim),e=a.elements;
 assert.equal(e.get('cinema-dialog').open,true);e.get('cinema-close').handlers.click();assert.equal(e.get('cinema-dialog').open,false);assert.equal(e.get('ending-dialog').open,false);
 a.advance(41);assert.equal(e.get('cinema-dialog').open,false);assert.equal(e.get('ending-dialog').open,false);
 e.get('open-ending').handlers.click();assert.equal(e.get('ending-dialog').open,true);e.get('ending-close').handlers.click();a.advance(1);assert.equal(e.get('ending-dialog').open,false);
});
test('the family tree is opened deliberately, pauses time and points back to the founding home',async()=>{
 const sim=new Civilization(31);while(sim.year<100)sim.tick();const a=await appHarness(sim),e=a.elements;
 assert.equal(e.get('book-dialog').open,false);e.get('book-tab-family').handlers.click();assert.equal(e.get('book-dialog').open,true);
 assert.match(e.get('family-title').textContent,/Familie/);assert.equal(e.get('family-generations').children.length,4);assert.match(e.get('family-current').children[0].textContent,/generatie 4/);
 const year=e.get('year').textContent;a.advance(10);assert.equal(e.get('year').textContent,year);
 e.get('family-find-home').handlers.click();assert.equal(e.get('book-dialog').open,false);assert.match(e.get('tile-inspector').textContent,/generatie 4/);assert.equal(e.get('island').dataset.mode,'help');
});
test('resident wishes stay compact, dismiss permanently and pause only when deliberately opened',async()=>{
 const sim=new Civilization(31);sim.wishes.active={id:'wish-ui',kind:'rain',mode:'rain',speaker:'Mo Visser',text:'De boeren hopen op regen.',x:1,y:-1,issuedAt:1,deadline:100,hidden:false};
 const a=await appHarness(sim),e=a.elements;assert.equal(e.get('wish-bubble').hidden,false);assert.equal(e.get('book-dialog').open,false);
 a.advance(2);assert.ok(e.get('year').textContent>1);assert.equal(e.get('tile-inspector').hidden,true);
 e.get('wish-dismiss').handlers.click();assert.equal(e.get('wish-bubble').hidden,true);assert.equal(a.saved().wishes.active.hidden,true);
 e.get('book-tab-wishes').handlers.click();assert.equal(e.get('book-dialog').open,true);assert.match(e.get('wish-current').children[1].textContent,/regen/);
 const year=e.get('year').textContent;a.advance(2);assert.equal(e.get('year').textContent,year);
 e.get('wish-find').handlers.click();assert.equal(e.get('book-dialog').open,false);assert.equal(e.get('island').dataset.mode,'help');
 e.get('wish-bubbles').handlers.change({target:{checked:false}});assert.equal(a.saved().config.wishBubbles,false);
 const b=await appHarness(Civilization.restore(JSON.stringify(a.saved())));assert.equal(b.elements.get('wish-bubble').hidden,true);
});
test('optional challenges are revealed only on request and their window pauses the island',async()=>{
 const sim=new Civilization(31),a=await appHarness(sim),e=a.elements;
 assert.equal(e.get('book-dialog').open,false);assert.equal(e.get('challenge-list').children.length,0);assert.equal(a.saved().challenges.revealed,false);
 a.advance(2);assert.ok(e.get('year').textContent>1);assert.equal(e.get('book-dialog').open,false);
 e.get('book-tab-challenges').handlers.click();assert.equal(e.get('book-dialog').open,true);assert.equal(a.saved().challenges.revealed,true);assert.equal(e.get('challenge-list').children.length,sim.challenges.goals.length);
 const year=e.get('year').textContent;a.advance(2);assert.equal(e.get('year').textContent,year);e.get('book-close').handlers.click();a.advance(2);assert.ok(e.get('year').textContent>year);
 const b=await appHarness(Civilization.restore(JSON.stringify(a.saved())));assert.equal(b.elements.get('book-dialog').open,false,'return visits never open a challenge popup');
});
test('Help names the requesting resident and fulfils their wish through an explicit button',async()=>{
 const sim=new Civilization(31);sim.wishes.active={id:'help-ui',kind:'rain',mode:'rain',speaker:'Mo Visser',text:'De boeren hopen op regen.',x:1,y:-1,issuedAt:1,deadline:100,hidden:false};
 const a=await appHarness(sim),e=a.elements;a.frame(16);a.modes.find(b=>b.dataset.interference==='help').handlers.click();e.get('book-tab-wishes').handlers.click();
 assert.equal(e.get('wish-help').textContent,'Help Mo');assert.equal(e.get('wish-help').hidden,false);assert.equal(a.saved().interferences,0);
 e.get('wish-help').handlers.click();assert.equal(e.get('book-dialog').open,false);assert.equal(a.saved().interferences,1);assert.equal(a.saved().wishes.history.at(-1).status,'helped');assert.equal(a.saved().influence.rain,1);assert.equal(e.get('wish-bubble').hidden,true);
 e.get('wish-help').handlers.click();assert.equal(a.saved().interferences,1);
});
test('the collection is quiet, hides titles behind hints and survives new islands, undo and reload',async()=>{
 const s=new Civilization(31);s.year=120;s.tile(-1,1).building='manor';s.tile(-1,1).builtYear=120;const a=await appHarness(s),e=a.elements;
 assert.equal(e.get('book-dialog').open,false);assert.ok(a.collection().entries['moment:manor']);e.get('book-tab-collection').handlers.click();assert.equal(e.get('book-dialog').open,true);
 const items=e.get('collection-groups').children.flatMap(group=>group.children[1].children),hidden=items.find(item=>item.dataset.id==='ending:phoenix');assert.equal(hidden.children[1].textContent,'Nog niet ontdekt');assert.ok(hidden.children[2].textContent);assert.equal(hidden.dataset.found,'false');
 const year=e.get('year').textContent;a.advance(2);assert.equal(e.get('year').textContent,year);e.get('book-close').handlers.click();e.get('new-island').handlers.click();assert.ok(a.collection().entries['moment:manor']);e.get('undo-reset').handlers.click();assert.ok(a.collection().entries['moment:manor']);
 const b=await appHarness(Civilization.restore(JSON.stringify(a.saved())),{persistentStorage:a.storage});assert.ok(b.collection().entries['moment:manor']);assert.equal(b.elements.get('book-dialog').open,false);
});
test('a collection storage failure does not stop island saving or the playable in-memory collection',async()=>{
 const s=new Civilization(31);s.tile(-1,1).building='manor';const a=await appHarness(s,{rejectCollectionWrites:true}),e=a.elements;
 assert.doesNotThrow(()=>e.get('book-tab-collection').handlers.click());assert.match(e.get('collection-progress').textContent,/1 van/);assert.match(e.get('collection-storage').textContent,/tijdens dit bezoek/);
 e.get('book-close').handlers.click();e.get('new-island').handlers.click();assert.equal(a.saved().seed,8);assert.ok(a.saved().tiles.length);
});
test('a found secret stays in the collection after switching to another island',async()=>{
 const s=new Civilization(31);for(let i=0;i<3;i++)s.interfere(0,0,'rain');const a=await appHarness(s),e=a.elements;
 assert.ok(a.collection().entries['secret:old-tree-bloom']);assert.equal(e.get('book-dialog').open,false);assert.equal(e.get('moment-card').hidden,true);
 e.get('new-island').handlers.click();e.get('book-tab-collection').handlers.click();const items=e.get('collection-groups').children.flatMap(group=>group.children[1].children),tree=items.find(item=>item.dataset.id==='secret:old-tree-bloom');assert.equal(tree.dataset.found,'true');assert.match(tree.children[1].textContent,/wist nog/);assert.match(tree.children[3].textContent,/Seed 31/);
});
test('return summaries are inline and dismissible; Show focuses the real place without an automatic popup',async()=>{
 const s=new Civilization(31);s.lastVisitAt=Date.now()-120000;const a=await appHarness(s),e=a.elements;
 assert.equal(e.get('away-summary').hidden,false);assert.ok(a.saved().year>1);assert.equal(e.get('tile-inspector').hidden,true);assert.equal(e.get('moment-card').hidden,true);assert.equal(e.get('cinema-dialog').open,false);
 e.get('away-show').handlers.click();assert.equal(e.get('away-heading').textContent,'Het grootste moment');assert.equal(e.get('tile-inspector').hidden,false);assert.equal(e.get('away-show').hidden,true);assert.equal(e.get('book-dialog').open,false);
 e.get('away-dismiss').handlers.click();assert.equal(e.get('away-summary').hidden,true);assert.equal(a.saved().awayReport.dismissed,true);
 const b=await appHarness(Civilization.restore(JSON.stringify(a.saved())));assert.equal(b.elements.get('away-summary').hidden,true);
});
test('offline progression can be turned off and a paused saved island does not advance on return',async()=>{
 const s=new Civilization(31);s.lastVisitAt=Date.now()-120000;s.lastVisitPaused=true;const a=await appHarness(s),e=a.elements;assert.equal(a.saved().year,1);assert.equal(e.get('away-summary').hidden,true);
 e.get('offline-life').handlers.change({target:{checked:false}});assert.equal(a.saved().config.offlineProgress,false);
});
test('the journal has illustrated chapters, highlighted people and a working Show button on every entry',async()=>{
 const s=new Civilization(31);while(s.year<650)s.tick();s.interfere(1,-1,'rain');s.log('Een oud bericht zonder plek.','trade');const a=await appHarness(s),e=a.elements;a.frame(16);e.get('canvas-journal').handlers.click();
 const chapters=e.get('journal-entries').children,nav=e.get('journal-chapters').children;assert.equal(chapters.length,3);assert.equal(nav.length,3);assert.match(chapters[0].children[0].children[0].innerHTML,/<svg/);nav[2].handlers.click();assert.equal(chapters[2].scrolled.block,'start');
 const items=chapters.flatMap(c=>c.children.slice(1)).filter(item=>item.className?.includes('history-item'));assert.equal(items.length,s.history.length);assert.ok(items.some(item=>item.className.includes('family-history-item')));assert.ok(items.some(item=>item.className.includes('interference-history-item')));assert.ok(items.every(item=>item.children[1].children[2].textContent==='Laat zien ↗'));
 const year=e.get('year').textContent;a.advance(2);assert.equal(e.get('year').textContent,year);
 const intervention=items.find(item=>item.className.includes('interference-history-item'));intervention.children[1].children[2].handlers.click();assert.equal(e.get('book-dialog').open,false);assert.equal(e.get('tile-inspector').hidden,false);assert.equal(e.get('island').dataset.mode,'help');assert.equal(a.saved().interferences,1,'reading the chronicle never causes another intervention');
 e.get('canvas-journal').handlers.click();const old=e.get('journal-entries').children.flatMap(c=>c.children.slice(1)).find(item=>item.children?.[1]?.children?.[1]?.textContent==='Een oud bericht zonder plek.');old.children[1].children[2].handlers.click();assert.equal(e.get('book-dialog').open,false);assert.equal(e.get('tile-inspector').hidden,true);assert.match(e.get('toast-text').textContent,/precIeze plek|precieze plek/);
});
test('one island book replaces five windows; tabs switch pages and the book remembers the last page',async()=>{
 const sim=new Civilization(31);sim.wishes.active={id:'wish-book',kind:'rain',mode:'rain',speaker:'Mo Visser',text:'De boeren hopen op regen.',x:1,y:-1,issuedAt:1,deadline:100,hidden:false};
 const a=await appHarness(sim),e=a.elements;a.frame(16);
 for(const id of ['open-family','open-wishes','open-challenges','open-collection','family-dialog','wishes-dialog','journal-dialog'])assert.equal(e.get(id),undefined,`${id} is gone`);
 assert.equal(e.get('book-tab-wishes').dataset.pending,'true','a waiting wish is marked on its tab');
 e.get('canvas-journal').handlers.click();assert.equal(e.get('book-dialog').open,true);assert.equal(e.get('book-journal').hidden,false);assert.equal(e.get('book-family').hidden,true);
 e.get('book-tab-family').handlers.click();assert.equal(e.get('book-family').hidden,false);assert.equal(e.get('book-journal').hidden,true);assert.match(e.get('family-title').textContent,/Familie/);
 e.get('book-tab-collection').handlers.click();assert.equal(e.get('book-collection').hidden,false);assert.equal(e.get('book-family').hidden,true);
 e.get('book-close').handlers.click();assert.equal(e.get('book-dialog').open,false);
 e.get('canvas-journal').handlers.click();assert.equal(e.get('book-collection').hidden,false,'reopening returns to the last page');
 e.get('book-close').handlers.click();e.get('open-journal').handlers.click();assert.equal(e.get('book-journal').hidden,false,'the history link always opens the chronicle');
});
test('the ending first tours the real island, then opens the finale; the tour can be skipped',async()=>{
 const sim=new Civilization(31);while(!sim.ending)sim.tick();sim.interfere(1,1,'rain');const a=await appHarness(sim),e=a.elements;a.frame(16);
 assert.equal(e.get('tour-caption').hidden,false);assert.equal(e.get('cinema-dialog').open,false,'no finale window during the tour');
 assert.match(e.get('tour-step').textContent,/^1 \//);const steps=Number(e.get('tour-step').textContent.split('/ ')[1]);assert.ok(steps>=3);
 a.advance(5);assert.match(e.get('tour-step').textContent,/^2 \//);
 for(let i=0;i<60&&!e.get('tour-caption').hidden;i++)a.advance(1);assert.equal(e.get('tour-caption').hidden,true);assert.equal(e.get('cinema-dialog').open,true);assert.equal(a.saved().cinematic.toured,true);
 const b=await appHarness(Civilization.restore(JSON.stringify({...JSON.parse(sim.serialize()),cinematic:{...sim.cinematic,toured:false}})),{});b.frame(16);
 b.elements.get('tour-skip').handlers.click();assert.equal(b.elements.get('tour-caption').hidden,true);assert.equal(b.elements.get('cinema-dialog').open,true);
});
test('a new age shows a short title card on the island',async()=>{
 const sim=new Civilization(31);sim.year=598;const a=await appHarness(sim),e=a.elements;a.frame(16);assert.equal(e.get('age-card').hidden,true);
 for(let i=0;i<60&&e.get('age-card').hidden;i++)a.advance(1);
 assert.equal(e.get('age-card').hidden,false);assert.match(e.get('age-card-title').textContent,/middeleeuwen|Middeleeuwen/i);assert.match(e.get('age-card-year').textContent,/600/);
});
test('photo mode hides the interface, pauses the island and restores the previous state',async()=>{
 const a=await appHarness(new Civilization(31)),e=a.elements;a.frame(16);
 e.get('photo-mode').handlers.click();assert.equal(e.get('photo-bar').hidden,false);const year=e.get('year').textContent;a.advance(5);assert.equal(e.get('year').textContent,year,'the island holds still for the photo');
 e.get('photo-done').handlers.click();assert.equal(e.get('photo-bar').hidden,true);a.advance(5);assert.ok(Number(e.get('year').textContent)>Number(year));
});
test('stores read as feelings and show exact numbers on request',async()=>{
 const sim=new Civilization(31);sim.food=4000;const a=await appHarness(sim),e=a.elements;a.frame(16);
 assert.equal(e.get('food').textContent,'De schuren puilen uit');assert.match(e.get('food').title,/4\.000/);
 e.get('resources').handlers.click();assert.equal(e.get('food').textContent,'4.000');assert.equal(a.saved().config.showNumbers,true);
 e.get('show-numbers').handlers.change({target:{checked:false}});assert.equal(e.get('food').textContent,'De schuren puilen uit');
});
test('the reduced-motion preference is remembered with the island',async()=>{
 const a=await appHarness(new Civilization(31)),e=a.elements;a.frame(16);
 assert.equal(e.get('reduce-motion').checked,false);e.get('reduce-motion').handlers.change({target:{checked:true}});assert.equal(a.saved().config.reducedMotion,true);
});

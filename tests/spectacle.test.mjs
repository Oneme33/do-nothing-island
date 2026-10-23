import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {advancePleasures,reserveBeaches,startCinema,advanceCinema,cinemaBeat,cinemaVisible} from '../src/spectacle.js';
import {ENDINGS,resumeSandbox} from '../src/story.js';

test('coastal recreation preserves occupied homes and unfinished construction',()=>{
 const s=new Civilization(31),coast=s.land.filter(t=>s.isCoast(t)&&!t.landform&&!t.reservedFor);
 for(const t of coast){t.building='house';t.protectedCoast=false;}
 const site=coast[0];site.building=null;site.buildSite={type:'hut',progress:1,duration:4};
 reserveBeaches(s);
 assert.equal(site.building,null);assert.equal(site.buildSite.type,'hut');
 assert.ok(coast.slice(1).every(t=>t.building==='house'),'reserving sand never silently removes residents');
});

test('fire stays local, survives saving and rain extinguishes it without deleting homes',()=>{
 const s=new Civilization(31),home=s.tile(-1,1),tree=s.tile(0,0);
 s.interfere(home.x,home.y,'fire');assert.ok(home.fire);assert.ok(home.quakeDamage>0);assert.equal(s.influence.fire,1);
 const restored=Civilization.restore(s.serialize());assert.ok(restored.tile(-1,1).fire);
 restored.interfere(-1,1,'rain');assert.equal(restored.tile(-1,1).fire,undefined);assert.equal(restored.tile(-1,1).building,'hut');
 assert.match(restored.lastIntervention.title,/out/);
 s.year=home.fire.until;advancePleasures(s);assert.equal(home.fire,undefined);assert.equal(home.building,'ruins');
 s.year=home.rebuildAt;s.wood=100;advancePleasures(s);assert.equal(home.building,'hut');assert.equal(home.material,'stone');
 s.interfere(tree.x,tree.y,'fire');assert.equal(tree.fire,undefined);assert.equal(tree.building,'original-tree');assert.equal(s.festival.kind,'bonfire');
 const water=[...s.tiles.values()].find(t=>t.kind==='water');s.interfere(water.x,water.y,'fire');assert.equal(water.fire,undefined);assert.equal(water.kind,'water');
});

test('festivals occur autonomously and are preserved across a save',()=>{
 const s=new Civilization(31);s.year=s.nextFestival;s.storm=0;advancePleasures(s);
 assert.ok(s.festival);assert.equal(s.tile(s.festival.x,s.festival.y).kind,'land');assert.ok(s.festival.quips.length);
 assert.ok(s.history.some(e=>e.type==='fun'));assert.deepEqual(Civilization.restore(s.serialize()).festival,s.festival);
});

test('every ending has four cinematic beats, a finite duration and explicit replay',()=>{
 const s=new Civilization(31);s.ending=true;
 for(const id of Object.keys(ENDINGS)){
  startCinema(s,id);assert.equal(cinemaVisible(s),true);
  const d=s.cinematic.duration;for(const [elapsed,index] of [[0,0],[5,1],[11,2],[19,3]]){s.cinematic.elapsed=elapsed*d/24;assert.equal(cinemaBeat(s.cinematic).index,index);}
  s.cinematic.elapsed=d-.1;assert.equal(advanceCinema(s,.2),true);assert.equal(s.cinematic.elapsed,d);
  assert.equal(advanceCinema(s,.2),false);assert.equal(cinemaBeat(s.cinematic).progress,1);
  startCinema(s,id,true);assert.equal(s.cinematic.elapsed,0);assert.equal(s.cinematic.replay,true);
 }
 resumeSandbox(s);assert.equal(cinemaVisible(s),false);assert.equal(s.cinematic.completed,true);
});
import {creditsFor,drawCredits} from '../src/credits.js';
test('the credits are written from the island itself and draw safely for every ending',()=>{
 const s=new Civilization(31);while(!s.ending)s.tick();const lines=creditsFor(s);
 assert.ok(lines.length>15);assert.ok(lines.some(l=>l.kind==='award'));assert.ok(lines.some(l=>/broden/.test(l.text)));assert.match(lines.find(l=>l.kind==='thanks').text,/geduld|helpen|Hand/);
 const ctx=new Proxy({measureText:t=>({width:t.length*6})},{get:(t,k)=>k in t?t[k]:(...a)=>{for(const v of a)if(typeof v==='number')assert.ok(Number.isFinite(v),String(k));},set:(t,k,v)=>(t[k]=v,true)});
 for(const id of Object.keys(ENDINGS))for(const elapsed of [0,10,25,39])assert.doesNotThrow(()=>drawCredits(ctx,800,380,s,{id,elapsed,duration:40},false,{width:1200,height:600}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {DELIGHTS} from '../src/delights.js';
import {describePlot} from '../src/inspection.js';

test('each island gets one of every small delight, in a fitting place, after its time',()=>{
 const s=new Civilization(31);while(!s.ending)s.tick();
 for(const d of DELIGHTS){
  const built=s.buildings.filter(t=>t.building===d.type);assert.equal(built.length,1,d.type);assert.ok(built[0].builtYear>=d.since,d.type);
  assert.ok(s.history.some(e=>e.text===d.opening),`${d.type} opening is logged`);assert.match(describePlot(s,built[0]),new RegExp(d.name));
 }
});
import {museumExhibits} from '../src/museum.js';
test('the museum collects finds, your visits and old maps as exhibits',()=>{
 const s=new Civilization(31);while(s.year<300)s.tick();s.interfere(3,3,'fire');while(s.year<1000)s.tick();
 const items=museumExhibits(s);assert.ok(items.some(i=>i.kind==='Jouw ingreep'&&/Grote Brand/.test(i.title)));assert.ok(items.some(i=>i.kind==='Oude kaart'));
 for(let i=1;i<items.length;i++)assert.ok(items[i].year>=items[i-1].year);
 assert.ok(s.buildings.some(t=>t.building==='museum'));
});
import {islandIdentity,flagSVG} from '../src/identity.js';
test('islands get a stable name and flag that follow their character',()=>{
 const a=new Civilization(31),b=new Civilization(31);assert.deepEqual(islandIdentity(a),islandIdentity(b));
 while(!a.character&&a.year<400)a.tick();const id=islandIdentity(a);assert.ok(id.name.length>3);assert.notEqual(id.kind,'none');
 assert.match(flagSVG(id),/^<svg[^>]*class="island-flag"/);
 const names=new Set([1,2,3,4,5,6,7,8].map(seed=>islandIdentity(new Civilization(seed)).name));assert.ok(names.size>=3);
});
import {advanceMonuments} from '../src/monuments.js';
test('the island raises a statue for you: a hand when you help, an empty plinth when you never touch',()=>{
 const idle=new Civilization(31);while(idle.year<1510)idle.tick();assert.ok(idle.monuments.some(m=>m.kind==='watcher'));assert.ok(!idle.monuments.some(m=>m.kind==='hand'));
 const helper=new Civilization(31);while(helper.year<200)helper.tick();helper.influence.trust=20;helper.year=206;advanceMonuments(helper);
 const hand=helper.monuments.find(m=>m.kind==='hand');assert.ok(hand);assert.equal(helper.tile(hand.x,hand.y).monument,'hand');
});
import {buildCastle} from '../src/monuments.js';
test('each island builds one castle, on a site of its own',()=>{
 const sites=new Set();for(const seed of [31,77,5,9]){const s=new Civilization(seed);while(s.year<1300&&!s.court)s.tick();assert.ok(s.court);sites.add(`${s.court.x},${s.court.y}`);assert.equal(buildCastle(s),null,'only once');}
 assert.ok(sites.size>=3,'castles stand in different places');
});
import {ensureCommissions,placeCommission} from '../src/commissions.js';
test('every third helped wish earns a commission you can place on a free plot',()=>{
 const s=new Civilization(31);while(s.year<300)s.tick();
 for(let i=0;i<3;i++){s.wishes.active={id:`w${i}`,kind:'pumpkin',mode:'rain',speaker:'Mo',text:'?',x:s.farms[0].x,y:s.farms[0].y,issuedAt:s.year,deadline:s.year+30,status:'active',hidden:false,thing:'regen',noun:'de regen'};s.interfere(s.farms[0].x,s.farms[0].y,'rain');s.year+=40;}
 assert.equal(ensureCommissions(s).available,1);
 const plot=s.freeLand.find(t=>!t.reservedFor);assert.equal(placeCommission(s,'grand-fountain',plot.x,plot.y),true);assert.equal(plot.buildSite.type,'grand-fountain');assert.equal(ensureCommissions(s).available,0);
 assert.equal(placeCommission(s,'carillon',plot.x,plot.y),false,'no second commission without earning it');
 for(let i=0;i<20;i++)s.tick();assert.equal(plot.building,'grand-fountain');
});
test('the castle stands in its own garden ring, in a style that differs per island',()=>{
 const styles=new Set();for(const seed of [31,77,5,9,12]){const s=new Civilization(seed);while(s.year<1100&&!s.court)s.tick();const ring=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].map(([dx,dy])=>s.tile(s.court.x+dx,s.court.y+dy)).filter(t=>t?.building==='castle-garden');assert.ok(ring.length>=3,`seed ${seed}: ${ring.length} garden plots`);styles.add(ring[0].gardenStyle);}
 assert.ok(styles.size>=2,'gardens differ between islands');
});

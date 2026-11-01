import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {IslandRenderer} from '../src/renderer.js';
function marker(width=1200){
 const sim=new Civilization(31);sim.wishes.active={id:'visible-wish',x:1,y:-1,hidden:true};sim.config.wishBubbles=false;
 return Object.assign(Object.create(IslandRenderer.prototype),{sim,width,height:650,zoom:1,origin:{x:width/2,y:325}});
}
test('an active question mark stays visible when wish clouds are disabled or dismissed',()=>{
 const r=marker(),p=r.wishResidentPoint();assert.ok(p);assert.equal(r.pickWishResident(p.x,p.y),true);
 assert.equal(r.pickWishResident(p.x+100,p.y),false);
 r.sim.wishes.active=null;assert.equal(r.wishResidentPoint(),null);
});
test('question marks stay on screen through panning and zooming, with the same clickable position',()=>{
 for(const width of [390,1200])for(const zoom of [.65,2.4])for(const pan of [-5000,5000]){
  const r=marker(width);r.zoom=zoom;r.origin={x:pan,y:pan};
  const p=r.wishResidentPoint();assert.ok(p.edge);
  assert.ok(p.x>=34&&p.x<=width-34&&p.y>=90&&p.y<=r.height-105);
  assert.ok(r.pickWishResident(p.x,p.y));
 }
});
test('the marker clears tall roofs and disappears when the island story is over',()=>{
 const r=marker(),tile=r.sim.tile(1,-1);tile.building='tower';r.zoom=2;
 const p=r.wishResidentPoint(),ground=r.point(1,-1);assert.ok(ground.y-p.y>160);
 r.sim.ending=true;assert.equal(r.wishResidentPoint(),null);
});

import { cinemaVisible } from './spectacle.js';
import {nl} from './language.js';
import {daylightAt,drawDaylight,seasonalLeaf,randomDaylightStart} from './daylight.js';
import {drawSeaLife} from './sea.js';
import {drawInterventionFx} from './fx.js';
import {drawAnimals} from './animals.js';
import {drawFestive} from './festive.js';
import {drawSeasonal,drawNightLife} from './ambient.js';
import {drawWeather} from './weatherfx.js';
import {squareRole} from './square.js';
import {islandIdentity} from './identity.js';
import { drawFlames, drawBonfire, drawFestivalGround, drawLifeWorld, drawComicBubbles } from './pageants.js';
const aroundLand=(s,t)=>neighbors(t).every(([x,y])=>s.tile(x,y)?.kind==='land');
import { neighbors, key } from './simulation.js';
const TAU=Math.PI*2;
const hash=(x,y=0)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
const mix=(a,b,t)=>a+(b-a)*t;
const palette=['#9daf78','#a8b981','#a1b47b','#a9bb81','#a6b77e','#afbf87'];
// Every home gets its own colours and proportions from its plot, so streets never look copied.
const HOUSE_WALLS=['#d7cdb0','#e2d6bd','#d9c3a5','#cfd3bd','#e0c9b8','#d2c8a8','#e6dcc6','#cbd1c2','#dcc7a0','#e3d2c4'];
const HOUSE_ROOFS=['#9c5a4c','#6f7c86','#5c6468','#7f8a62','#6a8a86','#a8704f','#86705a','#b09862','#7a6a7c','#946f62','#56697a','#a0806c'];
const THATCH=['#c9b27a','#b89a5c','#d1bd84','#a98d5a','#9a957a','#8a6a4c'];
const HOUSE_SHUTTERS=['#6c806c','#7b8c79','#8a6f5c','#6f7f95','#9a7a56','#7d6b84','#5f7d7a'];
const shadeColor=(hex,f)=>'#'+[1,3,5].map(i=>Math.round(Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)*f))).toString(16).padStart(2,'0')).join('');
const SPECIAL_BIG=new Set(['museum','circus','station','pool','spaceport','zoo','theme-park','petting-farm','observatory','ice-cream','greenhouse','watermill','watchtower','rose-garden','grand-fountain','carillon','monument','lighthouse']);
const DEFAULT_LOOK={wall:'#d7cdb0',side:'#b9b99b',roof:null,gable:null,shutter:'#6c806c',shutterSide:'#7b8c79',sx:1,sy:1,extra:0,flowers:null,chimney:null};
function houseLook(t){
 const a=hash(t.x,t.y),b=hash(t.y+31,t.x-17),c=hash(t.x*3+7,t.y*5-2);
 const wall=HOUSE_WALLS[Math.floor(a*HOUSE_WALLS.length)],roof=HOUSE_ROOFS[Math.floor(b*HOUSE_ROOFS.length)],shutter=HOUSE_SHUTTERS[Math.floor(c*HOUSE_SHUTTERS.length)];
 return{wall,side:shadeColor(wall,.86),roof,gable:shadeColor(roof,1.12),shutter,shutterSide:shadeColor(shutter,1.1),sx:.86+b*.3,sy:.9+c*.24,extra:Math.floor(a*3)*3,flowers:c<.35?['#d58f7a','#e2c26a','#c98fb0'][Math.floor(a*3)]:null,chimney:b>.25};
}

export class IslandRenderer {
  constructor(canvas,simulation) {
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.sim=simulation;
    this.width=1000; this.height=570;
    this.zoom=1; this.userZoom=1; this.pan={x:0,y:0};
    this.center={x:0,y:0}; this.time=0;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ripples=[];this.hover=null;this.particles=[];
    this.dayClock=randomDaylightStart();this.daySpeed=1;this.dayNight=true;this.light=daylightAt(this.dayClock);
    this.effects=[];this.activityTime=0;this.wheelTime=0;this.activityRate=1;this.paused=false;this.mode='nudge';
    this.lastFrame=0;this.fitZoom=1;this.focus=null;this.showHistory=false;this.historySnapshot=null;this.showDistricts=true;
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();
    this.width=r.width;this.height=r.height;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
    this.dpr=dpr;
  }
  p(x,y,z=0){return{x:(x-y)*23,y:(x+y)*11.5-z};}
  point(x,y,z=0){const p=this.p(x,y,z);return{x:this.origin.x+p.x*this.zoom,y:this.origin.y+p.y*this.zoom};}
  screenToTile(sx,sy){
    const x=(sx-this.origin.x)/this.zoom, y=(sy-this.origin.y)/this.zoom;
    return {x:Math.round((x/23+y/11.5)/2),y:Math.round((y/11.5-x/23)/2)};
  }
  pick(sx,sy){
    // Roofs and treetops belong to the building below them, not a tile behind it.
    const candidates=(this.visibleTiles||[]).slice().reverse();
    for(const t of candidates){
      if(!t.building&&!t.buildSite&&!t.landform)continue;
      const p=this.point(t.x,t.y),b=t.building;
      const height=b==='palace'?96:t.landform?(t.relief||55)+8:b==='original-tree'?70:['tower','palace','turbine','church','fairground'].includes(b)?62:['farm','campfire','garden','solar','flowers','beach','playground'].includes(b)?20:42;
      const width=b==='palace'?37:t.landform?33:b==='original-tree'?29:['palace','forest','park','beach','fairground'].includes(b)?25:17;
      if(Math.abs(sx-p.x)<width*this.zoom && sy>=p.y-height*this.zoom && sy<=p.y+5*this.zoom)return{x:t.x,y:t.y};
    }
    return this.screenToTile(sx,sy);
  }
  setZoom(delta){this.userZoom=Math.max(.65,Math.min(2.4,this.userZoom*delta));}
  focusTile(tile,seconds=9){if(!tile)return;this.focus={x:tile.x,y:tile.y,remaining:seconds};this.pan={x:0,y:0};this.userZoom=1;}
  recenter(){this.focus=null;this.flight=null;this.pan={x:0,y:0};this.userZoom=1;}
  flyTo(points,duration,{dip=.35,hold=true}={}){this.focus=null;this.pan={x:0,y:0};this.userZoom=1;this.flight={points:[{x:this.center.x,y:this.center.y,zoom:this.zoom},...points],start:null,duration,dip,hold};}
  // Glide in close to one place for a few seconds; afterwards the camera eases back to the whole island.
  dive(x,y,seconds=6){const p=this.p(x,y);this.flyTo([{x:p.x,y:p.y-24,zoom:this.width<600?1.9:2.35}],2.8,{dip:0,hold:true});this.flight.release=seconds;}
  // A short sightseeing flight from one side of the island to the other, then back to the usual view.
  sweep(seconds=6){
    const land=this.sim.land;if(land.length<4)return;const pts=land.map(t=>this.p(t.x,t.y));const left=pts.reduce((a,b)=>b.x<a.x?b:a),right=pts.reduce((a,b)=>b.x>a.x?b:a),mid=this.p(0,0);
    this.flyTo([{x:left.x+60,y:left.y-20,zoom:1.45},{x:mid.x,y:mid.y-20,zoom:1.25},{x:right.x-60,y:right.y-20,zoom:1.45}],seconds,{dip:.2,hold:false});
  }
  ripple(x,y){this.ripples.push({x,y,time:this.time});}
  addEffect(effect){if(!effect||!Number.isFinite(effect.x)||!Number.isFinite(effect.y))return;this.effects.push({...effect,label:effect.label||effect.title||'',elapsed:0});if(this.effects.length>18){const i=this.effects.reduce((n,e,k,a)=>(e.priority||0)<(a[n].priority||0)?k:n,0);this.effects.splice(i,1);}}
  reserveLabel(x,y,w,h){
    this.labelBoxes||=[];if(this.labelBoxes.length>=3||w>this.width-20||h>this.height-170)return null;
    x=Math.max(10,Math.min(this.width-w-10,x-w/2));
    for(const shift of [0,-h-10,h+10,-2*h-20,2*h+20]){
      const top=Math.max(64,Math.min(this.height-110-h,y+shift));
      const box={x,y:top,w,h};
      const obstacles=[...this.labelBoxes,{x:14,y:55,w:this.width<600?130:185,h:this.width<600?155:180}];
      if(obstacles.some(b=>x<b.x+b.w+8&&x+w+8>b.x&&top<b.y+b.h+8&&top+h+8>b.y))continue;
      this.labelBoxes.push(box);return box;
    }return null;
  }
  poly(points,fill,stroke=null,width=1){
    const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  line(points,color,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
  ellipse(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
  rect(x,y,w,h,color){this.ctx.fillStyle=color;this.ctx.fillRect(x,y,w,h);}
  diamond(x,y,w,h,color,stroke=null){this.poly([[x,y-h],[x+w,y],[x,y+h],[x-w,y]],color,stroke,.5);}
  draw(now){
    this.labelBoxes=[];this.litWindows=[];this.litLamps=[];
    // Daylight follows the wall clock, so a slow frame rate never stretches the day.
    const clockDt=Math.max(0,Math.min(.5,(now-this.lastFrame)/1000||.016));
    const dt=Math.max(0,Math.min(.08,(now-this.lastFrame)/1000||.016));this.lastFrame=now;
    if(!this.reduced) this.time+=dt;
    if(!this.paused)this.dayClock+=clockDt*Math.min(4,Math.max(1,this.daySpeed||1));
    this.light=daylightAt(this.dayClock,this.dayNight!==false);
    if(!this.reduced && !this.paused)this.activityTime+=dt*Math.min(5,Math.max(.5,this.activityRate));
    if(!this.reduced && !this.paused && this.sim.power>0 && !this.sim.storm)this.wheelTime+=dt*Math.min(3,Math.max(.5,this.activityRate));
    for(const effect of this.effects)effect.elapsed+=dt;
    this.effects=this.effects.filter(e=>e.elapsed<4.8);
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);
    c.clearRect(0,0,this.width,this.height);
    const land=[...this.sim.tiles.values()].filter(t=>t.kind!=='water'||t.building);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const t of land){const p=this.p(t.x,t.y);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y-Math.max(52,t.landform?(t.relief||55)*1.9:0));maxY=Math.max(maxY,p.y+25);}
    const mobile=this.width<600;
    const availW=this.width*(mobile?.85:.66), availH=this.height*.65;
    let target=Math.max(mobile?.74:.86,Math.min(mobile?1.08:1.55,availW/(maxX-minX+80),availH/(maxY-minY+75)));
    // The rare finale moves gently into the engineered city as the last basins disappear.
    if(this.sim.obsessed && this.sim.config.rareEndings && this.sim.config.maxTiles>=600 && this.sim.land.length>500){
      const close=Math.min(1,(this.sim.land.length-500)/95);
      target=mix(target,mobile?1.3:2.1,close);
    }
    if(this.sim.year<120&&!this.focus)target=Math.max(target,mobile?.95:1.12);
    if(cinemaVisible(this.sim)&&!this.touring){this.focus=null;target=mobile?.72:.9;}
    if(this.focus){this.focus.remaining-=dt;if(this.focus.remaining<=0)this.focus=null;}
    if(this.focus)target=this.focus.zoom?this.focus.zoom*(mobile?.85:1):mobile?1.65:2.05;
    this.fitZoom=target;
    const desiredZoom=mix(this.zoom,target*this.userZoom,Math.min(1,dt*2));
    this.zoom+=Math.max(-.065,Math.min(.065,desiredZoom-this.zoom));
    const focusPoint=this.focus?this.p(this.focus.x,this.focus.y):null;
    this.center.x=mix(this.center.x,focusPoint?focusPoint.x:(minX+maxX)/2,Math.min(1,dt*.9));
    // During the closing tour the focus sits higher, above the caption card.
    this.center.y=mix(this.center.y,focusPoint?focusPoint.y-24+(this.touring?this.height*.32/this.zoom:0):(minY+maxY)/2+15,Math.min(1,dt*.9));
    // A camera flight overrides the usual framing: an eased path through waypoints with a gentle zoom-out in the middle.
    if(this.flight){
      const f=this.flight;f.start??=now;const u=this.reduced?1:Math.min(1,(now-f.start)/1000/f.duration),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
      const seg=(f.points.length-1)*e,i=Math.min(f.points.length-2,Math.floor(seg)),k=seg-i,a=f.points[i],b=f.points[i+1];
      this.center.x=a.x+(b.x-a.x)*k;this.center.y=a.y+(b.y-a.y)*k;this.zoom=Math.max(.5,a.zoom+(b.zoom-a.zoom)*k-f.dip*Math.sin(Math.PI*u));
      if(u>=1&&!f.hold)this.flight=null;
      if(f.release&&now-f.start>(f.duration+f.release)*1000)this.flight=null;
    }
    const quake=this.reduced?0:this.effects.filter(e=>e.type==='rumble'&&e.elapsed<1).reduce((s,e)=>s+Math.sin(e.elapsed*55)*(1-e.elapsed)*3,0);
    this.origin={x:this.width*(mobile?.54:.55)-this.center.x*this.zoom+this.pan.x+quake,y:this.height*(cinemaVisible(this.sim)?.62:mobile?.54:.52)-this.center.y*this.zoom+this.pan.y};
    this.drawWater();
    c.save();c.translate(this.origin.x,this.origin.y);c.scale(this.zoom,this.zoom);
    // Shore water is derived from current geography, so the coast follows every project.
    const tiles=[...this.sim.tiles.values()];
    for(const t of tiles){
      if(t.kind!=='water')continue;
      const coast=neighbors(t).some(([x,y])=>this.sim.tile(x,y)?.kind!=='water'&&this.sim.tile(x,y));
      const near=coast||neighbors(t).some(([x,y])=>neighbors({x,y}).some(([a,b])=>this.sim.tile(a,b)?.kind==='land'));
      if(near){const p=this.p(t.x,t.y);this.diamond(p.x,p.y,23.8,12,t.rift?'#708c87':coast?'#c0d9ca':'#d0e3d8');if(t.rift)this.line([[p.x-15,p.y],[p.x,p.y+7],[p.x+15,p.y]],'#716e5e',2);}
    }
    // Waterline rings softly break up the tile silhouette.
    for(const t of land.filter(t=>t.kind==='land'))this.drawShore(t);
    const sorted=land.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
    this.visibleTiles=sorted;
    for(const t of sorted)this.drawGround(t);
    this.drawRiver();
    this.drawMoat();
    this.drawHeritage();
    this.drawRoads(sorted);
    this.scene=[];
    for(const t of sorted){
      this.drawDetails(t);
      const p=this.p(t.x,t.y),depth=p.y+(t.landform?10:['tree','original-tree'].includes(t.building)?0:5);
      if(t.kind==='land'&&!t.building&&!t.buildSite&&!t.landform&&!t.road&&t.reservedFor!=='square'&&!t.foundingHome&&hash(t.x*5+1,t.y*3-2)<.24)this.scene.push({depth:depth-2,draw:()=>this.meadowTree(t)});
      if(t.treasure&&this.sim.year-t.treasure.year<40)this.scene.push({depth:depth+1,draw:()=>this.treasureChest(t)});
      if(t.landform||t.building||t.buildSite)this.scene.push({depth,draw:()=>{if(t.landform)this.drawLandform(t);if(t.building)this.drawBuilding(t);if(t.buildSite)this.drawBuildingSite(t);}});
    }
    this.drawWorkers();
    drawInterventionFx(this);
    drawAnimals(this);
    drawSeasonal(this);
    drawFestive(this);
    this.drawVisitors();drawLifeWorld(this);
    this.scene.sort((a,b)=>a.depth-b.depth);
    for(const item of this.scene)item.draw();
    this.scene=null;
    if(this.showHistory)this.drawCoastOverlay();
    this.drawWorldEffects();
    if(this.hover){
      for(const t of land){const distance=Math.abs(t.x-this.hover.x)+Math.abs(t.y-this.hover.y);if(distance<=(['rain','rumble'].includes(this.mode)?2:0)){const p=this.p(t.x,t.y);this.diamond(p.x,p.y-1,23,11.5,this.mode==='rumble'?'#d39a6c22':'#ffffff22',this.mode==='rain'?'#e9f4e8aa':'#f9f9dbaa');}}
    }
    this.drawBoats();
    drawSeaLife(this);
    c.restore();
    this.drawCloudShadows();
    this.drawClouds();
    this.drawBirds();
    this.drawRipples();
    if(this.sim.storm)this.drawRain();
    drawWeather(this);
    drawDaylight(this,this.light);
    drawNightLife(this);
    this.drawEffectLabels();
    this.drawDistrictLabels();
    if(!cinemaVisible(this.sim))this.drawLandmarkLabels();
    drawComicBubbles(this);
    this.drawWishResident();
  }
  // A question mark floats over every open wish; in Help mode the asking resident stands beside it.
  wishResidentPoint(){
    const wish=this.sim.wishes?.active;if(!wish||wish.hidden||this.sim.ending||this.sim.config.wishBubbles===false)return null;
    const p=this.point(wish.x,wish.y);return{x:p.x,y:p.y-30*this.zoom,ground:p,wish};
  }
  pickWishResident(x,y){const p=this.wishResidentPoint();return !!p&&Math.hypot(x-p.x,y-p.y)<=Math.max(16,12*this.zoom);}
  drawWishResident(){
    const p=this.wishResidentPoint();if(!p)return;
    const c=this.ctx,bob=this.reduced?0:Math.sin(this.time*2.2)*2;
    if(this.mode==='help'){c.save();c.translate(p.ground.x+16*this.zoom,p.ground.y+8*this.zoom);c.scale(this.zoom,this.zoom);this.ellipse(0,0,7,3,'#8c9e6e44');this.person(0,0,'#a37b5f',0);c.restore();}
    c.save();c.translate(p.x,p.y+bob);c.scale(Math.max(.8,this.zoom),Math.max(.8,this.zoom));
    this.line([[0,9],[0,16]],'#8f9e7f88',1);
    this.ellipse(0,0,9,9,'#fbf6df');c.strokeStyle='#c7a85c';c.lineWidth=1.3;c.beginPath();c.ellipse(0,0,9,9,0,0,TAU);c.stroke();
    c.fillStyle='#7a6230';c.font='bold 12px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillText('?',0,1);c.restore();
  }
  enqueueActor(depth,draw){if(this.scene)this.scene.push({depth,draw});else draw();}
  streetPoint(tile){const p=this.p(tile.x,tile.y);return{x:p.x,y:p.y+11.5};}
  streetPosition(a,b,t,lane=0){
    const p=this.streetPoint(a),q=this.streetPoint(b),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1;
    return{x:mix(p.x,q.x,t)-dy/len*lane,y:mix(p.y,q.y,t)+dx/len*lane};
  }
  entrancePoint(tile){const p=this.p(tile.x,tile.y);return{x:p.x-5,y:p.y};}
  walkingPoint(tile){return tile.road||tile.building||tile.buildSite?this.streetPoint(tile):this.p(tile.x,tile.y);}
  walkingPosition(a,b,t,lane=0){
    if(a.roadLinks?.includes(key(b.x,b.y)))return this.streetPosition(a,b,t,lane);
    const p=this.walkingPoint(a),q=this.walkingPoint(b);
    return{x:mix(p.x,q.x,t),y:mix(p.y,q.y,t)};
  }
  sampleWalker(index,time=this.activityTime){
    const routes=this.sim.journeys?.length?this.sim.journeys.map(j=>j.route):this.sim.routes;
    const count=Math.min(64,Math.max(6,Math.floor(this.sim.population*.65))),routeIndex=Math.floor(index*routes.length/count)%Math.max(1,routes.length);
    const route=routes[routeIndex];if(!route||route.length<2)return null;
    const steps=route.length-1,doorTime=1.6,insideTime=3,cycle=steps*2+doorTime*2+insideTime;
    const phase=this.reduced?((hash(index,79)*cycle)%cycle):(time*.9+hash(index,79)*cycle)%cycle;
    const target=this.sim.tiles.get(route.at(-1)),street=this.walkingPoint(target),door=this.entrancePoint(target);
    const outdoors=!target.building||['forest','beach','park','garden','farm','bonfire','campfire','playground','royal-garden','palace-square','town-square','campus-square'].includes(target.building);
    if(outdoors&&phase>=steps&&phase<steps+doorTime*2+insideTime)return{...street,stage:'visiting',alpha:1,target};
    if(phase>=steps&&phase<steps+doorTime){const t=(phase-steps)/doorTime;return{x:mix(street.x,door.x,t),y:mix(street.y,door.y,t),stage:'entering',alpha:1-Math.max(0,(t-.6)/.4),target};}
    if(phase>=steps+doorTime&&phase<steps+doorTime+insideTime)return{stage:'inside',target};
    if(phase>=steps+doorTime+insideTime&&phase<steps+doorTime*2+insideTime){const t=(phase-steps-doorTime-insideTime)/doorTime;return{x:mix(door.x,street.x,t),y:mix(door.y,street.y,t),stage:'leaving',alpha:Math.min(1,t/.4),target};}
    const distance=phase<steps?phase:steps-(phase-steps-doorTime*2-insideTime);
    const segment=Math.min(steps-1,Math.max(0,Math.floor(distance))),a=this.sim.tiles.get(route[segment]),b=this.sim.tiles.get(route[segment+1]);
    if(!a||!b||a.kind==='flooded'||b.kind==='flooded')return null;
    const road=a.roadLinks?.includes(key(b.x,b.y));
    return{...this.walkingPosition(a,b,distance-segment,(hash(index,9)-.5)*1.8),stage:road?'road':'walking',alpha:1,a,b,t:distance-segment,target};
  }
  drawLandform(tile){
    // Mountains stand tall above the city: bigger than a tile, and a little taller as the skyline rises.
    const p=this.p(tile.x,tile.y),c=this.ctx,grow=tile.landform==='hill'?1.15:1.45+Math.min(.35,this.sim.year/6000),h=(tile.relief||55)*(tile.landform==='hill'?1:1.1);c.save();c.translate(p.x,p.y-2);c.scale(grow,grow);
    this.ellipse(9,3,31,10,'#697c5020');
    if(tile.landform==='hill'){
      this.poly([[-27,2],[-18,-h*.55],[-4,-h],[7,-h*.75],[25,-3],[7,9]],'#8da575');
      this.poly([[-4,-h],[7,-h*.75],[25,-3],[7,9],[2,-5]],'#a6b784');
      this.line([[-20,0],[-9,-7],[5,-10],[16,-4]],'#c5c69a66',1);
      this.line([[-13,-8],[-4,-17],[4,-15]],'#c5c69a55',.8);
      if(this.light.winter>0)this.poly([[-4,-h],[7,-h*.75],[3,-h*.62],[-3,-h*.7],[-11,-h*.72]],`rgba(246,248,249,${(this.light.winter*.85).toFixed(3)})`);
    }else if(tile.landform==='mountain'){
      this.poly([[-30,2],[-8,-h],[4,-h*.78],[30,0],[7,10]],'#9aab97');
      this.poly([[-8,-h],[4,-h*.78],[30,0],[7,10],[-2,-h*.43]],'#bac0a6');
      this.poly([[-8,-h],[-17,-h*.6],[-9,-h*.67],[-6,-h*.51],[-1,-h*.67],[8,-h*.54],[4,-h*.78]],'#ecead4');
      this.line([[-18,-4],[-9,-h*.42],[-13,-h*.48]],'#839780',1);
      this.line([[17,-5],[5,-h*.36],[3,-h*.5]],'#9cae91',1);
    }else{
      const active=this.sim.volcanoActiveUntil>this.sim.year;
      this.poly([[-33,2],[-12,-h+8],[-4,-h],[10,-h+5],[33,0],[9,11]],'#8a9481');
      this.poly([[-4,-h],[10,-h+5],[33,0],[9,11],[0,-h*.4]],'#a6aa90');
      this.ellipse(-1,-h+6,12,5,'#b1ac8c');this.ellipse(-1,-h+6,8,3,'#696e5c');
      this.ellipse(-1,-h+7,5,1.7,active?'#dc9a5c':'#b29267');
      if(active){
        this.line([[3,-h+9],[8,-h*.7],[5,-h*.5],[16,-h*.2]],'#c28b53',2.4);
        this.line([[3,-h+9],[8,-h*.7],[5,-h*.5],[16,-h*.2]],'#e2b36e',.8);
      }
      for(let i=0;i<(active?5:2);i++){const f=(this.time*(active?.35:.13)+i*.23)%1;this.ellipse(-2+f*13,-h-2-f*(active?39:18),3+f*(active?10:4),2+f*5,`rgba(181,185,164,${(1-f)*(active?.65:.25)})`);}
    }
    this.ellipse(-21,4,4,2,'#a7ae8a');this.ellipse(18,6,3,1.7,'#b5b896');c.restore();
  }
  // A river, not a canal: a smooth meandering line that starts at a spring below the mountain and widens towards the sea, with sandy banks, reeds and stones.
  drawRiver(){
    const river=this.sim.river;if(!river?.tiles?.length)return;
    const c=this.ctx,seed=(this.sim.seed%97)*.7,tiles=river.tiles.map(k=>k.split(',').map(Number));
    const pts=tiles.map(([x,y])=>this.p(x,y));
    if(river.sea){const q=this.p(river.sea.x,river.sea.y),last=pts.at(-1);pts.push({x:(last.x+q.x)/2,y:(last.y+q.y)/2+4});}
    // Bend the line sideways along its course.
    const bent=pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dy=(b.y-a.y)*2,len=Math.hypot(dx,dy)||1,sway=i===0||i===pts.length-1?0:Math.sin(i*1.35+seed)*7;return{x:p.x-dy/len*sway,y:p.y+dx/len*sway*.5};});
    const n=bent.length,stroke=(width,color)=>{for(let i=0;i<n-1;i++){const a=bent[i],b=bent[i+1],m0=i?{x:(bent[i-1].x+a.x)/2,y:(bent[i-1].y+a.y)/2}:a,m1={x:(a.x+b.x)/2,y:(a.y+b.y)/2};c.beginPath();c.moveTo(m0.x,m0.y);c.quadraticCurveTo(a.x,a.y,m1.x,m1.y);if(i===n-2)c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width(i/(n-1));c.lineCap='round';c.lineJoin='round';c.stroke();}};
    stroke(u=>6+u*9,'#cdbd8e');stroke(u=>3+u*7,'#7fb2bd');stroke(u=>1.2+u*2.4,'#a9d4dc');
    // A small spring and waterfall at the source.
    const src=bent[0];this.ellipse(src.x,src.y,5,2.4,'#7fb2bd');this.line([[src.x-1,src.y-12],[src.x,src.y-1]],'#cfe8ec',1.4);this.line([[src.x+1.5,src.y-10],[src.x+1,src.y-1]],'#b5dde3',.9);
    for(let i=1;i<n-1;i++){const p=bent[i],h=hash(i,tiles[0][0]);
      if(h<.45)for(let k=0;k<3;k++)this.line([[p.x+7+k*1.5,p.y+2],[p.x+6+k*1.8,p.y-4-k]],'#6f8f4f',.8);
      else if(h<.6){this.ellipse(p.x-8,p.y+2,1.8,1.1,'#a9a69a');this.ellipse(p.x-5,p.y+3,1.2,.8,'#bdb9ab');}
      if(!this.reduced){const f=(this.time*.35+i*.37)%1,q=bent[i+1];this.ellipse(p.x+(q.x-p.x)*f,p.y+(q.y-p.y)*f,1.6,.5,'rgba(255,255,255,.65)');}}
  }
  drawWater(){
    const c=this.ctx;
    // A deeper sea: light lagoon water near the island, richer blue-green towards the edges, with glints of sun.
    c.fillStyle=this.sim.storm?'#c5d8d3':'#d6e8e3';c.fillRect(0,0,this.width,this.height);
    const g=c.createRadialGradient(this.width*.55,this.height*.5,40,this.width*.55,this.height*.5,this.width*.7);
    g.addColorStop(0,'#eaf3e6aa');g.addColorStop(.55,'#cfe4df33');g.addColorStop(1,'#9fc4c1aa');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);
    if(!this.reduced)for(let i=0;i<26;i++){const tw=Math.sin(this.time*1.7+i*2.3);if(tw<.7)continue;const x=hash(i,41)*this.width,y=hash(i,43)*this.height;c.fillStyle=`rgba(255,255,250,${(tw-.7)*2})`;c.fillRect(x-2,y,4,.8);c.fillRect(x-.4,y-1.6,.8,4);}
    for(let i=0;i<115;i++){
      const x=hash(i,2)*this.width+Math.sin(this.time*.13+i)*3;
      const y=hash(i,8)*this.height;
      const w=6+hash(i,9)*14;
      const alpha=.2+Math.sin(this.time*.7+i)*.1;
      c.strokeStyle=`rgba(255,255,240,${alpha})`;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.3,y+2,x+w*.7,y-2,x+w,y);c.stroke();
      if(i%5===0){c.strokeStyle='#a4c4b227';c.beginPath();c.moveTo(x-2,y+5);c.lineTo(x+w*.6,y+5);c.stroke();}
    }
    // A quiet coordinate grid gives the sea a cartographic quality.
    c.strokeStyle='#8aaf9b0a';c.lineWidth=.6;
    for(let x=-this.height;x<this.width+this.height;x+=72){c.beginPath();c.moveTo(x,0);c.lineTo(x+this.height*2,this.height);c.stroke();c.beginPath();c.moveTo(x,0);c.lineTo(x-this.height*2,this.height);c.stroke();}
  }
  drawShore(t){
    const p=this.p(t.x,t.y);
    const corners=[[0,-11.5],[23,0],[0,11.5],[-23,0]];
    const adj=[[t.x,t.y-1],[t.x+1,t.y],[t.x,t.y+1],[t.x-1,t.y]];
    for(let i=0;i<4;i++){
      const n=this.sim.tile(...adj[i]);
      if(n?.kind==='water'){
        const a=corners[i],b=corners[(i+1)%4];
        this.line([[p.x+a[0]*1.12,p.y+a[1]*1.12+3],[p.x+b[0]*1.12,p.y+b[1]*1.12+3]],'#eaf2dc',5);
        if(t.natural)this.line([[p.x+a[0],p.y+a[1]+2],[p.x+b[0],p.y+b[1]+2]],t.landform?'#a9b198':'#e0d8a7',7);
      }
    }
  }
  drawGround(t){
    const p=this.p(t.x,t.y),x=p.x,y=p.y;
    if(t.kind==='water')return;
    if(t.kind==='construction'){
      this.drawConstruction(t,p);return;
    }
    if(t.kind==='flooded'){
      this.diamond(x,y,23,11.5,'#a6c8b5');
      this.diamond(x,y+1,21,10,'#b5d2c0');
      return;
    }
    // Two exposed earth faces, with a grassy top. No expensive mesh rebuilds.
    if(this.sim.tile(t.x+1,t.y)?.kind!=='land')this.poly([[x,y+10],[x+23,y-1],[x+23,y+4],[x,y+16]],t.reclaimed?'#a7a184':'#bdb286');
    if(this.sim.tile(t.x,t.y+1)?.kind!=='land')this.poly([[x-23,y-1],[x,y+10],[x,y+16],[x-23,y+4]],t.reclaimed?'#b2ac89':'#d2c594');
    const districtColors={heritage:'#bfc29d',knowledge:'#bec9b3',industry:'#b3b8a1',fields:'#afbe7d',town:'#c2c3a1',gardens:'#a4b984',skyline:'#b5c2a3'};
    const terrain={beach:'#e0d2a2',forest:'#91a574',park:'#acc28a',playground:'#c8bc8c',fairground:'#c7bc93',factory:'#b7bba3',powerplant:'#b7bba3','science-center':'#c1d0b8',school:'#c8d2b3'};
    this.diamond(x,y-2,23.2,11.6,terrain[t.building]||(this.showDistricts&&t.building&&t.district?districtColors[t.district]:null)||(t.reclaimed?'#b2bc86':palette[Math.floor(t.variant*palette.length)]));
    if(this.light.autumn>0&&t.building!=='beach')this.diamond(x,y-2,23.2,11.6,`rgba(206,150,80,${(this.light.autumn*.13).toFixed(3)})`);
    if(this.light.winter>0)this.diamond(x,y-2,23.2,11.6,`rgba(244,246,247,${(this.light.winter*.5).toFixed(3)})`);
    if(t.reclaimed){
      const edge=neighbors(t).some(([x,y])=>this.sim.tile(x,y)?.kind==='water');
      if(edge)this.line([[x-23,y-1],[x,y+10],[x+23,y-1]],'#a59c7a',2.2);
      this.line([[x-17,y-2],[x+16,y-2]],'#c6c59a88',1);
    }
    if(t.variant>.7 && !t.building){
      this.line([[x-5,y-1],[x-5,y-4]],'#85985c',1);
      this.line([[x-5,y-2],[x-8,y-3]],'#85985c',1);
      this.line([[x+9,y+2],[x+10,y-1]],'#8e9e66',1);
    }
  }
  drawDetails(t){
    if(t.kind==='construction')return;
    const p=this.p(t.x,t.y),x=p.x,y=p.y;
    if(!t.building && t.variant>.78 && t.kind==='land'){
      for(let i=0;i<3;i++){const xx=x+(hash(i+t.x,t.y)-.5)*27,yy=y+(hash(t.y,i+t.x)-.5)*8;this.ellipse(xx,yy,1.2,.7,'#d4d7a4');}
    }
    if(t.river){
      // The river: a ribbon of water towards each river neighbour and to the sea at the mouth.
      // A wooden footbridge where a road crosses the river.
      if(t.road){const alongX=(t.roadLinks||[]).some(k=>k===key(t.x+1,t.y)||k===key(t.x-1,t.y));this.ctx.save();this.ctx.translate(x,y+11.5);this.deck(alongX,.3,.12,3,['#a08a64','#7f6a4f','#6f5a40']);this.ctx.restore();}
      const mouth=this.sim.river?.mouth;
      if(mouth&&mouth.x===t.x&&mouth.y===t.y&&this.sim.year>=1250&&this.sim.reclaimed.some(r=>Math.hypot(r.x-t.x,r.y-t.y)<=4)){this.rect(x-6,y-9,12,6,'#8a8f94');this.rect(x-5,y-12,2,3,'#6d7278');this.rect(x+3,y-12,2,3,'#6d7278');}
    }
    if(t.wetUntil>=this.sim.year){this.ellipse(x-10,y+4,5,1.7,'#9dbfb388');this.ellipse(x+12,y,4,1.4,'#a6c7bb99');}
    if(t.crackUntil>=this.sim.year)this.line([[x-15,y-1],[x-8,y+1],[x-5,y-2],[x+2,y+4],[x+8,y+2],[x+15,y+5]],'#967d5d',1.5);
    if(t.scorchedUntil>=this.sim.year||t.burntForest){this.diamond(x,y-1,18,8,'#877b6655');for(let i=0;i<3;i++)this.line([[x-10+i*8,y+2],[x-11+i*8,y-5]],'#696552',2);}
    if(t.ashFertility&&t.building==='farm'){for(let i=0;i<4;i++)this.ellipse(x-12+i*8,y-3+(i%2)*4,1.8,1,'#e0c48d');}
    if(t.spring){this.ellipse(x,y-1,9,4,'#bfdcd0');this.ellipse(x,y-2,6,2.8,'#78aaa5');this.line([[x,y-3],[x+1,y-12]],'#d4eee2',1.6);}
    if(t.mudflowYear)this.line([[x-18,y-5],[x-5,y+2],[x+6,y-2],[x+19,y+5]],'#a58e6877',5);
    if(t.upliftedYear)this.line([[x-15,y+2],[x,y+9],[x+15,y+2]],'#c1b08a',2);
    if(t.plannedMarker){this.diamond(x,y,14,7,'#d5c18d');for(const d of [-10,10]){this.line([[x+d,y],[x+d,y-12]],'#ad9567',1);this.poly([[x+d,y-12],[x+d+7,y-10],[x+d,y-7]],'#d2b16a');}}
    if(t.trailhead){this.line([[x+12,y],[x+12,y-15]],'#a18e66',1.3);this.rect(x+9,y-15,11,4,'#c6b38a');}
    if(t.floodMemorial){this.rect(x+15,y-7,3,8,'#b6b395');this.rect(x+15,y-6,3,1,'#7b9c9a');}
    if(t.irrigated&&t.building==='farm'){this.line([[x-20,y-1],[x-2,y+8],[x+19,y-2]],'#8eb5a7',1.8);}
    if(t.retrofitted&&t.building){this.line([[x-13,y],[x,y+6],[x+13,y]],'#9c9b83',2);}
    if(t.kind==='flooded'){
      this.line([[x-12,y+3],[x+5,y+3]],'#dfede0',1);
      this.line([[x+3,y+7],[x+14,y+7]],'#d8e9dd',.7);
    }
  }
  drawRoads(tiles){
    const roads=tiles.filter(t=>t.road&&t.kind!=='flooded'&&t.kind!=='construction'),edges=[];
    const paved=t=>this.sim.era>=3&&!['forest','beach','park','garden','playground'].includes(t.building);
    // Roads grow up: a fresh trail through the grass, a sandy path, cobbles in the old centre, then asphalt.
    const stage=t=>paved(t)?3:this.sim.year>=1250&&Math.hypot(t.x,t.y)<=6?2:this.sim.year-(t.roadYear??-999)<35?0:1;
    const ROAD_WIDTH=[2.6,4.8,5.6,6],ROAD_COLOR=['#c3bb8d','#c8b68e','#bfb49a','#a5aca1'],JOIN=[5,6.8,7.6,8.5];
    // Project a strip onto the ground plane, with no raised rim or circular couplings.
    const ribbon=(a,b,half,color)=>{
      const dx=b.x-a.x,dy=(b.y-a.y)*2,length=Math.hypot(dx,dy);if(!length)return;
      const nx=-dy/length*half,ny=dx/length*half*.5;
      this.poly([[a.x+nx,a.y+ny],[b.x+nx,b.y+ny],[b.x-nx,b.y-ny],[a.x-nx,a.y-ny]],color);
    };
    for(const t of roads)for(const [nx,ny]of [[t.x+1,t.y],[t.x,t.y+1]]){
      const next=this.sim.tile(nx,ny);
      if(next?.road&&next.kind!=='flooded'&&next.kind!=='construction'&&t.roadLinks?.includes(key(nx,ny)))edges.push({a:this.streetPoint(t),b:this.streetPoint(next),paved:paved(t)&&paved(next),stage:Math.min(stage(t),stage(next)),tile:t});
    }
    for(const edge of edges)ribbon(edge.a,edge.b,ROAD_WIDTH[edge.stage],ROAD_COLOR[edge.stage]);
    // Join every branch with the same flat surface, before any markings or texture.
    for(const t of roads){const p=this.streetPoint(t),k=stage(t);this.diamond(p.x,p.y,JOIN[k],JOIN[k]/2,ROAD_COLOR[k]);}
    for(const {a,b,paved:hard,stage:k,tile} of edges){
      if(k===0)continue;
      if(k===2){for(let i=1;i<6;i++){const f=i/6;this.ellipse(mix(a.x,b.x,f)+(i%2?1.4:-1.4),mix(a.y,b.y,f)+(i%2?.7:-.7),.9,.5,'#d6ceb5');}continue;}
      if(hard){
        ribbon({x:mix(a.x,b.x,.38),y:mix(a.y,b.y,.38)},{x:mix(a.x,b.x,.62),y:mix(a.y,b.y,.62)},.45,'#e8e4cf');
      }else{
        for(const sign of [-1,1]){
          const dx=b.x-a.x,dy=(b.y-a.y)*2,length=Math.hypot(dx,dy),ox=-dy/length*sign*1.7,oy=dx/length*sign*.85;
          this.line([[mix(a.x,b.x,.16)+ox,mix(a.y,b.y,.16)+oy],[mix(a.x,b.x,.84)+ox,mix(a.y,b.y,.84)+oy]],'#b6a37d55',.55);
        }
        const f=.3+tile.variant*.4;this.ellipse(mix(a.x,b.x,f),mix(a.y,b.y,f),.65,.35,'#e1d2ae');
      }
    }
    for(const t of roads){
      const p=this.streetPoint(t),hard=paved(t);
      if(t.building&&!['tree','original-tree','bridge','dock','harbor'].includes(t.building))ribbon(p,this.entrancePoint(t),1.6,hard?'#c1c5b1':'#cdbb96');
      if(hard && this.sim.power>0 && t.variant>.81 && !t.building){
        this.line([[p.x-7,p.y+3],[p.x-7,p.y-11],[p.x-4,p.y-13]],'#7f8c77',1);
        this.ellipse(p.x-4,p.y-13,1.7,1.2,'#f5e6ad');this.lampLight(p.x-4,p.y-13,t);
      }
      if(this.sim.power>0 && t.variant>.91){
        const next=this.sim.tile(t.x+1,t.y);
        this.line([[p.x+15,p.y+3],[p.x+15,p.y-19]],'#8f8865',1);
        this.line([[p.x+11,p.y-16],[p.x+19,p.y-16]],'#a39b7c',1.2);
        if(next?.road){const q=this.p(next.x,next.y);this.line([[p.x+15,p.y-17],[(p.x+q.x)/2+15,(p.y+q.y)/2-13],[q.x+15,q.y-17]],'#7f89744f',.6);}
      }
    }
  }
  drawBuildingSite(t){
    const p=this.p(t.x,t.y),s=t.buildSite,progress=s.progress/s.duration;
    this.diamond(p.x,p.y-2,16,8,'#c1b189');
    for(const [dx,dy]of [[-12,-3],[0,3],[12,-3],[0,-9]]){
      this.line([[p.x+dx,p.y+dy],[p.x+dx,p.y+dy-9-progress*12]],'#af986b',1.5);
    }
    this.line([[p.x-12,p.y-12-progress*12],[p.x,p.y-6-progress*12],[p.x+12,p.y-12-progress*12]],'#d0b887',2);
    this.line([[p.x-12,p.y-4],[p.x+12,p.y-18-progress*8]],'#b29a71',1);
    this.person(p.x-14,p.y+2,'#bd996c',2);
    const hammer=Math.sin(this.activityTime*5)*4;
    this.line([[p.x-13,p.y-3],[p.x-8,p.y-8+hammer]],'#887953',1.3);
    this.line([[p.x-10,p.y-9+hammer],[p.x-6,p.y-8+hammer]],'#8b8e74',2);
    if(progress>.4)this.poly([[p.x-11,p.y-3],[p.x,p.y+2],[p.x,p.y-6],[p.x-11,p.y-11]],'#d4c5a3');
  }
  drawConstruction(t,p){
    const c=this.ctx, project=this.sim.project;
    if(!project)return;
    const stage=project.stage,progress=project.elapsed/[7,5,project.manual?17:10,6,8][stage];
    const x=p.x,y=p.y;
    const fill=stage<2?'#bad1bb':stage===2?(progress<.5?'#adc6aa':'#aaa98a'):stage===3?'#aba17d':'#b9ba88';
    this.diamond(x,y,23.2,11.6,fill);
    if(stage>=2 && stage<=3){
      c.globalAlpha=stage===2?1-progress:Math.max(0,.3-progress*.3);
      this.diamond(x,y-1,21,10,'#b6d1bf');c.globalAlpha=1;
      this.line([[x-9,y-2],[x+8,y-2]],'#dce7d0',1);
    }
    if(stage>=3){for(let i=0;i<3;i++)this.line([[x-12+i*8,y-4+i*2],[x-8+i*8,y-1+i*2],[x-12+i*8,y+1+i*2]],'#8e8b6b50',.6);}
    const ids=new Set(project.tiles);
    const corners=[[0,-11.5],[23,0],[0,11.5],[-23,0]];
    const adj=[[t.x,t.y-1],[t.x+1,t.y],[t.x,t.y+1],[t.x-1,t.y]];
    for(let i=0;i<4;i++){
      if(ids.has(key(...adj[i])))continue;
      const a=corners[i],b=corners[(i+1)%4];
      const f=stage===0?Math.min(1,progress*1.4):1;
      this.line([[x+a[0],y+a[1]-2],[x+mix(a[0],b[0],f),y+mix(a[1],b[1],f)-2]],project.manual?'#a0956c':'#97977d',3.5);
      this.line([[x+a[0],y+a[1]-4],[x+mix(a[0],b[0],f),y+mix(a[1],b[1],f)-4]],'#d2c9a4',1.7);
      if(stage===0){this.line([[x+a[0],y+a[1]],[x+a[0],y+a[1]-9]],'#9d8760',1);this.line([[x+a[0]-2,y+a[1]-8],[x+a[0]+3,y+a[1]-8]],'#e6d6a1',1);}
    }
    if(t===this.sim.tiles.get(project.tiles[project.tiles.length-1])){
      const bob=Math.sin(this.time*3)*.7;
      this.person(x+9,y-3+bob,'#a67853',0);
      if(stage===0)this.line([[x+10,y-8],[x+15+Math.sin(this.time*4)*2,y-12]],'#806e50',1.2);
    }
  }
  drawBuilding(t){
    const p=this.p(t.x,t.y), c=this.ctx;
    this.archStyle=t.material==='stone'&&this.sim.year<120?'classical':t.architecture||this.sim.age.id;
    c.save();c.translate(p.x,p.y-2);
    // A soft shadow to the lower right gives every building weight on the ground.
    if(!['beach','forest','farm','park','garden','town-square','palace-square','tree','original-tree','ruins'].includes(t.building))this.ellipse(9,5,18,6,'rgba(40,55,40,.09)');
    if(t.builtYear && this.sim.year-t.builtYear<3){const s=.75+(this.sim.year-t.builtYear)/12;c.scale(s,s);}
    if(t.kind==='flooded')c.globalAlpha=.78;
    const b=t.building;this.currentTile=t;
    this.look=['hut','house','townhouse'].includes(b)?houseLook(t):null;
    if(this.look)c.scale(this.look.sx,this.look.sy);
    // Special places are drawn larger so they stand out between the houses.
    if(SPECIAL_BIG.has(b))c.scale(1.4,1.4);
    if(b==='original-tree')this.tree(true,t.variant,!!t.bloomYear);
    else if(b==='tree')this.tree(false,t.variant);
    else if(b==='forest')this.forest(t.variant);
    else if(b==='beach')this.beach(t);
    else if(b==='park')this.park(t.variant);
    else if(['shop','bakery','cafe'].includes(b))this.commercial(b,t.variant);
    else if(b==='playground')this.playground();
    else if(b==='fairground')this.fairground();
    else if(b==='hut')this.house(t.variant,t.material==='stone'?1:0);
    else if(b==='house')this.house(t.variant,1);
    else if(b==='townhouse')this.house(t.variant,2);
    else if(b==='tower')this.tower(t.variant);
    else if(b==='lighthouse')this.lighthouse();
    else if(b==='town-square')this.townSquare(t);
    else if(b==='petting-farm')this.pettingFarm(t);
    else if(b==='museum')this.museum();
    else if(b==='monument')this.monumentStatue(t.monument);
    else if(b==='royal-palace'){c.scale(2.1,2.1);this.royal=true;this.palace(true,t.variant);this.royal=false;}
    else if(b==='circus')this.circus();
    else if(b==='zoo')this.zoo();
    else if(b==='watermill')this.watermill();
    else if(b==='watchtower')this.watchtower();
    else if(b==='rose-garden')this.roseGarden();
    else if(b==='grand-fountain')this.grandFountain();
    else if(b==='carillon')this.carillon();
    else if(b==='theme-park')this.themePark();
    else if(b==='station')this.station(t);
    else if(b==='pool')this.pool();
    else if(b==='spaceport')this.spaceport(t);
    else if(b==='observatory')this.observatory();
    else if(b==='ice-cream')this.iceCream(t);
    else if(b==='greenhouse')this.greenhouse();
    else if(b==='manor'||b==='palace'){const y=this.sim.year;if(b==='palace'&&t.castle){const grow=y<1250?1.35:y<1750?1.45:y<1950?1.52:1.6;c.scale(grow,grow);this.castleKeep(y);}else{const grow=b==='palace'?(y<1250?1.5:y<1750?1.7:1.8):1.14;c.scale(grow,grow);this.palace(b==='palace',t.variant);}}
    else if(b==='palace-wing'){this.house(t.variant,2);this.line([[0,-40],[0,-53]],'#a39668',1);this.poly([[0,-53],[9,-50],[0,-47]],'#c8af64');}
    else if(b==='royal-garden')this.formalGarden();
    else if(b==='campus-square'){this.diamond(0,0,22,11,'#d6d6bc');this.line([[-17,0],[0,8],[17,0]],'#aab7a0',2);this.ellipse(0,-3,6,2.5,'#b6c5af');this.poly([[-4,-4],[0,-9],[4,-4],[0,-2]],'#eee9c8');}
    else if(b==='palace-square'){this.diamond(0,0,22,11,'#d4d0b0');this.ellipse(0,-3,7,3,'#a7beb3');this.line([[0,-3],[0,-16]],'#b9cbbd',1.5);this.ellipse(0,-17,2,1,'#d8e3cf');}
    else if(b==='farm')this.farm(t.variant);
    else if(b==='workshop')this.workshop();
    else if(b==='factory')this.factory();
    else if(b==='campfire'){this.campfire();drawFlames(this,0,-4,.95);}
    else if(b==='bonfire')drawBonfire(this);
    else if(b==='festival-ground')drawFestivalGround(this);
    else if(b==='ruins'){this.diamond(0,0,19,9,'#887b66');for(let i=0;i<5;i++){const x=-14+i*7;this.poly([[x,1],[x+5,3],[x+5,-5-i%2*6],[x,-8-i%2*5]],i%2?'#b0a48c':'#c4b494');}}
    else if(b==='quarry'){for(let i=0;i<3;i++){this.diamond(0,-i*4,21-i*5,10-i*2,'#b7b29d');this.line([[-17+i*5,-i*4],[0,8-i*5],[17-i*5,-i*4]],'#918f7e',1);}this.rect(8,-10,6,6,'#8b8d79');}
    else if(b==='fire-station'){this.house(.3,1);this.poly([[-10,-1],[-2,3],[-2,-14],[-10,-18]],'#aa6550');this.rect(2,-15,8,12,'#a46d53');this.line([[-8,-14],[-8,-3]],'#e7c9a2',1);this.line([[14,1],[14,-36]],'#9b8e68',1.5);this.poly([[14,-36],[25,-32],[14,-27]],'#c16c50');if(this.sim.year>=1920){this.rect(-14,5,19,7,'#bd6e54');this.ellipse(-10,13,2,2,'#6d7867');this.ellipse(1,13,2,2,'#6d7867');}}
    else if(b==='well')this.well();
    else if(b==='market')this.market();
    else if(b==='library')this.library();
    else if(b==='school')this.school();
    else if(b==='science-center')this.scienceCenter();
    else if(b==='powerplant')this.powerplant();
    else if(b==='solar')this.solar();
    else if(b==='turbine')this.turbine();
    else if(b==='windmill')this.windmill();
    else if(b==='statue')this.statue(t.variant);
    else if(b==='garden')this.garden();
    else if(b==='theater')this.theater();
    else if(b==='shrine'||b==='church'){if(b==='church'&&this.archStyle==='classical')this.library();else this.church(b==='church');}
    else if(b==='dock'||b==='harbor')this.dock(b==='harbor'&&this.sim.era>=2);
    else if(b==='pump')this.pump(t);
    else if(b==='bridge')this.bridge(t);
    else if(b==='castle-garden')this.castleGarden(t);
    else if(b==='flowers')for(let i=0;i<6;i++){const x=(hash(i,t.x)-.5)*25,y=(hash(t.y,i)-.5)*9;this.line([[x,y],[x,y-4]],'#718a4d',.8);this.ellipse(x,y-5,1.7,1.2,i%2?'#e8d2a1':'#d4b1a1');}
    if(t.extensionLevel){this.poly([[12,3],[23,8],[31,3],[31,-8],[19,-14],[12,-9]],'#d5c5a1');this.poly([[10,-8],[20,-17],[34,-9],[24,-1]],'#b68b6c');for(let i=0;i<Math.min(4,t.extensionLevel);i++)this.rect(17+i*3,-6+i,2,3,'#829c8b');}
    if(t.inspired){this.line([[14,4],[14,-8]],'#b2a273',1);this.poly([[14,-8],[21,-6],[14,-3]],'#c9ab60');this.ellipse(16,5,2.4,1.2,'#d5ba86');}
    if(t.retrofitted){this.line([[-12,2],[0,8],[12,2]],'#a49878',2.8);for(const x of [-9,0,9])this.line([[x,4-Math.abs(x)*.4],[x,7-Math.abs(x)*.4]],'#dad0b1',1.7);}
    if(t.material==='stone'&&['hut','house','townhouse'].includes(b)){for(let i=0;i<3;i++)this.line([[-11,-3-i*4],[-1,2-i*4]],'#a28f7766',.7);this.ellipse(9,-9,2,2,'#c8a469');}
    if(t.quakeDamage){this.line([[-6,-13],[-2,-9],[-4,-5],[0,0]],'#816c51',1.2);this.person(14,4,'#b69768',3);this.ellipse(9,-21,5,3,'#e6d7a9');}
    c.restore();
  }
  forest(v){
    this.line([[-19,4],[-6,0],[5,3],[18,-3]],'#c7bd8e',2.3);
    for(const [i,x,y,s]of [[0,-5,-5,.48],[1,9,-2,.58],[2,-13,0,.53],[3,0,4,.6],[4,14,5,.44]]){
      this.ctx.save();this.ctx.translate(x,y);this.ctx.scale(s,s);this.tree(false,(v+i*.31)%1);this.ctx.restore();
    }
    for(const x of [-12,7]){this.ellipse(x,6,1.6,.8,'#c9baa0');this.line([[x,6],[x,8]],'#c4bc91',.7);}
  }
  park(v){
    this.line([[-20,0],[-6,6],[7,0],[20,5]],'#ddd1a4',2.3);
    this.ellipse(4,-3,8,3.5,'#cbd2aa');this.ellipse(4,-4,6,2.5,'#92b9a3');
    this.ellipse(2,-4,1.5,.7,'#ede4b6');this.ellipse(3,-5,1,.8,'#ede4b6');
    this.ctx.save();this.ctx.translate(-11,-3);this.ctx.scale(.52,.52);this.tree(false,Math.max(.55,v));this.ctx.restore();
    this.line([[8,4],[17,0]],'#9c8a60',2.4);this.line([[8,2],[17,-2]],'#c6b581',2.4);
    this.line([[9,5],[9,7]],'#8e845d',1);this.line([[16,1],[16,3]],'#8e845d',1);
    for(let i=0;i<5;i++)this.ellipse(-5+i*3,-7+(i%2),1.2,.7,i%2?'#d8ba9d':'#dbd59b');
  }
  beach(tile){
    for(let i=0;i<6;i++)this.ellipse((hash(i,tile.x)-.5)*32,(hash(i,tile.y)-.5)*12,1,.5,'#c9bc8e');
    const water=neighbors(tile).map(([x,y])=>this.sim.tile(x,y)).find(t=>t?.kind==='water'&&!t.building);
    if(water){
      const d=this.p(water.x-tile.x,water.y-tile.y),wave=this.reduced?0:Math.sin(this.time*1.2+tile.x)*1.3;
      this.line([[d.x*.55-7,d.y*.55+wave-2],[d.x*.55+5,d.y*.55+wave+3]],'#f3edc9',1.7);
    }
    this.poly([[-12,-2],[-5,1],[-8,5],[-15,2]],'#cfaa8c');
    this.line([[-12,-1],[-6,2]],'#e9d6b3',1);
    const look=hash(tile.x*7+3,tile.y*11-5);
    if(look<.18)for(const [x,y] of [[-16,-4],[-11,-6],[14,3]])this.line([[x,y],[x-1,y-5]],'#a7ae7a',1);
    if(this.sim.year>=1250&&look>.72){
      // A striped beach hut, each in its own colour.
      const stripe=['#c97b6b','#7fa3a8','#e2c26a','#93a77b'][Math.floor(hash(tile.y,tile.x*3)*4)];
      this.poly([[1,-1],[9,3],[9,-9],[1,-13]],'#f1ebd8');this.poly([[9,3],[15,0],[15,-12],[9,-9]],'#d8d0ba');
      for(let i=0;i<3;i++)this.line([[2+i*3,-12+i*1.5],[2+i*3,0+i*1.5]],stripe,1.4);
      this.poly([[0,-13],[9,-9],[16,-12],[7,-17]],stripe);
    }else if(this.sim.era>=1){
      const shade=['#d3ad8a','#c97b6b','#7fa3a8','#e2c26a'][Math.floor(look*4)];
      this.line([[7,0],[7,-17]],'#a2946b',1);
      this.ellipse(7,-17,9,4,shade);
      this.poly([[7,-22],[-2,-17],[7,-17]],'#e7d7af');this.poly([[7,-22],[16,-17],[7,-17]],'#c2957a');
      this.line([[8,4],[14,0],[12,-5]],'#b09c74',1.2);this.line([[8,4],[9,6]],'#9b8f67',1);
    }else this.line([[5,1],[13,4]],'#b9a57a',2);
    this.poly([[-1,6],[3,8],[6,6],[2,4]],'#cab985');this.rect(1,1,2,4,'#c8b37d');
  }
  commercial(type,v){
    this.house(v,1);
    const color=type==='bakery'?'#b78d69':type==='cafe'?'#82967b':'#a68d7e';
    this.poly([[-16,-13],[-1,-6],[1,-11],[-14,-18]],color);
    for(let i=0;i<3;i++)this.poly([[-15+i*5,-13+i*2.4],[-12+i*5,-11.5+i*2.4],[-10+i*5,-16+i*2.4],[-13+i*5,-17.5+i*2.4]],'#e0d3ad');
    this.poly([[-11,-4],[-3,0],[-3,-6],[-11,-10]],'#c8bb8f');
    if(type==='bakery'){
      for(let i=0;i<3;i++){this.ellipse(-9+i*2.8,-6+i*1.2,2,1.1,'#dbb87b');this.line([[-10+i*2.8,-6+i*1.2],[-9+i*2.8,-7+i*1.2]],'#b58d5a',.5);}
      this.ellipse(6,-21,4,2,'#d9bf84');this.line([[4,-22],[5,-20]],'#b58d5a',.7);
    }else if(type==='shop'){
      for(let i=0;i<4;i++)this.ellipse(-10+i*2.4,-6+i,1.4,1,i%2?'#a1ad6a':'#d2ac6d');
      this.rect(5,-23,6,5,'#d9c89c');this.line([[6,-22],[10,-20]],'#9f9771',.8);
    }else{
      for(const [x,y]of [[-17,3],[10,6]]){
        this.line([[x,y],[x,y-5]],'#9c8d65',1);this.ellipse(x,y-5,4,1.8,'#d3bd8c');
        this.rect(x-1,y-8,2,2,'#ece4c2');this.ellipse(x+5,y,1.5,.8,'#9a9c72');
      }
      this.line([[6,-25],[6,-20]],'#decfad',2);this.ellipse(6,-25,3,1,'#decfad');
    }
  }
  playground(){
    this.line([[-15,2],[-11,-16],[-3,-12],[1,6]],'#a68d62',1.8);
    this.line([[-11,-16],[4,-22],[12,-18],[-3,-12]],'#b5a06f',1.8);
    const swing=this.reduced?0:Math.sin(this.activityTime*2)*3;
    this.line([[-5,-15],[-5+swing,-4]],'#8b9270',.7);this.line([[1,-18],[1+swing,-7]],'#8b9270',.7);
    this.line([[-5+swing,-4],[1+swing,-7]],'#bc9b71',2);
    this.line([[11,-1],[11,-13],[17,-10]],'#a38f66',1.4);
    this.poly([[8,-12],[14,-9],[21,3],[17,5]],'#b4bb94');
    this.line([[-2,8],[3,2]],'#a59469',2);const tilt=this.reduced?0:Math.sin(this.activityTime*1.6);
    this.line([[-6,3+tilt],[7,8-tilt]],'#b58a6b',2);
  }
  fairground(){
    this.diamond(0,0,25,12,'#c7bc93');
    this.line([[-13,0],[-5,-28],[5,4]],'#a69a72',2);
    this.line([[-6,3],[-5,-28],[14,2]],'#8e9a7b',1.4);
    const spin=this.wheelTime*.4;
    this.ctx.save();this.ctx.translate(-5,-30);
    this.ctx.beginPath();this.ctx.ellipse(0,0,17,21,0,0,TAU);this.ctx.strokeStyle='#e4d7b1';this.ctx.lineWidth=1.5;this.ctx.stroke();
    for(let i=0;i<8;i++){
      const a=spin+i*TAU/8,x=Math.cos(a)*17,y=Math.sin(a)*21;
      this.line([[0,0],[x,y]],'#acaf8c',.8);
      this.line([[x,y],[x,y+3]],'#9a9e7d',.7);
      this.rect(x-2.4,y+3,4.8,3,['#bf967b','#a6b394','#d3ba86','#8fa9a0'][i%4]);
    }
    this.ellipse(0,0,2.3,2.3,'#c1b482');this.ctx.restore();
    this.ellipse(15,4,9,4,'#ad9d77');this.line([[15,3],[15,-14]],'#aa976c',1);
    this.poly([[5,-7],[15,-17],[25,-7],[15,-3]],'#c6a17e');this.poly([[15,-17],[15,-3],[25,-7]],'#dec89b');
    for(let i=0;i<3;i++){const a=-spin+i*TAU/3;const x=15+Math.cos(a)*6,y=2+Math.sin(a)*2;this.rect(x-2,y-4,4,2,'#d6c8a1');this.line([[x,y-5],[x,y+2]],'#b5a77c',.6);}
    this.line([[-21,5],[-13,9],[1,5]],'#a79974',.7);this.poly([[-18,6],[-15,7],[-17,10]],'#bb967b');this.poly([[-9,8],[-6,7],[-7,11]],'#c8b377');
  }
  campfire(){
    this.ellipse(0,0,12,5,'#dec38b44');
    this.line([[-6,-2],[6,2]],'#8a7650',2.5);this.line([[-5,3],[5,-3]],'#9f8860',2.5);
    const flicker=this.reduced?0:Math.sin(this.time*8)*1.5;
    this.poly([[-4,0],[-3,-7],[0,-13-flicker],[1,-6],[5,-9],[4,0]],'#d8a35f');
    this.poly([[-2,0],[0,-9-flicker],[3,-2],[2,1]],'#efd48d');
    this.ellipse(-8,2,2,1.4,'#a19e7e');this.ellipse(8,2,2,1.4,'#a19e7e');
  }
  well(){
    this.ellipse(0,-1,9,4,'#b5b196');this.rect(-9,-7,18,6,'#c5c0a3');this.ellipse(0,-7,9,4,'#ded2ab');this.ellipse(0,-7,6,2.3,'#78998a');
    this.line([[-7,-7],[-7,-22],[7,-22],[7,-7]],'#9b8b62',1.8);
    this.poly([[-12,-20],[0,-27],[12,-20],[0,-14]],'#a19168');this.line([[0,-18],[0,-9]],'#867e5c',.8);
  }
  market(){
    this.poly([[-15,-3],[0,5],[16,-3],[1,-11]],'#c8b18c');
    this.line([[-13,0],[-13,-16],[13,-16],[13,0]],'#a58c63',1.5);
    this.poly([[-17,-15],[0,-24],[18,-15],[1,-7]],'#b58668');
    for(let i=0;i<4;i++)this.poly([[-15+i*7,-15-i*.1],[-10+i*7,-18],[5+i*3,-11],[i*5,-8]],i%2?'#e2cda4':'#bd916e');
    for(let i=0;i<4;i++){this.ellipse(-8+i*5,-3+Math.abs(2-i),2,1.4,i%2?'#a5ad65':'#d1ae69');}
    this.person(-18,2,'#9da36b');
  }
  // The first home keeps growing: a manor, a castle, a palace, then wings, a dome and finally gold and banners.
  islandFlag(x,y,size=1){
    const id=islandIdentity(this.sim),wave=this.reduced?0:Math.sin(this.time*2.2+x)*1.4*size;
    this.line([[x,y],[x,y-16*size]],'#7d7464',1);this.poly([[x,y-16*size],[x+12*size,y-15*size+wave],[x+12*size,y-8*size+wave],[x,y-9*size]],id.main);
    this.poly([[x,y-10.5*size],[x+12*size,y-9.5*size+wave],[x+12*size,y-8*size+wave],[x,y-9*size]],id.second);this.ellipse(x+6*size,y-12.5*size+wave*.5,1.6*size,1.6*size,id.second);
  }
  // A moat around the castle, drawn on the ground before anything stands on it.
  drawMoat(){
    const court=this.sim.court,t=court&&this.sim.tile(court.x,court.y);if(!t||t.building!=='palace'||!t.castle)return;
    const p=this.p(t.x,t.y),y=this.sim.year,g=y<1250?1.35:y<1750?1.45:y<1950?1.52:1.6;
    this.ellipse(p.x,p.y+1,32*g,16*g,'#9b8f6e');this.ellipse(p.x,p.y+1,30*g,15*g,'#7fb2bd');this.ellipse(p.x,p.y,29*g,14.2*g,'#8fc0ca');
    if(!this.reduced)for(let i=0;i<5;i++){const a=this.time*.2+i*1.25;this.ellipse(p.x+Math.cos(a)*26*g,p.y+1+Math.sin(a)*12.8*g,2,.6,'rgba(255,255,255,.6)');}
    this.diamond(p.x,p.y+1,25*g,12.5*g,'#b9b39b');
    // The drawbridge from the gate across the water.
    this.ctx.save();this.ctx.translate(p.x-9.5*g-8,p.y+5*g+6);this.ctx.scale(g,g);this.deck(false,.36,.1,1.5,['#8a6a4c','#6f5a40','#5f4c36']);this.ctx.restore();
  }
  // Castle gardens differ per island: a formal parterre, roses, an orchard or a hedge maze.
  castleGarden(t){
    const style=t.gardenStyle||'formal',L=this.light||{},flower=L.autumn>.5?'#d9822b':L.winter>.6?'#eef1f3':L.spring>.5?'#f1c6d0':'#d4644f';
    this.diamond(0,0,22,11,'#8fae6a');
    if(style==='formal'){this.diamond(0,0,18,9,'#5f7d4a');this.diamond(0,0,15.5,7.7,'#d8cfae');this.line([[-15,0],[15,0]],'#d8cfae',2.4);this.line([[0,-7.5],[0,7.5]],'#d8cfae',2.4);for(const [x,y] of [[-8,-3],[8,-3],[-8,3],[8,3]]){this.diamond(x,y,5,2.5,'#6f8f4f');this.ellipse(x,y-2,1.4,1.4,flower);}this.poly([[-1.6,0],[0,-9],[1.6,0]],'#4f6b3e');}
    else if(style==='roses'){for(let i=0;i<16;i++){const x=(hash(i,t.x)-.5)*32,y=(hash(t.y,i)-.5)*15;this.ellipse(x,y-1.5,2.4,1.9,'#5f7d4a');this.ellipse(x,y-2.4,1.3,1.1,i%3?flower:'#f3e9c8');}this.line([[-3,4],[-3,-7]],'#8a7552',1);this.line([[3,4],[3,-7]],'#8a7552',1);this.ctx.beginPath();this.ctx.ellipse(0,-7,3,2.4,0,Math.PI,0);this.ctx.strokeStyle='#5f7d4a';this.ctx.lineWidth=1.6;this.ctx.stroke();}
    else if(style==='orchard'){for(let i=0;i<4;i++){const x=-10+(i%2)*20-(i>1?0:0),y=(i<2?-3:3);this.ctx.save();this.ctx.translate(x+(i>1?5:-5),y);this.ctx.scale(.42,.42);this.tree(false,.7+i*.05);this.ctx.restore();this.ellipse(x+(i>1?5:-5)+2,y-14,1.2,1.2,L.autumn>.5||L.summer>.5?'#d4644f':'#f1c6d0');}}
    else{this.diamond(0,0,18,9,'#5f7d4a');for(let k=1;k<4;k++){const f=k/4;this.line([[-18*f,0],[0,-9*f],[18*f,0]],'#8fae6a',1.6);}this.ellipse(0,0,2,1,'#d8cfae');this.person(0,1,'#a37b5f',3);}
  }
  // The island's castle: curtain walls with battlements, round towers with pointed roofs, a keep and a gate.
  // It grows by adding towers, a gatehouse, a palace wing and lights rather than by simply getting bigger.
  castleKeep(year){
    const stone='#ddd6c1',stoneDark='#bcb49c',roof=year>=1750?'#6f9a8c':'#5f6f7a',roofDark=shadeColor(roof,.8),stage=year<1250?0:year<1750?1:year<1950?2:3;
    const merlons=(a,b,h)=>{for(let i=0;i<=6;i++){const u=i/6,x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u-h;this.rect(x-1,y-2.2,2,2.2,stone);}};
    const wall=(a,b,h,face)=>{this.poly([a,b,[b[0],b[1]-h],[a[0],a[1]-h]],face);this.line([[a[0],a[1]-h],[b[0],b[1]-h]],'#c9c2ab',.6);merlons(a,b,h);};
    const tower=(x,y,r,h,flag=false)=>{
      this.ellipse(x,y,r,r*.5,stoneDark);this.rect(x-r,y-h,r,h,stone);this.rect(x,y-h,r,h,stoneDark);this.ellipse(x,y-h,r,r*.5,'#cfc8b2');
      this.window([[x-r*.45,y-h*.55],[x-r*.05,y-h*.55],[x-r*.05,y-h*.55-3.4],[x-r*.45,y-h*.55-3.4]],'#6d7a72');
      this.poly([[x-r-1.2,y-h],[x,y-h-r*2.8],[x,y-h+r*.5]],roof);this.poly([[x,y-h-r*2.8],[x+r+1.2,y-h],[x,y-h+r*.5]],roofDark);
      if(flag)this.islandFlag(x,y-h-r*2.8,.55);
    };
    this.diamond(0,1,24,12,'#b9b39b');
    // Back towers and walls first, then the keep, then the front.
    tower(0,-11,4.2,22,stage>=1);
    wall([-19,-1],[0,-10.5],10,stoneDark);wall([0,-10.5],[19,-1],10,stoneDark);
    // The keep.
    const kh=26+stage*4;
    this.poly([[-9,-3],[0,1.5],[0,1.5-kh],[-9,-3-kh]],stone);this.poly([[0,1.5],[9,-3],[9,-3-kh],[0,1.5-kh]],stoneDark);
    this.poly([[-11,-3-kh],[0,-14-kh],[11,-3-kh],[0,3-kh]],roof);this.poly([[0,-14-kh],[11,-3-kh],[0,3-kh]],roofDark);
    for(let i=0;i<2+Math.min(stage,1);i++){this.window([[-7,-9-i*8],[-4,-7.5-i*8],[-4,-12-i*8],[-7,-13.5-i*8]],'#6d7a72');this.window([[3,-7.5-i*8],[6,-9-i*8],[6,-13.5-i*8],[3,-12-i*8]],'#5f6c65');}
    this.islandFlag(0,-14-kh,.8);
    if(stage>=2){
      // A light palace wing with tall windows in front of the keep.
      this.poly([[-14,2],[-2,8],[-2,-8],[-14,-14]],'#ece4cf');this.poly([[-16,-14],[-8,-19],[0,-14],[-2,-8]],'#8f6f5a');
      for(let i=0;i<3;i++)this.window([[-12+i*3.6,0+i*1.8],[-10+i*3.6,1+i*1.8],[-10+i*3.6,-6+i*1.8],[-12+i*3.6,-7+i*1.8]],'#7d8f88');
    }
    wall([-19,-1],[0,8.5],8,stone);wall([0,8.5],[19,-1],8,stoneDark);
    // The gate, with a gatehouse from the renaissance on.
    this.poly([[-12,3.5],[-7,6],[-7,-1],[-12,-3.5]],'#6f5a40');this.ctx.save();this.ctx.beginPath();this.ctx.ellipse(-9.5,-1.3,2.5,1.6,0,Math.PI,0);this.ctx.fillStyle='#6f5a40';this.ctx.fill();this.ctx.restore();
    if(stage>=1){this.poly([[-14,4.5],[-5,9],[-5,-9],[-14,-13.5]],'#d3ccb6');merlons([-14,4.5-18],[-5,9-18],0);}
    tower(-19,-1,4.8,16+stage*3,stage>=1);tower(19,-1,4.8,16+stage*3,stage>=1);
    // Torches by the gate and on the towers.
    for(const [x,y] of [[-13,-6],[-6,-2],[-19,-20-stage*3],[19,-20-stage*3]]){this.line([[x,y+3],[x,y]],'#6f5a40',1);this.ellipse(x,y-1,1.2,1.6,this.light.darkness>.2?'#ffcf6a':'#d9a24e');this.lampLight(x,y-1,this.currentTile);}
    if(stage>=1)tower(0,9,4.4,13+stage*2,stage>=3);
    if(stage>=3){this.ellipse(-24,8,6,2.4,'#a8c4bd');this.ellipse(24,8,6,2.4,'#a8c4bd');}
  }
  palace(grand,v){
    const year=this.sim.year;
    if(!grand){this.house(v,2);for(const x of [-9,-4])this.line([[x,-1+(x+9)*.5],[x,-12+(x+9)*.5]],'#efe6cc',1.6);this.poly([[-12,-12],[-1,-6],[-1,-8],[-12,-14]],'#c8b48c');this.islandFlag(0,-51,.9);return;}
    if(year<1250&&!this.royal){this.castle();this.islandFlag(-14,-58,.9);return;}
    if(this.royal){for(const side of [-1,1]){const x=side*44;this.poly([[x-9,2],[x,6],[x,-30],[x-9,-34]],'#e8dfc2');this.poly([[x,6],[x+9,2],[x+9,-34],[x,-30]],'#c9c8aa');this.poly([[x-11,-34],[x,-47],[x+11,-34],[x,-28]],'#6f8a8c');this.islandFlag(x,-47,.6);}}
    if(year>=1750){
      // Side wings reach out to both sides, each with its own roof and windows.
      for(const side of [-1,1]){const x=side*31;
        this.poly([[x-12,-1],[x,5],[x,-17],[x-12,-23]],'#e4d9b4');this.poly([[x,5],[x+12,-1],[x+12,-23],[x,-17]],'#c3c6a5');this.poly([[x-14,-23],[x-1,-31],[x+14,-23],[x+1,-15]],year>=1950?'#6f8a8c':'#7e9271');
        for(let k=0;k<2;k++)this.window([[x-9+k*5,-7+k*2.5],[x-6+k*5,-5.5+k*2.5],[x-6+k*5,-12+k*2.5],[x-9+k*5,-13.5+k*2.5]],'#8e9b82');}
    }
    this.diamond(0,0,26,13,'#c9c39b');
    this.poly([[-21,-3],[0,8],[0,-25],[-21,-36]],'#e1d5ae');
    this.poly([[0,8],[21,-3],[21,-36],[0,-25]],'#bfc3a0');
    this.poly([[-25,-36],[-4,-51],[25,-36],[4,-22]],'#7e9271');
    this.poly([[-25,-36],[-4,-51],[4,-22]],'#96a17a');
    for(let i=0;i<3;i++){const x=-16+i*6;this.window([[x,-13+i*3],[x+3,-11+i*3],[x+3,-19+i*3],[x,-21+i*3]],'#8e9b82');}
    for(let i=0;i<3;i++){const x=5+i*6;this.window([[x,-11-i*3],[x+3,-13-i*3],[x+3,-21-i*3],[x,-19-i*3]],'#7b967f');}
    this.poly([[-3,6],[4,2],[4,-11],[-3,-7]],'#9b8964');
    for(const x of [-20,19]){this.rect(x-3,-42,6,20,'#dbd0a8');this.poly([[x-6,-41],[x,-53],[x+6,-41]],year>=1950?'#6f8a8c':'#8d9a70');if(year>=1950)this.islandFlag(x,-53,.6);}
    if(year>=1750){
      // A green copper dome with a golden finial.
      this.ellipse(0,-52,11,9,'#8fae9f');this.ellipse(-3,-55,6,5,'#a8c4b6');this.line([[0,-61],[0,-68]],'#c9a24e',1.4);this.ellipse(0,-69,1.6,1.6,'#e0bb55');
    }
    this.islandFlag(-3,year>=1750?-68:-48,1);
    if(year>=1950){this.line([[-21,-36],[0,-25],[21,-36]],'#d8b45c',1);this.ellipse(0,15,9,3.5,'#b9b39b');this.ellipse(0,14.5,7,2.6,'#a8c4bd');if(!this.reduced)this.ellipse(0,9-Math.abs(Math.sin(this.time*2))*4,1.2,2,'rgba(226,241,238,.9)');}
    this.line([[-9,8],[0,13],[9,8]],'#ddd0a7',2);
    this.ellipse(-18,4,3,1.5,'#8da16a');this.ellipse(18,4,3,1.5,'#8da16a');
  }
  castle(){
    this.poly([[-22,-3],[0,8],[22,-3],[22,-27],[0,-16],[-22,-27]],'#b9bca1');
    this.poly([[-22,-3],[0,8],[0,-16],[-22,-27]],'#d4cbb0');
    for(const [x,y]of [[-20,-3],[0,7],[20,-3]]){
      this.poly([[x-5,y],[x,y+3],[x+5,y],[x+5,y-38],[x,y-41],[x-5,y-38]],'#cbc7ab');
      this.poly([[x,y+3],[x+5,y],[x+5,y-38],[x,y-35]],'#abb69c');
      for(let i=0;i<3;i++)this.rect(x-5+i*4,y-42,2,5,'#dcd2b5');
      this.window([[x-1,y-18],[x+1,y-17],[x+1,y-26],[x-1,y-27]],'#7e9079');
    }
    this.poly([[-7,-1],[-2,2],[-2,-10],[-7,-13]],'#8d7d59');
    this.line([[0,-35],[0,-54]],'#a1936b',1);this.poly([[0,-54],[11,-50],[0,-46]],'#c5ab70');
  }
  library(){
    this.poly([[-18,-3],[0,6],[18,-3],[0,-12]],'#cac3a0');
    this.poly([[-17,-4],[0,4],[0,-18],[-17,-26]],'#d9cfad');this.poly([[0,4],[17,-4],[17,-26],[0,-18]],'#b5bda0');
    this.poly([[-21,-25],[0,-38],[21,-25],[0,-14]],'#889775');
    for(let i=0;i<3;i++)this.line([[-13+i*5,-6+i*2.5],[-13+i*5,-20+i*2.5]],'#e7dab7',2);
    this.poly([[3,-5],[8,-7],[8,-19],[3,-17]],'#7e8f78');
    this.poly([[7,-25],[12,-27],[17,-24],[12,-22]],'#e8dbb5');this.line([[12,-27],[12,-22]],'#a69f7b',.7);
  }
  school(){
    if(this.archStyle==='classical'){this.library();return;}
    this.poly([[-19,-3],[0,7],[19,-3],[19,-23],[0,-33],[-19,-23]],'#d8c9a4');
    this.poly([[0,7],[19,-3],[19,-23],[0,-13]],'#b8c0a0');
    this.poly([[-22,-23],[0,-37],[22,-23],[0,-11]],'#a47e66');
    for(let i=0;i<3;i++)this.poly([[-15+i*5,-12+i*2.5],[-12+i*5,-10.5+i*2.5],[-12+i*5,-16+i*2.5],[-15+i*5,-17.5+i*2.5]],'#e3d7a4');
    this.poly([[3,2],[8,-1],[8,-12],[3,-9]],'#8a9b7f');
    this.line([[16,-22],[16,-43]],'#a2936b',1);this.poly([[16,-43],[25,-40],[16,-37]],'#c9b371');
    this.diamond(-4,8,12,6,'#c4b68c');this.person(-9,7,'#b79874',1);this.person(-3,10,'#98a079',2);
  }
  scienceCenter(){
    this.poly([[-22,-3],[-2,7],[21,-4],[1,-15]],'#bdc8ad');
    this.poly([[-21,-4],[-2,6],[-2,-11],[-21,-21]],'#dce0c5');this.poly([[-2,6],[20,-5],[20,-22],[-2,-11]],'#9fb8aa');
    this.poly([[-22,-21],[-2,-11],[21,-22],[0,-33]],'#c9d4bb');
    this.ellipse(1,-26,12,6,'#adc7b9');this.ellipse(1,-29,10,9,'#cbdcc8');
    this.line([[1,-37],[1,-22]],'#92b0a1',.8);this.line([[-7,-30],[9,-25]],'#b8cec0',.8);
    for(let i=0;i<4;i++)this.poly([[-17+i*4,-10+i*2],[-15+i*4,-9+i*2],[-15+i*4,-14+i*2],[-17+i*4,-15+i*2]],'#8daea1');
    this.line([[17,-25],[17,-40]],'#a0ac93',1);this.ellipse(17,-40,5,2,'#d8dfc1');
    this.line([[16,-40],[21,-45]],'#94a58d',1);this.ellipse(21,-45,1.4,1.4,'#cfc896');
  }
  factory(){
    this.poly([[-20,-5],[0,5],[20,-5],[0,-15]],'#b0ae8c');
    this.poly([[-19,-6],[0,4],[0,-15],[-19,-25]],'#b7a38b');this.poly([[0,4],[19,-6],[19,-25],[0,-15]],'#9aab97');
    this.poly([[-21,-24],[-14,-33],[-7,-27],[0,-35],[9,-27],[21,-25],[0,-13]],'#819283');
    for(let i=0;i<3;i++)this.poly([[-15+i*5,-10+i*2.5],[-12+i*5,-8+i*2.5],[-12+i*5,-14+i*2.5],[-15+i*5,-16+i*2.5]],'#d9cb96');
    this.poly([[12,-19],[18,-22],[18,-49],[12,-46]],'#a18c75');this.poly([[9,-21],[12,-19],[12,-46],[9,-48]],'#c0a387');
    for(let i=0;i<4;i++){const f=(this.time*.25+i*.25)%1;this.ellipse(14+f*12,-50-f*30,3+f*6,2+f*4,`rgba(196,199,177,${(1-f)*.6})`);}
  }
  powerplant(){
    this.poly([[-15,-5],[0,3],[15,-5],[0,-13]],'#b5b395');
    this.poly([[-14,-6],[0,1],[0,-18],[-14,-25]],'#c0c1a2');this.poly([[0,1],[14,-6],[14,-25],[0,-18]],'#9cae98');
    this.ellipse(0,-22,14,6,'#bbc7ad');this.poly([[-2,-20],[3,-28],[1,-22],[5,-23],[0,-15],[1,-20]],'#e6cf85');
    this.line([[-10,-22],[-10,-42],[-4,-42],[-4,-23]],'#a3a590',3);
    const spin=this.activityTime*2;this.ellipse(10,-4,4,4,'#7f9481');this.line([[10-Math.cos(spin)*3,-4-Math.sin(spin)*3],[10+Math.cos(spin)*3,-4+Math.sin(spin)*3]],'#c4c8a1',1.3);
    if(this.sim.era>=4){this.ellipse(0,-28,9,3,'#b3c9a244');this.ellipse(0,-32,7,2,'#dce9b8');}
    else for(let i=0;i<3;i++){const f=(this.time*.3+i*.33)%1;this.ellipse(-7+f*8,-45-f*16,2+f*3,2+f*2,`rgba(229,231,211,${(1-f)*.6})`);}
  }
  solar(){
    for(const x of [-10,5]){this.line([[x,0],[x,-10]],'#8f9e84',1);this.poly([[x-6,-13],[x+7,-8],[x+5,1],[x-8,-4]],'#779792');this.line([[x-6,-8],[x+5,-3]],'#bbd0b44f',.7);this.line([[x,-10],[x-1,-1]],'#bbd0b455',.7);}
  }
  turbine(){
    this.ellipse(2,2,9,3,'#78977a19');this.line([[0,0],[0,-46]],'#c5c9ae',2.7);
    const c=this.ctx;c.save();c.translate(0,-45);c.rotate(this.activityTime*.65);
    for(let i=0;i<3;i++){c.rotate(TAU/3);this.poly([[0,0],[-2,-22],[2,-19],[2,-2]],'#e2e3c8');}this.ellipse(0,0,2,2,'#a2b39a');c.restore();
  }
  windmill(){
    this.poly([[-8,0],[0,4],[9,0],[5,-24],[-5,-28]],'#d4c7a5');this.poly([[-9,-25],[0,-36],[9,-25]],'#929776');
    const c=this.ctx;c.save();c.translate(2,-23);c.rotate(this.activityTime*.4);
    for(let i=0;i<4;i++){c.rotate(Math.PI/2);this.line([[0,0],[0,-20]],'#a59066',1.2);this.poly([[0,-7],[5,-7],[5,-20],[0,-20]],'#d9cc9c');this.line([[1,-12],[5,-12]],'#b6a980',.7);}this.ellipse(0,0,2,2,'#978766');c.restore();
  }
  statue(variant=0){
    this.diamond(0,0,12,6,'#c7c5a7');this.poly([[-6,-1],[0,2],[6,-1],[6,-10],[0,-13],[-6,-10]],'#b6b79c');
    const style=Math.floor((variant*100+this.sim.seed)%3);
    if(style===0){this.poly([[-4,-11],[-3,-22],[0,-29],[4,-21],[4,-11]],'#8a9c85');this.ellipse(0,-30,3,4,'#a0ad91');}
    else if(style===1){this.poly([[-4,-12],[-3,-31],[0,-40],[4,-30],[4,-12]],'#a6af91');this.poly([[0,-40],[4,-30],[4,-12],[0,-10]],'#8e9f85');}
    else{this.ellipse(0,-21,7,9,'#8ca28e');this.ellipse(0,-21,4,6,'#bbbc98');this.line([[-6,-15],[6,-27]],'#a8b699',2);}
    this.ellipse(6,1,2,1,'#c9b77d');
  }
  garden(){
    this.diamond(0,-2,21,10,'#a1b47a');this.line([[-17,-3],[0,5],[17,-3]],'#d6c69d',2);
    for(let i=0;i<8;i++){const x=(hash(i,4)-.5)*28,y=(hash(i,8)-.5)*10;this.ellipse(x,y,2.2,1.3,i%3?'#bca5a1':'#e6d09b');}
    this.ellipse(0,-5,5,2,'#b8c4a0');this.ellipse(0,-6,3.3,1.3,'#8fb5a2');
    this.line([[10,2],[15,-1]],'#a2936a',2.5);
  }
  theater(){
    if(this.archStyle==='classical'){
      this.diamond(0,0,24,12,'#cabb9a');
      for(let i=0;i<4;i++){const w=22-i*4,y=-3-i*2;this.line([[-w,2],[-w+3,y-7],[0,y-14],[w-3,y-7],[w,2]],i%2?'#e2d4af':'#c8c3a4',2.3);}
      this.diamond(0,3,12,5,'#b8aa85');this.person(-4,0,'#bca076');this.person(5,2,'#9ca67a');return;
    }
    this.diamond(0,0,22,11,'#c9b692');
    this.poly([[-18,-3],[0,6],[18,-3],[0,-12]],'#b79c7b');
    this.poly([[-18,-3],[-18,-23],[0,-32],[18,-23],[18,-3],[13,-6],[13,-20],[0,-26],[-13,-20],[-13,-6]],'#c9b9a1');
    this.poly([[-12,-5],[0,1],[12,-5],[0,-11]],'#a68371');this.line([[-13,-19],[0,-25],[13,-19]],'#e0cda4',2);
    this.person(-4,-7,'#bc9671',3);this.person(5,-5,'#8f9a72',1);
  }
  church(large){
    if(!large){this.diamond(0,0,9,4,'#c4b995');this.rect(-3,-11,6,11,'#d1c39f');this.poly([[-7,-11],[0,-19],[7,-11]],'#999e74');this.line([[0,-17],[0,-25]],'#a89c6f',1);this.ellipse(0,-25,2,2,'#d6bc7b');return;}
    this.poly([[-15,-4],[0,4],[15,-4],[15,-23],[0,-31],[-15,-23]],'#d5ccb0');
    this.poly([[-19,-23],[-3,-39],[19,-23],[3,-14]],'#899a7b');
    this.poly([[3,-2],[11,-6],[11,-34],[3,-30]],'#c0c2a1');
    this.poly([[-4,-6],[3,-2],[3,-30],[-4,-34]],'#e0d3b2');
    this.poly([[-7,-33],[3,-47],[14,-33],[3,-27]],'#8d9b76');
    this.line([[3,-45],[3,-58]],'#a89d71',1.3);this.line([[-1,-53],[7,-53]],'#a89d71',1.3);
    this.poly([[-8,-6],[-2,-3],[-2,-14],[-8,-17]],'#9ba68a');this.ellipse(7,-22,2,3,'#d7bf85');
  }
  tree(original,v,bloom=false){
    const c=this.ctx;
    this.ellipse(5,3,original?23:15,original?8:5,'#556f3a19');
    if(!original && v<.5){
      this.line([[0,1],[0,-29]],'#7c7650',2.7);
      this.poly([[-13,-8],[0,-31],[13,-8]],'#6f8758');
      this.poly([[-11,-17],[0,-39],[11,-17]],'#829866');
      this.poly([[-8,-26],[0,-45],[8,-26]],'#93a570');
      this.line([[0,-39],[0,-11]],'#9caf762b',1);
      if(this.light.winter>0){const snow=`rgba(246,248,249,${(this.light.winter*.9).toFixed(3)})`;this.poly([[-5,-34],[0,-45],[5,-34],[0,-37]],snow);this.poly([[-9,-21],[-3,-27],[1,-24],[-5,-19]],snow);}
      return;
    }
    const s=original?1.23:.85;c.save();c.scale(s,s);
    const sway=this.reduced?0:Math.sin(this.time*.8+v)*.8;
    this.line([[0,0],[-1,-23],[-8,-35]],'#756b45',4);
    this.line([[-1,-15],[7,-29],[12,-36]],'#80764b',2.7);
    this.line([[-1,-21],[-10,-28]],'#756b45',2.2);
    c.translate(sway,0);
    this.ellipse(0,-40,19,15,this.leaf('#6f8752'));
    this.ellipse(-12,-35,12,12,this.leaf('#7e965c'));
    this.ellipse(13,-37,13,11,this.leaf('#789151'));
    this.ellipse(-6,-48,13,11,this.leaf('#8da368'));
    this.ellipse(8,-49,11,9,this.leaf('#98ad71'));
    this.ellipse(-16,-41,7,7,this.leaf('#8fa66a'));
    this.ellipse(16,-42,8,8,this.leaf('#91a763'));
    this.ellipse(1,-37,10,9,this.leaf('#819856'));
    this.ellipse(-5,-48,4,2,this.leaf('#a7b97755'));
    if(this.light.spring>.2&&!bloom)for(const [x,y] of [[-12,-40],[-4,-50],[8,-47],[14,-38],[2,-36],[-15,-33]].filter((_,i)=>(v*7+i)%3<2))this.ellipse(x,y,1.7,1.4,`rgba(241,206,212,${(this.light.spring*.9).toFixed(3)})`);
    if(original&&bloom){
      for(const [i,[x,y]] of [[-14,-40],[-7,-49],[3,-53],[13,-46],[17,-36],[5,-38],[-5,-32],[-17,-32],[9,-29]].entries()){
        const color=i%2?'#f3d6c5':'#f7e7d1';
        for(let petal=0;petal<4;petal++){const a=petal*Math.PI/2;this.ellipse(x+Math.cos(a)*1.8,y+Math.sin(a)*1.8,1.8,1.5,color);}
        this.ellipse(x,y,1,1,'#cbaa71');
      }
      if(!this.reduced)for(let i=0;i<3;i++){const f=(this.time*.12+i*.32)%1;this.ellipse(-12+i*11+Math.sin(f*6+i)*3,-37+f*43,1.2,.7,'#eed5bfaa');}
    }
    if(original){this.line([[-11,5],[7,10]],'#897c58',1.6);this.line([[-11,3],[7,8]],'#b4aa79',2.3);this.line([[-8,5],[-8,8]],'#7e7650',1.1);this.line([[4,8],[4,11]],'#7e7650',1.1);}
    c.restore();
  }
  leaf(color){return seasonalLeaf(color,this.light);}
  // Record a window or lamp in screen pixels, so the night layer can light exactly that shape.
  screenPoint(x,y){const m=this.ctx.getTransform?.();if(!m||typeof m.a!=='number')return null;return[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];}
  window(points,color){
    this.poly(points,color);
    if(this.light.darkness<.15||!this.currentTile)return;
    // Not every window is lit: each has its own habits, and later at night more lights go out. Castles keep theirs on.
    const t=this.currentTile,grand=t.castle||['palace','manor','royal-palace'].includes(t.building),n=this.litWindows.length,habit=hash(t.x*7+n,t.y*13-n),late=this.light.phase<.25?.25:0;
    if(!grand&&habit>.62-late)return;
    const mapped=points.map(([x,y])=>this.screenPoint(x,y)),base=this.screenPoint(0,0);if(mapped.every(Boolean)&&base)this.litWindows.push({tile:t,points:mapped,baseY:base[1],unit:this.zoom*this.dpr,grand});
  }
  lampLight(x,y,tile=null){
    if(this.light.darkness<.15)return;const p=this.screenPoint(x,y);if(!p)return;const m=this.ctx.getTransform();
    this.litLamps.push({x:p[0],y:p[1],scale:Math.hypot(m.a,m.b),tile});
  }
  treasureChest(t){
    const p=this.p(t.x,t.y),c=this.ctx;c.save();c.translate(p.x+11,p.y+3);
    this.ellipse(1,2,7,2.5,'#5a5a3d22');
    this.poly([[-5,-1],[0,1.5],[0,-3.5],[-5,-6]],'#8d6542');this.poly([[0,1.5],[5,-1],[5,-6],[0,-3.5]],'#74543a');
    this.poly([[-5,-6],[0,-3.5],[2,-10],[-3,-12.5]],'#a37a4f');this.line([[-2.5,-4.6],[-2.5,-.4]],'#d8b45c',1);
    this.ellipse(-1,-5,3,1.3,'#f1d77a');
    if(!this.reduced)for(let i=0;i<3;i++){const f=(this.time*.5+i*.33)%1;this.ellipse(-1+Math.sin(i*2+f*4)*3,-7-f*10,.9,.9,`rgba(255,236,160,${(1-f)*.9})`);}
    c.restore();
  }
  // The village square grows with the island: a fire circle, a fountain, later a bandstand and lanterns.
  townSquare(t){
    const year=this.sim.year,role=squareRole(t),c=this.ctx;
    this.diamond(0,0,23,11.5,year>=120?'#d9d1b3':'#cdbf96');
    // Cobbles: two sets of lines parallel to the diamond's edges.
    if(year>=120)for(let k=1;k<4;k++){const f=k/4;this.line([[-23*f,-11.5+11.5*f],[23-23*f,11.5*f]],'#c4b99466',.5);this.line([[23*f,-11.5+11.5*f],[-23+23*f,11.5*f]],'#c4b99466',.5);}
    const planter=(x,y)=>{this.rect(x-3,y-2,6,3,'#a7957a');this.ellipse(x,y-5,4.5,4,this.leaf('#7e965c'));this.ellipse(x+1.5,y-7,3,2.6,this.leaf('#91a763'));};
    const bench=(x,y)=>{this.line([[x-5,y],[x+5,y-5]],'#8f7a58',1.8);this.line([[x-5,y-3],[x+5,y-8]],'#a58e66',1.2);};
    const lamp=(x,y)=>{if(year<1880)return;this.line([[x,y],[x,y-14]],'#5f6b62',1);this.ellipse(x,y-15,1.8,1.8,this.light.darkness>.2?'#ffe6a6':'#e8e2c2');this.lampLight(x,y-15,null);};
    if(role==='centre'){
      if(year<120){
        this.ellipse(0,0,8,4,'#9c8e72');this.ellipse(0,-.5,5,2.5,'#6f5e4b');for(const [x,y] of [[-12,1],[11,-2],[0,7]])this.line([[x-4,y],[x+4,y-1]],'#8a7552',2.4);
      }else if(year<1750){
        this.ellipse(0,1,11,5.5,'#b9b39b');this.ellipse(0,0,9.5,4.5,'#a8c4bd');this.rect(-1.2,-12,2.4,12,'#c9c3aa');this.ellipse(0,-12,4,1.8,'#bdb69c');
        if(!this.reduced)for(let i=0;i<4;i++){const f=(this.time*.9+i*.25)%1,a=i*Math.PI/2;this.ellipse(Math.cos(a)*f*6,-13+f*12-Math.sin(f*Math.PI)*5,.9,.9,`rgba(226,241,238,${(1-f)*.9})`);}
      }else{
        // A bandstand with a striped roof, where someone is always tuning an instrument.
        this.poly([[-12,0],[0,6],[12,0],[0,-6]],'#c4b796');
        for(const [x,y] of [[-9,0],[0,4.5],[9,0],[0,-4.5]])this.line([[x,y],[x,y-15]],'#efe9d8',1.3);
        this.poly([[-14,-15],[0,-24],[14,-15],[0,-9]],'#b8644f');this.poly([[-14,-15],[0,-9],[0,-24]],'#c97b6b');this.line([[0,-24],[0,-28]],'#8c5a48',1);
        this.person(-3,1,'#7f9481',1);this.person(3,0,'#c09870',2);
      }
      lamp(17,2);
    }else if(role==='market'){
      const awning=['#c97b6b','#7fa3a8','#e2c26a'];
      for(const [i,[x,y]] of [[-8,-2],[7,2]].entries()){this.line([[x-5,y+2],[x-5,y-9]],'#8a7552',1);this.line([[x+5,y-3],[x+5,y-14]],'#8a7552',1);this.poly([[x-7,y-8],[x+7,y-15],[x+8,y-12],[x-6,y-5]],awning[i]);this.poly([[x-5,y],[x+5,y-5],[x+5,y-3],[x-5,y+2]],'#b29b74');this.ellipse(x-1,y-2,1.5,1,'#d7a25a');this.ellipse(x+2,y-3,1.5,1,'#9cae6a');}
      this.person(0,6,'#a37b5f',3);lamp(-18,1);
    }else if(role==='garden'){
      // A small park on the square: a pond with ducks, flower beds and two trees.
      this.ellipse(-4,2,10,4.5,'#9fbfb2');this.ellipse(-4,1.5,8,3.4,'#b3d2c6');
      const swim=this.reduced?0:Math.sin(this.time*.6)*3;this.ellipse(-6+swim,0,1.8,1.1,'#f2efe4');this.ellipse(-4.6+swim,-.8,.9,.8,'#3f6b4c');this.ellipse(-1-swim,2.4,1.6,1,'#a07c55');
      for(let i=0;i<7;i++)this.ellipse(8+i*1.8,4-i*1.6,1.3,1.1,['#d58f7a','#e2c26a','#c98fb0'][i%3]);
      c.save();c.translate(12,-6);c.scale(.5,.5);this.tree(false,.7);c.restore();c.save();c.translate(-15,-4);c.scale(.45,.45);this.tree(false,.62);c.restore();
      lamp(16,6);
    }else if(role==='monument'&&t.monument){
      this.ellipse(0,1,9,4.5,'#c8bd98');this.monumentStatue(t.monument);bench(-13,5);bench(13,4);
    }else if(role==='monument'){
      // A sundial until the island raises its first statue here.
      this.ellipse(0,1,9,4.5,'#c8bd98');this.poly([[-3,0],[0,1.5],[3,0],[3,-7],[0,-5.5],[-3,-7]],'#d9d1b8');this.ellipse(0,-7,4,1.8,'#c9c1a8');this.line([[0,-7],[2,-11]],'#8a7552',1);
      bench(-13,5);bench(13,4);this.person(13,3,'#c09870',5);
    }else if(role==='back'){
      planter(-12,-1);planter(12,-1);bench(0,3);this.person(-2,2,'#899e78',4);
      // The island's own flag on the square.
      const id=islandIdentity(this.sim),wave=this.reduced?0:Math.sin(this.time*2.4)*1.2;
      this.line([[6,-2],[6,-34]],'#6d675a',1);this.poly([[6,-34],[19,-33+wave],[19,-25+wave],[6,-26]],id.main);this.poly([[6,-27.6],[19,-26.6+wave],[19,-25+wave],[6,-26]],id.second);this.ellipse(12.5,-30+wave*.5,1.8,1.8,id.second);
    }else{
      // The front stays low, so the square is never hidden: a flower bed and a bench.
      this.diamond(0,1,9,4.5,'#b9a77d');for(let i=0;i<6;i++)this.ellipse(-5+i*2,1+(i%2?-1:1),1.3,1.1,['#d58f7a','#e2c26a','#c98fb0'][i%3]);
      bench(-13,6);bench(13,-4);lamp(0,-8);
    }
  }
  // Loose trees and shrubs on empty ground; they simply make way when something is built.
  meadowTree(t){
    const p=this.p(t.x,t.y),c=this.ctx,v=hash(t.y*3,t.x*7),dx=(hash(t.x,t.y*9)-.5)*20,dy=(hash(t.x*9,t.y)-.5)*7;
    c.save();c.translate(p.x+dx,p.y+dy);
    if(v<.35){this.ellipse(0,0,7,2.5,'#55703a18');this.ellipse(0,-3,6,4,this.leaf('#86a062'));this.ellipse(3,-4,4,3,this.leaf('#9bb173'));}
    else{c.scale(.55,.55);this.tree(false,v);}
    c.restore();
  }
  monumentStatue(kind){
    const stone='#cfc8b3',dark='#aaa38e',bronze='#8a7350';
    this.ellipse(3,3,13,4,'#58654414');this.poly([[-7,0],[0,3.5],[7,0],[0,-3.5]],'#bdb59d');this.poly([[-5,-1],[0,1.5],[0,-8],[-5,-10.5]],stone);this.poly([[0,1.5],[5,-1],[5,-10.5],[0,-8]],dark);this.poly([[-5,-10.5],[0,-8],[5,-10.5],[0,-13]],'#ddd6c2');
    if(kind==='hand'){this.ellipse(0,-34,11,6,'#eef0ea');this.ellipse(-6,-35,6,4.5,'#f6f7f2');this.poly([[-3,-12],[3,-12],[4,-24],[-4,-24]],stone);for(let i=0;i<4;i++)this.poly([[-4+i*2.3,-24],[-2.6+i*2.3,-24],[-2.8+i*2.3,-31+Math.abs(i-1.5)],[-4.2+i*2.3,-31+Math.abs(i-1.5)]],stone);this.poly([[4,-22],[6.5,-26],[5.4,-27],[3.4,-24]],stone);}
    else if(kind==='watcher'){this.line([[-9,4],[-1,8]],'#8f7a58',1.8);this.line([[-9,1],[-1,5]],'#a58e66',1.2);this.ellipse(4,-14,2.6,1.2,'#d58f7a');this.ellipse(-2,-14,2,1,'#e2c26a');}
    else if(kind==='founder'){this.ellipse(0,-14,3.4,2,bronze);this.poly([[-3,-13],[3,-13],[2.4,-25],[-2.4,-25]],bronze);this.ellipse(0,-27.5,2.4,2.4,bronze);this.poly([[-3.5,-29],[3.5,-29],[0,-32]],'#6f5c40');this.line([[3,-22],[7,-33]],'#6f5c40',1.2);this.line([[5.5,-33],[8.5,-32]],'#6f5c40',1.2);}
    else if(kind==='chicken'){this.ellipse(0,-20,7,6,stone);this.ellipse(5,-27,3.4,3.4,stone);this.poly([[8,-27.5],[11,-26.5],[8,-25.5]],'#d9a24e');this.poly([[4,-31],[5,-33.5],[6,-31]],'#c0574d');this.poly([[-6,-22],[-11,-27],[-7,-18]],dark);}
    else if(kind==='cat'){this.ellipse(0,-17,4.6,5,bronze);this.ellipse(0,-25,3.4,3,bronze);this.poly([[-2.6,-27],[-2,-30.5],[-.6,-27.6]],bronze);this.poly([[2.6,-27],[2,-30.5],[.6,-27.6]],bronze);this.line([[4,-13],[8,-20]],bronze,1.4);}
    else{this.poly([[-4,-11],[4,-11],[3,-20],[0,-31],[-2,-22],[-4,-26]],'#d1a074');this.poly([[-1.5,-12],[2,-12],[1.5,-18],[0,-24],[-1,-18]],'#efc98a');}
  }
  watchtower(){
    this.ellipse(4,4,14,5,'#58654418');
    for(const [x,y] of [[-7,0],[7,0],[0,4],[0,-4]])this.line([[x,y],[x*.5,y*.5-34]],'#7f6a4f',1.6);
    for(let k=1;k<4;k++){const f=k/4;this.line([[-7+3.5*f,-34*f],[7-3.5*f,-34*f]],'#9b8463',1);}
    this.poly([[-7,-34],[0,-31],[7,-34],[0,-37]],'#a08a64');this.poly([[-8,-41],[0,-48],[8,-41],[0,-38]],'#a5483c');
    this.person(-2,-35,'#a37b5f',1);this.person(3,-34,'#7f9481',2);this.islandFlag(0,-48,.6);
  }
  roseGarden(){
    this.diamond(0,0,22,11,'#9fb47a');for(const [a,b] of [[[-20,0],[0,-10]],[[0,-10],[20,0]],[[20,0],[0,10]],[[0,10],[-20,0]]])this.line([a,b],'#5f7d4a',3);
    for(let i=0;i<14;i++){const x=(hash(i,3)-.5)*30,y=(hash(i,5)-.5)*14;this.ellipse(x,y-2,2.2,1.8,'#6f8f4f');this.ellipse(x,y-3,1.3,1.1,['#e48aa0','#d4644f','#f1c6d0','#f3e9c8'][i%4]);}
    this.line([[-4,4],[-4,-10]],'#8a7552',1);this.line([[4,4],[4,-10]],'#8a7552',1);this.ctx.beginPath();this.ctx.ellipse(0,-10,4,3,0,Math.PI,0);this.ctx.strokeStyle='#6f8f4f';this.ctx.lineWidth=2;this.ctx.stroke();for(let i=0;i<5;i++)this.ellipse(-4+i*2,-12+Math.abs(i-2)*.8,1,1,'#e48aa0');
  }
  grandFountain(){
    this.diamond(0,0,22,11,'#d9d1b3');this.ellipse(0,1,16,7,'#b9b39b');this.ellipse(0,0,14,6,'#8fc0c8');this.ellipse(0,-6,7,3,'#c9c3aa');this.ellipse(0,-7,6,2.4,'#a8d0d6');this.rect(-1.5,-16,3,9,'#d9d1b3');this.ellipse(0,-16,3,1.3,'#c9c3aa');
    if(!this.reduced)for(let i=0;i<10;i++){const f=(this.time*.8+i/10)%1,a=i/10*Math.PI*2;this.ellipse(Math.cos(a)*f*11,-17+f*16-Math.sin(f*Math.PI)*8,1,1,`rgba(226,241,245,${(1-f)*.95})`);}
  }
  carillon(){
    this.ellipse(4,4,14,5,'#58654418');
    this.poly([[-6,-2],[0,1],[0,-40],[-6,-43]],'#ddd2b4');this.poly([[0,1],[6,-2],[6,-43],[0,-40]],'#bdb699');
    this.poly([[-5,-30],[0,-28],[0,-36],[-5,-38]],'#5d564b');const swing=this.reduced?0:Math.sin(this.time*2)*1.2;this.ellipse(-2.5+swing,-32,1.8,2.2,'#c9a24e');
    this.ellipse(3,-20,2.4,2.4,'#f3eedd');this.line([[3,-20],[3,-22]],'#3f3a36',.6);this.poly([[-8,-43],[0,-54],[8,-43],[0,-40]],'#6f8a8c');this.line([[0,-54],[0,-58]],'#c9a24e',1);
  }
  watermill(){
    this.ellipse(4,4,15,5,'#58654418');
    this.poly([[-12,-2],[0,4],[0,-14],[-12,-20]],'#d9c7a6');this.poly([[0,4],[10,-1],[10,-19],[0,-14]],'#b8a586');this.poly([[-14,-19],[-2,-30],[12,-19],[0,-12]],'#8a6a4c');
    const c=this.ctx;c.save();c.translate(12,-6);c.rotate(this.reduced?0:this.time*1.4);for(let i=0;i<8;i++){c.rotate(Math.PI/4);this.line([[0,0],[0,-9]],'#7a6248',1.2);this.rect(-1.5,-10,3,3,'#9b8463');}c.restore();this.ellipse(12,-6,2,2,'#6f5a40');
    this.window([[-8,-6],[-4,-4],[-4,-10],[-8,-12]],'#7d937c');
  }
  zoo(){
    const t=this.reduced?0:this.time;
    this.diamond(0,0,22,11,'#b9c58f');for(const [a,b] of [[[-22,0],[0,-11]],[[0,-11],[22,0]],[[22,0],[0,11]],[[0,11],[-22,0]]])this.line([a,b],'#8a7552',.9);
    this.line([[-11,-5.5],[11,5.5]],'#8a7552',.8);
    // Giraffe, elephant and a pool of penguins.
    const gx=-10+Math.sin(t*.3)*2;this.ellipse(gx,-6,4,2.4,'#d9a858');this.line([[gx+3,-7],[gx+6,-19]],'#d9a858',2.2);this.ellipse(gx+6.6,-19.5,2,1.3,'#d9a858');for(const lx of [-2,2])this.line([[gx+lx,-4],[gx+lx,0]],'#b88a45',1);this.ellipse(gx-1,-6.5,1,.8,'#9c6d36');this.ellipse(gx+1.6,-5.4,.9,.7,'#9c6d36');
    const ex=8+Math.sin(t*.2)*1.5;this.ellipse(ex,-5,5.5,4,'#9a9c98');this.ellipse(ex+5,-6,2.6,2.6,'#9a9c98');this.line([[ex+7,-5],[ex+8,-1+Math.sin(t*1.4)]],'#9a9c98',1.6);this.ellipse(ex+3,-7,1.8,2.2,'#888a86');for(const lx of [-3,2])this.line([[ex+lx,-2],[ex+lx,1]],'#858782',2);
    this.ellipse(1,6,7,3,'#8fbcc8');for(let i=0;i<3;i++){const px=-3+i*3,hop=this.reduced?0:Math.abs(Math.sin(t*3+i))*1.5;this.ellipse(px,4-hop,1,1.6,'#2f3236');this.ellipse(px,4.4-hop,.6,1,'#f2f0ea');}
  }
  themePark(){
    const t=this.reduced?0:this.time;
    this.diamond(0,0,22,11,'#c9c2a8');
    // A roller coaster with a loop and a little train running along it.
    const track=[[-20,0],[-14,-18],[-6,-24],[0,-12],[4,-8]];this.line(track,'#c95b4c',1.6);for(const [x,y] of track)this.line([[x,y],[x,2]],'#9b9488',.6);
    {const cx=9,cy=-14;this.ctx.beginPath();this.ctx.ellipse(cx,cy,6,7,0,0,Math.PI*2);this.ctx.strokeStyle='#c95b4c';this.ctx.lineWidth=1.6;this.ctx.stroke();this.line([[cx,cy+7],[cx,2]],'#9b9488',.6);
      const a=(t*2)%(Math.PI*2);this.rect(cx+Math.cos(a)*6-1.5,cy+Math.sin(a)*7-1.2,3,2.4,'#e2c26a');}
    // Carousel and a swing ride.
    this.ellipse(-8,6,6,2.8,'#e2c26a');this.poly([[-14,4],[-8,-4],[-2,4]],'#7fa3a8');for(let i=0;i<4;i++){const a=t*1.5+i*Math.PI/2;this.ellipse(-8+Math.cos(a)*4.5,5+Math.sin(a)*1.6,.9,1.4,'#f1ead6');}
    this.line([[14,6],[14,-6]],'#7d7464',1);for(let i=0;i<6;i++){const a=t*2.2+i*Math.PI/3,x=14+Math.cos(a)*7,y=-5+Math.sin(a)*2.4;this.line([[14,-6],[x,y+4]],'#9b9488',.4);this.ellipse(x,y+4.5,.9,.9,['#c98fb0','#93a77b','#d4644f'][i%3]);}
  }
  circus(){
    this.ellipse(4,4,22,7,'#58654414');
    for(let i=0;i<8;i++){const a0=Math.PI+i*Math.PI/8,a1=a0+Math.PI/8;this.poly([[Math.cos(a0)*19,Math.sin(a0)*-9.5-2],[Math.cos(a1)*19,Math.sin(a1)*-9.5-2],[0,-34]],i%2?'#f1ead6':'#c95b4c');}
    this.poly([[-19,-2],[19,-2],[17,4],[-17,4]],'#e8dfc8');for(let i=-3;i<=3;i++)this.line([[i*5,-2],[i*5,4]],'#c95b4c',1.6);
    this.poly([[-3,4],[3,4],[2,-3],[-2,-3]],'#5a3b33');this.line([[0,-34],[0,-42]],'#7d7464',1);const wave=this.reduced?0:Math.sin(this.time*3)*1.2;this.poly([[0,-42],[7,-40+wave],[0,-38]],'#e2c26a');
  }
  station(t){
    this.poly([[-16,-2],[0,6],[16,-2],[16,-14],[0,-22],[-16,-14]],'#d9c7a6');this.poly([[0,6],[16,-2],[16,-14],[0,-6]],'#b8a586');this.poly([[-19,-14],[0,-25],[19,-14],[0,-3]],'#7f6a5e');
    this.ellipse(0,-16,2.4,2.4,'#f3eedd');this.line([[0,-16],[0,-17.6]],'#3f3a36',.6);this.line([[0,-16],[1.2,-16]],'#3f3a36',.6);
    // A short track with a tiny train shuttling back and forth.
    this.line([[-28,14],[28,-14]],'#7a6f60',1.6);this.line([[-24,16],[32,-12]],'#7a6f60',1.6);for(let i=0;i<8;i++){const u=-24+i*7;this.line([[u-2,-u*.5+13],[u+3,-u*.5+16]],'#8a7f6a',1);}
    const run=this.reduced?.5:(Math.sin(this.time*.4+t.x)+1)/2,x=-20+run*40,y=12-run*20;
    this.poly([[x-7,y-1],[x+6,y-4.5],[x+6,y-11],[x-7,y-7.5]],'#3f5f4f');this.poly([[x+6,y-4.5],[x+9,y-6],[x+9,y-12],[x+6,y-11]],'#30483c');this.rect(x+4,y-15,2.4,4,'#2b2b2b');
    if(!this.reduced)for(let i=0;i<3;i++){const f=(this.time*.8+i*.33)%1;this.ellipse(x+5+f*-6,y-17-f*14,2+f*4,1.6+f*3,`rgba(235,235,225,${(1-f)*.7})`);}
  }
  pool(){
    this.diamond(0,0,22,11,'#e4ddc8');this.diamond(0,0,17,8.5,'#7fb9c8');this.diamond(0,-.4,15,7.4,'#9ccfda');
    if(!this.reduced)for(let i=0;i<3;i++){const x=-8+i*7+Math.sin(this.time+i)*2,y=1-i*.6;this.ellipse(x,y,1.8,1.2,'#e9c9a8');this.ellipse(x-2.4,y+.3,2,.6,'rgba(255,255,255,.7)');}
    this.line([[14,-3],[14,-12]],'#8a8f94',1);this.line([[14,-12],[8,-11]],'#c9c3aa',1.6);
    for(const [x,c] of [[-17,'#d4644f'],[-12,'#e2c26a']]){this.line([[x,3],[x,-7]],'#8a7552',.8);this.poly([[x-5,-7],[x,-10],[x+5,-7]],c);}
  }
  spaceport(t){
    this.diamond(0,0,22,11,'#b9bdb4');this.diamond(0,0,10,5,'#9da39b');this.line([[-12,0],[12,0]],'#e2c26a',1);
    this.line([[12,2],[12,-34]],'#7d8580',1.4);this.line([[12,-30],[4,-30]],'#7d8580',1);
    // Every so often the rocket lifts off with a plume, then a new one stands ready.
    const cycle=this.reduced?0:(this.time*.05+t.x*.13)%1,lift=cycle>.85?Math.pow((cycle-.85)/.15,2)*160:0;
    if(lift<150){const y=-lift;this.poly([[-3,y-2],[3,y-2],[3,y-24],[0,y-31],[-3,y-24]],'#eeeeea');this.poly([[-3,y-6],[-6,y],[-3,y-1]],'#c95b4c');this.poly([[3,y-6],[6,y],[3,y-1]],'#c95b4c');this.ellipse(0,y-17,1.4,1.4,'#7fa3a8');
      if(lift>0)for(let i=0;i<6;i++){const f=i/6;this.ellipse((Math.random()-.5)*4,y+2+f*18,3+f*6,2+f*4,`rgba(${f<.3?'255,210,140':'230,228,220'},${(1-f)*.85})`);}}
  }
  museum(){
    this.ellipse(4,4,20,6,'#58654414');
    this.poly([[-16,-3],[0,5],[16,-3],[16,-17],[0,-25],[-16,-17]],'#e4dcc4');this.poly([[0,5],[16,-3],[16,-17],[0,-9]],'#c9c1a8');
    for(let i=0;i<5;i++)this.line([[-14+i*3.4,-3+i*1.7],[-14+i*3.4,-16+i*1.7]],'#f3eedd',2);
    this.poly([[-19,-17],[0,-29],[19,-17],[0,-8]],'#9b8a6c');this.poly([[-19,-17],[0,-29],[0,-8]],'#b3a27f');
    this.poly([[-4,-1],[0,1],[0,-7],[-4,-9]],'#7d6a52');this.line([[10,-20],[10,-33]],'#7d7464',.8);this.poly([[10,-33],[18,-30],[10,-27]],'#b8644f');
  }
  pettingFarm(t){
    this.diamond(0,0,21,10.5,'#c9b77f');this.diamond(0,0,18,9,'#d8c68c');
    for(const [a,b] of [[[-21,0],[0,-10.5]],[[0,-10.5],[21,0]],[[21,0],[0,10.5]],[[0,10.5],[-21,0]]]){this.line([a,b],'#94805a',1);this.line([[a[0],a[1]-3],[b[0],b[1]-3]],'#a8946a',.9);}
    this.poly([[-14,-4],[-6,0],[-6,-9],[-14,-13]],'#b97a58');this.poly([[-6,0],[-1,-3],[-1,-12],[-6,-9]],'#9c6649');this.poly([[-16,-12],[-9,-18],[1,-12],[-6,-8]],'#8e8f6c');
    const walk=this.reduced?0:Math.sin(this.time*.7+t.x)*3;
    for(const [i,[x,y]] of [[3+walk,1],[9-walk*.6,-3],[-1,5]].entries()){const goat=i===1;this.ellipse(x,y-3,4,2.6,goat?'#e9e2cf':'#f4f1e6');this.ellipse(x+3.6,y-5,1.8,1.6,goat?'#7d6a55':'#5f5a50');this.line([[x-2,y-1],[x-2,y+1]],'#6f665a',.8);this.line([[x+2,y-1],[x+2,y+1]],'#6f665a',.8);}
  }
  observatory(){
    this.ellipse(4,4,16,5,'#58654418');
    this.poly([[-9,-3],[0,1],[0,-20],[-9,-24]],'#e2dbc4');this.poly([[0,1],[9,-3],[9,-24],[0,-20]],'#c7c0a8');
    this.ellipse(0,-23,10,4.5,'#b9b39b');this.poly([[-10,-23],[-8,-30],[-3,-34],[3,-34],[8,-30],[10,-23],[0,-19]],'#a9b4b2');this.poly([[0,-19],[10,-23],[8,-30],[3,-34],[1,-34]],'#8f9b99');
    this.poly([[-1.5,-34],[1.5,-34],[1.5,-22],[-1.5,-21]],'#4f5d66');
    this.line([[1,-30],[11,-38]],'#6d6556',2);this.ellipse(11.5,-38.5,1.6,1.2,'#d6d1b8');
    this.poly([[-5,-7],[-2,-6],[-2,-11],[-5,-12]],'#7d8f8c');
  }
  iceCream(t){
    const stripe=['#e9a8a2','#a9cfc6','#efd58e'][Math.floor(hash(t.x,t.y)*3)];
    this.poly([[-10,-2],[0,3],[0,-10],[-10,-15]],'#f3ecd9');this.poly([[0,3],[10,-2],[10,-15],[0,-10]],'#ddd3bb');
    this.poly([[-12,-15],[0,-9],[12,-15],[0,-21]],stripe);for(let i=0;i<3;i++)this.line([[-9+i*6,-14+i*3],[-3+i*6,-17+i*3]],'#fbf7ea',1.4);
    this.poly([[-7,-6],[-2,-4],[-2,-9],[-7,-11]],'#8aa7a2');
    this.poly([[12,-6],[15,-22],[18,-6]],'#d2a868');this.ellipse(15,-23,4.2,3.6,'#f2c6c9');this.ellipse(15,-26,3,2.6,'#fbf3e4');this.ellipse(16,-28.5,1.2,1.2,'#c0574d');
  }
  greenhouse(){
    this.ellipse(4,4,18,6,'#58654414');
    this.poly([[-14,-3],[0,4],[0,-9],[-14,-16]],'rgba(206,229,226,.75)');this.poly([[0,4],[14,-3],[14,-16],[0,-9]],'rgba(183,212,208,.75)');
    this.poly([[-14,-16],[0,-9],[0,-17],[-14,-24]].map(([x,y],i)=>[x,i>2?-21:y]),'rgba(222,238,235,.8)');this.poly([[0,-9],[14,-16],[14,-21],[0,-17]],'rgba(200,225,221,.8)');this.line([[-14,-21],[0,-17],[14,-21]],'#9fb7b2',1);
    for(let i=0;i<4;i++){this.ellipse(-10+i*3.5,-4+i*1.8,2.4,3,this.leaf(i%2?'#7e965c':'#91a763'));this.ellipse(3+i*3,-1-i*1.5,2.2,2.6,this.leaf('#86a062'));}
    this.ellipse(-6,-8,1,1,'#d4644f');this.ellipse(6,-6,1,1,'#d4644f');
    for(const x of [-7,7])this.line([[x,x<0?.5:.5],[x,x<0?-19:-19]],'#a9bdb8',.6);
  }
  lighthouse(){
    const c=this.ctx;
    this.ellipse(4,4,20,7,'#58654418');
    this.poly([[-15,-2],[0,6],[15,-2],[0,-9]],'#a69f86');this.poly([[-15,-2],[0,6],[0,10],[-15,2]],'#8f8a73');this.poly([[0,6],[15,-2],[15,2],[0,10]],'#7d7a66');
    // A tapering striped tower: four bands, alternating chalk and brick red.
    for(let i=0;i<4;i++){
      const y0=-4-i*13,y1=y0-13,w0=8-i*1.1,w1=8-(i+1)*1.1,color=i%2?'#b8644f':'#efe9d8',side=i%2?'#9c5444':'#d3cdb9';
      this.poly([[-w0,y0],[0,y0+3],[0,y1+3],[-w1,y1]],color);this.poly([[0,y0+3],[w0,y0],[w1,y1],[0,y1+3]],side);
    }
    this.poly([[-1.5,-12],[1.5,-11],[1.5,-17],[-1.5,-18]],'#6f7a74');
    this.diamond(0,-56,7.5,3.4,'#7d6f5c');
    const lamp=this.light.darkness>.15?'#fff0b8':'#f2e2a8';
    this.poly([[-4.2,-57],[0,-55.5],[0,-63],[-4.2,-64.5]],lamp);this.poly([[0,-55.5],[4.2,-57],[4.2,-64.5],[0,-63]],'#e3d197');
    this.poly([[-5,-64.5],[0,-71],[5,-64.5],[0,-62.5]],'#8c5a48');this.line([[0,-71],[0,-75]],'#6d5a4a',1);
    this.line([[-7,-56],[-7,-59]],'#6d675a',.6);this.line([[7,-56],[7,-59]],'#6d675a',.6);this.line([[-7,-59],[0,-56.5],[7,-59]],'#6d675a',.6);
    c.save();c.globalAlpha=.5+this.light.darkness*.5;this.ellipse(0,-60,3,3,'#fff6cf');c.restore();
  }
  // The first huts come in three shapes with their own thatch, so a young village never looks copied.
  hut(v){
    const L=this.look||DEFAULT_LOOK,h=hash(this.currentTile?.x??1,this.currentTile?.y??2),thatch=THATCH[Math.floor(h*THATCH.length)],shade=shadeColor(thatch,.82),shape=Math.floor(hash((this.currentTile?.y??3)*3,(this.currentTile?.x??4)*7)*3);
    this.ellipse(5,4,17,5.5,'#58654413');
    if(shape===0){
      // A round hut with a conical straw roof.
      this.ellipse(0,-3,12,6,shadeColor(L.wall,.92));this.poly([[-12,-3],[-12,-12],[12,-12],[12,-3]],L.wall);this.ellipse(0,-12,12,6,L.side);this.ellipse(0,-3,12,6,'#00000000');
      this.poly([[-15,-12],[0,-32],[15,-12],[0,-6]],thatch);this.poly([[0,-32],[15,-12],[0,-6]],shade);for(let i=0;i<4;i++)this.line([[-12+i*6,-11+Math.abs(i-1.5)],[-1+i*.4,-30]],'#00000014',.6);
      this.poly([[3,-3],[7,-4.5],[7,-10],[3,-8.5]],'#6f5a40');
    }else if(shape===1){
      // A long farmhouse, low and wide, with the roof nearly to the ground.
      this.poly([[-17,-4],[0,4],[0,-6],[-17,-14]],L.wall);this.poly([[0,4],[10,-1],[10,-11],[0,-6]],L.side);
      this.poly([[-20,-12],[-6,-26],[13,-12],[0,-3]],thatch);this.poly([[-6,-26],[13,-12],[0,-3]],shade);this.poly([[-20,-12],[-6,-26],[-5,-23],[-17,-11]],shadeColor(thatch,1.08));
      this.window([[-12,-6],[-8,-4],[-8,-8],[-12,-10]],L.shutter);this.poly([[3,-2],[6,-3.5],[6,-9],[3,-7.5]],'#6f5a40');
    }else{
      // A timber cabin with a steep gable.
      this.poly([[-12,-4],[0,2],[0,-10],[-12,-16]],shadeColor(L.wall,.95));this.poly([[0,2],[12,-4],[12,-16],[0,-10]],L.side);
      this.poly([[-15,-15],[-2,-30],[15,-16],[1,-8]],thatch);this.poly([[-2,-30],[15,-16],[1,-8]],shade);
      for(let i=0;i<3;i++)this.line([[-12,-6-i*3.5],[0,0-i*3.5]],'#00000012',.6);
      this.window([[4,-5],[8,-7],[8,-11],[4,-9]],L.shutter);
    }
    if(h>.5){this.rect(-16,-2,3,4,'#b9a27a');this.ellipse(-15,-3,2.3,1.3,'#a39a74');}
    if(L.flowers)for(let i=0;i<3;i++)this.ellipse(-5+i*2.2,1.5,1.1,.9,L.flowers);
  }
  house(v,level){
    const c=this.ctx;
    if(level===0&&this.look){this.hut(v);return;}
    if(level>0&&['classical','medieval','renaissance'].includes(this.archStyle)){this.historicalHouse(v,this.archStyle);return;}
    const L=this.look||DEFAULT_LOOK,h=(level===0?13:level===1?20:31)+(level>0?L.extra:0);
    const roof=L.roof||(level===0?'#ad785c':v>.5?'#a46f56':'#8e8f6c');
    this.ellipse(5,4,18,6,'#58654413');
    this.poly([[-14,-5],[0,2],[14,-5],[0,-12]],'#b5af87');
    this.poly([[-13,-5],[0,2],[0,2-h],[-13,-5-h]],L.wall);
    this.poly([[0,2],[13,-5],[13,-5-h],[0,2-h]],L.side);
    this.poly([[-17,-h-3],[-2,-h-20],[17,-h-11],[2,-h-1]],roof);
    this.poly([[-17,-h-3],[0,-h+5],[17,-h-3],[2,-h-20]],roof);
    // Visible gable and two sloped roof planes.
    this.poly([[-17,-h-3],[-2,-h-17],[12,-h-10],[-2,-h+4]],L.gable||(v>.5?'#bd8b69':'#af805e'));
    this.poly([[-2,-h-17],[17,-h-7],[2,-h+5],[-2,-h+4]],roof);
    for(let i=0;i<3;i++)this.line([[-13+i*5,-h-4-i*4],[-1+i*5,-h+2-i*4]],'#e0b78a45',.6);
    this.poly([[-8,-2],[-3,0],[-3,-8],[-8,-10]],'#897957');
    this.window([[5,-7],[9,-9],[9,-14],[5,-12]],L.shutter);
    if(L.flowers){this.poly([[4,-6],[10,-9],[10,-7],[4,-4]],'#8d7a5a');for(let i=0;i<3;i++)this.ellipse(5.5+i*2,-6.6-i,1.2,1,L.flowers);}
    this.line([[7,-8],[7,-13]],'#b7c0a0',.6);
    if(level>0){this.window([[-9,-14],[-5,-12],[-5,-17],[-9,-19]],L.shutterSide);this.window([[5,-19],[9,-21],[9,-25],[5,-23]],L.shutter);}
    if(level>1){this.window([[-9,-24],[-5,-22],[-5,-27],[-9,-29]],L.shutterSide);this.window([[5,-29],[9,-31],[9,-35],[5,-33]],L.shutter);}
    if(L.chimney!==false&&(v>.4 || level>0)){
      this.poly([[7,-h-15],[11,-h-17],[11,-h-25],[7,-h-23]],'#a7a18a');
      this.poly([[4,-h-17],[7,-h-15],[7,-h-23],[4,-h-25]],'#c7bca0');
      for(let i=0;i<3;i++){
        const t=(this.time*.3+i*.32)%1;
        this.ellipse(8+Math.sin(t*3)*5,-h-27-t*19,2+t*3,1.8+t*2,`rgba(244,244,225,${(1-t)*.38})`);
      }
    }
    if(level===0){this.rect(-16,-2,3,4,'#d4c39b');this.ellipse(-15,-3,2.3,1.3,'#aaa980');}
  }
  historicalHouse(v,style){
    if(style==='classical'){
      // Classical villas differ too: their own plaster and a roof of terracotta, ochre, slate or wood.
      const Lc=this.look||DEFAULT_LOOK,croof=['#bd8b69','#a5483c','#c9a14f','#8a6a4c','#6d7a86','#b8643f'][Math.floor(hash((this.currentTile?.x??1)*5,(this.currentTile?.y??1)*3)*6)];
      this.poly([[-16,-4],[0,4],[16,-4],[16,-20],[0,-28],[-16,-20]],this.look?Lc.wall:'#ded3b2');
      this.poly([[0,4],[16,-4],[16,-20],[0,-12]],this.look?Lc.side:'#bcc3a1');
      this.poly([[-20,-21],[0,-34],[20,-21],[0,-11]],croof);
      this.poly([[-20,-21],[0,-34],[0,-11]],shadeColor(croof,1.1));
      for(let i=0;i<4;i++)this.line([[-13+i*4,-5+i*2],[-13+i*4,-18+i*2]],'#eee3c3',2.3);
      this.window([[5,-5],[10,-8],[10,-17],[5,-14]],this.look?Lc.shutter:'#84977e');
      this.diamond(-3,5,10,5,'#c8bd98');this.ellipse(12,2,2.5,1.5,'#a7ad75');return;
    }
    const L=this.look||DEFAULT_LOOK,medieval=style==='medieval',h=(medieval?22:27)+L.extra,roof=L.roof?(medieval?shadeColor(L.roof,.95):L.roof):medieval?'#958663':v>.5?'#ae7e65':'#8c9879';
    this.poly([[-14,-4],[0,4],[14,-4],[14,-4-h],[0,4-h],[-14,-4-h]],this.look?L.wall:medieval?'#d4c3a1':'#d6b498');
    this.poly([[0,4],[14,-4],[14,-4-h],[0,4-h]],this.look?L.side:medieval?'#bcc0a0':'#b6b69a');
    this.poly([[-18,-h-3],[-4,-h-24],[18,-h-11],[3,-h+5]],roof);
    this.poly([[-18,-h-3],[-4,-h-24],[3,-h+5]],this.look?L.gable:medieval?'#b0a078':'#c29879');
    this.poly([[-8,-1],[-3,2],[-3,-9],[-8,-12]],'#8c7958');
    if(medieval){
      for(const x of [-12,-2])this.line([[x,-3+(x+12)*.5],[x,-25+(x+12)*.5]],'#8e7857',1.4);
      this.line([[-13,-15],[-1,-9]],'#8e7857',1.4);this.line([[-12,-24],[-2,-10]],'#8e7857',1.1);this.line([[-12,-6],[-2,-19]],'#8e7857',1.1);
    }else{
      for(let i=0;i<2;i++){const x=-11+i*7;this.poly([[x,-18+i*3],[x+3,-16+i*3],[x+3,-23+i*3],[x,-25+i*3]],'#849580');}
      this.line([[-15,-26],[0,-18],[15,-26]],'#e4cba7',1.8);this.poly([[-4,-45],[0,-40],[4,-35],[-1,-34]],'#dcc09b');
    }
    for(let i=0;i<2;i++)this.window([[5,-10-i*12],[9,-12-i*12],[9,-17-i*12],[5,-15-i*12]],this.look?L.shutter:'#7d937c');
    if(L.flowers)for(let i=0;i<3;i++)this.ellipse(6+i*1.5,-9.5-i*.8,1.1,.9,L.flowers);
    this.ellipse(-15,3,2,1.2,'#b7a37a');
  }
  farm(v){
    this.diamond(0,-1,21,10,'#b0a575');
    this.diamond(0,-1,18,8,'#9b9561');
    for(let i=-2;i<=2;i++){
      const x=i*5;
      this.line([[x-8,-5],[x+7,3]],'#c1b480',2);
      for(let j=0;j<4;j++){
        const xx=x-6+j*3.8,yy=-4+j*1.9;
        this.line([[xx,yy],[xx,yy-3.5-Math.sin(this.time*.7+j)*.3]],v>.4?'#889d55':'#c8bd72',1.5);
        this.line([[xx,yy-2],[xx+1.5,yy-3]],'#b3bb70',1);
      }
    }
    if(v>.5){this.line([[-19,-5],[-19,-11]],'#a08c60',1.3);this.line([[-19,-10],[-14,-8]],'#bca575',1.4);}
    if(v>.76){this.rect(12,-8,4,4,'#b99e71');this.line([[14,-8],[14,-18]],'#9b8760',1.1);this.line([[10,-16],[18,-13]],'#a18f62',2);}
  }
  dock(harbor){
    const length=harbor?42:31;
    this.poly([[-8,-7],[7,-1],[-1,length-4],[-14,length-10]],harbor?'#aba78c':'#b7a17a');
    for(let i=0;i<7;i++)this.line([[-8-i*.8,-5+i*length/8],[6-i*.8,1+i*length/8]],'#d5c59c',.8);
    for(const p of [[-8,-5],[6,2],[-12,length-10],[0,length-5]]){this.line([[p[0],p[1]+3],[p[0],p[1]-5]],'#897d5c',2);this.ellipse(p[0],p[1]-5,1.5,.7,'#cebe94');}
    if(harbor){this.line([[5,0],[5,-32],[22,-25]],'#7e8d7b',2);this.line([[22,-25],[22,-12]],'#899785',1);}
    this.ctx.save();this.ctx.translate(12,13+Math.sin(this.time*1.1)*.6);this.smallBoat(false);this.ctx.restore();
  }
  pump(tile){
    const broken=tile?.pumpBrokenUntil>this.sim.year||(!this.sim.brokenPump&&this.sim.pumpBroken);
    this.poly([[-8,0],[0,4],[9,0],[1,-4]],'#969d82');
    this.poly([[-7,-1],[0,3],[0,-10],[-7,-14]],'#c9c4a3');
    this.poly([[0,3],[8,-1],[8,-14],[0,-10]],'#9da58c');
    this.poly([[-10,-13],[0,-19],[11,-13],[0,-7]],'#7e8d78');
    this.line([[6,-3],[15,1],[15,6]],'#7d8f7d',2.4);
    const c=this.ctx;c.save();c.translate(0,-20);c.rotate(broken?0:this.activityTime*1.7);
    for(let i=0;i<4;i++){c.rotate(Math.PI/2);this.poly([[1,-1],[2,-12],[-2,-10],[-1,-1]],'#b7b99b');}this.ellipse(0,0,1.7,1.7,'#8b967a');c.restore();
    if(!broken)this.line([[15,6],[19,9+Math.sin(this.time*7)]],'#d4e3d0',1.4);
  }
  // A bridge deck that follows the isometric axis it actually spans, with a gentle arch, railings and posts.
  deck(alongX,length,width,arch,colors=['#b0a98c','#8f8670','#a19b7b']){
    const a=alongX?[23,11.5]:[-23,11.5],b=alongX?[-23,11.5]:[23,11.5],L=length,W=width;
    const at=(u,v,lift=0)=>[a[0]*u+b[0]*v,a[1]*u+b[1]*v-lift];
    const lift=u=>arch*(1-u*u);
    const deck=[],edge=[];for(let i=0;i<=8;i++){const u=-L+2*L*i/8;deck.push(at(u,-W,lift(u/L)));edge.push(at(u,W,lift(u/L)));}
    this.poly([...deck,...edge.reverse()],colors[0]);
    const side=[];for(let i=0;i<=8;i++){const u=-L+2*L*i/8;side.push(at(u,W,lift(u/L)));}for(let i=8;i>=0;i--){const u=-L+2*L*i/8;side.push(at(u,W,lift(u/L)-3));}this.poly(side,colors[1]);
    for(const v of [-W,W]){const rail=[];for(let i=0;i<=8;i++){const u=-L+2*L*i/8;rail.push(at(u,v,lift(u/L)+5));}this.line(rail,colors[2],1.1);for(let i=0;i<=4;i++){const u=-L+2*L*i/4,p=at(u,v,lift(u/L));this.line([p,[p[0],p[1]-5]],colors[2],.9);}}
  }
  bridge(t){
    const land=n=>n&&(n.kind==='land'||n.building==='bridge');
    const alongX=land(this.sim.tile(t.x+1,t.y))||land(this.sim.tile(t.x-1,t.y))||!(land(this.sim.tile(t.x,t.y+1))||land(this.sim.tile(t.x,t.y-1)));
    this.deck(alongX,.55,.2,5);
  }
  workshop(){
    if(this.sim.era<2){this.house(.2,1);this.line([[6,3],[15,-1]],'#a68e65',2.5);this.line([[7,3],[7,6]],'#9a845c',1);this.rect(12,-5,3,3,'#b7ab80');return;}
    this.house(.8,1);
    this.poly([[9,-4],[16,-8],[16,-37],[9,-33]],'#a99d84');
    this.poly([[6,-6],[9,-4],[9,-33],[6,-35]],'#c0b294');
    for(let i=0;i<3;i++){const f=(this.time*.23+i*.33)%1;this.ellipse(12+f*10,-39-f*22,3+f*5,2+f*3,`rgba(219,220,202,${(1-f)*.5})`);}
  }
  tower(v){
    const h=44+v*20;
    this.poly([[-12,-3],[1,4],[1,4-h],[-12,-3-h]],'#d6d5b9');
    this.poly([[1,4],[13,-2],[13,-2-h],[1,4-h]],'#a4b5a0');
    this.poly([[-12,-3-h],[1,4-h],[13,-2-h],[0,-9-h]],'#c5d0b7');
    for(let y=-7;y>-h;y-=8)for(let x=-8;x<=7;x+=7)this.window([[x,y],[x+3,y+1.5],[x+3,y-2],[x,y-3.5]],'#8baba0');
    this.diamond(0,-h-4,7,3,'#97ad83');
    if(v>.7){this.line([[0,-h-5],[0,-h-16]],'#91a398',1);this.ellipse(0,-h-16,1.5,1.5,'#d5d4a5');}
  }
  // Residents: a little taller, with skin, hair and clothes that differ per person, and arms that swing as they walk.
  person(x,y,color,phase=0){
    const step=this.reduced?0:Math.sin(this.activityTime*5+phase),k=1.2,n=Math.abs(Math.floor(phase*7.3+3))%6;
    const skin=['#e8c9a4','#d9ad84','#b98560','#8d5f40','#f1d6b8','#c99a72'][n],hair=['#3d2f26','#6b4a2f','#c9a15a','#8a8a86','#a5483c','#2b2b2b'][(n+2)%6],legs=['#5d6670','#6f5a44','#4f5a5e'][n%3];
    this.ellipse(x+1,y+1.2,3.2,1.2,'#3d4a3a2a');
    this.line([[x-.9,y-2.4*k],[x-.9-step*.8,y+1]],legs,1.3);
    this.line([[x+.9,y-2.4*k],[x+.9+step*.8,y+1]],legs,1.3);
    this.poly([[x-1.9,y-2.4*k],[x+1.9,y-2.4*k],[x+1.6,y-6.4*k],[x-1.6,y-6.4*k]],color);
    this.line([[x-1.9,y-6*k],[x-2.5+step*.6,y-3.4*k]],color,1);this.line([[x+1.9,y-6*k],[x+2.5-step*.6,y-3.4*k]],color,1);
    this.ellipse(x,y-8.2*k,1.8,2,skin);this.ellipse(x,y-9.1*k,2,1.05,hair);
  }
  drawWorkers(){
    const tiles=this.sim.land.filter(t=>!t.landform);
    const count=Math.min(64,Math.max(6,Math.floor(this.sim.population*.65)));
    const colors=['#a18463','#d4c08a','#7a8d6b','#b89774','#d6d0ae'];
    for(let i=0;i<count;i++){
      const p=this.sampleWalker(i);if(!p||p.stage==='inside')continue;
      this.enqueueActor(p.y,()=>{
        this.ctx.save();this.ctx.globalAlpha=p.alpha;this.person(p.x,p.y,colors[i%colors.length],i);
        if(i%3===0){this.rect(p.x+1,p.y-5,3,2,'#bd9f69');this.line([[p.x+1,p.y-5],[p.x+4,p.y-5]],'#e0c995',.5);}this.ctx.restore();
      });
    }
    this.drawTraffic();
    this.drawBicycles();
    if(this.sim.protestUntil>this.sim.year){
      const center=this.sim.tile(0,1),p=this.p(center.x,center.y);
      for(let i=0;i<8;i++){
        const x=p.x+(i%4-1.5)*5,y=p.y+12+Math.abs(x-p.x)*.5+Math.floor(i/4)*2;
        this.enqueueActor(y,()=>{this.person(x,y,['#b18d6b','#879c76','#bea47a'][i%3],i);
        if(i%2===0){this.line([[x+2,y-5],[x+2,y-17]],'#a3916c',1);this.rect(x-2,y-21,9,5,'#e3d2a4');this.line([[x,y-19],[x+5,y-19]],'#ad9470',.6);}});
      }
    }
    // Sheep have no interest in the progress of civilization.
    if(this.sim.year<600){
      const t=tiles.find(t=>!t.building && t.x>0 && t.y>0);
      if(t){const p=this.p(t.x,t.y);this.enqueueActor(p.y+2,()=>{this.ellipse(p.x+2,p.y-1,4,2.5,'#e9e5c8');this.ellipse(p.x+6,p.y-1,1.8,1.6,'#8c9176');this.line([[p.x,p.y],[p.x,p.y+2]],'#7c8368',1);this.line([[p.x+4,p.y],[p.x+4,p.y+2]],'#7c8368',1);});}
    }
  }
  // Vehicles follow history: handcarts, horse and cart, coaches, then oldtimers and finally modern cars.
  drawTraffic(){
    const routes=this.sim.routes.filter(r=>r.length>2),kind=this.sim.vehicleKind,motor=kind==='oldtimer'||kind==='car';
    const count=motor?Math.max(1,this.sim.carCount):this.sim.population>=12?Math.min(4,Math.floor(this.sim.population/18)+1):0;
    const speed={handcart:.35,horse:.5,coach:.62,oldtimer:.8,car:1.15}[kind];
    for(let i=0;i<count;i++){
      const route=routes[(i*3)%Math.max(1,routes.length)];if(!route)continue;
      const span=(route.length-1)*2,travel=this.reduced?.5:(this.activityTime*speed+i*2.1)%span;
      const distance=travel<=route.length-1?travel:span-travel,segment=Math.min(route.length-2,Math.floor(distance));
      const a=this.sim.tiles.get(route[segment]),b=this.sim.tiles.get(route[segment+1]);if(!a||!b)continue;
      const p=this.streetPosition(a,b,distance-segment,-.8),step=this.reduced?0:Math.sin(this.activityTime*9+i);
      this.enqueueActor(p.y,()=>{this.ctx.save();this.ctx.translate(p.x,p.y);this.vehicle(kind,i,step);this.ctx.restore();});
    }
  }
  horse(x,y,step){
    this.ellipse(x,y-5,5,2.6,'#8a6a4c');this.poly([[x+4,y-6],[x+8,y-10],[x+9,y-8],[x+5,y-4]],'#8a6a4c');this.ellipse(x+9,y-9,1.6,1.2,'#7a5c42');
    for(const [lx,ph] of [[x-3,step],[x+3,-step]])this.line([[lx,y-3],[lx+ph*.8,y+1]],'#6c5038',1);this.line([[x-5,y-6],[x-7,y-3]],'#5e4632',.9);
  }
  vehicle(kind,i,step){
    const wheel=(x,y,r=2,c='#627464')=>this.ellipse(x,y,r,r*.9,c);
    if(kind==='handcart'){wheel(-2,2,2.2,'#7c6a4c');this.poly([[-7,-2],[1,1],[5,-1],[-3,-4]],'#b79c70');this.rect(-4,-5,4,2,'#cdb37a');this.line([[3,-1],[7,-3]],'#8a7552',1);this.person(9,1,'#a2926e',i+step);}
    else if(kind==='horse'){wheel(-6,2,2.4,'#7c6a4c');wheel(1,3,2.4,'#7c6a4c');this.poly([[-10,-2],[2,2],[5,0],[-7,-4]],'#a88a5e');this.rect(-7,-6,8,3,'#c9a76c');this.line([[4,0],[8,-3]],'#7c6a4c',1);this.horse(11,1,step);}
    else if(kind==='coach'){wheel(-7,2);wheel(1,3);this.poly([[-10,-2],[2,3],[2,-8],[-10,-13]],'#3f5f4f');this.poly([[2,3],[5,1],[5,-10],[2,-8]],'#30483c');this.poly([[-10,-13],[2,-8],[5,-10],[-7,-15]],'#2b3d33');this.rect(-7,-10,4,3,'#e7d9a7');this.line([[5,-1],[9,-3]],'#5f5040',1);this.horse(13,1,step);}
    else if(kind==='oldtimer'){const color=['#3d3a36','#6e2f2a','#2f4a3e'][i%3];wheel(-5,2,2.3,'#2b2b2b');wheel(5,2,2.3,'#2b2b2b');this.poly([[-9,-2],[1,3],[10,-2],[0,-7]],color);this.poly([[-6,-4],[-1,-12],[5,-9],[0,-2]],color);this.poly([[-1,-11],[4,-8.5],[2,-5],[-3,-7]],'#d8dcc4');this.ellipse(9,-3,1.3,1.1,'#f0dda2');}
    else{const color=['#789a94','#af8266','#c3b487','#8b9b77'][i%4];wheel(-5,2);wheel(5,2);this.poly([[-9,-2],[1,3],[10,-2],[0,-8]],color);this.poly([[-6,-5],[0,-11],[8,-6],[3,-1]],color);this.poly([[0,-10],[5,-7],[3,-4],[-2,-7]],'#dce0be');this.ellipse(9,-2,1.4,1,'#f0dda2');this.ellipse(-8,-2,1,.8,'#c59475');}
  }
  drawBicycles(){
    const routes=this.sim.routes.filter(r=>r.length>2);
    for(let i=0;i<this.sim.bikeCount;i++){
      const route=routes[(i*5+1)%Math.max(1,routes.length)];if(!route)continue;
      const span=(route.length-1)*2,travel=this.reduced?.5:(this.activityTime*.85+i*1.7)%span;
      const distance=travel<=route.length-1?travel:span-travel,segment=Math.min(route.length-2,Math.floor(distance));
      const a=this.sim.tiles.get(route[segment]),b=this.sim.tiles.get(route[segment+1]);if(!a||!b)continue;
      const p=this.streetPosition(a,b,distance-segment,1.7);
      this.enqueueActor(p.y,()=>{this.ctx.save();this.ctx.translate(p.x,p.y);
      for(const x of [-4,4]){this.ctx.beginPath();this.ctx.ellipse(x,0,2.5,2.2,0,0,TAU);this.ctx.strokeStyle='#758c78';this.ctx.lineWidth=.8;this.ctx.stroke();}
      this.line([[-4,0],[-1,-4],[1,0],[-4,0],[1,0],[4,-4],[4,0]],'#a48368',.8);
      this.line([[3,-5],[5,-5]],'#7d8b73',.8);this.line([[-1,-6],[0,-9],[3,-6]],'#a3ad79',1.8);
      this.line([[0,-5],[2,Math.sin(this.activityTime*6+i)*1.5]],'#8e8e6c',1);
      this.ellipse(1,-11,1.5,1.7,'#d8c399');this.ctx.restore();});
    }
  }
  formalGarden(){
    this.diamond(0,-1,22,11,'#a9b582');
    this.line([[-21,-1],[0,9],[21,-1]],'#e1d7b2',3);
    this.line([[0,-11],[0,9]],'#d9cfaa',2.5);
    this.line([[-20,-1],[20,-1]],'#d9cfaa',2);
    for(const [x,y] of [[-10,-2],[10,-2],[0,5]]){this.ellipse(x,y,5,2.8,'#809d71');this.ellipse(x,y-1,3.5,2,'#9eaf7a');}
    this.ellipse(0,-5,5,2.5,'#c9d3b4');this.ellipse(0,-5,3.7,1.6,'#8fb5a6');
  }
  drawHeritage(){
    const c=this.ctx,tiles=[...this.sim.tiles.values()];
    if(this.showHistory){
      const original=this.historySnapshot?new Set(this.historySnapshot.land):new Set(tiles.filter(t=>t.natural).map(t=>key(t.x,t.y)));
      for(const id of original){const t=this.sim.tiles.get(id);if(!t)continue;const p=this.p(t.x,t.y),corners=[[0,-11.5],[23,0],[0,11.5],[-23,0]],adj=[[t.x,t.y-1],[t.x+1,t.y],[t.x,t.y+1],[t.x-1,t.y]];for(let i=0;i<4;i++)if(!original.has(key(...adj[i]))){const a=corners[i],b=corners[(i+1)%4];this.line([[p.x+a[0],p.y+a[1]],[p.x+b[0],p.y+b[1]]],'#a07851',2.5);}}
      for(const t of tiles.filter(t=>t.interventionMemory)){const p=this.p(t.x,t.y);this.diamond(p.x,p.y-2,20,10,'#d6bf7433',t.interventionMemory.type==='rumble'?'#b48368':'#789eaa');}
    }
    for(const t of tiles){
      const p=this.p(t.x,t.y);
      if(t.oldDike&&t.kind==='land'&&aroundLand(this.sim,t)){this.line([[p.x-17,p.y],[p.x,p.y+8],[p.x+17,p.y]],'#9e9c7b',1.2);}
      if(t.abandonedYear&&t.kind==='water'){this.line([[p.x-6,p.y],[p.x,p.y-3],[p.x+6,p.y]],'#a1ae96',1.5);}
      if(this.showHistory&&t.floodHistory)this.diamond(p.x,p.y,21,10,'#88b2be33','#82a4b0');
    }
    if(this.focus){const p=this.p(this.focus.x,this.focus.y);this.diamond(p.x,p.y-2,31,15,'#ead98c25','#c2ac6b');}
  }
  drawCoastOverlay(){
    const ids=this.historySnapshot?new Set(this.historySnapshot.land):new Set([...this.sim.tiles.values()].filter(t=>t.natural).map(t=>key(t.x,t.y)));
    const corners=[[0,-11.5],[23,0],[0,11.5],[-23,0]];
    for(const id of ids){const t=this.sim.tiles.get(id);if(!t)continue;const p=this.p(t.x,t.y),adj=[[t.x,t.y-1],[t.x+1,t.y],[t.x,t.y+1],[t.x-1,t.y]];for(let i=0;i<4;i++)if(!ids.has(key(...adj[i]))){const a=corners[i],b=corners[(i+1)%4],points=[[p.x+a[0],p.y+a[1]],[p.x+b[0],p.y+b[1]]];this.line(points,'#f8f0d9cc',4);this.line(points,'#b88b54',1.8);}}
  }
  drawLandmarkLabels(){
    const court=this.sim.court&&this.sim.tile(this.sim.court.x,this.sim.court.y);
    if(['royal-palace','palace'].includes(court?.building)){const p=this.point(court.x,court.y);this.landmarkLabel(court.building==='palace'?(this.sim.year<1250?'DE BURCHT':'HET KASTEEL'):'HET NIEUWE PALEIS',p.x,p.y-(this.sim.year<1250?110:150)*this.zoom);}
    const home=this.sim.buildings.find(t=>t.foundingHome);if(!home||!['manor','palace'].includes(home.building))return;
    const p=this.point(home.x,home.y);
    this.landmarkLabel(home.building==='palace'?(court?'HET OUDE PALEIS · HET EERSTE HUIS':'PALEIS · HET EERSTE HUIS'):'HET EERSTE HUIS',p.x,p.y-(home.building==='palace'?104:82)*this.zoom);
  }
  landmarkLabel(label,x,y){
    const p={x},c=this.ctx;
    if(p.x<25||p.x>this.width-25||y<25||y>this.height-40)return;
    c.save();c.font='500 8px "DM Sans", sans-serif';const w=c.measureText(label).width+18;
    const box=this.reserveLabel(p.x,y-12,w,21);if(!box){c.restore();return;}
    c.fillStyle='#faf5dfed';c.fillRect(box.x,box.y,w,21);c.fillStyle='#80704b';c.textAlign='center';c.fillText(label,box.x+w/2,box.y+14);c.restore();
  }
  drawDistrictLabels(){
    if(cinemaVisible(this.sim)||this.focus||!this.showDistricts||this.width<620||this.sim.land.length<65)return;
    const groups=[['Akkers', ['farm'],-30,22],['Kennis',['school','library','science-center'],0,-53],['Industrie',['factory','powerplant'],35,-43],['Hoogbouw',['tower'],-20,-67],['Dorpsleven',['market','shop','cafe','park'],25,29]];
    const used=[],c=this.ctx;
    for(const [name,types,dx,dy]of groups){
      const tiles=this.sim.buildings.filter(t=>types.includes(t.building));if(!tiles.length)continue;
      const center=tiles.reduce((p,t)=>({x:p.x+t.x/tiles.length,y:p.y+t.y/tiles.length}),{x:0,y:0});
      const p=this.point(center.x,center.y);let x=p.x+dx,y=p.y+dy;
      if(x<215||x>this.width-80||y<60||y>this.height-100)continue;
      for(const other of used)if(Math.abs(other.x-x)<80&&Math.abs(other.y-y)<19)y-=21;
      used.push({x,y});c.save();c.font='500 8px "DM Sans", sans-serif';const w=c.measureText(name).width+14;
      const box=this.reserveLabel(x,y-9,w,18);if(!box){c.restore();continue;}
      c.fillStyle='#f7f8e7d9';c.fillRect(box.x,box.y,w,18);c.fillStyle='#778768';c.textAlign='center';c.fillText(name,box.x+w/2,box.y+12);c.restore();
    }
  }
  drawVisitors(){
    if(this.sim.storm)return;
    let budget=Math.min(40,Math.max(2,Math.floor(this.sim.population*.35)));
    const available=this.sim.land.filter(t=>t.walkable&&['forest','park','beach','bonfire','festival-ground','playground','fairground','shop','bakery','cafe'].includes(t.building)&&(t.building!=='fairground'||this.sim.power>0)).sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x));
    const count=Math.min(available.length,Math.floor(budget/2));
    const places=Array.from({length:count},(_,i)=>available[Math.floor((i+.5)*available.length/count)]);
    // Visitors spread over reachable places; a beach does not consume the entire crowd.
    for(const tile of places){
      if(budget<=0)break;
      if(tile.building==='fairground'&&this.sim.power<=0)continue;
      const p=this.p(tile.x,tile.y),c=this.ctx;
      this.enqueueActor(p.y+8,()=>{c.save();c.translate(p.x,p.y-2);
      const type=tile.building;
      if(type==='beach'){
        const water=neighbors(tile).map(([x,y])=>this.sim.tile(x,y)).find(t=>t?.kind==='water'&&!t.building);
        if(water){const d=this.p(water.x-tile.x,water.y-tile.y),bob=this.reduced?0:Math.sin(this.activityTime*1.4)*.5;
          this.ellipse(d.x*.85,d.y*.85,4,1.3,'#e1edda');this.ellipse(d.x*.85,d.y*.85-2+bob,1.5,1.8,'#d5bd93');}
        this.ellipse(-10,1,1.5,1,'#cfb48d');this.line([[-9,2],[-7,3]],'#a8896a',1.4);
      }else if(['bonfire','festival-ground'].includes(type)){this.person(-15,9,'#bc9d70',1);this.person(14,8,'#92a17d',2);
      }else if(type==='park'){
        this.person(13,4,'#b7a37d',1);this.poly([[12,-1],[15,-2],[18,0],[15,1]],'#e2d9b6');
      }else if(type==='forest'){
        const walk=this.reduced?0:Math.sin(this.activityTime*.6+tile.x)*5;
        this.person(walk,5,'#ac9a73',2);this.rect(walk-2,0,2,3,'#8d9b6f');
      }else if(type==='playground'){
        const swing=this.reduced?0:Math.sin(this.activityTime*2)*3;
        this.ellipse(-2+swing,-9,1.4,1.6,'#dac398');this.line([[-2+swing,-7],[-2+swing,-5]],'#ab8970',2);
        this.person(16,4,'#9fa875',3);
      }else if(type==='cafe'){
        this.person(-21,3,'#9ca37d',0);this.person(15,6,'#b5a078',2);
      }else{
        this.person(-8,10,'#a38e70',2);this.person(-14,7,'#9fa97f',4);
      }
      c.restore();});budget-=2;
    }
  }
  drawWorldEffects(){
    for(const effect of this.effects){
      const p=this.p(effect.x,effect.y),age=effect.elapsed,fade=Math.min(1,age*3,4.8-age);
      this.ctx.save();this.ctx.globalAlpha=fade*.8;
      const danger=effect.type==='rumble',color=danger?'#d1a179':'#e8d49b';
      this.diamond(p.x,p.y,25,12,danger?'#dbab7133':'#edf0be33',color);
      if(effect.type==='rain'){
        this.ellipse(p.x-10,p.y-46,13,7,'#e9ecde');this.ellipse(p.x+3,p.y-49,16,9,'#eef0e0');this.ellipse(p.x+17,p.y-45,10,6,'#e5eadc');
        for(let i=0;i<11;i++){const fall=this.reduced?.5:(age*1.4+i*.17)%1;const x=p.x-17+i*3;this.line([[x,p.y-37+fall*33],[x-2,p.y-32+fall*33]],'#8baea2',1);}
      }else if(['celebrate','palace','nudge','built'].includes(effect.type)){
        for(let i=0;i<7;i++){const a=i*TAU/7+age*.3,r=12+(this.reduced?0:age*5);const x=p.x+Math.cos(a)*r,y=p.y-14+Math.sin(a)*r*.5;this.line([[x,y],[x,y-3]],i%2?'#c5b177':'#9cad78',1.4);}
      }else if(danger){for(let i=0;i<5;i++)this.ellipse(p.x+(i-2)*9,p.y-2,3+age,1.5+age*.4,'#d6c09c77');}
      this.ctx.restore();
    }
  }
  drawEffectLabels(){
    const c=this.ctx;
    for(const effect of this.effects.filter(e=>e.label&&e.elapsed<1.9).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.elapsed-b.elapsed).slice(0,2)){
      const p=this.point(effect.x,effect.y),rise=this.reduced?0:Math.min(12,effect.elapsed*4);
      c.save();c.globalAlpha=Math.max(0,Math.min(1,effect.elapsed*5,(1.9-effect.elapsed)/.6));c.font='500 10px "DM Sans", sans-serif';
      const translated=nl(effect.label),label=translated.length>46?translated.slice(0,43)+'…':translated,width=Math.min(this.width-24,c.measureText(label).width+16);
      const box=this.reserveLabel(p.x,p.y-64*this.zoom-rise,width,22);if(!box){c.restore();continue;}
      c.fillStyle=effect.type==='rumble'?'#f1e2c9f0':'#f9f8e8ee';c.fillRect(box.x,box.y,width,22);
      c.fillStyle=effect.type==='rumble'?'#9a7051':'#65784e';c.textAlign='center';c.fillText(label,box.x+width/2,box.y+14);c.restore();
    }
  }
  smallBoat(sail=true){
    this.ellipse(0,4,14,4,'#86b29c18');
    this.poly([[-11,0],[10,-3],[5,5],[-6,5]],'#a6936c');
    this.poly([[-11,0],[-3,2],[10,-3],[2,-5]],'#d2c09a');
    if(sail){this.line([[0,0],[0,-26]],'#8e9170',1);this.poly([[1,-24],[1,-2],[14,-6]],'#f3efcf');this.poly([[-1,-22],[-10,-5],[-1,-2]],'#deddbb');}
  }
  drawBoats(){
    if(this.sim.ending)return;
    const c=this.ctx;
    const rightMost=Math.max(...this.sim.land.map(t=>this.p(t.x,t.y).x));
    c.save();c.translate(rightMost+85+Math.sin(this.time*.08)*17,20+Math.sin(this.time*.6)*2);this.smallBoat();c.restore();
    if(this.sim.era>=1){c.save();c.translate(-rightMost-65,65+Math.sin(this.time*.55)*1.5);c.scale(.75,.75);this.smallBoat();c.restore();}
  }
  // Soft cloud shadows drift across the island, which makes the landscape feel alive.
  drawCloudShadows(){
    if(this.reduced)return;const c=this.ctx;c.save();c.fillStyle='rgba(40,60,50,.07)';
    for(let i=0;i<3;i++){const x=((hash(i,55)*this.width+this.time*(i%2?.8:1.3))%(this.width+300))-150,y=hash(i,22)*this.height*.65+120;c.beginPath();c.ellipse(x+40,y,90,34,0,0,TAU);c.fill();}
    c.restore();
  }
  drawClouds(){
    const c=this.ctx;
    for(let i=0;i<4;i++){
      const x=((hash(i,55)*this.width+this.time*(i%2?.8:1.3))%(this.width+180))-70;
      const y=hash(i,22)*this.height*.65+45;
      const s=.6+hash(i,5)*.55;
      c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=.34;
      this.ellipse(15,40,44,13,'#86a58b13');
      this.ellipse(-18,0,23,10,'#f7f9e9');this.ellipse(0,-6,22,15,'#f7f9e9');this.ellipse(22,-1,23,11,'#f7f9e9');this.ellipse(6,5,34,9,'#f7f9e9');c.restore();
    }
  }
  drawBirds(){
    const c=this.ctx;c.strokeStyle='#7d978579';c.lineWidth=1;
    for(let i=0;i<5;i++){
      const x=this.width*(.66+hash(i,7)*.2)+Math.sin(this.time*.12+i)*17;
      const y=this.height*(.2+hash(i,6)*.14)+Math.cos(this.time*.2+i)*7;
      const wing=2+Math.sin(this.time*3+i)*1.3;
      c.beginPath();c.moveTo(x-4,y-wing);c.quadraticCurveTo(x-1,y-wing,x,y);c.quadraticCurveTo(x+1,y-wing,x+4,y-wing);c.stroke();
    }
  }
  drawRipples(){
    this.ripples=this.ripples.filter(r=>this.time-r.time<2.5);
    for(const r of this.ripples){const t=(this.time-r.time)/2.5;const c=this.ctx;c.strokeStyle=`rgba(249,250,226,${(1-t)*.9})`;c.lineWidth=1;c.beginPath();c.ellipse(r.x,r.y,10+t*50,5+t*25,0,0,TAU);c.stroke();}
  }
  drawRain(){
    const c=this.ctx;c.fillStyle='#657e6d0c';c.fillRect(0,0,this.width,this.height);
    for(let i=0;i<70;i++){
      const x=(hash(i,2)*this.width+this.time*28)%this.width;
      const y=(hash(i,3)*this.height+this.time*150)%this.height;
      this.line([[x,y],[x-3,y+9]],'#ecf1dd66',.8);
    }
  }
}

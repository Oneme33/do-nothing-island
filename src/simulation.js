import { startParty, ensureSpectacle, seedPleasures, reserveBeaches, advancePleasures, ignite, extinguish, jokeAfterTouch, RECREATION } from './spectacle.js';
import {reshapeAfterQuake,rainOnOldTree} from './consequences.js';
import {ensureFamily,advanceFamily,rememberInFamily} from './family.js';
import {ensureWishes,advanceWishes,answerWish} from './wishes.js';
import {ensureChallenges,advanceChallenges} from './challenges.js';
import {advanceCollection} from './collection.js';
import {advanceCoast,coastNotice} from './coast.js';
import {ensureSquare,advanceSquare} from './square.js';
import {carveRiver} from './river.js';
import {planDelight,DELIGHT_LABELS,DELIGHT_OPENINGS} from './delights.js';
import {advanceMonuments,buildCastle} from './monuments.js';
import {advanceWeather} from './weather.js';
import {advanceCommissions} from './commissions.js';
import { ensureStory, eventPriority, rememberIntervention, advanceEconomy, advanceEnvironment, growEstate, advanceCivicStory, advanceFinale, finishStory, captureSnapshot, districtFor } from './story.js';
export const SAVE_VERSION = 1;
// New islands sit in a 29×29 sea; the natural island stays within the original 25×25, so the extra sea is room for polders.
export const WORLD_RADIUS = 14;
export const NATURAL_RADIUS = 12;
export const ERAS = [
  {name:'The early days', threshold:0, year:1, housing:4, title:'Early civilization'},
  {name:'The old world', threshold:1, year:120, housing:6, title:'Preindustrial civilization'},
  {name:'The industrious years', threshold:3, year:1750, housing:9, title:'Industrial civilization'},
  {name:'The modern predicament', threshold:6, year:1920, housing:13, title:'Modern civilization'},
  {name:'The improbable future', threshold:10, year:2080, housing:18, title:'Future civilization'},
];
export const AGES=[
  {id:'early',name:'The first settlement',year:1},
  {id:'classical',name:'The classical age',year:120},
  {id:'medieval',name:'The middle ages',year:600},
  {id:'renaissance',name:'The renaissance',year:1250},
  {id:'industrial',name:'The age of steam',year:1750},
  {id:'modern',name:'The modern age',year:1920},
  {id:'contemporary',name:'The contemporary age',year:1980},
  {id:'future',name:'The near future',year:2080},
];
export const unlockYear=type=>({school:120,library:120,workshop:120,windmill:600,factory:1750,powerplant:1880,'science-center':1950,solar:1980,turbine:1980,tower:1960,fairground:1900}[type]||1);
export const PROJECT_STAGES = [
  {name:'Building the dike',duration:7},
  {name:'Enclosing the water',duration:5},
  {name:'Draining the basin',duration:10},
  {name:'A promising patch of mud',duration:6},
  {name:'Letting the ground dry',duration:8},
];
export const CHARACTERS = [
  {id:'harbor',name:'A nation of seafarers',food:1,trade:1.65,science:.95,growth:1.1,building:'market',story:'The village falls in love with the sea. A trading nation is accidentally founded.'},
  {id:'garden',name:'A rather green civilization',food:1.25,trade:.95,science:.95,growth:1.13,building:'windmill',story:'The villagers decide the future is mostly vegetables. The gardens begin to spread.'},
  {id:'inventor',name:'An island of bright ideas',food:1,trade:1.05,science:1.35,growth:.95,building:'workshop',story:'Someone asks “what if?” The island becomes a slightly impractical place of invention.'},
  {id:'builder',name:'A civilization with grand plans',food:.98,trade:1.1,science:1.08,growth:1.2,building:'well',story:'The village develops a taste for grand buildings. Modesty is quietly discontinued.'},
];
const initialNotes = ['Six people. No meetings.','No one has invented rent.','Everyone knows everyone.','A thriving lack of urgency.'];
const REMARKS = {
  early:['Nobody has invented Mondays.','The sheep considers itself in charge.','Dinner is the main political issue.','Someone is very proud of a stick.','The first fence is already controversial.','The tree is winning the shade economy.','Very small homes. Several architectural opinions.','The sunset is the evening entertainment.','A basket is considered cutting-edge technology.','The village has no official spokesperson. Everyone speaks anyway.'],
  village:['The footpath has acquired a committee.','Someone has named a chicken.','The neighbors are borrowing tools again.','A fence moves six inches. Diplomacy begins.','Fresh bread is becoming a civic expectation.','The village gossip travels faster than the builders.','An excellent day for a very small argument.','The mapmaker requests a larger piece of paper.','Nobody agrees on where the village ends.','The mayor would like a nicer chair.'],
  industry:['The workday now has a whistle.','Everything is described as progress.','Someone has invented a form to request another form.','The engineers look unusually confident.','Steam is doing most of the heavy lifting.','The lunch break is a hard-won institution.','The builders have developed strong opinions about stone.','The workers would like a second lunch break.'],
  modern:['The council has discovered subcommittees.','The skyline is getting ahead of itself.','The rent has developed ambition.','Someone would like to preserve the old bakery.','Yesterday’s future is today’s maintenance bill.','The city is considering a second postcode.','A neighborhood association has formed opinions.','The town planner has bought an eraser.'],
  future:['The future still has a queue.','The engineers are negotiating with geography.','The city would like to optimize the sunset.','The original tree has outlived several development plans.','The skyline has requested a taller map.','The council has industrialized its excuses.','The sea is becoming a planning dispute.','A very advanced civilization has misplaced its keys.'],
};
export const key = (x,y) => `${x},${y}`;
export const neighbors = t => [[t.x+1,t.y],[t.x-1,t.y],[t.x,t.y+1],[t.x,t.y-1]];
export const isUsable = t => t.kind === 'land';
// Early centuries pass briskly; later ages, which span fewer years, get more time per year.
export const secondsPerYear = (year,era=0) => Math.min(2.3,.75+Math.max(0,year-1)/1500+era*.05);
export const FIXED_SECONDS_PER_YEAR=1.5;
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const noise = (x,y) => { const n = Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); };
export function landscapeForSeed(seed) {
  let state=(seed^0xa511e9b3)>>>0;
  const draw=()=>{let n=state+=0x6D2B79F5;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};
  const roll=draw();
  return{kind:roll<.28?'volcanic':roll<.72?'highlands':'rolling',name:roll<.28?'Volcanic island':roll<.72?'Highland island':'Rolling green island',radiusX:11.2+draw()*.65,radiusY:10+draw()*.6,angle:(draw()-.5)*1.4,phase:draw()*Math.PI*2,detailSeed:draw()*1000};
}

export class Civilization {
  constructor(seed=Date.now(), config={}) {
    this.seed = seed >>> 0 || 1;
    this.randomState = this.seed;
    this.config = {maxTiles:720, rareEndings:true, accelerating:true, ...config};
    this.year = 1;
    this.population = 6;
    this.food = 28;
    this.wood = 30;
    this.stone = 12;
    this.wealth = 25;
    this.prosperity = 62;
    this.technology = 0;
    this.era = 0;
    this.interferences = 0;
    this.project = null;
    this.history = [];
    this.tiles = new Map();
    this.storm = 0;
    this.seaLevel = 0;
    this.pumpBroken = 0;
    this.maintenance = 0;
    this.environment = 100;
    this.dikeLevel = 1;
    this.nextStorm = 100 + Math.floor(this.random()*65);
    this.obsessed = this.random() < .035;
    this.ending = false;
    this.endingSeen = false;
    this.events = [];
    this.projectCount = 0;
    this.lastBirth = 1;
    this.drought = 0;
    this.rainBoost = 0;
    this.inspiration = 0;
    this.signals = [];
    this.routes = [];
    this.roadCoverage = 0;
    this.lastIntervention = null;
    this.character = null;
    this.currentRemark = initialNotes[0];
    this.recentRemarks = [];
    this.power = 0;
    this.powerDemand = 0;
    this.belief = 0;
    this.unrest = 0;
    this.protestUntil = 0;
    this.nextProtest = 80;
    this.geography=landscapeForSeed(this.seed);
    this.endgameStarted=false;
    this.endgameAt=0;
    this.nextEndgameEvent=0;
    this.endgameEvents=0;
    this.volcanoActiveUntil=0;
    this.nextVolcanicEvent=380+Math.floor(noise(this.seed,79)*240);
    this.timelineVersion=2;
    this.geographyVersion=3;
    const g=this.geography,cos=Math.cos(g.angle),sin=Math.sin(g.angle);
    for(let x=-WORLD_RADIUS;x<=WORLD_RADIUS;x++) for(let y=-WORLD_RADIUS;y<=WORLD_RADIUS;y++) {
      const u=x*cos-y*sin,v=x*sin+y*cos,angle=Math.atan2(v,u);
      const edge=1+.13*Math.sin(angle*3+g.phase)+.07*Math.cos(angle*5-g.phase);
      const core=(Math.abs(x)<=1&&Math.abs(y)<=1)||[[-2,0],[-2,-1],[-1,-2],[2,0],[0,2]].some(([a,b])=>a===x&&b===y);
      const natural = core || Math.abs(x)<NATURAL_RADIUS&&Math.abs(y)<NATURAL_RADIUS&&(u*u/g.radiusX**2+v*v/g.radiusY**2)<edge;
      this.tiles.set(key(x,y), {x,y,kind:natural?'land':'water',natural,reclaimed:false,building:null,variant:noise(x+g.detailSeed,y),elevation:natural?1:.08,damage:0,floodYears:0});
    }
    // Keep one walkable island: diagonal specks do not become disconnected starting land.
    const connected=new Set(['0,0']),queue=[this.tile(0,0)];
    for(let i=0;i<queue.length;i++)for(const [x,y]of neighbors(queue[i])){const tile=this.tile(x,y),id=key(x,y);if(tile?.kind==='land'&&!connected.has(id)){connected.add(id);queue.push(tile);}}
    for(const [id,tile]of this.tiles)if(tile.kind==='land'&&!connected.has(id)){tile.kind='water';tile.natural=false;tile.elevation=.08;}
    this.originalArea = this.land.length;
    this.config.maxTiles=Math.min(this.tiles.size,Math.max(320,this.config.maxTiles,this.originalArea+24));
    this.tile(0,0).building = 'original-tree';
    this.tile(-1,1).building = 'hut';
    this.tile(-1,1).foundingHome = true;
    this.tile(-1,1).architecture='early';
    this.tile(-1,1).builtYear=1;
    this.tile(1,-1).building = 'farm';
    this.tile(1,-1).foundingField = true;
    this.tile(1,-1).builtYear=1;
    const back=this.land.filter(t=>!t.building&&t.x+t.y<-1).sort((a,b)=>a.x+a.y-b.x-b.y||a.variant-b.variant);
    const peaks=g.kind==='highlands'?2:1;
    for(let i=0;i<peaks;i++){
      const tile=back.shift();if(tile){tile.landform=g.kind==='volcanic'?'volcano':g.kind==='highlands'?'mountain':'hill';tile.elevation=tile.landform==='hill'?1.8:3.5;tile.relief=tile.landform==='volcano'?65:tile.landform==='mountain'?52+Math.floor(tile.variant*22):29;}
    }
    const foothill=back.find(t=>!t.landform);if(foothill){foothill.landform='hill';foothill.relief=24+Math.floor(foothill.variant*9);foothill.elevation=1.8;}
    const forest=this.freeLand.filter(t=>t.x+t.y<0).sort((a,b)=>a.variant-b.variant)[0];
    if(forest){forest.building='forest';const next=neighbors(forest).map(([x,y])=>this.tile(x,y)).find(t=>t?.kind==='land'&&!t.building&&!t.landform);if(next)next.building='forest';}
    if(this.forests.length<2){const next=this.freeLand.find(t=>t.x+t.y<0);if(next)next.building='forest';}
    const coast=this.freeLand.filter(t=>this.isCoast(t)).sort((a,b)=>b.y-a.y||b.x-a.x);
    for(const beach of coast.slice(0,2))beach.building='beach';
    ensureStory(this);
    ensureSquare(this);
    carveRiver(this);
    seedPleasures(this);
    this.rebuildRoads();
    this.log('A tree. A few people. An unreasonable amount of potential.','tree',{x:0,y:0});
    ensureFamily(this);
    ensureWishes(this);
    ensureChallenges(this);
    advanceCollection(this);
  }
  random() {
    let n = this.randomState += 0x6D2B79F5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    this.randomState >>>= 0;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  }
  tile(x,y) { return this.tiles.get(key(x,y)); }
  get land() { return [...this.tiles.values()].filter(isUsable); }
  get reclaimed() { return [...this.tiles.values()].filter(t=>t.reclaimed && t.kind !== 'water'); }
  get freeLand() { return this.land.filter(t=>!t.building && !t.buildSite && !t.landform && !t.reservedFor); }
  get buildings() { return this.land.filter(t=>t.building); }
  get houses() { return this.land.filter(t=>['hut','house','townhouse','tower','manor','palace'].includes(t.building)); }
  get farms() { return this.land.filter(t=>t.building === 'farm'); }
  get forests() { return this.land.filter(t=>t.building==='forest'); }
  get beaches() { return this.land.filter(t=>t.building==='beach' && this.isCoast(t)); }
  get recreation() { return this.land.filter(t=>RECREATION.includes(t.building)); }
  get endgameYear() { const i=this.influence||{};return this.endgameStarted?this.endgameAt:Math.max(1950,2100-Math.min(150,(i.fire||0)*5+(i.rumble||0)*9+(i.nudge||0)*4+(i.rain||0)*3+(i.rescues||0)*2)); }
  isCoast(tile) { return tile?.kind==='land' && neighbors(tile).some(([x,y])=>this.tile(x,y)?.kind==='water'&&!this.tile(x,y)?.building); }
  get capacity() { return this.houses.reduce((sum,t)=>sum+ERAS[this.era].housing*(t.building==='palace'?4:t.building==='manor'?2:1)*(t.quakeDamage?.5:1)*(t.inspired?1.1:1)*(1+(t.extensionLevel||0)*.25),0); }
  get yearDuration() { const base=this.config.accelerating?secondsPerYear(this.year,this.era):FIXED_SECONDS_PER_YEAR;return Math.max(base,this.endgameStarted&&!this.sandbox?.65:this.year>=1920?.6:this.year>=1750?.38:0); }
  get age() { return [...AGES].reverse().find(age=>this.year>=age.year)||AGES[0]; }
  get temperament() { return CHARACTERS.find(p=>p.id===this.character)||{food:1,trade:1,science:1,growth:1}; }
  // 0: a slow village; 1: the windmill age from 1250; 2: land actually won from the sea.
  get housingBoom() { return this.reclaimed.length>0?2:this.year>=1250&&this.buildings.some(t=>t.building==='windmill')?1:0; }
  // With the 'grows along' setting (720) the limit rises as the island does well; lower settings are fixed.
  get growthLimit() {
    const chosen=Math.min(this.config.maxTiles,this.tiles.size);if(chosen<720)return chosen;
    // A limit the island has earned is never taken away again.
    let cap=Math.max(560,this.growthCap||0);
    if(this.year>=1600&&this.prosperity>50)cap=Math.max(cap,620);
    if(this.year>=1850&&this.prosperity>50&&this.freshwater>35)cap=Math.max(cap,680);
    if(this.year>=2000&&this.prosperity>48)cap=Math.max(cap,720);
    this.growthCap=cap;return Math.min(chosen,cap);
  }
  get pressure() { return this.population / Math.max(1,this.capacity); }
  get happiness() { return this.food < 5 ? 'Hungry' : this.protestUntil>this.year?'Restless':this.storm ? 'Concerned' : this.festival&&this.year<=this.festival.until ? 'Feestelijk' : this.prosperity>78?'Thriving':this.prosperity>40?'Content':'Getting by'; }
  get populationNote() { return /^Six people\./.test(this.currentRemark)&&Math.floor(this.population)!==6?`${Math.floor(this.population)} inwoners. Nog steeds geen vergadering.`:this.currentRemark; }
  get vehicleKind() { return this.year<600?'handcart':this.year<1750?'horse':this.year<1900?'coach':this.year<1955?'oldtimer':'car'; }
  get carCount() { return this.year>=1900 && this.era>=3 && this.power>0 && this.routes.length>2 ? Math.min(9,Math.floor(this.population/45*Math.min(1,this.power/Math.max(1,this.powerDemand)))) : 0; }
  get bikeCount() { return this.year>=1860&&this.era>=2&&this.routes.length>2?Math.min(14,Math.floor(this.population/28)):0; }
  layoutBounds() {
    const land=this.land;return{back:Math.min(...land.map(t=>t.x+t.y)),front:Math.max(...land.map(t=>t.x+t.y)),left:Math.min(...land.map(t=>t.x-t.y)),right:Math.max(...land.map(t=>t.x-t.y))};
  }
  plotPosition(tile,bounds=this.layoutBounds()) {
    return{depth:(tile.x+tile.y-bounds.back)/Math.max(1,bounds.front-bounds.back),side:(tile.x-tile.y-bounds.left)/Math.max(1,bounds.right-bounds.left)};
  }
  choosePlot(type,plots=this.freeLand) {
    const bounds=this.layoutBounds();
    const desired=['factory','powerplant','workshop'].includes(type)?'industry':type==='tower'?'skyline':type==='farm'?'fields':['school','library','science-center'].includes(type)?'knowledge':['market','shop','bakery','cafe'].includes(type)?'town':['park','playground','garden','theater'].includes(type)?'gardens':null;
    const baseScore=tile=>{
      const {depth,side}=this.plotPosition(tile,bounds);
      if(type==='tower')return depth*8+side*2;
      if(['factory','powerplant','workshop'].includes(type))return depth*6+(1-side)*4;
      if(type==='farm')return(1-depth)*6+side*4;
      if(['school','library','science-center'].includes(type))return Math.abs(depth-.55)*8+Math.abs(side-.42)*5;
      if(['market','shop','bakery','cafe'].includes(type))return Math.abs(depth-.78)*6+Math.abs(side-.65)*4;
      if(['park','playground','garden','theater'].includes(type))return Math.abs(depth-.8)*5+Math.abs(side-.35)*3;
      return Math.abs(depth-.62)*5+Math.abs(side-.6)*2+Number(!!tile.road)*.5;
    };
    const housing=['hut','house','townhouse','tower'].includes(type);
    const dwelling=t=>t&&['hut','house','townhouse','tower','manor','palace'].includes(t.buildSite?.type||t.building);
    const roomAround=t=>{
      if(!housing)return 0;
      let penalty=0;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if((dx||dy)&&dwelling(this.tile(t.x+dx,t.y+dy)))penalty+=dx&&dy?4:8;
      return penalty;
    };
    const score=t=>baseScore(t)+roomAround(t)+(desired&&t.district!==desired?5:0)+(t.district==='heritage'?12:0)+(this.era===0?Math.hypot(t.x,t.y)*.6:0)-(t.burntForest&&['hut','house','townhouse','tower'].includes(type)?4:0);
    let best,bestScore=Infinity;for(const tile of plots){const value=score(tile);if(value<bestScore){best=tile;bestScore=value;}}return best;
  }
  homeTypeFor(tile) {
    if(this.era<3)return this.era===0?'hut':'house';
    if(this.year<1960)return'townhouse';
    const roomForTower=tile.building==='tower'||this.houses.filter(t=>t.building==='tower').length<Math.max(2,Math.ceil(this.houses.length*.3));
    return this.plotPosition(tile).depth<.43&&roomForTower?'tower':'townhouse';
  }
  get energySource() { return this.power>0?(this.era>=4?'Advanced grid':this.buildings.some(t=>t.building==='solar')?'Steam + sun + wind':'Wood-fired steam'):this.buildings.some(t=>t.building==='windmill')?'Fire + wind power':'Campfires'; }
  chooseRemark() {
    const pool=[...REMARKS[['early','village','industry','modern','future'][this.era]]];
    const has=type=>this.buildings.some(t=>t.building===type);
    if(this.storm)pool.push('The sea is taking this personally.','The weather forecast has been amended to “indoors”.');
    if(this.rainBoost)pool.push('The carrots are suspiciously optimistic.','The farmers thank a very localized cloud.');
    if(has('palace'))pool.push('The palace calls itself a modest extension.','The royal doorstep was once the first hut.','The palace has more curtains than the rest of the village.');
    if(has('library'))pool.push('The library has a waiting list for its best book.','Someone has underlined the entire philosophy section.');
    if(has('school'))pool.push('The schoolchildren have more questions than the council.','The school has requested an extension to lunchtime.');
    if(has('science-center'))pool.push('The science center has discovered a new reason to request funding.','The researchers are testing a hypothesis about the café queue.');
    if(has('factory'))pool.push('The factory insists the smoke is a sign of success.','The workers have named the loudest machine.');
    if(has('statue'))pool.push('The statue is more popular with the birds.','Nobody can agree who the statue is supposed to be.');
    if(has('theater'))pool.push('The theater is rehearsing a very local tragedy.','The front row has requested less experimental music.');
    if(has('park'))pool.push('The park has a regular who claims the best bench.','The ducks have declined to respect park regulations.','A picnic has become a weekly institution.');
    if(this.beaches.length)pool.push('The beach has acquired a sandcastle district.','The sea is cold. Everyone insists it is refreshing.','Someone has brought a towel to a planning meeting.');
    if(this.forests.length)pool.push('The woodland path is a popular place to avoid meetings.','The forest has been declared excellent for doing nothing.','The squirrels appear to be running a separate economy.');
    if(has('shop'))pool.push('The shopkeeper has invented the limited-time offer.','The village shop stocks three things and seven opinions.');
    if(has('bakery'))pool.push('The bakery queue has become a social institution.','The baker has introduced a dangerously popular bun.');
    if(has('cafe'))pool.push('The café terrace is doing important work for gossip.','One small coffee has occupied a table for three hours.');
    if(has('playground'))pool.push('The children have elected a mayor of the slide.','The playground is conducting unsupervised experiments in gravity.');
    if(has('fairground'))pool.push('The Ferris wheel is the fastest way to see every neighbor.','The fairground has made screaming a leisure activity.','The merry-go-round has a very committed regular.');
    if([...this.tiles.values()].some(t=>t.building==='bridge'))pool.push('The bridge has made the long way round unfashionable.');
    if(has('church'))pool.push('The church is discussing the theology of localized rain.','The bellringer is taking the job very seriously.');
    if(has('shrine'))pool.push('A shrine has appeared where someone once pointed at the sky.','The villagers are debating whether the cloud was a sign.');
    if(this.protestUntil>this.year)pool.push('The banners ask for fewer neighbors and more gardens.','The square has become a venue for strong feelings.');
    if(this.power>0)pool.push('The streetlights have changed everyone’s bedtime.','Someone has left every light on again.');
    if(this.carCount>0)pool.push('The first traffic jam consists of two cars.','The drivers would like to park nearer the bakery.','Someone has honked at a sheep.');
    if(this.land.some(t=>t.landform==='mountain'))pool.push('The mountain has declined a proposal to move slightly to the left.','The summit offers excellent views of other people’s problems.');
    if(this.land.some(t=>t.landform==='volcano'))pool.push('The volcano is described as “mostly quiet” in the property brochure.','The geologist has requested a slightly longer lunch break.');
    if(this.endgameStarted)pool.push('The island has entered the part of history with consequences.','The council is making some very long-term promises.');
    const options=pool.filter(text=>!this.recentRemarks.includes(text));
    this.currentRemark=options[Math.floor(this.random()*options.length)]||pool[0];
    this.recentRemarks=[...this.recentRemarks,this.currentRemark].slice(-8);
  }
  log(text,type='life',details={}) {
    const entry={year:this.year,text,type,id:`event-${++this.storySequence}`,priority:eventPriority(type),...details};
    this.history.push(entry);
    if(this.history.length>350){let index=this.history.findIndex((e,i)=>i>0&&(e.priority||eventPriority(e.type))<82);if(index<0)index=1;this.history.splice(index,1);}
    this.events.push(entry);rememberInFamily(this,entry);coastNotice(this,entry);return entry;
  }
  signal(type,tile,label) {
    this.signals.push({type,x:tile?.x??0,y:tile?.y??0,label,priority:eventPriority(type)});
    if(this.signals.length>40){const lowest=this.signals.reduce((index,e,i,a)=>e.priority<a[index].priority?i:index,0);this.signals.splice(lowest,1);}
  }
  tick() {
    if(this.ending) return;
    this.year++;
    for(const tile of this.tiles.values())if(tile.futureBuilding&&this.year>=unlockYear(tile.futureBuilding)){
      tile.building=tile.futureBuilding==='tower'?this.homeTypeFor(tile):tile.futureBuilding;delete tile.futureBuilding;tile.architecture=this.age.id;tile.builtYear=this.year;
    }
    if(this.storm) this.storm--;
    if(this.pumpBroken){this.pumpBroken--;if(!this.pumpBroken&&this.brokenPump){const pump=this.tiles.get(this.brokenPump);this.log('The pumping station returns to service. The crew leaves a new maintenance schedule on its door.','reform',{x:pump?.x,y:pump?.y});this.signal('repair',pump,'Pump restored · waterfront secure');}}
    if(this.drought) this.drought--;
    if(this.rainBoost) this.rainBoost--;
    if(this.inspiration) this.inspiration--;
    if(this.year===32 && !this.character){
      // Civic identity is independent of incidental animation/event random draws.
      const character=CHARACTERS[this.seed%CHARACTERS.length];
      this.character=character.id;this.log(character.story,'life');this.signal('celebrate',this.tile(0,1),character.name);
    }
    const workers=Math.max(1,this.population);
    advanceEconomy(this);
    this.technology += (.012 + Math.min(.04,workers*.0005)) * (this.prosperity/80) * (this.food>2?1:.3) * (this.inspiration?1.65:1) * this.temperament.science * (this.buildings.some(t=>t.building==='library')?1.18:1) * (this.buildings.some(t=>t.building==='school')?1.1:1) * (this.buildings.some(t=>t.building==='science-center')?1.25:1);
    let era = this.era;
    for(let i=0;i<ERAS.length;i++) if(this.technology >= ERAS[i].threshold&&this.year>=ERAS[i].year) era=i;
    if(era > this.era) {
      this.era = era;
      const lines = ['','Tools improve. Someone proposes a harbor. The fish are not consulted.','The pumping station is invented. The ocean files a complaint.','The skyline rises. So does the cost of living.','The future arrives. It still needs planning permission.'];
      this.log(lines[era],'technology');
      this.upgradeDistricts();
      this.rebuildRoads();
      this.signal('celebrate',this.tile(0,1),era>=3?'Paved streets!':'New ideas!');
    }
    this.seaLevel = clamp((this.year-420)*.0006,0,1.2);
    advanceEnvironment(this);
    if(this.year===12) this.log('The first harvest. Dinner becomes a recurring event.','farm');
    if(this.year===25) this.log('A village, apparently. Nobody remembers agreeing to this.','home');
    if(this.year===60) this.log('The tree is declared a landmark. The tree declines to comment.','tree');
    const age=AGES.find(age=>age.year===this.year&&age.year>1);
    if(age){captureSnapshot(this,age.name);this.log(`${age.name} begins. The builders have a new idea of what a proper home should look like.`,'age');this.signal('celebrate',this.tile(0,1),age.name);}
    this.advanceBuildings();
    if(this.year>=1750&&this.year%5===0)this.renewHomes();
    this.advanceFoundingHome();
    if(this.year%Math.max(2,5-this.era)===0) this.develop();
    if(this.year%9===0)this.ensureInfrastructure();
    if(this.year%7===0 && this.year>=21)this.ensureNeighborhoods();
    if(this.year%11===0)this.updateNature();
    if(this.year%11===0 && this.era>=2)this.organizeDistricts();
    if(this.year%10===0)this.chooseRemark();
    this.updatePower();
    this.updateCivicPressure();
    if(this.era>=1 && this.year%67===this.seed%19 && this.buildings.some(t=>t.building==='statue')){
      this.prosperity=Math.min(99,this.prosperity+5);this.log(['The village holds a festival. The music is better than the planning.','A sculptor unveils new work. The pigeons are the first patrons.','A tiny parade celebrates something. Nobody quite agrees what.'][Math.floor(this.random()*3)],'culture');this.signal('celebrate',this.buildings.find(t=>t.building==='statue'),'A very local festival!');
    }
    if(this.era>=1 && this.year%43===0)this.buildBridge();
    if(this.year===16 || (this.year%51===0 && this.era>=1)) this.buildDock();
    if(this.year%18===0 && this.era>=1) this.upgradeDistricts();
    if(this.year%12===0 && this.farms.length){
      const farm=this.farms[Math.floor(this.random()*this.farms.length)];
      this.signal('harvest',farm,'Harvest in!');
    }
    if(this.year%29===0 && !this.storm && this.recreation.length){
      const venue=this.recreation[Math.floor(this.random()*this.recreation.length)];
      if(venue.building!=='fairground'||this.power>0){this.signal('celebrate',venue,venue.building==='beach'?'A day by the sea':venue.building==='fairground'?'The fair is open!':'A little time off');}
    }
    if(this.year%23===0 && [...this.tiles.values()].some(t=>['dock','harbor'].includes(t.building))){
      this.food=Math.min(4000,this.food+8);this.wealth=Math.min(1500,this.wealth+12*this.temperament.trade);
      const dock=[...this.tiles.values()].find(t=>['dock','harbor'].includes(t.building));
      this.signal('trade',dock,'+12 trade');
      if(this.year===23 || this.year%69===0)this.log('A trading boat arrives. Eight baskets of food. Twelve coins. Several opinions.','trade');
    }
    for(const milestone of [10,25,50,100,250,500,1000]){
      if(workers<milestone && this.population>=milestone){this.log(`${milestone} inhabitants. The village arranges a very small celebration.`,'life');this.signal('celebrate',this.houses[0],`${milestone} neighbors!`);}
    }
    this.advanceProject();
    if(!this.project && this.year%4===0) this.tryExpansion();
    if(this.year>=this.nextStorm) {
      this.storm = 8+Math.floor(this.random()*5);
      this.nextStorm = this.year+95+Math.floor(this.random()*110);
      this.log(this.reclaimed.length?'A storm surge. The sea would like some of its land back.':'A storm passes over the island. Everyone has an indoor opinion.','storm');
      const vulnerable=this.reclaimed.filter(t=>t.kind==='land' && t.elevation < this.seaLevel+.6);
      if(vulnerable.length && this.random() < .62 + this.seaLevel*.13 + (100-this.environment)*.001 - this.dikeLevel*.06) this.flood(vulnerable);
    }
    if(this.reclaimed.length>10 && this.era>=2 && !this.pumpBroken && this.year%157===0) {
      const pump=this.buildings.find(t=>t.building==='pump');
      this.pumpBroken=9;this.brokenPump=pump?key(pump.x,pump.y):null;if(pump)pump.pumpBrokenUntil=this.year+9;
      this.log('A waterfront pump breaks down. Its maintenance crew begins a nine-year overhaul.','crisis',{x:pump?.x,y:pump?.y});
      this.signal('crisis',pump,'This pumping station needs repairs');
    }
    this.repairFloods();
    this.advanceGeology();
    advancePleasures(this);advanceCoast(this);advanceSquare(this);
    // Delights do not wait for a housing lull: they claim a fitting free plot when their time comes.
    if(this.year%9===4&&!this.storm)planDelight(this);
    advanceMonuments(this);advanceWeather(this);advanceCommissions(this);
    advanceCivicStory(this);
    advanceFamily(this);
    advanceWishes(this);
    this.advanceEndgame();
    this.tryLastDrop();
    advanceChallenges(this);
    advanceCollection(this);
  }
  develop() {
    if(this.wood < 7 || this.food < 3) return;
    const free=this.freeLand.sort((a,b)=>Number(!!a.road)-Number(!!b.road)||(Math.abs(a.x)+Math.abs(a.y))-(Math.abs(b.x)+Math.abs(b.y)));
    if(!free.length){
      if(this.food<this.population*.5){const plot=this.houses.find(t=>!t.foundingHome&&!t.buildSite&&t.district!=='heritage');if(plot){plot.building=null;if(this.planBuilding(plot,'farm')){plot.civicLegacy='A housing block became emergency farmland';if(this.year%20<5)this.log('A hungry district makes room for fields. Food takes precedence over another floor.','reform',{x:plot.x,y:plot.y});}}}
      return;
    }
    const needFood=this.food<Math.max(25,this.population*.9) || this.balance.food<-.5;
    const planned=[...this.tiles.values()].filter(t=>t.buildSite);
    // Homes come slowly until windmills and reclaimed land give the island room for a real building boom.
    const boom=this.housingBoom,homeSites=planned.filter(t=>['hut','house','townhouse','tower'].includes(t.buildSite.type)).length;
    // Homes come slowly, and never take the last few free plots: that stays for parks, delights and your gifts.
    const buildableLand=this.land.filter(t=>!t.landform).length,homeShare=this.houses.length/Math.max(1,buildableLand);
    const greenReserve=this.freeLand.length>6&&homeShare<.24+this.era*.015;
    const needHome=greenReserve&&this.population/(this.capacity+homeSites*ERAS[this.era].housing)>[.9,.82,.75][boom]&&homeSites<[1,1+this.era,2+this.era][boom];
    if(needHome || needFood) {
      if(needFood && planned.some(t=>t.buildSite.type==='farm'))return;
      if(planned.length>=2+this.era)return;
      const wanted=needFood?'farm':this.era>=3&&this.houses.filter(t=>t.building==='tower').length<this.houses.length*.3?'tower':this.era>=3?'townhouse':this.era===0?'hut':'house';
      const t=this.choosePlot(wanted,free);
      this.planBuilding(t,needFood?'farm':this.homeTypeFor(t));
    } else if(free.length>5){
      const has=type=>this.buildings.some(t=>t.building===type)||planned.some(t=>t.buildSite.type===type);
      if(this.year>=10 && !has('well'))this.planBuilding(free[0],'well');
      else if(this.population>=12 && !has('market'))this.planBuilding(free[0],'market');
      else if(this.era>=1 && this.farms.length>=3 && !has('windmill'))this.planBuilding(free[0],'windmill');
      else if(this.year%30===0 && free.length>12 && this.random()<.3)free.at(-1).building='tree';
      // Once the homes have their share, spare ground becomes parks and gardens rather than more streets.
      else if(this.year%8===0&&free.length>14&&this.houses.length>=this.land.filter(t=>!t.landform).length*.22){const spot=free[(this.year*7+this.seed)%free.length];if(spot&&!spot.road&&!spot.reservedFor){spot.building=this.year%16===0?'garden':'park';spot.builtYear=this.year;}}
      // Groves keep the island green: a tree on the quiet edge every so often, chosen without randomness.
      else if(this.year%11===0&&free.length>20){const edge=free.filter(t=>!t.road&&!this.isCoast(t)&&Math.hypot(t.x,t.y)>4);const t=edge[(this.year*7+this.seed)%Math.max(1,edge.length)];if(t)t.building=this.forests.some(f=>Math.hypot(f.x-t.x,f.y-t.y)<2)?'forest':'tree';}
    }
  }
  planBuilding(tile,type,free=false) {
    if(tile?.reservedFor&&tile.reservedFor!=='knowledge'||tile?.reservedFor==='knowledge'&&!['school','library','science-center','campus-square'].includes(type))return false;
    if(!tile || tile.kind!=='land' || tile.building || tile.buildSite || tile.landform || (!free && this.wood<7))return false;
    if(this.year<unlockYear(type))return false;
    delete tile.futureBuilding;
    const hadRoads=this.routes.length>0;
    tile.buildSite={type,architecture:this.age.id,progress:0,duration:type==='farm'?3:4+Math.min(3,this.era),started:this.year};
    if(!free){this.wood-=7;this.wealth=Math.max(0,this.wealth-3);}
    this.signal('build',tile,type==='farm'?'A field takes shape':'Builders at work');
    this.rebuildRoads();
    if(!hadRoads&&this.routes.length&&!this.history.some(e=>e.type==='road'))this.log('The first building site gets a path from the founding home. Civilization has a commute.','road');
    return true;
  }
  ensureInfrastructure() {
    const has=type=>this.buildings.some(t=>t.building===type)||this.land.some(t=>t.buildSite?.type===type);
    let types=[];
    if(this.era>=1)types.push('school','library','statue',this.temperament.building||'garden','theater','windmill');
    if(this.era>=2)types.unshift('factory','powerplant');
    if(this.era>=3)types.unshift('science-center','solar','turbine','garden');
    if(this.freshwater<55)types.unshift('well');
    if(this.era>=3&&this.power<this.powerDemand)types.unshift(this.year>=1980?'turbine':'powerplant');
    if(this.protestUntil>this.year)types.unshift('garden');
    if(this.belief>=4 && this.era>=1)types.unshift('church');
    else if(this.belief>=1)types.unshift('shrine');
    const desired=type=>type==='well'?Math.max(1,Math.ceil(this.population/700)):type==='powerplant'?Math.max(1,Math.ceil(this.powerDemand/100)):type==='turbine'?Math.max(1,Math.ceil(Math.max(0,this.powerDemand-this.power)/20)+this.buildings.filter(t=>t.building==='turbine').length):type==='school'?Math.min(4,Math.max(1,Math.ceil(this.population/900))):type==='factory'?Math.min(this.character==='garden'?2:6,Math.max(1,Math.ceil(this.population/(this.character==='harbor'?550:this.character==='builder'?700:1100)))):type==='science-center'?Math.min(2,Math.max(1,Math.ceil(this.population/2400))):1;
    const count=type=>this.buildings.filter(t=>t.building===type).length+this.land.filter(t=>t.buildSite?.type===type).length;
    const type=types.find(type=>this.year>=unlockYear(type)&&count(type)<desired(type));
    const campus=['school','library','science-center'].includes(type)?this.land.filter(t=>t.reservedFor==='knowledge'&&!t.building&&!t.buildSite):[];
    const free=[...this.freeLand,...campus].sort((a,b)=>Number(!!a.road)-Number(!!b.road)||Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
    if(!type || this.wood<14 || this.wealth<8 || this.land.filter(t=>t.buildSite).length>=3+this.era)return;
    if(!free.length&&this.land.length>60&&this.houses.length>12){
      const replacement=this.choosePlot(type,this.houses.filter(t=>!t.foundingHome&&!t.quakeDamage&&t.district!=='heritage'));
      if(replacement){replacement.building=null;free.push(replacement);}
    }
    if(!free.length)return;
    if(this.planBuilding(this.choosePlot(type,free),type)){this.wealth-=5;this.wood-=3;}
  }
  organizeDistricts() {
    const bounds=this.layoutBounds();let changed=false,moves=0;
    // Foreground homes stay low; the skyline belongs behind everyday street life.
    for(const home of this.houses)if(home.building==='tower'&&this.plotPosition(home,bounds).depth>=.43){home.building='townhouse';changed=true;}
    const movable=this.houses.filter(t=>!t.foundingHome&&!t.buildSite&&!t.quakeDamage&&t.district!=='heritage');
    for(const type of ['farm','factory','powerplant','school','science-center']){
      const misplaced=this.buildings.filter(t=>t.building===type).filter(t=>{
        const p=this.plotPosition(t,bounds);return type==='farm'?p.depth<.52||p.side>.65:['factory','powerplant'].includes(type)?p.depth>.5:false;
      });
      for(const from of misplaced.slice(0,2)){
        const to=this.choosePlot(type,[...this.freeLand,...movable.filter(t=>['hut','house','townhouse'].includes(t.building))]);
        if(!to||to===from)continue;
        const p=this.plotPosition(to,bounds),old=this.plotPosition(from,bounds);
        const improves=type==='farm'?(p.depth-p.side)>(old.depth-old.side)+.15:p.depth<old.depth-.15;
        if(!improves)continue;
        const displaced=to.building,blueprint=to.futureBuilding;
        to.building=type;delete to.futureBuilding;from.building=displaced||null;
        if(blueprint)from.futureBuilding=blueprint;else delete from.futureBuilding;
        to.builtYear=this.year;
        changed=true;moves++;
      }
    }
    if(changed){this.rebuildRoads();if(moves&&!this.history.some(h=>h.type==='zoning'))this.log('The town planner groups the fields, workshops and civic buildings. Tall homes move to the back. The view improves.','zoning');}
  }
  ensureNeighborhoods() {
    const has=type=>this.buildings.some(t=>t.building===type)||this.land.some(t=>t.buildSite?.type===type);
    const types=['park'];
    if(this.population>=10)types.push('shop');
    if(this.era>=1)types.push('bakery','playground','festival-ground');
    if(this.era>=2)types.push('cafe');
    if(this.era>=2 && this.year>=1900 && this.power>0)types.push('fairground');
    const type=types.find(t=>!has(t));
    if(!type || this.wood<12 || this.wealth<10 || this.land.filter(t=>t.buildSite).length>=3+this.era)return;
    let free=this.freeLand.sort((a,b)=>Number(!!b.road)-Number(!!a.road)||Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
    let spot=free[0];
    // Established, full cities can make room for amenities without resetting their map.
    if(!spot && this.land.length>50 && this.houses.length>12){
      spot=this.houses.filter(t=>!t.foundingHome&&!t.quakeDamage&&t.district!=='heritage').sort((a,b)=>(a.builtYear||0)-(b.builtYear||0))[0];
      if(spot){spot.building=null;this.log('One crowded block makes room for a new neighborhood amenity. The council calls it balance.','culture');}
    }
    if(spot && this.planBuilding(spot,type))this.wealth-=3;
  }
  updateNature() {
    let changed=false;
    while(this.forests.length<2){
      const tree=this.land.find(t=>t.building==='tree');if(!tree)break;
      tree.building='forest';changed=true;
    }
    const inland=this.land.filter(t=>t.building==='beach'&&!this.isCoast(t));
    for(const beach of inland){beach.building='park';changed=true;}
    if(inland.length)this.log('The old beach is now an inland park. The sandcastle survives as a landmark.','culture');
    const hasBeach=this.beaches.length||this.land.some(t=>t.buildSite?.type==='beach');
    if(!hasBeach && !this.ending){
      let shore=this.freeLand.filter(t=>this.isCoast(t)).sort((a,b)=>b.y-a.y)[0];
      if(!shore && this.land.length>50 && this.houses.length>12 && this.wealth>15){
        shore=this.houses.filter(t=>!t.foundingHome&&this.isCoast(t)).sort((a,b)=>b.y-a.y)[0];
        if(shore){shore.building=null;this.log('A waterfront block becomes a public beach. The sea view is now for everyone.','culture');}
      }
      if(shore && this.wood>=7){this.planBuilding(shore,'beach');changed=true;}
    }
    if(this.beaches.length<6){reserveBeaches(this);changed=true;}
    const target=Math.min(12,6+Math.floor(this.land.length/90));
    if(this.forests.length<target && this.land.length>45){
      const grove=this.freeLand.filter(t=>!t.road&&!t.burntForest).sort((a,b)=>{
        const score=t=>neighbors(t).filter(([x,y])=>['tree','forest'].includes(this.tile(x,y)?.building)).length;
        return score(b)-score(a)||Math.hypot(b.x,b.y)-Math.hypot(a.x,a.y);
      })[0];
    if(grove && this.wood>=10)this.planBuilding(grove,'forest');
    }
    if(changed)this.rebuildRoads();
  }
  updatePower() {
    const plants=this.buildings.filter(t=>t.building==='powerplant'&&this.year>=1880);
    const solar=this.buildings.filter(t=>t.building==='solar'&&this.year>=1980).length;
    const turbines=this.buildings.filter(t=>t.building==='turbine'&&this.year>=1980).length;
    const fuel=this.wood>=plants.length*.3;
    this.power=plants.length*(fuel?18+this.era*15+Math.min(12,this.population*.01):0)+solar*18+turbines*20;
    this.powerDemand=this.houses.length*.7+this.population*.025+this.buildings.filter(t=>t.building==='factory').length*4+this.buildings.filter(t=>t.building==='fairground').length*6;
    this.powerSatisfaction=Math.min(1,this.power/Math.max(1,this.powerDemand));
    if(fuel)this.wood=Math.max(0,this.wood-plants.length*.3);
    const factories=this.buildings.filter(t=>t.building==='factory').length;
    this.stone=Math.min(600,this.stone+factories*(.3+.6*Math.min(1,this.power/Math.max(1,this.powerDemand))));
    this.wealth=Math.min(1500,this.wealth+factories*(.5+.9*Math.min(1,this.power/Math.max(1,this.powerDemand))));
  }
  updateCivicPressure() {
    const occupation=this.buildings.length/Math.max(1,this.land.length);
    const parks=this.buildings.filter(t=>['garden','park'].includes(t.building)).length;
    const leisure=this.recreation.filter(t=>!['garden','park'].includes(t.building)).length;
    const target=Math.max(0,(occupation-.55)*110)+Math.max(0,this.population/Math.max(1,this.land.length)-1.5)*7+Math.max(0,55-this.prosperity)*.85+(100-this.environment)*.12-parks*13-leisure*3;
    this.unrest=clamp(this.unrest+(target-this.unrest)*.1-(this.inspiration?.7:0),0,100);
    if(this.unrest>=58 && this.year>=this.nextProtest && this.year>this.protestUntil){
      this.protestUntil=this.year+30;this.nextProtest=this.year+100;
      this.prosperity=Math.max(12,this.prosperity-4);
      this.log('A protest fills the square. More space, fewer neighbors, and a proper park, please.','protest');
      this.signal('protest',this.tile(0,1),'More room! More gardens!');
    }
    if(this.protestUntil>this.year)this.wealth=Math.max(0,this.wealth-.5);
    if(this.unrest>70 && this.year%83===0 && parks<6 && this.wealth>50){
      const room=this.freeLand.find(t=>!t.road)||this.land.find(t=>t.building==='tree'&&!t.foundingHome);
      if(room){room.building=null;this.planBuilding(room,'park');this.wealth-=20;this.log('After the protests, the council makes room for another public park. A bench is unveiled.','culture');}
    }
  }
  buildBridge() {
    const bridges=[...this.tiles.values()].filter(t=>t.building==='bridge');
    if(bridges.length>=Math.min(5,this.era+1)||this.wood<12)return;
    const gap=[...this.tiles.values()].filter(t=>t.kind==='water'&&!t.building&&neighbors(t).filter(([x,y])=>this.tile(x,y)?.kind==='land').length>=2).sort((a,b)=>Number(!!b.rift)-Number(!!a.rift))[0];
    if(!gap)return;
    gap.building='bridge';gap.builtYear=this.year;this.wood-=12;
    this.rebuildRoads();this.log('A bridge cuts across the inlet. The scenic route is now a choice.','bridge');this.signal('built',gap,'A shortcut over the sea');
  }
  advanceBuildings() {
    let changed=false;
    for(const t of this.land){
      if(t.quakeDamage&&!t.fire&&t.building!=='ruins'){
        if(this.wood>=.4){this.wood-=.4;t.quakeDamage=Math.max(0,t.quakeDamage-.1);if(t.quakeDamage<.01){t.quakeDamage=0;if(t.needsRetrofit){t.retrofitted=true;t.needsRetrofit=false;}this.signal('repair',t,'Home repaired');}}
      }
      if(!t.buildSite || this.storm)continue;
      t.buildSite.progress+=(this.inspiration?2:1);
      if(t.buildSite.progress<t.buildSite.duration)continue;
      const type=t.buildSite.type;t.architecture=t.buildSite.architecture||this.age.id;t.building=type;if(['hut','house','townhouse','tower'].includes(type)&&this.policies.safety)t.retrofitted=true;t.builtYear=this.year;t.buildSite=null;changed=true;
      if(this.fireCode&&['hut','house','townhouse','tower'].includes(type))t.material='stone';
      const labels={farm:'New farm',well:'Fresh water',market:'Market open',windmill:'Grain, but faster',park:'A park for the locals',forest:'A little more woodland',beach:'Room for a beach towel',shop:'Open for business',bakery:'Fresh bread!',cafe:'The terrace is open',playground:'Time to play!',fairground:'A very small funfair!',school:'School is open!','science-center':'The laboratories are open'};
      this.signal('built',t,labels[type]||DELIGHT_LABELS[type]||(['hut','house','townhouse','tower'].includes(type)?'New home':'A new place for the locals'));
      if(t.reclaimed && !this.history.some(e=>e.type==='district'))this.log('The first buildings on reclaimed land. Sea views, technically.','district');
      const openings={well:'A village well. Water is now a local amenity.',market:'The market opens. Someone immediately complains about the prices.',windmill:'A windmill begins turning. The wind receives no compensation.','fire-station':'De brandweerkazerne opent. De emmers hebben nu een vaste ploeg.',library:'A library opens. Silence becomes an official policy.',factory:'The first factory starts up. The morning now has a whistle.',powerplant:'A wood-fired steam generator brings electricity. The sunset loses its monopoly.',solar:'Solar panels join the power grid. The weather gets a second job.',turbine:'A wind turbine joins the grid. The wind has been promoted.',statue:'A statue appears in the square. Its subject is open to interpretation.',garden:'A public garden opens. Sitting becomes a civic activity.',theater:'A theater opens. The island develops a dramatic side.',shrine:'A little shrine follows the strange events. The sky is officially under investigation.',church:'A church rises after the miracles. The villagers would like to know who to thank. Or blame.'};
      Object.assign(openings,{park:'A public park opens. Doing nothing is now an approved land use.',forest:'A woodland is planted. The squirrels establish a rival economy.',beach:'A beach opens on the new shore. The sea asks everyone to take their towels home.',shop:'The first shop opens. Wanting things becomes a local industry.',bakery:'A bakery opens. The village begins scheduling its mornings around bread.',cafe:'A café terrace opens. The gossip now comes with a small cup.',playground:'A playground opens. The children test gravity. Repeatedly.',fairground:'A Ferris wheel begins turning. The island invents a recreational queue.'});
      Object.assign(openings,{school:'A school opens. The children immediately question the entire system.','science-center':'A science center opens. The researchers request more funding before lunch.'});
      Object.assign(openings,DELIGHT_OPENINGS,{watchtower:'De uitkijktoren is klaar. De eerste bezoeker roept naar beneden dat hij zijn huis ziet.','rose-garden':'De rozentuin bloeit. Het ruikt tot aan de haven.','grand-fountain':'De grote fontein spuit voor het eerst. De duiven zijn meteen vaste klant.',carillon:'De klokkentoren slaat voor het eerst. Hij is twee minuten te vroeg, uit enthousiasme.'});
      if(DELIGHT_OPENINGS[type]&&(this.seed+this.year)%3!==0)startParty(this,t,`Opening: ${DELIGHT_LABELS[type]}`,['Er wordt een lint doorgeknipt. Het lint is er niet blij mee.','Gratis koffie! De hele wijk komt kijken.','De fanfare oefent nog. Het klinkt bijna als muziek.'],8);
      if(type==='powerplant'&&this.year>=1980)openings.powerplant='Een regelbare reservecentrale versterkt het stroomnet. De stad kiest voor leveringszekerheid.';
      if(['school','library','science-center'].includes(type)){const court=neighbors(t).map(([x,y])=>this.tile(x,y)).find(p=>p?.kind==='land'&&!p.building&&!p.buildSite&&!p.landform&&(!p.reservedFor||p.reservedFor==='knowledge')&&p.district==='knowledge');if(court&&!this.buildings.some(p=>p.building==='campus-square')){court.building='campus-square';court.civicLegacy='The knowledge quarter';court.builtYear=this.year;}}
      if(openings[type])this.log(this.buildings.filter(t=>t.building===type).length>1?`${openings[type].replace(/The first /,'Another ')} A new neighborhood gets its turn.`:openings[type],DELIGHT_OPENINGS[type]?'delight':['statue','garden','theater','park','forest','beach','playground','fairground'].includes(type)?'culture':['shop','bakery','cafe'].includes(type)?'trade':'technology',{x:t.x,y:t.y});
      else if(this.buildings.length<18)this.log(type==='farm'?'Another field is planted. Dinner looks increasingly likely.':'A new home is finished. The neighbors come over to inspect it.','home',{x:t.x,y:t.y});
    }
    if(changed)this.rebuildRoads();
  }
  advanceFoundingHome() {
    const home=[...this.tiles.values()].find(t=>t.foundingHome);
    if(!home || home.kind!=='land' || home.quakeDamage||home.fire||home.rebuildFrom)return;
    if(home.building==='palace'&&this.year===this.age.year){home.architecture=this.age.id;home.builtYear=this.year;this.signal('palace',home,'The palace enters a new age');}
    if(this.era>=1 && this.population>=18 && !['manor','palace'].includes(home.building)){
      home.building='manor';delete home.futureBuilding;home.architecture=this.age.id;home.builtYear=this.year;
      this.log('The very first hut becomes a manor. Its owners begin referring to everyone else as “the village”.','palace',{x:home.x,y:home.y});
      growEstate(this,home);captureSnapshot(this,'The first manor');
      this.signal('palace',home,'The first hut → a manor');
    }else if(this.year>=1000 && this.population>=(this.character==='builder'?50:70) && home.building==='manor' && !this.court){
      delete home.futureBuilding;
      if(buildCastle(this)){captureSnapshot(this,'The palace and its gardens');this.signal('palace',this.tile(this.court.x,this.court.y),'Een kasteel!');}
    }
  }
  rebuildRoads() {
    const old=new Set([...this.tiles].filter(([,t])=>t.road).map(([id])=>id));
    for(const t of this.tiles.values()){t.road=false;t.roadLinks=[];t.walkable=false;}
    const walk=t=>t && !t.landform && (t.kind==='land'||t.building==='bridge');
    const root=this.houses.find(t=>t.foundingHome&&walk(t))||this.houses.find(walk)||this.land.find(walk);
    this.routes=[];this.journeys=[];
    if(!root){this.roadCoverage=0;return;}
    const rootId=key(root.x,root.y),parents=new Map([[rootId,null]]),queue=[root];
    for(let i=0;i<queue.length;i++)for(const [x,y]of neighbors(queue[i])){
      const t=this.tile(x,y),id=key(x,y);
      if(!walk(t)||parents.has(id)||['tree','original-tree'].includes(t.building))continue;
      parents.set(id,key(queue[i].x,queue[i].y));queue.push(t);
    }
    for(const id of parents.keys())this.tiles.get(id).walkable=true;
    // Natural places can be reached on foot. Only actual construction needs a road.
    const nature=['forest','beach','tree','original-tree','flowers'];
    const destinations=[...this.tiles.values()].filter(t=>(t.buildSite||t.building&&!nature.includes(t.building)&&!['dock','harbor','palace-wing'].includes(t.building))&&walk(t));
    const roadTargets=destinations.filter(t=>!t.foundingHome&&!(t.foundingField&&!t.buildSite&&(t.builtYear||1)===1));
    // Docks meet the road at their landward end.
    for(const dock of [...this.tiles.values()].filter(t=>['dock','harbor'].includes(t.building))){const shore=neighbors(dock).map(([x,y])=>this.tile(x,y)).find(t=>t?.kind==='land');if(shore){destinations.push(shore);roadTargets.push(shore);}}
    let connected=0;
    for(const target of roadTargets){
      let id=key(target.x,target.y);if(!parents.has(id))continue;
      const route=[];
      while(id){const t=this.tiles.get(id);t.road=true;if(!old.has(id))t.roadYear=this.year;route.push(id);const next=parents.get(id);if(next&&!t.roadLinks.includes(next)){t.roadLinks.push(next);this.tiles.get(next).roadLinks.push(id);}id=next;}
      if(route.length>1)this.routes.push(route.reverse());
      connected++;
    }
    this.routes=this.routes.slice(-80);
    const homes=this.houses.filter(t=>parents.has(key(t.x,t.y)));
    const homeIds=new Set(homes.map(t=>key(t.x,t.y)));
    const jobs=destinations.filter(t=>(!homeIds.has(key(t.x,t.y))||t.fire)&&parents.has(key(t.x,t.y)));
    const naturalPlaces=this.land.filter(t=>t.walkable&&(nature.includes(t.building)&&t.building!=='original-tree'||t.trailhead));
    // Spread walking destinations around the entire island, including undeveloped ground.
    const open=this.land.filter(t=>t.walkable&&!t.building&&!t.buildSite);
    const roam=[];
    for(let i=0;i<8&&open.length;i++){
      const angle=i*Math.PI/4,x=Math.cos(angle)*7,y=Math.sin(angle)*7;
      const target=open.reduce((best,t)=>Math.hypot(t.x-x,t.y-y)<Math.hypot(best.x-x,best.y-y)?t:best);
      if(!roam.includes(target))roam.push(target);
    }
    const stops=[...new Set([...jobs,...naturalPlaces,...roam])].sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x));
    const path=t=>{let id=key(t.x,t.y),r=[];if(!parents.has(id))return r;while(id){r.push(id);id=parents.get(id);}return r.reverse();};
    this.journeys=stops.flatMap((job,i)=>{let home=homes[i%Math.max(1,homes.length)];if(home===job)home=homes[(i+1)%Math.max(1,homes.length)];if(!home)return[];const a=path(home),b=path(job);if(!a.length||!b.length)return[];let common=0;while(common<Math.min(a.length,b.length)&&a[common]===b[common])common++;const route=[...a.slice(common-1).reverse(),...b.slice(common)];return route.length>1?[{route,from:key(home.x,home.y),to:key(job.x,job.y),purpose:job.fire?'rescue':job.buildSite?'building':['shop','market','bakery','cafe'].includes(job.building)?'shopping':['school','library','science-center'].includes(job.building)?'learning':['farm','factory','workshop','powerplant','pump'].includes(job.building)?'work':roam.includes(job)?'exploring':'leisure'}]:[];});
    this.roadCoverage=roadTargets.length?connected/roadTargets.length:0;
    this.routeVersion=2;
  }
  // Old streets renew over time: houses become townhouses in the age of steam, back districts get towers from 1960.
  renewHomes() {
    const homes=this.houses.filter(t=>!t.foundingHome&&!t.buildSite&&t.district!=='heritage');
    const towers=homes.filter(t=>t.building==='tower').length;
    const candidates=homes.filter(t=>t.building==='house'||t.building==='hut'||this.year>=1960&&t.building==='townhouse'&&towers<homes.length*.35&&this.plotPosition(t).depth<.5);
    for(const t of candidates.sort((a,b)=>(a.builtYear||0)-(b.builtYear||0)).slice(0,this.year>=1960?3:2)){
      const next=this.homeTypeFor(t);if(next===t.building)continue;
      t.building=next;t.architecture=this.age.id;t.builtYear=this.year;this.signal('built',t,next==='tower'?'Een torenflat!':'Een nieuw herenhuis');
    }
  }
  upgradeDistricts() {
    const houses=this.houses.filter(t=>!t.foundingHome&&!t.castle&&!['manor','palace','royal-palace'].includes(t.building));
    const upgrade=houses[Math.floor(this.random()*houses.length)];
    if(upgrade) upgrade.building=this.homeTypeFor(upgrade);
    if(upgrade){upgrade.architecture=this.age.id;upgrade.builtYear=this.year;this.signal('built',upgrade,'A home for a new age');}
    this.rebuildRoads();
  }
  buildDock() {
    const docks=[...this.tiles.values()].filter(t=>t.building==='dock' || t.building==='harbor');
    if(docks.length>=Math.min(4,this.era+1)) return;
    const coast=this.land.filter(t=>t.y>=1).sort((a,b)=>b.y-a.y);
    for(const t of coast) {
      const water=this.tile(t.x,t.y+1);
      if(water?.kind==='water' && !water.building) {
        water.building=this.era>=2?'harbor':'dock';
        if(docks.length===0) this.log('A small wooden dock. Big ideas about going somewhere.','dock');
        this.signal('built',water,'Open for visitors');this.rebuildRoads();
        return;
      }
    }
  }
  tryExpansion() {
    if(this.era<1 || this.project || this.storm || this.prosperity<35 || this.food<8) return false;
    // Small embankments need established drainage engineering; steam-era
    // projects use pumps. Spare inland plots must be used before buying ocean.
    if(this.year<1250 || this.technology<3) return false;
    if(this.era===1 && !this.buildings.some(t=>t.building==='windmill')) return false;
    const total=this.land.length+this.reclaimed.filter(t=>t.kind==='flooded').length;
    const limit=this.growthLimit;
    if(total>=limit) return false;
    const buildable=this.land.filter(t=>!t.landform).length;
    const reserve=Math.max(3,Math.min(8,Math.floor(buildable*.04)));
    const pressure=this.freeLand.length<=reserve && (this.pressure>.86 || this.food<this.population*.5);
    const ambition=this.era===4 && this.obsessed && this.config.rareEndings && this.endgameStarted;
    // Polder ambition: once mills (and later pumps) exist, the island keeps winning land while its free ground shrinks.
    // Polder ambition: with mills, and later pumps, the island keeps winning land while free ground runs low.
    const polder=(this.housingBoom>=1||this.era>=2)&&this.freeLand.length<=Math.max(reserve,Math.floor(buildable*(this.era>=2?.45:.3)))&&this.prosperity>35;
    if(!pressure && !polder && !ambition) return false;
    const maxBatch=[0,8,14,20,ambition?30:26][this.era];
    const batch=Math.min(maxBatch,limit-total);
    const costs={wood:batch*(this.era===1?5:2),stone:batch*(this.era===1?1:3),wealth:batch*(this.era===1?3:5)};
    if(this.wood<costs.wood || this.stone<costs.stone || this.wealth<costs.wealth) return false;
    const frontier=[...this.tiles.values()].filter(t=>t.kind==='water' && !t.building && neighbors(t).some(([x,y])=>this.tile(x,y)?.kind==='land') && (ambition||!neighbors(t).some(([x,y])=>this.tile(x,y)?.protectedCoast)));
    if(!frontier.length) return false;
    // Follow one connected coast; each additional tile touches this project or existing land.
    const angle=this.random()*Math.PI*2;
    frontier.sort((a,b)=>(b.x*Math.cos(angle)+b.y*Math.sin(angle))-(a.x*Math.cos(angle)+a.y*Math.sin(angle)));
    const picked=[frontier[0]];
    let isArtificial=this.era===4 && this.projectCount%4===3 && batch>=3;
    while(picked.length<batch) {
      const candidate=[...this.tiles.values()].filter(t=>t.kind==='water' && !t.building && !picked.includes(t) && (ambition||!neighbors(t).some(([x,y])=>this.tile(x,y)?.protectedCoast)) && neighbors(t).some(([x,y])=>picked.includes(this.tile(x,y))) && (!isArtificial || !neighbors(t).some(([x,y])=>this.tile(x,y)?.kind==='land'))).sort((a,b)=>{
        const distance=t=>Math.abs(t.x-picked[0].x)+Math.abs(t.y-picked[0].y)+Math.hypot(t.x,t.y)*.5;
        return distance(a)-distance(b);
      })[0];
      if(!candidate){
        if(isArtificial && picked.length===1){isArtificial=false;continue;}
        break;
      }
      picked.push(candidate);
    }
    const actual=picked.length/batch;
    this.wood-=costs.wood*actual;
    this.stone-=costs.stone*actual;
    this.wealth-=costs.wealth*actual;
    this.project={ambitious:ambition,tiles:picked.map(t=>key(t.x,t.y)),stage:0,elapsed:0,started:this.year,era:this.era,manual:this.era===1,isArtificial};
    for(const t of picked) { t.kind='construction'; t.progress=0; t.building=null; }
    this.projectCount++;
    if(this.projectCount===1) this.log('Room is running out. A small embankment is proposed. The sea objects.','dike');
    else if(this.projectCount%3===0) this.log(this.project.isArtificial?'An artificial island, attached by a bridge. Geography is now optional.':'Another stretch of coast is enclosed. The map is becoming a rough suggestion.','dike');
    return true;
  }
  advanceProject() {
    const p=this.project;
    if(!p) return;
    if(this.storm || (this.pumpBroken && p.stage===2 && !p.manual && (!this.brokenPump||p.tiles.includes(this.brokenPump)))) return;
    const upkeep=p.tiles.length*.055;
    if(this.wood<upkeep || this.wealth<upkeep) return;
    this.wood-=upkeep;
    this.wealth-=upkeep;
    p.elapsed+=p.ambitious?12:this.inspiration?2:1;
    // Modern pumping stations and machines work through a polder in a little over half the time.
    const duration=Math.max(1,Math.round(PROJECT_STAGES[p.stage].duration * (p.manual && p.stage===2 ? 1.7 : 1) * (this.era>=3?.6:1)));
    for(const id of p.tiles) this.tiles.get(id).progress=(p.stage+p.elapsed/duration)/PROJECT_STAGES.length;
    if(p.elapsed<duration) return;
    p.elapsed=0;
    p.stage++;
    if(p.stage===1 && this.projectCount===1) this.log('The first dike is completed. The sea objects, more formally.','dike');
    if(p.stage===2 && !p.manual) {
      const pump=this.tiles.get(p.tiles[p.isArtificial?1:0]);
      pump.building='pump';
    }
    if(p.stage<PROJECT_STAGES.length) return;
    for(const id of p.tiles) {
      const t=this.tiles.get(id);
      t.kind='land'; t.reclaimed=true; t.elevation=.15+this.dikeLevel*.07; t.builtYear=this.year; t.progress=1;
      t.district=districtFor(this,t);t.polder=this.projectCount;t.oldDike=neighbors(t).some(([x,y])=>!p.tiles.includes(key(x,y))&&this.tile(x,y)?.kind!=='land');
      if(!t.building) t.building=null;
    }
    // Like real polders, part of the new land becomes farmland when the island needs more food.
    if(this.balance.food<2||this.food<this.population*1.5){
      const fresh=p.tiles.map(id=>this.tiles.get(id)).filter(t=>t.kind==='land'&&!t.building);
      for(const t of fresh.filter((_,i)=>i%3===0)){t.building='farm';t.builtYear=this.year;}
    }
    if(p.isArtificial) {
      const bridge=this.tiles.get(p.tiles[0]);bridge.kind='water';bridge.building='bridge';bridge.reclaimed=false;
    }
    const area=p.tiles.length-(p.isArtificial?1:0);
    this.log(`${area} ${area===1?'tile':'tiles'} reclaimed. Fish remain unconvinced.`,'land');
    const naturalBeach=this.land.some(t=>t.natural && neighbors(t).some(([x,y])=>this.tile(x,y)?.kind==='water'));
    if(!naturalBeach && !this.history.some(e=>e.type==='beach')) this.log('The last natural beach disappears. Tourism increases.','beach');
    this.project=null;
    captureSnapshot(this,`Polder ${this.projectCount}`);
    this.rebuildRoads();
    this.signal('land',this.tiles.get(p.tiles.at(-1)),`+${area} land`);
  }
  flood(tiles=this.reclaimed.filter(t=>t.kind==='land'),force=false) {
    if(!tiles.length) return;
    const count=Math.max(1,Math.min(tiles.length,Math.ceil(tiles.length*.2)));
    const lowest=[...tiles].sort((a,b)=>a.elevation-b.elevation)[0],pool=tiles.filter(t=>t.polder===lowest.polder);
    const district=[lowest],seen=new Set([lowest]);
    for(let i=0;i<district.length&&district.length<count;i++)for(const [x,y]of neighbors(district[i])){const t=this.tile(x,y);if(pool.includes(t)&&!seen.has(t)){seen.add(t);district.push(t);if(district.length===count)break;}}
    for(const t of district) {
      t.kind='flooded'; t.floodYears=0; t.damage=1;t.floodHistory=(t.floodHistory||0)+1;t.lastFloodYear=this.year;
    }
    this.population=Math.max(4,this.population-Math.min(this.population*.08,district.length*.3));
    this.prosperity=Math.max(15,this.prosperity-7);
    this.storyStats.floods++;captureSnapshot(this,`Flood ${this.storyStats.floods}`);
    const first=lowest;this.log(this.storyStats.floods===1?'The Great Flood. The lowest district evacuates; the rest of the island carries on.':`Another surge reaches the waterfront. Flood number ${this.storyStats.floods}; the evacuation plan is no longer theoretical.`,'flood',{x:first.x,y:first.y});
    this.signal('flood',first,`${district.length} flooded plots · evacuation`);
    if(force) this.storm=8;
    this.rebuildRoads();
  }
  repairFloods() {
    const flooded=this.reclaimed.filter(t=>t.kind==='flooded');
    if(!flooded.length) return;
    let changed=false;
    for(const t of flooded) {
      t.floodYears++;
      if(t.floodYears===2 && t===flooded[0]) this.log('The city council votes to build a taller dike.','repair');
      const localPump=this.buildings.find(p=>p.building==='pump'&&p.polder===t.polder);
      if(this.storm || (this.pumpBroken&&(!this.brokenPump||localPump?.pumpBrokenUntil>this.year))) continue;
      if(this.wealth>2 && this.wood>1 && this.stone>1) {
        this.wealth-=.6; this.wood-=.2; this.stone-=.2;
        t.damage=Math.max(0,t.damage-.065*(1+this.era*.25));
        if(t.damage<=0) {
          t.kind='land'; t.elevation+=.16; t.floodYears=0;t.floodMemorial=true;t.rebuiltYear=this.year;if(['hut','house','townhouse','tower'].includes(t.building))t.retrofitted=true;
          changed=true;
          if(!this.reclaimed.some(t=>t.kind==='flooded')) {
            this.dikeLevel=Math.min(8,this.dikeLevel+1);
            this.log('The district reopens. Taller dikes, stronger foundations and blue high-water markers remain.','reform',{x:t.x,y:t.y});captureSnapshot(this,'The waterfront rebuilt');
          }
        }
      } else if(t.floodYears>28) {
        const b=t.building;
        const relocation=this.freeLand.find(t=>!t.reclaimed);
        if(b && b!=='pump' && relocation) {relocation.building=b; relocation.builtYear=this.year;}
        t.building=null; t.buildSite=null; t.kind='water'; t.reclaimed=false;t.abandonedYear=this.year;this.storyStats.abandoned++;changed=true;
        this.log('A flooded district is abandoned. The sea calls it a homecoming.','abandon');
      }
    }
    if(changed)this.rebuildRoads();
  }
  interfere(x,y,mode='nudge') {
    if(this.ending) return 'They have rather bigger problems now.';
    this.interferences++;
    const t=this.tile(x,y);
    const spot=t||this.tile(0,1);
    const finish=(type,title,detail,expires=0)=>{
      rememberIntervention(this,spot,type);
      answerWish(this,spot,type);
      jokeAfterTouch(this,spot,type);
      this.belief+=type==='rumble'?3:type==='rain'?2:1;
      this.lastIntervention={type,title,detail,year:this.year,expires:this.year+expires,x:spot.x,y:spot.y};
      this.signal(type,spot,title);this.log(detail,'interference',{x:spot.x,y:spot.y,interventionId:this.interventionLedger.at(-1)?.id});this.ensureInfrastructure();this.advanceEndgame();advanceChallenges(this);advanceCollection(this);return detail;
    };
    if(mode==='fire'){const result=ignite(this,spot);return finish('fire',result.title,result.detail,16);}
    if(mode==='nudge'&&t?.rift&&t.kind==='water'&&!t.building){t.building='bridge';t.builtYear=this.year;this.wood=Math.max(0,this.wood-12);this.rebuildRoads();return finish('nudge','Een brug over de kloof','De bouwers verbinden de twee kanten. De breuklijn blijft zichtbaar onder de brug.',12);}
    if(mode==='rain' || mode==='nudge' && (!t||t.kind==='water')){
      const quenched=extinguish(this,spot);
      rainOnOldTree(this,spot);
      for(const tile of this.land.filter(t=>Math.hypot(t.x-spot.x,t.y-spot.y)<=3))tile.wetUntil=this.year+12;
      const amount=Math.min(4000-this.food,18+this.farms.length*3);
      this.food+=amount;this.rainBoost=12;
      for(const farm of this.farms)this.signal('rain',farm,'Harvest ×1.7');
      return finish('rain',quenched?`${quenched} fire(s) out · the bucket brigade cheers`:`+${Math.round(amount)} food · better harvests`,quenched?'De vlammen verdwijnen meteen. De blusploeg kan ademhalen; beschadigde huizen worden daarna hersteld.':'Your rain fills the stores. Harvests are 70% larger for the next 12 years. The farmers suspect divine favoritism.',12);
    }
    if(mode==='rumble'){
      const landscape=reshapeAfterQuake(this,spot);captureSnapshot(this,'Na de beving');
      for(const tile of this.land.filter(t=>Math.hypot(t.x-spot.x,t.y-spot.y)<=2))tile.crackUntil=this.year+60;
      // Close to the epicentre ordinary buildings collapse into ruins; reinforced ones only crack.
      const fragile=t=>t.building&&!t.foundingHome&&!t.reservedFor&&t.district!=='heritage'&&!t.landform&&!['farm','beach','forest','tree','original-tree','ruins','town-square','lighthouse','bridge','dock','harbor','quarry','royal-palace','castle-garden'].includes(t.building)&&!t.retrofitted&&t.builtYear!==this.year;
      const collapsed=this.land.filter(t=>Math.hypot(t.x-spot.x,t.y-spot.y)<=1.5&&fragile(t)).slice(0,3);
      for(const t of collapsed){t.rebuildFrom=t.building;t.rebuildAt=this.year+18;t.building='ruins';t.buildSite=null;t.quakeHistory=(t.quakeHistory||0)+1;this.signal('rumble',t,'Ingestort');}
      if(collapsed.length){this.population=Math.max(4,this.population*(1-.012*collapsed.length));this.rebuildRoads();}
      this.food=Math.max(0,this.food*.9);this.wood=Math.max(0,this.wood*.9);
      const affected=this.houses.filter(h=>Math.abs(h.x-spot.x)+Math.abs(h.y-spot.y)<=3).slice(0,6);
      const coast=this.reclaimed.filter(h=>h.kind==='land'&&Math.abs(h.x-spot.x)+Math.abs(h.y-spot.y)<=1);
      for(const house of affected){house.quakeDamage=house.retrofitted?.35:1;house.quakeHistory=(house.quakeHistory||0)+1;house.lastQuakeYear=this.year;this.signal('rumble',house,'Repairs needed');}
      this.prosperity=Math.max(12,this.prosperity-6);
      if(coast.length){this.flood(coast);return finish('rumble','Een dijk scheurt!',`Een wijk overstroomt; de bewoners leiden het verkeer om en beginnen aan herstel. ${landscape}`,12);}
      return finish('rumble',collapsed.length?`${collapsed.length} ${collapsed.length===1?'gebouw stort':'gebouwen storten'} in, ${affected.length} beschadigd`:affected.length?`${affected.length} huizen beschadigd`:'Het landschap verschuift',`${landscape} ${affected.length?'Huizen verliezen tijdelijk woonruimte tot de bouwers klaar zijn.':''}`,12);
    }
    if(t?.kind==='flooded'){
      this.wealth=Math.min(1500,this.wealth+30);this.wood=Math.min(600,this.wood+15);
      return finish('repair','+30 repair funds · +15 timber','Emergency supplies arrive exactly where you pointed. Repairs can resume. Procurement takes the credit.',10);
    }
    this.inspiration=14;
    this.prosperity=Math.min(99,this.prosperity+3);
    const timber=Math.min(14,600-this.wood);this.wood+=timber;
    this.wealth=Math.min(1500,this.wealth+10);
    if(t?.buildSite){t.buildSite.progress=Math.min(t.buildSite.duration-.1,t.buildSite.progress+t.buildSite.duration*.5);return finish('nudge','De bouw schiet hier zichtbaar op!','De bouwers zetten meteen een extra muur neer. Het werk gaat daarna sneller verder.',14);}
    if(t&&['hut','house','townhouse','tower','manor','palace'].includes(t.building)){t.extensionLevel=Math.min(4,(t.extensionLevel||0)+1);this.wood=Math.max(0,this.wood-8);this.rebuildRoads();return finish('nudge',`Bijgebouw erbij · ${t.extensionLevel*25}% meer woonruimte`,'Er staat direct een nieuwe aanbouw. Meer inwoners passen in dit huis; het gouden vaantje herinnert aan jouw bezoek.',14);}
    if(t?.building==='farm'){t.irrigated=(t.irrigated||0)+2;t.wetUntil=this.year+18;return finish('nudge','Irrigatiekanalen! Dit veld brengt blijvend meer op.','De boeren leggen direct blauwe irrigatiegeulen aan. De oogst van dit veld blijft beter, ook nadat jouw ingreep voorbij is.',18);}
    if(t?.building==='original-tree'){t.partyUntil=this.year+24;this.festival={kind:'picnic',x:t.x,y:t.y,until:this.year+24,title:'Een boomfeest, blijkbaar.',quips:['De boom heeft geen uitnodiging nodig.','De burgemeester is een schaap.','Dit was absoluut geen vergadering.']};return finish('nudge','Boomfeest! De inwoners komen picknicken.','De oorspronkelijke boom blijft staan. Rondom verschijnen kleedjes, bezoekers en een bijzonder onofficieel feest.',24);}
    if(t?.kind==='construction')return finish('nudge',`Dike crew inspired · +${Math.round(timber)} timber`,'Your nudge rallies the dike crew. Extra timber arrives, construction speeds up, and the ocean looks concerned.',14);
    if(t?.reservedFor&&!t.building){t.plannedMarker=true;return finish('nudge','The future builders are inspired!','This plot is reserved for a landmark. The crew gets to work on its plans.',14);}
    if(t && t.kind==='land' && !t.building && !t.buildSite){
      const type=this.food<this.population*2?'farm':this.homeTypeFor(t);
      this.planBuilding(t,type,true);
      return finish('nudge',type==='farm'?'You inspired a new farm!':'You inspired a new home!','A sudden bright idea, exactly where you pointed. Builders arrive; construction runs twice as fast for 14 years.',14);
    }
    if(t?.building==='original-tree')this.prosperity=Math.min(99,this.prosperity+4);
    const free=this.freeLand.sort((a,b)=>Math.abs(a.x-spot.x)+Math.abs(a.y-spot.y)-Math.abs(b.x-spot.x)-Math.abs(b.y-spot.y))[0];
    if(free && !this.land.some(t=>t.buildSite))this.planBuilding(free,this.food<this.population*2?'farm':this.homeTypeFor(free),true);
    return finish('nudge',`Builders ×2 · +${Math.round(timber)} timber`,'The villagers catch your enthusiasm. Construction doubles and research accelerates for 14 years. They assume it was their idea.',14);
  }
  advanceGeology() {
    const volcano=this.land.find(t=>t.landform==='volcano');
    if(!volcano || this.year<this.nextVolcanicEvent)return;
    this.nextVolcanicEvent=this.year+280+Math.floor(this.random()*260);this.volcanoActiveUntil=this.year+16;
    this.prosperity=Math.max(12,this.prosperity-4);
    for(const tile of this.houses.filter(t=>Math.abs(t.x-volcano.x)+Math.abs(t.y-volcano.y)<=2).slice(0,2))tile.quakeDamage=.55;
    this.stone=Math.min(600,this.stone+18);
    this.log('The volcano wakes up. A little ash, a few repairs, and eighteen very useful stones.','volcano');
    this.signal('rumble',volcano,'The volcano has an opinion');
  }
  advanceEndgame() { advanceFinale(this); }
  tryLastDrop() {
    if(this.sandbox||this.ending||!this.endgameStarted||!this.config.rareEndings||!this.obsessed||this.era<4||this.population<100||this.config.maxTiles<600)return;
    if(this.land.length>=Math.min(this.tiles.size,this.config.maxTiles)*.945)finishStory(this,'last-drop');
  }
  serialize() {
    const {version,...state}=this;
    const obj={...state,version:SAVE_VERSION,tiles:[...this.tiles],events:[],signals:[]};
    return JSON.stringify(obj);
  }
  static restore(data) {
    try {
      const parsed=JSON.parse(data);
      if(parsed.version!==SAVE_VERSION || !Array.isArray(parsed.tiles) || ![625,841].includes(parsed.tiles.length) || !Number.isFinite(parsed.year) || !Array.isArray(parsed.history)) return null;
      if(!parsed.tiles.every(pair=>Array.isArray(pair)&&typeof pair[0]==='string'&&Number.isFinite(pair[1]?.x)&&Number.isFinite(pair[1]?.y))) return null;
      const sim=new Civilization(parsed.seed);
      Object.assign(sim,parsed);
      sim.tiles=new Map(parsed.tiles);
      sim.events=[];
      sim.signals=[];
      sim.config={maxTiles:480,rareEndings:true,accelerating:true,...sim.config};
      sim.geographyVersion=parsed.geographyVersion||2;
      if(!parsed.geography)sim.geography={kind:'legacy',name:'The original island'};
      if(parsed.timelineVersion!==2){
        const allowed=ERAS.reduce((n,era,i)=>sim.year>=era.year?i:n,0);sim.era=Math.min(sim.era,allowed);
        const historical={tower:'house',factory:'workshop',powerplant:'well','science-center':'library',solar:'garden',turbine:'forest',fairground:'theater',school:'well',library:'well',windmill:'well',workshop:'house'};
        for(const tile of sim.tiles.values()){
          if(tile.building&&sim.year<unlockYear(tile.building)){
            tile.futureBuilding=tile.building;
            while(sim.year<unlockYear(tile.building))tile.building=historical[tile.building]||'house';
          }
          if(tile.buildSite&&sim.year<unlockYear(tile.buildSite.type))tile.buildSite=null;
          if(tile.buildSite)tile.buildSite.architecture=sim.age.id;
          tile.architecture=sim.age.id;
        }
        sim.timelineVersion=2;sim.updatePower();sim.rebuildRoads();
      }
      const numbers=['population','food','wood','stone','wealth','technology','prosperity','seaLevel','dikeLevel','randomState'];
      if(!sim.tile(0,0) || !numbers.every(name=>Number.isFinite(sim[name])) || !Number.isInteger(sim.era) || !ERAS[sim.era] || !sim.config || !Number.isFinite(sim.config.maxTiles)) return null;
      if(sim.project && (!Array.isArray(sim.project.tiles) || !sim.project.tiles.every(id=>sim.tiles.has(id)) || !PROJECT_STAGES[sim.project.stage] || !Number.isFinite(sim.project.elapsed))) return null;
      const founder=sim.tile(-1,1);if(founder)founder.foundingHome=true;
      // Migrate existing islands without resetting their geography or chronicle.
      if(!parsed.character && sim.year>=32)sim.character=CHARACTERS[sim.seed%CHARACTERS.length].id;
      if(!Array.isArray(parsed.routes) || !parsed.tiles.every(([,tile])=>typeof tile.road==='boolean'))sim.rebuildRoads();
      if(!parsed.storyVersion){sim.storyVersion=0;sim.snapshots=[];}
      ensureStory(sim,true);if(!parsed.square)delete sim.square;if(!parsed.river)sim.river={tiles:[],mouth:null};ensureSquare(sim,{restoring:true});
      ensureSpectacle(sim);
      if(!parsed.family)delete sim.family;
      ensureFamily(sim,{restoring:true});
      if(!parsed.wishes)delete sim.wishes;
      ensureWishes(sim);
      if(!parsed.challenges)delete sim.challenges;
      ensureChallenges(sim,{restoring:true});
      if(!parsed.collectionRecords)delete sim.collectionRecords;
      advanceCollection(sim);
      if(parsed.routeVersion!==2){const field=sim.tile(1,-1);if(field?.building==='farm'&&!field.builtYear)field.foundingField=true;sim.rebuildRoads();}
      if(sim.endgameStarted&&!sim.finaleDeadline&&!sim.ending)advanceFinale(sim);
      return sim;
    } catch { return null; }
  }
}

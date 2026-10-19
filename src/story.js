import { startCinema } from './spectacle.js';
import {islandScores} from './finale.js';
// Persistent consequences, civic projects and the finite story of an island.
export const STORY_VERSION=1;
export const eventPriority=type=>({ending:100,endgame:98,palace:96,age:92,discovery:91,crisis:90,fire:89,flood:88,abandon:87,reform:86,interference:84,legacy:82,technology:76,culture:68,land:66,district:65,repair:55,storm:45,life:35,trade:25,farm:20,build:10}[type]||30);
export const ENDINGS={
  phoenix:{title:'De Feniksstad.',quote:'Ze zijn vaker herbouwd dan verslagen.',description:'Branden veranderden deze stad. Uit houten wijken verrezen stenen huizen, een vaste brandweer en pleinen waar het lichtfeest elk jaar terugkeert.',consequence:'Een stad die opnieuw begint',detail:'De gevels zijn mooier. De emmers staan klaar. Het verleden is hier geen weggepoetste vlek.'},
  independent:{title:'They figured it out.',quote:'The island would like to take all the credit.',description:'A civilization has learned to live with its limits. Generations come and go; the little world can look after itself.',consequence:'An independent island',detail:'Their greatest achievement is an ordinary tomorrow.'},
  sanctuary:{title:'A little room for nothing.',quote:'Progress has been postponed until after the picnic.',description:'The island chooses gardens, clean water and a coastline worth keeping. Its grandest invention turns out to be enough.',consequence:'A living island',detail:'The old tree has rather more company now.'},
  miracles:{title:'Please keep touching.',quote:'The council has added you to the infrastructure budget.',description:'Your help became a habit, then a tradition. Fields, temples and civic plans were built around the expectation that you would return.',consequence:'A civilization of miracles',detail:'The island is prosperous. Independence remains under discussion.'},
  fortress:{title:'The very cautious kingdom.',quote:'The foundations are excellent. The sky is considered unreliable.',description:'Repeated tremors changed the way people built and lived. Strong foundations, shelter gardens and watchful shrines define the island.',consequence:'A resilient, watchful society',detail:'They survived your attention. They remember it.'},
  retreat:{title:'The sea gets a little back.',quote:'The map has been revised. So has the definition of success.',description:'Faced with the cost of keeping everything, the island chooses higher ground, smaller ambitions and a safer shore.',consequence:'A smaller, surviving civilization',detail:'The city did not disappear. It learned where to stop.'},
  'last-drop':{title:'The Last Drop.',quote:'The ocean has been successfully discontinued.',description:'A civilization has conquered the sea. Every pump is silent. Every engineer is celebrated.',consequence:'Severe water shortage.',detail:'The council has formed a committee to look into it.'}
};
const bound=(n,a,b)=>Math.max(a,Math.min(b,n));
const around=t=>[[t.x+1,t.y],[t.x-1,t.y],[t.x,t.y+1],[t.x,t.y-1]];
const homeTypes=['hut','house','townhouse','tower'];
export function ensureStory(s,restoring=false){
  s.influence={fire:0,rain:0,nudge:0,rumble:0,rescues:0,dependence:0,trust:0,fear:0,...s.influence};
  s.interventionLedger ||= [];
  s.snapshots ||= [];
  s.civicProject ||= null;
  s.policies={conservation:false,safety:false,recycling:false,publicSpace:false,...s.policies};
  s.scarcityYears ??= 0;
  s.freshwater ??= 82;s.pollution ??= 0;s.balance ||= {food:0,income:0,expenses:0};
  s.storyStats={floods:0,reforms:0,abandoned:0,...s.storyStats};
  s.storySequence ??= s.history.length;s.nextCivicYear ??= Math.max(160,s.year+60);
  s.sandbox ??= false;s.endgamePhase ??= -1;s.finalPlan ??= null;
  if(!s.storyVersion){
    for(const t of s.tiles.values()){
      if(t.natural&&around(t).some(([x,y])=>!s.tile(x,y)?.natural))t.originalCoast=true;
      if(t.kind==='land')t.district=districtFor(s,t);
    }
    // A real four-parcel estate: the founding doorstep is never moved.
    for(const [x,y] of [[-2,1],[-2,2],[-1,2]]){
      const t=s.tile(x,y);if(t?.kind!=='land'||t.landform)continue;
      if(!restoring||!t.building){t.reservedFor='palace';t.district='heritage';}
    }
    s.storyVersion=STORY_VERSION;
    if(!s.snapshots.length){
      if(restoring)s.snapshots.push({year:1,label:'The original coastline',land:[...s.tiles.values()].filter(t=>t.natural).map(t=>`${t.x},${t.y}`),population:6,environment:100,buildings:5});
      captureSnapshot(s,restoring?'The island we inherited':'The beginning');
    }
  }
  if(s.layoutVersion!==2){
    for(const [x,y] of [[2,2],[3,2],[2,3],[3,3],[2,1]]){
      const t=s.tile(x,y);if(t?.kind!=='land'||t.landform||t.foundingHome)continue;
      t.district='knowledge';
      if(!t.building||homeTypes.includes(t.building)){t.building=null;t.buildSite=null;t.reservedFor='knowledge';}
    }
    s.layoutVersion=2;
  }
  if(s.ending&&!s.outcome)s.outcome={id:'last-drop',...ENDINGS['last-drop'],year:s.year};
  if(s.outcome&&!s.outcome.scores)s.outcome.scores=islandScores(s);
}
export function districtFor(s,t){
  if(Math.abs(t.x+1)+Math.abs(t.y-1)<=2)return'heritage';
  const p=s.plotPosition(t);
  if(p.depth<.34)return p.side>.52?'industry':'skyline';
  if(p.depth>.6&&p.side<.46)return'fields';
  if(Math.abs(p.depth-.53)<.18&&Math.abs(p.side-.4)<.18)return'knowledge';
  if(p.depth>.62&&p.side>.48)return'town';
  return'gardens';
}
export function captureSnapshot(s,label){
  const snapshot={year:s.year,label,land:s.land.map(t=>`${t.x},${t.y}`),population:Math.round(s.population),environment:Math.round(s.environment),buildings:s.buildings.length};
  const old=s.snapshots.findIndex(p=>p.year===s.year&&p.label===label);
  if(old>=0)return;
  s.snapshots.push(snapshot);
  if(s.snapshots.length>16)s.snapshots.splice(1,1);
}
export function rememberIntervention(s,spot,type){
  ensureStory(s);
  const i=s.influence,kind=type==='repair'?'rescues':type;
  i[kind]=(i[kind]||0)+1;
  if(type==='rain'){i.dependence=bound(i.dependence+2,0,100);i.trust+=2;spot.irrigated=(spot.irrigated||0)+1;}
  else if(type==='fire'&&spot.fire){i.fear+=3;i.trust=Math.max(0,i.trust-1);}
  else if(type==='rumble'){i.fear+=3;i.trust=Math.max(0,i.trust-1);s.policies.safety=i.rumble>=3;}
  else{i.trust++;i.dependence=bound(i.dependence+.7,0,100);spot.inspired=true;}
  spot.interventionMemory={type,year:s.year,count:(spot.interventionMemory?.count||0)+1};
  spot.lifeEvents=[...(spot.lifeEvents||[]),{type,year:s.year}].slice(-8);
  const entry={id:`touch-${s.interferences}`,year:s.year,type,x:spot.x,y:spot.y,consequence:type==='fire'?'Brandsporen, vruchtbare as en nieuwe bouwtradities':type==='rain'?'Irrigation traditions and an expectation of rain':type==='rumble'?'Stronger foundations and a lasting fear of the sky':type==='repair'?'A rescued district and greater public trust':'A locally inspired building and a taste for outside help'};
  s.interventionLedger.push(entry);if(s.interventionLedger.length>100)s.interventionLedger.splice(1,1);
  if(type==='rumble'){
    for(const h of s.houses.filter(h=>Math.abs(h.x-spot.x)+Math.abs(h.y-spot.y)<=2))h.needsRetrofit=true;
  }
  if(type==='rain'){
    const farms=s.farms.slice().sort((a,b)=>Math.hypot(a.x-spot.x,a.y-spot.y)-Math.hypot(b.x-spot.x,b.y-spot.y));
    for(const t of farms.slice(0,6)){t.irrigated=(t.irrigated||0)+1;t.interventionMemory={type,year:s.year,count:t.irrigated};}
    s.freshwater=bound(s.freshwater+12,0,100);
  }
  if([1,3,8].includes(i[kind])){
    const line=type==='rain'?'The farmers build irrigation channels around your rain. Future harvests will remember this.':type==='rumble'?'The builders adopt stronger foundations. The next generation will grow up expecting tremors.':'The inspired neighborhood keeps its new methods. Your visit becomes part of its history.';
    s.log(line,'legacy',{x:spot.x,y:spot.y,cause:entry.id});
  }
}
export function advanceEconomy(s){
  const workers=Math.max(1,s.population),farms=s.farms;
  const irrigation=farms.reduce((sum,t)=>sum+Math.min(.35,(t.irrigated||0)*.07)+(t.inspired?.08:0)+(t.ashFertility||0),0);
  const mill=s.buildings.some(t=>t.building==='windmill');
  const climate=(s.storm?.7:1)*(s.drought?.45:1)*(.7+.3*s.environment/100)*(.55+.45*s.freshwater/100);
  const harvest=((farms.length+irrigation)*2.8+s.land.length*.018)*(1+s.era*.33)*climate*(s.rainBoost?1.7:1)*(mill?1.2:1)*(1+s.roadCoverage*.12)*s.temperament.food;
  const foodUse=workers*.2+s.food*.025;
  s.food=bound(s.food+harvest-foodUse,0,4000);
  s.wood=bound(s.wood+.8+Math.min(workers*.015,s.forests.length*.9)+s.forests.length*.4-s.houses.length*.018-s.wood*.004-s.maintenance*.025,0,600);
  s.stone=bound(s.stone+.17+workers*.006+s.era*.12+s.buildings.filter(t=>t.building==='quarry').length*.4-s.stone*.002,0,600);
  const flooded=s.reclaimed.filter(t=>t.kind==='flooded').length;
  s.maintenance=s.reclaimed.length*(.08*(1-s.era*.1)+s.seaLevel*.03)+flooded*.3;
  const shops=s.buildings.filter(t=>['shop','bakery','cafe'].includes(t.building)).length;
  const income=(.45+workers*.055+(s.buildings.some(t=>t.building==='market')?1:0))*s.temperament.trade+shops*.65;
  const expenses=workers*(.04+s.era*.0015)+s.buildings.length*.025+s.maintenance+s.wealth*.012+(s.policies.safety?s.houses.length*.008:0);
  s.wealth=bound(s.wealth+income-expenses,0,1500);
  if(s.buildings.some(t=>t.building==='bakery'))s.food=bound(s.food+1.4,0,4000);
  const target=bound(36+Math.min(24,s.food/Math.max(1,workers)*10)+Math.min(18,s.wealth/workers*6)+Math.min(9,s.recreation.length*.7)-s.pollution*.18-(s.storm?8:0)-(s.freshwater<30?15:0),15,94);
  s.prosperity=bound(s.prosperity+(target-s.prosperity)*.025,12,99);
  if(s.food>workers*.4&&s.freshwater>12)s.population=Math.min(workers+(.18+workers*.006)*s.temperament.growth,Math.max(workers,s.capacity));
  else s.population=Math.max(6,workers-.04-workers*.0008);
  s.scarcityYears=s.food<workers*.25?s.scarcityYears+1:Math.max(0,s.scarcityYears-2);
  s.balance={food:harvest-foodUse,income,expenses};
}
export function advanceEnvironment(s){
  const factories=s.buildings.filter(t=>t.building==='factory').length;
  const coal=s.buildings.filter(t=>t.building==='powerplant').length;
  const parks=s.buildings.filter(t=>['park','garden','royal-garden'].includes(t.building)).length;
  const dirty=bound(factories*5+coal*7+s.reclaimed.length*.11-s.forests.length*1.5-parks-(s.policies.conservation?12:0),0,95);
  s.pollution+=(dirty-s.pollution)*.04;
  const target=bound(98-s.reclaimed.length*.1-s.pollution*.65+s.forests.length*.9+parks*.8,10,100);
  s.environment+=(target-s.environment)*.025;
  const wells=s.buildings.filter(t=>t.building==='well').length;
  const springs=Math.min(3,s.land.filter(t=>t.spring).length);
  const waterTarget=bound(88+wells*4+springs*7+s.forests.length*.8-s.population*.005-s.farms.length*.07-factories*3-s.reclaimed.length*.04-s.influence.dependence*.3+(s.policies.recycling?12:0),8,98);
  s.freshwater=bound(s.freshwater+(waterTarget-s.freshwater)*.025+(s.rainBoost?.4:0)-(s.drought?.7:0),0,100);
}
export function growEstate(s,home){
  const pieces=[[-2,1,'palace-wing'],[-2,2,'royal-garden'],[-1,2,'palace-square']];
  for(const [x,y,type] of pieces){
    const t=s.tile(x,y);if(!t||t.kind!=='land'||t.landform)continue;
    if(t.reservedFor==='palace'||!t.building){t.reservedFor='palace';t.district='heritage';t.building=home.building==='palace'?type:type==='palace-wing'?'garden':'palace-square';t.builtYear=s.year;t.architecture=s.age.id;}
  }
  home.landmark=true;s.rebuildRoads();
}
const projectNames={water:'A reliable water supply',culture:'A square worth keeping',energy:'A cleaner power grid',safety:'A safer waterfront',housing:'A little room to breathe'};
export function advanceCivicStory(s){
  if(s.ending)return;
  if(s.year>=s.nextStorm-8&&s.year<s.nextStorm&&s.reclaimed.length&&s.warnedStorm!==s.nextStorm){
    s.warnedStorm=s.nextStorm;
    const coast=s.reclaimed.filter(t=>t.kind==='land').sort((a,b)=>a.elevation-b.elevation)[0];
    s.log('A surge is forecast. The lowest waterfront prepares sandbags and evacuation paths.','crisis',{x:coast?.x,y:coast?.y});
    s.signal('crisis',coast,'Storm warning · low ground');
  }
  if(!s.civicProject&&s.year>=s.nextCivicYear&&s.year>=120&&!s.endgameStarted){
    const kind=s.freshwater<50?'water':s.influence.fear>12&&!s.policies.safety?'safety':s.pollution>22?'energy':s.unrest>50?'housing':s.character==='garden'?'culture':['culture','water','housing'][Math.floor(s.random()*3)];
    const candidates=kind==='water'?s.buildings.filter(t=>t.building==='well'):kind==='energy'?s.buildings.filter(t=>t.building==='factory'):s.buildings.filter(t=>['market','statue','park'].includes(t.building));
    const target=candidates[0]||s.tile(0,1);
    s.civicProject={kind,title:projectNames[kind],phase:'debate',started:s.year,next:s.year+14,x:target.x,y:target.y};
    s.log(`${projectNames[kind]}. The council opens a public debate.`,'life',{x:target.x,y:target.y});
  }
  const p=s.civicProject;if(!p||s.year<p.next)return;
  const t=s.tile(p.x,p.y);
  if(p.phase==='debate'){
    p.phase='building';p.next=s.year+20;
    s.wealth=Math.max(0,s.wealth-12);s.wood=Math.max(0,s.wood-6);
    s.signal('build',t,p.title);
    s.log(`${p.title}: work begins. A discussion has become a place.`,'culture',{x:p.x,y:p.y});
  }else{
    s.storyStats.reforms++;
    if(p.kind==='water'){s.policies.recycling=true;s.freshwater=Math.min(100,s.freshwater+10);}
    if(p.kind==='energy')s.policies.conservation=true;
    if(p.kind==='safety'){s.policies.safety=true;for(const r of s.reclaimed)r.elevation+=.05;}
    if(['culture','housing'].includes(p.kind)){
      s.policies.publicSpace=true;
      const plot=s.freeLand[0]||s.houses.find(t=>!t.foundingHome&&t.district!=='heritage');
      if(plot){plot.building='park';plot.buildSite=null;plot.civicLegacy=p.title;plot.builtYear=s.year;s.rebuildRoads();}
    }
    s.log(`${p.title} is completed. ${p.kind==='water'?'Water recycling becomes a permanent public service.':p.kind==='energy'?'Clean-air rules change the next generation of industry.':p.kind==='safety'?'The waterfront adopts higher, stronger foundations.':'A public garden remains where the argument began.'}`,'reform',{x:p.x,y:p.y});
    s.signal('celebrate',t,p.title+' · completed');captureSnapshot(s,p.title);
    s.civicProject=null;s.nextCivicYear=s.year+150+Math.floor(s.random()*120);
  }
}
export function chooseFinalPlan(s){
  if(s.obsessed&&s.config.rareEndings&&s.config.maxTiles>=600&&s.era>=4)return'last-drop';
  if((s.influence.fire>=5||s.fireTraditions>=4)&&(s.rebuiltFires>=2||s.fireTraditions>=4)&&s.fireCode)return'phoenix';
  if(s.influence.fear>=18)return'fortress';
  if(s.influence.dependence>=16)return'miracles';
  if(s.scarcityYears>20||s.freshwater<25||s.environment<35||s.reclaimed.filter(t=>t.kind==='flooded').length>s.land.length*.12)return'retreat';
  if(s.environment>76&&(s.character==='garden'||s.policies.conservation))return'sanctuary';
  return'independent';
}
export function finishStory(s,id){
  if(s.outcome&&!s.sandbox)return;
  s.ending=true;s.endingSeen=false;startCinema(s,id);
  if(id==='last-drop'){s.freshwater=0;s.drought=9999;s.food=Math.min(s.food,3);}
  s.outcome={id,...ENDINGS[id],scores:islandScores(s),year:s.year,population:Math.round(s.population),land:s.land.length,reclaimed:s.reclaimed.length,environment:Math.round(s.environment),interferences:s.interferences,influence:{...s.influence},lastConsequence:s.interventionLedger.at(-1)?.consequence||'',coast:s.land.map(t=>`${t.x},${t.y}`),chronicle:s.history.filter(e=>['palace','reform','flood','endgame','legacy'].includes(e.type)).slice(-5)};
  captureSnapshot(s,'The final island');
  s.log(ENDINGS[id].quote,'ending',{x:0,y:0});s.signal('ending',s.tile(0,0),ENDINGS[id].title);
}
export function advanceFinale(s){
  if(s.sandbox||s.ending)return;
  if(!s.endgameStarted&&s.year>=s.endgameYear){
    s.endgameStarted=true;s.endgameAt=s.year;s.finalPlan=chooseFinalPlan(s);s.endgamePhase=0;
    s.finaleDeadline=s.year+(s.finalPlan==='last-drop'?420:140);
    s.log(`The final age begins. ${s.finalPlan==='last-drop'?'The engineers announce a last, impossible ambition: discontinue the ocean.':s.finalPlan==='miracles'?'The council debates a future built around your miracles.':s.finalPlan==='fortress'?'The island plans a future prepared for the next tremor.':s.finalPlan==='retreat'?'The city must decide which ground is worth keeping.':'The island asks what is worth passing on to its children.'}`,'endgame',{x:0,y:1});
    s.signal('endgame',s.tile(0,1),'The final age · a future to choose');captureSnapshot(s,'The final age begins');
  }
  if(!s.endgameStarted)return;
  s.finalPlan ||= chooseFinalPlan(s);
  s.finaleDeadline ||= s.endgameAt+(s.finalPlan==='last-drop'?420:140);
  const elapsed=s.year-s.endgameAt;
  if(elapsed>=35&&s.endgamePhase<1){
    s.endgamePhase=1;s.endgameEvents++;
    const plan=s.finalPlan;
    if(plan==='sanctuary'){s.policies.conservation=true;s.policies.publicSpace=true;}
    if(plan==='fortress'){s.policies.safety=true;for(const t of s.houses)t.retrofitted=true;}
    if(plan==='miracles')s.policies.recycling=false;
    if(plan==='independent')s.policies.recycling=true;
    if(plan==='retreat'){
      const plots=s.reclaimed.filter(t=>t.kind==='land'&&!['palace','bridge','pump'].includes(t.building)).sort((a,b)=>a.elevation-b.elevation).slice(0,Math.min(8,s.reclaimed.length));
      for(const t of plots){t.kind='water';t.abandonedYear=s.year;t.building=null;t.buildSite=null;s.storyStats.abandoned++;}s.rebuildRoads();
    }
    s.log(plan==='last-drop'?'The last-ocean project is approved. The pumps work around the clock.':plan==='retreat'?'The lowest district is evacuated. The old embankment becomes a memorial to a sensible retreat.':plan==='miracles'?'The council dedicates a square to the visiting hand. Future harvest plans now assume a miracle.':plan==='fortress'?'Stronger foundations and shelter gardens become the island’s lasting public project.':'The council signs a charter for clean water and public space. A final generation begins the work.','endgame',{x:-1,y:2});
    const spot=s.freeLand[0];if(spot&&plan!=='last-drop'){spot.building=plan==='miracles'?'shrine':'park';spot.civicLegacy='The final-age charter';s.rebuildRoads();}
    s.signal('endgame',s.tile(-1,2),'The last great project');
  }
  if(elapsed>=90&&s.endgamePhase<2){
    s.endgamePhase=2;s.endgameEvents++;
    s.log('The last great project enters its final test. What remains will be the island’s legacy.','endgame',{x:0,y:0});
    s.signal('endgame',s.tile(0,0),'A legacy takes shape');
  }
  if(s.finalPlan==='last-drop'&&s.land.length>=s.tiles.size*.945){finishStory(s,'last-drop');return;}
  if(s.year>=s.finaleDeadline){
    const result=chooseFinalPlan(s);
    finishStory(s,result==='last-drop'?'independent':result);
  }
}
export function resumeSandbox(s){s.sandbox=true;s.ending=false;s.endingSeen=true;if(s.cinematic)s.cinematic.completed=true;}

// Physical memories live on plots and survive saving, rebuilding and changes of age.
const nearby=(a,b,r=2)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
const adjacentPlots=(s,t)=>[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>s.tile(t.x+x,t.y+y)).filter(Boolean);
const dwelling=['hut','house','townhouse','tower','manor','palace'];
const protectedPlot=t=>t.foundingHome||t.reservedFor||['original-tree','palace','palace-wing','royal-garden','palace-square','town-square','bridge'].includes(t.building);
export function ensureConsequences(s){
 s.fireCount??=0;s.rebuiltFires??=0;s.fireTraditions??=0;s.discoveries??=[];s.discoveryRecords??={};s.fireCode??=false;
}
export function discover(s,id,t,text){
 ensureConsequences(s);
 if(!s.discoveries.includes(id)){
  s.discoveries.push(id);s.discoveryRecords[id]={year:s.year,x:t.x,y:t.y};
  s.log(text,'discovery',{x:t.x,y:t.y,discoveryId:id});s.signal('celebrate',t,'Iets bijzonders ontdekt');
 }
}
export function rainOnOldTree(s,spot){
 if(spot.building!=='original-tree')return;
 // The old ledger supplies only provable direct visits, never nearby showers.
 spot.treeRainCount??=(s.interventionLedger||[]).filter(e=>e.type==='rain'&&e.x===spot.x&&e.y===spot.y).length;
 spot.treeRainCount=Math.min(3,spot.treeRainCount+1);
 if(spot.treeRainCount<3||spot.bloomYear)return;
 spot.bloomYear=s.year;
 discover(s,'old-tree-bloom',spot,'Na de derde regenbui bloeit de oude boom. Niemand wist dat hij dat nog kon. De familie zet een stoel onder de bloesem.');
}

export function startBlaze(s,t,spread=false){
 ensureConsequences(s);if(t.fire||!t.building||t.building==='ruins')return false;
 t.fire={started:s.year,until:s.year+(s.buildings.some(p=>p.building==='fire-station')?6:16),nextSpread:s.year+(s.era<1?2:4)};
 t.fireHistory=(t.fireHistory||0)+1;t.lastFireYear=s.year;s.fireCount++;
 // Fire eats into the stores: timber burns, and a burning field loses its harvest.
 s.wood=Math.max(0,s.wood*.92);if(t.building==='farm')s.food=Math.max(0,s.food*.88);
 if(dwelling.includes(t.building))t.quakeDamage=Math.max(t.quakeDamage||0,.5);
 s.prosperity=Math.max(12,s.prosperity-(spread?1:4));
 if(spread)s.signal('fire',t,'Het vuur slaat over');
 return true;
}
function ashes(s,t){
 t.ashFertility=Math.min(.6,(t.ashFertility||0)+.2);t.scorchedUntil=s.year+50;
 for(const farm of s.farms.filter(p=>nearby(p,t,2)))farm.ashFertility=Math.min(.6,(farm.ashFertility||0)+.15);
}
export function finishBlaze(s,t,rescued=false){
 if(!t.fire)return;const burned=t.building;delete t.fire;ashes(s,t);
 if(!rescued&&['forest','tree'].includes(burned)){
  t.building=null;t.burntForest=true;t.clearingYear=s.year;s.environment=Math.max(10,s.environment-4);
  s.log('Het bos brandt uit. De open plek en vruchtbare as blijven; hier kan later een wijk groeien.','fire',{x:t.x,y:t.y});
 }else if(!rescued&&burned!=='farm'){
  t.rebuildFrom=burned;t.rebuildAt=s.year+18;t.building='ruins';t.buildSite=null;
  if(dwelling.includes(burned))s.population=Math.max(4,s.population*.985);
  s.log('De brand laat een ruïne achter. De bewoners beginnen aan een sterker huis.','fire',{x:t.x,y:t.y});
 }else s.log('De brand is geblust. De schade en vruchtbare as blijven zichtbaar.','reform',{x:t.x,y:t.y});
 s.signal('repair',t,rescued?'Geblust · de plek onthoudt het':'As en een nieuw begin');
}
export function tendFires(s){
 ensureConsequences(s);let changed=false;
 const brigade=s.buildings.some(t=>t.building==='fire-station');
 for(const t of s.land){
  if(t.rebuildFrom&&s.year>=t.rebuildAt&&s.wood>=2){
   s.wood-=2;t.building=t.rebuildFrom;delete t.rebuildFrom;delete t.rebuildAt;
   t.material='stone';t.rebuiltYear=s.year;t.quakeDamage=0;t.retrofitted=true;s.rebuiltFires++;changed=true;
   s.log('Uit de as verrijst een stenen gebouw. De brand van vroeger blijft in de gevel herdacht.','reform',{x:t.x,y:t.y});s.signal('built',t,'Sterker herbouwd');
  }
  const fire=t.fire;if(!fire)continue;
  if((brigade&&s.year-fire.started>=5)||s.year>=fire.until){finishBlaze(s,t);changed=true;continue;}
  if(s.year<(fire.nextSpread??fire.started+3))continue;
  fire.nextSpread=s.year+(s.era<1?2:3);
  if(s.land.filter(p=>p.fire).length>=20)continue;
  for(const other of adjacentPlots(s,t)){
   if(other.kind!=='land'||!other.building||other.fire||protectedPlot(other)||['farm','beach','well','fire-station','ruins','quarry'].includes(other.building)||other.wetUntil>s.year)continue;
   const stone=other.material==='stone'||other.material==='brick'||s.era>=2;
   const chance=(stone?.15:s.era<1?.75:.45)*(brigade?.25:1);
   if(s.random()<chance){startBlaze(s,other,true);changed=true;}
  }
 }
 if(s.fireCount>=3&&!s.fireCode){
  s.fireCode=true;s.policies.fireSafety=true;
  for(const home of s.houses){home.material='stone';home.fireRetrofittedYear=s.year;}
  s.log('Na de branden kiest de raad voor stenen gevels en een vaste brandweer. De emmers krijgen een eigen adres.','reform');
 }
 if(s.fireCode&&!s.buildings.some(t=>t.building==='fire-station')&&!s.land.some(t=>t.buildSite?.type==='fire-station')){
  const site=s.freeLand.find(t=>!t.burntForest)||s.freeLand[0];if(site&&s.planBuilding(site,'fire-station',true))changed=true;
 }
 if(changed)s.rebuildRoads();
}
export function keepFireTradition(s,t,{duringFestival=false}={}){
 ensureConsequences(s);t.traditionCount=(t.traditionCount||0)+1;t.traditionYear??=s.year;s.fireTraditions++;
 if(duringFestival&&!t.festivalTraditionYear){
  t.festivalTraditionYear=s.year;
  if(s.discoveries.includes('fire-tradition'))s.log('Het kampvuur laait op midden in het feest. Vanaf nu hoort dit vuur bij hun jaarlijkse traditie.','culture',{x:t.x,y:t.y});
 }
 discover(s,'fire-tradition',t,duringFestival?'Het kampvuur laait op midden in het feest. Het wordt een jaarlijks lichtfeest; de kinderen eisen een officiële marshmallowbegroting.':'Een bestaand vuur wordt een jaarlijks lichtfeest. De kinderen eisen een officiële marshmallowbegroting.');
 s.nextTradition=s.year+45;
}
export function advanceTraditions(s){
 if(!s.nextTradition||s.year<s.nextTradition||s.storm||s.ending)return;
 const t=s.land.find(p=>p.traditionCount);if(!t)return;
 s.festival={kind:'bonfire',x:t.x,y:t.y,until:s.year+18,title:'Het jaarlijkse lichtfeest',quips:['Dit doen we hier al generaties.','De burgemeester is zijn marshmallow kwijt.','Vuurwachter is nu een officieel beroep.']};
 s.nextTradition=s.year+65;s.prosperity=Math.min(94,s.prosperity+3);s.signal('celebrate',t,'Het lichtfeest keert terug');
}
export function reshapeAfterQuake(s,spot){
 ensureConsequences(s);
 const volcano=s.land.find(t=>t.landform==='volcano'&&nearby(t,spot,2.5));
 if(volcano){
  s.nextVolcanicEvent=s.year;s.advanceGeology();
  for(const t of s.land.filter(t=>nearby(t,volcano,3))){t.ashFertility=Math.min(.6,(t.ashFertility||0)+.25);t.volcanicAshYear=s.year;}
  discover(s,'quake-volcano',volcano,'De beving wekt de vulkaan. As daalt neer op het land; de boeren kijken minder boos dan verwacht.');
  return 'De vulkaan barst uit. Vulkanische as maakt de grond blijvend vruchtbaarder.';
 }
 const soaked=s.land.filter(t=>nearby(t,spot,2)&&t.wetUntil>s.year);
 if(soaked.length){
  for(const t of soaked){t.mudflowYear=s.year;t.ashFertility=Math.max(.15,t.ashFertility||0);if(dwelling.includes(t.building))t.quakeDamage=Math.max(.6,t.quakeDamage||0);}
  s.food=Math.max(0,s.food-18);discover(s,'rain-quake',spot,'De verzadigde grond schuift weg. Een modderstroom volgt de beving; de nieuwe sliblaag blijft.');
  return 'De natte grond wordt een modderstroom. Huizen lopen schade op; slib verrijkt de velden.';
 }
 const peak=s.land.filter(t=>t.landform&&nearby(t,spot,2.5)&&!t.landslideYear).sort((a,b)=>Math.hypot(a.x-spot.x,a.y-spot.y)-Math.hypot(b.x-spot.x,b.y-spot.y))[0];
 if(peak){
  peak.landslideYear=s.year;peak.relief=Math.max(18,(peak.relief||35)-18);
  const quarry=s.land.find(t=>nearby(t,peak,2)&&!t.building&&!t.landform&&!t.reservedFor);
  if(quarry){quarry.building='quarry';quarry.builtYear=s.year;quarry.quarryYear=s.year;}
  s.stone=Math.min(600,s.stone+25);s.rebuildRoads();
  discover(s,'landslide',peak,'Een flank van de berg schuift weg. Het blootgelegde gesteente wordt een steengroeve.');
  return 'Een aardverschuiving verlaagt de berg. De nieuwe steengroeve levert bouwsteen.';
 }
 const water=adjacentPlots(s,spot).find(t=>t.kind==='water'&&!t.building&&!t.riftYear);
 const occupied=s.land.length+(s.project?.tiles.length||0)+s.reclaimed.filter(t=>t.kind==='flooded').length;
 if(water&&occupied<s.config.maxTiles){
  water.kind='land';water.natural=false;water.reclaimed=false;water.elevation=1.8;water.upliftedYear=s.year;water.district='gardens';s.rebuildRoads();
  discover(s,'uplift',water,'De kust komt omhoog. Waar net nog water lag, ligt nu echt droog land. De kaartmaker zucht.');
  return 'De kust komt omhoog: een nieuwe landtegel, zonder inpoldering.';
 }
 const open=s.land.filter(t=>nearby(t,spot,2)&&!protectedPlot(t)&&!t.building&&!t.buildSite&&!t.landform);
 const rift=open.find(t=>!t.spring&&adjacentPlots(s,t).filter(p=>p.kind==='land').length>=3);
 if((s.influence.rumble+1)%3===0&&rift){
  rift.kind='water';rift.riftYear=s.year;rift.rift=true;rift.reclaimed=false;s.rebuildRoads();
  discover(s,'rift',rift,'De grond scheurt open tot een kloof. De overkant is er nog; een brug zou helpen.');
  return 'Een kloof snijdt door het land. Bouw hier een brug of loop om.';
 }
 const spring=open.find(t=>!t.spring);
 if(spring){spring.spring=true;spring.springYear=s.year;s.freshwater=Math.min(100,s.freshwater+15);discover(s,'spring',spring,'Een bron breekt open. Vers water stroomt uit de grond; de loodgieter noemt het concurrentievervalsing.');return 'Een blijvende zoetwaterbron komt vrij. De watervoorraad herstelt.';}
 return 'Breuklijnen blijven in de grond zichtbaar. De bouwers versterken de funderingen.';
}

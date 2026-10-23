import {ensureConsequences,startBlaze,finishBlaze,tendFires,keepFireTradition,advanceTraditions} from './consequences.js';
// Small pleasures and an ending performed by the island, in real time.
const adjacent=t=>[[t.x+1,t.y],[t.x-1,t.y],[t.x,t.y+1],[t.x,t.y-1]];
const id=t=>`${t.x},${t.y}`;
export const RECREATION=['park','garden','beach','playground','fairground','theater','bonfire','festival-ground','petting-farm','ice-cream','greenhouse','circus','pool','monument','zoo','theme-park','rose-garden','grand-fountain','watchtower'];
export function ensureSpectacle(s){
 ensureConsequences(s);
 s.nextFestival??=18;s.festival??=null;s.liveJoke??=null;s.fireCount??=0;
 if(s.outcome&&s.ending&&!s.cinematic){startCinema(s,s.outcome.id);}
}
export function reserveBeaches(s,count=9){
 const coast=s.land.filter(t=>s.isCoast(t)&&!t.landform&&!t.foundingHome&&!t.reservedFor&&!t.buildSite&&(!t.building||['beach','park','tree'].includes(t.building)));
 const sorted=coast.sort((a,b)=>(b.x+b.y)-(a.x+a.y));
 const first=sorted[0];if(!first)return;
 const beach=sorted.filter(t=>Math.hypot(t.x-first.x,t.y-first.y)<5.5).slice(0,count);
 for(const t of beach){
  t.building='beach';t.protectedCoast=true;t.district='beach';
 }
}
export function seedPleasures(s){
 ensureSpectacle(s);
 reserveBeaches(s);
 // Keep the tiny founding settlement, but give it a landscape worth exploring.
 const groves=s.freeLand.filter(t=>t.x+t.y<-2).sort((a,b)=>a.variant-b.variant);
 for(const t of groves.slice(0,7))if(!t.building)t.building='forest';
 const viewpoints=s.land.filter(t=>!t.building&&!t.landform&&!t.reservedFor&&adjacent(t).some(([x,y])=>s.tile(x,y)?.landform));
 for(const t of viewpoints.slice(0,2))t.trailhead=true;
 s.terrainVersion=2;
}
export function ignite(s,spot){
 if(spot.kind==='water'||spot.kind==='construction'||spot.kind==='flooded')return{title:'The sea refuses to catch fire.',detail:'The fish applaud your commitment. Nothing burns underwater.'};
 const safe=['beach','campfire','bonfire','original-tree','palace','palace-wing','royal-garden','palace-square','town-square'].includes(spot.building);
 if(!spot.building||safe){
  const established=['campfire','bonfire'].includes(spot.building);
  const duringFestival=s.festival?.until>s.year&&Math.hypot(s.festival.x-spot.x,s.festival.y-spot.y)<=3;
  if(!spot.building&&!spot.reservedFor&&!spot.landform){spot.building='bonfire';spot.builtYear=s.year;s.rebuildRoads();}
  spot.partyUntil=s.year+24;s.festival={kind:'bonfire',x:spot.x,y:spot.y,until:s.year+24,title:'A highly unauthorized barbecue',quips:['Outdoor central heating!','Someone brought a suspicious sausage.','The fire inspector is also the chef.']};
  s.wood=Math.max(0,s.wood-4);
  if(established){keepFireTradition(s,spot,{duringFestival});s.festival.title='Het jaarlijkse lichtfeest';}
  return{title:'A bonfire. They brought snacks.',detail:'Flames, sparks and a gathering. The original tree has politely declined to participate.'};
 }
 startBlaze(s,spot);
 s.rebuildRoads();
 return{title:'Fire! The bucket brigade is coming.',detail:'A local blaze damages this plot. Volunteers respond; rain here puts it out immediately. The whole island will not burn down.'};
}
export function extinguish(s,spot){
 let count=0;for(const t of s.land)if(t.fire&&Math.hypot(t.x-spot.x,t.y-spot.y)<=3){finishBlaze(s,t,true);count++;s.signal('celebrate',t,'Geblust · de as blijft');}
 if(count){s.storyStats.reforms++;s.rebuildRoads();}return count;
}
// A party with a reason: a wish that came true, or the opening of a statue or special building.
export function startParty(s,tile,title,quips,years=4){
 // Parties stay special: short, and followed by at least thirty quiet years.
 if(!tile||s.ending||s.year<(s.partyQuietUntil||0))return null;years=Math.min(years,4);s.partyQuietUntil=s.year+years+30;s.partiesHeld=(s.partiesHeld||0)+1;
 s.festival={kind:'party',x:tile.x,y:tile.y,title,quips:quips||['Er is taart. Niemand weet wie hem heeft gebakken.','De fanfare speelt het enige liedje dat ze kent. Twee keer.','Iemand houdt een toespraak. Hij duurt gelukkig kort.'],until:s.year+years};
 s.signal('celebrate',tile,title);return s.festival;
}
export function advancePleasures(s){
 ensureSpectacle(s);
 tendFires(s);advanceTraditions(s);
 if(s.festival&&s.year>s.festival.until)s.festival=null;
 // A party lifts the mood for as long as it lasts.
 if(s.festival){s.unrest=Math.max(0,(s.unrest||0)-.6);s.prosperity=Math.min(94,s.prosperity+.15);}
 if(s.liveJoke&&s.year>s.liveJoke.until)s.liveJoke=null;
 if(s.year<s.nextFestival||s.year<(s.partyQuietUntil||0)||s.storm||s.endgameStarted||s.ending)return;
 const beach=s.beaches.find(t=>t.walkable),bonfire=s.buildings.find(t=>['bonfire','campfire'].includes(t.building));
 const stage=s.buildings.find(t=>['festival-ground','theater','fairground'].includes(t.building));
 const bakery=s.buildings.find(t=>t.building==='bakery'),square=s.buildings.find(t=>t.building==='town-square');
 const choices=[];
 if(beach)choices.push({kind:'duck-race',spot:beach,title:'The Great Duck Regatta',quips:['All ducks. No steering committee.','The favorite is facing the wrong way.','A duck has been disqualified for being a goose.']},{kind:'kite-day',spot:beach,title:'The annual argument with the wind',quips:['The sky has taken three hats.','That kite is technically a bedsheet.','The seagulls demand air traffic control.']});
 if(bonfire)choices.push({kind:'bonfire',spot:bonfire,title:'A very small night out',quips:['The mayor has burned dinner.','A dramatic reading of the shopping list.','Everyone is briefly an expert on fire.']});
 if(stage)choices.push({kind:'circus',spot:stage,title:'The circus has exactly one trick',quips:['The juggler has requested softer vegetables.','The sheep refuses its costume.','Standing ovation. There are no chairs.']});
 if(square)choices.push({kind:'market-day',spot:square,title:'Marktdag op het plein',quips:['Drie kazen voor de prijs van vier.','De groenteboer zingt. Niemand heeft erom gevraagd.','Er is een kraam die alleen knopen verkoopt.']},{kind:'square-dance',spot:square,title:'Dansavond op het plein',quips:['Links, rechts, en dan maar improviseren.','De burgemeester danst als een kapstok.','Iemand heeft een accordeon meegenomen. Iedereen.']});
 if(bakery)choices.push({kind:'pancakes',spot:bakery,title:'The Pancake Emergency',quips:['Too many pancakes. An unprecedented crisis.','The council forms a tasting committee.','The emergency lasts until lunchtime.']});
 if(!choices.length)return;
 const event=choices[Math.floor(s.random()*choices.length)];
 s.festival={kind:event.kind,x:event.spot.x,y:event.spot.y,title:event.title,quips:event.quips,until:s.year+6};s.partyQuietUntil=s.year+36;s.partiesHeld=(s.partiesHeld||0)+1;
 s.log(`${event.title}. ${event.quips[Math.floor(s.random()*event.quips.length)]}`,'fun',{x:event.spot.x,y:event.spot.y});
 s.signal('celebrate',event.spot,event.title);s.unrest=Math.max(0,s.unrest-5);s.prosperity=Math.min(94,s.prosperity+2);s.food=Math.max(0,s.food-Math.min(12,s.population*.04));
 s.nextFestival=s.year+55+Math.floor(s.random()*65);
}
export function jokeAfterTouch(s,spot,type){
 const lines={nudge:['That was absolutely my idea.','The sky has approved the extension.','Unexpected motivation. Highly suspicious.'],rain:['The weather has excellent aim.','The carrots would like to thank you.','Free showers! Cancel the plumbing.'],rumble:['We only just painted that.','Who is moving the furniture?','The ground has lodged a complaint.'],fire:['Outdoor central heating!','Please retain your eyebrows.','The insurance company has left the island.'],repair:['A delivery from absolutely nowhere.']};
 const options=lines[type]||lines.nudge;
 s.liveJoke={x:spot.x,y:spot.y,text:options[s.interferences%options.length],until:s.year+12};
}
export function startCinema(s,endingId,replay=false){
 s.cinematic={id:endingId,elapsed:0,duration:40,completed:false,cheers:0,replay,toured:!!replay};s.endingSeen=false;
}
export function advanceCinema(s,seconds){
 const movie=s.cinematic;if(!movie||movie.completed)return false;
 movie.elapsed=Math.min(movie.duration,movie.elapsed+Math.max(0,Math.min(.2,seconds)));
 if(movie.elapsed>=movie.duration){movie.completed=true;return true;}return false;
}
export function cinemaBeat(movie){
 if(!movie)return null;const t=movie.elapsed*24/(movie.duration||24);
 const beats={
  independent:['THEY HAVE A PLAN.','THE LAST GREAT INVENTION','NO MORE RESPONSIBILITY.','THEY HAVE LIFTED OFF.'],
  sanctuary:['ONE LAST DEVELOPMENT PLAN.','MORE SHADE. LESS EVERYTHING.','THE WORLD’S MOST ADVANCED PICNIC.','PROGRESS CAN WAIT.'],
  miracles:['THEY BUILT YOU SOMETHING.','A MONUMENT TO THE VISITING HAND','PLEASE KEEP TOUCHING.','YOU ARE NOW A PUBLIC UTILITY.'],
  fortress:['THE SKY IS CONSIDERED UNRELIABLE.','THE GREAT NATIONAL UMBRELLA','THEY ARE READY FOR YOU.','PLEASE KNOCK NEXT TIME.'],
  phoenix:['UIT DE AS.','STEEDS WEER HERBOUWD.','DE STAD DIE TERUGKWAM.','MOOIER. EN MET BRANDWEER.'],
  retreat:['THE SEA HAS KEPT THE RECEIPT.','A VERY ORGANIZED RETREAT','SMALLER IS STILL SOMEWHERE.','THEY LIVE TO ARGUE ANOTHER DAY.'],
  'last-drop':['THE LAST BASIN IS EMPTY.','THE OCEAN IS BEING DISCONTINUED.','THE VERY LAST DROP.','ONE SMALL WATER SHORTAGE.']
 };
 const index=t<5?0:t<11?1:t<19?2:3;
 return{index,title:(beats[movie.id]||beats.independent)[index],caption:t<5?'The inhabitants gather.':t<11?'They may have taken this a little too far.':movie.id==='independent'?'The entire island. With balloons. Of course.':movie.id==='last-drop'?'The engineers celebrate. The tap disagrees.':'A civilization gets the ending it built.',progress:Math.min(1,t/24)};
}

export function cinemaVisible(s){return !!s.cinematic&&(!s.cinematic.completed||s.ending&&!s.sandbox);}

import {currentRelative} from './family.js';
import {eventPriority} from './story.js';

export const MAX_AWAY_YEARS=300;
export const MIN_AWAY_MS=60_000;
export function returnFromAway(s,now=Date.now()){
 const previous=s.lastVisitAt;s.lastVisitAt=now;
 if(!Number.isFinite(previous)||!Number.isFinite(now)||now-previous<MIN_AWAY_MS||s.lastVisitPaused||s.ending||s.config.offlineProgress===false)return null;
 const from=s.year,floods=s.storyStats?.floods||0,relative=currentRelative(s);let seconds=Math.min(6*60*60,(now-previous)/1000),years=0,biggest=null;
 const speed=[1,2,3,10].includes(s.config.speedMultiplier)?s.config.speedMultiplier:1;
 while(years<MAX_AWAY_YEARS&&!s.ending){
  const duration=s.yearDuration/speed;if(seconds<duration)break;seconds-=duration;s.events=[];s.tick();years++;
  for(const entry of s.events){
   const priority=eventPriority(entry.type)+(entry.type==='family'?3:0);
   if(!biggest||priority>biggest.priority)biggest={...entry,priority};
  }
  s.events=[];s.signals=[];
 }
 if(!years)return null;
 const descendant=currentRelative(s),floodCount=Math.max(0,(s.storyStats?.floods||0)-floods);
 const elapsed=years%100===0?`${years/100} ${years===100?'eeuw':'eeuwen'}`:`${years} jaar`;
 const family=descendant.id!==relative.id?`${descendant.name} nam de familiesleutel over en werkt als ${descendant.occupation}.`:`${descendant.name} houdt de sleutel van het eerste huis nog bij zich.`;
 const report={from,to:s.year,years,floods:floodCount,summary:`${elapsed}, ${floodCount} ${floodCount===1?'overstroming':'overstromingen'}. ${family}`,biggest:biggest||{type:'family',text:family,year:s.year,x:-1,y:1},limited:years===MAX_AWAY_YEARS&&seconds>0,dismissed:false};
 s.awayReport=report;
 // An ending reached while absent remains available through an explicit recap button.
 if(s.ending){s.endingSeen=true;if(s.cinematic)s.cinematic.completed=true;}
 return report;
}

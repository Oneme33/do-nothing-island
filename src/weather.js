import {startBlaze} from './consequences.js';
// Weather with consequences. Its own hash keeps the simulation's random numbers untouched.
const wxHash=(seed,a,b=0)=>{let x=(seed^Math.imul(a+11,0x2c1b3c6d)^Math.imul(b+5,0x297a2d39))>>>0;x=Math.imul(x^(x>>>15),0x85ebca6b);x^=x>>>13;return(x>>>0)/4294967296;};
export const WEATHER={
 shower:{years:2,line:'Regenbui. De akkers drinken zich vol.',log:'Een flinke regenbui trekt over het eiland. De akkers zijn blij, de was minder.'},
 thunder:{years:1,line:'Onweer. Iedereen telt de seconden.',log:'Onweer! De donder rolt over de daken en de bliksem zoekt een doel.'},
 fog:{years:3,line:'Mist. De zee is even weg.',log:'Een dikke mist hangt over de kust. De vissers blijven thuis en vertellen sterke verhalen.'},
 drought:{years:4,line:'Droogte. De putten worden dieper.',log:'Een lange droogte. Het gras wordt geel en de putten worden een stukje dieper gegraven.'},
 heatwave:{years:2,line:'Hittegolf. Het strand is vol.',log:'Een hittegolf! Iedereen gaat naar het strand, en de ijssalon draait overuren.'},
 snowstorm:{years:2,line:'Sneeuwstorm. Iedereen blijft binnen.',log:'Een sneeuwstorm bedekt het eiland. Kachels branden, soep pruttelt, niemand gaat de deur uit.'}
};
const KINDS=['shower','shower','thunder','fog','drought','heatwave','snowstorm'];
export function ensureWeather(s){s.weather??=null;s.nextWeather??=30+Math.floor(wxHash(s.seed,1)*20);return s.weather;}
export function weatherActive(s){return s.weather&&s.year<=s.weather.until?s.weather.kind:null;}
function strike(s){
 const targets=s.land.filter(t=>['tree','forest','house','hut','townhouse','farm','windmill'].includes(t.building)&&!t.fire);if(!targets.length)return null;
 const t=targets[Math.floor(wxHash(s.seed,s.year,7)*targets.length)];
 // Lightning rods arrive with the age of steam and stop most strikes from becoming fires.
 const rod=s.year>=1750&&wxHash(s.seed,s.year,8)<.75;
 s.weather.strike={x:t.x,y:t.y};
 if(rod){s.log('De bliksem slaat in, maar de bliksemafleider vangt hem op. De buurt applaudisseert voor een stuk ijzer.','storm',{x:t.x,y:t.y});return t;}
 startBlaze(s,t);s.log('De bliksem slaat in! Er ontstaat brand en de emmers komen tevoorschijn.','fire',{x:t.x,y:t.y});s.signal('rumble',t,'Bliksem!');return t;
}
export function advanceWeather(s){
 ensureWeather(s);
 const kind=weatherActive(s);
 if(kind){
  // Effects for every year the weather lasts.
  if(kind==='shower'){s.food+=s.population*.04;for(const f of s.farms)f.wetUntil=Math.max(f.wetUntil||0,s.year+2);for(const t of s.land)if(t.fire)t.fire.until=Math.min(t.fire.until,s.year);}
  if(kind==='fog'&&!s.land.some(t=>t.building==='lighthouse'))s.prosperity=Math.max(10,s.prosperity-1.2);
  if(kind==='drought'){const relief=s.land.filter(t=>t.spring||t.building==='well').length;s.freshwater=Math.max(5,s.freshwater-Math.max(1,4-relief));s.food*=.97;}
  if(kind==='heatwave'){s.freshwater=Math.max(5,s.freshwater-1.5);if(s.buildings.some(t=>t.building==='ice-cream'))s.prosperity=Math.min(94,s.prosperity+1);}
  if(kind==='snowstorm'){s.food*=.97;s.wood=Math.max(0,s.wood*.94);}
  return kind;
 }
 // Only now and then does a shower end in a rainbow.
 if(s.weather&&s.weather.kind==='shower'&&!s.weather.rainbow&&s.year===s.weather.until+1&&s.year-(s.lastRainbow??-999)>=150&&wxHash(s.seed,s.year,13)<.2){s.weather.rainbow=s.year;s.lastRainbow=s.year;}
 if(s.year<s.nextWeather||s.ending||s.storm)return null;
 const pick=KINDS[Math.floor(wxHash(s.seed,s.year,3)*KINDS.length)],def=WEATHER[pick];
 s.weather={kind:pick,since:s.year,until:s.year+def.years-1};
 s.nextWeather=s.year+18+Math.floor(wxHash(s.seed,s.year,4)*18);
 s.log(def.log,'storm');
 if(pick==='thunder')strike(s);
 return pick;
}

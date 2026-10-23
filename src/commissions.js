import {wishTally} from './wishes.js';
// After every third wish you help with, the residents build something of your choosing, wherever you point.
export const COMMISSIONS={
 watchtower:{name:'Uitkijktoren',effect:'Toeristen komen kijken: wat extra welvaart.',log:'Op jouw verzoek verrijst een uitkijktoren. Bovenaan zie je het hele eiland, en op heldere dagen zelfs een beetje van morgen.'},
 'rose-garden':{name:'Rozentuin',effect:'Rust en gezelligheid: minder onrust.',log:'Op jouw verzoek wordt een rozentuin aangelegd. De tuiniers geven elke roos een naam; één heet naar jou.'},
 'grand-fountain':{name:'Grote fontein',effect:'Een ontmoetingsplek: minder onrust en wat welvaart.',log:'Op jouw verzoek komt er een grote fontein. Er belanden binnen een week zeventien muntjes en één verdwaalde sok in.'},
 carillon:{name:'Klokkentoren',effect:'Elk uur muziek: het dorp wordt er blij van.',log:'Op jouw verzoek komt er een klokkentoren. Hij speelt elk uur een liedje dat iedereen na een week kan meefluiten.'}
};
export function ensureCommissions(s){s.commissions??={available:0,earned:0,built:[]};return s.commissions;}
// Called when a wish is helped.
export function earnCommission(s){
 const c=ensureCommissions(s),helped=wishTally(s,'helped');
 if(helped%3!==0)return false;
 c.available++;c.earned++;
 s.log('De bewoners willen iets voor je bouwen, als dank voor alle hulp. Kies in het Eilandboek bij Wensen wat het wordt.','wish');
 return true;
}
export function canCommission(s,tile){return !!tile&&tile.kind==='land'&&(!tile.building||['tree','forest','park','garden','farm'].includes(tile.building))&&!tile.buildSite&&!tile.landform&&!tile.reservedFor&&!tile.foundingHome;}
export function placeCommission(s,type,x,y){
 const c=ensureCommissions(s),tile=s.tile(x,y),def=COMMISSIONS[type];
 if(!def||c.available<1||s.ending||!canCommission(s,tile))return false;
 if(['tree','forest','park','garden','farm'].includes(tile.building))tile.building=null;
 if(!s.planBuilding(tile,type,true))return false;
 tile.commissioned=true;c.available--;c.built.push({type,x,y,year:s.year});
 s.log(def.log,'delight',{x,y});s.signal('celebrate',tile,`${def.name}, voor jou`);
 return true;
}
// Lasting effects while the commissioned works stand.
export function advanceCommissions(s){
 for(const t of s.land){
  if(t.building==='watchtower')s.prosperity=Math.min(94,s.prosperity+.05);
  else if(t.building==='rose-garden')s.unrest=Math.max(0,(s.unrest||0)-.2);
  else if(t.building==='grand-fountain'){s.unrest=Math.max(0,(s.unrest||0)-.15);s.prosperity=Math.min(94,s.prosperity+.03);}
  else if(t.building==='carillon')s.unrest=Math.max(0,(s.unrest||0)-.1);
 }
}

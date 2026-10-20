import {currentRelative} from './family.js';

const wishNear=(a,b,r=3)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
const wishClamp=n=>Math.max(0,Math.min(100,n));
export const WISH_OUTCOMES={helped:'Geholpen door jou',independent:'Zelf opgelost',expired:'Zonder ingreep verdergegaan',changed:'De wens veranderde met het eiland'};
export function ensureWishes(s){
 if(s.wishes?.version===1)return s.wishes;
 return s.wishes={version:1,serial:0,active:null,history:[],nextAt:s.year+24+(s.seed>>>0)%12};
}
function closeWish(s,status){
 const state=ensureWishes(s),wish=state.active;if(!wish)return;
 wish.status=status;wish.closedAt=s.year;
 if(status==='helped'){s.influence.trust=wishClamp(s.influence.trust+3);s.influence.dependence=wishClamp(s.influence.dependence+1.5);}
 if(status==='independent'){s.influence.trust=wishClamp(s.influence.trust+1);s.influence.dependence=wishClamp(s.influence.dependence-1);}
 if(status==='expired'){s.influence.trust=wishClamp(s.influence.trust-1);s.influence.dependence=wishClamp(s.influence.dependence-.5);}
 if(status!=='changed')s.log(`${wish.speaker}: “${wish.text}” ${status==='helped'?(wish.thanks?`${wish.thanks} Het vertrouwen groeit; ze rekenen iets meer op je.`:'Je hielp. Het vertrouwen groeit; ze rekenen iets meer op je.'):status==='independent'?'De inwoners losten het zelf op. Dat geeft vertrouwen in eigen kunnen.':'Er kwam geen ingreep. Ze gaan op eigen kracht verder.'}`,'wish',{x:wish.x,y:wish.y,wishId:wish.id});
 state.history.push({...wish});state.history=state.history.slice(-24);state.active=null;state.nextAt=s.year+64+(s.seed+state.serial*17)%37;
}
function canOpenWishSpring(s,t){
 return !!t&&(s.influence.rumble+1)%3!==0&&!t.building&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.spring&&
  [[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>s.tile(t.x+dx,t.y+dy)?.kind==='land')&&
  !s.land.some(p=>wishNear(p,t,2)&&p.wetUntil>s.year)&&
  !s.land.some(p=>p.landform&&wishNear(p,t,2.5)&&(p.landform==='volcano'||!p.landslideYear));
}
function springWishPlot(s){return wishPick(s,s.land.filter(t=>canOpenWishSpring(s,t)),5);}
export function canHelpWish(s,wish=ensureWishes(s).active){
 if(!wish||s.ending||s.year>wish.deadline)return false;
 const t=s.tile(wish.x,wish.y);if(t?.kind!=='land')return false;
 if(wish.kind==='rain')return t.building==='farm';
 if(wish.kind==='extinguish')return !!t.fire;
 if(wish.kind==='feast')return t.building==='original-tree';
 if(wish.kind==='bonfire')return !t.buildSite&&(['bonfire','campfire'].includes(t.building)||!t.building&&!t.reservedFor&&!t.landform);
 if(FUNNY_WISHES[wish.kind])return true;
 return wish.kind==='spring'&&canOpenWishSpring(s,t);
}
export function helpActiveWish(s,expectedId){
 const wish=ensureWishes(s).active;
 if(!wish||wish.id!==expectedId||!canHelpWish(s,wish))return false;
 s.interfere(wish.x,wish.y,FUNNY_WISHES[wish.kind]?.mode||{rain:'rain',extinguish:'rain',feast:'nudge',bonfire:'fire',spring:'rumble'}[wish.kind]);
 return s.wishes.history.some(w=>w.id===expectedId&&w.status==='helped');
}
// An open plot: nothing tall stands in front of it, so a fire there is actually visible.
const LOW_PLOTS=new Set(['farm','beach','park','garden','campfire','bonfire','playground','campus-square','palace-square','town-square']);
const lowOrEmpty=t=>!!t&&t.kind==='land'&&!t.landform&&!t.buildSite&&(!t.building||LOW_PLOTS.has(t.building));
export function isOpenPlot(s,t){
 if(!t||t.kind!=='land'||t.building||t.buildSite||t.reservedFor||t.landform||t.spring||t.foundingHome)return false;
 const front=[[1,0],[0,1],[1,1]].every(([dx,dy])=>{const n=s.tile(t.x+dx,t.y+dy);return !n||n.kind!=='land'||lowOrEmpty(n);});
 const room=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>lowOrEmpty(s.tile(t.x+dx,t.y+dy))).length;
 return front&&room>=2;
}
const wishPick=(s,list,salt=0)=>list.length?list[((Math.imul((s.seed>>>0)+1,2654435761)+Math.imul(ensureWishes(s).serial+salt+1,40503))>>>0)%list.length]:null;
// Small, silly requests. Each one is solved by using the asked-for tool on the spot of the question mark.
export const FUNNY_WISHES={
 sheep:{mode:'nudge',where:'farm',text:'Schaap Bertha is ontsnapt en staat nu op het dak van de schuur. Kunnen de bouwers een trapje maken?',thanks:'Bertha is van het dak. Ze doet alsof het haar eigen idee was.',thing:'een trapje voor Bertha',noun:'het trapje voor Bertha'},
 cheese:{mode:'rain',where:'market',text:'Het is zo warm dat de kaas uit zichzelf smelt. Een buitje boven de markt?',thanks:'De kaas is gered. De markt ruikt nog dagen naar regen en oude kaas.',thing:'regen voor de kaas',noun:'de regen voor de kaas'},
 cart:{mode:'rumble',where:'road',text:'Een kar zit muurvast in de modder. Zou een klein schokje helpen?',thanks:'De kar schiet los. De ezel kijkt verwijtend naar de lucht.',thing:'een schokje voor de kar',noun:'het schokje voor de vastgelopen kar'},
 soup:{mode:'fire',where:'open',text:'Het is zo koud dat de soep in de pan bevriest. Een kampvuurtje om hem op te warmen?',thanks:'De soep is warm. Iedereen beweert dat het zijn recept was.',thing:'een vuurtje voor de soep',noun:'het soepvuur'},
 kids:{mode:'nudge',where:'open',text:'De kinderen vervelen zich zó dat ze de kippen Frans leren. Een zetje voor iets leuks?',thanks:'Er wordt iets gebouwd. De kippen zijn opgelucht.',thing:'iets leuks voor de kinderen',noun:'het zetje voor de kinderen'},
 stone:{mode:'rumble',where:'farm',text:'Er ligt een enorme kei midden op de akker. Kan de grond hem een stukje opschuiven?',thanks:'De kei rolt opzij. Hij krijgt een naam en een eigen bankje.',thing:'hulp met de kei',noun:'de kei die opzij rolde'},
 books:{mode:'rain',where:'library',text:'De bibliotheek is zo stoffig dat de boeken niezen. Een frisse bui erover?',thanks:'De boeken zijn fris. Eén woordenboek is nog wat verkouden.',thing:'een frisse bui voor de boeken',noun:'de bui over de bibliotheek'},
 birthday:{mode:'fire',where:'open',text:'Oma Truus wordt honderd. Een feestvuurtje voor de taart?',thanks:'Honderd kaarsjes, één vuurtje. Oma blaast ze in één keer uit.',thing:'een feestvuur voor oma Truus',noun:'het verjaardagsvuur van oma Truus'},
 seagull:{mode:'rain',where:'beach',text:'Een meeuw heeft de patat van de burgemeester gestolen. Een bui om hem te verjagen?',thanks:'De meeuw druipt af. De patat is helaas niet meer te redden.',thing:'een bui tegen de meeuw',noun:'de bui tegen de patatmeeuw'},
 lift:{mode:'nudge',where:'lighthouse',text:'De vuurtorenwachter is de trap zat. Een zetje voor een lift?',thanks:'Er komt een katrol met een mandje. De kat gaat voortaan met de lift.',thing:'een lift in de vuurtoren',noun:'het katrolletje van de vuurtoren'}
};
function funnyPlace(s,where){
 const pick=list=>wishPick(s,list,where.length);
 if(where==='farm')return pick(s.farms.filter(t=>!t.fire));
 if(where==='market')return pick(s.buildings.filter(t=>['market','shop','bakery','cafe'].includes(t.building)));
 if(where==='road')return pick(s.land.filter(t=>t.road&&!t.building&&!t.buildSite));
 if(where==='library')return pick(s.buildings.filter(t=>t.building==='library'));
 if(where==='beach')return pick(s.land.filter(t=>t.building==='beach'));
 if(where==='lighthouse')return pick(s.land.filter(t=>t.building==='lighthouse'));
 return pick(s.land.filter(t=>isOpenPlot(s,t)));
}
function wishCandidates(s){
 const choices=[],farm=wishPick(s,s.farms.filter(t=>!t.fire),1),tree=s.tile(0,0);
 if(farm)choices.push({kind:'rain',mode:'rain',text:'De boeren hopen op regen. Een bui over onze akker?',...{x:farm.x,y:farm.y}});
 if(tree?.building==='original-tree')choices.push({kind:'feast',mode:'nudge',text:'We willen een feest onder de oude boom. Geef jij het eerste zetje?',x:tree.x,y:tree.y});
 const visibleCamp=s.land.find(t=>['campfire','bonfire'].includes(t.building)&&[[1,0],[0,1],[1,1]].every(([dx,dy])=>{const n=s.tile(t.x+dx,t.y+dy);return !n||n.kind!=='land'||lowOrEmpty(n);}));
 const camp=visibleCamp||wishPick(s,s.land.filter(t=>isOpenPlot(s,t)),3);
 if(camp)choices.push({kind:'bonfire',mode:'fire',text:'Een vreugdevuur op onze open plek? Wij nemen de hapjes mee.',x:camp.x,y:camp.y});
 for(const [kind,w] of Object.entries(FUNNY_WISHES)){const t=funnyPlace(s,w.where);if(t)choices.push({kind,mode:w.mode,text:w.text,thing:w.thing,noun:w.noun,thanks:w.thanks,x:t.x,y:t.y});}
 const spring=springWishPlot(s);if(spring)choices.push({kind:'spring',mode:'rumble',text:'Volgens de waterzoekers zit hier een bron. Zou een beving haar kunnen openen?',x:spring.x,y:spring.y});
 return choices;
}
export function advanceWishes(s){
 const state=ensureWishes(s);if(s.ending)return;
 const active=state.active;
 if(active){
  const target=s.tile(active.x,active.y);
  if(active.kind==='extinguish'&&!target?.fire){closeWish(s,target?.building==='ruins'||target?.burntForest?'expired':'independent');return;}
  if(!target||target.kind!=='land'||active.kind==='rain'&&target.building!=='farm'||FUNNY_WISHES[active.kind]?.where==='farm'&&target.building!=='farm'||active.kind==='bonfire'&&(target.buildSite||target.building&&!['bonfire','campfire'].includes(target.building))){closeWish(s,'changed');return;}
  if(s.year>active.deadline)closeWish(s,'expired');
  return;
 }
 if(s.year<state.nextAt)return;
 const burning=s.land.find(t=>t.fire),choices=wishCandidates(s);
 const next=burning?{kind:'extinguish',mode:'rain',text:'Wie stopt dit vuur? Een regenbui kan ons helpen!',x:burning.x,y:burning.y}:wishPick(s,choices,7);
 if(!next){state.nextAt=s.year+20;return;}
 const person=currentRelative(s);state.serial++;
 state.active={...next,id:`wish-${s.seed}-${state.serial}`,speaker:`${person.name} ${person.lastName}`,issuedAt:s.year,deadline:s.year+36,status:'active',hidden:false};
}
export function answerWish(s,spot,mode){
 const wish=ensureWishes(s).active;if(!wish||s.year>wish.deadline||wish.mode!==mode||!wishNear(wish,spot))return false;
 const target=s.tile(wish.x,wish.y);
 if(FUNNY_WISHES[wish.kind]){if(!wishNear(wish,spot,1.5))return false;closeWish(s,'helped');return true;}
 const success=wish.kind==='rain'?target?.building==='farm'&&target.wetUntil>s.year:
  wish.kind==='extinguish'?!target?.fire:
  wish.kind==='spring'?s.land.some(t=>t.springYear===s.year&&wishNear(t,wish,2)):
  s.festival?.until>s.year&&s.festival.kind===(wish.kind==='bonfire'?'bonfire':'picnic')&&wishNear(s.festival,wish,1);
 if(!success)return false;closeWish(s,'helped');return true;
}
export function dismissWish(s){const wish=ensureWishes(s).active;if(wish)wish.hidden=true;}

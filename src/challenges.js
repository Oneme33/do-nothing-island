// Optional goals never consume world randomness, produce popups or award resources.
export const CHALLENGE_CATALOG=[
 {id:'first-manor',title:'Een voordeur met ambities',description:'Laat het eerste huis uiterlijk in jaar 400 uitgroeien tot een landhuis.',deadline:400},
 {id:'hundred-neighbors',title:'Iedereen kent nog iemand',description:'Bereik uiterlijk in jaar 600 minstens 100 inwoners.',deadline:600},
 {id:'hands-off',title:'Ze redden zich prima',description:'Bereik de Renaissance in jaar 1250 zonder één ingreep.',deadline:1250},
 {id:'green-modernity',title:'Vooruitgang met schaduw',description:'Bereik jaar 1920 met minstens 75% levend landschap en vier bossen.',deadline:1920},
 {id:'fire-tradition',title:'Wij nemen de hapjes mee',description:'Sticht uiterlijk in jaar 500 een terugkerende vuurtraditie op een vuurplaats.',deadline:500,experiment:true},
 {id:'fresh-spring',title:'Water uit de grond',description:'Open uiterlijk in jaar 1000 een blijvende zoetwaterbron.',deadline:1000,experiment:true},
 {id:'library',title:'Een eiland vol verhalen',description:'Laat uiterlijk in jaar 600 een bibliotheek bouwen.',deadline:600}
];
const challengeHash=(seed,n)=>{let x=(seed^Math.imul(n+1,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);return(x^(x>>>13))>>>0;};
function selectChallenges(seed){
 const count=1+challengeHash(seed,0)%3,pool=CHALLENGE_CATALOG.slice().sort((a,b)=>challengeHash(seed,CHALLENGE_CATALOG.indexOf(a)+1)-challengeHash(seed,CHALLENGE_CATALOG.indexOf(b)+1));
 const chosen=[];
 for(const goal of pool){
  if(goal.id==='hands-off'&&chosen.some(g=>g.experiment)||goal.experiment&&chosen.some(g=>g.id==='hands-off'))continue;
  chosen.push(goal);if(chosen.length===count)break;
 }
 return chosen;
}
export function ensureChallenges(s,{restoring=false}={}){
 if(s.challenges?.version===1&&Array.isArray(s.challenges.goals))return s.challenges;
 return s.challenges={version:1,revealed:false,trackingSince:s.year,goals:selectChallenges(s.seed).map(goal=>({id:goal.id,status:restoring&&(s.year>=goal.deadline||goal.id==='hands-off'&&s.interferences>0)?'unavailable':'active',completedAt:null}))};
}
function challengeMet(s,id){
 switch(id){
  case'first-manor':return ['manor','palace'].includes(s.tile(-1,1)?.building);
  case'hundred-neighbors':return s.population>=100;
  case'hands-off':return s.year>=1250&&s.interferences===0;
  case'green-modernity':return s.year>=1920&&s.environment>=75&&s.forests.length>=4;
  case'fire-tradition':return s.fireTraditions>0;
  case'fresh-spring':return s.land.some(t=>t.spring);
  case'library':return s.buildings.some(t=>t.building==='library');
  default:return false;
 }
}
export function advanceChallenges(s){
 const state=ensureChallenges(s);
 for(const goal of state.goals){
  if(goal.status!=='active')continue;
  const definition=CHALLENGE_CATALOG.find(g=>g.id===goal.id);if(!definition){goal.status='unavailable';continue;}
  if(s.year>definition.deadline||goal.id==='hands-off'&&s.interferences>0){goal.status='missed';goal.closedAt=s.year;}
  else if(challengeMet(s,goal.id)){goal.status='completed';goal.completedAt=s.year;}
  else if(s.ending){goal.status='missed';goal.closedAt=s.year;}
 }
 return state;
}
export function challengeProgress(s,id){
 switch(id){
  case'first-manor':return ['manor','palace'].includes(s.tile(-1,1)?.building)?'Het eerste huis is uitgegroeid.':'De eerste voordeur wacht op haar landhuis.';
  case'hundred-neighbors':return `${Math.floor(s.population)} van 100 inwoners`;
  case'hands-off':return `${s.interferences} ingrepen · jaar ${Math.min(s.year,1250)} van 1250`;
  case'green-modernity':return `${Math.round(s.environment)}% landschap · ${s.forests.length} van 4 bossen · jaar ${Math.min(s.year,1920)} van 1920`;
  case'fire-tradition':return s.fireTraditions?'Het vuurfeest is een traditie.':'Er is nog geen terugkerende vuurtraditie.';
  case'fresh-spring':return s.land.some(t=>t.spring)?'Er stroomt vers water uit de grond.':'Er is nog geen blijvende bron.';
  case'library':return s.buildings.some(t=>t.building==='library')?'De bibliotheek is open.':'De bibliotheek moet nog gebouwd worden.';
  default:return '';
 }
}

import {nl} from './language.js';
// One continuous line of keyholders; its own hash never consumes simulation randomness.
export const FAMILY_GENERATION_YEARS=32;
const familyFirstNames=['Noor','Sam','Bo','Mila','Daan','Lou','Iris','Mo','Tess','Finn','Ada','Jip','Bep','Bram','Fien','Otis','Lena','Ravi','Roos','Nora','Teun','Liv','Evi','Sem','Pip','Niek','Cato','Abel','Linde','Mika','Els','Jo'];
const familyLastNames=['de Vries','van de Kust','Bos','van Dijk','de Boer','Steen','van de Berg','Visser'];
const familyQuirks=['praat met de wortels alsof ze terugpraten','telt elke avond de ramen van het eerste huis','bewaart stenen met een bijzondere vorm','fluit altijd één noot naast de melodie','geeft alle schapen een adellijke titel','komt nooit zonder een extra boterham','tekent onmogelijke uitbouwen op servetten','is ervan overtuigd dat de oude boom kan luisteren','verzamelt schelpen die op familieleden lijken','begint elke vergadering met een zeer klein gedicht','houdt een nauwkeurig dagboek van het weer','bakt voor iedereen die zomaar langskomt','maakt zich vooral zorgen over de moestuin','kan geen scheve plank met rust laten','noemt elke meeuw bij een zelfbedachte naam','draagt voor de zekerheid altijd een feesthoed bij zich','vindt dat elke stoel een verhaal heeft','legt de sleutel iedere dag op een andere veilige plek','tekent de kustlijn in de kantlijn van brieven','bewaart de recepten van alle vorige generaties','groet de oorspronkelijke boom elke ochtend','vindt stilte de beste uitvinding van de mens','zingt tegen het deeg zodat het beter rijst','houdt een lijst bij van alle wolken die op dieren lijken','repareert dingen die nog niet kapot zijn','neemt overal een paraplu mee, ook binnen','geeft de deur van het eerste huis elk voorjaar een nieuwe kleur','spreekt de zee aan met u','bewaart alle sleutels, ook die van sloten die niet meer bestaan','kent de verjaardag van elke kat op het eiland','leest de kroniek hardop voor aan de kippen','gelooft dat het eiland ’s nachts een klein stukje groeit'];
const familyHash=(seed,n)=>{let x=(seed^Math.imul(n+1,0x45d9f3b))>>>0;x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;};
// An odd step through 32 quirks: no quirk returns within 32 generations.
const quirkAt=(seed,index)=>familyQuirks[(familyHash(seed,160)+index*13)%familyQuirks.length];
export const sentenceCase=text=>text?text[0].toUpperCase()+text.slice(1):text;
function professionAt(year,seed,generation){
 const jobs=['akkerbouwer','timmeraar','visser','tuinier','wever','steenhouwer'];
 if(year>=120)jobs.push('bakker','onderwijzer','bibliothecaris','koopman');
 if(year>=600)jobs.push('molenaar','klokkenmaker');
 if(year>=1250)jobs.push('kaartenmaker','boekdrukker');
 if(year>=1750)jobs.push('machinebouwer','fabrieksarbeider');
 if(year>=1880)jobs.push('elektricien','fotograaf');
 if(year>=1950)jobs.push('onderzoeker','stedenbouwer');
 if(year>=1980)jobs.push('programmeur','ecoloog');
 return generation===0?'akkerbouwer':jobs[familyHash(seed,generation+80)%jobs.length];
}
function makeRelative(seed,index,lastName,reconstructed=false){
 const hash=Math.abs((seed+96)|0),name=index===0?familyFirstNames[hash%12]:familyFirstNames[(hash+index*5+Math.floor(index/familyFirstNames.length))%familyFirstNames.length];
 const since=1+index*FAMILY_GENERATION_YEARS;
 return{id:`family-${seed}-${index}`,generation:index+1,parentId:index?`family-${seed}-${index-1}`:null,name,lastName,born:since-24,since,occupation:professionAt(since,seed,index),quirk:quirkAt(seed,index),moments:[],reconstructed};
}
export function ensureFamily(s,{restoring=false}={}){
 if(s.family?.version===1&&Array.isArray(s.family.generations)&&s.family.generations.length)return s.family;
 const lastName=familyLastNames[Math.abs((s.seed+96)|0)%familyLastNames.length];
 const through=restoring?Math.max(0,Math.floor((s.year-1)/FAMILY_GENERATION_YEARS)):0;
 const generations=Array.from({length:Math.min(through+1,2048)},(_,index)=>makeRelative(s.seed,index,lastName,restoring&&s.year>1));
 s.family={version:1,lastName,home:{x:-1,y:1},generations,currentId:generations.at(-1).id,reconstructed:restoring&&s.year>1};
 return s.family;
}
export function currentRelative(s){const family=ensureFamily(s);return family.generations.find(p=>p.id===family.currentId)||family.generations.at(-1);}
export function advanceFamily(s){
 const family=ensureFamily(s);let person=family.generations.at(-1);
 while(s.year>=person.since+FAMILY_GENERATION_YEARS&&family.generations.length<2048){
  const previous=person;person=makeRelative(s.seed,family.generations.length,family.lastName);family.generations.push(person);family.currentId=person.id;
  const story=familyStory(family,previous);
  s.log(`${person.name} ${family.lastName} neemt de sleutel van het eerste huis over van ${previous.name}${story?`, die nog altijd vertelt over ${story}`:''}. ${person.name} wordt ${person.occupation} en ${person.quirk}.`,'family',{year:person.since,x:family.home.x,y:family.home.y,relativeId:person.id,parentId:previous.id});
  s.signal('family',s.tile(family.home.x,family.home.y),`${person.name} erft de sleutel`);
 }
 return person;
}

// Family memories: what happened during a keyholder's life, told in their own words and passed down.
const MAX_MOMENTS=4;
const wishThing={rain:'regen',extinguish:'hulp bij de brand',feast:'een feest onder de oude boom',bonfire:'een vreugdevuur',spring:'een bron'};
const wishMemory={rain:'de regen',extinguish:'de hulp bij de brand',feast:'het feest onder de oude boom',bonfire:'het vreugdevuur',spring:'de bron'};
const familyPick=(seed,year,options)=>options[familyHash(seed,year+911)%options.length];
const nearFamilyHome=(family,entry,r=3)=>Number.isFinite(entry.x)&&Number.isFinite(entry.y)&&Math.hypot(entry.x-family.home.x,entry.y-family.home.y)<=r;
function storyFor(s,family,entry){
 const y=entry.year,seed=s.seed;
 if(entry.type==='wish'){
  const wish=s.wishes?.active?.id===entry.wishId?s.wishes.active:s.wishes?.history?.find(w=>w.id===entry.wishId);if(!wish)return null;
  const current=family.generations.find(p=>p.id===family.currentId)||family.generations.at(-1),speaker=family.generations.find(p=>`${p.name} ${p.lastName}`===wish.speaker);
  const thing=wishThing[wish.kind]||'hulp',noun=wishMemory[wish.kind]||'de hulp',own=!speaker||speaker.id===current.id;
  // A wish can outlive its keyholder; the current generation then remembers it on their behalf.
  const text=wish.status==='helped'?(!own?`zag de wens van ${speaker.name} om ${thing} alsnog uitkomen en vertelde het ${speaker.name} meteen.`:wish.kind==='extinguish'?familyPick(seed,y,['riep om hulp bij de brand. Het begon te regenen voordat de emmers vol waren.','riep om hulp bij de brand en kreeg een bui precies boven het dak. Er werd die avond niet veel gezegd, wel veel gedacht.']):familyPick(seed,y,[`vroeg om ${thing} en kreeg het. Sindsdien bedankt de familie elke zondag de lucht, voor de zekerheid.`,`vroeg om ${thing} en kreeg het meteen. Niemand in het dorp gelooft het verhaal, maar het wordt elk jaar mooier.`])):
   wish.status==='independent'?`${own?'vroeg':`hoorde ${speaker.name} vragen`} om ${thing}, maar het dorp loste het zelf op. De familie vertelt het verhaal liever zo.`:
   wish.status==='expired'?(own?familyPick(seed,y,[`vroeg om ${thing} en kreeg geen antwoord. Dat heeft de familie de lucht nooit helemaal vergeven.`,`wachtte tevergeefs op ${thing}. Het werd een gezegde: ‘wachten op de lucht’.`]):`wachtte samen met ${speaker.name} tevergeefs op ${thing}. Het werd een gezegde: ‘wachten op de lucht’.`):null;
  if(!text)return null;
  return{person:current,priority:4,kind:'wish',text,memory:wish.status==='helped'?(wish.kind==='extinguish'?`de regen tijdens de brand in jaar ${y}`:`${noun} in jaar ${y}`):`${noun} die in jaar ${y} nooit kwam`,signal:true};
 }
 if(entry.type==='interference'){
  const type=s.interventionLedger?.find(t=>t.id===entry.interventionId)?.type||s.lastIntervention?.type,near=nearFamilyHome(family,entry),spot=s.tile(entry.x,entry.y);
  if(type==='rain')return near?{priority:3,kind:'rain',text:'stond in de regen die uit het niets op het erf viel en weigerde naar binnen te gaan.',memory:`de regen uit het niets in jaar ${y}`,signal:true}:{priority:2,kind:'rain',text:familyPick(seed,y,['zag een bui precies boven één akker hangen en heeft het daarna nooit meer over toeval gehad.','zag het regenen op één plek en nergens anders. Sindsdien staat er een emmer klaar.']),memory:`de vreemde bui in jaar ${y}`};
  if(type==='rumble')return near?{priority:3,kind:'rumble',text:'voelde het eerste huis schudden. Sindsdien staan de borden achter een randje.',memory:`de beving in jaar ${y}`,signal:true}:{priority:2,kind:'rumble',text:familyPick(seed,y,['hoorde de grond rommelen en zet sindsdien de kopjes met de oortjes naar binnen.','voelde de grond bewegen en hielp de buren met stutten. Er werd veel gemopperd en veel geholpen.']),memory:`de beving in jaar ${y}`};
  if(type==='fire'){
   if(spot?.building==='bonfire'||spot?.building==='campfire')return{priority:2,kind:'bonfire',text:'danste om een vuur dat uit het niets opvlamde. De familie heeft er een recept voor geroosterde appels aan overgehouden.',memory:`het vreugdevuur in jaar ${y}`};
   return near?{priority:3,kind:'fire',text:'sjouwde met emmers toen het vuur gevaarlijk dicht bij het eerste huis kwam.',memory:`de brand in jaar ${y}`,signal:true}:{priority:2,kind:'fire',text:familyPick(seed,y,['zag rook boven het dorp en rende mee met de emmers.','hielp de buren na de brand met opnieuw beginnen. Ze kregen een taart terug.']),memory:`de brand in jaar ${y}`};
  }
  if(type==='nudge')return{priority:1,kind:'nudge',text:'zag de bouwers ineens twee keer zo hard werken en nam er stilletjes de eer voor.',memory:`de vreemde bouwhaast in jaar ${y}`};
  return null;
 }
 if(entry.type==='palace'){const b=s.tile(family.home.x,family.home.y)?.building;return{priority:3,kind:'home',text:b==='palace'?'zag het eerste huis uitgroeien tot een paleis en bleef gewoon de oude voordeur gebruiken.':'zag het eerste huis een landhuis worden en kocht er meteen een deurmat voor.',memory:b==='palace'?'de dag dat het huis een paleis werd':'de dag dat het huis een landhuis werd'};}
 if(entry.type==='flood'&&nearFamilyHome(family,entry,5))return{priority:3,kind:'flood',text:'zette de stoelen op tafel toen het water kwam, en daarna de kat.',memory:`het hoge water in jaar ${y}`};
 if(entry.type==='volcano')return{priority:2,kind:'volcano',text:'zag de vulkaan haar mening geven en verhuisde de moestuin een stukje.',memory:`de vulkaan in jaar ${y}`};
 if(entry.type==='age')return{priority:1,kind:'age',text:`maakte het begin van ${nl(s.age?.name||'een nieuw tijdperk').toLowerCase()} mee en vond het eerst maar niks.`,memory:null};
 return null;
}
export function rememberInFamily(s,entry){
 const family=s.family;if(!family?.generations?.length||!entry||entry.type==='family')return null;
 const story=storyFor(s,family,entry);if(!story)return null;
 const person=story.person||family.generations.find(p=>p.id===family.currentId)||family.generations.at(-1);
 person.moments??=[];
 const moment={year:entry.year,kind:story.kind,text:story.text,memory:story.memory,priority:story.priority};
 if(person.moments.length>=MAX_MOMENTS){
  const lowest=person.moments.reduce((n,m,i,a)=>m.priority<a[n].priority?i:n,0);
  if(person.moments[lowest].priority>=moment.priority)return null;person.moments.splice(lowest,1);
 }
 person.moments.push(moment);person.moments.sort((a,b)=>a.year-b.year);
 if(story.signal)s.signal('family',s.tile(family.home.x,family.home.y),`${person.name} onthoudt dit`);
 return moment;
}
export function familyStory(family,person){
 const told=(person.moments||[]).filter(m=>m.memory).sort((a,b)=>b.priority-a.priority||b.year-a.year)[0];
 return told?.memory||null;
}
// The stories the family keeps telling, newest first.
export function familyLore(family,limit=3){
 return family.generations.flatMap(p=>(p.moments||[]).filter(m=>m.memory&&m.priority>=2).map(m=>({...m,name:p.name}))).sort((a,b)=>b.year-a.year).slice(0,limit);
}

// One continuous line of keyholders; its own hash never consumes simulation randomness.
export const FAMILY_GENERATION_YEARS=32;
const familyFirstNames=['Noor','Sam','Bo','Mila','Daan','Lou','Iris','Mo','Tess','Finn','Ada','Jip','Bep','Bram','Fien','Otis','Lena','Ravi','Roos','Nora','Teun','Liv','Evi','Sem','Pip','Niek','Cato','Abel','Linde','Mika','Els','Jo'];
const familyLastNames=['de Vries','van de Kust','Bos','van Dijk','de Boer','Steen','van de Berg','Visser'];
const familyQuirks=['praat met de wortels alsof ze terugpraten','telt elke avond de ramen van het eerste huis','bewaart stenen met een bijzondere vorm','fluit altijd één noot naast de melodie','geeft alle schapen een adellijke titel','komt nooit zonder een extra boterham','tekent onmogelijke uitbouwen op servetten','is ervan overtuigd dat de oude boom kan luisteren','verzamelt schelpen die op familieleden lijken','begint elke vergadering met een zeer klein gedicht','houdt een nauwkeurig dagboek van het weer','bakt voor iedereen die zomaar langskomt','maakt zich vooral zorgen over de moestuin','kan geen scheve plank met rust laten','noemt elke meeuw bij een zelfbedachte naam','draagt voor de zekerheid altijd een feesthoed bij zich','vindt dat elke stoel een verhaal heeft','legt de sleutel iedere dag op een andere veilige plek','tekent de kustlijn in de kantlijn van brieven','bewaart de recepten van alle vorige generaties','groet de oorspronkelijke boom elke ochtend','vindt stilte de beste uitvinding van de mens'];
const familyHash=(seed,n)=>{let x=(seed^Math.imul(n+1,0x45d9f3b))>>>0;x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;};
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
 return{id:`family-${seed}-${index}`,generation:index+1,parentId:index?`family-${seed}-${index-1}`:null,name,lastName,born:since-24,since,occupation:professionAt(since,seed,index),quirk:familyQuirks[familyHash(seed,index+160)%familyQuirks.length],reconstructed};
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
  s.log(`${person.name} ${family.lastName} neemt de sleutel van het eerste huis over van ${previous.name}. ${person.name} wordt ${person.occupation} en ${person.quirk}.`,'family',{year:person.since,x:family.home.x,y:family.home.y,relativeId:person.id,parentId:previous.id});
  s.signal('family',s.tile(family.home.x,family.home.y),`${person.name} erft de sleutel`);
 }
 return person;
}

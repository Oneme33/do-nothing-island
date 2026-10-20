import {nl} from './language.js';
import { advanceCinema, startCinema, cinemaBeat } from './spectacle.js';
import { eventPriority, resumeSandbox, ENDINGS } from './story.js';
import { Civilization, ERAS, PROJECT_STAGES, AGES } from './simulation.js';
import { IslandRenderer } from './renderer.js';
import {describePlot} from './inspection.js';
import {drawFinale,islandScores} from './finale.js';
import {ensureFamily,currentRelative,familyLore,sentenceCase} from './family.js';
import {ensureWishes,dismissWish,WISH_OUTCOMES,canHelpWish,helpActiveWish} from './wishes.js';
import {ensureChallenges,CHALLENGE_CATALOG,challengeProgress} from './challenges.js';
import {chronicleChapters,chroniclePlace,CHAPTER_ILLUSTRATIONS} from './chronicle.js';
import {returnFromAway} from './away.js';
import {COLLECTION_STORAGE_KEY,COLLECTION_CATALOG,COLLECTION_GROUPS,readCollection,mergeCollections,collectIsland} from './collection.js';

const $=id=>document.getElementById(id);
const storageKey='do-nothing-island-v1';
let storageAvailable=true;
let sim;
try {sim=Civilization.restore(localStorage.getItem(storageKey));}catch{storageAvailable=false;}
sim ||= new Civilization();
returnFromAway(sim);
let collection=readCollection(null),collectionStorageAvailable=true;
try{collection=readCollection(localStorage.getItem(COLLECTION_STORAGE_KEY));}catch{collectionStorageAvailable=false;}
const canvas=$('island');
const renderer=new IslandRenderer(canvas,sim);renderer.mode='nudge';canvas.dataset.mode='nudge';
let paused=false,speed=[1,2,3,10].includes(sim.config.speedMultiplier)?sim.config.speedMultiplier:1,accumulator=0,lastTime=performance.now(),saveTimer=0,toastTimer,dirtyHistory=true;
let audio=null,audioNodes=[],audioEnabled=false;
let interferenceMode='nudge',interventionTimer,lastRemarkAt=0,shownRemark='';
let previousIsland=null,undoTimer;
let introStep=0,inspectionPinned=false;
const introKey='do-nothing-island-intro-v1';
const introScreens=[['Dit is jouw eiland.','Eén huisje, een akker en een handvol mensen. Geef ze even de tijd. Er hoeft niets af.'],['Ze redden zich prima.','Ze bouwen, ontdekken en maken er op hun eigen manier iets van. Jij mag gewoon kijken.'],['Probeer niets aan te raken…','Of toch wel. Elke ingreep laat sporen achter. Wat je achter elkaar doet, kan iets onverwachts losmaken.']];
function otherDialogOpen(){return [...document.querySelectorAll('dialog[open]')].some(d=>d!==$('cinema-dialog'));}
function updateIntro(){const [title,line]=introScreens[introStep];$('intro-title').textContent=title;$('intro-line').textContent=line;$('intro-step').textContent=`${introStep+1} / 3`;$('intro-next').textContent=introStep===2?'Bekijk mijn eiland →':'Verder →';$('intro-back').hidden=introStep===0;}
function showIntro(){introStep=0;updateIntro();$('intro-dialog').showModal();accumulator=0;}
let momentQueue=[],seenMoments=new Set(),momentAt=-Infinity,activeMoment=null,beatHoldUntil=0,snapshotSignature='';
const reducedPref=matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.reduced=reducedPref;
$('reduce-motion').checked=reducedPref;
$('expansion-limit').value=String(sim.config.maxTiles);
$('rare-endings').checked=sim.config.rareEndings;
$('accelerating').checked=sim.config.accelerating;
$('story-cards').checked=sim.config.storyCards===true;
$('offline-life').checked=sim.config.offlineProgress!==false;

function showToast(message,duration=4200){$('toast-text').textContent=nl(message);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);}
function dismissStory(){beatHoldUntil=0;momentQueue=[];activeMoment=null;momentAt=performance.now();$('moment-card').hidden=true;updateClock();}
function persistCollection(){
  try{const stored=readCollection(localStorage.getItem(COLLECTION_STORAGE_KEY));mergeCollections(stored,collection);collection=stored;localStorage.setItem(COLLECTION_STORAGE_KEY,JSON.stringify(collection));collectionStorageAvailable=true;}
  catch{collectionStorageAvailable=false;}
}
function syncCollection(){if(collectIsland(collection,sim))persistCollection();}
function renderCollection(){
  syncCollection();persistCollection();
  const total=COLLECTION_CATALOG.length,found=Object.keys(collection.entries).length;
  $('collection-progress').textContent=`${found} van ${total} vondsten`;
  $('collection-storage').textContent=collectionStorageAvailable?'Bewaard in deze browser, over al je eilanden heen. Nieuw eiland en Herstel vorig eiland wissen je vondsten niet.':'Bewaren lukt hier niet. Deze verzameling blijft tijdens dit bezoek in het geheugen.';
  const silhouettes={endings:'M3 17 Q3 11 7 12 L10 5 14 11 Q21 10 21 17 Z',moments:'M3 20 V10 L12 3 21 10 V20 Z',challenges:'M8 2 H16 V9 L12 14 8 9 Z M12 12 L17 21 12 18 7 21 Z',secrets:'M12 2 L15 8 22 12 15 16 12 22 9 16 2 12 9 8 Z'};
  $('collection-groups').replaceChildren(...Object.entries(COLLECTION_GROUPS).map(([group,label])=>{
    const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ol'),items=COLLECTION_CATALOG.filter(item=>item.group===group);
    heading.textContent=`${label} · ${items.filter(item=>collection.entries[item.id]).length} / ${items.length}`;list.className='collection-grid';
    list.append(...items.map(definition=>{
      const record=collection.entries[definition.id],item=document.createElement('li'),stamp=document.createElement('span'),title=document.createElement('strong'),text=document.createElement('p'),source=document.createElement('small');
      item.dataset.id=definition.id;item.dataset.found=String(!!record);stamp.className='collection-stamp';stamp.setAttribute('aria-hidden','true');stamp.innerHTML=`<svg viewBox="0 0 24 24"><path d="${silhouettes[group]}"/></svg>`;
      title.textContent=record?definition.title:'Nog niet ontdekt';text.textContent=record?definition.description:definition.hint;source.textContent=record?`Seed ${record.seed} · vastgelegd in jaar ${record.year}`:'Volg een ander spoor.';
      item.append(stamp,title,text,source);return item;
    }));section.append(heading,list);return section;
  }));
}
function save(){
  sim.lastVisitAt=Date.now();sim.lastVisitPaused=paused||otherDialogOpen()||!!sim.ending;
  syncCollection();persistCollection();
  try {localStorage.setItem(storageKey,sim.serialize());storageAvailable=true;$('save-status').textContent="Je eiland is op dit apparaat opgeslagen.";}
  catch {storageAvailable=false;$('save-status').textContent="Opslaan lukt hier niet. Je kunt dit bezoek wel gewoon verder spelen.";}
}
function togglePause(){
  if(sim.ending&&!cinemaActive()){showToast("Het verhaal is klaar. Via het naschrift kun je vrij verder spelen.");return;}
  paused=!paused;updatePause();
}
function updatePause(){
  document.body.classList.toggle('is-paused',paused);
  $('pause').setAttribute('aria-label',paused?"Hervat het eiland":"Pauzeer het eiland");
  $('pause').title=paused?"Verder (spatie)":"Pauze (spatie)";
  $('pause-icon').innerHTML=paused?'<path d="m6 3 10 7-10 7Z"/>':'<path d="M6 4v12M14 4v12"/>';
  document.querySelector('.live-status').innerHTML=`<i></i> ${paused?"EVEN PAUZE":sim.ending?"EEN HELE PRESTATIE":"HET LEVEN GAAT DOOR"}`;
  $('time-caption').textContent=paused?"DE WERELD KAN WACHTEN":speed===1?"HET KOMT OP GANG":speed===2?"TWEE KEER ZOVEEL DRAMA":speed===3?"EEN BEETJE MEER AMBITIE":"GESCHIEDENIS MET HAAST";
  updateClock();
}
function updateClock(){
  const held=performance.now()<beatHoldUntil,modal=otherDialogOpen();
  const rate=speed/sim.yearDuration;
  $('pace-readout').textContent=sim.ending?"Een compleet eilandverhaal.":held?"Even kijken · Verder om over te slaan":paused?"De tijd neemt even pauze.":`${rate.toFixed(1)} jaar / seconde${sim.config.accelerating?" · steeds wat sneller":''}`;
  renderer.activityRate=cinemaActive()?1:rate*.68;renderer.paused=paused||modal||!cinemaActive()&&(sim.ending||held);
}
const icons={legacy:'✳',reform:'✧',crisis:'⚑',age:'✧',tree:'♧',farm:'♧',home:'⌂',life:'✳',dock:'⚑',technology:'✧',dike:'≋',land:'▱',district:'⌂',storm:'☂',flood:'≈',repair:'⚒',beach:'◌',abandon:'↗',interference:'✳',ending:'◉',road:'⌁',trade:'⚑',palace:'♜',culture:'♫',bridge:'⌒',protest:'⚑',endgame:'✧',volcano:'△'};
function historyItem(entry,locate=false){
  const item=document.createElement('article');item.className='history-item'+(entry.type==='family'?' family-history-item':entry.type==='interference'?' interference-history-item':'');
  const marker=document.createElement('span');marker.className='history-marker';marker.setAttribute('aria-hidden','true');marker.textContent=icons[entry.type]||'✳';
  const content=document.createElement('div'),time=document.createElement('time'),p=document.createElement('p');
  time.textContent=`JAAR ${entry.year}${entry.type==='family'?' · FAMILIE':entry.type==='interference'?' · JOUW INGREEP':(entry.priority||eventPriority(entry.type))>=82?' · MIJLPAAL':''}`;p.textContent=nl(entry.text);content.append(time,p);
  if(locate===true){const button=document.createElement('button');button.className='chronicle-show';button.textContent='Laat zien ↗';button.title=chroniclePlace(sim,entry)?'Bekijk deze plek op het huidige eiland':'Bekijk het eiland; de precieze plek is niet opgeslagen';button.addEventListener('click',()=>showChroniclePlace(entry));content.append(button);}
  item.append(marker,content);return item;
}
function updateHistory(){
  if(!dirtyHistory)return;dirtyHistory=false;
  const recent=sim.history.slice(-32).filter(e=>(e.priority||eventPriority(e.type))>=76).slice(-3).reverse();
  $('history-preview').replaceChildren(...recent.map(historyItem));
  for(let i=recent.length;i<3;i++){
    const empty=document.createElement('div');empty.className='history-empty';empty.textContent=i===1?"De geschiedenis neemt haar tijd.":"Er gaat iets gebeuren. Waarschijnlijk.";$('history-preview').append(empty);
  }
  if($('book-dialog').open&&bookPage==='journal')renderJournal();
}
function showChroniclePlace(entry){
  $('book-dialog').close();const place=chroniclePlace(sim,entry);chooseMode('help');
  if(place){inspectionPinned=true;focusPlace(place);showToast(`Plek uit de kroniek · jaar ${entry.year} · je ziet het huidige eiland.`,3200);}
  else{renderer.focus=null;renderer.recenter();inspectionPinned=false;$('tile-inspector').hidden=true;showToast(`Jaar ${entry.year} · de precieze plek is niet opgeslagen. Je ziet het hele eiland.`,3600);}
}
function renderJournal(){
  const chapters=chronicleChapters(sim),sections=[];
  const navigation=chapters.map(chapter=>{
    const section=document.createElement('section'),header=document.createElement('header'),picture=document.createElement('span'),words=document.createElement('div'),range=document.createElement('span'),title=document.createElement('h3'),note=document.createElement('small'),button=document.createElement('button');
    section.className='chronicle-chapter';section.dataset.era=chapter.id;section.dataset.current=String(chapter.current);section.setAttribute('aria-labelledby',`chapter-${chapter.id}`);
    picture.className='chapter-illustration';picture.setAttribute('aria-hidden','true');picture.innerHTML=`<svg viewBox="0 0 96 60">${CHAPTER_ILLUSTRATIONS[chapter.id]}</svg>`;
    range.className='eyebrow';range.textContent=`JAAR ${chapter.year}${chapter.until?`–${chapter.until}`:' EN VERDER'}`;title.id=`chapter-${chapter.id}`;title.textContent=chapter.title;note.textContent=`${chapter.entries.length} bewaarde berichten${chapter.current?' · huidig hoofdstuk':''}`;words.append(range,title,note);header.append(picture,words);section.append(header);
    if(chapter.entries.length)section.append(...chapter.entries.map(entry=>historyItem(entry,true)));else{const empty=document.createElement('p');empty.className='chapter-empty';empty.textContent='Nog geen bewaarde berichten in dit hoofdstuk. Het dagelijks leven ging ondertussen gewoon door.';section.append(empty);}
    sections.push(section);button.textContent=chapter.title;button.setAttribute('aria-label',`Ga naar ${chapter.title}`);if(chapter.current)button.setAttribute('aria-current','true');button.addEventListener('click',()=>section.scrollIntoView({behavior:renderer.reduced?'auto':'smooth',block:'start'}));return button;
  });
  $('journal-chapters').replaceChildren(...navigation);$('journal-entries').replaceChildren(...sections);
}
function familyMoments(person,className='family-moments'){
  const list=document.createElement('ul');list.className=className;
  list.append(...(person.moments||[]).map(moment=>{const item=document.createElement('li');item.textContent=`Jaar ${moment.year}: ${person.name} ${moment.text}`;return item;}));
  return list;
}
function renderFamily(){
  const family=ensureFamily(sim),current=currentRelative(sim);
  $('family-title').textContent=`Familie ${family.lastName}`;
  const name=document.createElement('strong'),profile=document.createElement('p');name.textContent=`${current.name} ${family.lastName} · generatie ${current.generation}`;profile.textContent=`${sentenceCase(current.occupation)}. ${current.name} ${current.quirk}.`;
  const lore=familyLore(family),told=document.createElement('p');told.className='family-lore';
  told.textContent=lore.length?`Aan tafel gaat het nog vaak over ${lore.map(m=>m.memory).join(', ').replace(/, ([^,]*)$/,' en $1')}.`:'Nog geen verhalen die aan tafel steeds terugkomen. Dat komt vanzelf.';
  $('family-current').replaceChildren(name,profile,familyMoments(current),told);
  $('family-note').textContent=family.reconstructed?'De oudste bladzijden komen uit familieoverlevering. Nieuwe generaties en hun herinneringen worden vanaf nu bijgehouden.':'Van de eerste sleutelhouder tot de huidige generatie. Namen, beroepen, eigenaardigheden en herinneringen blijven bewaard.';
  $('family-generations').replaceChildren(...family.generations.map((person,i)=>{
    const item=document.createElement('li'),heading=document.createElement('strong'),time=document.createElement('time'),line=document.createElement('p');
    item.dataset.relative=person.id;if(person.id===current.id)item.setAttribute('aria-current','true');
    heading.textContent=`${person.name} ${family.lastName}`;time.textContent=`Generatie ${person.generation} · sleutelhouder vanaf jaar ${person.since}${family.generations[i+1]?` tot ${family.generations[i+1].since-1}`:' · nu'}`;
    const parent=i?family.generations[i-1]:null;line.textContent=`${parent?`Kind van ${parent.name}. `:'De eerste bewoner. '}${sentenceCase(person.occupation)}. ${person.name} ${person.quirk}.`;
    item.append(heading,time,line);if(person.moments?.length)item.append(familyMoments(person));return item;
  }));
}
function renderChallenges(){
  const state=ensureChallenges(sim);
  $('challenge-note').textContent=state.trackingSince>1?`Bijhouden begonnen in jaar ${state.trackingSince}. Voorbijgegane doelen zijn niet achteraf beoordeeld.`:'Deze ideeën horen bij de seed van je eiland. Je hoeft ze niet te volgen.';
  $('challenge-list').replaceChildren(...state.goals.map(goal=>{
    const definition=CHALLENGE_CATALOG.find(d=>d.id===goal.id),item=document.createElement('li'),title=document.createElement('strong'),description=document.createElement('p'),status=document.createElement('span'),progress=document.createElement('small');
    item.dataset.status=goal.status;title.textContent=definition?.title||'Een idee uit een andere versie';description.textContent=definition?.description||'';
    status.textContent=goal.status==='completed'?`✓ Gelukt in jaar ${goal.completedAt}`:goal.status==='missed'?'Afgesloten · het eiland koos een ander verhaal':goal.status==='unavailable'?'Niet bijgehouden in deze oude save':'Vrijblijvend · nog mogelijk';
    progress.textContent=goal.status==='active'?challengeProgress(sim,goal.id):goal.status==='completed'?'Deze mijlpaal blijft bewaard, ook als het eiland verder verandert.':'Je kunt rustig verder spelen.';
    item.append(title,description,status,progress);return item;
  }));
}
function updateWishBubble(){
  const wish=ensureWishes(sim).active;
  $('book-tab-wishes').dataset.pending=String(!!wish&&!sim.ending);
  $('wish-bubble').hidden=!wish||wish.hidden||sim.config.wishBubbles===false||!!sim.ending;
  if(wish){$('wish-speaker').textContent=wish.speaker;$('wish-text').textContent=wish.text;}
}
function renderWishes(){
  const state=ensureWishes(sim),wish=state.active;
  $('wish-bubbles').checked=sim.config.wishBubbles!==false;
  const heading=document.createElement('strong'),line=document.createElement('p');
  heading.textContent=wish?wish.speaker:'Voorlopig geen wensen';line.textContent=wish?`“${wish.text}” · jaar ${wish.issuedAt}–${wish.deadline}`:'De inwoners gaan rustig hun gang. Af en toe vraagt iemand iets.';
  $('wish-current').replaceChildren(heading,line);$('wish-find').hidden=!wish;
  $('wish-help').hidden=!canHelpWish(sim,wish);$('wish-help').textContent=wish?`Help ${wish.speaker.split(' ')[0]}`:'Help deze inwoner';
  $('wish-history').replaceChildren(...state.history.slice().reverse().map(w=>{const item=document.createElement('li'),name=document.createElement('strong'),text=document.createElement('p');name.textContent=`${WISH_OUTCOMES[w.status]} · jaar ${w.closedAt}`;text.textContent=`${w.speaker}: “${w.text}”`;item.append(name,text);return item;}));
}
const bookPages=['journal','family','wishes','challenges','collection'];
let bookPage='journal';
function renderBookPage(name){
  if(name==='journal')renderJournal();
  else if(name==='family')renderFamily();
  else if(name==='wishes')renderWishes();
  else if(name==='challenges'){ensureChallenges(sim).revealed=true;renderChallenges();}
  else renderCollection();
}
// One book instead of five windows: every page pauses the island the same way.
function openBook(name=bookPage){
  bookPage=bookPages.includes(name)?name:'journal';
  for(const page of bookPages){const selected=page===bookPage,tab=$(`book-tab-${page}`);$(`book-${page}`).hidden=!selected;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  renderBookPage(bookPage);
  if(!$('book-dialog').open)$('book-dialog').showModal();
  if(bookPage==='family')$('family-generations').scrollTop=$('family-generations').scrollHeight;
  if(bookPage==='challenges')save();
  updatePause();
}
function openWishes(){openBook('wishes');}
function updateAwayReport(){
  const report=sim.awayReport;$('away-summary').hidden=!report||report.dismissed;
  if(!report||report.dismissed)return;
  $('away-heading').textContent=report.focused?'Het grootste moment':'Terwijl je weg was…';$('away-show').hidden=!!report.focused;
  $('away-text').textContent=report.focused?nl(report.biggest.text):report.summary;$('away-range').textContent=report.focused?`Jaar ${report.biggest.year}`:`Jaar ${report.from}–${report.to}${report.limited?' · maximaal drie eeuwen bijgewerkt':''}`;
}
function updateUI(){
  updateAwayReport();
  syncCollection();
  updateWishBubble();
  $('year').textContent=sim.year;
  $('era-name').textContent=nl(sim.age.name).toUpperCase();
  const nextAge=AGES.find(age=>age.year>sim.year);
  $('age-next').textContent=nextAge?`Volgend tijdperk · jaar ${nextAge.year}`:"De toekomst krijgt vorm";
  $('chapter-status').textContent=sim.sandbox?"Vrij spelen · het verhaal is klaar":sim.ending?nl(sim.outcome.title):sim.endgameStarted?`Laatste tijdperk · ${['het overleg','het laatste project','de erfenis'][Math.max(0,sim.endgamePhase)]} · klaar uiterlijk ${sim.finaleDeadline}`:`Laatste tijdperk rond ${sim.endgameYear}`;
  $('chapter-status').classList.toggle('final-age',sim.endgameStarted);
  $('geography-label').textContent=nl(sim.geography?.name||"Het oorspronkelijke eiland").toUpperCase();
  $('population').textContent=Math.floor(sim.population).toLocaleString();
  if(!shownRemark || /^Six people\./.test(shownRemark)&&Math.floor(sim.population)!==6 || performance.now()-lastRemarkAt>=6500){shownRemark=sim.populationNote;lastRemarkAt=performance.now();$('population-note').textContent=nl(shownRemark);}
  $('happiness').textContent=nl(sim.happiness);
  $('interference-count').textContent=sim.interferences;
  $('land-area').textContent=sim.land.length;
  $('start-size').textContent=sim.geographyVersion<3?'Bewaard eiland · Nieuw groot eiland geeft meer ruimte':`${sim.originalArea} natuurlijke landtegels · de ruimte is er al`;
  updateCinemaUI();
  $('land-added').textContent=sim.reclaimed.length?`+${sim.reclaimed.length} geleend van de zee`:"voorlopig allemaal natuurlijk";
  $('food').textContent=Math.floor(sim.food).toLocaleString();
  $('wood').textContent=Math.floor(sim.wood).toLocaleString();
  $('prosperity').textContent=Math.floor(sim.prosperity);
  $('water-status').textContent=`Zoetwater · ${Math.round(sim.freshwater)}%`;
  $('environment-status').textContent=`Levend landschap · ${Math.round(sim.environment)}% · vervuiling ${Math.round(sim.pollution)}%`;
  $('legacy-status').textContent=sim.interferences?`${sim.influence.rain} regenbuien · ${sim.influence.nudge+sim.influence.rescues} keer hulp · ${sim.influence.rumble} bevingen · ${sim.influence.fire} vuren · ${Math.round(sim.influence.dependence)}% afhankelijkheid`:"Een zelfstandige beschaving · geen hulp van buitenaf";
  $('council-status').textContent=sim.civicProject?`${nl(sim.civicProject.title)} · ${{debate:"overleg",building:"bouw"}[sim.civicProject.phase]||"uitvoering"}`:`Voedsel ${sim.balance.food>=0?'+':''}${sim.balance.food.toFixed(1)} / jaar · publieke kosten ${sim.balance.expenses.toFixed(1)}`;
  $('open-ending').hidden=!sim.outcome;
  updateSnapshotOptions();
  $('energy-source').textContent=sim.power>0?`ϟ ${nl(sim.energySource)} · ${Math.round(sim.power)} opgewekt / ${Math.ceil(sim.powerDemand)} gebruikt`:nl(sim.energySource);
  const sites=sim.land.filter(t=>t.buildSite);
  $('civic-life').textContent=sim.protestUntil>sim.year?"Een protest op het plein.":sites.length?`${sites.length} bouwplaats${sites.length===1?'':'en'} · ${sim.carCount?`${sim.carCount} auto’s op de weg`:"hun ambities achterna"}`:nl(sim.temperament.name)||"Een huisje en een kleine akker.";
  const parks=sim.buildings.filter(t=>t.building==='park').length;
  const shops=sim.buildings.filter(t=>['shop','bakery','cafe'].includes(t.building)).length;
  const fun=sim.buildings.filter(t=>['playground','fairground'].includes(t.building)).length;
  $('places-status').textContent=[parks?`${parks} park${parks===1?'':'en'}`:'',sim.beaches.length?'Strand':'',sim.forests.length?'Bos':'',shops?`${shops} winkel${shops===1?'':'s'}`:'',fun?'Vermaak':''].filter(Boolean).join(' · ');
  const facilities=['farm','factory','school','science-center'].map(type=>({type,count:sim.buildings.filter(t=>t.building===type).length}));
  const names={farm:'akkers',factory:'fabrieken',school:'scholen','science-center':"wetenschapscentra"};
  $('district-status').textContent=facilities.filter(f=>f.count).map(f=>`${f.count} ${names[f.type]}`).join(' · ');
  $('mobility-status').textContent=sim.carCount||sim.bikeCount?`${sim.carCount} auto’s · ${sim.bikeCount} fietsen`:"Te voet over het eiland";
  const moods=["Een behoorlijk rustig begin","Een klein dorp. Een paar grote ideeën.","De kustlijn staat ter discussie","Een kleine wereld met heel grote plannen","Aardrijkskunde is meer een suggestie"];
  $('island-mood').textContent=sim.ending?nl(sim.outcome.consequence):sim.volcanoActiveUntil>sim.year?"De vulkaan heeft een mening":sim.storm?"De oceaan heeft iets te melden":sim.endgameStarted?"Het eiland maakt zijn laatste grote plannen":moods[sim.era];
  $('weather').querySelector('span').textContent=sim.storm?"Hoogwater. Bezorgde commissies.":sim.pumpBroken?"Een pomp neemt onverwacht vrij.":sim.era>=3?"Stijgende zee. Optimistische ingenieurs.":"Kalme zee. Kleine ambities.";
  const p=sim.project;$('project-overlay').hidden=!p||sim.ending||cinemaActive();
  if(sim.ending)$('moment-card').hidden=true;
  if(p&&!sim.ending){
    const percent=Math.floor((p.stage+p.elapsed/(PROJECT_STAGES[p.stage].duration*(p.manual&&p.stage===2?1.7:1)))/5*100);
    $('project-name').textContent=p.isArtificial?"Een eigen eiland":p.manual?"Een beetje meer ruimte":"Onderhandelen met de zee";
    $('project-stage').textContent=sim.storm?"Wachten op rustiger water":sim.pumpBroken&&p.stage===2&&!p.manual?"De pomp herstellen":p.manual&&p.stage===2?"Met de hand droogmaken. Langzaam.":nl(PROJECT_STAGES[p.stage].name);
    $('project-percent').textContent=`${percent}%`;$('project-progress').style.width=`${percent}%`;
  }
  $('instruction').style.opacity=sim.year>90?'.5':'1';
  if(sim.ending && !sim.endingSeen&&!cinemaActive()){sim.endingSeen=true;renderEnding();save();$('ending-dialog').showModal();updatePause();}
  updateHistory();
  updateClock();
}
function momentTarget(entry){
  if(Number.isFinite(entry.x)&&Number.isFinite(entry.y))return sim.tile(entry.x,entry.y);
  if(entry.type==='palace')return sim.tile(-1,1);
  return sim.tile(0,1);
}
function focusPlace(tile){if(!tile)return;renderer.focusTile(tile);inspectTile(tile);}
function queueMoments(entries){
  if(sim.config.storyCards!==true)return;
  for(const entry of entries){if((entry.priority||eventPriority(entry.type))<76||seenMoments.has(entry.id))continue;seenMoments.add(entry.id);momentQueue.push(entry);}
  momentQueue.sort((a,b)=>(b.priority||eventPriority(b.type))-(a.priority||eventPriority(a.type))||a.year-b.year);
  if(momentQueue.length>40)momentQueue.length=40;
}
function presentMoment(now){
  if(sim.config.storyCards!==true||!momentQueue.length||now-momentAt<8500||sim.ending||cinemaActive()||otherDialogOpen())return;
  activeMoment=momentQueue.shift();momentAt=now;
  const priority=activeMoment.priority||eventPriority(activeMoment.type);
  $('moment-card').hidden=false;$('moment-year').textContent=`JAAR ${activeMoment.year} · ${priority>=90?"EEN KEERPUNT":"EILANDGESCHIEDENIS"}`;
  $('moment-title').textContent=({palace:"Het eerste huis heeft toekomst",age:nl(sim.age.name),endgame:"Het laatste hoofdstuk van het eiland",flood:"De waterkant heeft hulp nodig",reform:"Een discussie wordt een plek",legacy:"Ze herinneren zich jouw bezoek",technology:"Een nieuwe manier van leven",interference:"Jouw hand in hun geschiedenis",crisis:"Een waarschuwing van de zee"})[activeMoment.type]||"Een beetje geschiedenis";
  $('moment-text').textContent=nl(activeMoment.text);
  updateClock();
}
function updateSnapshotOptions(){
  const signature=sim.snapshots.map(s=>s.year+':'+s.label).join('|');if(signature===snapshotSignature)return;snapshotSignature=signature;
  const select=$('history-snapshot'),value=select.value;
  select.replaceChildren(...sim.snapshots.map((snapshot,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`${snapshot.year} · ${nl(snapshot.label)}`;return option;}));
  select.value=value&&sim.snapshots[Number(value)]?value:'0';renderer.historySnapshot=sim.snapshots[Number(select.value)];
}
function miniMap(land){
  return '<rect width="250" height="250" fill="#dbe7da"/>'+land.map(id=>{const [x,y]=id.split(',').map(Number);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>12||Math.abs(y)>12)return'';return `<rect x="${(x+12)*10}" y="${(y+12)*10}" width="10" height="10" fill="#a8ba85"/>`;}).join('')+'<circle cx="125" cy="125" r="4" fill="#546f43"/>';
}
function renderEnding(){
  const o=Object.fromEntries(Object.entries(sim.outcome||ENDINGS.independent).map(([key,value])=>[key,typeof value==='string'?nl(value):value]));
  $('ending-title').textContent=o.title;$('ending-quote').textContent='“'+o.quote+'”';$('ending-description').textContent=o.description;$('ending-consequence').textContent=o.consequence;$('ending-detail').textContent=o.detail;
  $('ending-stats').textContent=`Jaar ${o.year||sim.year} · ${Math.round(o.population??sim.population).toLocaleString("nl-NL")} inwoners · ${o.land??sim.land.length} landtegels · ${o.interferences??sim.interferences} ingrepen`;
  const first=sim.snapshots[0];$('ending-before').innerHTML=miniMap(first?.land||[]);$('ending-after').innerHTML=miniMap(o.coast||sim.land.map(t=>`${t.x},${t.y}`));
  const influence=o.influence||sim.influence;
  $('ending-causes').textContent=(o.interferences??sim.interferences)?`Jouw invloed: ${influence.rain} regenbuien, ${influence.nudge+influence.rescues} keer hulp, ${influence.rumble} bevingen. ${Math.round(influence.dependence)}% afhankelijkheid; ${influence.fear} angst. ${nl(o.lastConsequence||sim.interventionLedger.at(-1)?.consequence||'')}.`:"Jij keek toe. Zij namen hun eigen beslissingen. De wegen, ruzies en prestaties zijn van hen.";
  $('ending-chronicle').replaceChildren(...(o.chronicle||sim.history.filter(e=>['palace','reform','flood','endgame','legacy'].includes(e.type)).slice(-5)).map(historyItem));
  const score=o.scores||islandScores(sim);$('ending-score').textContent=`${score.total} / 100`;
  $('score-breakdown').replaceChildren(...Object.entries(score.values).map(([name,value])=>{const item=document.createElement('div');item.className='score-row';const label=document.createElement('span'),number=document.createElement('strong'),bar=document.createElement('progress');label.textContent=name;number.textContent=value;bar.max=100;bar.value=value;bar.setAttribute('aria-label',`${name}: ${value} van 100`);item.append(label,bar,number);return item;}));
}
function cinemaActive(){return !!sim.cinematic&&!sim.cinematic.completed;}
function updateCinemaUI(){
  const active=cinemaActive();$('cinema-caption').hidden=!active;$('island-window').classList.toggle('cinema-playing',active);
  if(active&&!$('cinema-dialog').open&&!otherDialogOpen())$('cinema-dialog').showModal();
  if(!active)return;const beat=cinemaBeat(sim.cinematic);
  $('cinema-title').textContent=nl(beat.title);$('cinema-line').textContent=nl(beat.caption);
  $('cinema-skip').hidden=sim.cinematic.elapsed<8;
  $('cinema-progress').value=beat.progress*100;
  $('cinema-pause').textContent=paused?'Verder afspelen':'Pauze';
  $('cinema-cheer').textContent=sim.cinematic.cheers?`Nog een applaus! · ${sim.cinematic.cheers}`:'Vier mee met de bewoners';
}
function completeCinema(){
  sim.cinematic.elapsed=sim.cinematic.duration;sim.cinematic.completed=true;sim.endingSeen=true;beatHoldUntil=0;momentQueue=[];$('cinema-dialog').close();renderEnding();$('ending-dialog').showModal();updateUI();updatePause();save();
}
function dismissCinema(){
  if(sim.cinematic){sim.cinematic.elapsed=sim.cinematic.duration;sim.cinematic.completed=true;}
  sim.endingSeen=true;$('cinema-dialog').close();dismissStory();updateUI();updatePause();save();
}
function finishIntro(){
  try{localStorage.setItem(introKey,'done');}catch{}
  speed=1;sim.config.speedMultiplier=1;paused=false;accumulator=0;lastTime=performance.now();
  for(const button of document.querySelectorAll('[data-speed]')){const selected=Number(button.dataset.speed)===1;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
  $('intro-dialog').close();updateCinemaUI();updatePause();save();
}
function cheerCinema(){if(!cinemaActive())return;sim.cinematic.cheers++;updateCinemaUI();}
function frame(now){
  const dt=Math.min(.15,(now-lastTime)/1000);lastTime=now;
  const modal=otherDialogOpen();
  if(!paused && !modal && !document.hidden && !sim.ending && !cinemaActive() && now>=beatHoldUntil){
    accumulator+=dt*speed;
    let updates=0;
    while(accumulator>=sim.yearDuration && updates<12 && !sim.ending){const duration=sim.yearDuration;sim.tick();accumulator-=duration;updates++;}
    if(updates){
      if(sim.events.length){dirtyHistory=true;queueMoments(sim.events);sim.events=[];}
      updateUI();
    }
  }
  if(cinemaActive()&&!paused&&!modal&&!document.hidden){if(advanceCinema(sim,dt))completeCinema();else updateCinemaUI();}
  if(sim.signals.length){const ordered=sim.signals.slice().sort((a,b)=>(b.priority||0)-(a.priority||0));for(const signal of ordered.slice(0,8))renderer.addEffect(signal);sim.signals=[];}
  presentMoment(now);
  if(!document.hidden)saveTimer+=dt;if(saveTimer>=10){saveTimer=0;save();}
  renderer.paused=paused||modal||sim.ending||now<beatHoldUntil;renderer.draw(now);
  if(cinemaActive()){
    const stage=$('finale-canvas'),box=stage.getBoundingClientRect(),w=Math.max(300,Math.round(box.width)),h=Math.max(200,Math.round(box.height));
    if(stage.width!==w||stage.height!==h){stage.width=w;stage.height=h;}
    drawFinale(stage.getContext('2d'),w,h,sim,sim.cinematic,renderer.reduced);
  }
  requestAnimationFrame(frame);
}

$('pause').addEventListener('click',togglePause);
for(const button of document.querySelectorAll('[data-speed]')) button.addEventListener('click',()=>{
  speed=Number(button.dataset.speed);
  sim.config.speedMultiplier=speed;
  for(const b of document.querySelectorAll('[data-speed]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}
  if(paused)paused=false;
  updatePause();
  save();
});
for(const button of document.querySelectorAll('[data-speed]')){const selected=Number(button.dataset.speed)===speed;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
$('zoom-in').addEventListener('click',()=>renderer.setZoom(1.18));
$('zoom-out').addEventListener('click',()=>renderer.setZoom(1/1.18));
$('recenter').addEventListener('click',()=>renderer.recenter());
$('help').addEventListener('click',()=>$('guide-dialog').showModal());
$('settings').addEventListener('click',()=>{$('restart-confirm').hidden=true;$('restart').hidden=false;$('settings-dialog').showModal();});
$('open-journal').addEventListener('click',()=>openBook('journal'));
$('away-dismiss').addEventListener('click',()=>{if(sim.awayReport)sim.awayReport.dismissed=true;updateAwayReport();save();});
$('away-show').addEventListener('click',()=>{
  const report=sim.awayReport;if(!report)return;
  if(report.biggest.type==='ending'){report.dismissed=true;renderEnding();$('ending-dialog').showModal();updatePause();}
  else{report.focused=true;chooseMode('help');inspectionPinned=true;focusPlace(momentTarget(report.biggest));}
  updateAwayReport();
  save();
});
$('offline-life').addEventListener('change',event=>{sim.config.offlineProgress=event.target.checked;save();});
bookPages.forEach((page,index)=>{
  const tab=$(`book-tab-${page}`);tab.addEventListener('click',()=>openBook(page));
  tab.addEventListener('keydown',e=>{
    const step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!step)return;e.preventDefault();
    const next=bookPages[(index+step+bookPages.length)%bookPages.length];openBook(next);$(`book-tab-${next}`).focus?.();
  });
});
$('book-close').addEventListener('click',()=>$('book-dialog').close());
$('wish-open').addEventListener('click',openWishes);
$('wish-dismiss').addEventListener('click',()=>{dismissWish(sim);updateWishBubble();save();});
$('wish-bubbles').addEventListener('change',event=>{sim.config.wishBubbles=event.target.checked;updateWishBubble();save();});
$('wish-find').addEventListener('click',()=>{const wish=ensureWishes(sim).active;if(!wish)return;$('book-dialog').close();chooseMode('help');focusPlace(sim.tile(wish.x,wish.y));});
$('family-oldest').addEventListener('click',()=>$('family-generations').scrollTop=0);
$('family-latest').addEventListener('click',()=>$('family-generations').scrollTop=$('family-generations').scrollHeight);
$('family-find-home').addEventListener('click',()=>{$('book-dialog').close();chooseMode('help');inspectionPinned=true;focusPlace(sim.tile(-1,1));});
$('canvas-journal').addEventListener('click',()=>openBook());
$('inspector-close').addEventListener('click',()=>{inspectionPinned=false;$('tile-inspector').hidden=true;});
$('cinema-cheer').addEventListener('click',cheerCinema);
$('cinema-pause').addEventListener('click',()=>{togglePause();updateCinemaUI();});
$('cinema-dialog').addEventListener('cancel',e=>{e.preventDefault();dismissCinema();});
$('cinema-close').addEventListener('click',dismissCinema);
$('ending-close').addEventListener('click',()=>$('ending-dialog').close());
$('intro-dialog').addEventListener('cancel',e=>{e.preventDefault();finishIntro();});
$('intro-close').addEventListener('click',finishIntro);
$('intro-back').addEventListener('click',()=>{introStep=Math.max(0,introStep-1);updateIntro();});
$('intro-next').addEventListener('click',()=>{if(introStep<2){introStep++;updateIntro();return;}finishIntro();});
$('cinema-skip').addEventListener('click',completeCinema);
$('ending-replay').addEventListener('click',()=>{$('ending-dialog').close();startCinema(sim,sim.outcome.id,true);paused=false;renderer.focus=null;renderer.recenter();updateCinemaUI();updatePause();save();});
$('find-beach').addEventListener('click',()=>focusPlace(sim.beaches[Math.floor(sim.beaches.length/2)]));
$('find-fun').addEventListener('click',()=>focusPlace(sim.buildings.find(t=>t.building==='fairground')||sim.buildings.find(t=>t.building==='festival-ground')||sim.buildings.find(t=>t.building==='bonfire')));
$('ending-continue').addEventListener('click',()=>$('ending-dialog').close());
$('ending-sandbox').addEventListener('click',()=>{resumeSandbox(sim);beatHoldUntil=0;momentQueue=[];$('ending-dialog').close();updateUI();updatePause();save();});
$('ending-new').addEventListener('click',()=>newIsland());
$('open-ending').addEventListener('click',()=>{renderEnding();$('ending-dialog').showModal();});
$('find-palace').addEventListener('click',()=>focusPlace(sim.tile(-1,1)));
$('find-knowledge').addEventListener('click',()=>focusPlace(sim.buildings.find(t=>['science-center','library','school'].includes(t.building))||sim.freeLand.find(t=>t.district==='knowledge')));
$('find-fields').addEventListener('click',()=>focusPlace(sim.farms[0]));
$('history-layer').addEventListener('change',e=>{renderer.showHistory=e.target.checked;$('history-snapshot').hidden=!e.target.checked;$('history-legend').hidden=!e.target.checked;});
$('history-snapshot').addEventListener('change',e=>{renderer.historySnapshot=sim.snapshots[Number(e.target.value)]||null;});
$('moment-focus').addEventListener('click',()=>{if(activeMoment)focusPlace(momentTarget(activeMoment));});
$('moment-continue').addEventListener('click',dismissStory);
$('moment-close').addEventListener('click',dismissStory);
$('intervention-close').addEventListener('click',()=>{clearTimeout(interventionTimer);$('intervention-result').hidden=true;});
$('toast-close').addEventListener('click',()=>{clearTimeout(toastTimer);$('toast').classList.remove('visible');});
for(const button of document.querySelectorAll('[data-close]')) button.addEventListener('click',()=>button.closest('dialog').close());
for(const dialog of document.querySelectorAll('dialog')) {dialog.addEventListener('close',()=>{accumulator=0;lastTime=performance.now();updatePause();});dialog.addEventListener('click',e=>{if(e.target!==dialog || ['ending-dialog','intro-dialog','cinema-dialog'].includes(dialog.id))return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});}
$('expansion-limit').addEventListener('change',e=>{
  const occupied=sim.land.length+(sim.project?.tiles.length||0)+sim.reclaimed.filter(t=>t.kind==='flooded').length;
  const requested=Number(e.target.value);
  if(requested<occupied){e.target.value=String(sim.config.maxTiles);$('save-status').textContent="Het eiland is al groter dan die grens. De huidige kust heeft meer ruimte nodig.";return;}
  sim.config.maxTiles=requested;save();showToast("Een nieuwe grens aan hun ambities. Er is niet met hen overlegd.");
});
$('rare-endings').addEventListener('change',e=>{sim.config.rareEndings=e.target.checked;save();});
$('accelerating').addEventListener('change',e=>{sim.config.accelerating=e.target.checked;accumulator=0;updateClock();save();});
$('story-cards').addEventListener('change',e=>{sim.config.storyCards=e.target.checked;if(!e.target.checked){dismissStory();$('intervention-result').hidden=true;}save();});
$('reduce-motion').addEventListener('change',e=>{renderer.reduced=e.target.checked;});
$('restart').addEventListener('click',()=>{$('restart-confirm').hidden=false;$('restart').hidden=true;});
$('cancel-restart').addEventListener('click',()=>{$('restart-confirm').hidden=true;$('restart').hidden=false;});
function switchIsland(next,message){
  syncCollection();persistCollection();
  sim=next;renderer.sim=sim;renderer.effects=[];renderer.ripples=[];renderer.visibleTiles=[];renderer.hover=null;renderer.center={x:0,y:0};renderer.zoom=1;renderer.activityTime=0;renderer.wheelTime=0;renderer.recenter();
  sim.config.speedMultiplier=speed;
  $('story-cards').checked=sim.config.storyCards===true;$('offline-life').checked=sim.config.offlineProgress!==false;
  accumulator=0;paused=false;dirtyHistory=true;shownRemark='';drag=null;momentQueue=[];seenMoments=new Set();activeMoment=null;beatHoldUntil=0;momentAt=-Infinity;snapshotSignature='';renderer.showHistory=false;renderer.historySnapshot=null;$('history-layer').checked=false;$('history-snapshot').hidden=true;$('history-legend').hidden=true;$('moment-card').hidden=true;
  clearTimeout(interventionTimer);$('intervention-result').hidden=true;$('tile-inspector').hidden=true;inspectionPinned=false;
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  save();updatePause();updateUI();showToast(message);
}
function newIsland(){
  previousIsland=sim.serialize();
  let seed;
  try{seed=crypto.getRandomValues(new Uint32Array(1))[0];}catch{seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;}
  if(!seed||seed===sim.seed)seed=(sim.seed+1)>>>0||1;
  switchIsland(new Civilization(seed,{...sim.config,maxTiles:sim.terrainVersion>=2?sim.config.maxTiles:sim.config.maxTiles>=600?625:480}), "Een nieuwe kust. Nieuwe bergen. De bewoners weten van niets.");
  $('undo-reset').hidden=false;clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>{previousIsland=null;$('undo-reset').hidden=true;},10000);
}
$('new-island').addEventListener('click',newIsland);
$('confirm-restart').addEventListener('click',newIsland);
$('undo-reset').addEventListener('click',()=>{
  const previous=previousIsland&&Civilization.restore(previousIsland);if(!previous)return;
  clearTimeout(undoTimer);previousIsland=null;$('undo-reset').hidden=true;switchIsland(previous,"Je vorige eiland is terug. Niemand heeft de omweg gemerkt.");
});
const modeHints={help:'Klik op een inwoner met een hartje of open Wensen. Kies zelf of je helpt.',nudge:'Klik op een huis: een aanbouw. Op een veld: irrigatie. Op lege grond: bouwers.',rain:'Klik: regen, natte grond en betere oogst. Op een brand: meteen blussen.',rumble:'Klik: de grond scheurt en huizen raken beschadigd. De inwoners reageren.',fire:'Klik op lege grond: een kampvuur. Op een gebouw: brand en een blusploeg.'};
function chooseMode(mode){
  interferenceMode=mode;renderer.mode=interferenceMode;inspectionPinned=false;
  for(const b of document.querySelectorAll('[data-interference]')){const selected=b.dataset.interference===mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));}
  $('interaction-hint').textContent=modeHints[interferenceMode];canvas.dataset.mode=interferenceMode;
}
for(const button of document.querySelectorAll('[data-interference]'))button.addEventListener('click',()=>chooseMode(button.dataset.interference));
function inspectTile(tile){
  const panel=$('tile-inspector');panel.hidden=!tile;
  if(tile)panel.textContent=interferenceMode==='help'?describePlot(sim,tile):describePlot(sim,tile).split('\n')[0];
}
function showIntervention(x,y){
  const result=sim.lastIntervention;
  renderer.addEffect({...result,priority:100});beatHoldUntil=0;accumulator=0;
  $('intervention-result').hidden=sim.config.storyCards!==true;$('intervention-result').dataset.type=result.type;
  $('intervention-title').textContent=nl(result.title);$('intervention-detail').textContent=nl(result.detail);
  if(sim.config.storyCards!==true)showToast(result.title,2400);
  clearTimeout(interventionTimer);interventionTimer=setTimeout(()=>$('intervention-result').hidden=true,3000);
  renderer.ripple(x,y);dirtyHistory=true;updateUI();save();
}
$('wish-help').addEventListener('click',()=>{
  const wish=ensureWishes(sim).active;
  if(!helpActiveWish(sim,wish?.id)){renderWishes();showToast('Deze wens is veranderd. Er is geen ingreep gedaan.');return;}
  $('book-dialog').close();const point=renderer.point(wish.x,wish.y);showIntervention(point.x,point.y);
});
let drag=null;
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect();renderer.hover=renderer.pick(e.clientX-r.left,e.clientY-r.top);
  if(!inspectionPinned)inspectTile(sim.tile(renderer.hover.x,renderer.hover.y));
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7)drag.moved=true;
  if(drag.moved){renderer.focus=null;renderer.pan.x=Math.max(-renderer.width*.65,Math.min(renderer.width*.65,renderer.pan.x+dx));renderer.pan.y=Math.max(-renderer.height*.65,Math.min(renderer.height*.65,renderer.pan.y+dy));}
  drag.x=e.clientX;drag.y=e.clientY;
});
canvas.addEventListener('pointerup',e=>{
  if(drag && !drag.moved){
    const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const tile=renderer.pick(x,y);
    if(cinemaActive()){cheerCinema();renderer.ripple(x,y);drag=null;return;}
    if(interferenceMode==='help'){const wish=ensureWishes(sim).active;if(wish&&(renderer.pickWishResident(x,y)||tile.x===wish.x&&tile.y===wish.y))openWishes();else{inspectionPinned=true;inspectTile(sim.tile(tile.x,tile.y));}drag=null;return;}
    if(sim.ending){showToast("Hun verhaal is klaar. Open het naschrift om vrij verder te spelen.");drag=null;return;}
    sim.interfere(tile.x,tile.y,interferenceMode);
    showIntervention(x,y);
    inspectTile(sim.tile(tile.x,tile.y));
  }
  drag=null;
});
canvas.addEventListener('pointercancel',()=>{drag=null;});
canvas.addEventListener('pointerleave',()=>{renderer.hover=null;if(!inspectionPinned)$('tile-inspector').hidden=true;});
canvas.addEventListener('wheel',e=>{e.preventDefault();renderer.setZoom(e.deltaY<0?1.065:1/1.065);},{passive:false});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,button') || otherDialogOpen())return;
  if(e.code==='Space'){e.preventDefault();togglePause();}
  if(e.key==='+'||e.key==='=')renderer.setZoom(1.15);
  if(e.key==='-')renderer.setZoom(1/1.15);
  if(document.activeElement===canvas){
    if(e.key==='ArrowLeft'){e.preventDefault();renderer.pan.x+=20;}
    if(e.key==='ArrowRight'){e.preventDefault();renderer.pan.x-=20;}
    if(e.key==='ArrowUp'){e.preventDefault();renderer.pan.y+=20;}
    if(e.key==='ArrowDown'){e.preventDefault();renderer.pan.y-=20;}
  }
});

async function toggleAudio(){
  try{
    if(!audio){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('unavailable');
      audio=new Audio();
      const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),data=buffer.getChannelData(0);
      let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(.02*(Math.random()*2-1)))/1.02;data[i]=brown*3.5;}
      const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;
      const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;
      const gain=audio.createGain();gain.gain.value=.16;
      source.connect(filter).connect(gain).connect(audio.destination);source.start();audioNodes.push(source,gain,filter);
      const lfo=audio.createOscillator(),lfoGain=audio.createGain();lfo.frequency.value=.13;lfoGain.gain.value=.055;lfo.connect(lfoGain).connect(gain.gain);lfo.start();audioNodes.push(lfo,lfoGain);
    }
    if(audioEnabled){await audio.suspend();audioEnabled=false;}else{await audio.resume();audioEnabled=true;}
    $('sound').classList.toggle('enabled',audioEnabled);$('sound').setAttribute('aria-label',audioEnabled?"Zet het zeegeluid uit":"Zet het zeegeluid aan");
  }catch{showToast("De oceaan houdt zich stil. Geluid werkt niet in deze browser.");}
}
$('sound').addEventListener('click',toggleAudio);
document.addEventListener('visibilitychange',()=>{
  accumulator=0;lastTime=performance.now();
  if(document.hidden){save();if(audio?.state==='running')audio.suspend();}
  else{if(returnFromAway(sim)){dirtyHistory=true;momentQueue=[];renderer.effects=[];updateUI();}save();if(audioEnabled)audio?.resume();}
});
window.addEventListener('pagehide',save);
let firstVisit=true;try{firstVisit=localStorage.getItem(introKey)!=='done';}catch{}
if(firstVisit)showIntro();
updateUI();updatePause();save();
if(!storageAvailable)$('save-status').textContent="Opslaan lukt hier niet. Je kunt dit bezoek wel gewoon verder spelen.";
requestAnimationFrame(frame);

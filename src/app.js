import {nl} from './language.js';
import { advanceCinema, startCinema, cinemaBeat } from './spectacle.js';
import { eventPriority, resumeSandbox, ENDINGS } from './story.js';
import { Civilization, ERAS, PROJECT_STAGES, AGES } from './simulation.js';
import { IslandRenderer } from './renderer.js';
import {describePlot} from './inspection.js';
import {islandScores,explainScore,SCORE_RECIPE,currentScores} from './finale.js';
import {drawCredits,creditsFor} from './credits.js';
import {ensureFamily,currentRelative,familyLore,sentenceCase} from './family.js';
import {tourStops} from './tour.js';
import {museumExhibits} from './museum.js';
import {ALBUM_STORAGE_KEY,readAlbum,albumMoment,albumCaption,addPhoto,snapshot} from './album.js';
import {Soundscape} from './sound.js';
import {islandIdentity,flagSVG} from './identity.js';
import {makePostcard,makeEndCard,downloadCanvas} from './postcard.js';
import {DAY_SECONDS} from './daylight.js';
import {feelings} from './feel.js';
import {WEATHER,weatherActive} from './weather.js';
import {COMMISSIONS,ensureCommissions,placeCommission,canCommission} from './commissions.js';
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
// 3.7: a shared link with ?seed= opens that same island; the previous one can be restored for ten seconds.
let sharedFrom=null;
try{const shared=Number(new URLSearchParams(location.search).get('seed'));if(Number.isInteger(shared)&&shared>0&&shared<=0xffffffff&&shared!==sim.seed){sharedFrom=sim.serialize();sim=new Civilization(shared,{...sim.config});}}catch{}
returnFromAway(sim);
let collection=readCollection(null),collectionStorageAvailable=true;
try{collection=readCollection(localStorage.getItem(COLLECTION_STORAGE_KEY));}catch{collectionStorageAvailable=false;}
const canvas=$('island');
let album={seed:sim.seed,photos:[]},albumBusy=false;try{album=readAlbum(localStorage.getItem(ALBUM_STORAGE_KEY),sim.seed);}catch{}
const renderer=new IslandRenderer(canvas,sim);renderer.mode='nudge';canvas.dataset.mode='nudge';
let paused=false,speed=[1,2,3,10].includes(sim.config.speedMultiplier)?sim.config.speedMultiplier:1,accumulator=0,lastTime=performance.now(),saveTimer=0,toastTimer,dirtyHistory=true;
let soundscape=null,soundAt=0;
let interferenceMode='nudge',interventionTimer,lastRemarkAt=0,shownRemark='';
let previousIsland=null,undoTimer;
let introStep=0,inspectionPinned=false,nightShown=false,drawTick=0;
const introKey='do-nothing-island-intro-v1';
// One short greeting; the rest is explained the first time you meet it.
const introScreens=[['Dit is jouw eiland.','Eén huisje, een akker en een handvol mensen. Je hoeft niets te doen: kijk maar wat ze ervan maken.']];
function otherDialogOpen(){return [...document.querySelectorAll('dialog[open]')].some(d=>d!==$('cinema-dialog'));}
function updateIntro(){const [title,line]=introScreens[introStep];$('intro-title').textContent=title;$('intro-line').textContent=line;$('intro-step').textContent='';$('intro-next').textContent='Bekijk mijn eiland →';$('intro-back').hidden=true;}
function showIntro(){introStep=0;updateIntro();$('intro-dialog').showModal();accumulator=0;}
let momentQueue=[],seenMoments=new Set(),momentAt=-Infinity,activeMoment=null,beatHoldUntil=0,snapshotSignature='';
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)'),reducedPref=typeof sim.config.reducedMotion==='boolean'?sim.config.reducedMotion:motionQuery.matches;
renderer.reduced=reducedPref;
$('reduce-motion').checked=reducedPref;
motionQuery.addEventListener?.('change',e=>{if(typeof sim.config.reducedMotion==='boolean')return;renderer.reduced=e.matches;$('reduce-motion').checked=e.matches;});
$('expansion-limit').value=String(sim.config.maxTiles);
$('rare-endings').checked=sim.config.rareEndings;
$('accelerating').checked=sim.config.accelerating;
$('story-cards').checked=sim.config.storyCards===true;
$('offline-life').checked=sim.config.offlineProgress!==false;
$('day-night').checked=sim.config.dayNight!==false;renderer.dayNight=sim.config.dayNight!==false;

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
  const silhouettes={endings:'M3 17 Q3 11 7 12 L10 5 14 11 Q21 10 21 17 Z',moments:'M3 20 V10 L12 3 21 10 V20 Z',challenges:'M8 2 H16 V9 L12 14 8 9 Z M12 12 L17 21 12 18 7 21 Z',secrets:'M12 2 L15 8 22 12 15 16 12 22 9 16 2 12 9 8 Z',treasures:'M3 10 H21 V20 H3 Z M3 10 Q12 2 21 10 M10 13 H14 V16 H10 Z'};
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
  renderer.daySpeed=speed;renderer.activityRate=cinemaActive()?1:rate*.68;renderer.paused=paused||modal||!cinemaActive()&&(sim.ending||held);
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
function renderMuseum(){
  const open=sim.buildings.some(t=>t.building==='museum'),items=museumExhibits(sim);
  $('museum-note').textContent=open?`${items.length} stukken in de vitrines. De suppoost kent ze allemaal uit het hoofd.`:'Er is nog geen museum. Rond het jaar 900 bouwt het eiland er vanzelf een; tot die tijd liggen de stukken op zolder.';
  $('museum-list').replaceChildren(...items.map(item=>{const li=document.createElement('li'),title=document.createElement('strong'),text=document.createElement('p'),meta=document.createElement('small');title.textContent=item.title;text.textContent=item.text;meta.textContent=`${item.kind}${item.year?` · jaar ${item.year}`:''}`;li.append(title,text,meta);return li;}));
}
// A big moment gets a photo a moment later, once the camera has had time to look.
function takeAlbumPhoto(entries){
  if(album.seed!==sim.seed)album={seed:sim.seed,photos:[]};
  const moment=albumBusy?null:albumMoment(album,entries);if(!moment)return;
  albumBusy=true;const seed=sim.seed;
  setTimeout(()=>{albumBusy=false;if(seed!==sim.seed)return;
    try{const src=snapshot(canvas);if(!src)return;addPhoto(album,{year:moment.year,caption:albumCaption(nl(moment.text)),src});}catch{return;}
    for(let tries=0;tries<3;tries++){try{localStorage.setItem(ALBUM_STORAGE_KEY,JSON.stringify(album));break;}catch{album.photos.splice(1,4);}}
  },1800);
}
function renderAlbum(){
  if(album.seed!==sim.seed)album={seed:sim.seed,photos:[]};
  $('album-note').textContent=album.photos.length?`${album.photos.length} foto’s van grote momenten. Iemand op het eiland heeft een heel geduldig fototoestel.`:'Nog geen foto’s. Bij grote momenten maakt het eiland vanzelf een kiekje.';
  $('album-grid').replaceChildren(...album.photos.map((photo,i)=>{const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),year=document.createElement('strong');
    img.src=photo.src;img.alt=photo.caption;img.loading='lazy';year.textContent=`Jaar ${photo.year}`;caption.append(year,photo.caption);figure.style.setProperty?.('--tilt',`${((i*37)%5-2)*.6}deg`);figure.append(img,caption);return figure;}));
}
function renderChallenges(){
  const state=ensureChallenges(sim),keur=islandScores(sim);
  $('keur-now').textContent=`Als het eiland nu gekeurd werd: ${keur.total} van 100, ${keur.level.title.toLowerCase()}. Alles erop en eraan: ${keur.done} van ${keur.items}. ${Object.entries(keur.values).map(([name,value])=>`${name} ${value}/${keur.maxes[name]}`).join(' · ')}.`;
  $('keur-now-list').replaceChildren(...keur.checklist.map(item=>{const li=document.createElement('li');li.textContent=item.label;li.dataset.done=String(item.done);return li;}));
  $('challenge-note').textContent=state.trackingSince>1?`Bijhouden begonnen in jaar ${state.trackingSince}. Voorbijgegane doelen zijn niet achteraf beoordeeld.`:'Deze ideeën horen bij de seed van je eiland. Je hoeft ze niet te volgen.';
  $('challenge-list').replaceChildren(...state.goals.map(goal=>{
    const definition=CHALLENGE_CATALOG.find(d=>d.id===goal.id),item=document.createElement('li'),title=document.createElement('strong'),description=document.createElement('p'),status=document.createElement('span'),progress=document.createElement('small');
    item.dataset.status=goal.status;title.textContent=definition?.title||'Een idee uit een andere versie';description.textContent=definition?.description||'';
    status.textContent=goal.status==='completed'?`✓ Gelukt in jaar ${goal.completedAt}`:goal.status==='missed'?'Afgesloten · het eiland koos een ander verhaal':goal.status==='unavailable'?'Niet bijgehouden in deze oude save':'Vrijblijvend · nog mogelijk';
    progress.textContent=goal.status==='active'?challengeProgress(sim,goal.id):goal.status==='completed'?'Deze mijlpaal blijft bewaard, ook als het eiland verder verandert.':'Je kunt rustig verder spelen.';
    item.append(title,description,status,progress);return item;
  }));
}
let wishHeard=null;
let bubbleTimer=null,bubbleQuiet=null;
function updateWishBubble(){
  const wish=ensureWishes(sim).active;
  // The cloud shows a new wish for ten seconds, then only the question mark on the island stays.
  if(wish&&!wish.hidden&&wish.id!==wishHeard){clearTimeout(bubbleTimer);const id=wish.id;bubbleTimer=setTimeout(()=>{bubbleQuiet=id;$('wish-bubble').hidden=true;},10000);}
  // A soft ping when someone starts asking for something.
  if(wish&&!wish.hidden&&wish.id!==wishHeard){if(wishHeard!==null)soundscape?.play('wish');wishHeard=wish.id;hintOnce('wish','Iemand heeft een vraag. Klik op het vraagteken of het wolkje als je wilt helpen; het mag ook niet.');}else if(!wish&&wishHeard===null)wishHeard='';
  $('book-tab-wishes').dataset.pending=String(!!wish&&!sim.ending);
  $('wish-bubble').hidden=!wish||wish.hidden||sim.config.wishBubbles===false||!!sim.ending||bubbleQuiet===wish.id;
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
const bookPages=['journal','family','wishes','challenges','museum','album','collection'];
let bookPage='journal';
function renderBookPage(name){
  if(name==='journal')renderJournal();
  else if(name==='family')renderFamily();
  else if(name==='wishes'){renderWishes();renderCommissions();}
  else if(name==='challenges'){ensureChallenges(sim).revealed=true;renderChallenges();}
  else if(name==='museum')renderMuseum();
  else if(name==='album')renderAlbum();
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
// Commissions: choose in the book, then point at a free plot on the island.
let commissionChoice=null,giftsOffered=null;
// The moment the residents want to build you something, the choice opens by itself.
function offerGift(){
  const c=ensureCommissions(sim);if(giftsOffered===null||giftsOffered>c.earned){giftsOffered=c.earned;return;}
  if(c.earned<=giftsOffered||c.available<1||sim.ending||tour)return;
  const book=$('book-dialog').open;if(!book&&otherDialogOpen())return;
  giftsOffered=c.earned;openBook('wishes');showToast('De bewoners willen iets voor je bouwen. Kies wat het wordt en klik daarna op een plek.',5200);
}
function renderCommissions(){
  const c=ensureCommissions(sim);$('commission-box').hidden=c.available<1;
  $('commission-note').textContent=`Je mag ${c.available===1?'één bouwwerk':`${c.available} bouwwerken`} kiezen. Daarna klik je op een vrije plek op het eiland.`;
}
function giftSpot(){return sim.land.filter(t=>canCommission(sim,t)).sort((a,b)=>Number(['park','garden','tree'].includes(b.building)||!b.building)-Number(['park','garden','tree'].includes(a.building)||!a.building)||Math.hypot(a.x-.5,a.y-2)-Math.hypot(b.x-.5,b.y-2))[0];}
for(const type of Object.keys(COMMISSIONS))$(`commission-${type}`).addEventListener('click',()=>{
  if($('commission-auto').checked){const spot=giftSpot();if(spot&&placeCommission(sim,type,spot.x,spot.y)){$('book-dialog').close();showToast(`De bewoners zetten je ${COMMISSIONS[type].name.toLowerCase()} op een mooie plek.`,3600);renderer.dive(spot.x,spot.y,6);renderCommissions();updateUI();save();return;}}
  commissionChoice=type;$('book-dialog').close();chooseMode('nudge');$('interaction-hint').textContent=`Klik op een vrije plek voor je ${COMMISSIONS[type].name.toLowerCase()}. ${COMMISSIONS[type].effect}`;showToast(`Kies een plek voor je ${COMMISSIONS[type].name.toLowerCase()}.`,3600);
});
function updateAwayReport(){
  const report=sim.awayReport;$('away-summary').hidden=!report||report.dismissed;
  if(!report||report.dismissed)return;
  $('away-heading').textContent=report.focused?'Het grootste moment':'Terwijl je weg was…';$('away-show').hidden=!!report.focused;
  $('away-text').textContent=report.focused?nl(report.biggest.text):report.summary;$('away-range').textContent=report.focused?`Jaar ${report.biggest.year}`:`Jaar ${report.from}–${report.to}${report.limited?' · maximaal drie eeuwen bijgewerkt':''}`;
}
const seasonLines={lente:'Lente. Alles loopt uit, ook de vergaderingen.',zomer:'Zomer. Iedereen weet een beter strand.',herfst:'Herfst. De bladeren nemen ontslag.',winter:'Winter. Sneeuw op de bergen, soep in de pannen.'};
function ambienceLine(){
  const light=renderer.light,weather=weatherActive(sim);
  if(weather)return WEATHER[weather].line;
  if(renderer.rainbowShowing)return 'Een regenboog! Iedereen wijst tegelijk.';
  if(sim.config.dayNight===false||!light)return sim.era>=3?"Stijgende zee. Optimistische ingenieurs.":"Kalme zee. Kleine ambities.";
  if(light.night)return sim.power>0?'Nacht. De straatlantaarns doen het werk.':'Nacht. Een paar ramen houden de wacht.';
  if(light.dusk>.6)return light.phase<.5?'Ochtendgloren. De eerste bakker is al op.':'Avondrood. Iemand roept dat het eten klaar is.';
  return seasonLines[light.seasonName];
}
// 3.4: a short title card, a warm wash over the island and a little motif whenever a new age begins.
const AGE_LINES={classical:'Zuilen. Scholen. Meningen over zuilen.',medieval:'Torens. Kerken. Meningen.',renaissance:'Molens, gevels en een gewaagd idee: de zee wegpompen.',industrial:'Stoom! Iedereen praat ineens wat harder.',modern:'Auto’s. Niemand weet nog waar ze heen moeten.',contemporary:'Zon, wind en een vergadering over de wind.',future:'De toekomst. Hij wacht nog op een bouwvergunning.'};
let shownAge=null,ageTimer;
// Now and then the camera glides in close to something happening, but never while you are busy yourself.
let lastUserActivity=-Infinity,lastDive=-Infinity,idleSince=performance.now(),idleShown=false;
for(const type of ['pointerdown','wheel','keydown'])window.addEventListener(type,()=>{lastUserActivity=performance.now();idleSince=lastUserActivity;idleShown=false;},{capture:true,passive:true});
window.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch'){lastUserActivity=performance.now();idleSince=lastUserActivity;}},{capture:true,passive:true});
// Automatic camera dives are off by default on phones; the setting can switch them on.
const autoZoomOn=()=>sim.config.autoZoom??!(typeof window!=='undefined'&&window.innerWidth<700);
function maybeDive(x,y,important=false){
  const now=performance.now();
  if(!autoZoomOn()||tour||photoOn||paused||renderer.reduced||otherDialogOpen()||now-lastUserActivity<20000||!important&&now-lastDive<90000)return;
  lastDive=now;renderer.dive(x,y,6);
}
function announceAge(){
  const age=sim.age;if(shownAge===null||sim.ending){shownAge=age.id;return;}
  if(age.id===shownAge)return;shownAge=age.id;if(!AGE_LINES[age.id])return;
  $('age-card-year').textContent=`JAAR ${age.year}`;$('age-card-title').textContent=nl(age.name);$('age-card-line').textContent=AGE_LINES[age.id];
  $('age-card').hidden=false;$('island-window').classList.add('age-shift');soundscape?.play('age');
  maybeDive(1,1,true);
  clearTimeout(ageTimer);ageTimer=setTimeout(()=>{$('age-card').hidden=true;$('island-window').classList.remove('age-shift');},4800);
}
let shownCentury=null;
// The timeline: one stretch per age, a marker for now and a dot for each big moment you can hover.
const TIMELINE_AGES=['Begin','Oude wereld','Stoomtijd','Moderne tijd','Toekomst'];
const TIMELINE_KINDS={delight:'good',palace:'good',famous:'good',visitor:'good',treasure:'good',lighthouse:'good',age:'good',fire:'disaster',flood:'disaster',crisis:'disaster',volcano:'disaster',interference:'you',helped:'you'};
let timelineKey='';
function timelinePosition(year){
  const starts=ERAS.map(e=>Math.max(1,e.year)),end=Math.max(sim.finaleDeadline||2200,starts.at(-1)+60);
  let i=0;while(i<starts.length-1&&year>=starts[i+1])i++;
  const from=starts[i],to=starts[i+1]??end;return Math.min(1,(i+Math.max(0,Math.min(1,(year-from)/Math.max(1,to-from))))/starts.length);
}
function renderTimeline(){
  const key=`${sim.year}|${sim.era}|${sim.history.length}`;if(key===timelineKey)return;timelineKey=key;
  const ages=TIMELINE_AGES.map((label,i)=>{const el=document.createElement('span');el.className='age';el.textContent=label;el.dataset.state=i<sim.era?'past':i===sim.era?'now':'future';return el;});
  const moments=sim.history.filter(e=>TIMELINE_KINDS[e.type]&&(e.priority||0)>=78).slice(-10).map(e=>{const dot=document.createElement('span');dot.className='moment';dot.dataset.kind=TIMELINE_KINDS[e.type];dot.style.left=`${(timelinePosition(e.year)*100).toFixed(2)}%`;dot.title=`Jaar ${e.year}: ${nl(e.text)}`;return dot;});
  const marker=document.createElement('span');marker.className='marker';marker.style.left=`${(timelinePosition(sim.year)*100).toFixed(2)}%`;
  $('timeline-track').replaceChildren(...ages,...moments,marker);
  // Now in words (on phones that is all you see), and what comes next on larger screens.
  const next=ERAS[sim.era+1],now=document.createElement('b'),later=document.createElement('span');later.className='timeline-next';
  now.textContent=sim.ending?'Het verhaal is af':`Jaar ${sim.year} · ${sim.endgameStarted?'het laatste hoofdstuk':TIMELINE_AGES[sim.era]}`;
  later.textContent=sim.ending||sim.endgameStarted?'':next?` · ${TIMELINE_AGES[sim.era+1].toLowerCase()} vanaf ongeveer ${next.year}`:' · nog even tot het laatste hoofdstuk';
  $('timeline-now').replaceChildren(now,later);
}
function updateUI(){
  renderTimeline();
  announceAge();
  const century=Math.floor(sim.year/100);if(shownCentury!==null&&century>shownCentury)soundscape?.play('century');shownCentury=century;
  updateAwayReport();
  syncCollection();
  updateWishBubble();
  $('year').textContent=sim.year;
  $('era-name').textContent=nl(sim.age.name).toUpperCase();
  const nextAge=AGES.find(age=>age.year>sim.year);
  $('age-next').textContent=nextAge?`Volgend tijdperk · jaar ${nextAge.year}`:"De toekomst krijgt vorm";
  $('chapter-status').textContent=sim.sandbox?"Vrij spelen · het verhaal is klaar":sim.ending?nl(sim.outcome.title):sim.endgameStarted?`Laatste tijdperk · ${['het overleg','het laatste project','de erfenis'][Math.max(0,sim.endgamePhase)]} · klaar uiterlijk ${sim.finaleDeadline}`:`Laatste tijdperk rond ${sim.endgameYear}`;
  $('chapter-status').classList.toggle('final-age',sim.endgameStarted);
  const identity=islandIdentity(sim),flagKey=`${identity.name}|${identity.kind}`;
  if($('geography-label').dataset.identity!==flagKey){$('geography-label').dataset.identity=flagKey;$('geography-label').innerHTML=`${flagSVG(identity,12)} <span>${identity.name.toUpperCase()} · ${nl(sim.geography?.name||'Het oorspronkelijke eiland').toUpperCase()}</span>`;document.title=`${identity.name} · Do Nothing Island`;}
  $('population').textContent=Math.floor(sim.population).toLocaleString();
  if(!shownRemark || /^Six people\./.test(shownRemark)&&Math.floor(sim.population)!==6 || performance.now()-lastRemarkAt>=6500){shownRemark=sim.populationNote;lastRemarkAt=performance.now();$('population-note').textContent=nl(shownRemark);}
  $('happiness').textContent=nl(sim.happiness);
  $('interference-count').textContent=sim.interferences;
  $('land-area').textContent=sim.land.length;
  $('start-size').textContent=sim.geographyVersion<3?'Bewaard eiland · Nieuw groot eiland geeft meer ruimte':`${sim.originalArea} natuurlijke landtegels · de ruimte is er al`;
  updateCinemaUI();
  $('land-added').textContent=sim.reclaimed.length?`+${sim.reclaimed.length} geleend van de zee`:"voorlopig allemaal natuurlijk";
  const exact=sim.config.showNumbers===true,feel=feelings(sim),numbers={food:Math.floor(sim.food).toLocaleString('nl-NL'),wood:Math.floor(sim.wood).toLocaleString('nl-NL'),prosperity:String(Math.floor(sim.prosperity))};
  $('resources').classList.toggle('feeling',!exact);
  for(const key of ['food','wood','prosperity']){$(key).textContent=exact?numbers[key]:feel[key];$(key).title=exact?feel[key]:`${numbers[key]}${key==='prosperity'?'%':''}`;}
  $('water-status').textContent=exact?`Zoetwater · ${Math.round(sim.freshwater)}%`:feel.water;
  $('environment-status').textContent=exact?`Levend landschap · ${Math.round(sim.environment)}% · vervuiling ${Math.round(sim.pollution)}%`:feel.environment;
  $('legacy-status').textContent=sim.interferences?`${sim.influence.rain} regenbuien · ${sim.influence.nudge+sim.influence.rescues} keer hulp · ${sim.influence.rumble} bevingen · ${sim.influence.fire} vuren · ${Math.round(sim.influence.dependence)}% afhankelijkheid`:"Een zelfstandige beschaving · geen hulp van buitenaf";
  $('council-status').textContent=sim.civicProject?`${nl(sim.civicProject.title)} · ${{debate:"overleg",building:"bouw"}[sim.civicProject.phase]||"uitvoering"}`:exact?`Voedsel ${sim.balance.food>=0?'+':''}${sim.balance.food.toFixed(1)} / jaar · publieke kosten ${sim.balance.expenses.toFixed(1)}`:feel.council;
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
  const ride={handcart:'Handkarren',horse:'Paard en wagen',coach:'Koetsen',oldtimer:`${Math.max(1,sim.carCount)} oldtimers`,car:`${sim.carCount} auto’s`}[sim.vehicleKind];
  $('mobility-status').textContent=sim.population<12?'Te voet over het eiland':`${ride}${sim.bikeCount?` · ${sim.bikeCount} fietsen`:''}`;
  const moods=["Een behoorlijk rustig begin","Een klein dorp. Een paar grote ideeën.","De kustlijn staat ter discussie","Een kleine wereld met heel grote plannen","Aardrijkskunde is meer een suggestie"];
  $('island-mood').textContent=sim.ending?nl(sim.outcome.consequence):sim.volcanoActiveUntil>sim.year?"De vulkaan heeft een mening":sim.storm?"De oceaan heeft iets te melden":sim.endgameStarted?"Het eiland maakt zijn laatste grote plannen":moods[sim.era];
  $('weather').querySelector('span').textContent=sim.storm?"Hoogwater. Bezorgde commissies.":sim.pumpBroken?"Een pomp neemt onverwacht vrij.":ambienceLine();
  const p=sim.project;$('project-overlay').hidden=!p||sim.ending||cinemaActive();
  if(sim.ending)$('moment-card').hidden=true;
  if(p&&!sim.ending){
    const percent=Math.min(100,Math.floor((p.stage+p.elapsed/Math.max(1,Math.round(PROJECT_STAGES[p.stage].duration*(p.manual&&p.stage===2?1.7:1)*(sim.era>=3?.6:1))))/5*100));
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
let chipAt=-Infinity,chipTimer=null,chipEntry=null;
function surfaceStory(entries){
  // A quiet start: no story notes in the first 150 years, and on a phone not while a wish is showing.
  const now=performance.now();if(now-chipAt<75000||sim.ending||sim.year<150||typeof window!=='undefined'&&window.innerWidth<700&&!$('wish-bubble').hidden)return;
  const pick=entries.find(e=>e.type==='family')||entries.find(e=>['famous','treasure','delight','palace'].includes(e.type));if(!pick)return;
  chipAt=now;chipEntry=pick;const text=nl(pick.text),short=text.length>90?text.slice(0,88)+'…':text;
  $('story-chip-text').textContent=short;$('story-chip').hidden=false;clearTimeout(chipTimer);chipTimer=setTimeout(()=>{$('story-chip').hidden=true;},14000);
}
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
  $('moment-title').textContent=({palace:"Het eerste huis heeft toekomst",age:nl(sim.age.name),endgame:"Het laatste hoofdstuk van het eiland",flood:"De waterkant heeft hulp nodig",reform:"Een discussie wordt een plek",legacy:"Ze herinneren zich jouw bezoek",visitor:"Bezoek van overzee",famous:"Een beroemde eilander",technology:"Een nieuwe manier van leven",interference:"Jouw hand in hun geschiedenis",crisis:"Een waarschuwing van de zee"})[activeMoment.type]||"Een beetje geschiedenis";
  $('moment-text').textContent=nl(activeMoment.text);
  updateClock();
}
function updateSnapshotOptions(){
  const signature=sim.snapshots.map(s=>s.year+':'+s.label).join('|');if(signature===snapshotSignature)return;snapshotSignature=signature;
  const select=$('history-snapshot'),value=select.value;
  select.replaceChildren(...sim.snapshots.map((snapshot,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`${snapshot.year} · ${nl(snapshot.label)}`;return option;}));
  select.value=value&&sim.snapshots[Number(value)]?value:'0';renderer.historySnapshot=sim.snapshots[Number(select.value)];
}
function miniMap(land,fill='#a9b88d'){
  return '<rect width="250" height="250" fill="#cfe3e0"/>'+land.map(id=>{const [x,y]=id.split(',').map(Number);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>14||Math.abs(y)>14)return'';return `<rect x="${(x+14)*250/29}" y="${(y+14)*250/29}" width="${250/29+.4}" height="${250/29+.4}" fill="${fill}"/>`;}).join('');
}
// The island at the end, coloured by what stands on each plot.
function fullMap(){
  const colour=t=>t.landform?'#9aab97':['hut','house','townhouse','tower','manor'].includes(t.building)?'#c9805f':t.building==='farm'?'#d8c27a':['park','forest','tree','garden','castle-garden','original-tree'].includes(t.building)?'#7fa36a':t.building==='beach'?'#ecdcae':t.building?'#e2b84a':t.road?'#c9c3ad':'#a9c28a';
  return '<rect width="250" height="250" fill="#cfe3e0"/>'+sim.land.map(t=>Math.abs(t.x)>14||Math.abs(t.y)>14?'':`<rect x="${(t.x+14)*250/29}" y="${(t.y+14)*250/29}" width="${250/29+.4}" height="${250/29+.4}" fill="${colour(t)}"/>`).join('');
}
function renderEnding(){
  const o=Object.fromEntries(Object.entries(sim.outcome||ENDINGS.independent).map(([key,value])=>[key,typeof value==='string'?nl(value):value]));
  // The island's own name is the title; how it ended is a sentence below it.
  $('ending-title').textContent=islandIdentity(sim).name;$('ending-quote').textContent=o.title;$('ending-description').textContent=`“${o.quote}” ${o.description}`;$('ending-consequence').textContent=o.consequence;$('ending-detail').textContent=o.detail;
  $('ending-stats').textContent=`Jaar ${o.year||sim.year} · ${Math.round(o.population??sim.population).toLocaleString("nl-NL")} inwoners · ${o.land??sim.land.length} landtegels · ${o.interferences??sim.interferences} ingrepen`;
  const first=sim.snapshots[0];$('ending-before').innerHTML=miniMap(first?.land||[],'#9fbb73');$('ending-after').innerHTML=fullMap();
  const influence=o.influence||sim.influence;
  $('ending-causes').textContent=(o.interferences??sim.interferences)?`Jouw invloed: ${influence.rain} regenbuien, ${influence.nudge+influence.rescues} keer hulp, ${influence.rumble} bevingen. ${Math.round(influence.dependence)}% afhankelijkheid; ${influence.fear} angst. ${nl(o.lastConsequence||sim.interventionLedger.at(-1)?.consequence||'')}.`:"Jij keek toe. Zij namen hun eigen beslissingen. De wegen, ruzies en prestaties zijn van hen.";
  $('ending-chronicle').replaceChildren(...(o.chronicle||sim.history.filter(e=>['palace','reform','flood','endgame','legacy'].includes(e.type)).slice(-5)).map(historyItem));
  const score=currentScores(sim,sim.outcome?.scores);$('ending-score').textContent=String(score.total);$('score-recipe').textContent=SCORE_RECIPE;
  $('keur-title').textContent=score.level.title;$('keur-line').textContent=score.level.line+(score.patience?` Plus ${score.patience} punten voor je geduld.`:'');$('keur-medal').style.setProperty?.('--medal',score.level.color);
  $('keur-count').textContent=`Alles erop en eraan: ${score.done} van ${score.items}`;
  $('keur-list').replaceChildren(...score.checklist.map(item=>{const li=document.createElement('li');li.textContent=item.label;li.dataset.done=String(item.done);return li;}));
  $('score-breakdown').replaceChildren(...Object.entries(score.values).map(([name,value])=>{const item=document.createElement('details');item.className='score-row';const label=document.createElement('span'),number=document.createElement('strong'),bar=document.createElement('progress'),note=document.createElement('small'),info=explainScore(name,value,score.maxes?.[name]||score.max||100);label.textContent=name;number.textContent=value;const max=score.maxes?.[name]||score.max||100;bar.max=max;bar.value=value;bar.setAttribute('aria-label',`${name}: ${value} van ${max}. ${info.what}. ${info.verdict}`);note.className='score-note';note.textContent=`${info.what}. ${info.verdict}`;const head=document.createElement('summary');head.append(label,bar,number);item.append(head,note);return item;}));
}
function cinemaActive(){return !!sim.cinematic&&!sim.cinematic.completed;}
// 2.8: before the finale, the camera visits the island's big moments and ends under the old tree.
let tour=null;
const touring=()=>cinemaActive()&&sim.cinematic.toured===false;
function showTourStop(){
  const stop=tour.stops[tour.index];tour.at=performance.now();
  const zoom=stop.zoom||1.7,point=renderer.p(stop.x,stop.y);renderer.flyTo([{x:point.x,y:point.y-24+renderer.height*.32/zoom,zoom}],2.6,{dip:.45});
  $('tour-year').textContent=stop.eyebrow;$('tour-text').textContent=stop.text;$('tour-step').textContent=`${tour.index+1} / ${tour.stops.length}`;
}
function startTour(){
  tour={stops:tourStops(sim),index:0,at:performance.now()};renderer.touring=true;
  for(const dialog of document.querySelectorAll('dialog[open]'))if(dialog.id==='cinema-dialog')dialog.close();
  $('island-window').classList.add('touring');$('tour-caption').hidden=false;showTourStop();
}
function finishTour(){
  if(sim.cinematic)sim.cinematic.toured=true;tour=null;renderer.touring=false;renderer.flight=null;renderer.focus=null;renderer.recenter();
  $('tour-caption').hidden=true;$('island-window').classList.remove('touring');accumulator=0;save();updateCinemaUI();
}
function advanceTour(now){
  if(!touring()){if(tour)finishTour();return;}
  if(!tour){startTour();return;}
  if(paused||otherDialogOpen())return;
  if(now-tour.at>=tour.stops[tour.index].seconds*1000){tour.index++;if(tour.index>=tour.stops.length)finishTour();else showTourStop();}
}
function updateCinemaUI(){
  const active=cinemaActive();$('cinema-caption').hidden=!active;$('island-window').classList.toggle('cinema-playing',active);
  if(active&&sim.cinematic.toured!==false&&!$('cinema-dialog').open&&!otherDialogOpen())$('cinema-dialog').showModal();
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
      if(sim.events.length){dirtyHistory=true;queueMoments(sim.events);takeAlbumPhoto(sim.events);surfaceStory(sim.events);sim.events=[];}
      updateUI();
    }
  }
  advanceTour(now);offerGift();
  if(!paused&&!modal&&!document.hidden&&!sim.ending&&!cinemaActive()){sim.watch??={total:0,slow:0};sim.watch.total+=dt;if(speed===1)sim.watch.slow+=dt;}
  // Doing truly nothing for ten minutes is rewarded with something rare.
  if(!idleShown&&now-idleSince>600000&&!paused&&!modal&&!document.hidden&&!sim.ending){idleShown=true;renderer.idleEvent={kind:renderer.light?.darkness>.4?(sim.year%2?'aurora':'meteors'):'whale',start:renderer.time};showToast(renderer.light?.darkness>.4?'Omdat je zo heerlijk niets deed: kijk eens naar de lucht.':'Omdat je zo heerlijk niets deed: kijk eens naar zee.',6000);soundscape?.play('chime');}
  if(soundscape?.enabled&&now-soundAt>400){soundAt=now;soundscape.update({era:sim.era,storm:!!sim.storm,night:!!renderer.light?.night,year:sim.year,building:sim.land.some(t=>t.buildSite),close:Math.max(0,Math.min(1,(renderer.zoom/Math.max(.3,renderer.fitZoom||1)-1)/1.1))});}
  if(cinemaActive()&&!touring()&&!paused&&!modal&&!document.hidden){if(advanceCinema(sim,dt))completeCinema();else updateCinemaUI();}
  if(sim.signals.length){const ordered=sim.signals.slice().sort((a,b)=>(b.priority||0)-(a.priority||0));for(const signal of ordered.slice(0,8)){renderer.addEffect(signal);if(/^Een schat/.test(signal.label||''))soundscape?.play('treasure');if(signal.type==='flood')soundscape?.play('flood');if(/^(Een schat|Opening|Onthulling|Inhuldiging)/.test(signal.label||''))maybeDive(signal.x,signal.y);if(/^(Opening|Onthulling|Inhuldiging)/.test(signal.label||''))soundscape?.play('fanfare');if(signal.type==='gift'&&!tour&&!photoOn)renderer.dive(signal.x,signal.y,7);else if(signal.moment)maybeDive(signal.x,signal.y,true);if(signal.moment){soundscape?.play(signal.moment.sound);showToast(signal.moment.text,5200);}}sim.signals=[];}
  presentMoment(now);
  if(!document.hidden)saveTimer+=dt;if(saveTimer>=10){saveTimer=0;save();}
  renderer.paused=paused||modal||sim.ending&&!tour||now<beatHoldUntil;
  // A paused island only needs half the frames, and so does a device that struggles to keep up.
  // While you touch, drag or zoom, every frame is drawn.
  drawTick=(drawTick+1)%2;const slow=(renderer.drawCost||0)>22,interacting=now-lastUserActivity<1500;
  if((!renderer.paused&&(!slow||interacting))||interacting||tour||drawTick===0||renderer.needsDraw){renderer.needsDraw=false;const t0=performance.now();renderer.draw(now);renderer.drawCost=(renderer.drawCost||0)*.9+(performance.now()-t0)*.1;}
  const night=renderer.light.darkness>.3;if(night!==nightShown){nightShown=night;$('island-window').classList.toggle('is-night',night);updateUI();}
  if(cinemaActive()){
    const stage=$('finale-canvas'),box=stage.getBoundingClientRect(),w=Math.max(300,Math.round(box.width)),h=Math.max(200,Math.round(box.height));
    if(stage.width!==w||stage.height!==h){stage.width=w;stage.height=h;}
    drawCredits(stage.getContext('2d'),w,h,sim,sim.cinematic,renderer.reduced,canvas);
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
$('intro-next').addEventListener('click',()=>{if(introStep<introScreens.length-1){introStep++;updateIntro();return;}finishIntro();});
$('cinema-skip').addEventListener('click',completeCinema);
$('tour-skip').addEventListener('click',finishTour);
// 3.6: photo mode hides the interface, offers day or night and saves a postcard.
let photoPaused=false,photoOn=false;
function setPhotoMode(on){
  photoOn=on;
  $('island-window').classList.toggle('photo-mode',on);$('photo-bar').hidden=!on;$('photo-mode').setAttribute('aria-pressed',String(on));
  if(on){photoPaused=paused;paused=true;}else paused=photoPaused;updatePause();
}
function setPhotoLight(night){const day=Math.floor(renderer.dayClock/DAY_SECONDS);renderer.dayClock=(day+(night?.02:.5))*DAY_SECONDS;renderer.draw(performance.now());}
$('photo-mode').addEventListener('click',()=>setPhotoMode(!photoOn));
$('photo-done').addEventListener('click',()=>setPhotoMode(false));
$('photo-day').addEventListener('click',()=>setPhotoLight(false));
$('photo-night').addEventListener('click',()=>setPhotoLight(true));
$('photo-save').addEventListener('click',()=>{try{const id=islandIdentity(sim);downloadCanvas(makePostcard(canvas,{identity:id,year:sim.year,line:`${Math.floor(sim.population).toLocaleString('nl-NL')} inwoners · ${nl(sim.age.name)}`}),`${id.name.replace(/\s+/g,'-').toLowerCase()}-jaar-${sim.year}.png`);showToast('Ansichtkaart bewaard.',2400);}catch{showToast('Bewaren lukt niet in deze browser.');}});
function islandLink(){try{return `${location.origin}${location.pathname}?seed=${sim.seed}`;}catch{return `?seed=${sim.seed}`;}}
$('ending-card').addEventListener('click',()=>{try{const id=islandIdentity(sim),o=sim.outcome||ENDINGS.independent,family=ensureFamily(sim),keur=currentScores(sim,o.scores),score=keur.total;
  const lines=creditsFor(sim);downloadCanvas(makeEndCard({identity:id,title:nl(o.title),quote:nl(o.quote),familyName:family.lastName,generations:family.generations.length,seed:sim.seed,year:o.year||sim.year,score,before:sim.snapshots[0]?.land,after:o.coast||sim.land.map(t=>`${t.x},${t.y}`),link:islandLink(),photo:canvas,keur,awards:lines.filter(l=>l.kind==='award'),stats:lines.filter(l=>l.kind==='stat')}),`${id.name.replace(/\s+/g,'-').toLowerCase()}-eindkaart.png`);showToast('Eindkaart bewaard.',2400);}catch{showToast('Bewaren lukt niet in deze browser.');}});
$('toggle-details').addEventListener('click',()=>{const on=$('island-window').classList.toggle('show-details');renderer.showDetails=!!on;$('toggle-details').setAttribute('aria-pressed',String(!!on));});
$('ending-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(islandLink());showToast('Link gekopieerd. Een vriend speelt hetzelfde eiland en mag anders ingrijpen.',3600);}catch{showToast(islandLink(),6000);}});
$('ending-replay').addEventListener('click',()=>{$('ending-dialog').close();startCinema(sim,sim.outcome.id,true);paused=false;renderer.focus=null;renderer.recenter();updateCinemaUI();updatePause();save();});
$('find-beach').addEventListener('click',()=>focusPlace(sim.beaches[Math.floor(sim.beaches.length/2)]));
$('find-fun').addEventListener('click',()=>{if(sim.festival&&sim.year<=sim.festival.until){focusPlace(sim.tile(sim.festival.x,sim.festival.y));showToast(`${nl(sim.festival.title)} · iedereen is welkom.`,3200);return;}showToast(`Nu even geen feest. Het volgende is rond jaar ${sim.nextFestival}.`,3200);focusPlace(sim.buildings.find(t=>t.building==='town-square')||sim.buildings.find(t=>t.building==='fairground')||sim.buildings.find(t=>t.building==='bonfire'));});
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
$('reduce-motion').addEventListener('change',e=>{renderer.reduced=e.target.checked;sim.config.reducedMotion=e.target.checked;save();});
const toggleNumbers=on=>{sim.config.showNumbers=on;$('show-numbers').checked=on;updateUI();save();};
$('show-numbers').addEventListener('change',e=>toggleNumbers(e.target.checked));
$('resources').addEventListener('click',()=>toggleNumbers(sim.config.showNumbers!==true));
$('resources').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleNumbers(sim.config.showNumbers!==true);}});
$('show-numbers').checked=sim.config.showNumbers===true;
const volumes=()=>({music:(sim.config.musicVolume??50)/100,effects:(sim.config.effectsVolume??100)/100});
for(const [id,keyName] of [['music-volume','musicVolume'],['effects-volume','effectsVolume']]){$(id).value=String(sim.config[keyName]??(id==='music-volume'?50:100));$(id).addEventListener('input',e=>{sim.config[keyName]=Number(e.target.value);soundscape?.setVolumes(volumes());save();});}
$('auto-zoom').checked=autoZoomOn();
$('auto-zoom').addEventListener('change',e=>{sim.config.autoZoom=e.target.checked;save();});
$('day-night').addEventListener('change',e=>{sim.config.dayNight=e.target.checked;renderer.dayNight=e.target.checked;updateUI();save();});
$('restart').addEventListener('click',()=>{$('restart-confirm').hidden=false;$('restart').hidden=true;});
$('cancel-restart').addEventListener('click',()=>{$('restart-confirm').hidden=true;$('restart').hidden=false;});
function switchIsland(next,message){
  syncCollection();persistCollection();
  sim=next;renderer.sim=sim;renderer.effects=[];renderer.ripples=[];renderer.visibleTiles=[];renderer.hover=null;renderer.center={x:0,y:0};renderer.zoom=1;renderer.activityTime=0;renderer.wheelTime=0;renderer.recenter();
  sim.config.speedMultiplier=speed;
  $('story-cards').checked=sim.config.storyCards===true;$('offline-life').checked=sim.config.offlineProgress!==false;
  sim.config.dayNight=renderer.dayNight;$('day-night').checked=renderer.dayNight;
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
  switchIsland(new Civilization(seed,{...sim.config,maxTiles:[480,560].includes(sim.config.maxTiles)?720:sim.config.maxTiles}), "Een nieuwe kust. Nieuwe bergen. De bewoners weten van niets.");
  $('undo-reset').hidden=false;clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>{previousIsland=null;$('undo-reset').hidden=true;},10000);
}
$('new-island').addEventListener('click',newIsland);
$('story-chip').addEventListener('click',()=>{$('story-chip').hidden=true;openBook(chipEntry?.type==='family'?'family':'journal');});
try{const id=islandIdentity(sim);$('title-island').textContent=sim.year>1?`${id.name} · jaar ${sim.year}`:`${id.name} · een nieuw begin`;}catch{}
// Minimal interface: the few buttons that used to live around the island join the bar at the bottom.
$('island-toolbar').append($('new-island'),$('undo-reset'),$('open-ending'));
$('confirm-restart').addEventListener('click',newIsland);
$('undo-reset').addEventListener('click',()=>{
  const previous=previousIsland&&Civilization.restore(previousIsland);if(!previous)return;
  clearTimeout(undoTimer);previousIsland=null;$('undo-reset').hidden=true;switchIsland(previous,"Je vorige eiland is terug. Niemand heeft de omweg gemerkt.");
});
const modeHints={look:'Je kijkt alleen. Kies links een ingreep als je toch iets wilt doen.',help:'Klik op een vraagteken om te lezen wat iemand vraagt. Kies zelf of je helpt.',nudge:'Klik op een huis: een aanbouw. Op een veld: irrigatie. Op lege grond: bouwers.',rain:'Klik: regen, natte grond en betere oogst. Op een brand: meteen blussen.',rumble:'Klik: de grond scheurt en huizen raken beschadigd. De inwoners reageren.',fire:'Klik op lege grond: een kampvuur. Op een gebouw: brand en een blusploeg.'};
// Clicking the active tool again puts it away: back to the ordinary cursor, just looking.
function hintOnce(key,text){sim.config.hints??={};if(sim.config.hints[key])return;sim.config.hints[key]=true;showToast(text,5200);}
function chooseMode(mode){
  if(mode===interferenceMode&&mode!=='look')mode='look';
  if(mode!=='look'&&modeHints[mode])hintOnce(`mode-${mode}`,modeHints[mode]);
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
  renderer.addEffect({...result,priority:100});beatHoldUntil=0;accumulator=0;soundscape?.play(result.type);
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
let drag=null,keyCursor=null;
function actOnTile(tile){
  if(cinemaActive()||sim.ending)return;
  if(interferenceMode==='help'||interferenceMode==='look'){const wish=ensureWishes(sim).active;if(wish&&tile.x===wish.x&&tile.y===wish.y)openWishes();else{inspectionPinned=true;inspectTile(sim.tile(tile.x,tile.y));}return;}
  sim.interfere(tile.x,tile.y,interferenceMode);const point=renderer.point(tile.x,tile.y);showIntervention(point.x,point.y);inspectTile(sim.tile(tile.x,tile.y));
}
// Two fingers pinch to zoom; one finger keeps dragging and tapping as before.
const touches=new Map();let pinch=0;
canvas.addEventListener('pointerdown',e=>{touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
canvas.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2&&pinch){const [a,b]=[...touches.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0){renderer.setZoom(d/pinch);pinch=d;}if(drag)drag.moved=true;}});
const releaseTouch=e=>{touches.delete(e.pointerId);if(touches.size<2)pinch=0;};
canvas.addEventListener('pointerup',releaseTouch);canvas.addEventListener('pointercancel',releaseTouch);
document.querySelector('.population-card')?.addEventListener('click',e=>e.currentTarget.classList.toggle('expanded'));
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect();renderer.hover=renderer.pick(e.clientX-r.left,e.clientY-r.top);
  inspectionPinned=false;
  {inspectTile(sim.tile(renderer.hover.x,renderer.hover.y));const panel=$('tile-inspector');panel.style.left=`${Math.min(r.width-230,e.clientX-r.left+16)}px`;panel.style.top=`${Math.min(r.height-60,e.clientY-r.top+18)}px`;}
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
    if(commissionChoice){const t=sim.tile(tile.x,tile.y);if(canCommission(sim,t)&&placeCommission(sim,commissionChoice,tile.x,tile.y)){showToast(`De bouwers beginnen aan je ${COMMISSIONS[commissionChoice].name.toLowerCase()}.`,3200);commissionChoice=null;chooseMode('nudge');dirtyHistory=true;updateUI();save();}else showToast('Daar kan het niet. Kies een vrije plek, of een boom, bos, park, tuin of akker.',2800);drag=null;return;}
    if(renderer.pickWishResident(x,y)){openWishes();drag=null;return;}
    if(interferenceMode==='help'||interferenceMode==='look'){const wish=ensureWishes(sim).active;if(wish&&tile.x===wish.x&&tile.y===wish.y)openWishes();else{inspectionPinned=true;inspectTile(sim.tile(tile.x,tile.y));}drag=null;return;}
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
    const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(step&&e.shiftKey){e.preventDefault();renderer.pan.x-=step[0]*20;renderer.pan.y-=step[1]*20;}
    // Without a mouse: arrows move a tile cursor, Enter acts on it exactly like a click.
    else if(step){e.preventDefault();keyCursor={x:(keyCursor?.x??0)+step[0],y:(keyCursor?.y??1)+step[1]};renderer.hover=keyCursor;inspectionPinned=true;inspectTile(sim.tile(keyCursor.x,keyCursor.y));}
    else if(e.key==='Enter'&&keyCursor){e.preventDefault();actOnTile(keyCursor);}
  }
});

async function toggleAudio(){
  try{
    if(!soundscape){soundscape=new Soundscape();soundscape.setVolumes(volumes());}
    if(soundscape.enabled)await soundscape.stop();else await soundscape.start();
    sim.config.sound=soundscape.enabled;save();
    $('sound').classList.toggle('enabled',soundscape.enabled);$('sound').setAttribute('aria-label',soundscape.enabled?"Zet het geluid uit":"Zet het geluid aan");
  }catch{showToast("De oceaan houdt zich stil. Geluid werkt niet in deze browser.");}
}
$('sound').addEventListener('click',e=>{e.stopPropagation();toggleAudio();});
// Sound is on by default; browsers only allow it after a first click or key press.
function autoStartSound(){if(sim.config.sound===false||soundscape?.enabled)return;toggleAudio();}
window.addEventListener('pointerdown',autoStartSound,{once:true,capture:true});
window.addEventListener('keydown',autoStartSound,{once:true,capture:true});
document.addEventListener('visibilitychange',()=>{
  accumulator=0;lastTime=performance.now();
  if(document.hidden){save();soundscape?.pause();}
  else{if(returnFromAway(sim)){dirtyHistory=true;momentQueue=[];renderer.effects=[];updateUI();}save();soundscape?.resume();}
});
window.addEventListener('pagehide',save);
let firstVisit=true;try{firstVisit=localStorage.getItem(introKey)!=='done';}catch{}
if(firstVisit)showIntro();
if(sharedFrom){previousIsland=sharedFrom;$('undo-reset').hidden=false;undoTimer=setTimeout(()=>{previousIsland=null;$('undo-reset').hidden=true;},10000);showToast(`Je speelt een gedeeld eiland (seed ${sim.seed}). Ingrijpen mag, anders dan je vriend.`,5000);try{history.replaceState(null,'',location.pathname);}catch{}}
updateUI();updatePause();save();
if(!storageAvailable)$('save-status').textContent="Opslaan lukt hier niet. Je kunt dit bezoek wel gewoon verder spelen.";
requestAnimationFrame(frame);

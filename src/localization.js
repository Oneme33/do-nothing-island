import {nl,dutchText} from './language.js';
import {englishCatalog} from './english.js';
let activeLanguage='nl';
const translationCache=new Map(),wrappedContexts=new WeakSet();
const englishText=Object.fromEntries(Object.entries(dutchText).map(([english,dutch])=>[dutch,english]));
Object.assign(englishText,englishCatalog,{
 'Doe Niks Eiland':'Do Nothing Island','DOE NIKS':'DO NOTHING','EILAND':'ISLAND','Do Nothing Island':'Do Nothing Island',
 'Taal':'Language','Bouw':'Build','Regen':'Rain','Beving':'Earthquake','Vuur':'Fire','Help':'Look','Help {0}':'Help {0}',
 'Vrij zicht':'Clear view','Eilandboek ↗':'Island book ↗','Kroniek':'Chronicle','Wensen':'Wishes','Stamboom':'Family tree',
 'Volgende':'Next','Vorige':'Previous','Sluiten':'Close','Nieuw':'New','Instellingen':'Settings',
 'De eerste brug over de rivier! De bewoners kunnen nu naar de overkant.':'The first bridge across the river! The residents can now reach the other bank.',
 'Een nieuwe rivierbrug verbindt de oevers.':'A new river bridge connects the banks.',
 'Oude wereld':'Ancient world','oude wereld':'ancient world','Stoomtijd':'Steam age','Moderne tijd':'Modern age','Toekomst':'Future','Strand':'Beach','Verberg melding':'Dismiss message','vanaf ongeveer':'from around',
 'Regen · Een bui op die plek. Goed voor de oogst en blust brand. Te vaak, en ze gaan erop rekenen.':'Rain · A shower here. Helps the harvest and puts out fires. Too much, and they start relying on you.',
 'Help · Grijp nergens in: kijk rond, lees het hele verhaal van een plek en help bij een wens.':'Look · Explore without changing anything. Read the story of a place or help with a wish.',
 'Er ligt een enorme kei midden op de akker. Kan de grond hem een stukje opschuiven?':'There is a huge boulder in the middle of the field. Could the ground move it aside?',
 'Vrij zicht: verberg de knoppen, zoom vrij en maak een ansichtkaart (F)':'Clear view: hide the controls, zoom freely and save a postcard (F)'
});
for(const name of ['Noor','Sam','Bo','Mila','Daan','Lou','Iris','Mo','Tess','Finn','Ada','Jip','Bep','Bram','Fien','Otis','Lena','Ravi','Roos','Nora','Teun','Liv','Evi','Sem','Pip','Niek','Cato','Abel','Linde','Mika','Els','Jo','de Vries','van de Kust','van Dijk','de Boer','van de Berg'])englishText[name]=name;
const englishLower=new Map(Object.entries(englishText).map(([key,value])=>[key.toLocaleLowerCase(),value]));
const allCaps=value=>{const letters=value.replace(/[^\p{L}]/gu,'');return !!letters&&letters===letters.toUpperCase();};
const caseTarget=(source,target)=>{if(allCaps(source))return target.toUpperCase();if(allCaps(target))target=target.toLowerCase();return /^[A-ZÀ-Ý]/.test(source)?target[0]?.toUpperCase()+target.slice(1):target;};
const escapeText=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templateEntries=Object.entries(englishText).filter(([key])=>/\{\d+\}/.test(key)).sort((a,b)=>b[0].replace(/\{\d+\}/g,'').length-a[0].replace(/\{\d+\}/g,'').length).map(([source,target])=>{
 const indices=[];let pattern='',at=0;
 for(const match of source.matchAll(/\{(\d+)\}/g)){pattern+=escapeText(source.slice(at,match.index))+'([\\s\\S]*?)';indices.push(Number(match[1]));at=match.index+match[0].length;}
 return {pattern:new RegExp('^'+pattern+escapeText(source.slice(at))+'$','i'),target,indices,source,needle:source.split(/\{\d+\}/).sort((a,b)=>b.length-a.length)[0]};
});
const fragments=Object.keys(englishText).filter(s=>s.length>2&&!/\{\d+\}/.test(s)).sort((a,b)=>b.length-a.length);
const fragmentsByInitial=new Map();
for(const source of fragments){const key=source[0].toLocaleLowerCase();if(!fragmentsByInitial.has(key))fragmentsByInitial.set(key,[]);fragmentsByInitial.get(key).push(source);}
const letter=character=>!!character&&/\p{L}/u.test(character);
function replaceFragments(source){
 let translated='';
 for(let i=0;i<source.length;){
  let found=null;
  if(!letter(source[i-1]))for(const key of fragmentsByInitial.get(source[i].toLocaleLowerCase())||[]){if(source.slice(i,i+key.length).toLocaleLowerCase()===key.toLocaleLowerCase()&&!letter(source[i+key.length])){found=key;break;}}
  if(found){translated+=caseTarget(source.slice(i,i+found.length),englishLower.get(found.toLocaleLowerCase()));i+=found.length;}else translated+=source[i++];
 }
 return translated;
}
export const getLanguage=()=>activeLanguage;
export const languageLocale=()=>activeLanguage==='en'?'en-GB':'nl-NL';
function translateInner(value,depth=0){
 const normalized=String(value).replace(/\s+/g,' ').trim();
 if(!normalized)return value;
 if(englishLower.has(normalized.toLocaleLowerCase()))return caseTarget(normalized,englishLower.get(normalized.toLocaleLowerCase()));
 if(depth<5)for(const entry of templateEntries){
  if(entry.needle&&!normalized.toLocaleLowerCase().includes(entry.needle.toLocaleLowerCase()))continue;
  const match=entry.pattern.exec(normalized);if(!match)continue;
  const args={};entry.indices.forEach((n,i)=>args[n]=translateInner(match[i+1],depth+1));
  const target=allCaps(entry.source||entry.needle)&&!allCaps(normalized)?entry.target.toLowerCase():entry.target;
  return caseTarget(normalized,target.replace(/\{(\d+)\}/g,(whole,n)=>args[n]??whole));
 }
 return replaceFragments(normalized);
}
export function translate(value){
 if(value==null)return '';
 const source=String(value),key=activeLanguage+'|'+source;
 if(translationCache.has(key))return translationCache.get(key);
 const names=[],protectedSource=source.replace(/\b(?:Noor|Sam|Bo|Mila|Daan|Lou|Iris|Mo|Tess|Finn|Ada|Jip|Bep|Bram|Fien|Otis|Lena|Ravi|Roos|Nora|Teun|Liv|Evi|Sem|Pip|Niek|Cato|Abel|Linde|Mika|Els|Jo) (?:de Vries|van de Kust|Bos|van Dijk|de Boer|Steen|van de Berg|Visser)\b/g,name=>{names.push(name);return '\uE000'+(names.length-1)+'\uE001';});
 const dutch=nl(protectedSource).replace(/Do Nothing Island/g,'Doe Niks Eiland').replace(/DO NOTHING/g,'DOE NIKS').replace(/\bISLAND\b/g,'EILAND');
 const result=activeLanguage==='nl'?dutch:dutch.split('\n').map(line=>translateInner(line)).join('\n');
 if(translationCache.size>5000)translationCache.clear();const restored=result.replace(/\uE000(\d+)\uE001/g,(_,n)=>names[Number(n)]);translationCache.set(key,restored);return restored;
}
export function localizeCanvasContext(context){
 if(!context||wrappedContexts.has(context))return context;
 wrappedContexts.add(context);
 for(const name of ['fillText','strokeText','measureText'])if(typeof context[name]==='function'){
  const original=context[name];context[name]=function(text,...args){return original.call(this,translate(text),...args);};
 }
 return context;
}
const nodeSources=new WeakMap(),attributeSources=new WeakMap();
function sourceValue(map,node,current){const old=map.get(node);return old&&current===old.translated?old.source:current;}
export function refreshLocalization(root=typeof document!=='undefined'?document:null){
 if(!root)return;
 function visit(node){
  if(node.nodeType===3){
   const current=node.nodeValue;if(!current?.trim())return;
   const source=sourceValue(nodeSources,node,current),translated=translate(source);
   nodeSources.set(node,{source,translated});if(current!==translated)node.nodeValue=translated;return;
  }
  if(['SCRIPT','STYLE','NOSCRIPT'].includes(node.tagName)||node.hasAttribute?.('data-language-native'))return;
  if(node.getAttribute)for(const key of ['title','aria-label','aria-description','placeholder','alt','data-tip','content']){
   if(key==='content'&&node.getAttribute('name')!=='description')continue;
   const current=node.getAttribute(key);if(!current)continue;
   let saved=attributeSources.get(node);if(!saved){saved=new Map();attributeSources.set(node,saved);}
   const previous=saved.get(key),source=previous&&previous.translated===current?previous.source:current,translated=translate(source);
   saved.set(key,{source,translated});if(current!==translated)node.setAttribute(key,translated);
  }
  for(const child of node.childNodes||[])visit(child);
 }
 visit(root);
}
export function setLanguage(language){
 activeLanguage=language==='en'?'en':'nl';translationCache.clear();
 if(typeof document!=='undefined'){if(document.documentElement)document.documentElement.lang=activeLanguage;const select=document.getElementById('language-switch');if(select)select.value=activeLanguage;refreshLocalization(document);}
 try{localStorage.setItem('do-nothing-island-language-v1',activeLanguage);}catch{}
 return activeLanguage;
}
export function initLocalization(){
 let language='nl';try{language=localStorage.getItem('do-nothing-island-language-v1')||'nl';}catch{}
 setLanguage(language);
 if(typeof HTMLCanvasElement!=='undefined'){
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){const context=original.call(this,type,...args);return type==='2d'?localizeCanvasContext(context):context;};
 }
 if(typeof MutationObserver!=='undefined'&&typeof document!=='undefined'){
  const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='childList')for(const node of record.addedNodes)refreshLocalization(node);else refreshLocalization(record.target);}});
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','aria-description','placeholder','alt','data-tip','content']});
 }
 return activeLanguage;
}

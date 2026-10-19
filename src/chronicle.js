import {AGES} from './simulation.js';
import {nl} from './language.js';

export const CHAPTER_ILLUSTRATIONS={
 early:'<path d="M14 45V29l17-13 17 13v16H14Z" fill="#d9c9a4"/><path d="m10 29 21-17 21 17" fill="#b89471"/><path d="M27 45V32h9v13M67 46V27"/><circle cx="67" cy="20" r="13" fill="#a3b67d"/><circle cx="76" cy="25" r="9" fill="#b5c88a"/>',
 classical:'<path d="M17 21 48 8 79 21Z" fill="#c4c9a5"/><path d="M17 25h62M15 47h66"/><path d="M23 26h9v19h-9zM43 26h9v19h-9zM64 26h9v19h-9z" fill="#d8d8b7"/>',
 medieval:'<path d="M16 47V18h6v6h7v-6h7v29M59 47V18h7v6h7v-6h7v29M36 47V31h23v16Z" fill="#c1c5a4"/><path d="M43 47V37a5 5 0 0 1 10 0v10" fill="#9eaa86"/>',
 renaissance:'<path d="M12 18q18-6 35 3v27q-17-9-35-3ZM47 21q17-9 35-3v27q-18-6-35 3Z" fill="#e2dbc1"/><path d="M21 26h15M21 32h15M58 26h15M58 32h15M47 21v27"/><path d="m69 12 14-7-9 15-9 6Z" fill="#a5b486"/>',
 industrial:'<path d="M13 47V27l18-9v9l17-9v9l18-9v29Z" fill="#b3b6a0"/><path d="M65 47V12h12v35" fill="#bda184"/><path d="M22 35h7v7h-7zM38 35h7v7h-7zM53 35h7v7h-7z" fill="#e5d9af"/><path d="M71 8q-14-8-25 0" stroke="#c3c9b6" stroke-width="5"/>',
 modern:'<rect x="13" y="19" width="69" height="25" rx="5" fill="#a6b89e"/><path d="M23 24h12v9H23zM42 24h12v9H42zM62 24h12v9H62z" fill="#e0e4cb"/><path d="M12 49h71M40 19l7-9 8 9M27 44v4M67 44v4"/>',
 contemporary:'<path d="M16 47V20h20v27M39 47V9h23v38M66 47V27h16v20" fill="#b8c6ac"/><path d="M23 27h6M23 35h6M46 18h9M46 27h9M46 36h9M71 34h6" stroke="#e7e6ca" stroke-width="4"/>',
 future:'<path d="M17 47V31h28v16Z" fill="#c1ccad"/><path d="m13 31 18-14 18 14" fill="#e1d7af"/><path d="M68 46V19M68 19 53 14M68 19l12-12M68 19l3 17"/><circle cx="26" cy="9" r="6" fill="#dfcf94"/>'
};
export function chronicleChapters(s){
 const chapters=AGES.filter(age=>age.year<=s.year).map((age,i)=>({...age,title:nl(age.name),until:AGES[i+1]?.year-1||null,current:s.age.id===age.id,entries:[]}));
 const entries=s.history.map((entry,index)=>({entry,index})).sort((a,b)=>a.entry.year-b.entry.year||a.index-b.index);
 for(const {entry} of entries){const chapter=chapters.findLast(c=>entry.year>=c.year)||chapters[0];chapter.entries.push(entry);}
 return chapters;
}
export function chroniclePlace(s,entry){
 if(Number.isFinite(entry.x)&&Number.isFinite(entry.y)&&s.tile(entry.x,entry.y))return s.tile(entry.x,entry.y);
 if(entry.type==='family')return s.tile(s.family?.home.x??-1,s.family?.home.y??1);
 if(entry.type==='tree')return s.tile(0,0);
 return null;
}

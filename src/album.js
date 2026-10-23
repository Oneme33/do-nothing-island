// The photo album: small snapshots of big moments, kept on this device for the current island only.
export const ALBUM_STORAGE_KEY='do-nothing-island-album-v1';
export const ALBUM_MAX=30;
const ALBUM_TYPES=new Set(['age','technology','delight','famous','visitor','treasure','lighthouse','palace','endgame','islet','beach','fire','flood','volcano','ending']);
export function readAlbum(raw,seed){
 try{const a=JSON.parse(raw);if(a&&a.seed===seed&&Array.isArray(a.photos))return{seed,photos:a.photos.filter(p=>p&&typeof p.src==='string'&&Number.isFinite(p.year)).slice(-ALBUM_MAX)};}catch{}
 return{seed,photos:[]};
}
// Picks the event worth a photo, if any: big turning points always, smaller moments at most every twenty years.
export function albumMoment(album,entries){
 const last=album.photos[album.photos.length-1]?.year??-99;
 const pick=entries.filter(e=>ALBUM_TYPES.has(e.type)).sort((a,b)=>(b.priority||0)-(a.priority||0))[0];
 if(!pick)return null;
 if((pick.priority||0)<88&&pick.year-last<20)return null;
 return pick;
}
export const albumCaption=text=>{const first=String(text||'').split(/(?<=[.!?])\s/)[0];return first.length>110?`${first.slice(0,107)}…`:first;};
export function addPhoto(album,photo){
 album.photos.push(photo);
 // The very first photo always stays; after that the oldest snapshots make room.
 while(album.photos.length>ALBUM_MAX)album.photos.splice(1,1);
 return album;
}
export function snapshot(source,doc=document){
 const w=320,h=200,out=doc.createElement('canvas');out.width=w;out.height=h;
 const c=out.getContext('2d'),sw=source.width,sh=source.height;if(!c||!sw||!sh)return null;
 const crop=Math.min(sw,sh*w/h*.8),cropH=crop*h/w;
 c.drawImage(source,(sw-crop)/2,(sh-cropH)/2,crop,cropH,0,0,w,h);
 return out.toDataURL('image/jpeg',.72);
}

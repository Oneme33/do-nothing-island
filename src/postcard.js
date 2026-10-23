// Postcards from the island: a framed photo of the canvas, and a shareable card for the ending.
function drawFlag(c,id,x,y,w){
 const h=w*2/3;c.fillStyle=id.main;c.fillRect(x,y,w,h);c.fillStyle=id.second;c.globalAlpha=.75;
 if(id.stripe)c.fillRect(x,y+h*.75,w,h*.25);else c.fillRect(x,y,w*.2,h);c.globalAlpha=1;
 c.beginPath();c.arc(x+w/2,y+h*.45,h*.2,0,Math.PI*2);c.fill();
}
function paper(width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');
 c.fillStyle='#f7f4e8';c.fillRect(0,0,width,height);c.strokeStyle='#d9d2b8';c.lineWidth=2;c.strokeRect(14,14,width-28,height-28);
 return{canvas,c};
}
export function makePostcard(source,{identity,year,line}){
 const w=1500,h=1000,{canvas,c}=paper(w,h),pad=48,photoH=h-210;
 c.fillStyle='#dcebe4';c.fillRect(pad,pad,w-pad*2,photoH);
 const scale=Math.min((w-pad*2)/source.width,photoH/source.height),sw=source.width*scale,sh=source.height*scale;
 c.drawImage(source,pad+(w-pad*2-sw)/2,pad+(photoH-sh)/2,sw,sh);
 drawFlag(c,identity,pad,h-140,54);
 c.fillStyle='#293d32';c.font='48px Georgia, serif';c.fillText(`Groeten uit ${identity.name}`,pad+72,h-102);
 c.fillStyle='#6f7f61';c.font='22px sans-serif';c.fillText(`Jaar ${year} · ${line}`,pad+72,h-64);
 c.textAlign='right';c.fillText('Do Nothing Island',w-pad,h-64);
 return canvas;
}
function miniMap(c,land,x,y,size){
 c.fillStyle='#dbe7da';c.fillRect(x,y,size,size);c.fillStyle='#a8ba85';const cell=size/29;
 for(const id of land||[]){const [a,b]=id.split(',').map(Number);if(Math.abs(a)<=14&&Math.abs(b)<=14)c.fillRect(x+(a+14)*cell,y+(b+14)*cell,cell+.5,cell+.5);}
 c.fillStyle='#546f43';c.beginPath();c.arc(x+size/2,y+size/2,4,0,Math.PI*2);c.fill();
}
function wrap(c,text,x,y,width,lineHeight){
 const words=String(text).split(' ');let line='';
 for(const word of words){if(c.measureText(line+word).width>width&&line){c.fillText(line.trim(),x,y);y+=lineHeight;line='';}line+=word+' ';}
 c.fillText(line.trim(),x,y);return y;
}
// The end card: a real photo of the island, the verdict, three awards and a stamp of approval from the old tree.
export function makeEndCard({identity,title,quote,familyName,generations,seed,year,score,keur,before,after,link,photo,awards=[],stats=[]}){
 const w=1500,h=1000,{canvas,c}=paper(w,h);
 c.fillStyle='#dcebe4';c.fillRect(48,48,860,560);
 if(photo&&photo.width){const scale=Math.max(860/photo.width,560/photo.height),pw=photo.width*scale,ph=photo.height*scale;c.save();c.beginPath();c.rect(48,48,860,560);c.clip();c.drawImage(photo,48+(860-pw)/2,48+(560-ph)/2,pw,ph);c.restore();}
 c.strokeStyle='#fbf8ee';c.lineWidth=10;c.strokeRect(53,53,850,550);
 drawFlag(c,identity,950,60,64);c.fillStyle='#7b866e';c.font='600 18px sans-serif';c.fillText(`${identity.name.toUpperCase()} · JAAR ${year}`,1030,88);
 c.fillStyle='#293d32';c.font='48px Georgia, serif';wrap(c,title,950,170,500,52);
 c.fillStyle='#5c6c4e';c.font='italic 24px Georgia, serif';wrap(c,`“${quote}”`,950,260,500,32);
 miniMap(c,before,950,360,150);miniMap(c,after,1120,360,150);c.fillStyle='#7b866e';c.font='14px sans-serif';c.fillText('toen',950,530);c.fillText('nu',1120,530);
 // The inspection medal, in the colour of its level.
 c.fillStyle=keur?.level?.color||'#e2c26a';c.beginPath();c.ellipse(1360,445,62,62,0,0,Math.PI*2);c.fill();c.fillStyle='#293d32';c.textAlign='center';c.font='bold 40px Georgia, serif';c.fillText(String(score),1360,452);c.font='13px sans-serif';c.fillText('VAN 100',1360,475);if(keur){c.font='italic 18px Georgia, serif';c.fillText(keur.level.title,1360,535);c.font='13px sans-serif';c.fillText(`${keur.done} van ${keur.items} dingen erop en eraan`,1360,558);}c.textAlign='left';
 c.fillStyle='#293d32';c.font='600 16px sans-serif';c.fillText('PRIJZEN',60,660);
 awards.slice(0,3).forEach((a,i)=>{c.fillStyle='#8a7552';c.font='600 20px sans-serif';c.fillText(`🏆 ${a.text}`,60,700+i*58);c.fillStyle='#5f6a5e';c.font='17px sans-serif';wrap(c,a.sub,92,724+i*58,780,20);});
 c.fillStyle='#293d32';c.font='600 16px sans-serif';c.fillText('IN CIJFERS',950,600);
 stats.slice(0,4).forEach((st,i)=>{c.fillStyle='#5f6a5e';c.font='17px sans-serif';c.fillText(`${st.text}: ${st.sub}`,950,636+i*30);});
 c.fillStyle='#293d32';c.font='20px sans-serif';c.fillText(`Familie ${familyName} · ${generations} generaties`,950,790);
 c.fillStyle='#6f7f61';c.font='17px sans-serif';c.fillText(`Speel hetzelfde eiland: seed ${seed}`,950,830);if(link)c.fillText(link,950,856);
 // The stamp.
 c.save();c.translate(1330,900);c.rotate(-.14);c.strokeStyle='#a5483c';c.lineWidth=4;c.strokeRect(-150,-38,300,76);c.fillStyle='#a5483c';c.textAlign='center';c.font='bold 18px sans-serif';c.fillText('GOEDGEKEURD DOOR',0,-6);c.fillText('DE OUDE BOOM',0,20);c.restore();
 c.fillStyle='#6f7f61';c.font='16px sans-serif';c.fillText('Do Nothing Island',60,h-50);
 return canvas;
}
export function downloadCanvas(canvas,filename){
 canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');
}

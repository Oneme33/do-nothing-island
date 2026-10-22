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
export function makeEndCard({identity,title,quote,familyName,generations,seed,year,score,before,after,link}){
 const w=1200,h=675,{canvas,c}=paper(w,h);
 drawFlag(c,identity,60,56,60);c.fillStyle='#7b866e';c.font='600 16px sans-serif';c.fillText(`${identity.name.toUpperCase()} · JAAR ${year}`,136,82);
 c.fillStyle='#293d32';c.font='54px Georgia, serif';c.fillText(title,60,170);
 c.fillStyle='#5c6c4e';c.font='italic 26px Georgia, serif';wrap(c,`“${quote}”`,60,222,560,34);
 miniMap(c,before,700,70,220);miniMap(c,after,940,70,220);
 c.fillStyle='#7b866e';c.font='15px sans-serif';c.fillText('Het begin',700,315);c.fillText('Het eiland dat zij maakten',940,315);
 c.fillStyle='#293d32';c.font='22px sans-serif';
 c.fillText(`Familie ${familyName} · ${generations} generaties`,60,420);c.fillText(`Eilandscore ${score} / 100`,60,460);
 c.fillStyle='#6f7f61';c.font='18px sans-serif';c.fillText(`Speel hetzelfde eiland: seed ${seed}`,60,560);if(link)c.fillText(link,60,590);
 c.textAlign='right';c.fillText('Do Nothing Island',w-60,h-50);
 return canvas;
}
export function downloadCanvas(canvas,filename){
 canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');
}

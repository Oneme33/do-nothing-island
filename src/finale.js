const score100=n=>Math.round(Math.max(0,Math.min(100,n)));
// Five scores of 0–100 that can all reach 100 together. Wishes that residents asked for never count as interfering.
export const SCORE_RECIPE='Zo haal je 100: grijp alleen in als iemand erom vraagt (een vraagteken), help veel wensen zodat er feesten zijn, laat het eiland groen en schoon, zorg dat ze minstens drie rampen te boven komen (bliksem, hoog water of een brand die op verzoek geblust wordt) zonder ruïnes aan het einde, en laat ze lang genoeg bouwen voor al hun speciale gebouwen.';
export function scoreInputs(s){
 const helped=(s.wishes?.history||[]).filter(w=>w.status==='helped').length;
 return{helped,unrequested:Math.max(0,(s.interferences||0)-helped),ownDependence:Math.max(0,(s.influence?.dependence||0)-helped*1.5),recovered:(s.rebuiltFires||0)+s.land.filter(t=>t.floodMemorial).length,ruins:s.land.filter(t=>t.building==='ruins').length,parties:s.partiesHeld||0,delights:s.land.filter(t=>['museum','circus','station','pool','spaceport','zoo','theme-park','petting-farm','observatory','ice-cream','greenhouse'].includes(t.building)).length};
}
export function islandScores(s){
 const k=scoreInputs(s),cap=v=>Math.min(1,Math.max(0,v));
 const living=score100(100*(.4*cap(s.food/Math.max(1,s.population)/2)+.3*cap(s.freshwater/70)+.3*cap(s.prosperity/60)));
 const nature=score100(100*(.7*cap(s.environment/85)+.3*cap((100-s.pollution)/70)));
 const independent=score100(100-Math.min(60,k.unrequested*8)-Math.min(40,Math.max(0,k.ownDependence-3)*3));
 const resilience=score100(40+Math.min(40,k.recovered*14)+(k.ruins?0:20));
 const culture=score100(Math.min(50,s.recreation.length*4)+Math.min(30,k.parties*6)+Math.min(20,k.delights*2));
 const values={leefbaarheid:living,natuur:nature,zelfstandigheid:independent,veerkracht:resilience,cultuur:culture};
 return {values,total:score100(Object.values(values).reduce((a,b)=>a+b,0)/5)};
}
// What each score means, in plain words, with a short verdict for the value.
const SCORE_MEANING={
 leefbaarheid:['Eten, water en welvaart voor iedereen',['Het was vaak krap.','De meeste mensen kwamen goed rond.','Iedereen had het goed.']],
 natuur:['Hoe groen en schoon het eiland bleef',['Er bleef weinig natuur over.','Een redelijk groen eiland.','Een levend, schoon landschap.']],
 zelfstandigheid:['Hoeveel ze zelf deden; gevraagde hulp telt niet mee',['Ze leunden flink op jou.','Soms hielp je een handje.','Ze deden bijna alles zelf.']],
 veerkracht:['Rampen die ze te boven kwamen, zonder ruïnes aan het einde',['Elke ramp bleef lang zichtbaar.','Ze herstelden op eigen tempo.','Na elke ramp stonden ze sterker op.']],
 cultuur:['Parken, feesten en speciale gebouwen',['Weinig tijd voor plezier.','Er was genoeg te doen.','Een eiland vol leven en feest.']]
};
export function explainScore(name,value){const [what,verdicts]=SCORE_MEANING[name]||['',['','','']];return{what,verdict:verdicts[value>=70?2:value>=45?1:0]};}
export function drawFinale(c,w,h,s,m,reduced=false){
 if(!m)return;const t=reduced?Math.floor(m.elapsed/6)*6:m.elapsed,id=m.id;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.fillStyle='#dfebe0';c.fillRect(0,0,w,h);
 const scale=Math.min(w/600,h/320);c.save();c.translate(w/2,h*.62);c.scale(scale,scale);
 const ellipse=(x,y,a,b,color)=>{c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
 const line=(x,y,a,b,color,width=2)=>{c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
 const rect=(x,y,a,b,color)=>{c.fillStyle=color;c.fillRect(x,y,a,b);};
 const poly=(points,color)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
 const house=(x,y,i)=>{rect(x-17,y-25,34,28,'#e8ddbd');poly([[x-22,y-24],[x,y-45],[x+22,y-24]],i%2?'#ae785d':'#98a183');rect(x-4,y-11,8,14,'#8d9b81');rect(x+7,y-19,5,6,'#a2c7bd');};
 const person=(x,y,i)=>{const bounce=Math.sin(t*3+i)*2;ellipse(x,y,7,2,'#70876d33');line(x-2,y,x-3,y-7+bounce,'#817c5b');line(x+2,y,x+4,y-7+bounce,'#817c5b');rect(x-4,y-16+bounce,8,10,['#be8f69','#8da98b','#c4ad70'][i%3]);ellipse(x,y-20+bounce,4,4,'#dfbd8d');};
 const lift=id==='independent'?Math.max(0,t-9)*3:0;
 ellipse(0,42,210,31,'#9db7a04d');c.save();c.translate(0,-lift);
 poly([[-220,9],[0,76],[220,9],[0,-64]],'#92aa77');poly([[-220,9],[0,76],[0,94],[-220,28]],'#b6a47a');poly([[0,76],[220,9],[220,28],[0,94]],'#9d9976');
 const progress=Math.min(1,t/10);
 for(let i=0;i<5;i++){const x=(i-2)*66,y=Math.abs(i-2)*-10;if(id==='phoenix'){c.save();c.translate(x,y+30*(1-progress));c.scale(1,progress||.01);house(0,0,i);c.restore();}else house(x,y,i);}
 if(id==='sanctuary')for(let i=0;i<7;i++){const x=(i-3)*49,y=-45-(i%2)*24;rect(x-3,y-30,6,35,'#9e8862');ellipse(x,y-41,17,21,'#7f9f70');ellipse(x-10,y-33,14,15,'#96ae7a');}
 if(id==='independent')for(let i=0;i<4;i++){const x=(i-1.5)*100,y=-100-Math.sin(t+i)*5;line(x,y+20,x*.8,20,'#a48c64');ellipse(x,y,24,32,['#c58b70','#d4b966','#8da99b','#c3bd83'][i]);}
 if(id==='fortress'){for(let i=0;i<5;i++){const x=(i-2)*66;rect(x-20,3,40,5,'#a7a48c');}line(-170,-78,170,-78,'#a08d66',1);for(let i=0;i<11;i++){const x=-165+i*32;poly([[x,-78],[x+17,-78],[x+8,-64]],i%2?'#b78d64':'#d1b66b');}}
 if(id==='miracles'){rect(-12,-122,24,62,'#c5a461');ellipse(0,-132,22,22,'#ddc583');for(let i=0;i<8;i++){const a=t*.2+i*Math.PI/4;line(Math.cos(a)*32,-132+Math.sin(a)*32,Math.cos(a)*42,-132+Math.sin(a)*42,'#c8ab64',3);}}
 for(let i=0;i<9;i++)person((i-4)*23,39+Math.sin(i)*6,i);
 if(id==='last-drop'){line(170,-112,170,-49,'#a1a68d',14);line(170,-112,218,-112,'#a1a68d',14);line(218,-112,218,-88,'#a1a68d',14);ellipse(218,-24,18,5,'#bcb18f');if(t<18)ellipse(218,-78+((t*.6)%1)*48,3,5,'#82b6af');else{line(204,-61,231,-49,'#aa775b',2);line(231,-61,204,-49,'#aa775b',2);}}
 c.restore();
 if(id==='retreat')for(let i=0;i<3;i++){const x=-200+((t*13+i*135)%450),y=91+i*14;poly([[x-19,y],[x+19,y],[x+10,y+10],[x-10,y+10]],'#ac9770');person(x,y-1,i);line(x,y,x,y-34,'#9f926b',1);poly([[x+1,y-32],[x+1,y-5],[x+19,y-8]],'#f1e4ba');}
 if(t>11&&id!=='last-drop')for(let i=0;i<22;i++){const x=((i*83+t*13)%500)-250,y=((i*49+t*23)%190)-180;rect(x,y,3,5,['#c89c64','#9aaf82','#ca9276'][i%3]);}
 c.restore();
}

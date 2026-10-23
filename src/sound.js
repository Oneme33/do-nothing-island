// A soundscape that grows with the island, synthesised in the browser: no audio files.
export class Soundscape{
 constructor(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('unavailable');
  this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.9;this.master.connect(this.ctx.destination);
  this.enabled=false;this.next={};this.brown=this.noise(4,true);this.white=this.noise(2,false);this.sea();
 }
 noise(seconds,brown){
  const b=this.ctx.createBuffer(1,this.ctx.sampleRate*seconds,this.ctx.sampleRate),d=b.getChannelData(0);let last=0;
  for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(brown){last=(last+.02*w)/1.02;d[i]=last*3.5;}else d[i]=w;}
  return b;
 }
 sea(){
  const c=this.ctx,src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),lfo=c.createOscillator(),depth=c.createGain();
  src.buffer=this.brown;src.loop=true;filter.type='lowpass';filter.frequency.value=450;gain.gain.value=.22;this.seaGain=gain;
  lfo.frequency.value=.13;depth.gain.value=.055;lfo.connect(depth).connect(gain.gain);src.connect(filter).connect(gain).connect(this.master);src.start();lfo.start();
 }
 async start(){await this.ctx.resume();this.enabled=true;}
 async stop(){await this.ctx.suspend();this.enabled=false;}
 pause(){if(this.ctx.state==='running')this.ctx.suspend();}
 resume(){if(this.enabled)this.ctx.resume();}
 tone(freq,duration,{type='sine',volume=.05,delay=0,to=null}={}){
  const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+duration);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.05);
 }
 hiss(duration,{volume=.05,delay=0,filter='lowpass',frequency=800,attack=.02}={}){
  const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.white;f.type=filter;f.frequency.value=frequency;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g).connect(this.master);s.start(t,Math.random());s.stop(t+duration+.05);
 }
 // Called a few times a second with the island's state; each layer keeps its own loose rhythm.
 // close: 0 when the whole island is in view, 1 when zoomed right in. Closer means more town and less sea.
 update({night=false,year=1,building=false,close=0}={}){
  if(!this.enabled)return;
  const now=this.ctx.currentTime,quiet=night?.4:1,due=(key,gap)=>{if((this.next[key]||0)>now)return false;this.next[key]=now+gap*(.6+Math.random()*.8);return true;};
  this.master.gain.setTargetAtTime(night?.6:.9,now,1.5);this.seaGain?.gain.setTargetAtTime(.22*(1-.65*close),now,1);
  if(!night&&due('birds',4.5-close*2))this.bird(close);
  if(night&&due('owl',14)){this.tone(380,.35,{volume:.03,to:350});this.tone(380,.5,{volume:.03,delay:.55,to:330});}
  if(close>.25&&due('voices',2.2))this.hiss(1.6,{volume:.025*close*quiet,filter:'bandpass',frequency:500+Math.random()*500,attack:.4});
  if(close>.3&&!night&&due('steps',1.4)){if(year>=600&&year<1920){for(let i=0;i<4;i++)this.hiss(.04,{volume:.05*close,delay:i*.18,filter:'bandpass',frequency:1100,attack:.002});}else for(let i=0;i<3;i++)this.hiss(.03,{volume:.03*close,delay:i*.25,filter:'highpass',frequency:2400,attack:.002});}
  if(close>.3&&year>=1955&&due('cars',3))this.hiss(1.8,{volume:.04*close*quiet,frequency:200,attack:.7});
  if(building&&!night&&due('hammer',3))for(let i=0;i<2;i++)this.hiss(.06,{volume:.07,delay:i*.32,filter:'bandpass',frequency:1800,attack:.003});
  if(year>=600&&due('bell',50))for(const [f,v] of [[523,.05],[1046,.02],[784,.015]])this.tone(f,3,{volume:v*quiet});
  if(year>=1860&&year<1990&&!night&&due('tram',35)){this.tone(880,.35,{volume:.035});this.tone(1175,.35,{volume:.03,delay:.18});}
  if(year>=1920&&due('traffic',7))this.hiss(2.4,{volume:.03*quiet,frequency:260,attack:.9});
  if(night&&due('crickets',2.5))for(let i=0;i<4;i++)this.tone(4300,.035,{type:'square',volume:.01,delay:i*.07});
 }
 // A cheerful little tune, once at the start of each party.
 festive(key){
  if(!this.enabled||this.lastParty===key)return;this.lastParty=key;
  const tune=[523,659,784,659,698,880,784,659,587,698,659,523];tune.forEach((f,i)=>this.tone(f,.28,{type:'triangle',volume:.025,delay:i*.26}));
  for(let i=0;i<6;i++)this.tone(131,.18,{volume:.03,delay:i*.52});
 }
 bird(close){
  const kind=['song','blackbird','sparrow','cuckoo','woodpecker','gull','gull'][Math.floor(Math.random()*(close>.5?5:7))];
  if(kind==='song'){const b=2600+Math.random()*900;for(let i=0;i<7;i++)this.tone(i%2?b*1.18:b,.06,{volume:.025,delay:i*.07});}
  else if(kind==='blackbird'){[1568,1760,1397,1975,1568].forEach((f,i)=>this.tone(f*(.95+Math.random()*.1),.16,{volume:.025,delay:i*.18,to:f*1.08}));}
  else if(kind==='sparrow'){for(let i=0;i<3;i++)this.tone(3200+Math.random()*600,.05,{volume:.022,delay:i*.11});}
  else if(kind==='cuckoo'){this.tone(659,.28,{volume:.03});this.tone(523,.4,{volume:.03,delay:.34});}
  else if(kind==='woodpecker'){for(let i=0;i<9;i++)this.hiss(.02,{volume:.05,delay:i*.045,filter:'bandpass',frequency:900,attack:.001});}
  else{for(let i=0;i<2;i++)this.tone(1200,.3,{type:'sawtooth',volume:.008,delay:i*.35,to:700});}
 }
 play(type){
  if(!this.enabled)return;
  if(type==='rain'){this.hiss(2.2,{volume:.07,filter:'highpass',frequency:1400,attack:.3});for(let i=0;i<6;i++)this.tone(1800+Math.random()*900,.05,{volume:.01,delay:Math.random()*1.6});}
  else if(type==='rumble'){this.tone(48,1.4,{volume:.12,to:34});this.hiss(1.2,{volume:.06,frequency:140,attack:.05});}
  else if(type==='fire'){this.hiss(1.4,{volume:.035,filter:'bandpass',frequency:900,attack:.2});for(let i=0;i<10;i++)this.hiss(.03,{volume:.04,delay:Math.random()*1.3,filter:'highpass',frequency:2500,attack:.002});}
  else if(type==='nudge'||type==='repair'){[659,784,988].forEach((f,i)=>this.tone(f,.5,{volume:.03,delay:i*.09}));}
  else if(type==='treasure'){[1047,1319,1568,2093].forEach((f,i)=>this.tone(f,.4,{type:'triangle',volume:.025,delay:i*.07}));}
  else if(type==='horn'){this.tone(98,2.2,{type:'sawtooth',volume:.018,to:92});this.tone(147,2,{type:'triangle',volume:.014,to:139});}
  else if(type==='whoosh'){this.hiss(2.4,{volume:.05,filter:'bandpass',frequency:600,attack:.8});}
  else if(type==='chime'){[1319,1568,1976].forEach((f,i)=>this.tone(f,1.4,{volume:.02,delay:i*.22}));}
  else if(type==='fanfare'){[[523,0],[659,.12],[784,.24],[1047,.4]].forEach(([f,d])=>this.tone(f,d===.4?.7:.18,{type:'triangle',volume:.03,delay:d}));}
  else if(type==='century'){for(let i=0;i<4;i++){this.tone(392,2.2,{volume:.045,delay:i*1.1});this.tone(784,1.6,{volume:.015,delay:i*1.1});}}
  else if(type==='age'){[392,523,659,784].forEach((f,i)=>this.tone(f,1.1,{type:'triangle',volume:.03,delay:i*.28}));}
 }
}

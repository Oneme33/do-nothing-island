// A soundscape that grows with the island, synthesised in the browser: no audio files.
// The music never repeats a tune: each age has its own instrument, chords and scale, and a phrase now and then.
export const ERA_MUSIC=[
 {name:'begin',root:130.81,scale:[0,2,4,7,9],chords:[[0,7],[5,12],[-3,4],[0,7]],pad:'sine',lead:'flute',octave:2,gap:1.25},
 {name:'oude wereld',root:146.83,scale:[0,2,3,5,7,9,10],chords:[[0,3,7],[5,9,12],[3,7,10],[-2,5,10]],pad:'triangle',lead:'lute',octave:2,gap:1},
 {name:'stoomtijd',root:174.61,scale:[0,2,4,5,7,9,11],chords:[[0,4,7],[5,9,12],[-3,4,9],[7,11,14]],pad:'triangle',lead:'musicbox',octave:3,gap:.9},
 {name:'moderne tijd',root:155.56,scale:[0,2,4,7,9,11],chords:[[0,4,7,11],[-3,4,7,12],[5,9,12,16],[7,11,14,17]],pad:'sine',lead:'epiano',octave:2,gap:1.1},
 {name:'toekomst',root:110,scale:[0,2,4,6,7,9,11],chords:[[0,7,14],[2,9,14],[5,12,16],[4,11,16]],pad:'sine',lead:'glass',octave:3,gap:1.3}
];
const semis=(root,n)=>root*Math.pow(2,n/12);
export class Soundscape{
 constructor(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('unavailable');
  this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.9;this.master.connect(this.ctx.destination);
  // Two buses: effects and ambience on one, music (softened by a gentle low-pass) on the other.
  this.sfx=this.ctx.createGain();this.sfx.connect(this.master);
  this.musicBus=this.ctx.createGain();this.musicBus.gain.value=.5;const warm=this.ctx.createBiquadFilter();warm.type='lowpass';warm.frequency.value=2400;this.musicBus.connect(warm).connect(this.master);
  this.musicStep=0;this.melody=0;
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
  lfo.frequency.value=.13;depth.gain.value=.055;lfo.connect(depth).connect(gain.gain);src.connect(filter).connect(gain).connect(this.sfx);src.start();lfo.start();
 }
 async start(){await this.ctx.resume();this.enabled=true;}
 async stop(){await this.ctx.suspend();this.enabled=false;}
 pause(){if(this.ctx.state==='running')this.ctx.suspend();}
 resume(){if(this.enabled)this.ctx.resume();}
 // Volumes from 0 to 1; music sits well under the island's own sounds.
 setVolumes({music=.5,effects=1}={}){const now=this.ctx.currentTime;this.musicBus.gain.setTargetAtTime(Math.max(0,Math.min(1,music))*.9,now,.3);this.sfx.gain.setTargetAtTime(Math.max(0,Math.min(1,effects)),now,.3);}
 tone(freq,duration,{type='sine',volume=.05,delay=0,to=null,bus=null}={}){
  const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+duration);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(bus||this.sfx);o.start(t);o.stop(t+duration+.05);
 }
 hiss(duration,{volume=.05,delay=0,filter='lowpass',frequency=800,attack=.02}={}){
  const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.white;f.type=filter;f.frequency.value=frequency;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g).connect(this.sfx);s.start(t,Math.random());s.stop(t+duration+.05);
 }
 // A slow swell for chords: long attack and release, two slightly detuned voices.
 pad(freq,duration,{type='sine',volume=.012,delay=0,attack=2.4}={}){
  const c=this.ctx,t=c.currentTime+delay,g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+attack);g.gain.setValueAtTime(volume,t+Math.max(attack,duration-2.5));g.gain.linearRampToValueAtTime(0,t+duration);g.connect(this.musicBus);
  for(const detune of [-4,4]){const o=c.createOscillator();o.type=type;o.frequency.value=freq;o.detune.value=detune;o.connect(g);o.start(t);o.stop(t+duration+.1);}
 }
 // One melody note, in the voice of the age.
 lead(kind,freq,{delay=0,volume=.02}={}){
  const c=this.ctx,t=c.currentTime+delay,bus=this.musicBus;
  if(kind==='flute'){const o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),depth=c.createGain();o.frequency.value=freq;lfo.frequency.value=5;depth.gain.value=freq*.006;lfo.connect(depth).connect(o.frequency);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.18);g.gain.linearRampToValueAtTime(volume*.7,t+.8);g.gain.linearRampToValueAtTime(0,t+1.4);o.connect(g).connect(bus);o.start(t);lfo.start(t);o.stop(t+1.5);lfo.stop(t+1.5);}
  else if(kind==='lute'){this.tone(freq,1.3,{type:'triangle',volume,delay,bus});this.tone(freq*2,.5,{volume:volume*.25,delay,bus});}
  else if(kind==='musicbox'){this.tone(freq,1.6,{volume,delay,bus});this.tone(freq*4,.4,{volume:volume*.18,delay,bus});}
  else if(kind==='epiano'){this.tone(freq,2.2,{volume,delay,bus});this.tone(freq*2,1,{volume:volume*.3,delay,bus});this.tone(freq*1.003,2,{volume:volume*.5,delay,bus});}
  else{this.pad(freq,2.6,{volume:volume*.9,delay,attack:.5});this.tone(freq*2,1.8,{volume:volume*.25,delay:delay+.05,bus});}
 }
 // Every chord change: a soft pad and, now and then, a short wandering phrase. Night plays less and lower.
 music(era,night){
  const now=this.ctx.currentTime;if((this.next.music||0)>now)return;
  const m=ERA_MUSIC[Math.max(0,Math.min(ERA_MUSIC.length-1,era))],chord=m.chords[this.musicStep%m.chords.length],length=(7.5+Math.random()*2.5)*m.gap;
  this.next.music=now+length;this.musicStep++;
  const quiet=night?.55:1;
  for(const n of chord)this.pad(semis(m.root,n),length+2.5,{type:m.pad,volume:.011*quiet});
  if(Math.random()<(night?.3:.62)){
   const notes=3+Math.floor(Math.random()*3),step=(.42+Math.random()*.3)*m.gap;
   for(let i=0;i<notes;i++){this.melody=Math.max(0,Math.min(m.scale.length*2-1,this.melody+[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)]));
    const degree=this.melody%m.scale.length,octave=Math.floor(this.melody/m.scale.length)+m.octave;
    this.lead(m.lead,semis(m.root,m.scale[degree]+12*(octave-1)),{delay:1.2+i*step,volume:.018*quiet});}
  }
 }
 // Called a few times a second with the island's state; each layer keeps its own loose rhythm.
 // close: 0 when the whole island is in view, 1 when zoomed right in. Closer means more town and less sea.
 update({night=false,year=1,building=false,close=0,era=0,storm=false}={}){
  if(!this.enabled)return;
  this.music(era,night);
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
  if(storm&&due('wind',3))this.hiss(3.4,{volume:.05,filter:'bandpass',frequency:380+Math.random()*200,attack:1.2});
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
  if(type==='rain'){
   // A shower: soft hiss rising and falling, a lower patter underneath, and drops that land on leaves and roofs.
   this.hiss(3.6,{volume:.06,filter:'highpass',frequency:1800,attack:.9});this.hiss(3.2,{volume:.04,filter:'bandpass',frequency:700,attack:1.1});
   for(let i=0;i<18;i++){const f=2400+Math.random()*1600;this.tone(f,.06,{volume:.008+Math.random()*.008,delay:.2+Math.random()*3,to:f*.6});}
  }
  else if(type==='rumble'){
   // A deep thud, a rolling growl and two small aftershocks.
   this.tone(55,2.2,{volume:.13,to:30});this.tone(82,1.2,{type:'triangle',volume:.05,to:41});this.hiss(2,{volume:.07,frequency:120,attack:.08});
   for(const d of [1.4,2.1])this.tone(46,.5,{volume:.07,delay:d,to:34});for(let i=0;i<6;i++)this.hiss(.05,{volume:.03,delay:.3+Math.random()*1.4,filter:'bandpass',frequency:1400,attack:.002});
  }
  else if(type==='fire'){
   // A whoosh as it catches, then crackles and pops.
   this.hiss(.9,{volume:.05,filter:'bandpass',frequency:500,attack:.15});this.hiss(2.6,{volume:.03,filter:'bandpass',frequency:1100,attack:.5});
   for(let i=0;i<22;i++)this.hiss(.02+Math.random()*.03,{volume:.03+Math.random()*.04,delay:.2+Math.random()*2.4,filter:'highpass',frequency:2000+Math.random()*2500,attack:.001});
  }
  else if(type==='nudge'||type==='repair'){for(let i=0;i<3;i++)this.hiss(.05,{volume:.06,delay:i*.14,filter:'bandpass',frequency:1100,attack:.002});[659,784,988].forEach((f,i)=>this.tone(f,.6,{volume:.025,delay:.45+i*.09}));}
  else if(type==='wish'){this.tone(1319,.5,{volume:.018});this.tone(1976,.7,{volume:.014,delay:.16});}
  else if(type==='flood'){this.hiss(3,{volume:.07,frequency:320,attack:.6});this.hiss(2.4,{volume:.03,filter:'bandpass',frequency:900,attack:.8,delay:.4});}
  else if(type==='treasure'){[1047,1319,1568,2093].forEach((f,i)=>this.tone(f,.4,{type:'triangle',volume:.025,delay:i*.07}));}
  else if(type==='horn'){this.tone(98,2.2,{type:'sawtooth',volume:.018,to:92});this.tone(147,2,{type:'triangle',volume:.014,to:139});}
  else if(type==='whoosh'){this.hiss(2.4,{volume:.05,filter:'bandpass',frequency:600,attack:.8});}
  else if(type==='chime'){[1319,1568,1976].forEach((f,i)=>this.tone(f,1.4,{volume:.02,delay:i*.22}));}
  else if(type==='fanfare'){[[523,0],[659,.12],[784,.24],[1047,.4]].forEach(([f,d])=>this.tone(f,d===.4?.7:.18,{type:'triangle',volume:.03,delay:d}));}
  else if(type==='century'){for(let i=0;i<4;i++){this.tone(392,2.2,{volume:.045,delay:i*1.1});this.tone(784,1.6,{volume:.015,delay:i*1.1});}}
  else if(type==='age'){[392,523,659,784].forEach((f,i)=>this.tone(f,1.1,{type:'triangle',volume:.03,delay:i*.28}));}
 }
}

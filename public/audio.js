// Original, synthesized loop. No audio downloads, trackers, or autoplay.
(() => {
  let context, master, draftLayer, boardLayer, tick, nextBeat=0, beat=0, enabled=false, uploaded=null, fileURL=null,stage='lobby';
  let volume=.18;
  try { volume=JSON.parse(localStorage.getItem('sweep-volume')) ?? .18; } catch {}
  volume=Math.max(0,Math.min(1,Number(volume)||0));
  const midi=n=>440*2**((n-69)/12);
  function note(n,time,length,gain=.1,type='sine',destination=master) {
    const osc=context.createOscillator(),envelope=context.createGain();
    osc.type=type;osc.frequency.value=midi(n);envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(gain,time+.025);envelope.gain.exponentialRampToValueAtTime(.0001,time+length);
    osc.connect(envelope);envelope.connect(destination);osc.start(time);osc.stop(time+length+.03);
  }
  function schedule() {
    if(!enabled||uploaded||!context)return;
    while(nextBeat<context.currentTime+.18){
      const chords=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]],bar=Math.floor(beat/8)%4,step=beat%8;
      if(step===0){for(const n of chords[bar].slice(1))note(n,nextBeat,2.4,.035,'triangle');note(chords[bar][0]-12,nextBeat,.7,.13);}
      if(step===4)note(chords[bar][0]-12,nextBeat,.5,.09);
      const melody=[72,null,76,79,null,76,74,null,72,null,69,72,null,76,72,null,69,null,72,77,null,76,72,null,71,null,74,79,null,74,71,null];
      const n=melody[beat%melody.length];if(n!==null)note(n,nextBeat,.38,.065,'sine');
      // Both layers share the base harmony and clock; gain ramps crossfade them.
      const chord=chords[bar];note(chord[1+step%3]+12,nextBeat,.22,.048,'triangle',draftLayer);
      if(step%2===0){note(chord[step%2]+12,nextBeat,.14,.022,'square',boardLayer);note(chord[0]-12,nextBeat,.12,.065,'triangle',boardLayer);}
      if(step===2||step===6)note(89,nextBeat,.055,.014,'triangle',boardLayer);
      beat++;nextBeat+=60/88/2;
    }
  }
  function render() {
    const status=document.getElementById('music-status'),toggle=document.getElementById('music-toggle');
    if(status)status.textContent=uploaded?uploaded.name:'Original soft synth loop · '+(stage==='draft'?'draft instruments':['playing','preparing'].includes(stage)?'board instruments':'base instruments');
    if(toggle){toggle.textContent=enabled?'Pause music':'Play music';toggle.setAttribute('aria-pressed',String(enabled));}
    const header=document.getElementById('music-button');if(header)header.textContent=enabled?'♫ Music on':'♫ Music';
  }
  async function start() {
    if(uploaded){await uploaded.audio.play();enabled=true;}
    else{
      if(!context){context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.connect(context.destination);draftLayer=context.createGain();boardLayer=context.createGain();draftLayer.connect(master);boardLayer.connect(master);draftLayer.gain.value=stage==='draft'?1:0;boardLayer.gain.value=['playing','preparing'].includes(stage)?1:0;}
      await context.resume();master.gain.value=volume;enabled=true;nextBeat=context.currentTime+.04;beat=0;
      clearInterval(tick);schedule();tick=setInterval(schedule,100);
    }
    render();
  }
  function stop(){enabled=false;clearInterval(tick);if(context)context.suspend();if(uploaded)uploaded.audio.pause();render();}
  window.SweepMusic={setStage(value){stage=value;if(context){const at=context.currentTime;for(const [layer,target]of [[draftLayer,stage==='draft'?1:0],[boardLayer,['playing','preparing'].includes(stage)?1:0]]){layer.gain.cancelScheduledValues(at);layer.gain.setTargetAtTime(target,at,.22);}}render();}};
  window.addEventListener('DOMContentLoaded',()=>{
    const dialog=document.getElementById('music-dialog');
    document.getElementById('music-button').onclick=()=>dialog.showModal();
    document.getElementById('close-music').onclick=()=>dialog.close();
    document.getElementById('music-toggle').onclick=async()=>{
      try{if(enabled)stop();else await start();}catch{document.getElementById('music-status').textContent='Unable to play audio in this browser.';}
    };
    const slider=document.getElementById('music-volume');slider.value=Math.round(volume*100);
    slider.oninput=()=>{volume=Number(slider.value)/100;if(master)master.gain.value=volume;if(uploaded)uploaded.audio.volume=volume;
      try{localStorage.setItem('sweep-volume',JSON.stringify(volume));}catch{}};
    document.getElementById('music-file').onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      const resume=enabled;stop();if(fileURL)URL.revokeObjectURL(fileURL);fileURL=URL.createObjectURL(file);
      const audio=new Audio(fileURL);audio.loop=true;audio.volume=volume;uploaded={audio,name:file.name};render();
      if(resume){try{await start();}catch{render();}}
    };
    document.getElementById('music-default').onclick=()=>{stop();if(fileURL)URL.revokeObjectURL(fileURL);fileURL=null;uploaded=null;document.getElementById('music-file').value='';render();};
    render();
  });
})();

// Turn cues have their own gain and remain available when music is paused.
(() => {
  let context, gain, enabled=true, volume=.18;
  try { enabled=JSON.parse(localStorage.getItem('sweep-turn-sounds'))??true;volume=JSON.parse(localStorage.getItem('sweep-volume'))??.18; } catch {}
  function unlock(){
    if(!context){context=new(window.AudioContext||window.webkitAudioContext)();gain=context.createGain();gain.connect(context.destination);}
    gain.gain.value=Math.max(0,Math.min(1,volume));context.resume().catch(()=>{});
  }
  function cue(kind,delay=0){
    if(!enabled||!context||context.state!=='running')return;
    const notes=kind==='your-start'?[[659,0,.11],[880,.13,.2]]:kind==='your-end'?[[523,0,.1],[330,.12,.14]]:[[392,0,.09]];
    const time=context.currentTime+delay;
    for(const [frequency,offset,length]of notes){const osc=context.createOscillator(),env=context.createGain();osc.type='sine';osc.frequency.value=frequency;env.gain.setValueAtTime(0,time+offset);env.gain.linearRampToValueAtTime(.35,time+offset+.012);env.gain.exponentialRampToValueAtTime(.0001,time+offset+length);osc.connect(env);env.connect(gain);osc.start(time+offset);osc.stop(time+offset+length+.02);}
  }
  function tone(frequency,end,length,type='sine',level=.22,delay=0){
    const time=context.currentTime+delay,osc=context.createOscillator(),env=context.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,time);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+length);env.gain.setValueAtTime(level,time);env.gain.exponentialRampToValueAtTime(.0001,time+length);osc.connect(env);env.connect(gain);osc.start(time);osc.stop(time+length+.02);return osc;
  }
  function effect(kind){
    if(!enabled||!context||context.state!=='running')return;
    if(kind==='boom'){tone(140,25,.4,'sawtooth',.25);tone(75,22,.45,'square',.12);const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.28),context.sampleRate),samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);const source=context.createBufferSource(),filter=context.createBiquadFilter(),env=context.createGain();source.buffer=noise;filter.type='lowpass';filter.frequency.value=850;env.gain.value=.25;source.connect(filter);filter.connect(env);env.connect(gain);source.start();}
    else if(kind==='zap'){const osc=tone(1800,130,.25,'sawtooth',.14),mod=context.createOscillator(),depth=context.createGain();mod.frequency.value=38;depth.gain.value=160;mod.connect(depth);depth.connect(osc.frequency);mod.start();mod.stop(context.currentTime+.28);}
    else if(kind==='hit'){tone(420,90,.12,'triangle',.4);tone(180,70,.09,'square',.1);}
    else if(kind==='shield'){tone(1200,1180,.5,'sine',.18);tone(1800,1760,.42,'sine',.13,.015);}
    else if(kind==='fanfare'){[523.25,659.25,783.99,1046.5].forEach((hz,i)=>tone(hz,hz,.24,'triangle',.2,i*.085));}
  }
  window.SweepAudio={cue,boom:()=>effect('boom'),zap:()=>effect('zap'),hit:()=>effect('hit'),shield:()=>effect('shield'),fanfare:()=>effect('fanfare')};
  document.addEventListener('pointerdown',unlock,{once:true});
  document.addEventListener('keydown',unlock,{once:true});
  window.addEventListener('DOMContentLoaded',()=>{
    const toggle=document.getElementById('turn-sounds');toggle.checked=enabled;
    toggle.onchange=()=>{enabled=toggle.checked;try{localStorage.setItem('sweep-turn-sounds',JSON.stringify(enabled));}catch{}if(enabled){unlock();cue('your-start');}};
    document.getElementById('music-volume').addEventListener('input',e=>{volume=Number(e.target.value)/100;if(gain)gain.gain.value=volume;});
  });
})();


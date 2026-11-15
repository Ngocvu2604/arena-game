import {options} from './settings'
type Track='title'|'selection'|'battle'|'victory'
const melodies:Record<Track,number[]> = {
  title:[50,57,53,57,48,55,52,55,46,53,50,53,45,52,49,52],
  selection:[53,57,60,57,51,55,58,55,50,53,57,53,48,52,55,52],
  battle:[43,43,50,46,43,50,55,53,41,41,48,45,39,46,38,45],
  victory:[50,57,62,65,69,65,62,57,48,55,60,64,67,64,60,55]
}
class Synth {
  private samples=new Map<string,AudioBuffer>()
  private ctx?: AudioContext
  private musicBus?: GainNode
  private effectsBus?: GainNode
  private timer = 0
  private index = 0
  private track:Track = 'title'
  enable() {
    try {
      if (!this.ctx) {
        const ctx=this.ctx=new AudioContext()
        this.musicBus=ctx.createGain(); this.musicBus.connect(ctx.destination)
        this.effectsBus=ctx.createGain(); this.effectsBus.connect(ctx.destination)
        for(const name of ['swing','swing2','swing3','magic1','spell','sword-unsheathe','metal-ringing']){
          void fetch(import.meta.env.BASE_URL+'assets/audio/'+name+'.wav')
            .then(response=>{if(!response.ok)throw new Error('Audio load');return response.arrayBuffer()})
            .then(buffer=>ctx.decodeAudioData(buffer)).then(buffer=>this.samples.set(name,buffer)).catch(()=>{})
        }
        this.timer=window.setInterval(()=>this.beat(),225)
      }
      if(this.ctx.state==='suspended') void this.ctx.resume().catch(()=>{})
      this.adjust()
    } catch { /* Audio is optional on unsupported devices. */ }
  }
  adjust() {
    if(!this.ctx || !this.musicBus || !this.effectsBus) return
    const s=options.current,m=s.mute?0:s.master*.01
    this.musicBus.gain.setTargetAtTime(m*s.music*.01,this.ctx.currentTime,.025)
    this.effectsBus.gain.setTargetAtTime(m*s.effects*.01,this.ctx.currentTime,.025)
  }
  select(track:Track) {
    if(this.track===track) return
    this.track=track; this.index=0
  }
  private beat() {
    if(!this.ctx || this.ctx.state!=='running' || document.hidden) return
    const melody=melodies[this.track]
    const note=melody[this.index++%melody.length]
    const hz=440*2**((note-69)/12)
    this.tone(hz,hz*.995,.32,.115,'triangle',true)
    if(this.index%4===1) this.tone(hz/2,hz/2,.77,.15,'sine',true)
    if(this.track==='battle'&&this.index%2===1) this.tone(94,37,.1,.13,'triangle',true)
  }
  play(name:string,tier=1) {
    const sample=({swing:'swing',hit:'sword-unsheathe',guard:'metal-ringing',dash:'swing3',cast:'magic1',
      'ultimate-kael':'swing2','ultimate-ren':'swing3','ultimate-aria':'spell','ultimate-darius':'sword-unsheathe'} as Record<string,string>)[name]
    const buffer=sample&&this.samples.get(sample)
    if(buffer&&this.ctx&&this.effectsBus){
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain()
      source.buffer=buffer;source.playbackRate.value=1+(tier-1)*.14
      gain.gain.value=name.startsWith('ultimate')?.55:.32
      source.connect(gain);gain.connect(this.effectsBus);source.start()
      source.onended=()=>{source.disconnect();gain.disconnect()}
      if(!name.startsWith('ultimate'))return
    }
    const ultimateNotes:Record<string,number[]>={
      'ultimate-kael':[196,247,294,392], 'ultimate-ren':[330,277,220,165],
      'ultimate-aria':[262,330,392,523], 'ultimate-darius':[98,73,55,36],
    }
    const notes=ultimateNotes[name]
    if(notes){
      notes.forEach((hz,index)=>this.tone(hz,hz*.75,.24,.2,name==='ultimate-aria'?'sine':'triangle',false,index*.1))
      return
    }
    const cues:Record<string,[number,number,number,number,OscillatorType]> = {
      hover:[390,420,.056,.095,'triangle'],confirm:[262,523,.16,.20,'triangle'],
      swing:[230,72,.12,.14,'sawtooth'],hit:[132,43,.14,.31,'triangle'],
      guard:[340,123,.12,.23,'square'],cast:[262,610,.23,.2,'sine'],
      dash:[240,88,.12,.16,'triangle'],land:[78,37,.12,.11,'triangle'],
      ultimate:[98,63,.53,.27,'sawtooth'],ko:[64,29,.58,.34,'triangle']
    }
    const cue=cues[name]
    if(cue) this.tone(...cue)
  }
  private tone(from:number,to:number,len:number,volume:number,type:OscillatorType,music=false,delay=0) {
    const ctx=this.ctx,bus=music?this.musicBus:this.effectsBus
    if(!ctx || !bus || ctx.state!=='running') return
    const t=ctx.currentTime+delay,osc=ctx.createOscillator(),env=ctx.createGain()
    osc.type=type; osc.frequency.setValueAtTime(from,t); osc.frequency.exponentialRampToValueAtTime(to,t+len)
    env.gain.setValueAtTime(.001,t); env.gain.exponentialRampToValueAtTime(volume,t+.019)
    env.gain.exponentialRampToValueAtTime(.001,t+len)
    osc.connect(env); env.connect(bus); osc.start(t); osc.stop(t+len+.015)
    osc.onended=()=>{osc.disconnect();env.disconnect()}
  }
  dispose() {
    clearInterval(this.timer)
    if(this.ctx) void this.ctx.close().catch(()=>{})
  }
}
export const audio=new Synth()



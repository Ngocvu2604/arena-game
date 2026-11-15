import Phaser from 'phaser'
import {options,type Quality,type Settings} from './settings'
export type Preset = Exclude<Quality,'Auto'>
export interface Capabilities {
  cores: number | null; memoryGB: number | null; webgl: boolean; renderer: string | null
  pixelRatio: number; width: number; height: number
}
export function detectCapabilities(): Capabilities {
  const canvas=document.createElement('canvas')
  const gl=canvas.getContext('webgl')
  let renderer:string|null=null
  if(gl){
    const debug=gl.getExtension('WEBGL_debug_renderer_info')
    if(debug) renderer=String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return {cores:navigator.hardwareConcurrency||null,
    memoryGB:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,
    webgl:!!gl,renderer,pixelRatio:devicePixelRatio,width:screen.width,height:screen.height}
}
export function presetFor(capabilities:Capabilities,frameMs=16.7):Preset {
  if(!capabilities.webgl||frameMs>27||(capabilities.cores!==null&&capabilities.cores<=2)||(capabilities.memoryGB!==null&&capabilities.memoryGB<=2))return 'Low'
  if(frameMs<19&&(capabilities.cores??4)>=8&&(capabilities.memoryGB??4)>=4)return 'High'
  return 'Medium'
}
export function applyPreset(settings:Settings,preset:Preset) {
  const data={
    Low:{particles:30,specialEffects:30,shake:20,background:false,resolution:1,performance:true},
    Medium:{particles:65,specialEffects:65,shake:50,background:true,resolution:1,performance:false},
    High:{particles:100,specialEffects:100,shake:75,background:true,resolution:1.5,performance:false},
  }
  Object.assign(settings,data[preset])
}
export const graphics={
  capabilities:null as Capabilities|null,
  recommended:'Medium' as Preset,
  effective:'Medium' as Preset,
  measuredFps:0,frameMs:0, samples:0,
  detect(){
    this.capabilities=detectCapabilities()
    this.recommended=presetFor(this.capabilities,this.frameMs||16.7)
    return this.recommended
  },
}
export function initializeGraphics() {
  graphics.detect()
  const preset=options.current.quality==='Auto'?graphics.recommended:options.current.quality
  graphics.effective=preset
  if(options.current.quality==='Auto')applyPreset(options.current,preset)
}
// Both paths run the same Phaser update loop. Only the rendered path draws a frame.
export class ArenaGame extends Phaser.Game {
  private nextRender=0
  private observed=0
  private sampleStart=0
  private sampleFrames=0
  private accumulatedMs=0
  private observedSteps=0
  private previousTime=0
  private slowWindows=0
  private nextAutoChange=0
  private readonly fpsElement=document.createElement('output')
  constructor(config:Phaser.Types.Core.GameConfig) {
    super(config)
    this.fpsElement.hidden=true
    this.fpsElement.id='fps'
    document.querySelector('#arena')?.append(this.fpsElement)
    this.events.once('destroy',()=>this.fpsElement.remove())
  }
  step(time:number,delta:number){
    if(!this.sampleStart)this.sampleStart=time
    const elapsed=this.previousTime?time-this.previousTime:delta
    this.previousTime=time
    if(elapsed>0&&elapsed<250){this.accumulatedMs+=elapsed;this.observedSteps++}
    const cap=options.current.fpsLimit
    const render=cap===0||time+0.5>=this.nextRender
    if(render){
      const interval=cap?1000/cap:0
      this.nextRender=interval?time+interval-Math.min(interval*.9,Math.max(0,time-this.nextRender)):time
      super.step(time,delta)
      this.sampleFrames++
    } else super.headlessStep(time,delta)
    if(time-this.sampleStart>=1000){
      graphics.measuredFps=this.sampleFrames*1000/(time-this.sampleStart)
      graphics.frameMs=this.accumulatedMs/Math.max(1,this.observedSteps)
      graphics.samples++
      this.observed++
      if(this.observed===3&&options.current.quality==='Auto'){
        graphics.recommended=presetFor(graphics.capabilities!,graphics.frameMs)
        graphics.effective=graphics.recommended
        applyPreset(options.current,graphics.effective)
        this.events.emit('graphicschange')
        this.nextAutoChange=time+12000
      }
      const expected=cap?Math.min(cap,60):60
      this.slowWindows=graphics.measuredFps<expected*.65?this.slowWindows+1:0
      if(options.current.quality==='Auto'&&this.slowWindows>=4&&time>this.nextAutoChange&&graphics.effective!=='Low'){
        graphics.effective=graphics.effective==='High'?'Medium':'Low'
        applyPreset(options.current,graphics.effective)
        this.events.emit('graphicschange')
        this.nextAutoChange=time+15000
        this.slowWindows=0
      }
      this.fpsElement.hidden=!options.current.showFps
      this.fpsElement.textContent=Math.round(graphics.measuredFps)+' FPS · '+graphics.frameMs.toFixed(1)+' ms'
      this.sampleFrames=0;this.accumulatedMs=0;this.observedSteps=0;this.sampleStart=time
    }

  }
}




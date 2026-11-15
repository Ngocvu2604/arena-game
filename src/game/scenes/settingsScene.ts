import Phaser from 'phaser'
import {t} from '../../data/translations'
import {audio} from '../audio'
import {background} from '../art/registry'
import {compactPlayer2,defaults,keyName,options,saveSettings,validKeys,type Settings} from '../settings'
import {applyPreset,graphics} from '../performance'
import {fitScene,toggleFullscreen} from '../display'
import {button,color,heading,label,mono,Nav,panel} from '../ui'
import {entrance} from './title'

const tabs=['Audio','Graphics','Controls','Gameplay','Language']
const actionLabels=['Left','Right','Up','Guard','Light','Jump','Dash','Skill','Ultimate']
interface SettingsData { returnTo:string; tab?:number; draft?:Settings; focus?:number; status?:string }
export function applyPixelMode(game:Phaser.Game) {
  const filter=options.current.pixel?Phaser.Textures.FilterMode.NEAREST:Phaser.Textures.FilterMode.LINEAR
  for(const key of game.textures.getTextureKeys()) game.textures.get(key).setFilter(filter)
  game.canvas.style.imageRendering=options.current.pixel?'pixelated':'auto'
  if(game.context instanceof CanvasRenderingContext2D)game.context.imageSmoothingEnabled=!options.current.pixel
}
interface SettingRow {name:string;value:()=>string;change:(direction:number)=>void}
export class SettingsScene extends Phaser.Scene {
  constructor(){super('settings')}
  create(data:SettingsData) {
    fitScene(this)
    if(data.tab===undefined)entrance(this)
    const tab=data.tab??0
    let draft=data.draft??structuredClone(options.current)
    const viewing=(str:string)=>t(str,draft.language)
    const back=()=>{
      if(data.returnTo==='pause'){this.scene.stop();this.scene.resume('pause',{refresh:true})}
      else this.scene.start(data.returnTo)
    }
    if(data.returnTo==='pause')this.add.rectangle(640,360,1280,720,0x131117,.95)
    else background(this,'title',.7)
    const nav=new Nav(this,back)
    heading(this,viewing('Settings'))
    const refresh=(status?:string,focus?:number)=>this.scene.restart({...data,tab,draft,focus,status})
    for(const [i,name] of tabs.entries()){
      button(this,nav,248+i*196,151,183,38,(i===tab?'◆ ':'')+viewing(name),
        ()=>this.scene.restart({...data,tab:i,draft,focus:undefined,status:undefined}),true,false)
    }
    const rows:SettingRow[]=[]
    const cycle=<K extends keyof Settings>(name:string,key:K,values:Settings[K][],format:(value:Settings[K])=>string=value=>viewing(String(value)))=>{
      rows.push({name,value:()=>format(draft[key]),change:direction=>{
        const index=values.indexOf(draft[key])
        draft[key]=values[(index+direction+values.length)%values.length]
      }})
    }
    const toggle=(name:string,key:'mute'|'pixel'|'combo'|'showFps'|'background')=>cycle(name,key,[false,true],value=>viewing(value?'On':'Off'))
    const volume=(name:string,key:'master'|'music'|'effects')=>rows.push({
      name,value:()=>draft[key]+'%',change:direction=>{draft[key]=Phaser.Math.Clamp(draft[key]+direction*5,0,100)}
    })
    if(tab===0){volume('Master Volume','master');volume('Music Volume','music');volume('Sound Effects','effects');toggle('Mute','mute')}
    if(tab===1){
      rows.push({name:'Display Mode',value:()=>viewing(document.fullscreenElement?'Fullscreen':'Windowed'),change:()=>{
        void toggleFullscreen().then(error=>{if(error)message.setText(viewing(error))})
      }})
      rows.push({name:'Graphics Quality',value:()=>viewing(draft.quality),change:direction=>{
        const values=['Auto','Low','Medium','High'] as const
        draft.quality=values[(values.indexOf(draft.quality)+direction+values.length)%values.length]
        applyPreset(draft,draft.quality==='Auto'?graphics.recommended:draft.quality)
        refresh(undefined,6)
      }})
      cycle('Resolution Scaling','resolution',[.5,.75,1,1.5],value=>Math.round(value*100)+'%')
      toggle('Pixel Perfect','pixel')
      cycle('FPS Limit','fpsLimit',[0,30,60,120],value=>value?String(value):viewing('Auto'))
      toggle('Show FPS','showFps')
      cycle('Screen Shake','shake',[0,20,50,75],value=>viewing(value===0?'Off':value<=20?'Low':value<=50?'Medium':'High'))
      cycle('Particle Quality','particles',[30,65,100],value=>viewing(value<=30?'Low':value<=65?'Medium':'High'))
      toggle('Background Animation','background')
      cycle('Special Effects Quality','specialEffects',[30,65,100],value=>viewing(value<=30?'Low':value<=65?'Medium':'High'))
    }
    if(tab===3){
      cycle('Match Duration','duration',[30,60,90,120],value=>value+' s')
      cycle('Rounds','rounds',[1,3,5])
      cycle('CPU Difficulty','difficulty',['Easy','Normal','Hard'])
      toggle('Combo Display','combo')
      cycle('Versus Presentation','introDuration',[900,1500,2200],value=>(value/1000).toFixed(1)+' s')
    }
    if(tab===4)cycle('Language','language',['English','Vietnamese'])
    const twoColumns=tab===1
    const height=tab===2?442:tab===1?382:Math.max(116,rows.length*57+35)
    panel(this,178,190,924,height)
    const footer=Math.min(675,190+height+70)
    const message=mono(this,640,footer-32,data.status??'',13,color.gold)
    const controls:{row:SettingRow;button:ReturnType<typeof button>}[]=[]
    rows.forEach((row,index)=>{
      const column=twoColumns?Math.floor(index/5):0
      const y=234+(twoColumns?index%5:index)*57
      const x=twoColumns?211+column*448:260
      label(this,x,y,viewing(row.name),twoColumns?16:20).setOrigin(0,.5)
      const change=(direction:number)=>{
        row.change(direction)
        control.txt.setText(row.value().toUpperCase())
        if(tab===4)refresh(undefined,control.idx)
      }
      const control=button(this,nav,twoColumns?x+327:920,y,twoColumns?174:228,38,row.value(),()=>change(1),true,false)
      nav.adjust(control.idx,change)
      controls.push({row,button:control})
    })
    if(tab===1){
      button(this,nav,640,536,280,37,'Auto Detect',()=>{
        graphics.detect()
        draft.quality='Auto'
        applyPreset(draft,graphics.recommended)
        refresh(viewing(graphics.recommended)+' · '+viewing('Recommended'),15)
      },true)
      const fullscreen=()=>{
        controls[0].button.txt.setText(controls[0].row.value().toUpperCase())
        fitScene(this)
      }
      document.addEventListener('fullscreenchange',fullscreen)
      this.events.once('shutdown',()=>document.removeEventListener('fullscreenchange',fullscreen))
    }
    if(tab===2){
      for(let player=0;player<2;player++){
        const x=210+player*452
        mono(this,x+170,211,viewing(player?'Player 2':'Player 1').toUpperCase(),15,color.gold)
        actionLabels.forEach((action,index)=>{
          const y=246+index*32
          label(this,x+15,y,viewing(action),16).setOrigin(0,.5)
          const keyButton=button(this,nav,x+295,y,164,27,keyName(draft.keys[player][index]),()=>{
            nav.dispose()
            message.setText(viewing('Press a new key'))
            keyButton.txt.setText('…')
            const remap=(event:KeyboardEvent)=>{
              event.preventDefault()
              if(event.code==='Escape'){refresh(undefined,keyButton.idx);return}
              const candidate=structuredClone(draft.keys)
              candidate[player][index]=event.code
              if(!validKeys(candidate)){refresh(viewing('Key already assigned or reserved'),keyButton.idx);return}
              draft.keys=candidate
              refresh(undefined,keyButton.idx)
            }
            this.input.keyboard?.once('keydown',remap)
            this.events.once('shutdown',()=>this.input.keyboard?.off('keydown',remap))
          },true,false)
        })
      }
      button(this,nav,640,600,325,32,viewing('Player 2 Without Numpad'),()=>{
        const candidate=structuredClone(draft.keys)
        candidate[1]=[...compactPlayer2]
        if(!validKeys(candidate)){message.setText(viewing('Key already assigned or reserved'));return}
        draft.keys=candidate;refresh(viewing('Saved in draft'))
      },true,false)
    }
    button(this,nav,277,footer,184,41,viewing('Back'),back,true,false)
    const reset=button(this,nav,640,footer,188,41,viewing('Reset'),()=>{draft=defaults();refresh(undefined,reset.idx)},true,false)
    const apply=button(this,nav,1003,footer,188,41,viewing('Apply'),()=>{
      const saved=saveSettings(structuredClone(draft))
      graphics.effective=draft.quality==='Auto'?graphics.recommended:draft.quality
      applyPixelMode(this.game);audio.adjust()
      this.game.events.emit('graphicschange')
      document.documentElement.lang=draft.language==='Vietnamese'?'vi':'en'
      refresh(saved?viewing('Saved'):viewing('Session only'),apply.idx)
    },true,false)
    nav.focus(data.focus??tab)
  }
}


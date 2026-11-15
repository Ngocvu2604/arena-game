import {fitScene,toggleFullscreen} from '../display'
import Phaser from 'phaser'
import {stages} from '../../data/stages'
import {t} from '../../data/translations'
import {audio} from '../audio'
import {background,fighterSprite,queueFighterAssets,registerFighterAnimations,stageAssets,titleAssets} from '../art/registry'
import {options,type Difficulty,type Match,type Mode} from '../settings'
import {button,color,diamond,divider,heading,label,mono,Nav,panel} from '../ui'
function logo(scene:Phaser.Scene, y:number) {
  const g=scene.add.graphics()
  diamond(g,640,y-31,16,0x201a24)
  diamond(g,640,y-31,10,0xb08252)
  diamond(g,640,y-31,6,0xe8bf80)
  g.fillStyle(0x33242b).fillRect(638,y-39,4,16)
  g.lineStyle(1,0xad8658).lineBetween(599,y-31,619,y-31).lineBetween(661,y-31,681,y-31)
  const classic={fontStyle:'bold',stroke:'#231820',strokeThickness:7,shadow:{offsetX:0,offsetY:5,color:'#111017',blur:0,fill:true}}
  label(scene,640,y+12,'PIXEL FANTASY',53,{...classic,color:'#f0dbb6'}).setLetterSpacing(8)
  label(scene,640,y+77,'ARENA',100,{...classic,color:'#e2b578'}).setLetterSpacing(14)
  divider(scene,640,y+138,305)
}
export function entrance(scene:Phaser.Scene) { fitScene(scene);scene.cameras.main.fadeIn(195,18,15,22) }
export class Boot extends Phaser.Scene {
  constructor(){super('boot')}
  create(){ this.scene.start('preload') }
}
export class Preload extends Phaser.Scene {
  constructor(){super('preload')}
  private failed=false
  private fill!:Phaser.GameObjects.Rectangle
  private progress!:Phaser.GameObjects.Text
  preload(){
    fitScene(this)
    this.failed=false
    try { titleAssets(this) } catch { this.failed=true;return }
    background(this,'title',.58)
    logo(this,235)
    panel(this,450,433,380,14)
    this.fill=this.add.rectangle(455,440,0,6,0xd5aa6d).setOrigin(0,.5)
    this.progress=mono(this,640,467,'0%',15,color.gold)
    const update=(fraction:number)=>this.setProgress(fraction*.75)
    const error=()=>{this.failed=true}
    this.load.on('progress',update)
    this.load.on('loaderror',error)
    this.load.once('complete',()=>{
      this.load.off('progress',update)
      this.load.off('loaderror',error)
    })
    queueFighterAssets(this)
  }
  create(){
    if(this.failed) {this.fail();return}
    try { registerFighterAnimations(this) } catch { this.fail();return }
    let done=0
    this.time.addEvent({delay:27,repeat:stages.length-1,callback:()=>{
      try {
        stageAssets(this,done++)
        this.setProgress(.75+.25*done/stages.length)
        if(done===stages.length) this.time.delayedCall(110,()=>this.scene.start('title'))
      } catch { this.time.removeAllEvents();this.fail() }
    }})
  }
  private setProgress(fraction:number){
    this.fill.width=370*fraction
    this.progress.setText(Math.floor(fraction*100)+'%')
  }
  private fail() {
    this.children.removeAll(true)
    this.add.rectangle(640,360,1280,720,0x18151d)
    label(this,640,330,'The arena could not load.',36)
    label(this,640,385,'Reload the page to try again.',20)
  }
}
export class Title extends Phaser.Scene {
  constructor(){super('title')}
  create(){
    entrance(this);audio.select('title')
    background(this,'title',.13)
    const g=this.add.graphics()
    g.fillStyle(0x111015,.55).fillRect(0,0,1280,36).fillRect(0,637,1280,83)
    g.lineStyle(1,0x9c7850,.75).lineBetween(31,36,1249,36).lineBetween(32,637,1248,637)
    for(const x of [30,1250]) { diamond(g,x,36,4,0xc39c68);diamond(g,x,637,4,0xc39c68) }
    mono(this,54,18,'PIXEL FANTASY ARENA',11,'#d6bb91').setOrigin(0,.5).setLetterSpacing(2)
    const fullscreen=label(this,1216,24,'⛶',27,{color:color.gold}).setInteractive({useHandCursor:true})
    fullscreen.on('pointerdown',()=>void toggleFullscreen())
    this.add.ellipse(253,593,171,18,0x111016,.65)
    this.add.ellipse(1027,593,171,18,0x111016,.65)
    fighterSprite(this,0,245,593,5,1)
    fighterSprite(this,2,1035,593,5,-1)
    logo(this,123)
    const nav=new Nav(this,()=>this.scene.start('attract'))
    const entries:[string,()=>void][]=[
      ['Start Game',()=>this.scene.start('stages',{mode:'cpu',difficulty:options.current.difficulty})],
      ['Game Modes',()=>this.scene.start('modes')],
      ['Character Select',()=>this.scene.start('stages',{mode:'cpu',difficulty:options.current.difficulty})],
      ['Settings',()=>this.scene.start('settings',{returnTo:'title'})],
      ['Back',()=>this.scene.start('attract')],
    ]
    entries.forEach(([text,run],i)=>button(this,nav,640,311+58*i,338,44,text,run))
    mono(this,640,680,'1.1',12,color.muted)
  }
}
export class ModeSelect extends Phaser.Scene {
  constructor(){super('modes')}
  create(){
    entrance(this);audio.select('selection');background(this,'title',.52);heading(this,'Select Mode')
    const nav=new Nav(this,()=>this.scene.start('title'))
    let difficulty=options.current.difficulty
    const modes:{id:Mode;name:string;desc:string;fighter:number}[]=[
      {id:'cpu',name:'Player vs CPU',desc:'Challenge a computer-controlled fighter.',fighter:0},
      {id:'versus',name:'Local Versus',desc:'Two fighters. One keyboard.',fighter:1},
      {id:'training',name:'Training',desc:'Practice moves, timing, and combos.',fighter:3},
    ]
    for(const [i,mode] of modes.entries()){
      const x=244+i*396
      panel(this,x-173,160,346,406)
      fighterSprite(this,mode.fighter,x,383,4.1,i===2?-1:1)
      divider(this,x,403,160)

      button(this,nav,x,510,279,48,mode.name,()=>this.scene.start('stages',{mode:mode.id,difficulty}),true)
    }
    const values:Difficulty[]=['Easy','Normal','Hard']
    const changer=button(this,nav,245,605,286,40,t('CPU')+'  ·  '+t(difficulty),()=>{
      difficulty=values[(values.indexOf(difficulty)+1)%values.length]
      changer.txt.setText((t('CPU')+'  ·  '+t(difficulty)).toUpperCase())
    },true,false)
    button(this,nav,640,652,184,40,'Back',()=>this.scene.start('title'),true)
  }
}
export class Credits extends Phaser.Scene {
  constructor(){super('credits')}
  create(){
    entrance(this);background(this,'title',.58);heading(this,'Credits');panel(this,310,190,660,327)
    label(this,640,268,'Pixel Fantasy Arena',40,{fontStyle:'bold',color:color.gold})
    divider(this,640,306,238)
    label(this,640,362,t('Fighter sprites by LuizMelo (CC0)'),23)
    label(this,640,389,t('Original stages, music and game design'),17)
    label(this,640,430,t('Built with Phaser 3, TypeScript and Vite'),21)
    const go=()=>this.scene.start('title')
    button(this,new Nav(this,go),640,600,190,44,'Back',go,true)
  }
}
export function startMatch(scene:Phaser.Scene,match:Match) {
  scene.scene.start('versus',match)
}





export class Attract extends Phaser.Scene {
  constructor(){super('attract')}
  create(){
    entrance(this)
    background(this,'title',.18)
    logo(this,210)
    const nav=new Nav(this,()=>this.scene.start('title'))
    button(this,nav,640,490,320,52,'Press Enter',()=>this.scene.start('title'))
    button(this,nav,640,566,220,36,'Credits',()=>this.scene.start('credits'),true)
  }
}


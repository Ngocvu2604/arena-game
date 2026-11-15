import {fitScene} from '../display'
import Phaser from 'phaser'
import {roster} from '../../data/characters'
import {stages} from '../../data/stages'
import {t} from '../../data/translations'
import {background,fighterSprite} from '../art/registry'
import {audio} from '../audio'
import type {Match} from '../settings'
import {button,color,divider,heading,label,mono,Nav,panel} from '../ui'
import {entrance,startMatch} from './title'
export interface ResultData {
  match:Match; winner:number; wins:[number,number]; damage:[number,number]; combo:[number,number]; seconds:number
}
export class Results extends Phaser.Scene {
  constructor(){super('results')}
  create(data:ResultData){
    entrance(this);audio.select('victory');background(this,stages[data.match.stage].id,.65)
    heading(this,data.winner<0?'Draw':'Winner')
    panel(this,200,166,880,367)
    const lead=data.winner<0?0:data.winner, winner=roster[data.match.fighters[lead]]
    const sprite=fighterSprite(this,data.match.fighters[lead],420,449,5.2)
    sprite.play(winner.id+'-victory')
    label(this,420,480,data.winner<0?t('Draw').toUpperCase():winner.name.toUpperCase(),34,{color:color.gold,fontStyle:'bold'}).setLetterSpacing(0)
    divider(this,792,240,311)
    const stats:[string,string][]=[
      ['Rounds Won',data.wins.join('  :  ')],
      ['Damage Dealt',data.damage.join('  :  ')],
      ['Highest Combo',data.combo.join('  :  ')],
      ['Match Duration Total',Math.floor(data.seconds/60)+':'+String(data.seconds%60).padStart(2,'0')],
    ]
    mono(this,792,214,'P1   /   P2',14,color.gold)
    stats.forEach(([name,value],i)=>{
      label(this,623,284+i*52,t(name),19).setOrigin(0,.5)
      mono(this,968,284+i*52,value,19,color.gold).setOrigin(1,.5)
    })
    const main=()=>this.scene.start('title')
    const nav=new Nav(this,main)
    button(this,nav,348,619,239,48,'Rematch',()=>startMatch(this,data.match),true)
    button(this,nav,640,619,251,48,'Change Character',()=>this.scene.start('fighters',data.match),true)
    button(this,nav,932,619,239,48,'Main Menu',main,true)
  }
}
interface PauseData {battle:string;match:Match}
export class Pause extends Phaser.Scene {
  constructor(){super('pause')}
  create(data:PauseData){
    this.draw(data)
    this.events.on('resume',this.refresh,this)
    this.events.once('shutdown',()=>this.events.off('resume',this.refresh,this))
  }
  private activeData!:PauseData
  private nav?:Nav
  private refresh(){
    this.nav?.dispose()
    this.children.removeAll(true)
    this.draw(this.activeData)
  }
  private draw(data:PauseData,confirm?:()=>void){
    fitScene(this)
    this.activeData=data
    this.add.rectangle(640,360,1280,720,0x17141d,.83)
    panel(this,420,129,440,462)
    const resume=()=>{this.scene.resume(data.battle);this.scene.stop()}
    this.nav=new Nav(this,confirm?()=>this.refresh():resume)
    const title=label(this,640,196,t(confirm?'Leave this match?':'Paused').toUpperCase(),confirm?30:44,{color:color.gold,fontStyle:'bold'})
    title.setLetterSpacing(0)
    divider(this,640,234,223)
    if(confirm) {
      label(this,640,303,t('Match progress will be lost.'),19)
      button(this,this.nav,640,388,246,44,'Cancel',()=>this.refresh(),true)
      button(this,this.nav,640,451,246,44,'Confirm',confirm,true)
      return
    }
    const ask=(run:()=>void)=>()=>{this.nav?.dispose();this.children.removeAll(true);this.draw(data,run)}
    const leave=(destination:string,payload?:Match)=>()=>{this.scene.stop(data.battle);this.scene.start(destination,payload)}
    const actions:[string,()=>void][]=[
      ['Resume',resume],['Restart Match',ask(leave(data.battle,data.match))],
      ['Settings',()=>{this.scene.pause();this.scene.launch('settings',{returnTo:'pause'})}],
      ['Character Select',ask(leave('fighters',data.match))],['Main Menu',ask(leave('title'))],
    ]
    actions.forEach(([name,run],i)=>button(this,this.nav!,640,285+i*57,309,41,name,run,true))
  }
}




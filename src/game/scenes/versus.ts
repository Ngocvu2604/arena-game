import Phaser from 'phaser'
import {roster} from '../../data/characters'
import {stages} from '../../data/stages'
import {t} from '../../data/translations'
import {background,fighterSprite} from '../art/registry'
import {options,type Match} from '../settings'
import {audio} from '../audio'
import {divider,label,mono,color} from '../ui'
import {entrance} from './title'

export class Versus extends Phaser.Scene {
  constructor(){super('versus')}
  create(match:Match){
    entrance(this)
    background(this,stages[match.stage].id,.72)
    this.add.rectangle(320,360,640,720,0x4d2428,.35)
    this.add.rectangle(960,360,640,720,0x24363e,.35)
    const names=match.fighters.map((id,index)=>{
      const fighter=roster[id]
      const target=index?1000:280
      const sprite=fighterSprite(this,id,index?1450:-170,548,7.2,index?-1:1).setTint(0x453b43)
      this.tweens.add({targets:sprite,x:target,duration:430,ease:'Cubic.Out',onComplete:()=>sprite.clearTint()})
      const text=label(this,target,596,fighter.name.toUpperCase(),43,{color:color.gold,fontStyle:'bold'}).setAlpha(0)
      mono(this,target,646,index?match.mode==='cpu'?'CPU':'P2':'P1',18,color.gold)
      return text
    })
    const versus=label(this,640,355,'VS',108,{color:'#f1c386',fontStyle:'bold',stroke:'#392029',strokeThickness:8}).setScale(2).setAlpha(0)
    this.time.delayedCall(440,()=>{
      this.tweens.add({targets:versus,scale:1,alpha:1,duration:170,ease:'Back.Out'})
      this.tweens.add({targets:names,alpha:1,duration:160})
      if(options.current.shake)this.cameras.main.shake(100,.003*options.current.shake/100)
      audio.play('confirm')
    })
    divider(this,640,664,170)
    // The boot scene already loaded these local textures. Validate readiness rather than simulating download progress.
    const required=[...match.fighters.map(i=>roster[i].id),...Array.from({length:3},(_,i)=>stages[match.stage].id+i)]
    const ready=required.filter(key=>this.textures.exists(key)).length
    this.add.rectangle(640,692,320,4,0x493a3a)
    this.add.rectangle(480,692,320*ready/required.length,4,0xcaa26c).setOrigin(0,.5)
    if(ready!==required.length){
      label(this,640,610,t('Asset loading failed'),18)
      this.input.keyboard?.once('keydown-ESC',()=>this.scene.start('stages',match))
      return
    }
    const started=this.time.now
    const timer=this.time.delayedCall(options.current.introDuration,()=>this.scene.start(match.mode==='training'?'training':'battle',match))
    const skip=()=>{if(this.time.now-started>=650){timer.remove();this.scene.start(match.mode==='training'?'training':'battle',match)}}
    this.input.keyboard?.once('keydown-ENTER',skip)
  }
}



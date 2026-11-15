import {paintSkill} from '../combat/vfx'
import {EnergyBar} from '../energyBar'
import {viewport} from '../display'
import Phaser from 'phaser'
import {stages} from '../../data/stages'
import {t} from '../../data/translations'
import {audio} from '../audio'
import {background,fighterSprite} from '../art/registry'
import {OpponentAI} from '../combat/ai'
import {Combat,FLOOR,type CombatEvent,type Fighter} from '../combat/engine'
import {BattleInput} from '../input'
import {options,type Match} from '../settings'
import {color,diamond,label,mono,panel} from '../ui'
import {entrance} from './title'
import type {ResultData} from './results'

const tick=1000/60
export class Battle extends Phaser.Scene {
  private match!:Match
  private combat!:Combat
  private ai!:OpponentAI
  private inputState!:BattleInput
  private sprites!:Phaser.GameObjects.Sprite[]
  private shadows!:Phaser.GameObjects.Ellipse[]
  private slashSprites!:Phaser.GameObjects.Image[]
  private bars!:Phaser.GameObjects.Graphics
  private effects!:Phaser.GameObjects.Graphics
  private timer!:Phaser.GameObjects.Text
  private roundLabel!:Phaser.GameObjects.Text
  private announce!:Phaser.GameObjects.Text
  private combos!:Phaser.GameObjects.Text[]
  private layers!:Phaser.GameObjects.Image[]
  private wins:[number,number]=[0,0]
  private totals:[number,number]=[0,0]
  private best:[number,number]=[0,0]
  private energyBars=[new EnergyBar(),new EnergyBar()]
  private elapsed=0
  private round=1
  private accumulator=0
  private phase=0
  private debug=false
  private dummy=0
  private lastDamage=0
  private trainingLabel?:Phaser.GameObjects.Text
  private particles:{x:number;y:number;vx:number;vy:number;ttl:number;length:number;color:number;size:number}[]=[]
  constructor(key='battle'){super(key)}
  create(match:Match) {
    this.match=match
    this.wins=[0,0];this.totals=[0,0];this.best=[0,0];this.elapsed=0
    this.round=1;this.accumulator=0;this.debug=false;this.dummy=0;this.particles=[]
    this.trainingLabel=undefined
    entrance(this);audio.select('battle')
    this.layers=background(this,stages[match.stage].id,.07)
    this.layers[2].y=352
    this.add.rectangle(640,710,1280,20,0x17151b)
    this.beginRound()
    this.shadows=this.combat.fighters.map(f=>this.add.ellipse(f.x,FLOOR+1,83,12,0x111018,.64))
    this.sprites=this.combat.fighters.map((f,i)=>fighterSprite(this,match.fighters[i],f.x,FLOOR,3.4,f.facing))
    this.slashSprites=this.combat.fighters.map(()=>this.add.image(0,0,'combat-slash','slash-1-0').setVisible(false))
    this.effects=this.add.graphics()
    this.bars=this.add.graphics().setDepth(7)
    this.timer=label(this,640,65,'',45,{fontStyle:'bold',color:color.gold,stroke:'#17131a',strokeThickness:4}).setDepth(8)
    this.roundLabel=mono(this,640,116,'',12,color.gold).setDepth(8)
    this.announce=label(this,640,284,'',58,{fontStyle:'bold',stroke:'#261b23',strokeThickness:9,color:'#f2d3a0'}).setLetterSpacing(0).setDepth(10)
    this.combos=this.combat.fighters.map((f,i)=>{
      const x=i?1177:103
      const text=label(this,x,200,'',29,{color:color.gold,fontStyle:'bold',stroke:'#231923',strokeThickness:5}).setOrigin(i?1:0,.5).setDepth(8)
      const portraitX=i?1204:76
      panel(this,portraitX-36,25,72,72).setDepth(7)
      this.add.image(portraitX,61,'portrait-'+f.definition.id).setDisplaySize(62,62).setDepth(8)
      label(this,i?1156:124,34,f.definition.name.toUpperCase(),22,{fontStyle:'bold',stroke:'#24191f',strokeThickness:4}).setOrigin(i?1:0,.5).setDepth(8)
      mono(this,portraitX,111,t(i?match.mode==='cpu'?'CPU':match.mode==='training'?'Dummy':'Player 2':'Player 1').toUpperCase(),11,color.cream).setDepth(8)
      return text
    })
    const pause=mono(this,640,690,'Ⅱ',12,color.cream).setDepth(8).setInteractive({useHandCursor:true})
    pause.on('pointerdown',()=>this.pause())
    if(match.mode==='training') {
      this.trainingLabel=mono(this,56,632,'',13,color.cream).setOrigin(0,.5).setDepth(8)
      this.addTrainingButtons()
    }
    this.inputState=new BattleInput(this,(code)=>{
      if(code==='Escape') this.pause()
      else if(this.match.mode==='training') this.trainingAction(code)
    })
    this.paint()
  }
  private addTrainingButtons(){
    const actions=[['F1','Reset'],['F2','Hitboxes'],['F3','Dummy Guard'],['F4','Dummy CPU']]
    actions.forEach(([code,labelText],i)=>mono(this,56+i*230,655,code+' · '+t(labelText).toUpperCase(),12,color.gold)
      .setOrigin(0,.5).setDepth(8).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.trainingAction(code)))
  }
  private trainingAction(code:string) {
    if(code==='F1') this.beginRound()
    if(code==='F2') this.debug=!this.debug
    if(code==='F3') this.dummy=this.dummy===1?0:1
    if(code==='F4') this.dummy=this.dummy===2?0:2
  }
  private beginRound(){
    this.combat=new Combat(this.match.fighters,options.current.duration,this.match.mode==='training')
    this.ai=new OpponentAI(this.match.difficulty)
    this.phase=this.match.mode==='training'?0:100
    this.lastDamage=0
    this.particles=[]
  }
  private pause(){
    if(!this.scene.isActive()||this.scene.isActive('pause')) return
    this.scene.pause()
    this.scene.launch('pause',{battle:this.scene.key,match:this.match})
  }
  update(_time:number,delta:number) {
    if(!this.inputState) return
    this.accumulator+=Math.min(delta,100)
    while(this.accumulator>=tick){
      this.accumulator-=tick
      if(!this.advance()) break
    }
    this.combat.fighters.forEach((f,i)=>this.energyBars[i].update(f.energy,delta))
    this.paint()
  }
  private advance(){
    const {commands,pause}=this.inputState.sample(this.match.mode==='versus')
    if(pause) {this.pause();return false}
    const [a,b]=this.combat.fighters
    if(this.phase===32){audio.play('confirm');this.inputState.reset()}
    if(this.phase>0) {
      this.phase--
      if(this.phase===0 && this.combat.outcome!==undefined) return this.nextRound()
    } else {
      if(this.match.mode==='cpu'||this.dummy===2) commands[1]=this.ai.decide(b,a)
      if(this.dummy===1) commands[1]={guard:true}
      this.combat.step(commands)
      for(const event of this.combat.events) this.feedback(event)
      if(this.combat.outcome!==undefined) {
        const outcome=this.combat.outcome
        if(outcome>=0) this.wins[outcome]++
        this.elapsed+=this.combat.frames
        for(const f of this.combat.fighters) {
          this.totals[f.player]+=f.damage
          this.best[f.player]=Math.max(this.best[f.player],f.best)
        }
        this.phase=134
      }
    }
    for(let i=this.particles.length-1;i>=0;i--) {
      const p=this.particles[i]
      if(--p.ttl<=0) {this.particles.splice(i,1);continue}
      p.x+=p.vx;p.y+=p.vy;p.vy+=.16
    }
    return true
  }
  private nextRound(){
    const target=Math.floor(options.current.rounds/2)+1
    if(this.wins.some(n=>n>=target)||this.round>=options.current.rounds){
      const winner=this.wins[0]===this.wins[1]?-1:this.wins[0]>this.wins[1]?0:1
      const data:ResultData={match:this.match,winner,wins:this.wins,damage:this.totals,combo:this.best,seconds:Math.floor(this.elapsed/60)}
      this.scene.start('results',data)
      return false
    }
    this.round++;this.beginRound()
    return true
  }
  private feedback(event:CombatEvent) {
    const f=event.fighter
    audio.play(event.kind==='ultimate'?event.move?.sfx??'ultimate-'+f.definition.id:event.kind==='cast'||event.kind==='swing'?event.move?.sfx??event.kind:event.kind,Math.max(1,(event.move?.cost??100)/100))
    if(event.kind==='hit'||event.kind==='guard') {
      this.lastDamage=event.damage??0
      if(options.current.combo) {
        const text=mono(this,f.x,f.y-118,String(event.damage),19,event.kind==='guard'?'#c4c9d1':'#f5ce95').setDepth(9)
        this.tweens.add({targets:text,y:text.y-44,alpha:0,duration:440,onComplete:()=>text.destroy()})
      }
    }
    const ultimate=event.kind==='ultimate'
    const impact=event.kind==='hit'||event.kind==='ko'
    const intensity=options.current.shake/100
    if(intensity&&(ultimate||event.finisher||(impact&&(event.move?.knockback??0)>=10))) this.cameras.main.shake(ultimate?290:100,(ultimate?.004:.0025)*intensity)
    if(ultimate&&options.current.specialEffects>30) {
      this.cameras.main.zoomTo(viewport.zoom*1.035,110)
      this.time.delayedCall(240,()=>this.cameras.main.zoomTo(viewport.zoom,210))
      const caption=label(this,640,171,t(event.move?.name??f.definition.skills[2]),25,{color:color.gold,stroke:'#211922',strokeThickness:4}).setDepth(11)
      this.tweens.add({targets:caption,alpha:0,duration:900,delay:220,onComplete:()=>caption.destroy()})
    }
    const y=event.kind==='land'?f.y:f.y-64
    const count=Math.floor((ultimate?45:impact?20:10)*options.current.particles/100*(options.current.performance?.45:1))
    const tint=event.kind==='guard'?0xb6c0ce:event.kind==='land'?0x9e8b78:Phaser.Display.Color.HexStringToColor(f.definition.palette[2]).color
    for(let i=0;i<count&&this.particles.length<130;i++){
      const theta=Math.random()*Math.PI*2
      const speed=1+Math.random()*(ultimate?17:8)
      const ttl=16+Math.floor(Math.random()*15)
      this.particles.push({x:f.x,y,vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed,ttl,length:ttl,color:i%4===0?0xf6dfae:tint,size:i%3===0?5:3})
    }
  }
  private paint(){
    const optionsNow=options.current
    const [a,b]=this.combat.fighters
    const offset=optionsNow.background?(640-(a.x+b.x)/2)/25:0
    this.layers[0].x=640+offset*.6;this.layers[1].x=640+offset
    const g=this.effects.clear()
    const particleAlpha=optionsNow.particles/100
    for(const [i,f] of this.combat.fighters.entries()) {
      const sprite=this.sprites[i]
      sprite.setPosition(Math.round(f.x),Math.round(f.y)).setScale(f.facing*Math.abs(sprite.scaleX),sprite.scaleY)
      const key=f.attack?.move.animation??f.definition.id+'-'+f.pose
      if(sprite.anims.currentAnim?.key!==key) sprite.play(key)
      sprite.setRotation(f.pose==='block'?f.facing*-.08:f.pose==='crouch'?f.facing*.15:0)
      if(f.attack?.move.level==='low')sprite.setRotation(f.facing*.26)
      if(f.guard&&f.crouching)sprite.setRotation(f.facing*.22)
      if(f.stun&&f.pose==='hurt')sprite.setRotation(-f.facing*.12)
      if(f.attack&&sprite.anims.currentAnim) {
        sprite.anims.pause()
        const {frame,move}=f.attack
        const frames=sprite.anims.currentAnim.frames
        if(frames.length>1) {
          const progress=frame<move.startup ? (frame/move.startup)*.45 : frame<move.startup+move.active ?
            .45+(frame-move.startup)/move.active*.3 : .75+(frame-move.startup-move.active)/move.recovery*.25
          sprite.anims.setCurrentFrame(frames[Math.min(frames.length-1,Math.floor(progress*frames.length))])
        }
      }
      this.shadows[i].setPosition(f.x,FLOOR+1).setAlpha(.7-(FLOOR-f.y)*.003).setScale(1-(FLOOR-f.y)*.002,1)
      this.paintFighterEffects(f,sprite)
      const slash=this.slashSprites[i],attack=f.attack
      const age=attack?attack.frame-attack.move.startup:-1
      const visible=!!attack&&age>=0&&age<attack.move.active&&['strike','dash','teleport'].includes(attack.move.kind)
      slash.setVisible(visible)
      if(visible&&attack){
        const variant=attack.slot==='ultimate2'?5:attack.slot==='combo3'?4:attack.slot==='finisher'?2:1
        const frame=Math.min(5,Math.floor((age%12)/2))
        slash.setFrame('slash-'+variant+'-'+frame).setPosition(f.x+attack.facing*Math.min(95,attack.move.reach/2),f.y-(attack.move.level==='low'?25:70))
          .setScale(attack.facing*(attack.move.cost?1.8:1.1),attack.move.cost?1.8:1.1)
      }
      if(f.ward&&particleAlpha) g.lineStyle(3,0xb8a7c5,.58*particleAlpha).strokeEllipse(f.x,f.y-62,100,133)
      if(this.debug) {
        const box=f.hurtbox()
        g.lineStyle(2,0x99b383,.9).strokeRect(box.x,box.y,box.w,box.h)
        if(f.attack&&f.attack.fired&&f.attack.frame<f.attack.move.startup+f.attack.move.active) {
          const hit=f.hitbox(f.attack)
          g.lineStyle(2,0xd56a5d,.9).strokeRect(hit.x,hit.y,hit.w,hit.h)
        }
      }
      this.combos[i].setText(optionsNow.combo&&f.combo>1 ? f.combo+' '+t('Hits').toUpperCase() : '')
    }
    for(const shot of this.combat.projectiles) {
      const id=shot.owner.definition.id
      const tint=id==='kael'?0xc85d51:id==='darius'?0xb5a078:0xa68bbf
      if(id==='darius'){
        g.fillStyle(0x3d3430).fillTriangle(shot.x-26,FLOOR,shot.x+20,FLOOR,shot.x+4,FLOOR-55)
        g.lineStyle(3,tint).lineBetween(shot.x-24,FLOOR-2,shot.x+5,FLOOR-49)
      }else if(id==='kael'){
        g.lineStyle(shot.move.cost?12:7,tint).beginPath().arc(shot.x-13*Math.sign(shot.speed),shot.y,shot.move.cost?72:31,-1.2,1.2,shot.speed<0).strokePath()
        g.lineStyle(2,0xf2cf9c).lineBetween(shot.x,shot.y-26,shot.x+9,shot.y+23)
      }else if(id==='ren'){
        const angle=this.combat.frames*.35
        for(let i=0;i<4;i++){
          const a=angle+i*Math.PI/2
          g.fillStyle(0x94b7b4).fillTriangle(shot.x,shot.y,shot.x+Math.cos(a)*25,shot.y+Math.sin(a)*25,shot.x+Math.cos(a+.7)*10,shot.y+Math.sin(a+.7)*10)
        }
        g.fillStyle(0x28333c).fillCircle(shot.x,shot.y,4)
      }else{
        diamond(g,shot.x,shot.y,23,tint)
        diamond(g,shot.x,shot.y,12,0xeee1d6)
      }
      for(let i=1;i<5;i++)if(particleAlpha&&optionsNow.specialEffects>30)
        g.fillStyle(tint,particleAlpha*(1-i*.17)).fillRect(shot.x-i*shot.speed*1.8,shot.y-i%3*5,7-i,5)
    }
    for(const p of this.particles) g.fillStyle(p.color,p.ttl/p.length).fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size)
    this.paintHud()
  }
  private paintFighterEffects(f:Fighter,sprite:Phaser.GameObjects.Sprite){
    const g=this.effects
    const quality=options.current.specialEffects/100
    const tint=Phaser.Display.Color.HexStringToColor(f.definition.palette[2]).color
    if(f.guard||f.pose==='block'){
      const x=f.x+f.facing*38,y=f.y-(f.crouching?48:75)
      g.lineStyle(f.stun?5:3,0xc4bca4,.8).lineBetween(x,y-22,x+f.facing*9,y).lineBetween(x+f.facing*9,y,x,y+22)
    }
    if(f.dash&&quality>.3&&this.combat.frames%4===0)this.afterimage(sprite,.28)
    const attack=f.attack
    if(!attack)return
    const age=attack.frame-attack.move.startup
    if(age<0){
      if(attack.move.pose==='ultimate'){
        g.lineStyle(2,tint,.7).strokeCircle(f.x,f.y-64,24+attack.frame)
        if(quality>.3)g.lineStyle(1,0xd8c8a1).strokeEllipse(f.x,f.y-3,100,16)
      }
      return
    }
    if(age>=attack.move.active)return
    if(paintSkill(g,f,sprite,quality))return
    if(attack.move.kind!=='ward'&&attack.move.kind!=='projectile'){
      const x=f.x+attack.facing*43,y=f.y-(attack.move.level==='low'?30:70)
      g.lineStyle(2,tint,.65).beginPath()
        .arc(x,y,Math.min(attack.move.reach,150)*.65,attack.facing>0?-.9:2.1,attack.facing>0?1:4.1).strokePath()
    }
  }
  private afterimage(sprite:Phaser.GameObjects.Sprite,alpha:number){
    if(this.children.length>180)return
    const image=this.add.image(sprite.x,sprite.y,sprite.texture.key,sprite.frame.name)
      .setOrigin(sprite.originX,sprite.originY).setScale(sprite.scaleX,sprite.scaleY)
      .setTint(0x8c8b94).setAlpha(alpha)
    this.tweens.add({targets:image,alpha:0,duration:150,onComplete:()=>image.destroy()})
  }
  private paintHud(){
    const g=this.bars.clear()
    const rounds=Math.floor(options.current.rounds/2)+1
    for(const [i,f] of this.combat.fighters.entries()) {
      const x=i?715:122,w=443
      this.bar(x,51,w,24,f.hp/f.definition.health,0xa44644,0xd07760,!!i)
      this.energyBars[i].paint(g,i?1017:35,!!i,this.time.now)
      for(let j=0;j<rounds;j++) diamond(g,i?724+j*18:556-j*18,111,6,j<this.wins[i]?0xdfb77b:0x54454a)
    }
    g.fillStyle(0x1c1921).fillRect(586,29,108,66)
    g.lineStyle(2,0xa18058).strokeRect(586,29,108,66)
    this.timer.setText(this.match.mode==='training'?'∞':String(this.combat.seconds).padStart(2,'0'))
    this.roundLabel.setText(this.match.mode==='training'?t('Training').toUpperCase():t('Round').toUpperCase()+' '+this.round)
    const outcome=this.combat.outcome
    let announcement=''
    if(outcome!==undefined) {
      if(this.phase>75) announcement=this.combat.seconds?'K.O.':t('Time Up').toUpperCase()
      else announcement=outcome<0?t('Draw').toUpperCase():this.combat.fighters[outcome].definition.name.toUpperCase()+' '+t('Wins').toUpperCase()
    } else if(this.phase>32) announcement=t('Round').toUpperCase()+' '+this.round
    else if(this.phase) announcement=t('Fight!').toUpperCase()
    if(this.announce.text!==announcement){
      this.announce.setText(announcement)
      if(announcement){this.announce.setScale(1.25);this.tweens.add({targets:this.announce,scale:1,duration:180,ease:'Back.Out'})}
    }
    this.trainingLabel?.setText(t('Damage').toUpperCase()+': '+this.lastDamage+'   ·   '+t('Best').toUpperCase()+': '+this.combat.fighters[0].best+'   ·   '+t('Dummy')+': '+t(['Off','Guard','CPU'][this.dummy])+'   ·   '+t('Hitboxes')+': '+t(this.debug?'On':'Off'))
  }
  private bar(x:number,y:number,w:number,h:number,ratio:number,fill:number,shine:number,reverse:boolean){
    const g=this.bars
    g.fillStyle(0x1b171e).fillRect(x,y,w,h)
    g.lineStyle(1,0xae8c64).strokeRect(x,y,w,h)
    const length=Math.round((w-6)*Phaser.Math.Clamp(ratio,0,1)),start=reverse?x+w-3-length:x+3
    g.fillStyle(fill).fillRect(start,y+3,length,h-6)
    g.fillStyle(shine).fillRect(start,y+3,length,Math.min(3,h-6))
  }
}
export class Training extends Battle {constructor(){super('training')}}









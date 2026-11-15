import {roster,type MoveSlot,type Pose} from '../../data/characters.ts'
import {moves,type Move} from '../../data/moves.ts'
import {clamp,overlaps,type Box} from './geometry.ts'
import {inputTiming} from './chords.ts'
export const FLOOR=584
const EDGE=87
const RIGHT_EDGE=1280-EDGE
export const BUFFER_FRAMES=inputTiming.bufferFrames
export interface Command {direction?:number;jump?:boolean;up?:boolean;crouch?:boolean;guard?:boolean;move?:MoveSlot;dash?:boolean}
interface Attack {
  move:Move;slot:MoveSlot;frame:number;connected:boolean;fired:boolean;facing:number
  hits:Set<number>;fieldX:number
}
interface Buffered {slot:MoveSlot;time:number;direction:number;crouch:boolean;up:boolean}
export class Fighter {
  readonly definition
  readonly moves
  readonly player:number
  x:number;y=FLOOR;vy=0;vx=0;facing:number
  pose:Pose='idle';hp:number;energy=0;stun=0;ward=0;dash=0;dashDirection=1;dashCooldown=0;land=0
  damage=0;combo=0;best=0;comboTime=0;invulnerable=0
  guard=false;crouching=false;knockedDown=false
  attack?:Attack;buffer?:Buffered
  cooldowns:Partial<Record<MoveSlot,number>>={}
  constructor(index:number,player:number){
    this.player=player
    this.definition=roster[index];this.moves=moves[this.definition.id]
    this.x=player===0?365:915;this.facing=player===0?1:-1
    this.hp=this.definition.health
  }
  hurtbox():Box{
    const height=this.crouching?77:this.pose==='down'?48:124
    return {x:this.x-25,y:this.y-height,w:50,h:height}
  }
  hitbox(attack:Attack):Box{
    const {reach,height,kind}=attack.move
    const center=attack.move.anchor?attack.fieldX:this.x
    if(this.definition.id==='darius'&&attack.slot==='ultimate2'){
      const width=Math.min(reach,40+Math.max(0,attack.frame-attack.move.startup)*12)
      return {x:attack.facing>0?this.x:this.x-width,y:FLOOR-height,w:width,h:height+8}
    }
    return {x:kind==='area'?center-reach:this.x+(attack.facing===1?0:-reach),y:this.y-height,
      w:kind==='area'?reach*2:reach,h:height+8}
  }
}
export interface Projectile {x:number;y:number;speed:number;life:number;owner:Fighter;move:Move}
interface Impact {owner:Fighter;target:Fighter;move:Move;facing:number;finisher:boolean}
export type CombatEvent={kind:'swing'|'cast'|'ultimate'|'hit'|'guard'|'land'|'dash'|'ko';fighter:Fighter;damage?:number;move?:Move;finisher?:boolean}
export class Combat {
  readonly fighters:[Fighter,Fighter]
  readonly projectiles:Projectile[]=[]
  readonly events:CombatEvent[]=[]
  readonly duration:number
  readonly training:boolean
  frames=0;hitstop=0;outcome:number|undefined
  seconds:number
  constructor(picks:[number,number],duration:number,training=false){
    this.duration=duration;this.training=training
    this.fighters=[new Fighter(picks[0],0),new Fighter(picks[1],1)]
    this.seconds=duration
    if(training)this.fighters[0].energy=300
  }
  step(commands:[Command,Command]){
    this.events.length=0
    if(this.outcome!==undefined)return
    for(const fighter of this.fighters){
      const command=commands[fighter.player]
      if(command.move)fighter.buffer={slot:command.move,time:BUFFER_FRAMES,direction:command.direction??0,crouch:!!command.crouch,up:!!command.up}
    }
    if(this.hitstop>0){this.hitstop--;return}
    this.frames++
    this.seconds=Math.max(0,this.duration-Math.floor(this.frames/60))
    const [left,right]=this.fighters
    this.advance(left,right,commands[0])
    this.advance(right,left,commands[1])
    const impacts:Impact[]=[]
    this.checkAttack(left,right,impacts)
    this.checkAttack(right,left,impacts)
    for(let index=this.projectiles.length-1;index>=0;index--){
      const shot=this.projectiles[index]
      shot.x+=shot.speed
      const target=shot.owner===left?right:left
      const size=shot.move.cost?shot.move.height/2:shot.move.height<60?24:18
      if(!target.invulnerable&&overlaps({x:shot.x-size,y:shot.y-size,w:size*2,h:size*2},target.hurtbox())){
        impacts.push({owner:shot.owner,target,move:shot.move,facing:Math.sign(shot.speed),finisher:false})
        this.projectiles.splice(index,1)
      }else if(--shot.life<=0||shot.x<0||shot.x>1280)this.projectiles.splice(index,1)
    }
    for(const hit of impacts)this.applyHit(hit)
    if(this.training){
      for(const fighter of this.fighters){
        if(fighter.hp<=0){fighter.hp=fighter.definition.health;fighter.stun=0;fighter.knockedDown=false;fighter.y=FLOOR;fighter.vy=0}
        else if(fighter.hp<fighter.definition.health&&!fighter.stun&&!this.fighters[1-fighter.player].comboTime)fighter.hp=fighter.definition.health
      }
    }else if(left.hp<=0||right.hp<=0||!this.seconds)this.end()
  }
  private start(fighter:Fighter,opponent:Fighter,slot:MoveSlot){
    const move=fighter.moves[slot]
    if(fighter.energy<move.cost){fighter.buffer=undefined;return false}
    if(fighter.cooldowns[slot])return false
    fighter.energy-=move.cost
    fighter.cooldowns[slot]=move.cooldown
    fighter.facing=Math.sign(opponent.x-fighter.x)||fighter.facing
    fighter.attack={move,slot,frame:0,connected:false,fired:false,facing:fighter.facing,hits:new Set(),fieldX:opponent.x}
    fighter.pose=move.pose;fighter.buffer=undefined;fighter.dash=0
    if(move.pose==='ultimate')this.events.push({kind:'ultimate',fighter,move})
    return true
  }
  private contextual(fighter:Fighter,buffer:Buffered):MoveSlot{
    const relative=buffer.direction*fighter.facing
    if(buffer.slot==='ultimate')return buffer.crouch?'ultimate3':buffer.up?'ultimate2':'ultimate'
    if(buffer.slot==='special1'){
      if(fighter.y<FLOOR)return 'skillAir'
      return buffer.crouch?'skillDown':buffer.up?'skillUp':relative>0?'special2':relative<0?'skillBack':'special1'
    }
    if(buffer.slot!=='light')return buffer.slot
    if(fighter.y<FLOOR)return 'air'
    if(buffer.crouch)return 'low'
    if(buffer.up)return 'launcher'
    if(fighter.dash||fighter.dashCooldown>18)return 'dashAttack'
    return relative>0?'forward':relative<0?'backward':'light'
  }
  private advance(fighter:Fighter,opponent:Fighter,command:Command){
    fighter.ward=Math.max(0,fighter.ward-1)
    fighter.invulnerable=Math.max(0,fighter.invulnerable-1)
    fighter.dashCooldown=Math.max(0,fighter.dashCooldown-1)
    if(fighter.buffer&&--fighter.buffer.time<=0)fighter.buffer=undefined
    for(const slot in fighter.cooldowns){
      const key=slot as MoveSlot
      if(fighter.cooldowns[key])fighter.cooldowns[key]!--
    }
    if(fighter.comboTime>0&&--fighter.comboTime===0)fighter.combo=0
    fighter.energy=clamp(fighter.energy,0,300)
    const grounded=fighter.y>=FLOOR
    if(fighter.stun>0){
      fighter.stun--
      if(fighter.knockedDown&&grounded&&fighter.stun<9)fighter.pose='recover'
      if(fighter.stun===0){
        fighter.knockedDown=false
        if(fighter.pose==='recover')fighter.invulnerable=8
      }
    }else{
      fighter.guard=false
      if(fighter.attack){
        const attack=fighter.attack,move=attack.move
        attack.frame++
        if(attack.frame>=move.startup+move.active+move.recovery)fighter.attack=undefined
        else if(move.comboPermission&&move.cancel&&attack.connected&&fighter.buffer&&attack.frame>=move.startup+move.active&&attack.frame<move.startup+move.active+move.cancel){
          const previousFacing=fighter.facing
          fighter.facing=Math.sign(opponent.x-fighter.x)||fighter.facing
          const requested=this.contextual(fighter,fighter.buffer)
          const next=move.cancels[fighter.buffer.slot] ? (fighter.buffer.slot==='light'?move.cancels.light:requested):undefined
          if(!next||!this.start(fighter,opponent,next))fighter.facing=previousFacing
        }
        if(fighter.attack){
          const current=fighter.attack
          if(current.move.dashCancel&&current.connected&&command.dash&&current.frame>=current.move.startup+current.move.active){
            fighter.attack=undefined
          }
          if(current.move.allowMovement)fighter.x+=(command.direction??0)*(2.9+fighter.definition.speed*.43)*current.move.moveSpeed
          if(current.move.allowTurn){fighter.facing=Math.sign(opponent.x-fighter.x)||fighter.facing;current.facing=fighter.facing}
          if(current.frame<current.move.startup+current.move.active&&(current.move.kind!=='dash'||current.frame>=current.move.startup)){
            const travel=current.move.travel
            if(!(current.move.cost&&current.connected))fighter.x+=current.facing*travel
          }
        }
      }
      if(!fighter.attack){
        fighter.facing=Math.sign(opponent.x-fighter.x)||fighter.facing
        fighter.crouching=grounded&&!!command.crouch
        fighter.guard=grounded&&!!(command.guard||command.crouch)&&!fighter.buffer&&!command.dash&&!command.jump
        if(fighter.guard){fighter.dash=0;fighter.pose='block'}
        else if(fighter.buffer){
          const slot=this.contextual(fighter,fighter.buffer)
          if(!this.start(fighter,opponent,slot)&&grounded&&(command.guard||command.crouch)){
            fighter.guard=true;fighter.pose='block'
          }
        }
        if(!fighter.attack&&!fighter.guard){
          const direction=command.direction??0
          if(grounded&&command.dash&&!fighter.dashCooldown){
            fighter.dash=10;fighter.dashDirection=direction||fighter.facing;fighter.dashCooldown=32
            this.events.push({kind:'dash',fighter})
          }
          if(fighter.dash>0){
            fighter.dash--;fighter.x+=fighter.dashDirection*10;fighter.pose='dash'
          }else if(fighter.crouching&&!command.jump)fighter.pose='crouch'
          else{
            if(grounded&&command.jump)fighter.vy=-15.2
            fighter.x+=direction*(2.9+fighter.definition.speed*.43)*(grounded?1:.9)
            fighter.pose=fighter.vy<0?'jump':!grounded?'fall':fighter.land>0?'land':direction?'run':'idle'
          }
        }
      }
    }
    fighter.land=Math.max(0,fighter.land-1)
    if(fighter.y<FLOOR||fighter.vy<0){
      fighter.y+=fighter.vy;fighter.vy+=.73
      if(fighter.y>=FLOOR){
        fighter.y=FLOOR;fighter.vy=0;fighter.land=6
        if(fighter.knockedDown)fighter.stun=Math.max(14,fighter.stun)
        this.events.push({kind:'land',fighter})
      }
    }
    fighter.x=clamp(fighter.x+fighter.vx,EDGE,RIGHT_EDGE)
    fighter.vx*=.8
  }
  private checkAttack(owner:Fighter,target:Fighter,impacts:Impact[]){
    const attack=owner.attack
    if(!attack)return
    const {move,frame,facing}=attack
    if(frame<move.startup||frame>=move.startup+move.active)return
    if(!attack.fired){
      attack.fired=true
      this.events.push({kind:move.kind==='ward'||move.kind==='projectile'?'cast':'swing',fighter:owner,move})
      if(move.kind==='ward')owner.ward=move.counter?move.active:125
      if(move.kind==='teleport'){
        const desired=owner.x+facing*Math.min(190,Math.abs(target.x-owner.x)+76)
        owner.x=clamp(desired,EDGE,RIGHT_EDGE)
        owner.facing=Math.sign(target.x-owner.x)||facing
        attack.facing=owner.facing
        this.events.push({kind:'dash',fighter:owner})
      }
      if(move.kind==='projectile'){
        const speed=owner.definition.id==='darius'?9:12
        this.projectiles.push({x:owner.x+facing*27,y:owner.y-(move.height<60?24:63),speed:facing*speed,life:Math.ceil(move.reach/speed),owner,move})
      }
    }
    if(move.finalProjectile&&frame===move.startup+move.active-1){
      const finisher={...move,kind:'projectile' as const,damage:move.finisherDamage,finalProjectile:false}
      this.projectiles.push({x:owner.x+attack.facing*35,y:owner.y-63,speed:attack.facing*14,life:65,owner,move:finisher})
    }
    if(move.kind==='ward'||move.kind==='projectile'||target.invulnerable)return
    const age=frame-move.startup
    const hitIndex=move.hitFrames.findIndex((start,index)=>age>=start&&age<(move.hitFrames[index+1]??move.active))
    if(hitIndex<0||attack.hits.has(hitIndex)||!overlaps(owner.hitbox(attack),target.hurtbox()))return
    attack.hits.add(hitIndex);attack.connected=true
    impacts.push({owner,target,move,facing:attack.facing,finisher:move.hitFrames.length>1&&hitIndex===move.hitFrames.length-1})
  }
  private applyHit({owner,target,move,facing,finisher}:Impact){
    if(target.ward&&target.attack?.move.counter&&move.kind!=='ward'){
      const counter=target.attack.move
      target.ward=0;target.attack=undefined
      this.applyHit({owner:target,target:owner,move:{...counter,kind:'strike',counter:false},facing:Math.sign(owner.x-target.x)||target.facing,finisher:false})
      return
    }
    const correctHeight=move.level==='mid'||(move.level==='low'?target.crouching:!target.crouching)
    const guarded=target.guard&&correctHeight&&Math.sign(owner.x-target.x)===target.facing
    const protectedHit=guarded||target.ward>0
    const scale=Math.max(.35,1-owner.combo*.12)
    const base=finisher?move.finisherDamage:move.damage
    const damage=Math.round(base*scale*(.85+owner.definition.attack*.026)*(1.12-target.definition.defense*.021)*(protectedHit?.15:1))
    owner.damage+=Math.min(target.hp,damage);target.hp=Math.max(0,target.hp-damage)
    owner.energy=Math.min(300,owner.energy+(move.meterGain?(protectedHit?move.meterGain*.4:move.meterGain+Math.min(owner.combo,8)):0));target.energy=Math.min(300,target.energy+(protectedHit?10:7))
    if(!protectedHit){owner.combo++;owner.best=Math.max(owner.best,owner.combo);owner.comboTime=move.hitstun+20}
    target.attack=undefined;target.dash=0;target.buffer=undefined
    target.guard=guarded
    target.stun=protectedHit?move.blockstun:finisher?34:move.hitstun
    const knockback=finisher?14:move.knockback
    target.vx=facing*knockback*(protectedHit?.55:1)
    target.knockedDown=!protectedHit&&knockback>=10
    target.pose=protectedHit?'block':target.knockedDown?'down':'hurt'
    if(!protectedHit&&move.launch){target.vy=-move.launch;target.knockedDown=true;target.stun=Math.max(target.stun,Math.ceil(move.launch/.73)*2+12)}
    this.hitstop=finisher?10:move.pose==='ultimate'?4:protectedHit?3:5
    this.events.push({kind:protectedHit?'guard':'hit',fighter:target,damage,move,finisher})
  }
  private end(){
    const [a,b]=this.fighters
    const delta=a.hp/a.definition.health-b.hp/b.definition.health
    this.outcome=Math.abs(delta)<.00001?-1:delta>0?0:1
    for(const fighter of this.fighters){
      fighter.attack=undefined
      fighter.pose=this.outcome===fighter.player?'victory':this.outcome===-1&&fighter.hp?'idle':'death'
      fighter.y=FLOOR
    }
    if(a.hp<=0||b.hp<=0)this.events.push({kind:'ko',fighter:a.hp<=0?a:b})
  }
}


import type { Command, Fighter } from './engine.ts'
import type { Difficulty } from '../settings.ts'
const profiles = {
  Easy:{reaction:24,guard:0.22,special:0.15,combo:0.1,aggression:0.48},
  Normal:{reaction:13,guard:0.5,special:0.35,combo:0.58,aggression:0.75},
  Hard:{reaction:6,guard:0.76,special:0.58,combo:0.93,aggression:0.92},
}
export class OpponentAI {
  private wait = 0
  private direction = 0
  private guarding = false
  constructor(private difficulty: Difficulty, private random = Math.random) {}
  decide(self: Fighter, other: Fighter): Command {
    const p = profiles[this.difficulty]
    if (self.stun) return {}
    if (--this.wait > 0) return {direction:this.direction,guard:this.guarding,crouch:other.attack?.move.level==="low"}
    this.wait = p.reaction + Math.floor(this.random()*p.reaction)
    const distance = Math.abs(self.x-other.x)
    const toward = Math.sign(other.x-self.x)
    const reach = self.moves.light.reach
    this.direction = distance > reach*0.88 ? toward : 0
    this.guarding = false
    if (self.attack) {
      if (self.attack.connected && self.attack.move.cancel && this.random() < p.combo) {
        this.wait = 4
        return {move:'light'}
      }
      return {}
    }
    if (other.attack && distance < other.attack.move.reach+12 && this.random() < p.guard) {
      this.guarding = true
      this.direction = -toward
      return {direction:this.direction,guard:true,crouch:other.attack?.move.level==='low'}
    }
    if (self.energy >= 100 && distance < self.moves.ultimate.reach && this.random() < p.special) return {move:self.energy>=300?'ultimate3':self.energy>=200?'ultimate2':'ultimate'}
    if (self.hp < self.definition.health*0.55 && !self.cooldowns.skillBack && distance < 190 && this.random() < p.special) return {move:'skillBack'}
    for (const slot of ['special1','special2','skillBack','skillUp','skillDown'] as const) {
      const move = self.moves[slot]
      if (move.kind !== 'ward' && self.energy >= move.cost && !self.cooldowns[slot] && distance < move.reach+(move.kind === 'dash' ? 76 : 0) && this.random() < p.special) return {move:slot}
    }
    if (distance < reach && this.random() < p.aggression) return {move:'light'}
    if (distance < reach*0.7 && this.random()<0.25) return {direction:-toward}
    return {direction:this.direction,jump:distance>reach && this.random()<0.12}
  }
}



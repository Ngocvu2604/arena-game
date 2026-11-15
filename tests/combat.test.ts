import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {Combat,type Command} from '../src/game/combat/engine.ts'
const tick=(combat:Combat,frames:number,first:Command={},second:Command={})=>{
  for(let i=0;i<frames;i++) combat.step([i?{}:first,second])
}
function near(){
  const combat=new Combat([0,1],90)
  combat.fighters[0].x=555
  combat.fighters[1].x=623
  return combat
}
test('a melee attack has startup and connects once per active window',()=>{
  const combat=near(),target=combat.fighters[1]
  const hp=target.hp
  tick(combat,6,{move:'light'})
  assert.equal(target.hp,hp)
  tick(combat,1)
  assert.ok(target.hp<hp)
  const after=target.hp
  tick(combat,30)
  assert.equal(target.hp,after)
})
test('guard reduces damage, while a distant melee attack misses',()=>{
  const hit=near(),block=near(),miss=new Combat([0,1],90)
  tick(hit,30,{move:'light'})
  tick(block,30,{move:'light'},{guard:true})
  tick(miss,30,{move:'light'})
  assert.ok(hit.fighters[0].damage>block.fighters[0].damage)
  assert.ok(block.fighters[0].damage>0)
  assert.equal(miss.fighters[0].damage,0)
})
test('Aria can deal damage with a projectile beyond melee range',()=>{
  const combat=new Combat([2,0],90)
  combat.fighters[0].energy=50
  tick(combat,78,{move:'special1'})
  assert.ok(combat.fighters[0].damage>0)
  assert.ok(combat.fighters[0].energy>50)
  assert.equal(combat.projectiles.length,0)
})
test('a fight ends on a knockout or a timeout',()=>{
  const ko=near()
  ko.fighters[1].hp=1
  tick(ko,30,{move:'light'})
  assert.equal(ko.outcome,0)
  assert.equal(ko.fighters[1].pose,'death')
  const timeout=new Combat([0,1],1)
  tick(timeout,60)
  assert.equal(timeout.outcome,-1)
  assert.equal(timeout.seconds,0)
})



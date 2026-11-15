import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {Combat,FLOOR,type Command} from '../src/game/combat/engine.ts'
import {ChordBuffer} from '../src/game/combat/chords.ts'
import {defaults,parseSettings,validKeys,compactPlayer2} from '../src/game/settings.ts'
import {energyLayers,EnergyBar} from '../src/game/energyBar.ts'
function setup(picks:[number,number]=[0,1]){
 const c=new Combat(picks,120);c.fighters[0].x=550;c.fighters[1].x=617;return c
}
function run(c:Combat,n:number,first:Command={},defense:Command={}){
 for(let i=0;i<n;i++)c.step([i?{}:first,defense])
}
test('new controls have no conflicts and old schemes migrate safely',()=>{
 const keys=defaults().keys
 assert.deepEqual(keys[0],['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU','KeyI'])
 keys[1]=[...compactPlayer2];assert.ok(validKeys(keys))
 assert.deepEqual(parseSettings(JSON.stringify({version:2,keys})).keys,defaults().keys)
 assert.deepEqual(parseSettings(JSON.stringify({version:3,keys})).keys,keys)
})
test('chord window resolves late directions and higher priority exactly once',()=>{
 const c=new ChordBuffer()
 assert.equal(c.sample({move:'special1'}).move,undefined)
 assert.equal(c.sample({direction:1}).move,undefined)
 assert.deepEqual(c.sample({direction:1}),{move:'special1',direction:1,up:undefined,crouch:undefined,jump:false,dash:false})
 assert.equal(c.sample({}).move,undefined)
 c.sample({move:'light'});c.sample({move:'ultimate',up:true})
 c.sample({});assert.equal(c.sample({}).move,'ultimate')
})
test('all directional skill choices mirror with facing, and up never jumps',()=>{
 for(const facing of [1,-1])for(const [command,slot] of [
  [{move:'special1'},'special1'],[{direction:facing,move:'special1'},'special2'],
  [{direction:-facing,move:'special1'},'skillBack'],[{up:true,move:'special1'},'skillUp'],
  [{crouch:true,move:'special1'},'skillDown'],[{up:true,move:'light'},'launcher'],
  [{crouch:true,move:'light'},'low']
 ] as [Command,string][]){
  const c=setup();c.fighters[1].x=550+67*facing;c.step([command,{}])
  assert.equal(c.fighters[0].attack?.slot,slot);assert.equal(c.fighters[0].y,FLOOR)
 }
 const c=setup();c.step([{jump:true},{}]);c.step([{move:'special1'},{}])
 assert.equal(c.fighters[0].attack?.slot,'skillAir')
})
test('four normal hits connect and finisher ends the normal chain',()=>{
 for(let character=0;character<4;character++){
  const c=setup([character,3]);const seen=new Set<string>();c.step([{move:'light'},{}])
  let previous=''
  for(let i=0;i<170;i++){
   const a=c.fighters[0].attack
   if(a)seen.add(a.slot)
   const send=a?.connected&&a.move.cancels.light&&previous!==a.slot
   if(send)previous=a!.slot
   c.step([{move:send?'light':undefined},{}])
  }
  assert.deepEqual([...seen],['light','combo','combo3','finisher'])
  assert.equal(c.fighters[0].best,4,'four hits '+character)
  assert.equal(c.fighters[0].attack,undefined)
 }
})
test('normals cancel into directional skills and ultimates only after connecting',()=>{
 for(const command of [{move:'special1',direction:1},{move:'ultimate',up:true}] as Command[]){
  const c=setup();c.fighters[0].energy=300;c.step([{move:'light'},{}])
  for(let i=0;i<35;i++)c.step([c.fighters[0].attack?.connected?command:{},{}])
  const f=c.fighters[0];assert.ok((f.cooldowns[command.move==='ultimate'?'ultimate2':'special2']??0)>0)
 }
 const c=setup();c.fighters[1].x=1100;c.step([{move:'light'},{}])
 c.step([{move:'special1'},{}]);assert.equal(c.fighters[0].attack?.slot,'light')
})
test('down guards, but down skill wins and guard resumes after recovery',()=>{
 const c=setup();run(c,30,{move:'light'},{crouch:true});assert.ok(c.fighters[0].damage<15)
 const skill=setup();skill.step([{crouch:true,move:'special1'},{}])
 assert.equal(skill.fighters[0].attack?.slot,'skillDown');assert.equal(skill.fighters[0].guard,false)
 for(let i=0;i<100;i++)skill.step([{crouch:true},{}])
 assert.equal(skill.fighters[0].guard,true)
})
test('twelve distinct ultimates deduct once, reject insufficient energy, and finish',()=>{
 for(let character=0;character<4;character++){
  const names=new Set<string>()
  for(let tier=1;tier<=3;tier++){
   const command:Command={move:'ultimate',up:tier===2,crouch:tier===3}
   const c=setup([character,3]);const f=c.fighters[0];f.energy=300
   c.step([command,{}]);assert.equal(f.energy,300-tier*100)
   names.add(f.attack!.move.name)
   run(c,220);assert.equal(f.energy,300-tier*100);assert.equal(f.attack,undefined)
   assert.ok(f.damage>100,'damage '+character+' tier '+tier+' = '+f.damage)
   const failed=setup([character,3]);failed.fighters[0].energy=tier*100-1
   failed.step([command,{}]);assert.equal(failed.fighters[0].attack,undefined)
   assert.equal(failed.fighters[0].energy,tier*100-1)
  }
  assert.equal(names.size,3)
 }
})
test('dash requires no direction, supports dash attack, and both bodies cross',()=>{
 const c=setup();c.step([{dash:true},{}]);assert.ok(c.fighters[0].x>550)
 c.step([{move:'light'},{}]);assert.equal(c.fighters[0].attack?.slot,'dashAttack')
 const cross=setup();for(let i=0;i<30;i++)cross.step([{direction:1},{}])
 assert.ok(cross.fighters[0].x>cross.fighters[1].x);assert.equal(cross.fighters[0].facing,-1)
 cross.step([{move:'light'},{}]);assert.equal(cross.fighters[0].attack?.facing,-1)
})
test('move permissions, startup interruption, cooldown and counter obey states',()=>{
 const c=setup();c.step([{move:'heavy'},{move:'light'}]);run(c,20);assert.equal(c.fighters[0].attack,undefined)
 const moving=setup();moving.step([{move:'light'},{}]);const x=moving.fighters[0].x
 moving.step([{direction:1},{}]);assert.ok(moving.fighters[0].x>x)
 const fixed=setup();fixed.step([{move:'special1'},{}]);const start=fixed.fighters[0].x
 fixed.step([{direction:1},{}]);assert.equal(fixed.fighters[0].x,start)
 const counter=setup();counter.step([{direction:-1,move:'special1'},{}]);run(counter,13)
 counter.step([{}, {move:'light'}]);run(counter,45)
 assert.ok(counter.fighters[1].hp<counter.fighters[1].definition.health)
 const cooldown=setup();run(cooldown,60,{move:'special1'});cooldown.step([{move:'special1'},{}])
 assert.equal(cooldown.fighters[0].attack,undefined)
})
test('energy is earned by combat and visual layers never mutate actual energy',()=>{
 const c=setup();run(c,60);assert.equal(c.fighters[0].energy,0)
 run(c,35,{move:'light'});assert.ok(c.fighters[0].energy>0);assert.ok(c.fighters[1].energy>0)
 assert.deepEqual(energyLayers(250),[1,1,.5]);assert.deepEqual(energyLayers(150),[1,.5,0])
 const bar=new EnergyBar();bar.update(300,16);assert.ok(bar.displayed>0&&bar.displayed<300)
})
test('all fighters can execute every directional skill without locking their state',()=>{
 for(let character=0;character<4;character++)for(const command of [
  {move:'special1'},{move:'special1',direction:1},{move:'special1',direction:-1},
  {move:'special1',up:true},{move:'special1',crouch:true}
 ] as Command[]){
  const c=setup([character,3]);c.step([command,{}]);const move=c.fighters[0].attack!.move
  assert.equal(move.owner,c.fighters[0].definition.id)
  run(c,180);assert.equal(c.fighters[0].attack,undefined);assert.equal(c.fighters[0].stun,0)
  if(move.kind!=='ward')assert.ok(c.fighters[0].damage>0,character+' '+move.name)
 }
})
test('dash attack can cross and cancel toward the opponent, and cooldown buffers expire',()=>{
 const c=setup();c.step([{dash:true},{}]);c.step([{move:'light'},{}])
 let cancelled=false
 for(let i=0;i<90;i++){
  const f=c.fighters[0]
  c.step([{move:f.attack?.slot==='dashAttack'&&f.attack.connected?'light':undefined},{}])
  if(f.attack?.slot==='combo'){
   cancelled=true;assert.equal(f.attack.facing,Math.sign(c.fighters[1].x-f.x))
  }
 }
 assert.ok(cancelled)
 const wait=setup();run(wait,60,{move:'special1'});wait.step([{move:'special1'},{}]);run(wait,100)
 assert.equal(wait.fighters[0].attack,undefined)
})



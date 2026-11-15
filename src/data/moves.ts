import type {MoveSlot,Pose} from './characters.ts'
export type MoveKind='strike'|'dash'|'projectile'|'ward'|'area'|'teleport'
export type HitLevel='mid'|'low'|'overhead'
export interface Move {
 name:string;owner:string;input:string;animation:string;vfx:string;sfx:string
 pose:Pose;kind:MoveKind;startup:number;active:number;recovery:number
 damage:number;hitstun:number;blockstun:number;knockback:number;reach:number;height:number
 cost:number;cooldown:number;cancel:number;meterGain:number;level:HitLevel;launch:number;travel:number
 hitFrames:number[];finisherDamage:number;cancels:Partial<Record<MoveSlot,MoveSlot>>
 allowMovement:boolean;moveSpeed:number;allowTurn:boolean;dashCancel:boolean;comboPermission:boolean
 counter:boolean;anchor:boolean;finalProjectile:boolean
}
const make=(name:string,pose:Pose,extra:Partial<Move>={}):Move=>({
 name,owner:'',input:'',animation:pose,vfx:'slash',sfx:'swing',pose,kind:'strike',
 startup:7,active:6,recovery:17,damage:48,hitstun:27,blockstun:12,knockback:1,
 reach:110,height:110,cost:0,cooldown:0,cancel:14,meterGain:13,level:'mid',launch:0,travel:0,
 hitFrames:[0],finisherDamage:100,cancels:{},allowMovement:true,moveSpeed:.35,allowTurn:false,
 dashCancel:false,comboPermission:true,counter:false,anchor:false,finalProjectile:false,...extra
})
const cancelSkills:Partial<Record<MoveSlot,MoveSlot>>={special1:'special1',ultimate:'ultimate'}
function kit(id:string,reach:number,speed:number,heavy:number):Record<MoveSlot,Move>{
 const normal=(name:string,pose:Pose,extra:Partial<Move>={})=>make(name,pose,{reach,startup:speed,...extra})
 const skill=(name:string,kind:MoveKind,extra:Partial<Move>={})=>make(name,'special1',{
 kind,reach:reach+20,damage:105,startup:speed+5,active:10,recovery:25,cooldown:90,
 cancel:0,comboPermission:false,allowMovement:false,knockback:5,vfx:id,sfx:'cast',...extra})
 const ult=(name:string,tier:number,kind:MoveKind,extra:Partial<Move>={})=>skill(name,kind,{
 pose:'ultimate',cost:tier*100,startup:18+tier*4,active:14,recovery:32+tier*5,
 cooldown:160,damage:160+tier*40,finisherDamage:170+tier*30,meterGain:0,
 reach:200,height:170,knockback:12,vfx:id+'-ultimate-'+tier,sfx:'ultimate-'+id,...extra})
 const result={
 light:normal('Opening Strike','light',{cancels:{light:'combo',...cancelSkills}}),
 combo:normal('Second Strike','combo',{damage:55,cancels:{light:'combo3',...cancelSkills}}),
 combo3:normal('Third Strike','special1',{damage:63,cancels:{light:'finisher',...cancelSkills}}),
 finisher:normal('Combo Finisher','heavy',{damage:heavy,knockback:12,launch:5,recovery:28,cancels:cancelSkills}),
 heavy:normal('Heavy Strike','heavy',{damage:heavy,startup:speed+8,recovery:30,knockback:11}),
 air:normal('Aerial Strike','air',{level:'overhead',active:12,cancels:cancelSkills}),
 airHeavy:normal('Aerial Finisher','heavy',{level:'overhead',damage:heavy}),
 low:normal('Low Strike','light',{level:'low',height:50,cancels:cancelSkills}),
 lowHeavy:normal('Sweep','heavy',{level:'low',height:50,damage:heavy}),
 forward:normal('Lunging Strike','combo',{travel:3,cancels:{light:'combo',...cancelSkills}}),
 backward:normal('Retreating Strike','light',{travel:-2}),
 launcher:normal('Rising Strike','heavy',{launch:12,height:170,cancels:cancelSkills}),
 dashAttack:normal('Dash Attack','dash',{kind:'dash',travel:6,damage:90,recovery:26,cancels:{light:'combo',...cancelSkills}}),
 special1:skill('Crimson Wave','projectile',{reach:680,height:95}),
 special2:skill('Blade Rush','dash',{travel:7,active:24,hitFrames:[0,8,16],damage:35,finisherDamage:75}),
 skillBack:skill('Counter Slash','ward',{counter:true,active:25,damage:110,cooldown:160}),
 skillUp:skill('Rising Blade','strike',{launch:14,height:210}),
 skillDown:skill('Crimson Sweep','strike',{level:'low',height:55,knockback:12}),
 skillAir:skill('Falling Blade','strike',{pose:'air',level:'overhead',height:150,travel:3}),
 ultimate:ult('Crimson Blade',1,'projectile',{reach:1000,height:160}),
 ultimate2:ult('Scarlet Cross',2,'strike',{active:24,hitFrames:[0,12],damage:145,finisherDamage:180,knockback:1,reach:265}),
 ultimate3:ult('Scarlet Tempest',3,'strike',{active:55,hitFrames:[0,9,18,27,36],damage:56,finisherDamage:100,knockback:0,reach:250,finalProjectile:true}),
 } satisfies Record<MoveSlot,Move>
 if(id==='ren')Object.assign(result,{
 special1:skill('Shadow Shuriken','projectile',{reach:720,height:70,startup:6}),
 special2:skill('Phantom Strike','teleport',{reach:130,startup:5,damage:125}),
 skillBack:skill('Shadow Decoy','ward',{counter:true,travel:-3,active:24,cooldown:150}),
 skillUp:skill('Spinning Shadow','strike',{launch:13,height:200,active:16,hitFrames:[0,8],damage:50}),
 skillDown:skill('Low Dagger','strike',{level:'low',height:45,startup:5}),
 skillAir:skill('Air Shuriken','projectile',{pose:'air',reach:650}),
 ultimate:ult('Phantom Rush',1,'dash',{travel:2,reach:150,active:32,hitFrames:[0,8,16,24],damage:40,finisherDamage:100,knockback:0}),
 ultimate2:ult('Shadow Barrage',2,'area',{anchor:true,reach:180,active:38,hitFrames:[0,9,18,27],damage:65,knockback:0}),
 ultimate3:ult('Thousand Shadows',3,'area',{anchor:true,reach:235,active:58,hitFrames:[0,8,16,24,32,40,50],damage:48,finisherDamage:200,knockback:0})
 })
 if(id==='aria')Object.assign(result,{
 special1:skill('Arcane Bolt','projectile',{reach:740,cooldown:60}),
 special2:skill('Arcane Beam','strike',{reach:430,height:90,active:18,hitFrames:[0,9],damage:55}),
 skillBack:skill('Mystic Barrier','ward',{active:20,cooldown:220}),
 skillUp:skill('Astral Pillar','area',{reach:75,height:290,launch:14,anchor:true}),
 skillDown:skill('Rune Explosion','area',{reach:150,height:65,level:'low'}),
 skillAir:skill('Falling Star','area',{pose:'air',anchor:true,height:300,reach:100}),
 ultimate:ult('Arcane Burst',1,'area',{anchor:true,reach:175,damage:230}),
 ultimate2:ult('Mystic Rain',2,'area',{anchor:true,reach:220,height:350,active:42,hitFrames:[0,10,20,30],damage:65,knockback:0}),
 ultimate3:ult('Celestial Ruin',3,'area',{anchor:true,reach:300,height:380,active:64,hitFrames:[0,10,20,30,40,52],damage:65,finisherDamage:210,knockback:0})
 })
 if(id==='darius')Object.assign(result,{
 special1:skill('Ground Shockwave','projectile',{reach:600,height:48,level:'low',damage:150,startup:17}),
 special2:skill('Iron Shoulder','dash',{travel:8,active:13,damage:140,knockback:12}),
 skillBack:skill('Iron Counter','ward',{counter:true,active:32,damage:170,cooldown:180}),
 skillUp:skill('Axe Launcher','strike',{height:200,launch:15,damage:130}),
 skillDown:skill('Ground Pound','area',{reach:160,height:65,level:'low',damage:145}),
 skillAir:skill('Falling Hammer','area',{pose:'air',reach:170,height:270,damage:135}),
 ultimate:ult('Iron Crusher',1,'strike',{damage:280,reach:185,launch:10}),
 ultimate2:ult('Earth Breaker',2,'area',{reach:310,height:95,active:35,hitFrames:[0,10,20],damage:85,knockback:0,level:'low'}),
 ultimate3:ult("Titan's Judgment",3,'area',{reach:285,height:210,active:48,hitFrames:[0,12,24,36],damage:90,finisherDamage:260,knockback:0,launch:0})
 })
 for(const [slot,move] of Object.entries(result)){
 move.owner=id;move.animation=id+'-move-'+slot
 move.input=({light:'J',combo:'J → J',combo3:'J → J → J',finisher:'J × 4',special1:'U',special2:'Forward + U',skillBack:'Back + U',skillUp:'Up + U',skillDown:'Down + U',skillAir:'Air + U',ultimate:'I',ultimate2:'Up + I',ultimate3:'Down + I'} as Record<string,string>)[slot]??slot
 }
 return result
}
export const moves:Record<string,Record<MoveSlot,Move>>={
 kael:kit('kael',110,6,115),ren:kit('ren',90,4,95),aria:kit('aria',95,8,90),darius:kit('darius',130,9,155)
}


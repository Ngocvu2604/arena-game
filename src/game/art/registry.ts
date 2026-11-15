import {moves} from '../../data/moves'
import {options} from '../settings'
import Phaser from 'phaser'
import {poses,roster,type Pose} from '../../data/characters'
import {stages} from '../../data/stages'
import {renderStage,thumbnail} from './stageArt'
import {random} from './pixels'
export function stageAssets(scene:Phaser.Scene,index:number) {
  const stage=stages[index]
  const layers=renderStage(stage)
  layers.forEach((canvas,i)=>scene.textures.addCanvas(stage.id+i,canvas))
  scene.textures.addCanvas('thumb-'+stage.id,thumbnail(layers))
}
export function titleAssets(scene:Phaser.Scene) {
  renderStage(stages[2],true).forEach((canvas,i)=>scene.textures.addCanvas('title'+i,canvas))
}
interface FighterArt {
  bodyHeight:number
  pivot:{x:number;y:number}
  framesPerClip:Record<Pose,string[]>
}
function metadata(scene:Phaser.Scene,id:string) {
  return (scene.textures.get(id).customData as {meta:FighterArt}).meta
}
export function queueFighterAssets(scene:Phaser.Scene) {
  scene.load.atlas('combat-slash',import.meta.env.BASE_URL+'assets/effects/slash.png',import.meta.env.BASE_URL+'assets/effects/slash.json')
  for(const {id} of roster) {
    const dir=import.meta.env.BASE_URL+'assets/characters/'+id
    scene.load.atlas(id, dir+'/sprites/fighter.png', dir+'/animations/fighter.json')
    scene.load.image('portrait-'+id,dir+'/sprites/portrait.png')
  }
}
export function registerFighterAnimations(scene:Phaser.Scene) {
  const loops:Pose[]=['idle','walk','run','victory','block','crouch','dash']
  const speeds:Partial<Record<Pose,number>>={idle:9,walk:9,run:15,victory:9,block:7,crouch:7,dash:16,death:10}
  for(const {id} of roster) {
    const data=metadata(scene,id)
    for(const pose of poses) {
      const frames=data.framesPerClip[pose].map(frame=>({key:id,frame}))
      if(!frames.length || frames.some(entry=>!scene.textures.get(id).has(entry.frame))) throw new Error('Missing animation: '+id+'/'+pose)
      scene.anims.create({key:id+'-'+pose,frames,frameRate:speeds[pose]??14,repeat:loops.includes(pose)?-1:0})
    }
    for(const [slot,move] of Object.entries(moves[id])) {
      if(scene.anims.exists(move.animation))continue
      const sequences:Record<string,Pose[]>={combo3:['combo','special1'],ultimate:['special1','heavy'],ultimate2:['special2','heavy','special1'],ultimate3:['light','combo','special1','heavy','ultimate'],skillUp:['heavy','special1'],skillDown:['crouch','heavy'],skillBack:['block','special2'],skillAir:['jump','air']}
      const frames=(sequences[slot]??[move.pose]).flatMap(pose=>data.framesPerClip[pose].map(frame=>({key:id,frame})))
      scene.anims.create({key:move.animation,frames,frameRate:16,repeat:0})
    }
  }
}
export function fighterSprite(scene:Phaser.Scene,index:number,x:number,y:number,scale:number,facing=1) {
  const id=roster[index].id
  const {bodyHeight,pivot}=metadata(scene,id)
  const factor=40*scale/bodyHeight
  return scene.add.sprite(x,y,id,'idle-0').setOrigin(pivot.x,pivot.y).setScale(facing*factor,factor).play(id+'-idle')
}
export function background(scene:Phaser.Scene,id:string,dim=0,animated=true) {
  const extension=scene.add.image(640,360,id+'0').setAlpha(.6)
  const cover=()=>{
    const width=scene.scale.width/scene.cameras.main.zoom
    const height=scene.scale.height/scene.cameras.main.zoom
    const factor=Math.max(width/336,height/180)
    extension.setScale(factor)
  }
  cover()
  scene.events.on('postupdate',cover)
  scene.events.once('shutdown',()=>scene.events.off('postupdate',cover))
  const layers=[0,1,2].map(i=>scene.add.image(640,360,id+i).setDisplaySize(1344,720))
  if(dim) scene.add.rectangle(640,360,1280,720,0x16131d,dim)
  if(animated) {
    const rng=random(456),motes=Array.from({length:34},()=>({
      x:rng()*1280,y:100+rng()*570,rate:9+rng()*25,size:1+Math.floor(rng()*3),phase:rng()*6.3,
    }))
    const g=scene.add.graphics()
    const start=scene.time.now
    const update=()=>{
      const s=(scene.time.now-start)/1000
      g.clear()
      if(!options.current.background) return
      for(const m of motes.slice(0,options.current.performance?9:34)) {
        g.fillStyle(id==='forest'?0xbcca82:0xe6a670,.32+.2*Math.sin(s*2+m.phase))
        g.fillRect(Math.round((m.x+s*m.rate)%1280), Math.round(m.y+10*Math.sin(s*.6+m.phase)),m.size,m.size)
      }
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE,update)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off(Phaser.Scenes.Events.UPDATE,update))
  }
  return layers
}








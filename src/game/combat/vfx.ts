import type Phaser from 'phaser'
import type {Fighter} from './engine'
import {FLOOR} from './engine'
/** Effects use the same attack frame/anchor as the actual hitboxes. */
export function paintSkill(g:Phaser.GameObjects.Graphics,f:Fighter,sprite:Phaser.GameObjects.Sprite,quality:number){
 const a=f.attack
 if(!a)return false
 const m=a.move,age=a.frame-m.startup
 if(age<0||age>=m.active)return false
 const id=f.definition.id,x=m.anchor?a.fieldX:f.x,y=f.y-65,t=age/m.active
 const tint=parseInt(f.definition.palette[2].slice(1),16)
 const line=(x1:number,y1:number,x2:number,y2:number,width=3)=>g.lineStyle(width,tint,.85).lineBetween(Math.round(x1),Math.round(y1),Math.round(x2),Math.round(y2))
 if(m.vfx==='slash')return false
 if(m.kind==='ward'){
  if(id==='ren'){
   if(sprite.scene.children.length<180){
    const clone=sprite.scene.add.image(f.x-a.facing*48,f.y,sprite.texture.key,sprite.frame.name)
     .setOrigin(sprite.originX,sprite.originY).setScale(sprite.scaleX,sprite.scaleY).setTint(0x71978e).setAlpha(.45)
    sprite.scene.time.delayedCall(18,()=>clone.destroy())
   }
   return true
  }
  g.lineStyle(3,tint,.85).strokeEllipse(f.x,f.y-60,88+Math.sin(age*.3)*6,130)
  if(m.counter)line(f.x-25,f.y-13,f.x+25,f.y-13,4)
  return true
 }
 if(m.kind==='projectile')return false
 if(id==='ren'){
  if(m.kind==='area'){
   const count=quality>.3?(m.cost===300?5:3):2
   for(let i=0;i<count;i++){
    const side=i%2?1:-1,px=x+side*(55+i*18),py=y-((age+i*7)%22)
    if(sprite.scene.children.length<180){
     // Reuse the loaded character atlas instead of placeholder rectangles.
     const clone=sprite.scene.add.image(px,py+65,sprite.texture.key,sprite.frame.name)
      .setOrigin(sprite.originX,sprite.originY).setScale(-side*Math.abs(sprite.scaleX),sprite.scaleY)
      .setTint(0x71978e).setAlpha(.32)
     sprite.scene.time.delayedCall(18,()=>clone.destroy())
    }
    line(px,py-30,x-side*15,py+35,2+(m.cost===300?2:0))
   }
  }else{
   line(f.x-a.facing*50,y-25,f.x+a.facing*m.reach,y+22)
   line(f.x-a.facing*40,y-5,f.x+a.facing*m.reach,y+38,2)
  }
  return true
 }
 if(id==='aria'){
  if(a.slot==='special2'){
   const end=f.x+a.facing*m.reach
   g.fillStyle(tint,.22).fillRect(Math.min(f.x,end),y-22,m.reach,44)
   line(f.x,y-16,end,y-16,3);line(f.x,y+16,end,y+16,3);line(f.x,y,end,y,5)
  }else if(a.slot==='skillUp'){
   const h=Math.min(290,age*45)
   g.fillStyle(tint,.2).fillRect(x-45,FLOOR-h,90,h)
   line(x-35,FLOOR,x-35,FLOOR-h);line(x+35,FLOOR,x+35,FLOOR-h)
  }else if(m.cost>=200){
   g.lineStyle(3,tint,.8).strokeEllipse(x,FLOOR-3,m.reach*2,36)
   const count=quality>.6?9:4
   for(let i=0;i<count;i++){
    const px=x+Math.sin(i*2.4)*m.reach*.85,py=FLOOR-330+((age*22+i*47)%310)
    line(px,py-75,px,py,4)
    g.fillStyle(0xeee1e8).fillRect(px-3,py-4,6,12)
   }
   if(m.cost===300)g.lineStyle(4,tint,.5).strokeCircle(x,y,40+Math.sin(t*Math.PI)*120)
  }else{
   const radius=20+Math.sin(t*Math.PI)*m.reach
   g.lineStyle(5,tint,.85).strokeCircle(x,FLOOR-40,radius)
   g.lineStyle(2,0xe8d2e8,.8).strokeCircle(x,FLOOR-40,radius*.68)
  }
  return true
 }
 if(id==='darius'){
  const radius=m.cost===200?Math.min(m.reach,40+age*12):m.reach
  const end=m.cost===200?f.x+a.facing*radius:x
  g.lineStyle(4,tint).beginPath().moveTo(x-radius,FLOOR)
  for(let dx=-radius;dx<=radius;dx+=18)g.lineTo(x+dx,FLOOR+(Math.floor(dx/18)%2?8:-5))
  g.strokePath()
  const count=m.cost===100?3:m.cost===300?8:5
  for(let i=0;i<count;i++){
   const px=m.cost===200?end-a.facing*i*25:x+(i-(count-1)/2)*35
   const h=15+Math.sin((age+i*3)*.35)**2*(m.cost===300?100:55)
   g.fillStyle(0x655344).fillTriangle(px-13,FLOOR,px+16,FLOOR,px+3,FLOOR-h)
   line(px-9,FLOOR-5,px+3,FLOOR-h,2)
  }
  return true
 }
 if(id==='kael'){
  const reach=Math.min(m.reach,230),cx=f.x+a.facing*reach*.5
  if(m.cost===200){
   line(cx-reach*.5,y-80,cx+reach*.5,y+60,7)
   line(cx-reach*.5,y+60,cx+reach*.5,y-80,7)
  }else if(m.cost===300){
   for(let i=0;i<(quality>.3?4:2);i++){
    const cy=y+Math.sin(age*.4+i)*55
    line(cx-reach*.5,cy-35,cx+reach*.5,cy+35,4)
   }
  }else{
   g.lineStyle(4,tint,.9).beginPath().arc(f.x+a.facing*25,y,reach*.65,a.facing>0?-1.4:1.7,a.facing>0?1.3:4.5).strokePath()
  }
  return true
 }
 return false
}


import type Phaser from 'phaser'
export const energyLayers=(value:number)=>[0,1,2].map(level=>Math.max(0,Math.min(1,(value-level*100)/100)))
export class EnergyBar {
 displayed=0
 update(value:number,delta:number){this.displayed+=(value-this.displayed)*(1-Math.exp(-Math.min(delta,100)/95))}
 paint(g:Phaser.GameObjects.Graphics,x:number,reverse:boolean,time:number){
  const w=228,h=14,y=683
  g.fillStyle(0x17151b).fillRect(x,y,w,h)
  g.lineStyle(1,0x99774e).strokeRect(x-2,y-2,w+4,h+4)
  const colors=[0x4a8ebb,0xd6ad53,0xb94b48]
  energyLayers(this.displayed).forEach((ratio,index)=>{
   const length=Math.floor((w-4)*ratio)
   if(length)g.fillStyle(colors[index]).fillRect(reverse?x+w-2-length:x+2,y+2,length,h-4)
  })
  if(this.displayed>299)g.lineStyle(1,0xe0c698,.45+.2*Math.sin(time/180)).strokeRect(x-1,y-1,w+2,h+2)
 }
}


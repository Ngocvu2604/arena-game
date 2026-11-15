import Phaser from 'phaser'
import {audio} from './audio'
import {t} from '../data/translations'
export const color={ink:0x1b181e,cream:'#f1e5cc',gold:'#ddbd84',muted:'#b3a596',deep:0x272228,border:0x776049}
export const W=1280,H=720
export function label(scene:Phaser.Scene,x:number,y:number,value:string,size=18,style:Partial<Phaser.Types.GameObjects.Text.TextStyle>={}) {
  return scene.add.text(x,y,value.normalize('NFC'),{fontFamily:'Arena Serif, Georgia, serif',fontSize:size,color:color.cream, ...style}).setResolution(2).setOrigin(.5)
}
export function mono(scene:Phaser.Scene,x:number,y:number,value:string,size=12,shade=color.muted) {
  return label(scene,x,y,value,size,{fontFamily:'Arena Serif, Georgia, serif',color:shade,fontStyle:'bold'}).setLetterSpacing(0)
}
export function diamond(g:Phaser.GameObjects.Graphics,x:number,y:number,size:number,fill:number) {
  g.fillStyle(fill).fillPoints([{x,y:y-size},{x:x+size,y},{x,y:y+size},{x:x-size,y}],true)
}
function corners(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number) {
  g.fillStyle(c)
  for(const dx of [0,w]) for(const dy of [0,h]) {
    g.fillRect(x+dx+(dx?-13:0),y+dy+(dy?-2:0),13,2)
    g.fillRect(x+dx+(dx?-2:0),y+dy+(dy?-13:0),2,13)
  }
}
export function panel(scene:Phaser.Scene,x:number,y:number,w:number,h:number) {
  const g=scene.add.graphics()
  g.fillStyle(0x100f15,.8).fillRect(x+4,y+5,w,h)
  g.fillStyle(0x1d1a21,.97).fillRect(x,y,w,h)
  g.lineStyle(1,0x68523d).strokeRect(x,y,w,h)
  g.lineStyle(1,0x41343a).strokeRect(x+5,y+5,w-10,h-10)
  corners(g,x,y,w,h,0xc19a60)
  return g
}
export function divider(scene:Phaser.Scene,x:number,y:number,w:number) {
  const g=scene.add.graphics()
  g.lineStyle(1,0x856844).lineBetween(x-w/2,y,x+w/2,y)
  diamond(g,x,y,5,0xc6a173)
  diamond(g,x-w/2,y,2,0xad8658); diamond(g,x+w/2,y,2,0xad8658)
}
export class Nav {
  private entries: {x:number;y:number;paint:(active:boolean)=>void;run:()=>void;adjust?:(direction:number)=>void}[]=[]
  private index=0
  private lastPad:Record<number,boolean>={}
  private keyboard?: (event:KeyboardEvent)=>void
  private update?: ()=>void
  private destroyed=false
  constructor(private scene:Phaser.Scene,private back?:()=>void, keyboard=true) {
    this.keyboard=(event)=>{
      if(this.destroyed||event.repeat||!scene.scene.isActive()) return
      const index=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(event.code)
      if(index>=0) {event.preventDefault();this.move(index)}
      if(event.code==='Tab'&&this.entries.length) {event.preventDefault();this.focus((this.index+(event.shiftKey?-1:1)+this.entries.length)%this.entries.length,true)}
      if(event.code==='Enter'||event.code==='Space') {event.preventDefault();this.activate()}
      if(['Escape','Backspace'].includes(event.code)&&this.back) {event.preventDefault();this.back()}
    }
    if(keyboard) scene.input.keyboard?.on('keydown',this.keyboard)
    this.update=()=>{
      const pad=navigator.getGamepads?.()[0]
      if(!pad || this.destroyed || !scene.scene.isActive()) return
      const ids=[12,13,14,15,0,1]
      ids.forEach((button,index)=>{
        const down=!!pad.buttons[button]?.pressed
        if(down&&!this.lastPad[button]) {
          if(index<4) this.move(index)
          else if(index===4) this.activate()
          else this.back?.()
        }
        this.lastPad[button]=down
      })
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE,this.update)
    const pad=navigator.getGamepads?.()[0]
    for(const key of [12,13,14,15,0,1]) this.lastPad[key]=!!pad?.buttons[key]?.pressed
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.dispose,this)
  }
  add(x:number,y:number,paint:(active:boolean)=>void,run:()=>void,hit:Phaser.GameObjects.Zone) {
    const index=this.entries.push({x,y,paint,run})-1
    hit.setInteractive({useHandCursor:true})
    hit.on('pointerover',()=>this.focus(index,true))
    hit.on('pointerdown',()=>{this.focus(index);this.activate()})
    paint(index===this.index)
    return index
  }
  focus(index:number,sound=false) {
    if (!this.entries[index] || this.index===index) return
    this.entries[this.index]?.paint(false); this.index=index; this.entries[index].paint(true)
    if(sound) audio.play('hover')
  }
  dispose() {
    if(this.destroyed) return
    this.destroyed=true
    this.scene.input.keyboard?.off('keydown',this.keyboard)
    this.scene.events.off(Phaser.Scenes.Events.UPDATE,this.update)
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.dispose,this)
  }
  adjust(index:number,change:(direction:number)=>void){this.entries[index].adjust=change}
  private move(direction:number) {
    const focused=this.entries[this.index]
    if(!focused) return
    if(direction>=2&&focused.adjust){focused.adjust(direction===2?-1:1);audio.play("hover");return}
    const axis=direction<2?'y':'x',cross=axis==='y'?'x':'y', sign=direction%2?1:-1
    let candidate=-1,score=Infinity
    for(const [i,e] of this.entries.entries()) {
      const diff=(e[axis]-focused[axis])*sign
      if(diff<=2) continue
      const distance=diff+Math.abs(e[cross]-focused[cross])*2.25
      if(distance<score) {candidate=i;score=distance}
    }
    if(candidate>=0) this.focus(candidate,true)
    else this.focus((this.index+sign+this.entries.length)%this.entries.length,true)
  }
  private activate() {
    if(this.destroyed || !this.scene.scene.isActive()) return
    audio.enable(); audio.play('confirm'); this.entries[this.index]?.run()
  }
}
export function button(scene:Phaser.Scene,nav:Nav,x:number,y:number,w:number,h:number,title:string,run:()=>void,small=false,translate=true) {
  const g=scene.add.graphics()
  const txt=label(scene,x,y-1,(translate?t(title):title).toLocaleUpperCase(),small?14:20,{fontStyle:'bold'})
  txt.setLetterSpacing(0)
  if(txt.width>w-47) txt.setFontSize(Math.max(10,Math.floor((small?14:20)*(w-47)/txt.width)))
  const hit=scene.add.zone(x,y,w,h)
  const idx=nav.add(x,y,(active)=>{
    const left=x-w/2,top=y-h/2
    const trace=(inset:number)=>{
      const a=left+inset,b=top+inset,c=w-2*inset,d=h-2*inset,k=7
      return [{x:a+k,y:b},{x:a+c-k,y:b},{x:a+c,y:b+k},{x:a+c,y:b+d-k},{x:a+c-k,y:b+d},{x:a+k,y:b+d},{x:a,y:b+d-k},{x:a,y:b+k}]
    }
    g.clear()
    g.fillStyle(0x111016,.87).fillPoints(trace(-2),true)
    g.fillStyle(active?0x432a2a:0x252128).fillPoints(trace(0),true)
    g.lineStyle(active?2:1,active?0xd4a671:0x79614f).strokePoints(trace(0),true)
    g.lineStyle(1,active?0x956648:0x4d3d3d).strokePoints(trace(4),true)
    for(const side of [-1,1]) diamond(g,x+side*(w/2-15),y,active?4:3,active?0xe9be7a:0x8b6e55)
    txt.setColor(active?'#fff1d2':color.cream)
  },run,hit)
  hit.on("pointerdown",()=>{scene.tweens.add({targets:txt,y:y+1,duration:45,yoyo:true})})
  return {idx,txt}
}
export function heading(scene:Phaser.Scene,name:string,sub?:string) {
  mono(scene,640,32,'PIXEL FANTASY ARENA',13,color.gold).setLetterSpacing(0)
  label(scene,640,79,t(name).toLocaleUpperCase(),42,{fontStyle:'bold',stroke:'#1a141b',strokeThickness:4}).setLetterSpacing(0)
  divider(scene,640,111,270)
  if(sub) mono(scene,640,137,sub,13,color.cream)
}







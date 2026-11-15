import type Phaser from 'phaser'
import {ChordBuffer} from './combat/chords'
import type {Command} from './combat/engine'
import {options} from './settings'

const padButtons=[14,15,12,13,0,1,2,3,5]
export class BattleInput {
  private held=new Set<string>()
  private tapped=new Set<string>()
  private lastPads=[new Set<number>(),new Set<number>()]
  private chords=[new ChordBuffer(),new ChordBuffer()]
  private pausePad=false
  private quarantinePad=true
  constructor(scene:Phaser.Scene,onGlobal:(code:string)=>void) {
    const down=(event:KeyboardEvent)=>{
      if(!scene.scene.isActive()||event.ctrlKey||event.metaKey||event.altKey)return
      if(event.code==='Escape'||['F1','F2','F3','F4'].includes(event.code)||options.current.keys.some(line=>line.includes(event.code))){
        event.preventDefault()
        if(!event.repeat&&!this.held.has(event.code)){this.tapped.add(event.code);onGlobal(event.code)}
        this.held.add(event.code)
      }
    }
    const up=(event:KeyboardEvent)=>this.held.delete(event.code)
    const clear=()=>this.reset()
    scene.input.keyboard?.on('keydown',down)
    scene.input.keyboard?.on('keyup',up)
    window.addEventListener('blur',clear)
    scene.events.on('pause',clear)
    scene.events.on('resume',clear)
    scene.events.once('shutdown',()=>{
      scene.input.keyboard?.off('keydown',down)
      scene.input.keyboard?.off('keyup',up)
      window.removeEventListener('blur',clear)
      scene.events.off('pause',clear);scene.events.off('resume',clear)
    })
  }
  reset() {
    this.held.clear();this.tapped.clear()
    this.lastPads.forEach(pad=>pad.clear())
    this.chords.forEach(chord=>chord.reset())
    this.quarantinePad=true
  }
  sample(local:boolean):{commands:[Command,Command];pause:boolean} {

    const connected=Array.from(navigator.getGamepads?.()??[]).filter((pad):pad is Gamepad=>!!pad)
    const commands:[Command,Command]=[{},{}]
    let pause=false
    for(let player=0;player<(local?2:1);player++){
      const pad=connected[player],keys=options.current.keys[player]
      const held=(index:number)=>this.held.has(keys[index])||!!pad?.buttons[padButtons[index]]?.pressed
      const edge=(index:number)=>this.tapped.has(keys[index])||(!this.quarantinePad&&!!pad?.buttons[padButtons[index]]?.pressed&&!this.lastPads[player].has(index))
      const analog=pad?.axes[0]??0
      const direction=Number(held(1)||analog>.42)-Number(held(0)||analog<-.42)
      const move=edge(8)?'ultimate':edge(7)?'special1':edge(4)?'light':undefined
      const dash=!move&&edge(6)
      commands[player]=this.chords[player].sample({direction,dash,jump:!move&&!dash&&edge(5),up:held(2)||(pad?.axes[1]??0)<-.55,
        crouch:held(3)||(pad?.axes[1]??0)>.55,move})
      this.lastPads[player].clear()
      if(pad)for(const [index,id] of padButtons.entries())if(pad.buttons[id]?.pressed)this.lastPads[player].add(index)
      if(player===0){
        const pressed=!!pad?.buttons[9]?.pressed
        pause=pressed&&!this.pausePad&&!this.quarantinePad
        this.pausePad=pressed
      }
    }
    this.tapped.clear();this.quarantinePad=false
    return {commands,pause}
  }
}



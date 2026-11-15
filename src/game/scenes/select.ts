import Phaser from 'phaser'
import {roster} from '../../data/characters'
import {stages} from '../../data/stages'
import {t} from '../../data/translations'
import {audio} from '../audio'
import {background,fighterSprite} from '../art/registry'
import {type Match, options} from '../settings'
import {button,color,heading,label,mono,Nav,panel} from '../ui'
import {entrance,startMatch} from './title'
type SelectData=Partial<Match>
export class FighterSelect extends Phaser.Scene {
  constructor(){super('fighters')}
  create(data:SelectData) {
    entrance(this)
    audio.select('selection')
    background(this,'title',.62)
    heading(this,'Select Fighters')
    const match:Match={mode:data.mode??'cpu',difficulty:data.difficulty??options.current.difficulty,fighters:data.fighters?[...data.fighters]:[0,1],stage:data.stage??0}
    const ready=[false,false]
    let transition:Phaser.Time.TimerEvent|undefined
    let active=0
    const order:number[]=[]
    const previews=[fighterSprite(this,match.fighters[0],260,548,6),fighterSprite(this,match.fighters[1],1020,548,6,-1)]
    const names=[label(this,260,590,'',38,{color:color.gold}),label(this,1020,590,'',38,{color:color.gold})]
    const statuses=[mono(this,260,632,'',18,color.gold),mono(this,1020,632,'',18,color.gold)]
    const frames=this.add.graphics()
    label(this,640,543,'VS',55,{color:color.gold,fontStyle:'bold'})
    const columns=Math.ceil(Math.sqrt(roster.length))
    const cellSize=Math.min(108,370/columns,310/Math.ceil(roster.length/columns))
    const portraitSize=Math.min(78,cellSize-26)
    const cells=roster.map((fighter,index)=>{
      const size=cellSize
      const x=640+(index%columns-(columns-1)/2)*size
      const y=270+Math.floor(index/columns)*size
      panel(this,x-portraitSize/2-7,y-portraitSize/2-7,portraitSize+14,portraitSize+14)
      this.add.image(x,y,'portrait-'+fighter.id).setDisplaySize(portraitSize,portraitSize)
      this.add.zone(x,y,portraitSize+14,portraitSize+14).setInteractive({useHandCursor:true}).on('pointerdown',()=>{
        if(!ready[active]) {match.fighters[active]=index;render();audio.play('hover')}
      })
      return {x,y}
    })
    const render=()=>{
      frames.clear()
      for(let p=0;p<2;p++){
        const fighter=roster[match.fighters[p]]
        const old=previews[p]
        const position={x:old.x,y:old.y}
        old.destroy()
        previews[p]=fighterSprite(this,match.fighters[p],position.x,position.y,6,p?-1:1)
        names[p].setText(fighter.name.toUpperCase())
        statuses[p].setText((p?'P2':'P1')+'  '+t(ready[p]?'Ready':'Choose').toUpperCase())
        const cell=cells[match.fighters[p]],inset=p?5:0
        frames.lineStyle(3,p?0x739ea8:0xe5bb79).strokeRect(cell.x-portraitSize/2-8+inset,cell.y-portraitSize/2-8+inset,portraitSize+16-inset*2,portraitSize+16-inset*2)
      }
    }
    const confirm=(p:number)=>{
      if(ready[p]) return
      ready[p]=true
      order.push(p)
      audio.play('confirm')
      active=1-p
      render()
      if(ready.every(Boolean)) transition=this.time.delayedCall(320,()=>{if(ready.every(Boolean))startMatch(this,match)})
    }
    const cancel=(p:number)=>{
      if(!ready[p])return
      transition?.remove();transition=undefined;ready[p]=false;active=p
      order.splice(order.indexOf(p),1);render()
    }
    const back=()=>this.scene.start('modes')
    statuses.forEach((status,p)=>status.setInteractive({useHandCursor:true}).on('pointerdown',()=>cancel(p)))
    const key=(event:KeyboardEvent)=>{
      if(event.repeat)return
      if(event.code==='Escape'||event.code==='Backspace'){
        event.preventDefault()
        if(order.length)cancel(order[order.length-1]);else back()
        return
      }
      const bindings=options.current.keys
      const player=match.mode==='versus'?(bindings[0].includes(event.code)?0:1):active
      const keys=bindings[match.mode==='versus'?player:0]
      const direction=[keys[2],keys[3],keys[0],keys[1]].indexOf(event.code)
      if(direction>=0&&!ready[player]){
        event.preventDefault()
        match.fighters[player]=(match.fighters[player]+[-columns,columns,-1,1][direction]+roster.length)%roster.length
        audio.play('hover');render()
      }
      if(event.code===keys[4]){event.preventDefault();confirm(player)}
    }
    this.input.keyboard?.on('keydown',key)
    this.events.once('shutdown',()=>this.input.keyboard?.off('keydown',key))
    render()
  }
}
export class StageSelect extends Phaser.Scene {
  constructor(){super('stages')}
  create(data:Partial<Match>) {
    const match:Match={mode:data.mode??'cpu',difficulty:data.difficulty??options.current.difficulty,fighters:data.fighters??[0,1],stage:data.stage??0}
    entrance(this);audio.select('selection')
    let selected=match.stage
    const back=()=>this.scene.start('modes')
    const layers=background(this,stages[selected].id,.55)
    heading(this,'Choose Arena')
    const nav=new Nav(this,back)
    const description=label(this,640,547,'',25,{color:color.gold})
    const frames:Phaser.GameObjects.Graphics[]=[]
    const refresh=()=>{
      const stage=stages[selected]
      layers.forEach((layer,i)=>layer.setTexture(stage.id+i))
      description.setText(t(stage.name))
      frames.forEach((g,i)=>{
        const x=180+i*306
        g.clear()
        g.lineStyle(2,i===selected?0xeac184:0x604c46).strokeRect(x-133,232,266,151)
        if(i===selected) g.fillStyle(0xeac184).fillRect(x-30,381,60,4)
      })
    }
    for(const [i,stage] of stages.entries()) {
      const x=180+i*306
      panel(this,x-144,218,288,261)
      this.add.image(x,307,'thumb-'+stage.id).setDisplaySize(264,149)
      frames.push(this.add.graphics())
      button(this,nav,x,436,266,46,stage.name,()=>{selected=i;refresh();nav.focus(start.idx)},true)
    }
    const start=button(this,nav,640,628,260,49,'Start Battle',()=>this.scene.start('fighters',{...match,stage:selected}))
    button(this,nav,123,628,163,41,'Back',back,true)
    refresh()
    nav.focus(selected)
  }
}







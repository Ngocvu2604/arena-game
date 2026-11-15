import Phaser from 'phaser'
import {Attract,Boot,Credits,ModeSelect,Preload,Title} from './game/scenes/title'
import {FighterSelect,StageSelect} from './game/scenes/select'
import {Battle,Training} from './game/scenes/battle'
import {Pause,Results} from './game/scenes/results'
import {SettingsScene} from './game/scenes/settingsScene'
import {Versus} from './game/scenes/versus'
import {options} from './game/settings'
import {audio} from './game/audio'
import {ArenaGame,initializeGraphics} from './game/performance'
import {installDisplay} from './game/display'
import './styles/main.css'

async function start(){
  const parent=document.querySelector<HTMLElement>('#arena')!
  await Promise.all([document.fonts.load('400 20px "Arena Serif"','Điều khiển'),document.fonts.load('700 24px "Arena Serif"','Chiến thắng')])
  document.documentElement.lang=options.current.language==='Vietnamese'?'vi':'en'
  initializeGraphics()
  const game=new ArenaGame({
    type:Phaser.AUTO,parent,width:1280,height:720,backgroundColor:'#17151b',
    pixelArt:options.current.pixel,roundPixels:true,
    scale:{mode:Phaser.Scale.ENVELOP,autoCenter:Phaser.Scale.CENTER_BOTH,fullscreenTarget:parent},
    input:{keyboard:{target:window},gamepad:false},
    scene:[Boot,Preload,Title,ModeSelect,FighterSelect,StageSelect,Versus,Battle,Training,Pause,Results,SettingsScene,Credits,Attract],
    callbacks:{postBoot:game=>installDisplay(game,parent)}
  })
  const focus=()=>{parent.focus({preventScroll:true});audio.enable()}
  parent.addEventListener('pointerdown',focus)
  const unlock=()=>audio.enable()
  window.addEventListener('keydown',unlock,{once:true})
  game.events.once(Phaser.Core.Events.DESTROY,()=>{
    audio.dispose()
    parent.removeEventListener('pointerdown',focus)
    window.removeEventListener('keydown',unlock)
  })
}
void start().catch(error=>{
  const parent=document.querySelector('#arena')!
  parent.textContent='Unable to start the arena. Reload to try again.'
  console.error(error)
})




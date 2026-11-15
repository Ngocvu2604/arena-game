import Phaser from 'phaser'
import {options} from './settings'
export const LOGICAL_WIDTH=1280
export const LOGICAL_HEIGHT=720
export const viewport={zoom:1,width:1280,height:720}
export async function toggleFullscreen():Promise<string|undefined> {
  try{
    if(document.fullscreenElement)await document.exitFullscreen()
    else{
      const target=document.querySelector<HTMLElement>('#arena')!
      if(!document.fullscreenEnabled||!target.requestFullscreen)return 'Fullscreen unavailable'
      await target.requestFullscreen()
    }
  }catch{return 'Fullscreen unavailable'}
}
export function fitScene(scene:Phaser.Scene){
  const camera=scene.cameras.main
  const {width,height}=scene.scale
  const zoom=Math.min(width/LOGICAL_WIDTH,height/LOGICAL_HEIGHT)
  viewport.zoom=zoom;viewport.width=width;viewport.height=height
  camera.setViewport(0,0,width,height).setZoom(zoom)
  camera.centerOn(LOGICAL_WIDTH/2,LOGICAL_HEIGHT/2)
}
export function installDisplay(game:Phaser.Game,parent:HTMLElement){
  let pending=0
  const resize=()=>{
    cancelAnimationFrame(pending)
    pending=requestAnimationFrame(()=>{
      const bounds=parent.getBoundingClientRect()
      const factor=options.current.resolution
      const width=Math.max(1,Math.round(bounds.width*factor))
      const height=Math.max(1,Math.round(bounds.height*factor))
      game.scale.setGameSize(width,height)
      for(const scene of game.scene.getScenes(false))if(scene.sys.isActive()||scene.sys.isPaused())fitScene(scene)
    })
  }
  const observer=new ResizeObserver(resize)
  observer.observe(parent)
  document.addEventListener('fullscreenchange',resize)
  window.addEventListener('resize',resize)
  game.events.on('graphicschange',resize)
  game.events.once('destroy',()=>{
    observer.disconnect();cancelAnimationFrame(pending)
    document.removeEventListener('fullscreenchange',resize)
    window.removeEventListener('resize',resize)
    game.events.off('graphicschange',resize)
  })
  resize()
}


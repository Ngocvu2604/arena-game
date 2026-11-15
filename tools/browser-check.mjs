import {strict as assert} from 'node:assert'
import {mkdir} from 'node:fs/promises'
import {createServer} from 'vite'
import {chromium} from 'playwright-core'
const server=await createServer({server:{hmr:false,host:'127.0.0.1',port:5192,strictPort:true}})
await server.listen()
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu','--no-sandbox']})
const errors=[]
await mkdir('test-results',{recursive:true})
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}})
  page.on('pageerror',error=>{errors.push(error.message);console.log('PAGE ERROR',error.message)})
  page.on('console',message=>{if(message.type()==='error')console.log('BROWSER',message.text())})
  page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url())})
  await page.route('**/src/main.ts',async route=>{
    const response=await route.fetch()
    const body=(await response.text()).replace(/const focus\s*=/,'window.__game = game;\n  const focus =')
    await route.fulfill({response,body})
  })
  await page.goto('http://127.0.0.1:5192')
  await page.waitForTimeout(1800)
  console.log('BOOT',await page.evaluate(()=>({text:document.body.innerText,game:!!window.__game,scenes:window.__game?.scene.getScenes(true).map(s=>s.scene.key)})))
  await page.waitForFunction(()=>window.__game?.scene.isActive('title'),null,{timeout:12000})
  const active=key=>page.waitForFunction(key=>window.__game.scene.isActive(key),key,{timeout:12000})
  const click=async(x,y)=>{
    const position=await page.evaluate(({x,y})=>{
      const game=window.__game
      const scene=game.scene.getScenes(true).at(-1),camera=scene.cameras.main,rect=game.canvas.getBoundingClientRect()
      return {x:rect.left+(x-camera.scrollX-camera.width/2)*camera.zoom*rect.width/game.canvas.width+rect.width/2,
        y:rect.top+(y-camera.scrollY-camera.height/2)*camera.zoom*rect.height/game.canvas.height+rect.height/2}
    },{x,y})
    await page.mouse.click(position.x,position.y)
    await page.waitForTimeout(100)
  }
  const screenshot=name=>page.screenshot({path:'test-results/'+name+'.png'})
  await page.waitForTimeout(500)
  for(const [width,height] of [[1366,768],[1920,1080],[2560,1440],[900,780]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(200)
    const bounds=await page.locator('canvas').boundingBox()
    assert.ok(Math.abs(bounds.width-width)<3&&Math.abs(bounds.height-height)<3,JSON.stringify(bounds))
  }
  await page.setViewportSize({width:1366,height:768})
  await screenshot('title')
  await click(640,485);await active('settings')
  await click(1032,151);await click(920,234);await click(1003,376)
  await page.waitForTimeout(300)
  await screenshot('vietnamese')
  const labels=await page.evaluate(()=>window.__game.scene.getScene('settings').children.list.filter(o=>o.type==='Text').map(o=>o.text))
  assert.ok(labels.includes('CÀI ĐẶT')&&labels.includes('ÁP DỤNG'),JSON.stringify(labels))
  await click(444,151);await screenshot('graphics')
  await click(538,234)
  await page.waitForFunction(()=>!!document.fullscreenElement)
  await page.evaluate(()=>document.exitFullscreen())
  await page.waitForTimeout(200)
  await click(277,642);await active('title')
  await click(640,369);await active('modes')
  await click(640,510);await active('stages');await click(640,628);await active('fighters')
  await page.keyboard.press('KeyD')
  await page.keyboard.press('ArrowRight')
  await screenshot('selection')
  assert.ok(await page.evaluate(()=>!window.__game.scene.getScene('fighters').children.list.some(o=>o.type==='Text'&&['CONFIRM','BACK','XÁC NHẬN','QUAY LẠI'].includes(o.text))))
  await page.keyboard.press('KeyJ')
  await page.waitForTimeout(70)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(70)
  assert.ok(await page.evaluate(()=>window.__game.scene.isActive('fighters')))
  await page.keyboard.press('KeyJ')
  await page.keyboard.press('Numpad1')
  await active('versus')
  await page.waitForTimeout(600);await screenshot('versus')
  await active('battle')
  await page.waitForTimeout(2200)
  await page.keyboard.down('KeyD');await page.waitForTimeout(300);await page.keyboard.up('KeyD')
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft')
  await page.keyboard.press('KeyJ')
  await page.keyboard.press('Numpad1')
  await screenshot('battle')
  await page.keyboard.press('Escape');await active('pause')
  const frame=await page.evaluate(()=>window.__game.scene.getScene('battle').combat.frames)
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(()=>window.__game.scene.getScene('battle').combat.frames),frame)
  await click(640,399);await active('settings')
  await click(277,523);await active('pause')
  await click(640,285);await active('battle')
  // Rendering caps must not change the fixed-step simulation speed.
  await page.evaluate(async()=>{
    const {options}=await import('/src/game/settings.ts')
    options.current.showFps=true
    options.current.quality='Medium'
  })
  const timings=[]
  for(const cap of [30,60,120,0]){
    await page.evaluate(async cap=>{
      const {options}=await import('/src/game/settings.ts')
      options.current.fpsLimit=cap
      const scene=window.__game.scene.getScene('battle')
      scene.combat.fighters[0].x=250;scene.combat.fighters[1].x=1000
    },cap)
    await page.waitForTimeout(1200)
    const before=await page.evaluate(()=>window.__game.scene.getScene('battle').combat.frames)
    await page.waitForTimeout(1200)
    const after=await page.evaluate(()=>window.__game.scene.getScene('battle').combat.frames)
    const counter=await page.locator('#fps').textContent()
    timings.push({cap,frames:after-before,fps:counter})
    if(cap===30)assert.ok(parseFloat(counter)<=32,counter)
    assert.ok(after-before>=58&&after-before<=84,JSON.stringify(timings))
  }
  console.log('timings',JSON.stringify(timings))
  await page.evaluate(()=>{
    const scene=window.__game.scene.getScene('battle')
    scene.round=3
    const combat=scene.combat
    combat.frames=combat.duration*60-1
  })
  await active('results')
  await screenshot('results')
  await click(932,619);await active('title')
  await click(640,369);await active('modes')
  await click(1036,510);await active('stages');await click(640,628);await active('fighters')
  await page.keyboard.press('KeyJ');await page.keyboard.press('KeyJ')
  await active('versus');await active('training')
  await page.keyboard.press('F2')
  assert.ok(await page.evaluate(()=>window.__game.scene.getScene('training').debug))
  const resetTraining=async()=>{
    await page.keyboard.press('F1');await page.waitForTimeout(80)
    await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('training')
      scene.combat.fighters[0].x=400;scene.combat.fighters[1].x=900
    })
  }
  const player=()=>page.evaluate(()=>{
    const f=window.__game.scene.getScene('training').combat.fighters[0]
    return {x:f.x,y:f.y,slot:f.attack?.slot,guard:f.guard,energy:f.energy}
  })
  await resetTraining()
  await page.keyboard.down('KeyW');await page.waitForTimeout(90)
  assert.equal((await player()).y,584);await page.keyboard.up('KeyW')
  await page.keyboard.press('KeyK');await page.waitForTimeout(90)
  assert.ok((await player()).y<584)
  await resetTraining()
  await page.keyboard.press('KeyL');await page.waitForTimeout(50)
  assert.ok((await player()).x>400)
  await page.keyboard.press('KeyJ');await page.waitForTimeout(80)
  assert.equal((await player()).slot,'dashAttack')
  await resetTraining()
  await page.keyboard.down('KeyS');await page.waitForTimeout(70)
  assert.equal((await player()).guard,true)
  await page.keyboard.press('KeyU');await page.waitForTimeout(90)
  assert.equal((await player()).slot,'skillDown');await page.keyboard.up('KeyS')
  await resetTraining()
  await page.keyboard.press('KeyU');await page.keyboard.down('KeyD');await page.waitForTimeout(90)
  assert.equal((await player()).slot,'special2');await page.keyboard.up('KeyD')
  await resetTraining()
  await page.keyboard.down('KeyW')
  await page.keyboard.down('KeyI');await page.keyboard.down('KeyU');await page.keyboard.down('KeyJ')
  await page.waitForTimeout(90)
  assert.equal((await player()).slot,'ultimate2');assert.equal((await player()).energy,100)
  for(const key of ['KeyW','KeyI','KeyU','KeyJ'])await page.keyboard.up(key)
  console.log('PASS physical W/K/L/S, dash attack, late directional chord, skill priority and simultaneous ultimate input')
  for(let fighter=0;fighter<4;fighter++)for(let tier=1;tier<=3;tier++){
    await page.evaluate(async fighter=>{
      const {Combat}=await import('/src/game/combat/engine.ts')
      const scene=window.__game.scene.getScene('training')
      scene.scene.restart({...scene.match,fighters:[fighter,(fighter+1)%4]})
    },fighter)
    await page.waitForTimeout(200)
    await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('training')
      scene.combat.fighters[0].x=555
      scene.combat.fighters[1].x=625
      scene.combat.fighters[0].energy=300
    })
    if(tier===2)await page.keyboard.down('KeyW')
    if(tier===3)await page.keyboard.down('KeyS')
    await page.keyboard.press('KeyI')
    await page.waitForTimeout(100)
    if(tier===2)await page.keyboard.up('KeyW')
    if(tier===3)await page.keyboard.up('KeyS')
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('training').combat.fighters[0].energy),300-tier*100)
    await page.waitForTimeout(550)
    await screenshot('ultimate-'+fighter+'-'+tier)
    await page.waitForTimeout(1800)
    assert.ok(await page.evaluate(()=>window.__game.scene.getScene('training').combat.fighters[0].damage>0))
    await page.keyboard.down('KeyS');await screenshot('guard-'+fighter);await page.keyboard.up('KeyS')
  }
  await page.keyboard.press('Escape');await active('pause')
  await click(640,513);await click(640,451);await active('title')
  await click(640,485);await active('settings')
  await click(640,151)
  await click(640,600)
  await click(1003,675)
  const mapped=await page.evaluate(async()=>{const {options}=await import('/src/game/settings.ts');return options.current.keys[1][4]})
  assert.equal(mapped,'Digit1')
  await screenshot('controls')
  await click(277,675);await active('title')
  await click(640,369);await active('modes');await click(244,510);await active('stages');await click(640,628);await active('fighters')
  await page.keyboard.press('KeyJ');await page.keyboard.press('KeyJ');await active('versus');await active('battle')
  await page.waitForTimeout(4500)
  assert.ok(await page.evaluate(()=>window.__game.scene.getScene('battle').combat.fighters[1].x<900))
  const graphicsChecks=await page.evaluate(async()=>{
    const {options}=await import('/src/game/settings.ts')
    const {applyPreset,graphics}=await import('/src/game/performance.ts')
    const {toggleFullscreen}=await import('/src/game/display.ts')
    const snapshots=[]
    for(const preset of ['Low','Medium','High']){
      options.current.quality=preset
      applyPreset(options.current,preset)
      window.__game.events.emit('graphicschange')
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      snapshots.push({preset,particles:options.current.particles,resolution:options.current.resolution,
        background:options.current.background,width:window.__game.canvas.width})
    }
    const target=document.querySelector('#arena')
    const request=target.requestFullscreen
    target.requestFullscreen=()=>Promise.reject(new Error('Rejected for test'))
    const rejected=await toggleFullscreen()
    target.requestFullscreen=request
    return {snapshots,rejected,capabilities:graphics.capabilities,frameMs:graphics.frameMs}
  })
  assert.ok(graphicsChecks.snapshots[0].particles<graphicsChecks.snapshots[2].particles)
  assert.equal(graphicsChecks.snapshots[0].background,false)
  assert.ok(graphicsChecks.snapshots[2].width>graphicsChecks.snapshots[0].width)
  assert.equal(graphicsChecks.rejected,'Fullscreen unavailable')
  assert.ok(graphicsChecks.frameMs>0)
  await page.reload()
  await active('title')
  assert.equal(await page.evaluate(async()=>{const {options}=await import('/src/game/settings.ts');return options.current.keys[1][4]}),'Digit1')
  console.log('PASS graphics presets, real hardware fields, fullscreen rejection and persistence')
  if(errors.length)throw Error(errors.join('\n'))
  console.log('PASS viewport, Vietnamese, fullscreen, independent selection, VS, battle, pause, FPS timing, results')
}finally{await browser.close();await server.close()}







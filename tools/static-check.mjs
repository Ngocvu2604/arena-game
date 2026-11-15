import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from 'playwright-core'
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.wav':'audio/wav'}
const root=path.resolve('dist')
const server=createServer(async(request,response)=>{
  try{
    const pathname=new URL(request.url,'http://localhost').pathname
    if(!pathname.startsWith('/repo/'))throw Error('Unknown path')
    const file=path.resolve(root,pathname.slice(6)||'index.html')
    if(!file.startsWith(root+path.sep))throw Error('Unknown file')
    response.setHeader('content-type',types[path.extname(file)]||'application/octet-stream')
    response.end(await readFile(file))
  }catch{response.statusCode=404;response.end('Not found')}
})
await new Promise(resolve=>server.listen(5194,'127.0.0.1',resolve))
try{
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu','--no-sandbox']})
  try{
    const page=await browser.newPage()
    const requests=[],errors=[]
    page.on('response',response=>{requests.push(response.url());if(response.status()>=400)errors.push(response.url())})
    page.on('pageerror',error=>errors.push(error.message))
    await page.goto('http://127.0.0.1:5194/repo/')
    await page.waitForFunction(()=>document.querySelector('canvas')&&document.fonts.check('20px "Arena Serif"'))
    await page.waitForTimeout(2000)
    await page.keyboard.press('KeyA')
    await page.waitForTimeout(1200)
    if(requests.filter(url=>url.includes('/assets/characters/')).length!==12)throw Error('Missing fighter assets')
    if(!requests.some(url=>url.endsWith('.ttf')))throw Error('Missing local font')
    if(!requests.some(url=>url.includes('/assets/effects/slash.png')))throw Error('Missing slash atlas')
    if(requests.filter(url=>url.endsWith('.wav')).length!==7)throw Error('Missing combat audio: '+JSON.stringify(requests))
    if(errors.length)throw Error(errors.join('\n'))
    console.log('PASS production build, local font and all fighter assets under /repo/')
  }finally{await browser.close()}
}finally{server.close()}


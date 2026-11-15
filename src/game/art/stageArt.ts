import type {Stage} from '../../data/stages'
import {pixelSurface,polygon,random,rect,pixelate} from './pixels'
type Context = CanvasRenderingContext2D
const W=336, H=180
function ridge(ctx:Context, color:string, base:number, depth:number, rng:()=>number) {
  const p=[0,H,0,base]
  for(let x=0;x<=W;x+=7) p.push(x,base-Math.round(rng()*depth))
  p.push(W,base,W,H); polygon(ctx,color,p)
}
function tower(ctx:Context,x:number,y:number,w:number,h:number,color:string,edge:string,rng:()=>number,ruined=false) {
  rect(ctx,color,x,y,w,h)
  for(let a=0;a<w;a+=5) rect(ctx,color,x+a,y-3-Math.floor(rng()*(ruined?8:2)),3,5)
  rect(ctx,edge,x,y+3,2,h-3)
  rect(ctx,edge,x+2,y+9,w-3,1)
  for(let a=14;a<h-5;a+=10) {
    rect(ctx,'#1d242a',x+w/2-1,y+a,3,5)
    rect(ctx,edge,x+w/2-2,y+a+4,5,1)
  }
  for(let i=0;i<h;i+=3) rect(ctx,edge,x+Math.ceil(rng()*(w-4)),y+i,2+Math.floor(rng()*4),1)
}
function tree(ctx:Context,x:number,y:number,s:number,rng:()=>number,dark:boolean) {
  const p=(color:string,...v:number[])=>polygon(ctx,color,v.map((n,i)=>(i%2?y:x)+n*s))
  const trunk=dark?'#171c20':'#273436', edge=dark?'#303539':'#394744'
  p(trunk,-15,0,-7,-8,-5,-27,-9,-44,-20,-55,-17,-61,-4,-44,-2,-58,-6,-80,3,-80,7,-56,8,-42,16,-52,22,-63,26,-63,22,-52,11,-37,5,-17,9,-5,19,0)
  p(edge,-6,-1,-4,-28,-3,-35,0,-21,-1,-7,6,0)
  p(edge,6,-42,12,-45,17,-52,15,-47,7,-36,5,-28)
  for(let i=0;i<95;i++) {
    const dx=(rng()-.5)*80, dy=(rng()-.5)*43
    if (Math.abs(dx)+Math.abs(dy)*1.2>47) continue
    rect(ctx,[dark?'#20272a':'#303f3e',dark?'#2e3734':'#3a4943',dark?'#3d4336':'#44534a'][i%3],x+dx*s,y+(-71+dy)*s,(3+rng()*10)*s,(2+rng()*5)*s)
  }
}
function pillar(ctx:Context,x:number,y:number,h:number,rng:()=>number) {
  rect(ctx,'#22252a',x-4,y-6,22,8); rect(ctx,'#555550',x-3,y-7,19,2)
  rect(ctx,'#34393b',x,y-h,14,h-6); rect(ctx,'#54564f',x+1,y-h,2,h-7)
  rect(ctx,'#272d31',x+10,y-h,4,h-7); rect(ctx,'#424743',x+5,y-h,2,h-8)
  for(let i=0;i<h-9;i+=5) {
    const off=Math.floor(rng()*11)
    rect(ctx,'#282f31',x+off,y-h+i,4,1)
    if (i%3===0) rect(ctx,'#576046',x+off,y-h+i+1,3,1)
  }
  rect(ctx,'#535650',x-3,y-h,20,3); rect(ctx,'#3b413f',x-4,y-h+3,22,4)
}
function flag(ctx:Context,x:number,y:number,color:string) {
  rect(ctx,'#9e8055',x-2,y,12,1)
  polygon(ctx,color,[x,y+1,x+8,y+1,x+8,y+23,x+5,y+21,x+3,y+25,x,y+22])
  rect(ctx,'#ad865a',x+1,y+2,1,19)
  polygon(ctx,'#c09562',[x+4,y+6,x+6,y+11,x+4,y+16,x+2,y+11])
}
export function renderStage(stage: Stage, title=false) {
  const sky=pixelSurface(W,H), mid=pixelSurface(W,H), front=pixelSurface(W,H)
  const a=sky.ctx,b=mid.ctx,c=front.ctx
  const rng=random(449+stage.id.length)
  rect(a,stage.sky,0,0,W,H)
  rect(a,stage.haze,0,69,W,77)
  rect(a,title?'#745b59':'#5d5658',0,86,W,43)
  for(let i=0;i<48;i++) {
    const x=rng()*W,y=rng()*87
    rect(a,i%5===0?'#938578':'#57616a',x,y,1,1)
  }
  const mx=title?255:stage.id==='forest'?240:239, my=title?40:43, radius=title?29:21
  for(let j=-radius;j<=radius;j++) {
    const dx=Math.floor(Math.sqrt(radius*radius-j*j))
    rect(a,'#d7b486',mx-dx,my+j,2*dx+1,1)
  }
  for(let i=0;i<42;i++) {
    const x=(rng()-.5)*radius*1.7,y=(rng()-.5)*radius*1.7
    if (x*x+y*y<radius*radius*.74) rect(a,i%3===0?'#c5a078':'#d0aa80',mx+x,my+y,2+Math.floor(rng()*7),1)
  }
  for(let i=0;i<30;i++) {
    const x=rng()*W,y=25+rng()*76
    rect(a,i%3===0?'#86706c':'#635e66',x,y,10+rng()*53,1+(i%3))
    rect(a,'#977c72',x+5,y+2,4+rng()*21,1)
  }
  polygon(a,'#414752',[0,105,18,90,30,72,47,90,62,86,75,63,89,84,110,99,125,92,147,101,167,79,179,89,192,96,220,79,234,71,255,96,274,101,293,84,310,88,336,67,336,160,0,160])
  polygon(a,'#59606a',[5,100,30,72,45,90,35,85,31,88,29,83,24,91,62,86,75,63,88,83,77,77,74,81,72,75,66,87,53,94])
  polygon(a,'#5e6268',[190,100,234,71,254,96,242,88,236,88,232,80,222,93,213,91])
  ridge(a,'#363c46',116,22,rng)
  if (stage.id==='forest') {
    for(let i=0;i<22;i++) tree(b,i*17+rng()*7,148,0.31+rng()*.43,rng,false)
    tree(b,10,152,1.9,rng,true); tree(b,320,151,1.53,rng,true)
    tree(b,66,149,.89,rng,true); tree(b,273,149,.95,rng,true)
  } else if (stage.id==='courtyard' || title) {
    const castleX=title?27:72
    ridge(b,'#313440',122,8,rng)
    rect(b,'#2b2f39',castleX,106,242,48)
    for(let x=castleX;x<castleX+241;x+=9) rect(b,'#343540',x,101,5,5)
    for(let i=0;i<9;i++) {
      const x=castleX+i*23,y=68+Math.floor(rng()*33),w=10+Math.floor(rng()*12)
      tower(b,x,y,w,148-y,'#32343e','#49444a',rng)
      if(i%2===0) polygon(b,'#2a2c36',[x-4,y-4,x+w/2,y-19,x+w+3,y-4])
      if(i%3===0) rect(b,'#c39161',x+w/2,y+18,2,3)
    }
    polygon(b,'#242832',[castleX-12,118,castleX+54,130,castleX+117,125,castleX+184,139,castleX+238,119,336,128,336,157,0,157])
    if (!title) {
      pillar(b,24,147,87,rng); pillar(b,292,147,91,rng)
      flag(b,47,86,'#7a3d40'); flag(b,277,84,'#753e49')
    } else {
      tree(b,12,148,1.49,rng,true); tree(b,321,150,1.34,rng,true)
      pillar(b,48,149,69,rng); pillar(b,284,149,59,rng)
      flag(b,67,89,'#723d3d'); flag(b,270,101,'#5b4b67')
    }
  } else {
    ridge(b,stage.id==='temple'?'#303c42':'#45363a',138,25,rng)
    if(stage.id==='temple') {
      for(const [x,y,h] of [[12,149,94],[60,148,69],[98,146,38],[237,146,50],[270,148,82],[316,149,100]]) pillar(b,x,y,h,rng)
      polygon(b,'#424849',[9,56,25,37,47,32,69,37,82,50,78,56,63,46,42,43,25,49,19,58])
      polygon(b,'#3a4242',[267,66,281,48,307,39,332,41,336,47,333,54,311,50,286,58,278,68])
      for(const x of [127,202]) {
        rect(b,'#434a49',x,126,12,16)
        polygon(b,'#515b57',[x+2,126,x+3,116,x+5,112,x+4,105,x+9,103,x+11,107,x+10,113,x+13,119,x+9,127])
      }
    } else {
      for(const [x,y,w] of [[2,79,24],[37,108,16],[283,89,20],[315,72,23]]) tower(b,x,y,w,150-y,'#382e32','#50413e',rng,true)
      for(let i=0;i<21;i++) {
        const x=rng()*335, y=126+rng()*22
        polygon(b,'#29252a',[x,y,x+2,y-12,x+3,y-11,x+2,y])
        if(i%4===0) flag(b,x+2,y-13,'#683f42')
      }
    }
  }
  for(let i=0;i<144;i++) {
    const x=rng()*W,y=140+rng()*12
    rect(b,i%5===0?stage.accent:'#303735',x,y,1+rng()*5,1)
  }
  rect(c,'#15171b',0,148,W,32)
  rect(c,stage.ground,0,148,W,6)
  rect(c,title?'#9f8470':'#827766',0,148,W,1)
  rect(c,'#29292b',0,154,W,3)
  for(let row=0;row<5;row++) {
    let x=-Math.floor(rng()*22)
    while(x<W) {
      const y=157+row*5
      const w=10+Math.floor(rng()*17)
      rect(c,[stage.ground,'#28282c','#323034','#212227'][Math.floor(rng()*4)],x,y,w-1,4)
      rect(c,'#47413e',x+1,y,w-3,1)
      if(rng()>.45) rect(c,'#57493f',x+3,y+2,Math.floor(rng()*8)+1,1)
      x+=w
    }
  }
  for(let i=0;i<170;i++) {
    const x=rng()*W,y=147+rng()*28
    rect(c,[stage.accent,'#60574b','#211f22','#4d4843'][i%4],x,y,1+rng()*3,1)
  }
  pixelate(b,W,H)
  return [sky.canvas,mid.canvas,front.canvas]
}
export function thumbnail(layers: HTMLCanvasElement[]) {
  const {canvas,ctx}=pixelSurface(W,H)
  for(const layer of layers) ctx.drawImage(layer,0,0)
  return canvas
}



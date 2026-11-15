export function random(seed: number) {
  return () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 4294967296)
}
export function pixelSurface(w: number,h: number) {
  const canvas = document.createElement('canvas')
  canvas.width=w; canvas.height=h
  return {canvas,ctx:canvas.getContext('2d')!}
}
export function polygon(ctx: CanvasRenderingContext2D, color: string, points: number[]) {
  ctx.fillStyle=color
  ctx.beginPath()
  ctx.moveTo(points[0],points[1])
  for(let i=2;i<points.length;i+=2) ctx.lineTo(points[i],points[i+1])
  ctx.closePath(); ctx.fill()
}
export function rect(ctx: CanvasRenderingContext2D,c: string,x: number,y: number,w: number,h: number) {
  ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),w,h)
}
export function pixelate(ctx: CanvasRenderingContext2D,w: number,h: number) {
  const data=ctx.getImageData(0,0,w,h)
  for(let i=3;i<data.data.length;i+=4) data.data[i]=data.data[i]>=127 ? 255 : 0
  ctx.putImageData(data,0,0)
}


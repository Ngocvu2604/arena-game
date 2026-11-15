export interface Box { x: number; y: number; w: number; h: number }
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
export const clamp = (n: number, min: number, max: number) => Math.max(min,Math.min(n,max))


import {strict as assert} from 'node:assert'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {poses,roster} from '../src/data/characters.ts'
for (const {id} of roster) {
  test(id+' has local atlas frames for every fighter state',()=>{
    const base=new URL('../public/assets/characters/'+id+'/',import.meta.url)
    const atlas=readFileSync(new URL('sprites/fighter.png',base))
    const portrait=readFileSync(new URL('sprites/portrait.png',base))
    const {frames,meta}=JSON.parse(readFileSync(new URL('animations/fighter.json',base),'utf8'))
    assert.equal(atlas.readUInt32BE(0),0x89504e47)
    assert.equal(portrait.readUInt32BE(0),0x89504e47)
    const width=atlas.readUInt32BE(16),height=atlas.readUInt32BE(20)
    assert.ok(meta.bodyHeight>0)
    assert.ok(meta.pivot.x>0&&meta.pivot.x<1&&meta.pivot.y>0&&meta.pivot.y<=1)
    for(const pose of poses) {
      const clip=meta.framesPerClip[pose]
      assert.ok(clip.length>1,pose)
      for(const name of clip) {
        const {x,y,w,h}=frames[name].frame
        assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,name)
      }
      const fallback=meta.fallbacks[pose]
      if(fallback&&meta.framesPerClip[fallback]) assert.deepEqual(clip,meta.framesPerClip[fallback])
    }
  })
}



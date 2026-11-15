import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {defaults,parseSettings} from '../src/game/settings.ts'
test('settings tolerate damaged storage and validate supported values',()=>{
  assert.deepEqual(parseSettings('{oops'),defaults())
  const updated=parseSettings(JSON.stringify({master:200,rounds:5,duration:120,difficulty:'Hard',language:'Vietnamese'}))
  assert.equal(updated.master,100)
  assert.equal(updated.rounds,5)
  assert.equal(updated.duration,120)
  assert.equal(updated.difficulty,'Hard')
  assert.equal(updated.language,'Vietnamese')
})
test('saved keybindings are restored only if all keys are distinct and available',()=>{
  const keys=defaults().keys
  keys[1][0]='KeyN'
  assert.deepEqual(parseSettings(JSON.stringify({version:3,keys})).keys,keys)
  keys[1][0]='KeyA'
  assert.deepEqual(parseSettings(JSON.stringify({version:3,keys})).keys,defaults().keys)
  keys[1][0]='Escape'
  assert.deepEqual(parseSettings(JSON.stringify({version:3,keys})).keys,defaults().keys)
})


